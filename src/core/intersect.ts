import { Vec2 } from "./vec";
import { Conic, evalConic } from "./conic";

/** Trafienia bliższe niż ten próg są odrzucane — piłka stoi dokładnie na krzywej
 *  po odbiciu i bez tego natychmiast „trafiłaby" w nią ponownie w t ≈ 0. */
export const EPS_T = 1e-9;

const EPS_A = 1e-12;

export function rayConic(p: Vec2, d: Vec2, k: Conic): number | null {
  const a = k.A * d.x * d.x + k.B * d.x * d.y + k.C * d.y * d.y;
  const b =
    2 * k.A * p.x * d.x +
    k.B * (p.x * d.y + p.y * d.x) +
    2 * k.C * p.y * d.y +
    k.D * d.x +
    k.E * d.y;
  const c = evalConic(k, p);

  if (Math.abs(a) < EPS_A) {
    if (Math.abs(b) < EPS_A) return null;
    const t = -c / b;
    return t > EPS_T ? t : null;
  }

  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  // postać stabilna numerycznie: unika odejmowania bliskich sobie liczb
  const q = -0.5 * (b + Math.sign(b || 1) * sq);
  const t1 = q / a;
  const t2 = c / q;

  const hits = [t1, t2].filter((t) => Number.isFinite(t) && t > EPS_T).sort((x, y) => x - y);
  return hits.length > 0 ? hits[0] : null;
}
