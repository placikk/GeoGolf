import { Vec2, fromAngle } from "./vec";
import { Conic, classify, ellipseGeometry } from "./conic";
import { trace, TraceResult } from "./trace";

export const BALL_COUNT = 8;

export function launchAngles(aimCurve: Conic, count: number = BALL_COUNT): number[] {
  const base = classify(aimCurve) === "elipsa" ? ellipseGeometry(aimCurve).angle : 0;
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => base + (i + 0.25) * step);
}

export interface ProofInput {
  ball: Vec2;
  hole: Vec2;
  holeRadius: number;
  maxBounces: number;
  curves: Conic[];
  aimCurve: Conic;
  count?: number;
}

export interface Proof {
  balls: TraceResult[];
  solved: boolean;
  /** różnica między najdłuższą a najkrótszą drogą */
  spread: number;
  simultaneous: boolean;
}

export function runProof(input: ProofInput): Proof {
  const angles = launchAngles(input.aimCurve, input.count ?? BALL_COUNT);
  const balls = angles.map((t) =>
    trace(input.ball, fromAngle(t), {
      curves: input.curves,
      hole: input.hole,
      holeRadius: input.holeRadius,
      maxBounces: input.maxBounces,
      maxLength: 40,
    }),
  );
  const solved = balls.every((b) => b.holed);
  const lengths = balls.filter((b) => b.holed).map((b) => b.length);
  const spread = lengths.length > 0 ? Math.max(...lengths) - Math.min(...lengths) : Infinity;
  return { balls, solved, spread, simultaneous: solved && spread < 1e-6 };
}
