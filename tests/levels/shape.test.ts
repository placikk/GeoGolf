import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, scale, vec } from "../../src/core/vec";
import { circleConic, classify, evalConic } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";
import { onPiece, rayPiece } from "../../src/core/piece";
import {
  circle, ellipse, ellipseParam, ellipsePoint, levelCurves, segment, shapeConic, shapeToPiece, LEVELS,
} from "../../src/levels";

// ogniska nieosiowe i niesymetryczne wokół zera
const e = ellipse(vec(-0.2, 0.3), vec(0.5, -0.1), 0.6);

describe("kształty poziomu", () => {
  it("punkt z parametru leży na elipsie", () => {
    for (let t = -3; t <= 3; t += 0.37) expect(evalConic(shapeConic(e), ellipsePoint(e, t))).toBeCloseTo(0, 12);
  });

  it("parametr 0 to wierzchołek za ogniskiem f2, π/2 leży na lewo od osi f1→f2", () => {
    const c = scale(add(e.f1, e.f2), 0.5);
    const p0 = ellipsePoint(e, 0);
    expect(dist(p0, e.f2)).toBeLessThan(dist(p0, e.f1));
    expect(dist(p0, c)).toBeCloseTo(e.a, 12);
    const axis = { x: e.f2.x - e.f1.x, y: e.f2.y - e.f1.y };
    const q = { x: ellipsePoint(e, Math.PI / 2).x - c.x, y: ellipsePoint(e, Math.PI / 2).y - c.y };
    expect(axis.x * q.y - axis.y * q.x).toBeGreaterThan(0);   // przeciwnie do wskazówek zegara
  });

  it("ellipseParam odwraca ellipsePoint", () => {
    for (const t of [-2.9, -1, 0, 0.4, 1.7, 3.1]) expect(ellipseParam(e, ellipsePoint(e, t))).toBeCloseTo(t, 12);
  });

  it("łuk z parametrów: końce i `via` w środku zakresu", () => {
    const arc = ellipse(e.f1, e.f2, e.a, { start: 2, end: 5 });
    const p = shapeToPiece(arc);
    expect(p.arc!.from).toEqual(ellipsePoint(arc, 2));
    expect(p.arc!.to).toEqual(ellipsePoint(arc, 5));
    expect(p.arc!.via).toEqual(ellipsePoint(arc, 3.5));
    expect(onPiece(p, ellipsePoint(arc, 4.5))).toBe(true);
    expect(onPiece(p, ellipsePoint(arc, 1))).toBe(false);
    expect(onPiece(p, ellipsePoint(arc, 5.5))).toBe(false);
  });

  it("okrąg (f1 = f2) trafia się tak samo jak `circleConic` z etapu 1", () => {
    const center = vec(0.42, -0.42);
    const k = shapeConic(circle(center, 0.2));
    expect(classify(k)).toBe("elipsa");
    for (let i = 0; i < 12; i++) {
      const d = fromAngle(i * 0.5 + 0.05);
      const t = rayConic(vec(0, 0), d, k);
      const t1 = rayConic(vec(0, 0), d, circleConic(center, 0.2));
      if (t1 === null) expect(t).toBeNull();
      else expect(t).toBeCloseTo(t1, 12);
    }
  });

  it("odcinek to prosta przycięta do końców", () => {
    const p = shapeToPiece(segment(vec(0.1, 0.4), vec(0.7, 0.4)));
    expect(classify(p.conic)).toBe("prosta");
    expect(rayPiece(vec(0.3, 0), vec(0, 1), p)).toBeCloseTo(0.4, 12);
    expect(rayPiece(vec(0.8, 0), vec(0, 1), p)).toBeNull();
  });

  it("levelCurves: najpierw elementy gracza, potem przeszkody", () => {
    const level = LEVELS.find((l) => l.id === "dwie-przeszkody")!;
    const pieces = level.pieces.map((p) => p.solution);
    const curves = levelCurves(level, pieces);
    expect(curves).toHaveLength(pieces.length + level.obstacles.length);
    expect(curves[0]).toEqual(shapeToPiece(pieces[0]));
    expect(curves[curves.length - 1]).toEqual(shapeToPiece(level.obstacles[level.obstacles.length - 1]));
  });
});
