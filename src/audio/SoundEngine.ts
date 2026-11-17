import { BOSS_BGM_URLS, NORMAL_STAGE_BGM_URLS } from '../data/stages';

export type BgmMode = 'main' | 'boss';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private tracks: Record<BgmMode, HTMLAudioElement>;
  private playlists: Record<BgmMode, string[]>;
  private activeUrls: Record<BgmMode, string | null> = {
    main: null,
    boss: null,
  };
  private lastPlayedUrls: Record<BgmMode, string | null> = {
    main: null,
    boss: null,
  };
  private muted = false;
  private bgmStarted = false;
  private currentMode: BgmMode = 'main';

  constructor() {
    this.playlists = {
      main: [...NORMAL_STAGE_BGM_URLS],
      boss: [...BOSS_BGM_URLS],
    };
    this.tracks = {
      main: new Audio(),
      boss: new Audio(),
    };

    (Object.keys(this.tracks) as BgmMode[]).forEach((k) => {
      this.tracks[k].loop = false;
      this.tracks[k].volume = k === 'main' ? 0.34 : 0.4;
      this.tracks[k].addEventListener('ended', () => {
        if (this.currentMode !== k || !this.bgmStarted || this.muted) return;
        const finishedUrl = this.activeUrls[k];
        const nextUrl = this.pickRandomTrack(k, finishedUrl);
        if (!nextUrl) return;
        this.setTrackSource(k, nextUrl, true);
        void this.tracks[k].play().catch(() => {});
      });
    });
  }

  private pickRandomTrack(mode: BgmMode, excludeUrl?: string | null): string {
    const pool = this.playlists[mode];
    if (pool.length === 0) return '';
    if (pool.length === 1) return pool[0];
    const filtered = excludeUrl ? pool.filter((u) => u !== excludeUrl) : pool;
    const candidates = filtered.length > 0 ? filtered : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private setTrackSource(mode: BgmMode, url: string, resetTime: boolean): void {
    const audio = this.tracks[mode];
    this.activeUrls[mode] = url;
    this.lastPlayedUrls[mode] = url;
    if (audio.getAttribute('data-src') !== url) {
      audio.pause();
      audio.src = url;
      audio.setAttribute('data-src', url);
      audio.load();
    }
    if (resetTime) {
      audio.currentTime = 0;
    }
  }

  /**
   * Allows switching BGM file URLs (single URL or playlist) dynamically per stage.
   */
  public setStageTracks(urls: {
    main?: string | string[];
    boss?: string | string[];
  }): void {
    const updatePlaylist = (mode: BgmMode, raw?: string | string[]) => {
      if (!raw) return;
      const list = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
      if (list.length === 0) return;

      const prev = this.playlists[mode];
      const same = prev.length === list.length && prev.every((u, i) => u === list[i]);
      if (same) return;

      this.playlists[mode] = [...list];
      const curUrl = this.activeUrls[mode];
      if (curUrl && !list.includes(curUrl)) {
        const wasPlaying = !this.tracks[mode].paused;
        this.tracks[mode].pause();
        this.activeUrls[mode] = null;
        if (wasPlaying && !this.muted && this.bgmStarted && this.currentMode === mode) {
          const nextUrl = this.pickRandomTrack(mode, this.lastPlayedUrls[mode]);
          if (nextUrl) {
            this.setTrackSource(mode, nextUrl, true);
            void this.tracks[mode].play().catch(() => {});
          }
        }
      }
    };

    updatePlaylist('main', urls.main);
    updatePlaylist('boss', urls.boss);
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

  public startBgm(mode: BgmMode = 'main', forceNew = false): void {
    this.unlock();
    this.currentMode = mode;
    this.bgmStarted = true;

    (Object.keys(this.tracks) as BgmMode[]).forEach((k) => {
      if (k !== mode) {
        this.tracks[k].pause();
      }
    });

    const active = this.tracks[mode];
    const currentUrl = this.activeUrls[mode];
    const needsNewSelection =
      forceNew || !currentUrl || !this.playlists[mode].includes(currentUrl);

    if (needsNewSelection) {
      const nextUrl = this.pickRandomTrack(mode, this.lastPlayedUrls[mode]);
      if (nextUrl) {
        this.setTrackSource(mode, nextUrl, true);
      }
    }

    if (this.muted) return;

    if (active.paused) {
      void active.play().catch(() => {});
    }
  }

  public stopBgm(): void {
    (Object.keys(this.tracks) as BgmMode[]).forEach((k) => {
      this.tracks[k].pause();
      this.tracks[k].currentTime = 0;
    });
    this.activeUrls.main = null;
    this.activeUrls.boss = null;
    this.bgmStarted = false;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      (Object.keys(this.tracks) as BgmMode[]).forEach((k) => this.tracks[k].pause());
    } else if (this.bgmStarted) {
      this.startBgm(this.currentMode, false);
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
