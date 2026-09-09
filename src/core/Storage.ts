import type { Quality } from "../config/balance";

export interface Settings {
  sfx: boolean;
  music: boolean;
  reducedEffects: boolean;
  quality: Quality;
}

const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  music: true,
  reducedEffects: false,
  quality: "auto",
};

export class SafeStorage {
  loadSettings(): Settings {
    try {
      const value = localStorage.getItem("doodle-sky-settings");
      if (!value) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(value) as Partial<Settings>;
      return {
        sfx: typeof parsed.sfx === "boolean" ? parsed.sfx : true,
        music: typeof parsed.music === "boolean" ? parsed.music : true,
        reducedEffects: typeof parsed.reducedEffects === "boolean" ? parsed.reducedEffects : false,
        quality: ["auto", "high", "medium", "low"].includes(parsed.quality ?? "")
          ? (parsed.quality as Quality)
          : "auto",
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings: Settings): void {
    try {
      localStorage.setItem("doodle-sky-settings", JSON.stringify(settings));
    } catch {
      // Storage can be blocked in private or hardened browser contexts.
    }
  }

  getBestScore(): number {
    try {
      const score = Number.parseInt(localStorage.getItem("doodle-sky-best") ?? "0", 10);
      return Number.isFinite(score) && score > 0 ? score : 0;
    } catch {
      return 0;
    }
  }

  saveBestScore(score: number): void {
    try {
      localStorage.setItem("doodle-sky-best", String(Math.max(score, this.getBestScore())));
    } catch {
      // Best score persistence is optional; gameplay must keep working.
    }
  }
}
