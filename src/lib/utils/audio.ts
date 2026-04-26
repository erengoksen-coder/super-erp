/**
 * Agi-Audio: High-fidelity UI sound synthesizer.
 * Generates procedural futuristic sounds using Web Audio API.
 */

class AgiAudio {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Soft click for navigation
  public playClick() {
    this.playTone(800, 0.1, 'sine', 0.05);
  }

  // High-pitched notification blip
  public playBlip() {
    this.playTone(1200, 0.15, 'sine', 0.03);
  }

  // Success chime
  public playSuccess() {
    this.playTone(600, 0.2, 'sine', 0.05);
    setTimeout(() => this.playTone(900, 0.3, 'sine', 0.05), 100);
  }

  // Warning pulse
  public playWarning() {
    this.playTone(200, 0.4, 'sawtooth', 0.02);
  }
}

export const agiAudio = new AgiAudio();
