import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, sub, vec } from "../../src/core/vec";
import { trace } from "../../src/core/trace";
import { ellipse, hyperbola, parabola, shapeToPiece } from "../../src/levels/shape";

/** Powtarzalny generator — test ma być deterministyczny mimo „losowych" danych. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("konstrukcja dwustopniowa ma STAŁĄ długość drogi", () => {
  it("elipsa + hiperbola o wspólnym ognisku: droga = 2aₑ + 2aₕ", () => {
    const los = rng(20260920);
    let sprawdzonych = 0;

    for (let proba = 0; proba < 40; proba++) {
      const F0 = vec(-0.7 + los() * 0.2, -0.6 + los() * 0.3);
      const M = vec(0.2 + los() * 0.3, 0.4 + los() * 0.3);
      const H = vec(-0.3 + los() * 0.2, 0.1 + los() * 0.3);

      const ce = dist(F0, M) / 2;
      const ae = ce * (1.1 + los() * 0.3);
      const ch = dist(H, M) / 2;
      const ah = ch * (0.3 + los() * 0.3);
      const oczekiwana = 2 * ae + 2 * ah;

      const curves = [
        shapeToPiece(ellipse(F0, M, ae)),
        shapeToPiece(hyperbola(H, M, ah, 1, { mid: 0, span: 6 })),
      ];

      for (let i = 0; i < 16; i++) {
        const kierunek = fromAngle((i / 16) * 2 * Math.PI + 0.13);
        const wynik = trace(F0, kierunek, {
          curves, hole: H, holeRadius: 1e-6, maxBounces: 2, maxLength: 40,
        });
        if (!wynik.holed || wynik.path.length !== 4) continue; // ten kierunek minął gałąź
        sprawdzonych++;
        expect(wynik.length).toBeCloseTo(oczekiwana, 6);
      }
    }

    // gdyby geometria przestała działać, pętla przeszłaby „pusto" i test byłby fikcją
    expect(sprawdzonych).toBeGreaterThan(100);
  });

  it("dwie parabole o wspólnej osi: droga jest ta sama dla każdego kierunku", () => {
    const los = rng(777);
    for (let proba = 0; proba < 20; proba++) {
      const pa = 0.2 + los() * 0.2;
      const pb = 0.2 + los() * 0.2;
      const VA = vec(-0.85, 0);
      const VB = vec(0.85, 0);
      const FA = add(VA, vec(pa, 0));
      const FB = sub(VB, vec(pb, 0));

      const curves = [
        shapeToPiece(parabola(FA, VA, { mid: 0, span: 1.2 })),
        shapeToPiece(parabola(FB, VB, { mid: 0, span: 1.2 })),
      ];

      const drogi: number[] = [];
      for (let i = 0; i < 12; i++) {
        const kat = Math.PI - 0.9 + (i / 11) * 1.8;
        const wynik = trace(FA, fromAngle(kat), {
          curves, hole: FB, holeRadius: 1e-6, maxBounces: 2, maxLength: 40,
        });
        if (wynik.holed && wynik.path.length === 4) drogi.push(wynik.length);
      }

      expect(drogi.length).toBeGreaterThan(8);
      expect(Math.max(...drogi) - Math.min(...drogi)).toBeLessThan(1e-6);
    }
  });
});
