import { describe, it, expect } from "vitest";
import { vec, norm, len } from "../../src/core/vec";
import { Conic, lineThrough } from "../../src/core/conic";
import { normalAt, reflectDir } from "../../src/core/reflect";

const circle: Conic = { A: 1, B: 0, C: 1, D: 0, E: 0, F: -1 };

describe("normalna i odbicie", () => {
  it("normalna okręgu jest promieniowa", () => {
    const n = normalAt(circle, vec(1, 0));
    expect(n.x).toBeCloseTo(1, 12);
    expect(n.y).toBeCloseTo(0, 12);
    expect(len(n)).toBeCloseTo(1, 12);
  });

  it("normalna poziomej ściany jest pionowa", () => {
    const n = normalAt(lineThrough(vec(0, 0.5), vec(1, 0)), vec(0.2, 0.5));
    expect(Math.abs(n.y)).toBeCloseTo(1, 12);
    expect(n.x).toBeCloseTo(0, 12);
  });

  it("odbicie prostopadłe zawraca kierunek", () => {
    const d = reflectDir(vec(1, 0), vec(1, 0));
    expect(d.x).toBeCloseTo(-1, 12);
    expect(d.y).toBeCloseTo(0, 12);
  });

  it("odbicie pod kątem zachowuje składową styczną", () => {
    const d = reflectDir(norm(vec(1, -1)), vec(0, 1));
    expect(d.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(d.y).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it("odbicie zachowuje długość jednostkową", () => {
    expect(len(reflectDir(norm(vec(3, 7)), norm(vec(-1, 2))))).toBeCloseTo(1, 12);
  });
});
