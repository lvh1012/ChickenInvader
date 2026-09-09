import { WORLD } from "../config/balance";
import { clamp } from "../utils/math";

export interface InputSnapshot {
  x: number;
  y: number;
  firing: boolean;
  pointerActive: boolean;
}

export class InputManager {
  private readonly keys = new Set<string>();
  private pointerActive = false;
  private pointerX = WORLD.width / 2;
  private pointerY = WORLD.height * 0.82;
  private pauseHandler: (() => void) | undefined;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.reset);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  setPauseHandler(handler: () => void): void {
    this.pauseHandler = handler;
  }

  sample(): InputSnapshot {
    let x = 0;
    let y = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) x -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) x += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) y -= 1;
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) y += 1;
    const length = Math.hypot(x, y) || 1;
    return {
      x: x / length,
      y: y / length,
      firing: this.keys.has("Space") || this.pointerActive,
      pointerActive: this.pointerActive,
    };
  }

  getPointerTarget(): { x: number; y: number } {
    return { x: this.pointerX, y: this.pointerY };
  }

  reset = (): void => {
    this.keys.clear();
    this.pointerActive = false;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) this.pauseHandler?.();
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.canvas.setPointerCapture(event.pointerId);
    this.pointerActive = true;
    this.updatePointer(event);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.pointerActive) this.updatePointer(event);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.pointerActive = false;
  };

  private updatePointer(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerX = clamp(((event.clientX - rect.left) / rect.width) * WORLD.width, 40, WORLD.width - 40);
    this.pointerY = clamp(((event.clientY - rect.top) / rect.height) * WORLD.height - 80, 120, WORLD.height - 75);
  }
}
