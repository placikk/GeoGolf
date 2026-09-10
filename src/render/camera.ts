import { Vec2, vec } from "../core/vec";

export interface Camera {
  toScreen(p: Vec2): Vec2;
  toWorld(p: Vec2): Vec2;
  /** pikseli na jednostkę świata */
  scale: number;
}

export function makeCamera(width: number, height: number, margin = 0.06): Camera {
  const scale = (Math.min(width, height) * (1 - 2 * margin)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return {
    scale,
    toScreen: (p) => vec(cx + p.x * scale, cy - p.y * scale),
    toWorld: (p) => vec((p.x - cx) / scale, (cy - p.y) / scale),
  };
}
