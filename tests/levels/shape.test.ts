import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, scale, vec } from "../../src/core/vec";
import { circleConic, classify, evalConic } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";
import { onPiece, rayPiece } from "../../src/core/piece";
import {
  BOARD_WALLS, arcEllipse, circle, ellipse, ellipseParam, ellipsePoint, isCircle, levelCurves, segment, shapeConic,
  shapeToPiece, LEVELS,
} from "../../src/levels";
import { trace } from "../../src/core/trace";
import { runProof } from "../../src/core/verify";

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

  it("łuk z parametrów: końce w zadanych parametrach, `via` w środku długości", () => {
    const arc = arcEllipse(e.f1, e.f2, e.a, 2, 5);
    const p = shapeToPiece(arc);
    expect(dist(p.arc!.from, ellipsePoint(arc, 2))).toBeLessThan(1e-9);
    expect(dist(p.arc!.to, ellipsePoint(arc, 5))).toBeLessThan(1e-9);
    expect(p.arc!.via).toEqual(ellipsePoint(arc, arc.arc.mid));
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

  it("isCircle: prawda dla okręgu, fałsz dla elipsy o różnych ogniskach", () => {
    expect(isCircle(circle(vec(0.3, -0.2), 0.1))).toBe(true);
    expect(isCircle(ellipse(vec(-0.2, 0.3), vec(0.5, -0.1), 0.6))).toBe(false);
  });

  it("odcinek to prosta przycięta do końców", () => {
    const p = shapeToPiece(segment(vec(0.1, 0.4), vec(0.7, 0.4)));
    expect(classify(p.conic)).toBe("prosta");
    expect(rayPiece(vec(0.3, 0), vec(0, 1), p)).toBeCloseTo(0.4, 12);
    expect(rayPiece(vec(0.8, 0), vec(0, 1), p)).toBeNull();
  });

  it("levelCurves: najpierw elementy gracza, potem przeszkody, na końcu cztery ściany planszy", () => {
    const level = LEVELS.find((l) => l.id === "dwie-przeszkody")!;
    const pieces = level.pieces.map((p) => p.solution);
    const curves = levelCurves(level, pieces);
    const n = pieces.length + level.obstacles.length;
    expect(curves).toHaveLength(n + 4);
    expect(curves[0]).toEqual(shapeToPiece(pieces[0]));
    expect(curves[n - 1]).toEqual(shapeToPiece(level.obstacles[level.obstacles.length - 1]));
    expect(curves.slice(n)).toEqual(BOARD_WALLS.map(shapeToPiece));
  });

  it("ściany planszy to kwadrat [-1, 1]² zamknięty w obwód", () => {
    expect(BOARD_WALLS).toHaveLength(4);
    BOARD_WALLS.forEach((w, i) => {
      expect(Math.abs(w.from.x)).toBe(1);
      expect(Math.abs(w.from.y)).toBe(1);
      expect(w.to).toEqual(BOARD_WALLS[(i + 1) % 4].from);
    });
  });

  it("piłka puszczona prostopadle w ścianę wraca po tym samym torze", () => {
    // start niesymetryczny: odbicie liczone od złej ściany albo złą normalną by się ujawniło
    const r = trace(vec(0.25, 0.5), vec(1, 0), {
      curves: BOARD_WALLS.map(shapeToPiece), hole: vec(9, 9), holeRadius: 0, maxBounces: 1, maxLength: 100,
    });
    expect(r.path[1]).toEqual(vec(1, 0.5));
    expect(r.path[2].x).toBeCloseTo(-1, 12);
    expect(r.path[2].y).toBeCloseTo(0.5, 12);
  });

  it("piłka, która przedtem przepadała poza planszą, teraz odbija się od ramki", () => {
    // start poziomu 8: piłka leży poza małą elipsą startową, więc piłki lecą w brzeg planszy
    // (bez ścian przepadały za nim; zmierzone: wszystkie osiem trafia w ramkę)
    const level = LEVELS.find((l) => l.id === "zwienczenie")!;
    const pieces = level.pieces.map((p) => p.start);
    const proof = runProof({
      ball: level.ball, hole: level.hole, holeRadius: level.test.holeRadius,
      maxBounces: level.test.maxBounces, curves: levelCurves(level, pieces), aimCurve: shapeConic(pieces[0]),
    });
    const onFrame = (q: { x: number; y: number }) =>
      Math.abs(Math.abs(q.x) - 1) < 1e-9 || Math.abs(Math.abs(q.y) - 1) < 1e-9;
    expect(proof.balls.some((b) => b.path.slice(1, -1).some(onFrame))).toBe(true);
  });
});
