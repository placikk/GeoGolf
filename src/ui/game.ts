import { ellipseFromFoci } from "../core/conic";
import { Proof, runProof } from "../core/verify";
import { EllipseState, Level, levelCurves } from "../levels";

/** jednostek świata na sekundę — prędkość jest dosłowna, bez krzywych czasu */
export const BALL_SPEED = 1.2;

export type Phase = "edycja" | "dowod" | "wygrana" | "porazka";

export interface GameState {
  level: Level;
  ellipse: EllipseState;
  phase: Phase;
  proof: Proof | null;
  /** sekundy od startu dowodu */
  elapsed: number;
}

export const newGame = (level: Level): GameState => ({
  level, ellipse: level.start, phase: "edycja", proof: null, elapsed: 0,
});

const proofFor = (state: GameState, count: number): Proof =>
  runProof({
    ball: state.level.ball,
    hole: state.level.hole,
    holeRadius: state.level.test.holeRadius,
    maxBounces: state.level.test.maxBounces,
    curves: levelCurves(state.level, state.ellipse),
    aimCurve: ellipseFromFoci(state.ellipse.f1, state.ellipse.f2, state.ellipse.a),
    count,
  });

export const preview = (state: GameState): Proof => proofFor(state, 2);

export const startProof = (state: GameState): GameState => ({
  ...state, phase: "dowod", proof: proofFor(state, state.level.test.balls), elapsed: 0,
});

export function advance(state: GameState, dt: number): GameState {
  if (state.phase !== "dowod" || state.proof === null) return state;
  const elapsed = state.elapsed + dt;
  const travelled = elapsed * BALL_SPEED;
  const longest = Math.max(...state.proof.balls.map((b) => b.length));
  if (travelled < longest) return { ...state, elapsed };
  return { ...state, elapsed, phase: state.proof.solved ? "wygrana" : "porazka" };
}
