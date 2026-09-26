import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, len, scale, sub, vec } from "../src/core/vec";
import { runProof } from "../src/core/verify";
import {
  DIAGONAL, Level, LEVELS, MIN_ARC_LENGTH, MovableShape, SNAP_RADIUS, Shape, Span, levelCurves, perimeter,
  shapeAxisAngle, shapeConic, shapeFoci,
} from "../src/levels";
import { applyDrag } from "../src/ui/handles";

const proofFor = (level: Level, pieces: MovableShape[], obstacles: Shape[] = level.obstacles) =>
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
const solves = (level: Level, pieces: MovableShape[]): boolean => {
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
    expect(LEVELS).toHaveLength(22);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it("identyfikatory etapu 1 zostały, w tej samej kolejności — zapisany postęp przetrwa", () => {
    expect(LEVELS.slice(0, 8).map((l) => l.id)).toEqual(STAGE_1_IDS);
  });

  it("identyfikatory etapu 2 zostały, w tej samej kolejności", () => {
    expect(LEVELS.slice(8, 16).map((l) => l.id)).toEqual([
      "polelipsa", "bandy", "przycinanie", "wspologniskowe",
      "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
    ]);
  });

  it("niezmiennik: promień przyskakiwania nie jest mniejszy od pasa tolerancji", () => {
    expect(SNAP_RADIUS).toBeGreaterThanOrEqual(0.05 * DIAGONAL);
  });

  // `shapeAxisAngle` zwraca kierunek f1→f2, a stary kod odczytywał oś z wektora własnego
  // o znaku zależnym od danych — dla części obróconych elips te dwa kąty różnią się o π.
  // Przesunięcie bazy o π to dokładnie count/2 kroków wachlarza, więc przy PARZYSTYM
  // count to tylko przenumerowanie tego samego zbioru kierunków (kula i strzela tam,
  // gdzie wcześniej i+count/2) — wynik dowodu się nie zmienia. Przy NIEPARZYSTYM count
  // byłby to naprawdę inny zestaw kierunków. Niezmiennik pilnowany tu, nie w rdzeniu:
  // nieparzyste count jest świadomie dopuszczone przez specyfikację etapu 1 (jedna piłka
  // celowo na osi), więc `launchAngles`/`runProof` nie mają prawa tego zabraniać.
  it("każdy poziom ma PARZYSTĄ liczbę piłek — inaczej kierunek osi przestaje być obojętny", () => {
    for (const l of LEVELS) expect(l.test.balls % 2).toBe(0);
  });

  it("poziomy hiperboliczne są POZAOSIOWE — inaczej wiązka wraca w lustro", () => {
    for (const l of LEVELS.filter((x) => x.obstacles.some((o) => o.kind === "hiperbola"))) {
      const hip = l.obstacles.find((o) => o.kind === "hiperbola")!;
      if (hip.kind !== "hiperbola") throw new Error("zły rodzaj");
      // piłka, wspólne ognisko (dalsze od dołka) i dołek nie mogą być współliniowe
      const M = dist(hip.f1, l.hole) > dist(hip.f2, l.hole) ? hip.f1 : hip.f2;
      const a = sub(M, l.ball);
      const b = sub(l.hole, M);
      const krzyz = Math.abs(a.x * b.y - a.y * b.x) / (len(a) * len(b));
      expect(krzyz).toBeGreaterThan(0.2);
    }
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
      expect(() => shapeConic(s)).not.toThrow();
      // pola f1/f2/a/arc są specyficzne dla elipsy — parabola i hiperbola (jeszcze
      // nieużywane przez żaden poziom) mają własny, inny zestaw pól sprawdzany przez
      // `shapeFrame`/`shapeToPiece` w `tests/levels/shape.test.ts`.
      if (s.kind === "elipsa") {
        expect(s.a).toBeGreaterThan(dist(s.f1, s.f2) / 2);
        if (s.arc !== undefined) {
          expect(s.arc.length).toBeGreaterThanOrEqual(MIN_ARC_LENGTH);
          expect(s.arc.length).toBeLessThanOrEqual(perimeter(s) - MIN_ARC_LENGTH);
        }
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
      const { start, solution: sol, locked } = piece;
      // rodzaj krzywej należy do poziomu, nie do gracza — nie ma uchwytu, który by go zmienił
      expect(sol.kind).toBe(start.kind);
      if (start.kind === "parabola" && sol.kind === "parabola") {
        if (locked.includes("ognisko")) expect(sol.focus).toEqual(start.focus);
        if (locked.includes("wierzcholek")) expect(sol.vertex).toEqual(start.vertex);
        // kawałek opisuje poziom, nie palec — gracz nie ma jak go zmienić
        expect(sol.span).toEqual(start.span);
        continue;
      }
      if (start.kind === "hiperbola" && sol.kind === "hiperbola") {
        if (locked.includes("rozmiar")) expect(sol.a).toBe(start.a);
        if (locked.includes("ognisko1")) expect(sol.f1).toEqual(start.f1);
        if (locked.includes("ognisko2")) expect(sol.f2).toEqual(start.f2);
        // gałąź i kawałek należą do poziomu — uchwyt rozmiaru bierze z palca tylko odległość
        expect(sol.branch).toBe(start.branch);
        expect(sol.span).toEqual(start.span);
        continue;
      }
      // tu zostaje elipsa: rodzaje startu i rozwiązania są równe, sprawdzone wyżej
      if (start.kind !== "elipsa" || sol.kind !== "elipsa") continue;
      if (locked.includes("rozmiar")) expect(start.a).toBe(sol.a);
      if (locked.includes("ognisko1")) expect(sol.f1).toEqual(start.f1);
      if (locked.includes("ognisko2")) expect(sol.f2).toEqual(start.f2);
      // łuk opisany środkiem i długością: końce nie są niezależne, więc blokada obu końców
      // oznacza ten sam łuk
      if (locked.includes("poczatek") && locked.includes("koniec")) {
        expect(start.arc).toEqual(sol.arc);
      }
    }
  });

  // Pułapka z końcowego przeglądu: przy zablokowanym uchwycie rozmiaru gracz, który
  // rozciągnie ogniska (choćby po drodze do celu, np. dotykiem rogu planszy), a potem
  // sprowadzi je z powrotem na miejsce, nie może utknąć z elipsą za dużą, żeby wygrać —
  // zablokowany rozmiar musi wrócić do wartości poziomu (`lockedA` w `applyDrag`).
  it.each(byId)("poziom %s: zablokowany rozmiar wraca do wartości poziomu po objeździe ogniskiem", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      if (!piece.locked.includes("rozmiar")) return;
      const start = piece.start;
      const sol = piece.solution;
      // parabola nie ma uchwytu rozmiaru — nie ma czego przywracać
      if (start.kind === "parabola" || sol.kind === "parabola") return;
      // pułapka dotyczy tylko ognisk, którymi gracz naprawdę może objechać — objazd
      // ciągnie WOLNE ogniska; gdy oba są też zablokowane (np. okrąg poziomu 11),
      // nie ma czym objeżdżać. Na poziomach z zablokowanym tylko jednym ogniskiem
      // (np. planowane 22–23: zablokowane `ognisko1` i `rozmiar`) objazd musi ciągnąć
      // to DRUGIE, wolne ognisko — inaczej test wyłączałby się dokładnie tam, gdzie
      // pułapka jest realna.
      const freeFoci = (["ognisko1", "ognisko2"] as const).filter((h) => !piece.locked.includes(h));
      if (freeFoci.length === 0) return;
      const lockedA = start.a;
      const solTarget = (h: "ognisko1" | "ognisko2") => (h === "ognisko1" ? sol.f1 : sol.f2);
      // dragHyperbola/dragEllipse nigdy nie zmieniają `kind`; parabola już wykluczona
      // wyżej — to tylko odzyskuje dla TypeScriptu zawężenie zgubione przez ogólne
      // przeciążenie applyDrag (zwraca MovableShape)
      const narrow = (s: MovableShape) => {
        if (s.kind === "parabola") throw new Error("zły rodzaj");
        return s;
      };

      // Elipsa i hiperbola bronią zacisku na przeciwnych krańcach: elipsie `a` rośnie
      // bez ograniczeń, gdy ogniska się rozjadą (róg planszy jest tu najgorszym
      // przypadkiem), a hiperboli `a` jest ścinane do zera, gdy ogniska się zejdą
      // (najgorszy przypadek to drugie ognisko TEGO SAMEGO elementu). Jeden objazd nie
      // złapałby obu błędów naraz, więc sprawdzamy oba kierunki osobno.
      let stretched: MovableShape = start;
      for (const h of freeFoci) stretched = applyDrag(stretched, h, vec(0.95, 0.95), lockedA);
      for (const h of freeFoci) stretched = applyDrag(stretched, h, solTarget(h), lockedA);
      expect(narrow(stretched).a, `element ${k}, róg planszy`).toBe(sol.a);

      let squeezed: MovableShape = start;
      for (const h of freeFoci) squeezed = applyDrag(squeezed, h, h === "ognisko1" ? start.f2 : start.f1, lockedA);
      for (const h of freeFoci) squeezed = applyDrag(squeezed, h, solTarget(h), lockedA);
      expect(narrow(squeezed).a, `element ${k}, ogniska sklejone`).toBe(sol.a);

      const pieces = level.pieces.map((q, j) => (j === k ? squeezed : q.solution));
      expect(solves(level, pieces), `element ${k}`).toBe(true);
    });
  });

  // Kryterium 5% z §6 etapu 1, per element. Ognisko pierwsze każdego elementu: pudło
  // w KAŻDYM z ośmiu kierunków — dokładnie ten sam test co w etapie 1.
  it.each(byId)("poziom %s: każde odblokowane ognisko1 przesunięte o promień przyskakiwania odpada", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      const sol = piece.solution;
      // parabola nie ma uchwytu `ognisko1` — jej jedyne ognisko sprawdza osobny test niżej
      if (piece.locked.includes("ognisko1") || sol.kind === "parabola") return;
      for (let i = 0; i < 8; i++) {
        const shifted: MovableShape = { ...sol, f1: add(sol.f1, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) };
        const moved = solutions(level).map((s, j) => (j === k ? shifted : s));
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
      const sol = piece.solution;
      // parabola nie ma uchwytu `ognisko2` — jej jedyne ognisko sprawdza osobny test niżej
      if (piece.locked.includes("ognisko2") || sol.kind === "parabola") return;
      let missed = 0;
      for (let i = 0; i < 8; i++) {
        const shifted: MovableShape = { ...sol, f2: add(sol.f2, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) };
        const moved = solutions(level).map((s, j) => (j === k ? shifted : s));
        if (!solves(level, moved)) missed++;
      }
      expect(missed, `element ${k}`).toBeGreaterThanOrEqual(6);
    });
  });

  // Parabola ma jedno ognisko i obowiązuje dla niego surowa postać kryterium — pudło
  // w każdym z ośmiu kierunków, jak `ognisko1`. Wierzchołka nie przesuwamy: spec §8 wiąże
  // promień przyskakiwania z tolerancją dla ognisk, a wierzchołek nie przyskakuje.
  // Uwaga na ryzyko z zadania 9: przy współliniowej geometrii piłki blisko osi mogą
  // wpadać po jednym odbiciu także przy przesuniętym ognisku. Jeśli ten test padnie na
  // poziomie parabolicznym, to jest pierwszy podejrzany.
  it.each(byId)("poziom %s: każde odblokowane ognisko paraboli przesunięte o promień przyskakiwania odpada", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      const sol = piece.solution;
      if (piece.locked.includes("ognisko") || sol.kind !== "parabola") return;
      for (let i = 0; i < 8; i++) {
        const shifted: MovableShape = { ...sol, focus: add(sol.focus, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) };
        const moved = solutions(level).map((s, j) => (j === k ? shifted : s));
        expect(solves(level, moved), `element ${k}, kierunek ${i}`).toBe(false);
      }
    });
  });

  // Skracamy o 0.02 z każdej strony — dawny 1° parametru na elipsie a ≈ 1 to ok. 0.017.
  // Elipsa: tylko jeśli ma łuk (`arc`). Parabola/hiperbola: `span` jest OBOWIĄZKOWY
  // (parabola jest nieograniczona), więc kawałek zawsze się skraca — wariant `length`
  // wprost o 2d, wariant `span` też o 2d, ale w innej walucie: dla paraboli parametr
  // krzywej to odsunięcie prostopadłe od ogniska, więc 2d jest tam wprost długością;
  // dla hiperboli parametr jest bezwymiarowy, więc to samo 2d skraca kawałek SŁABIEJ
  // niż na paraboli czy elipsie — i tak wystarcza, żeby rozwiązanie oparte na samej
  // krawędzi kawałka przestało się mieścić. Odcinki celowo zostają nietknięte: ściany
  // tylko ograniczają rozmiar/pozycję elementów gracza; żadne zapisane rozwiązanie nie
  // opiera się na końcu odcinka — sprawdzone przez usunięcie wszystkich odcinków z tego testu.
  const shrinkSpan = (span: Span, d: number): Span =>
    "length" in span ? { ...span, length: span.length - 2 * d } : { ...span, span: span.span - 2 * d };
  const shrinkMovable = (s: MovableShape, d: number): MovableShape =>
    s.kind === "elipsa"
      ? (s.arc === undefined ? s : { ...s, arc: { ...s.arc, length: s.arc.length - 2 * d } })
      : { ...s, span: shrinkSpan(s.span, d) };
  const shrinkShape = (s: Shape, d: number): Shape => (s.kind === "odcinek" ? s : shrinkMovable(s, d));

  it.each(byId)("poziom %s: rozwiązanie nie opiera się na krawędzi łuku (skrócenie o 0.02 z obu stron)", (_id, level) => {
    const d = 0.02;
    expect(
      proofFor(level, solutions(level).map((s) => shrinkMovable(s, d)), level.obstacles.map((s) => shrinkShape(s, d))).solved,
    ).toBe(true);
  });

  // Kaskada: w zapisanym rozwiązaniu jakieś ognisko leży poza piłką i dołkiem. Na takim
  // poziomie żaden element gracza nie może zastąpić całej kaskady jedną elipsą przez
  // piłkę i dołek — przy żadnym rozmiarze, bo łuk ma stałą DŁUGOŚĆ i na dużej elipsie
  // obejmuje za mały kawałek. (Poziom 9 nie jest kaskadą: tam jedna elipsa przez piłkę
  // i dołek JEST rozwiązaniem.)
  const same = (p: { x: number; y: number }, q: { x: number; y: number }) => dist(p, q) < 1e-12;
  const isCascade = (level: Level) =>
    solutions(level).some((s) => shapeFoci(s).some((f) => !same(f, level.ball) && !same(f, level.hole)));

  // Poziomy 21–22 SĄ kaskadami: ich rozwiązania mają ognisko we wspólnym punkcie M,
  // poza piłką i dołkiem — stąd rozszerzenie tej sztywnej listy.
  it("kaskady istnieją tam, gdzie powinny: 13, 14, 15, 16, 21, 22", () => {
    expect(LEVELS.filter(isCascade).map((l) => l.id)).toEqual(
      ["kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2", "wspolne-ognisko", "druga-strona"],
    );
  });

  it.each(LEVELS.filter(isCascade).map((l) => [l.id, l] as const))(
    "poziom %s: jedna elipsa przez piłkę i dołek, z łukiem elementu, nie wygrywa dla żadnego rozmiaru, JAKI GRACZ MOŻE USTAWIĆ",
    (_id, level) => {
      // start dokładnie na granicy konstruowalności (a = c elipsy przez piłkę i dołek),
      // nie kawałek nad nią — sweep ćwiczy też ten wąski, wcześniej nieobjęty zakres
      const a0 = dist(level.ball, level.hole) / 2 + 1e-3;
      level.pieces.forEach((piece, k) => {
        const sol = piece.solution;
        // Gracz nie zmienia rodzaju krzywej: jedyna elipsa, jaką może postawić przez piłkę
        // i dołek, to jego WŁASNA elipsa. Parabola ani hiperbola nie staną się elipsą,
        // więc dla nich tego obejścia nie ma czym wykonać.
        if (sol.kind !== "elipsa") return;
        // `start.kind` jest tego samego rodzaju co `sol.kind` (pilnuje test zgodności
        // uchwytów wyżej) — to zawężenie tylko odzyskuje to dla TypeScriptu.
        const start = piece.start;
        if (start.kind !== "elipsa") return;
        // Rozmiar zablokowany: `dragEllipse` (src/ui/handles.ts) broni `a` od dołu przez
        // `a = Math.max(lockedA, c + MIN_GAP)`, gdzie `lockedA` to `start.a` poziomu i
        // `c = |ognisko1 ognisko2| / 2`. Gracz, który postawi swoje ogniska na piłce
        // i dołku, NIE MOŻE dostać żadnego innego rozmiaru niż ten jeden — dla c poniżej
        // `lockedA` gra i tak wraca do `lockedA`, a dla c powyżej rośnie wraz z c. Rozmiary
        // spod tej jedynej dostępnej wartości nie są obejściem, bo gracz nie ma jak ich
        // ustawić — testowanie ich testowałoby konfiguracje spoza gry, nie lekcję poziomu.
        // Gdy rozmiar jest WOLNY (jak w poziomie 16 „zwienczenie-2"), gracz ma pełny zakres
        // i sweep sam wraca do przeglądu 0 → 3 poniżej.
        const c = dist(level.ball, level.hole) / 2;
        const locked = piece.locked.includes("rozmiar");
        const from = locked ? Math.max(start.a, c + 1e-3) : a0;
        const to = locked ? from : 3;
        for (let a = from; a <= to; a += 0.04) {
          const one = { ...sol, f1: level.ball, f2: level.hole, a };
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
      const resized = { ...base, a };
      expect(solves(level, [resized]), `a = ${a.toFixed(2)}`).toBe(false);
    }
  });
});
