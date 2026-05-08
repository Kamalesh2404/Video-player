/**
 * AudioEngine
 * Handles: multi-track selection, 5.1/7.1 → stereo downmix,
 *          volume control, sync with video
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.splitter = null;
    this.merger = null;
    this.currentChannels = 2;
  }

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
  }

  /**
   * Feed decoded PCM audio buffer
   * @param {Float32Array[]} channelData  - array of per-channel PCM data
   * @param {number} sampleRate
   */
  async playBuffer(channelData, sampleRate) {
    if (!this.ctx) this.init();

    const numChannels = channelData.length;
    const length = channelData[0].length;

    const audioBuffer = this.ctx.createBuffer(numChannels, length, sampleRate);
    channelData.forEach((data, i) => audioBuffer.copyToChannel(data, i));

    // Stop previous source
    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch(_) {}
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = audioBuffer;

    if (numChannels > 2) {
      // Downmix surround → stereo
      this._setupDownmix(numChannels);
      this.sourceNode.connect(this.splitter);
      this.merger.connect(this.gainNode);
    } else {
      this.sourceNode.connect(this.gainNode);
    }

    this.sourceNode.start();
    this.currentChannels = numChannels;
  }

  /**
   * 5.1 layout: FL, FR, FC, LFE, BL, BR
   * Downmix formula (ITU-R BS.775):
   *   L_out = FL + 0.707*FC + 0.707*BL  (LFE optional)
   *   R_out = FR + 0.707*FC + 0.707*BR
   */
  _setupDownmix(numChannels) {
    if (this.splitter) this.splitter.disconnect();
    if (this.merger) this.merger.disconnect();

    this.splitter = this.ctx.createChannelSplitter(numChannels);
    this.merger = this.ctx.createChannelMerger(2);

    if (numChannels === 6) {
      // 5.1 → Stereo
      const makeGain = (val) => {
        const g = this.ctx.createGain();
        g.gain.value = val;
        return g;
      };

      // FL (0) → L
      const gFL_L = makeGain(1.0);
      this.splitter.connect(gFL_L, 0);
      gFL_L.connect(this.merger, 0, 0);

      // FR (1) → R
      const gFR_R = makeGain(1.0);
      this.splitter.connect(gFR_R, 1);
      gFR_R.connect(this.merger, 0, 1);

      // FC (2) → L+R at 0.707
      const gFC_L = makeGain(0.707);
      const gFC_R = makeGain(0.707);
      this.splitter.connect(gFC_L, 2);
      this.splitter.connect(gFC_R, 2);
      gFC_L.connect(this.merger, 0, 0);
      gFC_R.connect(this.merger, 0, 1);

      // LFE (3) → L+R at 0.5 (optional, some players skip this)
      const gLFE_L = makeGain(0.5);
      const gLFE_R = makeGain(0.5);
      this.splitter.connect(gLFE_L, 3);
      this.splitter.connect(gLFE_R, 3);
      gLFE_L.connect(this.merger, 0, 0);
      gLFE_R.connect(this.merger, 0, 1);

      // BL (4) → L at 0.707
      const gBL_L = makeGain(0.707);
      this.splitter.connect(gBL_L, 4);
      gBL_L.connect(this.merger, 0, 0);

      // BR (5) → R at 0.707
      const gBR_R = makeGain(0.707);
      this.splitter.connect(gBR_R, 5);
      gBR_R.connect(this.merger, 0, 1);

    } else if (numChannels === 8) {
      // 7.1 → Stereo (simplified)
      for (let i = 0; i < 8; i++) {
        const g = this.ctx.createGain();
        g.gain.value = i < 4 ? 0.5 : 0.35;
        this.splitter.connect(g, i);
        g.connect(this.merger, 0, i % 2); // odd→R, even→L
      }
    }
  }

  setVolume(val) {
    if (this.gainNode) this.gainNode.gain.value = val;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  suspend() {
    if (this.ctx) this.ctx.suspend();
  }
}