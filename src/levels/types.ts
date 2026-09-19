import { Vec2 } from "../core/vec";
import { Sector } from "../core/verify";

export const DIAGONAL = 2 * Math.SQRT2;
export const HOLE_RADIUS = 0.02 * DIAGONAL;
/** Niezmiennik ze specyfikacji: promień przyskakiwania nigdy mniejszy
 *  od pasa, w którym niedokładne ustawienie jeszcze przechodzi test. */
export const SNAP_RADIUS = 0.05 * DIAGONAL;

/** Najkrótszy łuk w parametrze elipsy — dla danych poziomu i dla przeciągania końców.
 *  Pilnuje też, żeby końce się nie minęły: długość łuku leży w [MIN_ARC, 2π − MIN_ARC]. */
export const MIN_ARC = (10 * Math.PI) / 180;

export type Handle = "ognisko1" | "ognisko2" | "rozmiar" | "poczatek" | "koniec";

/** Zakres łuku jako PARAMETR elipsy w jej układzie własnym (oś od f1 do f2):
 *  x = a·cos t, y = b·sin t. Łuk biegnie przeciwnie do ruchu wskazówek zegara
 *  od `start` do `end`; niezmiennik: start < end < start + 2π. */
export interface ArcRange { start: number; end: number }

export interface EllipseShape { kind: "elipsa"; f1: Vec2; f2: Vec2; a: number; arc?: ArcRange }
export interface SegmentShape { kind: "odcinek"; from: Vec2; to: Vec2 }
export type Shape = EllipseShape | SegmentShape;

/** Element, którym rusza gracz. Blokady są per element, nie per poziom. */
export interface PlayerPiece { start: EllipseShape; solution: EllipseShape; locked: Handle[] }

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
