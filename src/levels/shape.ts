import { Vec2, add, dist, norm, perp, scale, sub, vec } from "../core/vec";
import { Conic, ellipseFromFoci, hyperbolaFromFoci, lineThrough, parabolaFromFocusVertex } from "../core/conic";
import { Piece } from "../core/piece";
import { CurveFrame } from "../core/frame";
import { ArcRange, EllipseShape, HyperbolaShape, Level, MovableShape, ParabolaShape, SegmentShape, Shape, Span } from "./types";
import { arcFromParams, arcParams } from "./arc";
import { spanRange } from "./span";

export const ellipse = (f1: Vec2, f2: Vec2, a: number, arc?: ArcRange): EllipseShape =>
  arc === undefined ? { kind: "elipsa", f1, f2, a } : { kind: "elipsa", f1, f2, a, arc };

/** Okrąg to elipsa o zlanych ogniskach — osobny typ okręgu nie istnieje. */
export const circle = (center: Vec2, radius: number): EllipseShape => ellipse(center, center, radius);

/** Elipsa z łukiem „od `start` do `end`” (parametr, przeciwnie do wskazówek zegara) —
 *  długość łuku liczona na TEJ elipsie. Wygodny zapis danych poziomów w kątach. */
export function arcEllipse(
  f1: Vec2, f2: Vec2, a: number, start: number, end: number,
): EllipseShape & { arc: ArcRange } {
  return { kind: "elipsa", f1, f2, a, arc: arcFromParams(ellipse(f1, f2, a), start, end) };
}

export const segment = (from: Vec2, to: Vec2): SegmentShape => ({ kind: "odcinek", from, to });

export const parabola = (focus: Vec2, vertex: Vec2, span: Span): ParabolaShape =>
  ({ kind: "parabola", focus, vertex, span });

export const hyperbola = (
  f1: Vec2, f2: Vec2, a: number, branch: 1 | -1, span: Span,
): HyperbolaShape => ({ kind: "hiperbola", f1, f2, a, branch, span });

/** Brzeg planszy [-1, 1]² jest ścianą: cztery zwykłe odcinki przez narożniki. Ten sam
 *  kwadrat na każdym ekranie, więc fizyka poziomu nie zależy od urządzenia. */
export const BOARD_WALLS: SegmentShape[] = [
  segment(vec(-1, -1), vec(1, -1)),
  segment(vec(1, -1), vec(1, 1)),
  segment(vec(1, 1), vec(-1, 1)),
  segment(vec(-1, 1), vec(-1, -1)),
];

/** Czy elipsa jest okręgiem (ogniska zlane w jeden punkt). */
export const isCircle = (s: EllipseShape): boolean => dist(s.f1, s.f2) < 1e-12;

/** Kierunek osi f1→f2; dla okręgu (f1 = f2) umownie oś x. */
export function ellipseAxis(s: EllipseShape): Vec2 {
  return isCircle(s) ? vec(1, 0) : norm(sub(s.f2, s.f1));
}

/** Układ własny krzywej dla rdzenia. Warstwa poziomów zna ognisko i wierzchołek,
 *  więc podaje je wprost — rdzeń nie musi ich odzyskiwać z sześciu liczb. */
export function shapeFrame(s: ParabolaShape | HyperbolaShape): CurveFrame {
  if (s.kind === "parabola") {
    const p = dist(s.focus, s.vertex);
    return { kind: "parabola", vertex: s.vertex, axis: norm(sub(s.focus, s.vertex)), p };
  }
  const c = dist(s.f1, s.f2) / 2;
  return {
    kind: "hiperbola",
    center: scale(add(s.f1, s.f2), 0.5),
    axis: norm(sub(s.f2, s.f1)),
    a: s.a,
    // zacisk pod pierwiastkiem czysto obronny: przeciąganie pilnuje a < c (`fit`
    // w `dragHyperbola`), a w `shapeToPiece` przy a ≥ c wcześniej rzuca `hyperbolaFromFoci`
    b: Math.sqrt(Math.max(0, c * c - s.a * s.a)),
    branch: s.branch,
  };
}

/** Ogniska kształtu — cele przyskakiwania. Okrąg (f1 = f2) zwraca pustą listę:
 *  jego „ognisko" to środek przeszkody, nigdy nie jest sensownym celem (etap 2). */
export function shapeFoci(s: MovableShape): Vec2[] {
  if (s.kind === "odcinek") return [];
  if (s.kind === "parabola") return [s.focus];
  if (s.kind === "hiperbola") return [s.f1, s.f2];
  return isCircle(s) ? [] : [s.f1, s.f2];
}

/** Kąt osi kształtu w układzie świata — kierunek bazowy dowodu 360°. */
export function shapeAxisAngle(s: MovableShape): number {
  const u =
    s.kind === "elipsa" ? ellipseAxis(s)
    : s.kind === "parabola" ? norm(sub(s.focus, s.vertex))
    : s.kind === "odcinek" ? norm(sub(s.to, s.from))
    : norm(sub(s.f2, s.f1));
  return Math.atan2(u.y, u.x);
}

export const ellipseCenter = (s: EllipseShape): Vec2 => scale(add(s.f1, s.f2), 0.5);

export function semiMinor(s: EllipseShape): number {
  const c = dist(s.f1, s.f2) / 2;
  return Math.sqrt(s.a * s.a - c * c);
}

/** Punkt elipsy o parametrze t w jej układzie własnym. */
export function ellipsePoint(s: EllipseShape, t: number): Vec2 {
  const u = ellipseAxis(s);
  return add(ellipseCenter(s), add(scale(u, s.a * Math.cos(t)), scale(perp(u), semiMinor(s) * Math.sin(t))));
}

/** Odwrotność `ellipsePoint`: parametr punktu elipsy leżącego najbliżej kierunku od środka
 *  do `p` w układzie własnym. Dla punktu na elipsie jest dokładną odwrotnością. */
export function ellipseParam(s: EllipseShape, p: Vec2): number {
  const u = ellipseAxis(s);
  const q = sub(p, ellipseCenter(s));
  const x = (q.x * u.x + q.y * u.y) / s.a;
  const y = (-q.x * u.y + q.y * u.x) / semiMinor(s);
  return Math.atan2(y, x);
}

export function shapeConic(s: Shape): Conic {
  if (s.kind === "elipsa") return ellipseFromFoci(s.f1, s.f2, s.a);
  if (s.kind === "parabola") return parabolaFromFocusVertex(s.focus, s.vertex);
  if (s.kind === "hiperbola") return hyperbolaFromFoci(s.f1, s.f2, s.a);
  return lineThrough(s.from, sub(s.to, s.from));
}

/** Kształt z danych poziomu → kawałek krzywej dla rdzenia.
 *  Parabola i hiperbola dostają ZAWSZE `range`, nigdy `arc` — także wtedy, gdy twórca
 *  poziomu opisał kawałek długością. Cięciwa dzieli płaszczyznę, nie krzywą, więc dla
 *  hiperboli przepuszczałaby trafienia w nieczynną gałąź. */
export function shapeToPiece(s: Shape): Piece {
  const conic = shapeConic(s);
  if (s.kind === "odcinek") {
    return { conic, arc: { from: s.from, via: scale(add(s.from, s.to), 0.5), to: s.to } };
  }
  if (s.kind === "parabola" || s.kind === "hiperbola") {
    const frame = shapeFrame(s);
    return { conic, range: { ...spanRange(frame, s.span), frame } };
  }
  if (s.arc === undefined) return { conic };
  const { start, end } = arcParams(s, s.arc);
  return {
    conic,
    arc: { from: ellipsePoint(s, start), via: ellipsePoint(s, s.arc.mid), to: ellipsePoint(s, end) },
  };
}

/** Elementy gracza, potem przeszkody, na końcu ściany brzegu planszy. */
export const levelCurves = (level: Level, pieces: MovableShape[]): Piece[] => [
  ...pieces.map(shapeToPiece),
  ...level.obstacles.map(shapeToPiece),
  ...BOARD_WALLS.map(shapeToPiece),
];
