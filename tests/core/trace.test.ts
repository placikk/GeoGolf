import { describe, it, expect } from "vitest";
import { vec, dist, fromAngle } from "../../src/core/vec";
import { Conic, ellipseFromFoci, lineThrough } from "../../src/core/conic";
import { trace, TraceOptions } from "../../src/core/trace";

const base = (curves: Conic[], hole = vec(9, 9), holeRadius = 0): TraceOptions => ({
  curves, hole, holeRadius, maxBounces: 1, maxLength: 100,
});

describe("śledzenie toru", () => {
  it("TWIERDZENIE: droga ognisko → krzywa → ognisko wynosi zawsze 2a", () => {
    // 300 losowych elips i losowych kierunków. Ten test bada geometrię,
    // nie implementację — dlatego znajduje każdy błąd w rdzeniu.
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    let ran = 0;
    for (let i = 0; i < 300; i++) {
      const f1 = vec(rnd() * 1.2 - 0.6, rnd() * 1.2 - 0.6);
      const f2 = vec(rnd() * 1.2 - 0.6, rnd() * 1.2 - 0.6);
      const c = dist(f1, f2) / 2;
      if (c < 0.05) continue;                    // zdegenerowane pomijamy
      const a = c + 0.05 + rnd() * 0.8;          // zawsze a > c
      const k = ellipseFromFoci(f1, f2, a);

      const r = trace(f1, fromAngle(rnd() * 2 * Math.PI), base([k]));
      expect(r.path.length).toBeGreaterThanOrEqual(2);
      const hit = r.path[1];
      expect(dist(f1, hit) + dist(hit, f2)).toBeCloseTo(2 * a, 9);
      ran++;
    }
    expect(ran).toBeGreaterThan(250);
  });

  it("wpada do dołka, gdy tor przechodzi w promieniu tolerancji", () => {
    const f1 = vec(-0.5, 0), f2 = vec(0.5, 0);
    const k = ellipseFromFoci(f1, f2, 0.8);
    const r = trace(f1, fromAngle(1.1), { ...base([k]), hole: f2, holeRadius: 0.02 });
    expect(r.holed).toBe(true);
    expect(r.length).toBeCloseTo(1.6, 2);       // 2a = 1.6
  });

  it("nie wpada, gdy dołek stoi w złym miejscu", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const r = trace(vec(-0.5, 0), fromAngle(1.1), {
      ...base([k]), hole: vec(0.5, 0.4), holeRadius: 0.02,
    });
    expect(r.holed).toBe(false);
  });

  it("nie zakleszcza się na krzywej po odbiciu", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const r = trace(vec(-0.5, 0), fromAngle(0.7), { ...base([k]), maxBounces: 20 });
    // 20 odbić = 21 odcinków, każdy o niezerowej długości
    expect(r.path.length).toBe(22);
    for (let i = 1; i < r.path.length; i++) {
      expect(dist(r.path[i - 1], r.path[i])).toBeGreaterThan(1e-6);
    }
  });

  it("wybiera najbliższą krzywą, gdy jest ich kilka", () => {
    const far = lineThrough(vec(0, 0.9), vec(1, 0));
    const near = lineThrough(vec(0, 0.3), vec(1, 0));
    const r = trace(vec(0, 0), vec(0, 1), { ...base([far, near]), maxBounces: 0 });
    expect(r.path[1].y).toBeCloseTo(0.3, 9);
  });

  it("kończy tor po wyczerpaniu limitu długości, gdy nic nie trafia", () => {
    const r = trace(vec(0, 0), vec(1, 0), { ...base([]), maxLength: 3 });
    expect(r.holed).toBe(false);
    expect(r.length).toBeCloseTo(3, 9);
  });
});
