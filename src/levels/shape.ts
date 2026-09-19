import { Vec2, add, dist, norm, perp, scale, sub, vec } from "../core/vec";
import { Conic, ellipseFromFoci, lineThrough } from "../core/conic";
import { Piece } from "../core/piece";
import { ArcRange, EllipseShape, Level, SegmentShape, Shape } from "./types";

export const ellipse = (f1: Vec2, f2: Vec2, a: number, arc?: ArcRange): EllipseShape =>
  arc === undefined ? { kind: "elipsa", f1, f2, a } : { kind: "elipsa", f1, f2, a, arc };

/** Okrąg to elipsa o zlanych ogniskach — osobny typ okręgu nie istnieje. */
export const circle = (center: Vec2, radius: number): EllipseShape => ellipse(center, center, radius);

export const segment = (from: Vec2, to: Vec2): SegmentShape => ({ kind: "odcinek", from, to });

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

export const shapeConic = (s: Shape): Conic =>
  s.kind === "elipsa" ? ellipseFromFoci(s.f1, s.f2, s.a) : lineThrough(s.from, sub(s.to, s.from));

/** Kształt z danych poziomu → kawałek krzywej dla rdzenia. */
export function shapeToPiece(s: Shape): Piece {
  const conic = shapeConic(s);
  if (s.kind === "odcinek") {
    return { conic, arc: { from: s.from, via: scale(add(s.from, s.to), 0.5), to: s.to } };
  }
  if (s.arc === undefined) return { conic };
  const { start, end } = s.arc;
  return {
    conic,
    arc: { from: ellipsePoint(s, start), via: ellipsePoint(s, (start + end) / 2), to: ellipsePoint(s, end) },
  };
}

/** Elementy gracza, potem przeszkody, na końcu ściany brzegu planszy. */
export const levelCurves = (level: Level, pieces: EllipseShape[]): Piece[] => [
  ...pieces.map(shapeToPiece),
  ...level.obstacles.map(shapeToPiece),
  ...BOARD_WALLS.map(shapeToPiece),
];
