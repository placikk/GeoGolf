import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, len, scale, vec } from "../../src/core/vec";
import { circleConic, classify, evalConic } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";
import { onPiece, rayPiece } from "../../src/core/piece";
import { framePoint } from "../../src/core/frame";
import {
  BOARD_WALLS, ArcRange, arcEllipse, circle, ellipse, ellipseParam, ellipsePoint, hyperbola, isCircle, levelCurves, parabola,
  segment, shapeAxisAngle, shapeConic, shapeFoci, shapeFrame, shapeToPiece, Span, LEVELS,
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

  it("shapeAxisAngle to kierunek f1→f2, a nie f2→f1", () => {
    // oś `e` (atan2(-0.4, 0.7) ≈ -29.7°) nie jest wielokrotnością π/2, więc zwroty
    // f1→f2 i f2→f1 (różne o π) dają się tu jednoznacznie odróżnić — na osi 0°/90°
    // ten test przeszedłby nawet po odwróceniu zwrotu.
    const toF2 = Math.atan2(e.f2.y - e.f1.y, e.f2.x - e.f1.x);
    const toF1 = Math.atan2(e.f1.y - e.f2.y, e.f1.x - e.f2.x);
    expect(shapeAxisAngle(e)).toBeCloseTo(toF2, 12);
    expect(shapeAxisAngle(e)).not.toBeCloseTo(toF1, 5);
  });

  it("shapeAxisAngle dla okręgu (f1 = f2): umowna oś x, jak ellipseAxis", () => {
    expect(shapeAxisAngle(circle(vec(0.1, -0.2), 0.3))).toBe(0);
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
    // start poziomu „zwienczenie": piłka leży poza małą elipsą startową, więc piłki lecą w brzeg planszy
    // (bez ścian przepadały za nim; zmierzone: wszystkie osiem trafia w ramkę)
    const level = LEVELS.find((l) => l.id === "zwienczenie")!;
    const pieces = level.pieces.map((p) => p.start);
    const proof = runProof({
      ball: level.ball, hole: level.hole, holeRadius: level.test.holeRadius,
      maxBounces: level.test.maxBounces, curves: levelCurves(level, pieces), baseAngle: shapeAxisAngle(pieces[0]),
    });
    const onFrame = (q: { x: number; y: number }) =>
      Math.abs(Math.abs(q.x) - 1) < 1e-9 || Math.abs(Math.abs(q.y) - 1) < 1e-9;
    expect(proof.balls.some((b) => b.path.slice(1, -1).some(onFrame))).toBe(true);
  });
});

describe("typy nowych kształtów", () => {
  it("Span rozróżnia się obecnością pola, więc dane etapu 2 nie wymagają zmiany", () => {
    const dlugosc: Span = { mid: 0.2, length: 0.9 };
    const parametr: Span = { mid: 0.2, span: 1.4 };
    expect("length" in dlugosc).toBe(true);
    expect("length" in parametr).toBe(false);
  });

  it("Span jest wyłączny: ani oba pola naraz, ani żadne", () => {
    // @ts-expect-error — `length` i `span` naraz: nie wiadomo, który opis obowiązuje
    const oba: Span = { mid: 0.2, length: 0.9, span: 1.4 };
    // @ts-expect-error — sam środek bez zakresu nie opisuje kawałka
    const zaden: Span = { mid: 0.2 };
    expect([oba, zaden]).toHaveLength(2);
  });

  it("ArcRange etapu 2 jest wariantem długościowym Span", () => {
    const arc: ArcRange = { mid: 0, length: 1 };
    const span: Span = arc;
    expect(span).toBe(arc);
  });
});

describe("parabola i hiperbola jako kształty poziomu", () => {
  const par = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });
  // odległość ognisk 1.2, NIE 1 — inaczej `norm(...)` w gałęzi hiperboli byłby
  // identycznością i test nie odróżniłby normalizacji od jej braku.
  const hyp = hyperbola(vec(-0.5, 0), vec(0.7, 0), 0.3, 1, { mid: 0, span: 2 });

  it("shapeFrame paraboli ma oś jednostkową od wierzchołka do ogniska", () => {
    const f = shapeFrame(par);
    expect(f.kind).toBe("parabola");
    expect(len(f.axis)).toBeCloseTo(1, 12);
    expect(f.axis.x).toBeCloseTo(1, 12);
    if (f.kind === "parabola") expect(f.p).toBeCloseTo(0.3, 12);
  });

  it("shapeFrame hiperboli liczy b z ognisk i a", () => {
    const f = shapeFrame(hyp);
    if (f.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(len(f.axis)).toBeCloseTo(1, 12);
    expect(f.a).toBeCloseTo(0.3, 12);
    expect(f.b).toBeCloseTo(Math.sqrt(0.36 - 0.09), 12);
    expect(f.branch).toBe(1);
  });

  it("shapeToPiece nowych krzywych daje range, NIGDY arc", () => {
    for (const s of [par, hyp]) {
      const piece = shapeToPiece(s);
      expect(piece.range).toBeDefined();
      expect(piece.arc).toBeUndefined();
    }
  });

  it("shapeToPiece daje range także przy opisie DŁUGOŚCIĄ", () => {
    const dlugi = hyperbola(vec(-0.5, 0), vec(0.5, 0), 0.3, 1, { mid: 0, length: 0.7 });
    const piece = shapeToPiece(dlugi);
    expect(piece.range).toBeDefined();
    expect(piece.arc).toBeUndefined();
  });

  it("końce kawałka leżą na postaci kwadratowej", () => {
    for (const s of [par, hyp]) {
      const piece = shapeToPiece(s);
      const r = piece.range!;
      for (const t of [r.from, (r.from + r.to) / 2, r.to]) {
        expect(evalConic(piece.conic, framePoint(r.frame, t))).toBeCloseTo(0, 9);
      }
    }
  });

  it("shapeAxisAngle zna wszystkie trzy krzywe", () => {
    expect(shapeAxisAngle(par)).toBeCloseTo(0, 12);
    expect(shapeAxisAngle(hyp)).toBeCloseTo(0, 12);
    expect(shapeAxisAngle(ellipse(vec(-1, 0), vec(1, 0), 2))).toBeCloseTo(0, 12);
  });

  it("shapeFoci zwraca ogniska każdej krzywej", () => {
    expect(shapeFoci(par)).toEqual([vec(-0.5, 0)]);
    expect(shapeFoci(hyp)).toEqual([vec(-0.5, 0), vec(0.7, 0)]);
  });
});
