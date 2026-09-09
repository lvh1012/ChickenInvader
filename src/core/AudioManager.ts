export type SoundName = "shoot" | "hit" | "destroy" | "power" | "hurt" | "warning";

export class AudioManager {
  private context: AudioContext | undefined;
  private musicTimer: number | undefined;
  sfxEnabled = true;
  musicEnabled = true;

  unlock(): void {
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
      this.updateMusic();
    } catch {
      this.context = undefined;
    }
  }

  configure(sfx: boolean, music: boolean): void {
    this.sfxEnabled = sfx;
    this.musicEnabled = music;
    this.updateMusic();
  }

  play(name: SoundName): void {
    if (!this.sfxEnabled || !this.context) return;
    const presets: Record<SoundName, [number, number, OscillatorType, number]> = {
      shoot: [520, 290, "square", 0.045],
      hit: [180, 120, "triangle", 0.06],
      destroy: [150, 55, "sawtooth", 0.14],
      power: [420, 860, "sine", 0.2],
      hurt: [110, 70, "square", 0.2],
      warning: [240, 160, "sawtooth", 0.25],
    };
    const preset = presets[name];
    this.tone(...preset, name === "shoot" ? 0.025 : 0.05);
  }

  private tone(start: number, end: number, type: OscillatorType, duration: number, volume: number): void {
    if (!this.context) return;
    try {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(start, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch {
      // Audio failure must never stop the game loop.
    }
  }

  private updateMusic(): void {
    if (this.musicTimer !== undefined) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = undefined;
    }
    if (!this.musicEnabled || !this.context) return;
    let step = 0;
    const notes = [110, 138.59, 164.81, 138.59, 123.47, 146.83, 174.61, 146.83];
    this.musicTimer = window.setInterval(() => {
      if (document.hidden || !this.context) return;
      this.tone(notes[step % notes.length] ?? 110, (notes[step % notes.length] ?? 110) * 0.995, "triangle", 0.16, 0.012);
      step += 1;
    }, 320);
  }
}
