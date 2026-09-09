import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import {
  evalConic, classify, ellipseFromFoci, lineThrough, ellipseGeometry,
} from "../../src/core/conic";

describe("stożkowa", () => {
  it("elipsa z ognisk zawiera punkty o sumie odległości równej 2a", () => {
    const f1 = vec(-0.5, 0), f2 = vec(0.5, 0), a = 0.8;
    const k = ellipseFromFoci(f1, f2, a);
    // wierzchołek osi wielkiej leży na krzywej
    expect(evalConic(k, vec(a, 0))).toBeCloseTo(0, 10);
    // punkt o sumie 2a leży na krzywej
    const b = Math.sqrt(a * a - 0.25);
    const p = vec(0, b);
    expect(dist(p, f1) + dist(p, f2)).toBeCloseTo(2 * a, 10);
    expect(evalConic(k, p)).toBeCloseTo(0, 10);
  });

  it("klasyfikuje elipsę, prostą i wynik obrotu ognisk", () => {
    expect(classify(ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8))).toBe("elipsa");
    expect(classify(ellipseFromFoci(vec(-0.3, -0.3), vec(0.3, 0.3), 0.9))).toBe("elipsa");
    expect(classify(lineThrough(vec(0, 0), vec(1, 0)))).toBe("prosta");
  });

  it("odzyskuje geometrię elipsy ze współczynników", () => {
    const f1 = vec(-0.2, 0.4), f2 = vec(0.6, -0.1), a = 0.9;
    const g = ellipseGeometry(ellipseFromFoci(f1, f2, a));
    expect(g.center.x).toBeCloseTo(0.2, 10);
    expect(g.center.y).toBeCloseTo(0.15, 10);
    expect(g.a).toBeCloseTo(a, 10);
    const c = dist(f1, f2) / 2;
    expect(g.b).toBeCloseTo(Math.sqrt(a * a - c * c), 10);
    expect(Math.tan(g.angle)).toBeCloseTo(Math.tan(Math.atan2(-0.5, 0.8)), 10);
  });

  it("prosta ma zerowy człon kwadratowy i zeruje się na sobie", () => {
    const k = lineThrough(vec(0, 0.3), vec(1, 0));
    expect(k.A).toBe(0);
    expect(k.B).toBe(0);
    expect(k.C).toBe(0);
    expect(evalConic(k, vec(5, 0.3))).toBeCloseTo(0, 12);
    expect(evalConic(k, vec(5, 0.9))).not.toBeCloseTo(0, 6);
  });
});
