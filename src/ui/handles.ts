import { Vec2, add, dist, norm, scale, sub, vec } from "../core/vec";
import { EllipseState, Handle } from "../levels/types";

const MIN_GAP = 1e-3;

export function handlePositions(state: EllipseState): { id: Handle; pos: Vec2 }[] {
  const center = scale(add(state.f1, state.f2), 0.5);
  const axis = dist(state.f1, state.f2) < 1e-9 ? vec(1, 0) : norm(sub(state.f2, state.f1));
  return [
    { id: "ognisko1", pos: state.f1 },
    { id: "ognisko2", pos: state.f2 },
    { id: "rozmiar", pos: add(center, scale(axis, state.a)) },
  ];
}

export function snapTo(p: Vec2, targets: Vec2[], radius: number): Vec2 {
  let best: Vec2 | null = null;
  let bestD = radius;
  for (const t of targets) {
    const d = dist(p, t);
    if (d <= bestD) { bestD = d; best = t; }
  }
  return best ?? p;
}

export function pickHandle(
  world: Vec2, state: EllipseState, locked: Handle[], radius: number,
): Handle | null {
  let best: Handle | null = null;
  let bestD = radius;
  for (const h of handlePositions(state)) {
    if (locked.includes(h.id)) continue;
    const d = dist(world, h.pos);
    if (d <= bestD) { bestD = d; best = h.id; }
  }
  return best;
}

export function applyDrag(state: EllipseState, handle: Handle, to: Vec2): EllipseState {
  if (handle === "rozmiar") {
    const a = (dist(to, state.f1) + dist(to, state.f2)) / 2;
    return { ...state, a: Math.max(a, dist(state.f1, state.f2) / 2 + MIN_GAP) };
  }
  const next = handle === "ognisko1" ? { ...state, f1: to } : { ...state, f2: to };
  return { ...next, a: Math.max(next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
