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

/** margines poza planszą [-1,1]²: tor, który go opuszcza, przepadł i nie wraca */
const BOUNDS = 2;

/** odległość wzdłuż `d` od `p`, przy której tor opuszcza [-BOUNDS, BOUNDS]², albo null */
function boundsExit(p: Vec2, d: Vec2): number | null {
  let t: number | null = null;
  const consider = (candidate: number) => {
    if (candidate > 1e-9 && (t === null || candidate < t)) t = candidate;
  };
  if (d.x > 0) consider((BOUNDS - p.x) / d.x);
  else if (d.x < 0) consider((-BOUNDS - p.x) / d.x);
  if (d.y > 0) consider((BOUNDS - p.y) / d.y);
  else if (d.y < 0) consider((-BOUNDS - p.y) / d.y);
  return t;
}

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
    // piłka, która opuszcza planszę bez trafienia w nic, przepadła — nie ma sensu
    // śledzić ją dalej aż do `maxLength`, który zostaje bezpiecznikiem ostatniej szansy
    const exit = boundsExit(p, d);
    const boundary = exit === null ? remaining : Math.min(exit, remaining);
    const limit = best === null ? boundary : Math.min(best, boundary);

    // dołek sprawdzamy PRZED odbiciem: piłka może wpaść w locie do ściany
    const s = clamp(dot(sub(opt.hole, p), d), 0, limit);
    const closest = add(p, scale(d, s));
    if (dist(closest, opt.hole) <= opt.holeRadius) {
      path.push(closest);
      return { path, holed: true, length: length + s };
    }

    if (best === null || bestCurve === null || best > boundary) {
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
