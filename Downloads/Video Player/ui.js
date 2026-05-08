document.addEventListener('DOMContentLoaded', async () => {
  const player = new VideoPlayer();

  // Show loading state
  const canvas = document.getElementById('video-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 640; canvas.height = 360;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, 640, 360);
  ctx.fillStyle = '#555';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading ffmpeg.wasm…', 320, 180);

  await player.init();

  // Clear loading text
  ctx.clearRect(0, 0, 640, 360);

  // ── File Open ──────────────────────────────────────────────────
  const fileInput = document.getElementById('file-input');

  document.getElementById('btn-open').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files[0]) await player.loadFile(e.target.files[0]);
  });

  // ── Drag & Drop ────────────────────────────────────────────────
  const wrapper = document.getElementById('player-wrapper');

  wrapper.addEventListener('dragover', (e) => {
    e.preventDefault();
    wrapper.style.outline = '2px solid #e50914';
  });

  wrapper.addEventListener('dragleave', () => {
    wrapper.style.outline = '';
  });

  wrapper.addEventListener('drop', async (e) => {
    e.preventDefault();
    wrapper.style.outline = '';
    const file = e.dataTransfer.files[0];
    if (file) await player.loadFile(file);
  });

  // ── Playback Controls ──────────────────────────────────────────
  document.getElementById('btn-play').addEventListener('click', () => {
    player.pause();
  });

  document.getElementById('btn-stop').addEventListener('click', () => {
    player.stop();
  });

  // ── Volume ─────────────────────────────────────────────────────
  document.getElementById('volume-slider').addEventListener('input', (e) => {
    player.setVolume(parseFloat(e.target.value));
  });

  // ── Audio Track Select ─────────────────────────────────────────
  document.getElementById('audio-track-select').addEventListener('change', (e) => {
    player.switchAudioTrack(parseInt(e.target.value));
  });

  // ── Progress Bar Click ─────────────────────────────────────────
  const progressBar = document.getElementById('progress-bar');
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    // Note: seeking in raw frame array is instant
    const targetFrame = Math.floor(pct * player.frames.length);
    player.currentTime = targetFrame / player.frameRate;
    // Simple seek — restart playback from target frame
    // (a production player would use worker-based frame indexing)
  });

  // ── Fullscreen ─────────────────────────────────────────────────
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.getElementById('player-wrapper').requestFullscreen();
    }
  });

  // ── Keyboard Shortcuts ─────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    switch(e.code) {
      case 'Space':       e.preventDefault(); player.pause();    break;
      case 'KeyS':        player.stop();                         break;
      case 'KeyI':
        const overlay = document.getElementById('info-overlay');
        overlay.style.display =
          overlay.style.display === 'block' ? 'none' : 'block';
        break;
      case 'ArrowUp':
        const vol = document.getElementById('volume-slider');
        vol.value = Math.min(1, parseFloat(vol.value) + 0.1);
        player.setVolume(parseFloat(vol.value));
        break;
      case 'ArrowDown':
        const volD = document.getElementById('volume-slider');
        volD.value = Math.max(0, parseFloat(volD.value) - 0.1);
        player.setVolume(parseFloat(volD.value));
        break;
      case 'KeyM':
        const v = document.getElementById('volume-slider');
        v.value = v.value > 0 ? 0 : 1;
        player.setVolume(parseFloat(v.value));
        break;
    }
  });
});