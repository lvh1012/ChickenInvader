export class Pool<T extends { active: boolean }> {
  readonly items: T[];

  constructor(size: number, factory: () => T) {
    this.items = Array.from({ length: size }, factory);
  }

  acquire(): T | undefined {
    const item = this.items.find((candidate) => !candidate.active);
    if (item) item.active = true;
    return item;
  }

  clear(): void {
    for (const item of this.items) item.active = false;
  }

  get activeCount(): number {
    let count = 0;
    for (const item of this.items) if (item.active) count += 1;
    return count;
  }
}
