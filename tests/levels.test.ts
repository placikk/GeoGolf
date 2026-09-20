import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, scale, vec } from "../src/core/vec";
import { runProof } from "../src/core/verify";
import {
  DIAGONAL, EllipseShape, Level, LEVELS, MIN_ARC_LENGTH, SNAP_RADIUS, Shape, levelCurves, perimeter, shapeAxisAngle,
  shapeConic,
} from "../src/levels";
import { applyDrag } from "../src/ui/handles";

const proofFor = (level: Level, pieces: EllipseShape[], obstacles: Shape[] = level.obstacles) =>
  runProof({
    ball: level.ball,
    hole: level.hole,
    holeRadius: level.test.holeRadius,
    maxBounces: level.test.maxBounces,
    curves: levelCurves({ ...level, obstacles }, pieces),
    baseAngle: shapeAxisAngle(pieces[0]),
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
        expect(s.arc.length).toBeGreaterThanOrEqual(MIN_ARC_LENGTH);
        expect(s.arc.length).toBeLessThanOrEqual(perimeter(s) - MIN_ARC_LENGTH);
      }
    }
    if (level.sector !== undefined) {
      expect(level.sector.width).toBeGreaterThan(0);
      expect(level.sector.width).toBeLessThanOrEqual(2 * Math.PI);
    }
  });

  // Zablokowany uchwyt nie daje się przesunąć, więc to, czego dotyczy, musi być w starcie
  // takie samo jak w rozwiązaniu — inaczej poziom byłby cicho nie do wygrania. Rozmiar:
  // gdy ogniska się rozjadą, `a` rośnie (i nigdy nie maleje samo z siebie), ale przy
  // zablokowanym uchwycie rozmiaru WRACA do wartości startu poziomu, kiedy ogniska znów
  // się zejdą (`applyDrag`, `lockedA`) — więc rozwiązanie musi używać dokładnie tej wartości.
  it.each(byId)("poziom %s: zablokowane uchwyty zgadzają się między startem a rozwiązaniem", (_id, level) => {
    for (const piece of level.pieces) {
      if (piece.locked.includes("rozmiar")) expect(piece.start.a).toBe(piece.solution.a);
      if (piece.locked.includes("ognisko1")) expect(piece.solution.f1).toEqual(piece.start.f1);
      if (piece.locked.includes("ognisko2")) expect(piece.solution.f2).toEqual(piece.start.f2);
      // łuk opisany środkiem i długością: końce nie są niezależne, więc blokada obu końców
      // oznacza ten sam łuk
      if (piece.locked.includes("poczatek") && piece.locked.includes("koniec")) {
        expect(piece.start.arc).toEqual(piece.solution.arc);
      }
    }
  });

  // Pułapka z końcowego przeglądu: przy zablokowanym uchwycie rozmiaru gracz, który
  // rozciągnie ogniska (choćby po drodze do celu, np. dotykiem rogu planszy), a potem
  // sprowadzi je z powrotem na miejsce, nie może utknąć z elipsą za dużą, żeby wygrać —
  // zablokowany rozmiar musi wrócić do wartości poziomu (`lockedA` w `applyDrag`).
  it.each(byId)("poziom %s: zablokowany rozmiar wraca do wartości poziomu po objeździe ogniskiem", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      // pułapka dotyczy tylko elementów, gdzie gracz naprawdę może ognisko odciągnąć —
      // gdy oba ogniska są też zablokowane (np. okrąg poziomu 11), nie ma czym objeżdżać
      if (!piece.locked.includes("rozmiar")) return;
      if (piece.locked.includes("ognisko1") || piece.locked.includes("ognisko2")) return;
      let shape = piece.start;
      shape = applyDrag(shape, "ognisko2", vec(0.95, 0.95), piece.start.a);
      shape = applyDrag(shape, "ognisko1", piece.solution.f1, piece.start.a);
      shape = applyDrag(shape, "ognisko2", piece.solution.f2, piece.start.a);
      expect(shape.a, `element ${k}`).toBe(piece.solution.a);
      const pieces = level.pieces.map((q, j) => (j === k ? shape : q.solution));
      expect(solves(level, pieces), `element ${k}`).toBe(true);
    });
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

  // Skracamy tylko łuki elips (o 0.02 długości z każdej strony — dawny 1° parametru na
  // elipsie a ≈ 1 to ok. 0.017). Odcinki celowo zostają nietknięte: ściany tylko
  // ograniczają rozmiar/pozycję elementów gracza; żadne zapisane rozwiązanie nie opiera
  // się na końcu odcinka — sprawdzone przez usunięcie wszystkich odcinków z tego testu.
  it.each(byId)("poziom %s: rozwiązanie nie opiera się na krawędzi łuku (skrócenie o 0.02 z obu stron)", (_id, level) => {
    const d = 0.02;
    const shrink = <S extends Shape>(s: S): S =>
      s.kind === "elipsa" && s.arc !== undefined ? { ...s, arc: { ...s.arc, length: s.arc.length - 2 * d } } : s;
    expect(proofFor(level, solutions(level).map(shrink), level.obstacles.map(shrink)).solved).toBe(true);
  });

  // Kaskada: w zapisanym rozwiązaniu jakieś ognisko leży poza piłką i dołkiem. Na takim
  // poziomie żaden element gracza nie może zastąpić całej kaskady jedną elipsą przez
  // piłkę i dołek — przy żadnym rozmiarze, bo łuk ma stałą DŁUGOŚĆ i na dużej elipsie
  // obejmuje za mały kawałek. (Poziom 9 nie jest kaskadą: tam jedna elipsa przez piłkę
  // i dołek JEST rozwiązaniem.)
  const same = (p: { x: number; y: number }, q: { x: number; y: number }) => dist(p, q) < 1e-12;
  const isCascade = (level: Level) =>
    solutions(level).some((s) => [s.f1, s.f2].some((f) => !same(f, level.ball) && !same(f, level.hole)));

  it("kaskady istnieją tam, gdzie powinny: 13, 14, 15, 16", () => {
    expect(LEVELS.filter(isCascade).map((l) => l.id)).toEqual(
      ["kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2"],
    );
  });

  it.each(LEVELS.filter(isCascade).map((l) => [l.id, l] as const))(
    "poziom %s: jedna elipsa przez piłkę i dołek, z łukiem elementu, nie wygrywa dla żadnego rozmiaru",
    (_id, level) => {
      // start dokładnie na granicy konstruowalności (a = c elipsy przez piłkę i dołek),
      // nie kawałek nad nią — sweep ćwiczy też ten wąski, wcześniej nieobjęty zakres
      const a0 = dist(level.ball, level.hole) / 2 + 1e-3;
      level.pieces.forEach((piece, k) => {
        for (let a = a0; a <= 3; a += 0.04) {
          const one = { ...piece.solution, f1: level.ball, f2: level.hole, a };
          const pieces = level.pieces.map((q, j) => (j === k ? one : q.start));
          expect(solves(level, pieces), `element ${k}, a = ${a.toFixed(2)}`).toBe(false);
        }
      });
    },
  );

  it("poziom 12: każdy rozmiar powyżej pasma przegrywa (duża elipsa nie omija okręgu)", () => {
    const level = LEVELS.find((l) => l.id === "wspologniskowe")!;
    const base = level.pieces[0].solution;
    for (let i = 0; i <= 119; i++) {
      const a = 0.62 + 0.02 * i;    // 0.62 … 3.0
      expect(solves(level, [{ ...base, a }]), `a = ${a.toFixed(2)}`).toBe(false);
    }
  });
});
