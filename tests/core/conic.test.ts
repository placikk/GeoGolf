import { describe, it, expect } from "vitest";
import { vec, dist, add, scale, fromAngle, dot, norm, perp, sub } from "../../src/core/vec";
import {
  evalConic, classify, ellipseFromFoci, lineThrough, ellipseGeometry, parabolaFromFocusVertex, hyperbolaFromFoci,
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
    // hiperbola x² - y² = 1, disc = 0 - 4(1)(-1) = 4 > 0
    expect(classify({ A: 1, B: 0, C: -1, D: 0, E: 0, F: -1 })).toBe("hiperbola");
    // parabola x² - y = 0, disc = 0 - 4(1)(0) = 0
    expect(classify({ A: 1, B: 0, C: 0, D: 0, E: -1, F: 0 })).toBe("parabola");
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

describe("parabola", () => {
  it("postać kanoniczna: wierzchołek w zerze, ognisko na osi x", () => {
    const k = parabolaFromFocusVertex(vec(0.3, 0), vec(0, 0));
    // y² = 4px przy p = 0.3
    expect(k.A).toBeCloseTo(0, 12);
    expect(k.B).toBeCloseTo(0, 12);
    expect(k.C).toBeCloseTo(1, 12);
    expect(k.D).toBeCloseTo(-1.2, 12);
    expect(k.E).toBeCloseTo(0, 12);
    expect(k.F).toBeCloseTo(0, 12);
  });

  it("klasyfikuje się jako parabola niezależnie od obrotu i przesunięcia", () => {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * 2 * Math.PI;
      const v = vec(Math.cos(ang) * 0.4, Math.sin(ang) * 0.3);
      const f = add(v, scale(fromAngle(ang + 0.7), 0.25));
      expect(classify(parabolaFromFocusVertex(f, v))).toBe("parabola");
    }
  });

  it("własność ognisko–kierownica: |PF| = odległość P od kierownicy", () => {
    const v = vec(-0.2, 0.1);
    const f = vec(0.1, 0.4);
    const k = parabolaFromFocusVertex(f, v);
    const p = dist(f, v);
    const u = norm(sub(f, v));
    const n = perp(u);
    for (const t of [-1.3, -0.4, 0, 0.6, 1.9]) {
      // punkt parametryzacji z zadania 2, tu wpisany wprost, żeby test był niezależny
      const pt = add(v, add(scale(u, (t * t) / (4 * p)), scale(n, t)));
      expect(evalConic(k, pt)).toBeCloseTo(0, 10);
      const doKierownicy = dot(sub(pt, v), u) + p;
      expect(dist(pt, f)).toBeCloseTo(doKierownicy, 10);
    }
  });

  it("ognisko w wierzchołku to błąd", () => {
    expect(() => parabolaFromFocusVertex(vec(0.2, 0.2), vec(0.2, 0.2))).toThrow();
  });
});

describe("hiperbola", () => {
  it("postać kanoniczna: ogniska na osi x", () => {
    const k = hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.3);
    // b² = 0.25 − 0.09 = 0.16
    expect(k.A).toBeCloseTo(1 / 0.09, 10);
    expect(k.B).toBeCloseTo(0, 12);
    expect(k.C).toBeCloseTo(-1 / 0.16, 10);
    expect(k.F).toBeCloseTo(-1, 12);
  });

  it("klasyfikuje się jako hiperbola niezależnie od obrotu", () => {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * 2 * Math.PI;
      const d = scale(fromAngle(ang), 0.5);
      expect(classify(hyperbolaFromFoci(scale(d, -1), d, 0.3))).toBe("hiperbola");
    }
  });

  it("własność różnicy odległości: ||PF₁| − |PF₂|| = 2a", () => {
    const f1 = vec(-0.4, -0.2), f2 = vec(0.3, 0.5), a = 0.25;
    const k = hyperbolaFromFoci(f1, f2, a);
    const c = dist(f1, f2) / 2;
    const b = Math.sqrt(c * c - a * a);
    const center = scale(add(f1, f2), 0.5);
    const u = norm(sub(f2, f1));
    const n = perp(u);
    for (const branch of [1, -1]) {
      for (const t of [-1.1, -0.3, 0, 0.5, 1.4]) {
        const pt = add(center, add(scale(u, branch * a * Math.cosh(t)), scale(n, b * Math.sinh(t))));
        expect(evalConic(k, pt)).toBeCloseTo(0, 10);
        expect(Math.abs(dist(pt, f1) - dist(pt, f2))).toBeCloseTo(2 * a, 10);
      }
    }
  });

  it("a poza (0, c) to błąd — hiperbola bez ognisk nie istnieje", () => {
    expect(() => hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.5)).toThrow();
    expect(() => hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0)).toThrow();
  });
});
