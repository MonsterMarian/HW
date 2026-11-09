// SILICON // LOGIC STUDIO - HAPTIC WEBAUDIO SYNTHESIZER
// Generates realistic mechanical relay clicks and oscillator coil whine without external audio files.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.oscillator = null;
    this.oscGain = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  // Tactile click of a physical relay or switch
  playRelayClick(pitch = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // High frequency transient pop (3ms)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.008);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.015);
  }

  // Bus conflict / short circuit electric buzz
  playConflictBuzz() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Oscillator clock coil hum
  updateClockHum(frequencyHz, isRunning) {
    if (this.isMuted || !isRunning || frequencyHz < 5) {
      if (this.oscGain) {
        this.oscGain.gain.setTargetAtTime(0, this.ctx ? this.ctx.currentTime : 0, 0.05);
      }
      return;
    }

    this.init();
    if (!this.ctx) return;

    if (!this.oscillator) {
      this.oscillator = this.ctx.createOscillator();
      this.oscGain = this.ctx.createGain();
      this.oscillator.type = 'sine';
      this.oscGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.oscillator.connect(this.oscGain);
      this.oscGain.connect(this.ctx.destination);
      this.oscillator.start();
    }

    const targetPitch = Math.min(2200, 100 + frequencyHz * 1.5);
    this.oscillator.frequency.setTargetAtTime(targetPitch, this.ctx.currentTime, 0.05);
    this.oscGain.gain.setTargetAtTime(0.03, this.ctx.currentTime, 0.05);
  }
}

export const audioEngine = new AudioEngine();
