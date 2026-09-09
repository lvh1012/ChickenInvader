import type { Enemy } from "../entities/types";

export class SpatialGrid {
  private readonly cells = new Map<number, Enemy[]>();

  constructor(private readonly cellSize: number, private readonly columns: number) {}

  rebuild(enemies: Enemy[]): void {
    this.cells.clear();
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const key = this.key(enemy.x, enemy.y);
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(enemy);
      else this.cells.set(key, [enemy]);
    }
  }

  query(x: number, y: number, radius: number): Enemy[] {
    const result: Enemy[] = [];
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    for (let cy = minY; cy <= maxY; cy += 1) {
      for (let cx = minX; cx <= maxX; cx += 1) {
        const bucket = this.cells.get(cy * this.columns + cx);
        if (bucket) result.push(...bucket);
      }
    }
    return result;
  }

  private key(x: number, y: number): number {
    return Math.floor(y / this.cellSize) * this.columns + Math.floor(x / this.cellSize);
  }
}
