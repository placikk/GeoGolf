import { Vec2 } from "../core/vec";
import { Conic, circleConic, ellipseFromFoci } from "../core/conic";

export const DIAGONAL = 2 * Math.SQRT2;
export const HOLE_RADIUS = 0.02 * DIAGONAL;
/** Niezmiennik ze specyfikacji: promień przyskakiwania nigdy mniejszy
 *  od pasa, w którym niedokładne ustawienie jeszcze przechodzi test. */
export const SNAP_RADIUS = 0.05 * DIAGONAL;

export type Handle = "ognisko1" | "ognisko2" | "rozmiar";

export interface EllipseState { f1: Vec2; f2: Vec2; a: number }
export interface Obstacle { center: Vec2; radius: number }

export interface Level {
  id: string;
  title: string;
  hint: string;
  ball: Vec2;
  hole: Vec2;
  /** uchwyty wyłączone na tym poziomie */
  locked: Handle[];
  obstacles: Obstacle[];
  start: EllipseState;
  solution: EllipseState;
  test: { balls: number; maxBounces: number; holeRadius: number };
}

export const levelCurves = (level: Level, state: EllipseState): Conic[] => [
  ellipseFromFoci(state.f1, state.f2, state.a),
  ...level.obstacles.map((o) => circleConic(o.center, o.radius)),
];
