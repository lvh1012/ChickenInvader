import { BALANCE, QUALITY, WORLD, type Quality } from "../config/balance";
import type { Enemy, Player, PowerUp, Projectile } from "../entities/types";
import { DoodleRenderer } from "../rendering/DoodleRenderer";
import { ParticleSystem } from "../systems/ParticleSystem";
import { SpatialGrid } from "../systems/SpatialGrid";
import { SpawnSystem } from "../systems/SpawnSystem";
import { Pool } from "../utils/Pool";
import { circlesOverlap, clamp, lerp } from "../utils/math";
import { AudioManager } from "./AudioManager";
import { InputManager } from "./InputManager";
import type { Settings } from "./Storage";

export type GameState = "BOOT" | "MENU" | "PLAYING" | "PAUSED" | "WAVE_COMPLETE" | "GAME_OVER";

interface GameCallbacks {
  hud: (score: number, wave: number, hp: number, weapon: number) => void;
  state: (state: GameState) => void;
  boss: (visible: boolean, hp: number, maxHp: number) => void;
  waveBanner: (message: string) => void;
  debug: (text: string) => void;
}

const makeProjectile = (): Projectile => ({
  active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 8,
  hostile: false, damage: 1, life: 0, phase: 0,
});

export class Game {
  private context: CanvasRenderingContext2D;
  private renderer: DoodleRenderer;
  private input: InputManager;
  private audio = new AudioManager();
  private spawnSystem = new SpawnSystem();
  private particles = new ParticleSystem();
  private spatialGrid = new SpatialGrid(BALANCE.spatialCellSize, Math.ceil(WORLD.width / BALANCE.spatialCellSize));
  private playerBullets = new Pool<Projectile>(BALANCE.maxPlayerBullets, makeProjectile);
  private enemyBullets = new Pool<Projectile>(BALANCE.maxEnemyBullets, makeProjectile);
  private enemies: Enemy[] = [];
  private powerUps: PowerUp[] = [];
  private player: Player = this.createPlayer();
  private state: GameState = "BOOT";
  private settings: Settings;
  private quality: Exclude<Quality, "auto"> = "high";
  private score = 0;
  private wave = 0;
  private waveTimer = 0;
  private lastTime = 0;
  private elapsed = 0;
  private shake = 0;
  private hitStop = 0;
  private bossSummoned = false;
  private fps = 60;
  private fpsSamples = 0;
  private slowSeconds = 0;
  private readonly debugEnabled = new URLSearchParams(location.search).get("debug") === "1";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    settings: Settings,
    private readonly callbacks: GameCallbacks,
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D is unavailable in this browser.");
    this.context = context;
    this.renderer = new DoodleRenderer(context);
    this.settings = settings;
    this.input = new InputManager(canvas);
    this.input.setPauseHandler(() => this.togglePause());
    this.applySettings(settings);
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
    document.addEventListener("visibilitychange", () => {
      this.input.reset();
      if (document.hidden && this.state === "PLAYING") this.pause();
    });
    this.setState("MENU");
    requestAnimationFrame(this.loop);
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    this.audio.configure(settings.sfx, settings.music);
    if (settings.quality === "auto") {
      const pixels = innerWidth * innerHeight * Math.min(devicePixelRatio || 1, 2);
      this.quality = /Mobi|Android/i.test(navigator.userAgent) || pixels > 3_500_000 ? "medium" : "high";
    } else {
      this.quality = settings.quality;
    }
  }

  start(): void {
    this.audio.unlock();
    this.restart();
  }

  restart(): void {
    this.audio.unlock();
    this.score = 0;
    this.wave = 0;
    this.player = this.createPlayer();
    this.enemies = [];
    this.powerUps = [];
    this.playerBullets.clear();
    this.enemyBullets.clear();
    this.particles.clear();
    this.bossSummoned = false;
    this.setState("PLAYING");
    this.beginNextWave();
  }

  pause(): void {
    if (this.state !== "PLAYING" && this.state !== "WAVE_COMPLETE") return;
    this.setState("PAUSED");
  }

  resume(): void {
    if (this.state !== "PAUSED") return;
    this.lastTime = performance.now();
    this.setState("PLAYING");
  }

  togglePause(): void {
    if (this.state === "PAUSED") this.resume();
    else this.pause();
  }

  quit(): void {
    this.enemies = [];
    this.powerUps = [];
    this.playerBullets.clear();
    this.enemyBullets.clear();
    this.particles.clear();
    this.callbacks.boss(false, 0, 1);
    this.setState("MENU");
  }

  private loop = (timestamp: number): void => {
    const rawDelta = this.lastTime ? (timestamp - this.lastTime) / 1000 : 1 / 60;
    this.lastTime = timestamp;
    const delta = Math.min(rawDelta, 0.05);
    this.elapsed += delta;
    this.trackPerformance(rawDelta);

    if (this.hitStop > 0) this.hitStop -= delta;
    else if (this.state === "PLAYING" || this.state === "WAVE_COMPLETE") this.update(delta);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(delta: number): void {
    if (this.state === "WAVE_COMPLETE") {
      this.waveTimer -= delta;
      this.particles.update(delta);
      if (this.waveTimer <= 0) {
        this.setState("PLAYING");
        this.beginNextWave();
      }
      return;
    }

    this.updatePlayer(delta);
    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updatePowerUps(delta);
    this.particles.update(delta);
    this.checkCollisions();

    if (this.enemies.every((enemy) => !enemy.active)) this.completeWave();
    this.shake = Math.max(0, this.shake - delta * 35);
    this.callbacks.hud(this.score, this.wave, this.player.hp, this.player.weaponLevel);
  }

  private updatePlayer(delta: number): void {
    const input = this.input.sample();
    if (input.pointerActive) {
      const target = this.input.getPointerTarget();
      this.player.targetX = target.x;
      this.player.targetY = target.y;
      const follow = 1 - Math.exp(-16 * delta);
      this.player.x = lerp(this.player.x, this.player.targetX, follow);
      this.player.y = lerp(this.player.y, this.player.targetY, follow);
    } else {
      this.player.x += input.x * BALANCE.playerSpeed * delta;
      this.player.y += input.y * BALANCE.playerSpeed * delta;
    }
    this.player.x = clamp(this.player.x, 48, WORLD.width - 48);
    this.player.y = clamp(this.player.y, 120, WORLD.height - 80);
    this.player.fireTimer -= delta;
    this.player.rapidTimer = Math.max(0, this.player.rapidTimer - delta);
    this.player.shieldTimer = Math.max(0, this.player.shieldTimer - delta);
    this.player.invulnerableTimer = Math.max(0, this.player.invulnerableTimer - delta);
    if (input.firing && this.player.fireTimer <= 0) this.firePlayer();
  }

  private updateEnemies(delta: number): void {
    const activeCount = this.enemies.reduce((sum, enemy) => sum + Number(enemy.active), 0);
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.age += delta;
      enemy.hitTimer = Math.max(0, enemy.hitTimer - delta);
      enemy.fireTimer -= delta;

      if (enemy.kind === "boss") {
        const enter = clamp(enemy.age / 2, 0, 1);
        enemy.y = lerp(-190, enemy.originY, enter);
        enemy.x = enemy.originX + Math.sin(enemy.age * 0.78) * 245;
        if (enemy.fireTimer <= 0 && enter >= 1) this.fireBoss(enemy);
        if (!this.bossSummoned && enemy.hp < enemy.maxHp * 0.52) {
          this.bossSummoned = true;
          this.summonMinions(enemy);
        }
        this.callbacks.boss(true, enemy.hp, enemy.maxHp);
        continue;
      }

      if (enemy.diving) {
        enemy.y += (250 + this.wave * 11) * delta;
        enemy.x += Math.sin(enemy.age * 5 + enemy.phase) * 175 * delta;
        if (enemy.y > WORLD.height + 80) {
          enemy.diving = false;
          enemy.age = -0.5;
        }
      } else {
        const arrival = clamp((enemy.age + 0.5) / 1.8, 0, 1);
        enemy.y = lerp(-120, enemy.originY, arrival) + Math.sin(enemy.age * 1.7 + enemy.phase) * 18;
        enemy.x = clamp(enemy.originX + Math.sin(enemy.age * (0.7 + this.wave * 0.015) + enemy.phase) * (54 + this.wave * 2), 48, WORLD.width - 48);
        if (enemy.kind === "diver" && enemy.age > 3 && Math.sin(enemy.age * 0.55 + enemy.phase) > 0.997) enemy.diving = true;
      }

      if (enemy.fireTimer <= 0 && enemy.y > 100 && activeCount < 40) this.fireEnemy(enemy);
    }
  }

  private updateProjectiles(delta: number): void {
    for (const bullet of this.playerBullets.items) {
      if (!bullet.active) continue;
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      if (bullet.life <= 0 || bullet.y < -40 || bullet.x < -40 || bullet.x > WORLD.width + 40) bullet.active = false;
    }
    for (const bullet of this.enemyBullets.items) {
      if (!bullet.active) continue;
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      if (bullet.life <= 0 || bullet.y > WORLD.height + 40 || bullet.y < -60 || bullet.x < -60 || bullet.x > WORLD.width + 60) bullet.active = false;
    }
  }

  private updatePowerUps(delta: number): void {
    for (const power of this.powerUps) {
      if (!power.active) continue;
      power.age += delta;
      power.y += power.vy * delta;
      power.x += Math.sin(power.age * 3) * 22 * delta;
      if (power.y > WORLD.height + 50) power.active = false;
    }
  }

  private checkCollisions(): void {
    this.spatialGrid.rebuild(this.enemies);
    for (const bullet of this.playerBullets.items) {
      if (!bullet.active) continue;
      const candidates = this.spatialGrid.query(bullet.x, bullet.y, bullet.radius + 145);
      for (const enemy of candidates) {
        if (!enemy.active || !circlesOverlap(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.radius * 0.82)) continue;
        bullet.active = false;
        enemy.hp -= bullet.damage;
        enemy.hitTimer = 0.09;
        this.audio.play("hit");
        this.particles.burst(bullet.x, bullet.y, this.particleAmount(4), true);
        if (enemy.hp <= 0) this.destroyEnemy(enemy);
        break;
      }
    }

    if (this.player.invulnerableTimer <= 0 && this.player.shieldTimer <= 0) {
      for (const bullet of this.enemyBullets.items) {
        if (!bullet.active || !circlesOverlap(bullet.x, bullet.y, bullet.radius, this.player.x, this.player.y, this.player.radius)) continue;
        bullet.active = false;
        this.hurtPlayer();
        break;
      }
      for (const enemy of this.enemies) {
        if (!enemy.active || !circlesOverlap(enemy.x, enemy.y, enemy.radius * 0.72, this.player.x, this.player.y, this.player.radius)) continue;
        if (enemy.kind !== "boss") enemy.active = false;
        this.hurtPlayer();
        break;
      }
    } else if (this.player.shieldTimer > 0) {
      for (const bullet of this.enemyBullets.items) {
        if (bullet.active && circlesOverlap(bullet.x, bullet.y, bullet.radius, this.player.x, this.player.y, 52)) {
          bullet.active = false;
          this.particles.burst(bullet.x, bullet.y, this.particleAmount(3));
        }
      }
    }

    for (const power of this.powerUps) {
      if (!power.active || !circlesOverlap(power.x, power.y, power.radius, this.player.x, this.player.y, this.player.radius + 8)) continue;
      power.active = false;
      if (power.kind === "weapon") this.player.weaponLevel = Math.min(4, this.player.weaponLevel + 1);
      else if (power.kind === "rapid") this.player.rapidTimer = 12;
      else this.player.shieldTimer = 10;
      this.score += 300;
      this.audio.play("power");
      this.particles.burst(power.x, power.y, this.particleAmount(18));
    }
  }

  private firePlayer(): void {
    const level = this.player.weaponLevel;
    const count = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 5;
    for (let index = 0; index < count; index += 1) {
      const bullet = this.playerBullets.acquire();
      if (!bullet) break;
      const spread = (index - (count - 1) / 2) * 0.105;
      bullet.x = this.player.x + (index - (count - 1) / 2) * 13;
      bullet.y = this.player.y - 52;
      bullet.vx = Math.sin(spread) * BALANCE.bulletSpeed;
      bullet.vy = -Math.cos(spread) * BALANCE.bulletSpeed;
      bullet.radius = 7;
      bullet.hostile = false;
      bullet.damage = 1;
      bullet.life = 2;
      bullet.phase = Math.random() * Math.PI * 2;
    }
    this.player.fireTimer = BALANCE.baseFireInterval * (this.player.rapidTimer > 0 ? 0.48 : 1);
    this.audio.play("shoot");
  }

  private fireEnemy(enemy: Enemy): void {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    const speed = BALANCE.enemyBulletSpeed + this.wave * 9;
    this.spawnEnemyBullet(enemy.x, enemy.y + 30, (dx / magnitude) * speed, (dy / magnitude) * speed);
    enemy.fireTimer = Math.max(0.75, 3.2 - this.wave * 0.1) + Math.random() * 2.2;
  }

  private fireBoss(boss: Enemy): void {
    const phase = Math.floor(boss.age / 5) % 3;
    if (phase === 0) {
      const total = 14;
      const gapDirection = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      for (let index = 0; index < total; index += 1) {
        const angle = (index / total) * Math.PI * 2 + boss.age * 0.15;
        const distanceFromGap = Math.abs(Math.atan2(Math.sin(angle - gapDirection), Math.cos(angle - gapDirection)));
        if (distanceFromGap < 0.38) continue;
        this.spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 300, Math.sin(angle) * 300);
      }
      boss.fireTimer = 1.55;
    } else if (phase === 1) {
      const aim = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      for (let index = -2; index <= 2; index += 1) {
        const angle = aim + index * 0.17;
        this.spawnEnemyBullet(boss.x, boss.y + 70, Math.cos(angle) * 370, Math.sin(angle) * 370);
      }
      boss.fireTimer = 0.95;
    } else {
      for (let index = 0; index < 4; index += 1) {
        const angle = boss.age * 1.6 + index * (Math.PI / 2);
        this.spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 315, Math.sin(angle) * 315);
      }
      boss.fireTimer = 0.32;
    }
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number): void {
    const bullet = this.enemyBullets.acquire();
    if (!bullet) return;
    bullet.x = x;
    bullet.y = y;
    bullet.vx = vx;
    bullet.vy = vy;
    bullet.radius = 10;
    bullet.hostile = true;
    bullet.damage = 1;
    bullet.life = 7;
    bullet.phase = Math.random() * Math.PI * 2;
  }

  private summonMinions(boss: Enemy): void {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const hp = 2 + Math.floor(this.wave / 5);
      this.enemies.push({
        active: true, id: 100000 + index, kind: "diver",
        x: boss.x + Math.cos(angle) * 100, y: boss.y + Math.sin(angle) * 80,
        vx: 0, vy: 0, radius: 36, hp, maxHp: hp,
        originX: clamp(boss.x + Math.cos(angle) * 250, 60, WORLD.width - 60),
        originY: 480 + Math.sin(angle) * 90, phase: angle, age: 1.5,
        fireTimer: 1.2 + index * 0.2, diving: false, hitTimer: 0, score: 300,
      });
    }
    this.callbacks.waveBanner("THE BIG CLUCK CALLED FOR BACKUP!");
  }

  private destroyEnemy(enemy: Enemy): void {
    enemy.active = false;
    this.score += enemy.score;
    this.audio.play("destroy");
    this.particles.burst(enemy.x, enemy.y, this.particleAmount(enemy.kind === "boss" ? 70 : 16), true);
    this.hitStop = enemy.kind === "boss" ? 0.11 : 0.025;
    this.shake = Math.max(this.shake, enemy.kind === "boss" ? 15 : 4);
    if (enemy.kind === "boss") this.callbacks.boss(false, 0, 1);
    else if (Math.random() < 0.12) {
      const kinds: PowerUp["kind"][] = ["weapon", "rapid", "shield"];
      this.powerUps.push({
        active: true, kind: kinds[Math.floor(Math.random() * kinds.length)] ?? "weapon",
        x: enemy.x, y: enemy.y, vx: 0, vy: 125, radius: 31, age: 0,
      });
    }
  }

  private hurtPlayer(): void {
    this.player.hp -= 1;
    this.player.invulnerableTimer = BALANCE.respawnInvulnerability;
    this.player.weaponLevel = Math.max(1, this.player.weaponLevel - 1);
    this.player.x = WORLD.width / 2;
    this.player.y = WORLD.height * 0.82;
    this.shake = 18;
    this.hitStop = 0.08;
    this.audio.play("hurt");
    this.particles.burst(this.player.x, this.player.y, this.particleAmount(28), true);
    this.callbacks.hud(this.score, this.wave, this.player.hp, this.player.weaponLevel);
    if (this.player.hp <= 0) {
      this.enemyBullets.clear();
      this.callbacks.boss(false, 0, 1);
      this.setState("GAME_OVER");
    }
  }

  private beginNextWave(): void {
    this.wave += 1;
    this.bossSummoned = false;
    this.enemies = this.spawnSystem.createWave(this.wave);
    this.callbacks.waveBanner(this.wave % BALANCE.bossEvery === 0 ? "⚠ BOSS WAVE" : `WAVE ${String(this.wave).padStart(2, "0")}`);
    if (this.wave % BALANCE.bossEvery === 0) this.audio.play("warning");
    this.callbacks.hud(this.score, this.wave, this.player.hp, this.player.weaponLevel);
  }

  private completeWave(): void {
    if (this.state !== "PLAYING") return;
    this.score += this.wave * 500;
    this.waveTimer = BALANCE.waveInterstitial;
    this.enemyBullets.clear();
    this.callbacks.boss(false, 0, 1);
    this.callbacks.waveBanner(`WAVE ${String(this.wave).padStart(2, "0")} CLEAR`);
    this.setState("WAVE_COMPLETE");
  }

  private render(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const motionScale = this.settings.reducedEffects ? 0 : QUALITY[this.quality].shake;
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake * motionScale : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake * motionScale : 0;
    this.context.save();
    this.context.translate(shakeX, shakeY);
    this.renderer.clear(this.elapsed);
    for (const power of this.powerUps) if (power.active) this.renderer.powerUp(power, this.elapsed);
    for (const bullet of this.playerBullets.items) if (bullet.active) this.renderer.projectile(bullet, this.elapsed);
    for (const bullet of this.enemyBullets.items) if (bullet.active) this.renderer.projectile(bullet, this.elapsed);
    for (const enemy of this.enemies) if (enemy.active) this.renderer.enemy(enemy, this.elapsed);
    for (const particle of this.particles.pool.items) if (particle.active) this.renderer.particle(particle);
    if (this.state !== "MENU") this.renderer.player(this.player, this.elapsed);
    this.context.restore();
  }

  private setState(state: GameState): void {
    this.state = state;
    this.callbacks.state(state);
  }

  private resize = (): void => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(WORLD.width * dpr);
    const height = Math.round(WORLD.height * dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  private particleAmount(base: number): number {
    if (this.settings.reducedEffects) return Math.max(2, Math.round(base * 0.25));
    return Math.max(2, Math.round(base * QUALITY[this.quality].particles));
  }

  private trackPerformance(delta: number): void {
    const currentFps = delta > 0 ? Math.min(120, 1 / delta) : 60;
    this.fps = lerp(this.fps, currentFps, 0.05);
    this.fpsSamples += 1;
    if (this.settings.quality === "auto") {
      this.slowSeconds = this.fps < 46 ? this.slowSeconds + delta : Math.max(0, this.slowSeconds - delta * 0.5);
      if (this.slowSeconds > 4) {
        this.quality = this.quality === "high" ? "medium" : "low";
        this.slowSeconds = 0;
      }
    }
    if (this.debugEnabled && this.fpsSamples % 12 === 0) {
      this.callbacks.debug([
        `FPS ${this.fps.toFixed(0)}  ${(delta * 1000).toFixed(1)}ms`,
        `Enemies ${this.enemies.reduce((sum, enemy) => sum + Number(enemy.active), 0)}`,
        `Player shots ${this.playerBullets.activeCount}/${BALANCE.maxPlayerBullets}`,
        `Enemy shots ${this.enemyBullets.activeCount}/${BALANCE.maxEnemyBullets}`,
        `Particles ${this.particles.pool.activeCount}/${BALANCE.maxParticles}`,
        `Quality ${this.quality}`,
      ].join("\n"));
    }
  }

  private createPlayer(): Player {
    return {
      x: WORLD.width / 2, y: WORLD.height * 0.82,
      targetX: WORLD.width / 2, targetY: WORLD.height * 0.82,
      radius: BALANCE.playerRadius, hp: BALANCE.playerMaxHp, weaponLevel: 1,
      rapidTimer: 0, shieldTimer: 0, invulnerableTimer: 1.2, fireTimer: 0,
    };
  }
}
