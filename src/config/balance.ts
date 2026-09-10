export const WORLD = { width: 900, height: 1600 } as const;

export const BALANCE = {
  playerSpeed: 660,
  playerRadius: 25,
  playerMaxHp: 3,
  respawnInvulnerability: 2,
  baseFireInterval: 0.22,
  bulletSpeed: 980,
  enemyBulletSpeed: 330,
  maxPlayerBullets: 180,
  maxEnemyBullets: 220,
  maxParticles: 300,
  bossEvery: 5,
  waveInterstitial: 2.15,
  spatialCellSize: 128,
} as const;

export type Quality = "auto" | "high" | "medium" | "low";

export const QUALITY = {
  high: { particles: 1, texture: 1, shake: 1 },
  medium: { particles: 0.65, texture: 0.7, shake: 0.65 },
  low: { particles: 0.35, texture: 0.35, shake: 0.25 },
} as const;
