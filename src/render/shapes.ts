import { Vec2, add, dot, norm, perp, scale, sub, vec } from "../core/vec";
import { Conic, classify, ellipseGeometry } from "../core/conic";
import { Piece } from "../core/piece";
import { framePoint } from "../core/frame";

export const SPAN = 3; // wystarczy, żeby przeciąć planszę [-1,1]² na wylot
const TAU = 2 * Math.PI;
const mod = (x: number): number => ((x % TAU) + TAU) % TAU;

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

/** Łamana kawałka krzywej. Łuk elipsy: parametry `from` i `to`, próbkowanie w tym
 *  kierunku, który przechodzi przez `via`; końce łuku leżą w łamanej DOKŁADNIE.
 *  Odcinek: dwa punkty. Brak łuku: jak `conicPolyline`. */
export function piecePolyline(piece: Piece, steps = 128): Vec2[] {
  const range = piece.range;
  if (range !== undefined) {
    // krzywa nieograniczona: równe kroki parametru. Dla paraboli parametr to odsunięcie
    // prostopadłe, więc punkty wychodzą równomiernie; dla hiperboli gęstnieją przy
    // wierzchołku, czyli tam, gdzie krzywizna jest największa — dokładnie gdzie trzeba.
    const n = Math.max(2, steps);
    return Array.from({ length: n + 1 }, (_, i) =>
      framePoint(range.frame, range.from + ((range.to - range.from) * i) / n));
  }
  const arc = piece.arc;
  if (arc === undefined) return conicPolyline(piece.conic, steps);
  if (classify(piece.conic) === "prosta") return [arc.from, arc.to];

  const g = ellipseGeometry(piece.conic);
  const u = vec(Math.cos(g.angle), Math.sin(g.angle));
  const v = perp(u);
  const param = (p: Vec2): number => {
    const q = sub(p, g.center);
    return Math.atan2(dot(q, v) / g.b, dot(q, u) / g.a);
  };
  const t0 = param(arc.from);
  const ccw = mod(param(arc.to) - t0);
  // idziemy przeciwnie do wskazówek zegara, chyba że `via` leży po drugiej stronie
  const span = mod(param(arc.via) - t0) < ccw ? ccw : ccw - TAU;
  const n = Math.max(2, Math.ceil((steps * Math.abs(span)) / TAU));
  return Array.from({ length: n + 1 }, (_, i) => {
    if (i === 0) return arc.from;
    if (i === n) return arc.to;
    const t = t0 + (span * i) / n;
    return add(g.center, add(scale(u, g.a * Math.cos(t)), scale(v, g.b * Math.sin(t))));
  });
}
