import { Vec2, fromAngle } from "./vec";
import { Conic, classify, ellipseGeometry } from "./conic";
import { Piece } from "./piece";
import { trace, TraceResult } from "./trace";

export const BALL_COUNT = 8;

/** Wachlarz strzału: kąty w radianach, w układzie świata. */
export interface Sector { center: number; width: number }

export function launchAngles(aimCurve: Conic, count: number = BALL_COUNT, sector?: Sector): number[] {
  if (sector !== undefined) {
    // (i + ½): równo wewnątrz wachlarza, żadna piłka nie leci po samej krawędzi
    const step = sector.width / count;
    const first = sector.center - sector.width / 2;
    return Array.from({ length: count }, (_, i) => first + (i + 0.5) * step);
  }
  const base = classify(aimCurve) === "elipsa" ? ellipseGeometry(aimCurve).angle : 0;
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => base + (i + 0.25) * step);
}

export interface ProofInput {
  ball: Vec2;
  hole: Vec2;
  holeRadius: number;
  maxBounces: number;
  curves: Piece[];
  aimCurve: Conic;
  count?: number;
  /** brak = 360° jak w etapie 1 */
  sector?: Sector;
}

export interface Proof {
  balls: TraceResult[];
  solved: boolean;
  /** różnica między najdłuższą a najkrótszą drogą */
  spread: number;
  simultaneous: boolean;
}

export function runProof(input: ProofInput): Proof {
  const angles = launchAngles(input.aimCurve, input.count ?? BALL_COUNT, input.sector);
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
