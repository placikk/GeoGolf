import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci, lineThrough } from "../../src/core/conic";
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

  it("prosta linia: nie wyrzuca, bazą jest kąt zero", () => {
    const line = lineThrough(vec(0, 0), vec(1, 0));
    const angles = launchAngles(line);
    expect(angles).toHaveLength(BALL_COUNT);
    const firstAngle = angles[0];
    expect(firstAngle).toBeCloseTo(0.25 * (2 * Math.PI / BALL_COUNT));
  });

  it("count=2: dwie piłki do podglądu", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    expect(launchAngles(k, 2)).toHaveLength(2);
    const p = runProof({ ball: vec(-0.5, 0), hole: vec(0.5, 0), holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k, count: 2 });
    expect(p.balls).toHaveLength(2);
  });

  it("count=3: nieparzysta liczba, żaden kierunek wzdłuż osi", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const angles = launchAngles(k, 3);
    expect(angles).toHaveLength(3);
    for (const t of angles) {
      const rel = ((t % Math.PI) + Math.PI) % Math.PI;
      expect(Math.min(rel, Math.PI - rel)).toBeGreaterThan(0.01);
    }
  });
});
