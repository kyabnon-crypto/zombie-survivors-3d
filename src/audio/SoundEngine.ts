export type BgmMode = 'main' | 'boss' | 'fever';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private tracks: Record<BgmMode, HTMLAudioElement>;
  private muted = false;
  private bgmStarted = false;
  private currentMode: BgmMode = 'main';

  constructor() {
    this.tracks = {
      main: new Audio('./assets/audio/theme_main.mp3'),
      boss: new Audio('./assets/audio/theme_fever.mp3'),
      fever: new Audio('./assets/audio/theme_fever.mp3'),
    };
    (Object.keys(this.tracks) as BgmMode[]).forEach((k) => {
      this.tracks[k].loop = true;
      this.tracks[k].volume = k === 'main' ? 0.34 : 0.4;
    });
  }

  /**
   * Allows switching BGM file URLs dynamically per stage or when user provides new audio files.
   */
  public setStageTracks(urls: { main?: string; boss?: string; fever?: string }): void {
    const updateTrack = (mode: BgmMode, url?: string) => {
      if (!url) return;
      if (this.tracks[mode].getAttribute('data-src') === url) return;
      const wasPlaying = !this.tracks[mode].paused;
      this.tracks[mode].pause();
      this.tracks[mode].src = url;
      this.tracks[mode].setAttribute('data-src', url);
      this.tracks[mode].load();
      if (wasPlaying && !this.muted) {
        void this.tracks[mode].play().catch(() => {});
      }
    };
    updateTrack('main', urls.main);
    updateTrack('boss', urls.boss);
    updateTrack('fever', urls.fever);
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

  public startBgm(mode: BgmMode = 'main'): void {
    this.unlock();
    this.currentMode = mode;
    if (this.muted) return;

    this.bgmStarted = true;
    (Object.keys(this.tracks) as BgmMode[]).forEach((k) => {
      if (k !== mode) {
        this.tracks[k].pause();
      }
    });
    const active = this.tracks[mode];
    if (active.paused) {
      if (mode === 'fever') active.currentTime = 0;
      void active.play().catch(() => {});
    }
  }

  public stopBgm(): void {
    (Object.keys(this.tracks) as BgmMode[]).forEach((k) => this.tracks[k].pause());
    this.bgmStarted = false;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      (Object.keys(this.tracks) as BgmMode[]).forEach((k) => this.tracks[k].pause());
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

  public playHit(heavy = false, crit = false): void {
    if (crit) {
      this.playTone(460, 140, 0.12, 'sawtooth', 0.15);
      this.playTone(720, 960, 0.08, 'triangle', 0.1);
    } else if (heavy) {
      this.playTone(170, 52, 0.14, 'square', 0.16);
      this.playTone(320, 110, 0.08, 'triangle', 0.12);
    } else {
      this.playTone(230, 80, 0.08, 'triangle', 0.11);
    }
  }

  public playKick(): void {
    this.playTone(340, 95, 0.11, 'sine', 0.13);
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

  public playComboMilestone(): void {
    this.playTone(587.33, 880, 0.14, 'triangle', 0.13);
  }

  public playBossWarn(): void {
    [220, 180, 240].forEach((f, i) => {
      setTimeout(() => this.playTone(f, f * 0.7, 0.22, 'sawtooth', 0.14), i * 180);
    });
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
