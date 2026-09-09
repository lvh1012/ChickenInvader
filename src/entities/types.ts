export type EnemyKind = "scout" | "armored" | "diver" | "boss";
export type Formation = "rows" | "zigzag" | "sine" | "vee" | "arc";
export type PowerUpKind = "weapon" | "rapid" | "shield";

export interface Body {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Projectile extends Body {
  hostile: boolean;
  damage: number;
  life: number;
  phase: number;
}

export interface Enemy extends Body {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  originX: number;
  originY: number;
  phase: number;
  age: number;
  fireTimer: number;
  diving: boolean;
  hitTimer: number;
  score: number;
}

export interface Particle extends Body {
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "line" | "star" | "feather" | "scribble";
}

export interface PowerUp extends Body {
  kind: PowerUpKind;
  age: number;
}

export interface Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  hp: number;
  weaponLevel: number;
  rapidTimer: number;
  shieldTimer: number;
  invulnerableTimer: number;
  fireTimer: number;
}
