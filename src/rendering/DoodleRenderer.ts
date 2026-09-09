import { WORLD } from "../config/balance";
import { COLORS } from "../config/colors";
import type { Enemy, Particle, Player, PowerUp, Projectile } from "../entities/types";
import { seededNoise } from "../utils/math";

export class DoodleRenderer {
  private readonly paperPattern: CanvasPattern | null;

  constructor(private readonly context: CanvasRenderingContext2D) {
    this.paperPattern = this.createPaperPattern();
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  clear(time: number): void {
    const ctx = this.context;
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    if (this.paperPattern) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.paperPattern;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "rgba(49,84,117,.12)";
    ctx.lineWidth = 1.5;
    const drift = (time * 7) % 72;
    for (let y = -72 + drift; y < WORLD.height; y += 72) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(140,37,37,.12)";
    ctx.beginPath();
    ctx.moveTo(78, 0);
    ctx.lineTo(78, WORLD.height);
    ctx.stroke();
  }

  player(player: Player, time: number): void {
    if (player.invulnerableTimer > 0 && Math.floor(time * 10) % 2 === 0) return;
    const ctx = this.context;
    ctx.save();
    ctx.translate(player.x, player.y);
    const bob = Math.sin(time * 10) * 1.3;
    ctx.translate(0, bob);
    if (player.shieldTimer > 0) {
      ctx.strokeStyle = COLORS.success;
      ctx.lineWidth = 5;
      ctx.setLineDash([13, 8, 3, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 64, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = COLORS.ink;
    ctx.fillStyle = "rgba(49,84,117,.12)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -47);
    ctx.lineTo(28, 25);
    ctx.lineTo(62, 41);
    ctx.lineTo(30, 45);
    ctx.lineTo(18, 31);
    ctx.lineTo(0, 55);
    ctx.lineTo(-18, 31);
    ctx.lineTo(-30, 45);
    ctx.lineTo(-62, 41);
    ctx.lineTo(-28, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, 20);
    ctx.lineTo(12, -14);
    ctx.moveTo(-22, 34);
    ctx.lineTo(7, -3);
    ctx.moveTo(17, 31);
    ctx.lineTo(5, 8);
    ctx.stroke();
    ctx.strokeStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.moveTo(-12, 55);
    ctx.lineTo(-5, 78 + Math.sin(time * 25) * 5);
    ctx.moveTo(12, 55);
    ctx.lineTo(5, 78 - Math.sin(time * 21) * 5);
    ctx.stroke();
    ctx.restore();
  }

  enemy(enemy: Enemy, time: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const scale = enemy.kind === "boss" ? 2.25 : enemy.kind === "armored" ? 1.08 : 1;
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(time * 5 + enemy.phase) * 0.035 + (enemy.hitTimer > 0 ? Math.sin(time * 70) * 0.08 : 0));
    ctx.strokeStyle = enemy.hitTimer > 0 ? COLORS.danger : COLORS.ink;
    ctx.fillStyle = enemy.kind === "armored" ? "rgba(49,84,117,.18)" : "rgba(140,37,37,.08)";
    ctx.lineWidth = enemy.kind === "boss" ? 3.5 : 4.5;
    ctx.beginPath();
    ctx.ellipse(0, 7, 40, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -28, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = COLORS.danger;
    ctx.beginPath();
    ctx.moveTo(-8, -51); ctx.lineTo(-2, -64); ctx.lineTo(5, -51); ctx.lineTo(12, -62); ctx.lineTo(15, -48);
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath(); ctx.arc(-9, -31, 3, 0, Math.PI * 2); ctx.arc(9, -31, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORS.warning;
    ctx.beginPath(); ctx.moveTo(-3, -22); ctx.lineTo(16, -16); ctx.lineTo(-2, -11); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = COLORS.ink;
    ctx.beginPath();
    ctx.moveTo(-33, -2); ctx.quadraticCurveTo(-60, -22, -53, 17); ctx.quadraticCurveTo(-45, 8, -34, 16);
    ctx.moveTo(33, -2); ctx.quadraticCurveTo(60, -22, 53, 17); ctx.quadraticCurveTo(45, 8, 34, 16);
    ctx.moveTo(-13, 39); ctx.lineTo(-18, 52); ctx.moveTo(13, 39); ctx.lineTo(18, 52);
    ctx.stroke();
    if (enemy.kind === "diver") {
      ctx.strokeStyle = COLORS.danger;
      ctx.beginPath(); ctx.moveTo(-43, 27); ctx.lineTo(43, 27); ctx.stroke();
    }
    if (enemy.kind === "boss") {
      ctx.strokeStyle = COLORS.danger;
      ctx.lineWidth = 2;
      for (let offset = -29; offset <= 29; offset += 10) {
        ctx.beginPath(); ctx.moveTo(offset, -3); ctx.lineTo(offset + 12, 19); ctx.stroke();
      }
    }
    ctx.restore();
  }

  projectile(projectile: Projectile, time: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    if (projectile.hostile) {
      ctx.rotate(Math.sin(time * 7 + projectile.phase) * 0.2);
      ctx.strokeStyle = COLORS.danger;
      ctx.fillStyle = "rgba(140,37,37,.1)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 15, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(5, 3); ctx.stroke();
    } else {
      ctx.strokeStyle = COLORS.cyan;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(Math.sin(time * 18 + projectile.phase) * 2, 13);
      ctx.lineTo(-Math.sin(time * 16 + projectile.phase) * 2, -18);
      ctx.stroke();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  particle(particle: Particle): void {
    const ctx = this.context;
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = Math.max(2, particle.size * 0.28);
    ctx.beginPath();
    if (particle.shape === "star") {
      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
        const radius = index % 2 === 0 ? particle.size : particle.size * 0.38;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (particle.shape === "feather") {
      ctx.moveTo(-particle.size, 0);
      ctx.quadraticCurveTo(0, -particle.size * 0.65, particle.size, 0);
      ctx.quadraticCurveTo(0, particle.size * 0.4, -particle.size, 0);
      ctx.moveTo(-particle.size * 0.7, 0);
      ctx.lineTo(particle.size * 0.7, 0);
    } else if (particle.shape === "scribble") {
      ctx.moveTo(-particle.size, 0);
      ctx.lineTo(-particle.size * 0.4, -particle.size * 0.5);
      ctx.lineTo(0, particle.size * 0.45);
      ctx.lineTo(particle.size * 0.45, -particle.size * 0.4);
      ctx.lineTo(particle.size, 0);
    } else {
      ctx.moveTo(-particle.size, 0);
      ctx.lineTo(particle.size, seededNoise(particle.size * 13) * 3 - 1.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  powerUp(power: PowerUp, time: number): void {
    const ctx = this.context;
    const symbol = power.kind === "weapon" ? "W" : power.kind === "rapid" ? "R" : "S";
    const color = power.kind === "weapon" ? COLORS.purple : power.kind === "rapid" ? COLORS.cyan : COLORS.success;
    ctx.save();
    ctx.translate(power.x, power.y);
    ctx.rotate(time * 0.8 + power.age);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const radius = index % 2 ? 25 : 35;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-time * 0.8 - power.age);
    ctx.fillStyle = COLORS.paperBright;
    ctx.fillRect(-12, -15, 24, 28);
    ctx.fillStyle = color;
    ctx.font = "700 24px Space Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, 0, 0);
    ctx.restore();
  }

  private createPaperPattern(): CanvasPattern | null {
    const tile = document.createElement("canvas");
    tile.width = 96;
    tile.height = 96;
    const context = tile.getContext("2d");
    if (!context) return null;
    context.fillStyle = "rgba(23,38,61,.045)";
    for (let index = 0; index < 38; index += 1) {
      const x = seededNoise(index * 3 + 1) * 96;
      const y = seededNoise(index * 7 + 2) * 96;
      context.fillRect(x, y, 1, 1);
    }
    return this.context.createPattern(tile, "repeat");
  }
}
