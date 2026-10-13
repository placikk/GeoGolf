import { describe, it, expect } from "vitest";
import { dist, norm, vec } from "../../src/core/vec";
import { CurveFrame, framePoint } from "../../src/core/frame";
import { frameLengthBetween, frameTMax, spanRange } from "../../src/levels/span";

const PAR: CurveFrame = { kind: "parabola", vertex: vec(-0.3, 0), axis: vec(1, 0), p: 0.3 };
const HYP: CurveFrame = {
  kind: "hiperbola", center: vec(0, 0), axis: norm(vec(1, 1)), a: 0.3, b: 0.4, branch: 1,
};

/** Długość liczona niezależnie, gęstą łamaną — punkt odniesienia dla testu. */
const brutto = (f: CurveFrame, t0: number, t1: number): number => {
  const N = 20000;
  let sum = 0;
  let prev = framePoint(f, t0);
  for (let i = 1; i <= N; i++) {
    const p = framePoint(f, t0 + ((t1 - t0) * i) / N);
    sum += dist(prev, p);
    prev = p;
  }
  return sum;
};

describe("długość wzdłuż krzywej nieograniczonej", () => {
  it("zgadza się z gęstą łamaną, parabola", () => {
    expect(frameLengthBetween(PAR, -0.5, 1.2)).toBeCloseTo(brutto(PAR, -0.5, 1.2), 3);
  });

  it("zgadza się z gęstą łamaną, hiperbola", () => {
    expect(frameLengthBetween(HYP, -0.8, 0.9)).toBeCloseTo(brutto(HYP, -0.8, 0.9), 3);
  });

  it("jest ujemna, gdy idziemy wstecz", () => {
    expect(frameLengthBetween(PAR, 1, -1)).toBeCloseTo(-frameLengthBetween(PAR, -1, 1), 9);
  });

  it("spanRange po parametrze przepisuje zakres wprost", () => {
    const r = spanRange(PAR, { mid: 0.2, span: 1.4 });
    expect(r.from).toBeCloseTo(-0.5, 9);
    expect(r.to).toBeCloseTo(0.9, 9);
  });

  it("spanRange po długości daje kawałek o zadanej długości", () => {
    const r = spanRange(HYP, { mid: 0.1, length: 0.6 });
    expect(frameLengthBetween(HYP, r.from, r.to)).toBeCloseTo(0.6, 6);
  });

  it("KLUCZOWE: kawałek opisany długością nie rośnie, gdy krzywa rośnie", () => {
    const maly = { ...HYP, a: 0.3, b: 0.4 };
    const duzy = { ...HYP, a: 0.6, b: 0.8 };
    const span = { mid: 0, length: 0.5 };
    const rm = spanRange(maly, span);
    const rd = spanRange(duzy, span);
    expect(frameLengthBetween(maly, rm.from, rm.to)).toBeCloseTo(0.5, 6);
    expect(frameLengthBetween(duzy, rd.from, rd.to)).toBeCloseTo(0.5, 6);
    // ten sam opis, a zakres parametru węższy na większej krzywej
    expect(rd.to - rd.from).toBeLessThan(rm.to - rm.from);
  });

  it("frameTMax wyprowadza krzywą poza planszę", () => {
    for (const f of [PAR, HYP]) {
      const t = frameTMax(f);
      const p = framePoint(f, t);
      expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeGreaterThan(2);
    }
  });
});
