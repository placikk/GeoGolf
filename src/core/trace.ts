import { Vec2, add, dist, dot, norm, scale, sub } from "./vec";
import { Conic } from "./conic";
import { rayConic } from "./intersect";
import { normalAt, reflectDir } from "./reflect";

export interface TraceOptions {
  curves: Conic[];
  hole: Vec2;
  holeRadius: number;
  maxBounces: number;
  /** bezpiecznik: tor, który nic nie trafia, i tak ma skończoną długość */
  maxLength: number;
}

export interface TraceResult {
  /** punkt startu, kolejne punkty odbić, punkt końcowy */
  path: Vec2[];
  holed: boolean;
  length: number;
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

export function trace(start: Vec2, dir: Vec2, opt: TraceOptions): TraceResult {
  let p = start;
  let d = norm(dir);
  const path: Vec2[] = [p];
  let length = 0;

  for (let bounce = 0; bounce <= opt.maxBounces; bounce++) {
    let best: number | null = null;
    let bestCurve: Conic | null = null;
    for (const k of opt.curves) {
      const t = rayConic(p, d, k);
      if (t !== null && (best === null || t < best)) { best = t; bestCurve = k; }
    }

    const remaining = opt.maxLength - length;
    const limit = best === null ? remaining : Math.min(best, remaining);

    // dołek sprawdzamy PRZED odbiciem: piłka może wpaść w locie do ściany
    const s = clamp(dot(sub(opt.hole, p), d), 0, limit);
    const closest = add(p, scale(d, s));
    if (dist(closest, opt.hole) <= opt.holeRadius) {
      path.push(closest);
      return { path, holed: true, length: length + s };
    }

    if (best === null || bestCurve === null || best > remaining) {
      path.push(add(p, scale(d, limit)));
      return { path, holed: false, length: length + limit };
    }

    const hit = add(p, scale(d, best));
    path.push(hit);
    length += best;
    d = reflectDir(d, normalAt(bestCurve, hit));
    p = hit;
  }

  return { path, holed: false, length };
}
