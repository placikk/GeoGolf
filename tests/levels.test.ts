import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, scale } from "../src/core/vec";
import { runProof } from "../src/core/verify";
import {
  DIAGONAL, EllipseShape, Level, LEVELS, MIN_ARC, SNAP_RADIUS, Shape, levelCurves, shapeConic,
} from "../src/levels";

const proofFor = (level: Level, pieces: EllipseShape[], obstacles: Shape[] = level.obstacles) =>
  runProof({
    ball: level.ball,
    hole: level.hole,
    holeRadius: level.test.holeRadius,
    maxBounces: level.test.maxBounces,
    curves: levelCurves({ ...level, obstacles }, pieces),
    aimCurve: shapeConic(pieces[0]),
    sector: level.sector,
    count: level.test.balls,
  });

/** Kształt, którego nie da się skonstruować (a <= c), tym bardziej nie rozwiązuje poziomu.
 *  Bez tego przechwycenia test zmuszałby geometrię poziomów do ustępstw wobec własnej
 *  ułomności (patrz komentarz etapu 1 przy teście przesunięcia ogniska). */
const solves = (level: Level, pieces: EllipseShape[]): boolean => {
  try {
    return proofFor(level, pieces).solved;
  } catch {
    return false;
  }
};

const solutions = (level: Level) => level.pieces.map((p) => p.solution);
const byId = LEVELS.map((l) => [l.id, l] as const);

const STAGE_1_IDS = [
  "ogniska", "rozmiar", "skos", "blisko", "ciasna", "przeszkoda", "dwie-przeszkody", "zwienczenie",
];

describe("poziomy", () => {
  it("liczba poziomów i unikalne identyfikatory", () => {
    expect(LEVELS).toHaveLength(16);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it("identyfikatory etapu 1 zostały, w tej samej kolejności — zapisany postęp przetrwa", () => {
    expect(LEVELS.slice(0, 8).map((l) => l.id)).toEqual(STAGE_1_IDS);
  });

  it("niezmiennik: promień przyskakiwania nie jest mniejszy od pasa tolerancji", () => {
    expect(SNAP_RADIUS).toBeGreaterThanOrEqual(0.05 * DIAGONAL);
  });

  it.each(byId)("poziom %s: zapisane rozwiązanie faktycznie rozwiązuje", (_id, level) => {
    expect(proofFor(level, solutions(level)).solved).toBe(true);
  });

  it.each(byId)("poziom %s: stan początkowy NIE jest rozwiązaniem", (_id, level) => {
    expect(solves(level, level.pieces.map((p) => p.start))).toBe(false);
  });

  it.each(byId)("poziom %s: każdy kształt daje się skonstruować, łuki mają poprawny zakres", (_id, level) => {
    const shapes: Shape[] = [...level.pieces.flatMap((p) => [p.start, p.solution]), ...level.obstacles];
    for (const s of shapes) {
      if (s.kind === "odcinek") {
        expect(dist(s.from, s.to)).toBeGreaterThan(0);
        continue;
      }
      expect(s.a).toBeGreaterThan(dist(s.f1, s.f2) / 2);
      expect(() => shapeConic(s)).not.toThrow();
      if (s.arc !== undefined) {
        expect(s.arc.end - s.arc.start).toBeGreaterThanOrEqual(MIN_ARC);
        expect(s.arc.end - s.arc.start).toBeLessThanOrEqual(2 * Math.PI - MIN_ARC);
      }
    }
    if (level.sector !== undefined) {
      expect(level.sector.width).toBeGreaterThan(0);
      expect(level.sector.width).toBeLessThanOrEqual(2 * Math.PI);
    }
  });

  // Kryterium 5% z §6 etapu 1, per element. Ognisko pierwsze każdego elementu: pudło
  // w KAŻDYM z ośmiu kierunków — dokładnie ten sam test co w etapie 1.
  it.each(byId)("poziom %s: każde odblokowane ognisko1 przesunięte o promień przyskakiwania odpada", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      if (piece.locked.includes("ognisko1")) return;
      for (let i = 0; i < 8; i++) {
        const moved = solutions(level).map((s, j) =>
          j === k ? { ...s, f1: add(s.f1, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) } : s);
        expect(solves(level, moved), `element ${k}, kierunek ${i}`).toBe(false);
      }
    });
  });

  // Ognisko drugie: znany z etapu 1 wyjątek — ognisko po stronie dołka przesunięte
  // WZDŁUŻ własnej osi zostawia tory tak blisko dołka, że część przesunięć nadal
  // przechodzi (twierdzenie o odbiciu celuje dokładnie w przesunięte ognisko, a `trace`
  // sprawdza dołek na całym odcinku). Wymagamy pudła w co najmniej 6 z 8 kierunków;
  // zmierzone: żaden poziom nie ma więcej niż dwóch wyjątków i leżą one na osi elementu.
  it.each(byId)("poziom %s: każde odblokowane ognisko2 odpada w co najmniej 6 z 8 kierunków", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      if (piece.locked.includes("ognisko2")) return;
      let missed = 0;
      for (let i = 0; i < 8; i++) {
        const moved = solutions(level).map((s, j) =>
          j === k ? { ...s, f2: add(s.f2, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) } : s);
        if (!solves(level, moved)) missed++;
      }
      expect(missed, `element ${k}`).toBeGreaterThanOrEqual(6);
    });
  });

  it.each(byId)("poziom %s: rozwiązanie nie opiera się na krawędzi łuku (skrócenie o 1° z obu stron)", (_id, level) => {
    const d = Math.PI / 180;
    const shrink = <S extends Shape>(s: S): S =>
      s.kind === "elipsa" && s.arc !== undefined ? { ...s, arc: { start: s.arc.start + d, end: s.arc.end - d } } : s;
    expect(proofFor(level, solutions(level).map(shrink), level.obstacles.map(shrink)).solved).toBe(true);
  });
});
