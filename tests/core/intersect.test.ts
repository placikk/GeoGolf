import { describe, it, expect } from "vitest";
import { vec, norm, add, scale, fromAngle } from "../../src/core/vec";
import { Conic, lineThrough, ellipseFromFoci, evalConic } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";

const circle: Conic = { A: 1, B: 0, C: 1, D: 0, E: 0, F: -1 };

describe("przecięcie półprostej ze stożkową", () => {
  it("trafia okrąg jednostkowy ze środka", () => {
    expect(rayConic(vec(0, 0), vec(1, 0), circle)).toBeCloseTo(1, 12);
    expect(rayConic(vec(0, 0), norm(vec(1, 1)), circle)).toBeCloseTo(1, 12);
  });

  it("bierze najbliższe trafienie, nie najdalsze", () => {
    expect(rayConic(vec(-2, 0), vec(1, 0), circle)).toBeCloseTo(1, 12);
  });

  it("zwraca null, gdy promień mija krzywą", () => {
    expect(rayConic(vec(-2, 5), vec(1, 0), circle)).toBeNull();
  });

  it("nie zwraca trafień za plecami", () => {
    expect(rayConic(vec(2, 0), vec(1, 0), circle)).toBeNull();
  });

  it("obsługuje prostą, czyli gałąź liniową", () => {
    const wall = lineThrough(vec(0, 0.5), vec(1, 0));
    expect(rayConic(vec(0, 0), vec(0, 1), wall)).toBeCloseTo(0.5, 12);
    expect(rayConic(vec(0, 0), vec(0, -1), wall)).toBeNull();
  });

  it("ignoruje trafienie w punkcie startu (chroni przed zakleszczeniem)", () => {
    // start dokładnie na krzywej, kierunek do wewnątrz
    const t = rayConic(vec(1, 0), vec(-1, 0), circle);
    expect(t).toBeCloseTo(2, 12);
  });

  it("trafia obróconą elipsę", () => {
    const k = ellipseFromFoci(vec(-0.3, -0.3), vec(0.3, 0.3), 0.7);
    const t = rayConic(vec(-0.3, -0.3), norm(vec(0, 1)), k);
    expect(t).not.toBeNull();
    expect(t as number).toBeGreaterThan(0);
  });

  it("okrąg przesunięty od środka układu: dokładne t (pilnuje członu D)", () => {
    // (x − 2)² + y² = 1  →  x² + y² − 4x + 3 = 0
    const shifted: Conic = { A: 1, B: 0, C: 1, D: -4, E: 0, F: 3 };
    expect(rayConic(vec(0, 0), vec(1, 0), shifted)).toBeCloseTo(1, 12);
    expect(rayConic(vec(5, 0), vec(-1, 0), shifted)).toBeCloseTo(2, 12);
  });

  it("zwrócone t zawsze ląduje dokładnie na krzywej", () => {
    let seed = 987654321;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    const cases: Conic[] = [
      { A: 1, B: 0, C: 1, D: -4, E: 0, F: 3 },                 // okrąg o środku (2,0)
      ellipseFromFoci(vec(0.1, 0.5), vec(0.9, 0.2), 0.7),      // D≠0, E≠0, B≠0
      lineThrough(vec(0.3, 0.4), norm(vec(2, 1))),             // prosta ukośna, D≠0, E≠0
    ];

    let checked = 0;
    for (const k of cases) {
      for (let i = 0; i < 50; i++) {
        const p = vec(rnd() * 0.4 - 0.2, rnd() * 0.4 - 0.2);
        const d = fromAngle(rnd() * 2 * Math.PI);
        const t = rayConic(p, d, k);
        if (t === null) continue;
        expect(evalConic(k, add(p, scale(d, t)))).toBeCloseTo(0, 9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});
