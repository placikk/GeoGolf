import { Vec2 } from "../core/vec";
import { Sector } from "../core/verify";

export const DIAGONAL = 2 * Math.SQRT2;
export const HOLE_RADIUS = 0.02 * DIAGONAL;
/** Niezmiennik ze specyfikacji: promień przyskakiwania nigdy mniejszy
 *  od pasa, w którym niedokładne ustawienie jeszcze przechodzi test. */
export const SNAP_RADIUS = 0.05 * DIAGONAL;

/** Najkrótszy łuk (długość wzdłuż krzywej, w jednostkach świata) — dla danych poziomu
 *  i dla przeciągania końców. Pilnuje też, żeby końce się nie minęły: długość łuku leży
 *  w [MIN_ARC_LENGTH, obwód − MIN_ARC_LENGTH]. */
export const MIN_ARC_LENGTH = 0.05;

export type Handle =
  | "ognisko1" | "ognisko2" | "rozmiar" | "poczatek" | "koniec"   // elipsa i jej łuk
  | "ognisko" | "wierzcholek";                                     // parabola

/** Dwa sposoby opisania kawałka krzywej; twórca poziomu wybiera pasujący.
 *  `length` — długość wzdłuż krzywej: gdy krzywa rośnie, ten sam kawałek obejmuje jej
 *  mniejszy wycinek, więc rozdmuchaniem krzywej nie da się zastąpić kaskady (etap 2).
 *  `span` — zakres parametru: rośnie razem z krzywą, ale za to jest odporny na to,
 *  gdzie gracz przeciągnie uchwyt, i jako jedyny wybiera gałąź hiperboli.
 *  Unia rozróżniana OBECNOŚCIĄ pola, nie znacznikiem — dzięki temu dane poziomów
 *  etapu 2 kompilują się bez ani jednej zmiany. */
export type Span = { mid: number; length: number } | { mid: number; span: number };

/** Nazwa z etapu 2 dla wariantu długościowego. */
export type ArcRange = { mid: number; length: number };

export interface EllipseShape { kind: "elipsa"; f1: Vec2; f2: Vec2; a: number; arc?: ArcRange }

/** Parabola: ognisko, wierzchołek i kawałek. `span` jest WYMAGANY — parabola jest
 *  nieograniczona, więc kawałek bez zakresu nie ma sensu i nie wolno go zapomnieć. */
export interface ParabolaShape { kind: "parabola"; focus: Vec2; vertex: Vec2; span: Span }

/** Hiperbola: dwa ogniska, połowa osi rzeczywistej (0 < a < c), wybrana gałąź i kawałek.
 *  `branch` należy do danych poziomu, nie do palca gracza — uchwyt rozmiaru nie
 *  przeskakuje między gałęziami. */
export interface HyperbolaShape {
  kind: "hiperbola"; f1: Vec2; f2: Vec2; a: number; branch: 1 | -1; span: Span;
}

/** Czym gracz może ruszać. Odcinki są stałe — jak w etapie 2. */
export type MovableShape = EllipseShape | ParabolaShape | HyperbolaShape;

export interface SegmentShape { kind: "odcinek"; from: Vec2; to: Vec2 }
export type Shape = MovableShape | SegmentShape;

/** Element, którym rusza gracz. Blokady są per element, nie per poziom. */
export interface PlayerPiece { start: MovableShape; solution: MovableShape; locked: Handle[] }

export interface Level {
  id: string;
  title: string;
  hint: string;
  ball: Vec2;
  hole: Vec2;
  /** czym rusza gracz — jeden lub więcej elementów */
  pieces: PlayerPiece[];
  /** stałe: łuki, okręgi, odcinki */
  obstacles: Shape[];
  /** brak = dowód na 360° jak w etapie 1 */
  sector?: Sector;
  test: { balls: number; maxBounces: number; holeRadius: number };
}
