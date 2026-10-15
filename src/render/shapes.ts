import { Vec2, add, dist, dot, fromAngle, norm, perp, scale, sub, vec } from "../core/vec";
import { Conic, classify, ellipseGeometry } from "../core/conic";
import { Piece } from "../core/piece";
import { CurveFrame, framePoint } from "../core/frame";
import { HyperbolaShape, ParabolaShape, Shape } from "../levels/types";
import { shapeFrame } from "../levels/shape";
import { spanRange } from "../levels/span";

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
    // krzywa nieograniczona: równe kroki parametru. Prędkość parametryzacji |dP/dt|
    // jest najmniejsza przy wierzchołku — dla paraboli rośnie jak √(1 + t²/4p²) (ok. 41%
    // zmienności), dla hiperboli ostro jak cosh. Punkty się zatem gęszczą przy
    // wierzchołku, gdzie krzywizna jest największa — dokładnie gdzie polylinii trzeba
    // największej gęstości. Dla paraboli tylko składowa prostopadła zmienia się równomiernie,
    // co jest ważne na poziomie „parabola-rozmiar" (szerokość wiązki odbitej = zakres t niezależnie od p).
    return rangePolyline(range.frame, range.from, range.to, steps);
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

/** Linie pomocnicze krzywej: kierownica paraboli (jej definicja) i asymptoty hiperboli
 *  (wyjaśniają kształt gałęzi). Rysujemy je tylko przy włączonych podpowiedziach —
 *  to pomoc dydaktyczna, nie ozdoba, więc należy tam, gdzie reszta pomocy. */
export function curveHints(s: ParabolaShape | HyperbolaShape): Vec2[][] {
  if (s.kind === "parabola") {
    const p = dist(s.focus, s.vertex);
    const u = norm(sub(s.focus, s.vertex));
    const stopa = add(s.vertex, scale(u, -p));
    const n = perp(u);
    return [[add(stopa, scale(n, -SPAN)), add(stopa, scale(n, SPAN))]];
  }
  const c = dist(s.f1, s.f2) / 2;
  const b = Math.sqrt(Math.max(0, c * c - s.a * s.a));
  const center = scale(add(s.f1, s.f2), 0.5);
  const u = norm(sub(s.f2, s.f1));
  const n = perp(u);
  // asymptota: kierunek a·u ± b·n, znormalizowany i przedłużony na całą planszę
  return [1, -1].map((znak) => {
    const d = norm(add(scale(u, s.a), scale(n, znak * b)));
    return [add(center, scale(d, -SPAN)), add(center, scale(d, SPAN))];
  });
}

/** Równe kroki parametru od `from` do `to` — patrz komentarz w `piecePolyline`. */
function rangePolyline(frame: CurveFrame, from: number, to: number, steps: number): Vec2[] {
  const n = Math.max(2, steps);
  return Array.from({ length: n + 1 }, (_, i) => framePoint(frame, from + ((to - from) * i) / n));
}

/** Łamana DRUGIEJ gałęzi hiperboli z flagą `twin`: ta sama rama z przeciwną gałęzią i ten
 *  sam zakres parametru co czynny kawałek. Tylko do rysowania — nie jest `Piece`, więc
 *  nie trafia do `trace` i nie odbija. Bez flagi (i dla innych krzywych) `undefined`. */
export function twinPolyline(s: Shape, steps = 128): Vec2[] | undefined {
  if (s.kind !== "hiperbola" || s.twin !== true) return undefined;
  // zakres z CZYNNEJ ramy, jak w `shapeToPiece`; gałęzie są swoimi lustrami, więc ten
  // sam zakres wycina na drugiej gałęzi kawałek tej samej długości
  const { from, to } = spanRange(shapeFrame(s), s.span);
  const druga = shapeFrame({ ...s, branch: s.branch === 1 ? -1 : 1 });
  return rangePolyline(druga, from, to, steps);
}

/** Oś paraboli od wierzchołka przez ognisko do brzegu planszy [-1, 1]² — tam, dokąd poleci
 *  wiązka odbita z ogniska (uwaga 4 właściciela: oś nie jest oczywista). Wierzchołek leży
 *  w planszy (uchwyty są przycinane, dane poziomów pilnuje test), więc wyjście istnieje;
 *  `Math.max(0, …)` tylko na wypadek wierzchołka na samym brzegu, skierowanego na zewnątrz. */
export function parabolaAxis(s: ParabolaShape): [Vec2, Vec2] {
  const u = norm(sub(s.focus, s.vertex));
  let t = Infinity;
  if (u.x > 0) t = Math.min(t, (1 - s.vertex.x) / u.x);
  if (u.x < 0) t = Math.min(t, (-1 - s.vertex.x) / u.x);
  if (u.y > 0) t = Math.min(t, (1 - s.vertex.y) / u.y);
  if (u.y < 0) t = Math.min(t, (-1 - s.vertex.y) / u.y);
  return [s.vertex, add(s.vertex, scale(u, Math.max(0, t)))];
}

/** Strzałka strzału jednopiłkowego: trzon od piłki długości `reach` w kierunku `angle`
 *  i grot z dwóch ramion po 0.25·reach, rozchylonych o ±0.5 rad od trzonu. */
export function shotArrow(apex: Vec2, angle: number, reach: number): Vec2[][] {
  const tip = add(apex, scale(fromAngle(angle), reach));
  const wing = (side: number): Vec2 => add(tip, scale(fromAngle(angle + Math.PI + side * 0.5), 0.25 * reach));
  return [[apex, tip], [wing(1), tip, wing(-1)]];
}
