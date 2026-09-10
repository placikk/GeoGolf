import { Vec2, add, norm, perp, scale, vec } from "../core/vec";
import { Conic, classify, ellipseGeometry } from "../core/conic";

const SPAN = 3; // wystarczy, żeby przeciąć planszę [-1,1]² na wylot

export function conicPolyline(k: Conic, steps = 128): Vec2[] {
  if (classify(k) === "prosta") {
    const n = norm(vec(k.D, k.E));
    const denom = k.D * k.D + k.E * k.E;
    const p0 = vec((-k.F * k.D) / denom, (-k.F * k.E) / denom);
    const dir = perp(n);
    return [add(p0, scale(dir, -SPAN)), add(p0, scale(dir, SPAN))];
  }

  const g = ellipseGeometry(k);
  const u = vec(Math.cos(g.angle), Math.sin(g.angle));
  const v = perp(u);
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI;
    return add(g.center, add(scale(u, g.a * Math.cos(t)), scale(v, g.b * Math.sin(t))));
  });
}
