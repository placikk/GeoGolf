import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import {
  arcEllipse, arcFromParams, arcLengthBetween, arcParams, ellipse, MIN_ARC_LENGTH, paramAtLength, perimeter,
} from "../../src/levels";

// ogniska nieosiowe i niesymetryczne wokół zera
const e = ellipse(vec(-0.2, 0.3), vec(0.5, -0.1), 0.6);

describe("łuk opisany długością", () => {
  it("obwód okręgu to 2πr (z dokładnością łamanej)", () => {
    const c = ellipse(vec(0.3, -0.2), vec(0.3, -0.2), 0.25);
    expect(perimeter(c)).toBeCloseTo(2 * Math.PI * 0.25, 4);
  });

  it("długość od t0 do t1 i parametr po długości są wzajemnie odwrotne", () => {
    for (const [t0, len] of [[0.3, 0.2], [2.5, 1.1], [-1, 0.05], [5.9, 0.7], [1, -0.4]] as const) {
      const t1 = paramAtLength(e, t0, len);
      expect(arcLengthBetween(e, t0, t1)).toBeCloseTo(len, 9);
    }
  });

  it("łuk „od α do β” ma końce w α i β, a długość to długość tego kawałka", () => {
    const arc = arcFromParams(e, 2, 5);
    const { start, end } = arcParams(e, arc);
    expect(start).toBeCloseTo(2, 9);
    expect(end).toBeCloseTo(5, 9);
    expect(arc.length).toBeCloseTo(arcLengthBetween(e, 2, 5), 12);
    // środek to połowa DŁUGOŚCI, nie połowa parametru
    expect(arcLengthBetween(e, 2, arc.mid)).toBeCloseTo(arc.length / 2, 9);
  });

  it("przy dwa razy większym a łuk ma tę samą długość i obejmuje mniejszy zakres parametru", () => {
    const small = arcEllipse(e.f1, e.f2, e.a, 1, 2.5);
    const big = { ...small, a: 2 * small.a };
    const s = arcParams(small, small.arc);
    const b = arcParams(big, big.arc);
    expect(arcLengthBetween(big, b.start, b.end)).toBeCloseTo(small.arc.length, 9);
    expect(b.end - b.start).toBeLessThan(s.end - s.start);
  });

  it("łuk dłuższy niż obwód jest przycinany: zawsze zostaje przerwa MIN_ARC_LENGTH", () => {
    const arc = { mid: 1, length: 100 };
    const { start, end } = arcParams(e, arc);
    expect(arcLengthBetween(e, start, end)).toBeCloseTo(perimeter(e) - MIN_ARC_LENGTH, 9);
  });
});
