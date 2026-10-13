import { Vec2, dist, dot, perp, scale, sub, vec } from "./vec";

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

/** Parabola z ogniska i wierzchołka. `p = |F − V|` to odległość ogniskowa, oś biegnie
 *  od wierzchołka do ogniska. Równanie: (n·q)² − 4p(u·q) = 0 przy q = P − V, więc
 *  wyróżnik wychodzi zerowy z konstrukcji i `classify` nie potrzebuje wyjątku. */
export function parabolaFromFocusVertex(focus: Vec2, vertex: Vec2): Conic {
  const p = dist(focus, vertex);
  if (p < EPS) throw new Error("ognisko paraboli nie może leżeć w jej wierzchołku");
  const u = scale(sub(focus, vertex), 1 / p);
  const n = perp(u);
  const s = dot(n, vertex);
  const w = dot(u, vertex);
  return {
    A: n.x * n.x,
    B: 2 * n.x * n.y,
    C: n.y * n.y,
    D: -2 * s * n.x - 4 * p * u.x,
    E: -2 * s * n.y - 4 * p * u.y,
    F: s * s + 4 * p * w,
  };
}

/** Hiperbola z dwóch ognisk i połowy osi rzeczywistej. To DOSŁOWNIE `ellipseFromFoci`
 *  ze znakiem przy drugiej półosi: `ib = −1/b²` zamiast `+1/b²`, i warunek odwrócony
 *  na `a < c`. Stąd wyróżnik dodatni, a reszta rdzenia niczego nie zauważa. */
export function hyperbolaFromFoci(f1: Vec2, f2: Vec2, a: number): Conic {
  const c = dist(f1, f2) / 2;
  if (!(a > 0 && a < c)) throw new Error("połowa osi rzeczywistej musi leżeć w (0, połowa odległości ognisk)");
  const b = Math.sqrt(c * c - a * a);
  const angle = Math.atan2(f2.y - f1.y, f2.x - f1.x);
  const u = Math.cos(angle), v = Math.sin(angle);
  const ia = 1 / (a * a), ib = -1 / (b * b);
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

export const circleConic = (center: Vec2, radius: number): Conic => ({
  A: 1, B: 0, C: 1,
  D: -2 * center.x,
  E: -2 * center.y,
  F: center.x * center.x + center.y * center.y - radius * radius,
});

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
