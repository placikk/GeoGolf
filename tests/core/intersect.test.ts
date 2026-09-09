import { describe, it, expect } from "vitest";
import { vec, norm } from "../../src/core/vec";
import { Conic, lineThrough, ellipseFromFoci } from "../../src/core/conic";
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
});
