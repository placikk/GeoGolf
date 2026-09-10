import { describe, it, expect } from "vitest";
import { dist, vec } from "../../src/core/vec";
import { pathLength, positionAt, trailSegment } from "../../src/render/trails";

const path = [vec(0, 0), vec(1, 0), vec(1, 1)];

describe("ruch po torze", () => {
  it("mierzy długość łamanej", () => {
    expect(pathLength(path)).toBeCloseTo(2, 12);
  });

  it("pozycja rośnie liniowo z przebytą drogą", () => {
    expect(positionAt(path, 0)).toEqual(vec(0, 0));
    expect(positionAt(path, 0.5).x).toBeCloseTo(0.5, 12);
    expect(positionAt(path, 1.5).y).toBeCloseTo(0.5, 12);
  });

  it("poza końcem toru zatrzymuje się na końcu", () => {
    const p = positionAt(path, 99);
    expect(p.x).toBeCloseTo(1, 12);
    expect(p.y).toBeCloseTo(1, 12);
  });

  it("smuga zaczyna się o zadaną długość wcześniej", () => {
    const seg = trailSegment(path, 1.5, 1.0);
    expect(seg[0].x).toBeCloseTo(0.5, 12);
    expect(seg[0].y).toBeCloseTo(0, 12);
    expect(seg[seg.length - 1].y).toBeCloseTo(0.5, 12);
  });

  it("smuga na starcie nie sięga przed początek toru", () => {
    const seg = trailSegment(path, 0.3, 1.0);
    expect(seg[0].x).toBeCloseTo(0, 12);
  });

  it("smuga zawiera wierzchołek pośredni, nie ścina zakrętu", () => {
    const seg = trailSegment(path, 1.5, 1.0);
    expect(seg).toHaveLength(3);
    expect(seg[1].x).toBeCloseTo(1, 12);
    expect(seg[1].y).toBeCloseTo(0, 12);
  });

  it("po dobiegnięciu do końca nie duplikuje ostatniego punktu", () => {
    const seg = trailSegment(path, 2.5, 1.0);
    for (let i = 1; i < seg.length; i++) {
      expect(dist(seg[i - 1], seg[i])).toBeGreaterThan(0);
    }
  });
});
