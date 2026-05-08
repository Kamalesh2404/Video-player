/**
 * VideoPlayer — Core Engine
 *
 * Pipeline:
 *  File → ffmpeg.wasm demux/decode → YUV frames → WebGLRenderer
 *                                  → PCM audio  → AudioEngine
 */
class VideoPlayer {
  constructor() {
    this.ffmpeg      = null;
    this.renderer    = null;
    this.audio       = new AudioEngine();
    this.isPlaying   = false;
    this.isPaused    = false;
    this.currentTime = 0;
    this.duration    = 0;
    this.frameRate   = 30;
    this.frameTimer  = null;
    this.frames      = [];       // decoded video frames queue
    this.audioTracks = [];
    this.selectedAudioTrack = 0;

    // Stats for info overlay
    this.stats = {
      codec: '—', width: 0, height: 0,
      fps: 0, audioInfo: '—', droppedFrames: 0
    };
  }

  async init() {
    const canvas = document.getElementById('video-canvas');
    this.renderer = new WebGLRenderer(canvas);
    this.audio.init();

    // Load ffmpeg.wasm
    const { FFmpeg } = FFmpegWASM;
    const { fetchFile, toBlobURL } = FFmpegUtil;

    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('log', ({ message }) => {
      this._parseFFmpegLog(message);
    });
    this.ffmpeg.on('progress', ({ progress }) => {
      this._onProgress(progress);
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    console.log('ffmpeg.wasm loaded ✓');
  }

  /**
   * Load and play a File object
   */
  async loadFile(file) {
    this.stop();
    document.getElementById('drop-zone').classList.add('hidden');

    const { fetchFile } = FFmpegUtil;
    const inputName = 'input' + file.name.substring(file.name.lastIndexOf('.'));

    // Write file into ffmpeg virtual FS
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    // ── Step 1: Probe the file ──────────────────────────────────
    await this._probeFile(inputName);

    // ── Step 2: Extract all audio tracks ───────────────────────
    await this._extractAudioTracks(inputName);

    // ── Step 3: Decode video to raw YUV frames ──────────────────
    await this._decodeVideo(inputName);

    // ── Step 4: Start playback loop ─────────────────────────────
    this._startPlayback();
  }

  async _probeFile(inputName) {
    // Run ffprobe-like analysis via ffmpeg stderr
    try {
      await this.ffmpeg.exec(['-i', inputName, '-hide_banner']);
    } catch(_) {
      // ffmpeg exits with error when no output given — that's expected
    }
  }

  async _extractAudioTracks(inputName) {
    this.audioTracks = [];

    // Get number of audio streams (simplified: try up to 4)
    for (let i = 0; i < 4; i++) {
      try {
        const outName = `audio_track_${i}.wav`;
        await this.ffmpeg.exec([
          '-i', inputName,
          '-map', `0:a:${i}`,      // select audio stream i
          '-acodec', 'pcm_f32le',  // decode to raw 32-bit float PCM
          '-ar', '48000',          // normalize sample rate
          outName
        ]);
        const data = await this.ffmpeg.readFile(outName);
        const pcm  = this._parseWAV(data.buffer);
        this.audioTracks.push(pcm);
        await this.ffmpeg.deleteFile(outName);
        console.log(`Audio track ${i}: ${pcm.channels}ch @ ${pcm.sampleRate}Hz`);
      } catch(_) {
        break; // No more audio tracks
      }
    }

    // Update UI select
    this._updateAudioTrackUI();
  }

  async _decodeVideo(inputName) {
    this.frames = [];

    // Transcode to raw YUV420p frames
    // -vf scale: keep original res (remove for performance limit)
    await this.ffmpeg.exec([
      '-i', inputName,
      '-f', 'rawvideo',
      '-pix_fmt', 'yuv420p',
      '-vcodec', 'rawvideo',
      'frames.yuv'
    ]);

    const raw = await this.ffmpeg.readFile('frames.yuv');
    await this.ffmpeg.deleteFile('frames.yuv');

    // Split into individual frames
    const { width, height } = this.stats;
    const frameSize = width * height * 3 / 2; // YUV420p
    const total = Math.floor(raw.length / frameSize);

    for (let i = 0; i < total; i++) {
      const offset = i * frameSize;
      const ySize  = width * height;
      const uvSize = ySize >> 2;

      this.frames.push({
        y: raw.slice(offset,           offset + ySize),
        u: raw.slice(offset + ySize,   offset + ySize + uvSize),
        v: raw.slice(offset + ySize + uvSize, offset + frameSize)
      });
    }

    this.duration = total / this.frameRate;
    console.log(`Decoded ${total} frames at ${width}×${height}`);
  }

  _startPlayback() {
    this.isPlaying = true;
    this.isPaused  = false;
    let frameIdx   = 0;

    // Play first audio track
    if (this.audioTracks.length > 0) {
      const track = this.audioTracks[this.selectedAudioTrack] ||
                    this.audioTracks[0];
      this.audio.playBuffer(track.channelData, track.sampleRate);
      this.audio.resume();
    }

    const interval = 1000 / this.frameRate;

    const renderLoop = () => {
      if (!this.isPlaying || this.isPaused) return;

      if (frameIdx >= this.frames.length) {
        this.stop();
        return;
      }

      const frame = this.frames[frameIdx++];
      this.renderer.drawFrame(
        frame.y, frame.u, frame.v,
        this.stats.width, this.stats.height
      );

      this.currentTime = frameIdx / this.frameRate;
      this._updateProgressUI();

      this.frameTimer = setTimeout(renderLoop, interval);
    };

    renderLoop();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      clearTimeout(this.frameTimer);
      this.audio.suspend();
    } else {
      this.audio.resume();
      this._startPlayback();
    }
    document.getElementById('btn-play').textContent =
      this.isPaused ? '▶' : '⏸';
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.frameTimer);
    this.audio.suspend();
    this.currentTime = 0;
    document.getElementById('btn-play').textContent = '▶';
    document.getElementById('progress-fill').style.width = '0%';
  }

  setVolume(v) { this.audio.setVolume(v); }

  switchAudioTrack(idx) {
    this.selectedAudioTrack = idx;
    if (this.isPlaying && this.audioTracks[idx]) {
      this.audio.playBuffer(
        this.audioTracks[idx].channelData,
        this.audioTracks[idx].sampleRate
      );
    }
  }

  // ── WAV parser (PCM f32le) ─────────────────────────────────────
  _parseWAV(buffer) {
    const view = new DataView(buffer);
    const channels   = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const dataStart  = 44; // standard PCM WAV header

    const raw = new Float32Array(buffer, dataStart);
    const samplesPerChannel = Math.floor(raw.length / channels);

    const channelData = [];
    for (let c = 0; c < channels; c++) {
      const ch = new Float32Array(samplesPerChannel);
      for (let s = 0; s < samplesPerChannel; s++) {
        ch[s] = raw[s * channels + c];
      }
      channelData.push(ch);
    }

    return { channels, sampleRate, channelData };
  }

  // ── ffmpeg log parsing ─────────────────────────────────────────
  _parseFFmpegLog(msg) {
    // Extract resolution
    const resMatch = msg.match(/(\d{3,5})x(\d{3,5})/);
    if (resMatch) {
      this.stats.width  = parseInt(resMatch[1]);
      this.stats.height = parseInt(resMatch[2]);
      document.getElementById('info-res').textContent =
        `Resolution: ${this.stats.width}×${this.stats.height}`;
    }

    // Extract FPS
    const fpsMatch = msg.match(/(\d+(?:\.\d+)?)\s*fps/);
    if (fpsMatch) {
      this.frameRate = parseFloat(fpsMatch[1]);
      this.stats.fps = this.frameRate;
      document.getElementById('info-fps').textContent =
        `FPS: ${this.frameRate}`;
    }

    // Extract codec
    const codecMatch = msg.match(/Video:\s*(\w+)/);
    if (codecMatch) {
      this.stats.codec = codecMatch[1];
      document.getElementById('info-codec').textContent =
        `Codec: ${this.stats.codec}`;
    }

    // Extract audio info
    const audioMatch = msg.match(/Audio:\s*(.+)/);
    if (audioMatch) {
      this.stats.audioInfo = audioMatch[1];
      document.getElementById('info-audio').textContent =
        `Audio: ${this.stats.audioInfo}`;
    }
  }

  _onProgress(progress) {
    // Update progress during decode
    document.getElementById('progress-fill').style.width =
      `${Math.round(progress * 100)}%`;
  }

  _updateProgressUI() {
    const pct = this.duration > 0
      ? (this.currentTime / this.duration) * 100 : 0;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('time-display').textContent =
      `${this._fmt(this.currentTime)} / ${this._fmt(this.duration)}`;
  }

  _updateAudioTrackUI() {
    const sel = document.getElementById('audio-track-select');
    sel.innerHTML = '';
    this.audioTracks.forEach((t, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Track ${i+1} (${t.channels}ch)`;
      sel.appendChild(opt);
    });
  }

  _fmt(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}