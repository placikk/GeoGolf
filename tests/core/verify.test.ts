import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci } from "../../src/core/conic";
import { BALL_COUNT, launchAngles, runProof } from "../../src/core/verify";

const R = 0.02 * 2 * Math.SQRT2;

describe("dowód ósemką", () => {
  it("daje osiem różnych kierunków, żaden wzdłuż osi wielkiej", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const angles = launchAngles(k);
    expect(angles).toHaveLength(BALL_COUNT);
    for (const t of angles) {
      const rel = ((t % Math.PI) + Math.PI) % Math.PI;
      expect(Math.min(rel, Math.PI - rel)).toBeGreaterThan(0.1);
    }
  });

  it("poprawna elipsa: wszystkie osiem wpada i wpada RAZEM", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(ball, hole, 0.8);
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k });
    expect(p.balls).toHaveLength(BALL_COUNT);
    expect(p.solved).toBe(true);
    expect(p.simultaneous).toBe(true);
    expect(p.spread).toBeLessThan(1e-6);
  });

  it("działa tak samo dla elipsy obróconej", () => {
    const ball = vec(-0.35, -0.4), hole = vec(0.4, 0.3);
    const k = ellipseFromFoci(ball, hole, 0.9);
    expect(runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k }).solved).toBe(true);
  });

  it("przesunięte ognisko: co najmniej jedna piłka chybia", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(vec(-0.5 + 0.141, 0), hole, 0.8);
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k });
    expect(p.solved).toBe(false);
    expect(p.balls.some((b) => !b.holed)).toBe(true);
  });
});
