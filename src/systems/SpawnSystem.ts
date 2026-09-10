import { BALANCE, WORLD } from "../config/balance";
import type { Enemy, EnemyKind, Formation } from "../entities/types";

export class SpawnSystem {
  private nextId = 1;

  createWave(wave: number): Enemy[] {
    if (wave % BALANCE.bossEvery === 0) return [this.createBoss(wave)];
    const formations: Formation[] = ["rows", "zigzag", "sine", "vee", "arc"];
    const formation = formations[(wave - 1) % formations.length] ?? "rows";
    const count = Math.min(8 + wave * 2, 36);
    const enemies: Enemy[] = [];

    for (let index = 0; index < count; index += 1) {
      const position = this.formationPosition(formation, index, count);
      const kind: EnemyKind = wave >= 3 && index % 6 === 0 ? "armored" : wave >= 2 && index % 4 === 0 ? "diver" : "scout";
      const baseHp = kind === "armored" ? 4 : kind === "diver" ? 2 : 1;
      const hp = baseHp + Math.floor(wave / 4);
      enemies.push({
        active: true,
        id: this.nextId++,
        kind,
        x: position.x,
        y: position.y - 520,
        vx: 0,
        vy: 0,
        radius: kind === "armored" ? 45 : 37,
        hp,
        maxHp: hp,
        originX: position.x,
        originY: position.y,
        phase: (index / count) * Math.PI * 2,
        age: -index * 0.045,
        fireTimer: 1.2 + Math.random() * 2.8,
        diving: false,
        hitTimer: 0,
        score: kind === "armored" ? 250 : kind === "diver" ? 180 : 100,
      });
    }
    return enemies;
  }

  private createBoss(wave: number): Enemy {
    const hp = 95 + wave * 13;
    return {
      active: true,
      id: this.nextId++,
      kind: "boss",
      x: WORLD.width / 2,
      y: -190,
      vx: 0,
      vy: 0,
      radius: 130,
      hp,
      maxHp: hp,
      originX: WORLD.width / 2,
      originY: 285,
      phase: 0,
      age: 0,
      fireTimer: 1.6,
      diving: false,
      hitTimer: 0,
      score: 6000,
    };
  }

  private formationPosition(formation: Formation, index: number, count: number): { x: number; y: number } {
    const columns = Math.min(7, Math.ceil(Math.sqrt(count * 1.7)));
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spacingX = 108;
    const baseX = WORLD.width / 2 + (column - (Math.min(columns, count) - 1) / 2) * spacingX;
    const baseY = 210 + row * 112;
    switch (formation) {
      case "zigzag": return { x: baseX, y: baseY + (column % 2) * 45 };
      case "sine": return { x: baseX, y: baseY + Math.sin(column * 1.25) * 60 };
      case "vee": return { x: baseX, y: baseY + Math.abs(column - (columns - 1) / 2) * 42 };
      case "arc": {
        const normalized = (column - (columns - 1) / 2) / Math.max(1, columns / 2);
        return { x: baseX, y: baseY + normalized * normalized * 90 };
      }
      default: return { x: baseX, y: baseY };
    }
  }
}
