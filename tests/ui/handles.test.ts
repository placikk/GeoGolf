import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import { EllipseState, SNAP_RADIUS } from "../../src/levels/types";
import { applyDrag, handlePositions, pickHandle, snapTo } from "../../src/ui/handles";

const state: EllipseState = { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.8 };

describe("uchwyty", () => {
  it("daje trzy uchwyty, rozmiar na końcu osi wielkiej", () => {
    const hs = handlePositions(state);
    expect(hs.map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
    expect(hs[2].pos.x).toBeCloseTo(0.8, 9);
    expect(hs[2].pos.y).toBeCloseTo(0, 9);
  });

  it("przyskakuje do celu w promieniu, a poza nim nie", () => {
    const target = vec(0.5, 0);
    expect(snapTo(vec(0.5 + SNAP_RADIUS * 0.5, 0), [target], SNAP_RADIUS)).toEqual(target);
    const far = vec(0.5 + SNAP_RADIUS * 2, 0);
    expect(snapTo(far, [target], SNAP_RADIUS)).toEqual(far);
  });

  it("nie pozwala chwycić zablokowanego uchwytu", () => {
    expect(pickHandle(vec(0.8, 0), state, [], 0.1)).toBe("rozmiar");
    expect(pickHandle(vec(0.8, 0), state, ["rozmiar"], 0.1)).toBeNull();
  });

  it("przeciągnięcie ogniska zachowuje elipsę mimo małego a", () => {
    const next = applyDrag({ f1: vec(-0.1, 0), f2: vec(0.1, 0), a: 0.15 }, "ognisko1", vec(-0.9, 0));
    expect(next.f1.x).toBeCloseTo(-0.9, 9);
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
  });

  it("przeciągnięcie rozmiaru ustawia a jako połowę sumy odległości", () => {
    const next = applyDrag(state, "rozmiar", vec(0, 0.6));
    const expected = (dist(vec(0, 0.6), state.f1) + dist(vec(0, 0.6), state.f2)) / 2;
    expect(next.a).toBeCloseTo(expected, 9);
    expect(next.f1).toEqual(state.f1);
  });
});
