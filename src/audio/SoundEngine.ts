export class SoundEngine {
  private ctx: AudioContext | null = null;
  private mainBgm: HTMLAudioElement;
  private feverBgm: HTMLAudioElement;
  private muted = false;
  private bgmStarted = false;
  private currentMode: 'main' | 'fever' = 'main';

  constructor() {
    this.mainBgm = new Audio('./assets/audio/theme_main.mp3');
    this.mainBgm.loop = true;
    this.mainBgm.volume = 0.36;

    this.feverBgm = new Audio('./assets/audio/theme_fever.mp3');
    this.feverBgm.loop = true;
    this.feverBgm.volume = 0.42;
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public startBgm(mode: 'main' | 'fever' = 'main'): void {
    this.unlock();
    this.currentMode = mode;
    if (this.muted) return;

    this.bgmStarted = true;
    if (mode === 'main') {
      this.feverBgm.pause();
      if (this.mainBgm.paused) {
        void this.mainBgm.play().catch(() => {});
      }
    } else {
      this.mainBgm.pause();
      if (this.feverBgm.paused) {
        this.feverBgm.currentTime = 0;
        void this.feverBgm.play().catch(() => {});
      }
    }
  }

  public stopBgm(): void {
    this.mainBgm.pause();
    this.feverBgm.pause();
    this.bgmStarted = false;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.mainBgm.pause();
      this.feverBgm.pause();
    } else if (this.bgmStarted) {
      this.startBgm(this.currentMode);
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainVal = 0.14
  ): void {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), now + duration);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public playHit(heavy = false): void {
    if (heavy) {
      this.playTone(170, 52, 0.14, 'square', 0.16);
      this.playTone(320, 110, 0.08, 'triangle', 0.12);
    } else {
      this.playTone(230, 80, 0.08, 'triangle', 0.11);
    }
  }

  public playKick(): void {
    this.playTone(340, 95, 0.11, 'sine', 0.14);
  }

  public playDash(): void {
    this.playTone(280, 620, 0.12, 'sine', 0.09);
  }

  public playSlip(): void {
    this.playTone(880, 260, 0.22, 'sine', 0.13);
  }

  public playPickup(): void {
    this.playTone(680, 1080, 0.07, 'sine', 0.07);
  }

  public playHurt(): void {
    this.playTone(160, 65, 0.18, 'sawtooth', 0.13);
  }

  public playLevelUp(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, n * 1.03, 0.16, 'triangle', 0.14), idx * 65);
    });
  }

  public playFever(): void {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, n * 1.15, 0.22, 'square', 0.11), idx * 55);
    });
  }
}
