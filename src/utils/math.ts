export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export const circlesOverlap = (
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean => {
  const dx = ax - bx;
  const dy = ay - by;
  const radius = ar + br;
  return dx * dx + dy * dy <= radius * radius;
};

export function seededNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
