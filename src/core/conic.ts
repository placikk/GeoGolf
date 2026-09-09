import { Vec2, dist, vec } from "./vec";

export interface Conic { A: number; B: number; C: number; D: number; E: number; F: number }

const EPS = 1e-12;

export const evalConic = (k: Conic, p: Vec2): number =>
  k.A * p.x * p.x + k.B * p.x * p.y + k.C * p.y * p.y + k.D * p.x + k.E * p.y + k.F;

export function classify(k: Conic): "elipsa" | "parabola" | "hiperbola" | "prosta" {
  if (Math.abs(k.A) < EPS && Math.abs(k.B) < EPS && Math.abs(k.C) < EPS) return "prosta";
  const disc = k.B * k.B - 4 * k.A * k.C;
  if (disc < -EPS) return "elipsa";
  if (disc > EPS) return "hiperbola";
  return "parabola";
}

export function ellipseFromFoci(f1: Vec2, f2: Vec2, a: number): Conic {
  const c = dist(f1, f2) / 2;
  if (a <= c) throw new Error("połowa osi wielkiej musi przekraczać połowę odległości ognisk");
  const b = Math.sqrt(a * a - c * c);
  const angle = Math.atan2(f2.y - f1.y, f2.x - f1.x);
  const u = Math.cos(angle), v = Math.sin(angle);
  const ia = 1 / (a * a), ib = 1 / (b * b);
  const cx = (f1.x + f2.x) / 2, cy = (f1.y + f2.y) / 2;

  const A = u * u * ia + v * v * ib;
  const B = 2 * u * v * (ia - ib);
  const C = v * v * ia + u * u * ib;
  return {
    A, B, C,
    D: -2 * A * cx - B * cy,
    E: -2 * C * cy - B * cx,
    F: A * cx * cx + B * cx * cy + C * cy * cy - 1,
  };
}

export function lineThrough(p: Vec2, dir: Vec2): Conic {
  const n = { x: -dir.y, y: dir.x };
  return { A: 0, B: 0, C: 0, D: n.x, E: n.y, F: -(n.x * p.x + n.y * p.y) };
}

export interface EllipseGeometry { center: Vec2; a: number; b: number; angle: number }

export function ellipseGeometry(k: Conic): EllipseGeometry {
  const det = 4 * k.A * k.C - k.B * k.B;
  if (Math.abs(det) < EPS) throw new Error("krzywa nie ma środka — to nie jest elipsa");
  const center = vec((k.B * k.E - 2 * k.C * k.D) / det, (k.B * k.D - 2 * k.A * k.E) / det);
  const fc = evalConic(k, center);
  const root = Math.hypot(k.A - k.C, k.B);
  const lamMin = (k.A + k.C - root) / 2;
  const lamMax = (k.A + k.C + root) / 2;
  const axis =
    Math.abs(k.B) < EPS
      ? (k.A <= k.C ? vec(1, 0) : vec(0, 1))
      : vec(k.B / 2, lamMin - k.A);
  return {
    center,
    a: Math.sqrt(-fc / lamMin),
    b: Math.sqrt(-fc / lamMax),
    angle: Math.atan2(axis.y, axis.x),
  };
}
