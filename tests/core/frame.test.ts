import { describe, it, expect } from "vitest";
import { add, dist, norm, scale, sub, vec } from "../../src/core/vec";
import { CurveFrame, framePoint, frameParam } from "../../src/core/frame";
import { evalConic, hyperbolaFromFoci, parabolaFromFocusVertex } from "../../src/core/conic";

const PAR: CurveFrame = {
  kind: "parabola", vertex: vec(-0.2, 0.1), axis: norm(vec(3, 4)), p: 0.35,
};

const f1 = vec(-0.4, -0.2), f2 = vec(0.3, 0.5), A = 0.25;
const C = dist(f1, f2) / 2;
const HYP: CurveFrame = {
  kind: "hiperbola",
  center: scale(add(f1, f2), 0.5),
  axis: norm(sub(f2, f1)),
  a: A,
  b: Math.sqrt(C * C - A * A),
  branch: 1,
};

describe("układ własny krzywej", () => {
  it("framePoint paraboli leży na jej postaci kwadratowej", () => {
    const k = parabolaFromFocusVertex(add(PAR.vertex, scale(PAR.axis, PAR.p)), PAR.vertex);
    for (const t of [-2, -0.7, 0, 0.3, 1.6]) {
      expect(evalConic(k, framePoint(PAR, t))).toBeCloseTo(0, 10);
    }
  });

  it("framePoint hiperboli leży na jej postaci kwadratowej, obie gałęzie", () => {
    const k = hyperbolaFromFoci(f1, f2, A);
    for (const branch of [1, -1] as const) {
      const f = { ...HYP, branch };
      for (const t of [-1.8, -0.5, 0, 0.9]) {
        expect(evalConic(k, framePoint(f, t))).toBeCloseTo(0, 10);
      }
    }
  });

  it("frameParam jest dokładną odwrotnością framePoint", () => {
    for (const t of [-2, -0.7, 0, 0.3, 1.6]) {
      expect(frameParam(PAR, framePoint(PAR, t)).t).toBeCloseTo(t, 10);
      expect(frameParam(HYP, framePoint(HYP, t)).t).toBeCloseTo(t, 10);
    }
  });

  it("frameParam rozpoznaje gałąź", () => {
    for (const t of [-1.5, 0, 1.5]) {
      expect(frameParam(HYP, framePoint({ ...HYP, branch: 1 }, t)).branch).toBe(1);
      expect(frameParam(HYP, framePoint({ ...HYP, branch: -1 }, t)).branch).toBe(-1);
    }
  });

  it("parabola nie ma gałęzi — zawsze 1", () => {
    expect(frameParam(PAR, framePoint(PAR, -3)).branch).toBe(1);
  });
});
