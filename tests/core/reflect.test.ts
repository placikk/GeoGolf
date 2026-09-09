import { describe, it, expect } from "vitest";
import { vec, norm, len } from "../../src/core/vec";
import { Conic, lineThrough, evalConic } from "../../src/core/conic";
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

  it("gradient zgadza się z różnicą centralną evalConic (pilnuje wszystkich sześciu członów)", () => {
    let seed = 24680;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const h = 1e-4;

    let checked = 0;
    for (let i = 0; i < 200; i++) {
      const k: Conic = {
        A: rnd() * 2 - 1, B: rnd() * 2 - 1, C: rnd() * 2 - 1,
        D: rnd() * 2 - 1, E: rnd() * 2 - 1, F: rnd() * 2 - 1,
      };
      const p = vec(rnd() * 2 - 1, rnd() * 2 - 1);

      const gx = (evalConic(k, vec(p.x + h, p.y)) - evalConic(k, vec(p.x - h, p.y))) / (2 * h);
      const gy = (evalConic(k, vec(p.x, p.y + h)) - evalConic(k, vec(p.x, p.y - h))) / (2 * h);
      if (Math.hypot(gx, gy) < 1e-6) continue;   // gradient znika — pomijamy punkt

      const expected = norm(vec(gx, gy));
      const actual = normalAt(k, p);
      expect(actual.x).toBeCloseTo(expected.x, 6);
      expect(actual.y).toBeCloseTo(expected.y, 6);
      checked++;
    }
    expect(checked).toBeGreaterThan(150);
  });
});
