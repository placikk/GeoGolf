import { describe, it, expect } from "vitest";
import { add, scale, fromAngle } from "../src/core/vec";
import { ellipseFromFoci } from "../src/core/conic";
import { runProof } from "../src/core/verify";
import { EllipseState, Level, LEVELS, levelCurves, DIAGONAL, HOLE_RADIUS, SNAP_RADIUS } from "../src/levels";

const proofFor = (level: Level, state: EllipseState) =>
  runProof({
    ball: level.ball,
    hole: level.hole,
    holeRadius: level.test.holeRadius,
    maxBounces: level.test.maxBounces,
    curves: levelCurves(level, state),
    aimCurve: ellipseFromFoci(state.f1, state.f2, state.a),
    count: level.test.balls,
  });

describe("poziomy", () => {
  it("jest ich osiem i każdy ma unikalny identyfikator", () => {
    expect(LEVELS).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(8);
  });

  it("niezmiennik: promień przyskakiwania nie jest mniejszy od tolerancji", () => {
    expect(SNAP_RADIUS).toBeGreaterThanOrEqual(HOLE_RADIUS);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: zapisane rozwiązanie faktycznie rozwiązuje",
    (_id, level) => {
      expect(proofFor(level, level.solution).solved).toBe(true);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: stan początkowy NIE jest rozwiązaniem",
    (_id, level) => {
      expect(proofFor(level, level.start).solved).toBe(false);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: ognisko przesunięte o 5% przekątnej odpada",
    (_id, level) => {
      const d = 0.05 * DIAGONAL;
      for (let i = 0; i < 8; i++) {
        const moved = { ...level.solution, f1: add(level.solution.f1, scale(fromAngle((i * Math.PI) / 4), d)) };
        expect(proofFor(level, moved).solved, `kierunek ${i}`).toBe(false);
      }
    },
  );
});
