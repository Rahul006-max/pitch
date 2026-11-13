/**
 * Web Audio Procedural Sound Engine for Hackalance
 * Zero external audio files required - works 100% offline and reliably.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.hasInteracted = false;
    this.engineGain = null;
    this.sirenGain = null;
    this.sirenOsc = null;
    this.sirenInterval = null;
    this.sirenActive = false;
    this.ecgGain = null;
    this.ecgInterval = null;

    this.isMuted = true; // Strictly opt-in by default
    try {
      const stored = localStorage.getItem('wildcat_muted');
      if (stored === 'false') {
        this.isMuted = false;
      } else {
        this.isMuted = true;
      }
    } catch (e) {}
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.startEngineHum();
    this.startEcgPulse();
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startEngineHum() {
    if (!this.ctx) return;

    // Create pinkish road noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.96 * b1 + white * 0.08;
      b2 = 0.90 * b2 + white * 0.12;
      output[i] = (b0 + b1 + b2) * 0.15;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 180;

    // Deep engine sub-drone
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.value = 48; // Deep V8 diesel engine idle

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.25;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.28;

    whiteNoise.connect(noiseFilter).connect(this.engineGain);
    subOsc.connect(subGain).connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    whiteNoise.start();
    subOsc.start();
  }

  startEcgPulse() {
    if (!this.ctx) return;
    this.ecgGain = this.ctx.createGain();
    this.ecgGain.gain.value = 0.12;
    this.ecgGain.connect(this.masterGain);

    // Heartbeat every 850ms (~70 BPM)
    this.ecgInterval = setInterval(() => {
      if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.08);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc.connect(gain).connect(this.ecgGain);
      osc.start(t);
      osc.stop(t + 0.085);
    }, 900);
  }

  toggleSiren(force) {
    this.ensureContext();
    this.sirenActive = force !== undefined ? force : !this.sirenActive;

    if (!this.sirenActive) {
      if (this.sirenInterval) {
        clearInterval(this.sirenInterval);
        this.sirenInterval = null;
      }
      if (this.sirenGain) {
        const t = this.ctx.currentTime;
        this.sirenGain.gain.linearRampToValueAtTime(0.0001, t + 0.2);
        setTimeout(() => {
          if (this.sirenOsc) {
            try { this.sirenOsc.stop(); } catch(e) {}
            this.sirenOsc = null;
          }
        }, 220);
      }
      return false;
    }

    if (!this.ctx) return false;
    const t = this.ctx.currentTime;

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(650, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.001, t);
    this.sirenGain.gain.linearRampToValueAtTime(0.18, t + 0.15);

    this.sirenOsc.connect(filter).connect(this.sirenGain).connect(this.masterGain);
    this.sirenOsc.start();

    // Alternating wail between 650Hz and 950Hz
    let high = true;
    this.sirenInterval = setInterval(() => {
      if (!this.ctx || !this.sirenOsc) return;
      const now = this.ctx.currentTime;
      const targetFreq = high ? 920 : 680;
      this.sirenOsc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.35);
      high = !high;
    }, 450);

    return true;
  }

  playTap() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  playNavigate() {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.12);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playTurn(intensity = 0.5) {
    this.ensureContext();
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.06);

    const vol = Math.min(0.08, 0.03 * intensity);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.065);
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('wildcat_muted', String(this.isMuted));
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.45, t + 0.15);
    }

    return !this.isMuted;
  }
}

window.audioEngine = new AudioEngine();
