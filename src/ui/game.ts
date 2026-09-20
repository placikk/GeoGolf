import { Proof, runProof } from "../core/verify";
import { Level, MovableShape, levelCurves, shapeAxisAngle } from "../levels";

/** jednostek świata na sekundę — prędkość jest dosłowna, bez krzywych czasu */
export const BALL_SPEED = 1.2;

export type Phase = "edycja" | "dowod" | "wygrana" | "porazka";

export interface GameState {
  level: Level;
  /** bieżący kształt każdego elementu gracza, w kolejności `level.pieces` */
  pieces: MovableShape[];
  phase: Phase;
  proof: Proof | null;
  /** sekundy od startu dowodu */
  elapsed: number;
}

export const newGame = (level: Level): GameState => ({
  level, pieces: level.pieces.map((p) => p.start), phase: "edycja", proof: null, elapsed: 0,
});

const proofFor = (state: GameState, count: number): Proof =>
  runProof({
    ball: state.level.ball,
    hole: state.level.hole,
    holeRadius: state.level.test.holeRadius,
    maxBounces: state.level.test.maxBounces,
    curves: levelCurves(state.level, state.pieces),
    // kierunek bazowy dowodu 360° to oś pierwszego elementu gracza — jak w etapie 1
    baseAngle: shapeAxisAngle(state.pieces[0]),
    sector: state.level.sector,
    count,
  });

export const preview = (state: GameState): Proof => proofFor(state, 2);

export const startProof = (state: GameState): GameState => ({
  ...state, phase: "dowod", proof: proofFor(state, state.level.test.balls), elapsed: 0,
});

/** „Jeszcze raz": z powrotem do edycji z TYM SAMYM ustawieniem elementów, które gracz
 *  właśnie sprawdził. Reset do stanu startowego to `newGame` (kafelek poziomu w menu
 *  albo przycisk „Reset" w dolnym pasku edycji). */
export const retry = (state: GameState): GameState => ({
  ...state, phase: "edycja", proof: null, elapsed: 0,
});

export function advance(state: GameState, dt: number): GameState {
  if (state.phase !== "dowod" || state.proof === null) return state;
  const elapsed = state.elapsed + dt;
  const travelled = elapsed * BALL_SPEED;
  const longest = Math.max(...state.proof.balls.map((b) => b.length));
  if (travelled < longest) return { ...state, elapsed };
  return { ...state, elapsed, phase: state.proof.solved ? "wygrana" : "porazka" };
}
