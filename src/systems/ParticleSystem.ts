import { BALANCE } from "../config/balance";
import { COLORS } from "../config/colors";
import type { Particle } from "../entities/types";
import { Pool } from "../utils/Pool";

export class ParticleSystem {
  readonly pool = new Pool<Particle>(BALANCE.maxParticles, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 2,
    life: 0,
    maxLife: 0,
    size: 0,
    rotation: 0,
    spin: 0,
    color: COLORS.ink,
    shape: "line",
  }));

  burst(x: number, y: number, amount: number, hostile = false): void {
    const shapes: Particle["shape"][] = ["line", "star", "feather", "scribble"];
    for (let index = 0; index < amount; index += 1) {
      const particle = this.pool.acquire();
      if (!particle) return;
      const angle = (index / amount) * Math.PI * 2 + Math.random() * 0.6;
      const speed = 70 + Math.random() * 260;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 0.35 + Math.random() * 0.5;
      particle.maxLife = particle.life;
      particle.size = 4 + Math.random() * 10;
      particle.rotation = angle;
      particle.spin = (Math.random() - 0.5) * 9;
      particle.color = hostile ? COLORS.danger : index % 3 === 0 ? COLORS.cyan : COLORS.ink;
      particle.shape = shapes[index % shapes.length] ?? "line";
    }
  }

  update(delta: number): void {
    for (const particle of this.pool.items) {
      if (!particle.active) continue;
      particle.life -= delta;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 90 * delta;
      particle.rotation += particle.spin * delta;
    }
  }

  clear(): void {
    this.pool.clear();
  }
}
