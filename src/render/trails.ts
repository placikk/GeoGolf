import { Vec2, add, dist, norm, scale, sub } from "../core/vec";

export function pathLength(path: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
  return total;
}

export function positionAt(path: Vec2[], s: number): Vec2 {
  if (path.length === 0) return { x: 0, y: 0 };
  if (s <= 0) return path[0];
  let left = s;
  for (let i = 1; i < path.length; i++) {
    const seg = dist(path[i - 1], path[i]);
    if (left <= seg) {
      const dir = norm(sub(path[i], path[i - 1]));
      return add(path[i - 1], scale(dir, left));
    }
    left -= seg;
  }
  return path[path.length - 1];
}

export function trailSegment(path: Vec2[], s: number, trailLength: number): Vec2[] {
  const from = Math.max(0, s - trailLength);
  const out: Vec2[] = [positionAt(path, from)];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += dist(path[i - 1], path[i]);
    if (acc > from && acc < s) out.push(path[i]);
  }
  out.push(positionAt(path, s));
  return out;
}
