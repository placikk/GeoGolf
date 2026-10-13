import { describe, it, expect } from "vitest";
import { Vec2, add, dist, fromAngle, len, norm, scale, sub, vec } from "../src/core/vec";
import { rayPiece } from "../src/core/piece";
import { runProof } from "../src/core/verify";
import {
  DIAGONAL, Handle, HyperbolaShape, Level, LEVELS, MIN_ARC_LENGTH, MovableShape, SNAP_RADIUS, SegmentShape, Shape, Span,
  levelCurves,
  perimeter, shapeAxisAngle, shapeConic, shapeFoci, shapeToPiece,
} from "../src/levels";
import { piecePolyline, twinPolyline } from "../src/render/shapes";
import { applyDrag, handlePositions, lockedSize } from "../src/ui/handles";

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

// Numery poziomów w komentarzach tego pliku to numeracja z czasów, gdy powstawał dany test
// (etapy 1–3: 1–24). W grze są o 3 większe — etap 0 dodał trzy poziomy na początku — a
// „druga-strona" (stary 22) stoi teraz przed „wspolne-ognisko" (stary 21). Nazwy testów
// podają identyfikatory.
const STAGE_1_IDS = [
  "ogniska", "rozmiar", "skos", "blisko", "ciasna", "przeszkoda", "dwie-przeszkody", "zwienczenie",
];

describe("poziomy", () => {
  it("liczba poziomów i unikalne identyfikatory", () => {
    expect(LEVELS).toHaveLength(27);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it("etap 0 otwiera grę: trzy poziomy bilardowe", () => {
    expect(LEVELS.slice(0, 3).map((l) => l.id)).toEqual(["odbicie", "dwa-odbicia", "za-rogiem"]);
  });

  // numery się przesunęły o etap 0, ale identyfikatory i ich wzajemna kolejność zostały —
  // zapis postępu trzyma identyfikatory (`progress.ts`, `LEGACY_ORDER`)
  it("identyfikatory etapu 1 zostały, w tej samej kolejności — zapisany postęp przetrwa", () => {
    expect(LEVELS.slice(3, 11).map((l) => l.id)).toEqual(STAGE_1_IDS);
  });

  // Jedyna zmiana kolejności od wydania: „druga-strona" (jeden uchwyt) wprowadza hiperbolę,
  // więc stoi przed „wspolne-ognisko". Zapis postępu przelicza stare indeksy (`LEGACY_ORDER`).
  it("etap 3: parabole, potem hiperbole od najprostszej", () => {
    expect(LEVELS.slice(19, 27).map((l) => l.id)).toEqual([
      "ognisko-paraboli", "parabola-rozmiar", "obrot-osi", "teleskop",
      "druga-strona", "wspolne-ognisko", "ktora-galaz", "zwienczenie-3",
    ]);
  });

  it("identyfikatory etapu 2 zostały, w tej samej kolejności", () => {
    expect(LEVELS.slice(11, 19).map((l) => l.id)).toEqual([
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
  // Dotyczy tylko dowodu na 360° — z wachlarzem kierunki liczy `sector`, nie oś, więc
  // obrót bazy o π niczego nie zmienia (i poziomy jednopiłkowe mogą istnieć).
  it("każdy poziom bez wachlarza ma PARZYSTĄ liczbę piłek — inaczej kierunek osi przestaje być obojętny", () => {
    for (const l of LEVELS.filter((x) => x.sector === undefined)) expect(l.test.balls % 2, l.id).toBe(0);
  });

  // Jedna piłka ma sens tylko z wachlarzem zerowej szerokości (jeden znany kierunek strzału);
  // i odwrotnie — wachlarz zerowej szerokości przy wielu piłkach puściłby je wszystkie jednym torem.
  it("poziom jednopiłkowy ma wachlarz zerowej szerokości — i tylko on", () => {
    for (const l of LEVELS) {
      expect(l.test.balls === 1, l.id).toBe(l.sector !== undefined && l.sector.width === 0);
    }
  });

  // Hiperbola poziomu bywa przeszkodą (odbija piłkę, poziom 21) ALBO elementem gracza
  // (poziom 22: gracz rusza samą hiperbolą) — test musi znaleźć ją w obu miejscach,
  // inaczej sprawdza tylko połowę poziomów hiperbolicznych i milczy dokładnie tam, gdzie
  // gracz mógłby zepchnąć układ na osiową współliniowość. Bierzemy `solution`, bo to
  // intencja poziomu, nie chwilowy (i celowo bezładny) stan startu.
  const levelHyperbolas = (level: Level): HyperbolaShape[] =>
    [...level.obstacles, ...solutions(level)].filter(
      (s): s is HyperbolaShape => s.kind === "hiperbola",
    );

  it("poziomy hiperboliczne są POZAOSIOWE — inaczej wiązka wraca w lustro", () => {
    for (const l of LEVELS) {
      for (const hip of levelHyperbolas(l)) {
        // piłka, wspólne ognisko (dalsze od dołka) i dołek nie mogą być współliniowe
        const M = dist(hip.f1, l.hole) > dist(hip.f2, l.hole) ? hip.f1 : hip.f2;
        const a = sub(M, l.ball);
        const b = sub(l.hole, M);
        const krzyz = Math.abs(a.x * b.y - a.y * b.x) / (len(a) * len(b));
        expect(krzyz, `poziom ${l.id}`).toBeGreaterThan(0.2);
      }
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
      // zero tylko przy jednej piłce — pilnuje osobny test wyżej
      expect(level.sector.width).toBeGreaterThanOrEqual(0);
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
        // rysowanie drugiej gałęzi to też dana poziomu, nie stan gracza
        expect(sol.twin).toBe(start.twin);
        continue;
      }
      if (start.kind === "odcinek" && sol.kind === "odcinek") {
        if (locked.includes("koniec1")) expect(sol.from).toEqual(start.from);
        if (locked.includes("koniec2")) expect(sol.to).toEqual(start.to);
        if (locked.includes("srodek")) expect(scale(add(sol.from, sol.to), 0.5)).toEqual(scale(add(start.from, start.to), 0.5));
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

  // `Handle` to płaska unia wszystkich uchwytów wszystkich krzywych, więc np. `locked:
  // ["ognisko"]` przy elipsie kompiluje się i po cichu nic nie blokuje. Każda blokada musi
  // więc nazywać uchwyt, który ten element naprawdę ma — ten sam zestaw, który gra rysuje
  // i łapie (`handlePositions`).
  it.each(byId)("poziom %s: każdy zablokowany uchwyt istnieje w swoim elemencie", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      const ids = handlePositions(piece.start).map((h) => h.id);
      for (const id of piece.locked) expect(ids, `element ${k}, blokada "${id}"`).toContain(id);
    });
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
      if (start.kind === "parabola" || start.kind === "odcinek" || sol.kind === "parabola" || sol.kind === "odcinek") return;
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
        if (s.kind === "parabola" || s.kind === "odcinek") throw new Error("zły rodzaj");
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
      if (piece.locked.includes("ognisko1") || sol.kind === "parabola" || sol.kind === "odcinek") return;
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
      if (piece.locked.includes("ognisko2") || sol.kind === "parabola" || sol.kind === "odcinek") return;
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

  // Kryterium 5% nie pasuje do odcinka: przesunięcie środka wzdłuż własnej prostej lustra
  // niczego nie zmienia, dopóki piłka w lustro trafia. Odpowiednik dla lustra płaskiego to
  // obrót — o ±3° wokół środka musi dać pudło (spec wprowadzeń §1.4).
  const rotate = (s: SegmentShape, deg: number): SegmentShape => {
    const c = scale(add(s.from, s.to), 0.5);
    const t = (deg * Math.PI) / 180;
    const turn = (p: Vec2) => {
      const d = sub(p, c);
      return add(c, vec(d.x * Math.cos(t) - d.y * Math.sin(t), d.x * Math.sin(t) + d.y * Math.cos(t)));
    };
    return { ...s, from: turn(s.from), to: turn(s.to) };
  };

  it.each(byId)("poziom %s: każde lustro-odcinek obrócone o ±3° odpada", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      const sol = piece.solution;
      if (sol.kind !== "odcinek") return;
      for (const deg of [-3, 3]) {
        const moved = solutions(level).map((s, j) => (j === k ? rotate(sol, deg) : s));
        expect(solves(level, moved), `element ${k}, ${deg}°`).toBe(false);
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
    span.length !== undefined ? { ...span, length: span.length - 2 * d } : { ...span, span: span.span - 2 * d };
  const shrinkMovable = (s: MovableShape, d: number): MovableShape =>
    s.kind === "odcinek" ? s
    : s.kind === "elipsa"
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
  it("kaskady istnieją tam, gdzie powinny: cztery z etapu 2 i cztery hiperboliczne z etapu 3", () => {
    expect(LEVELS.filter(isCascade).map((l) => l.id)).toEqual(
      [
        "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
        "druga-strona", "wspolne-ognisko", "ktora-galaz", "zwienczenie-3",
      ],
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

  // Poziom 23 („Która gałąź") rysuje blado drugą gałąź hiperboli gracza — decyzja
  // właściciela z 2026-09-26: tylko tu, pod flagą `twin` w danych poziomu. Druga gałąź
  // zmieściłaby się na planszy także na 21, 22 i 24, ale tam jej nie ma. Jest wyłącznie
  // rysunkiem (`twinPolyline`); do `shapeToPiece` i fizyki nie trafia.
  const ktoraGalaz = (): Level => {
    const l = LEVELS.find((x) => x.id === "ktora-galaz");
    if (l === undefined) throw new Error("brak poziomu ktora-galaz");
    return l;
  };

  it.each(["start", "solution"] as const)(
    "poziom ktora-galaz (%s): druga gałąź jest rysowana — cała na planszy, po drugiej stronie niż czynna",
    (ktory) => {
      const s = ktoraGalaz().pieces[0][ktory];
      if (s.kind !== "hiperbola") throw new Error("zły rodzaj");
      const druga = twinPolyline(s);
      expect(druga, "brak łamanej drugiej gałęzi").toBeDefined();
      const pts = druga ?? [];
      expect(pts.length).toBeGreaterThan(2);
      // |P f1| − |P f2| = 2a·branch na czynnej gałęzi; na drugiej ten sam moduł, znak przeciwny
      const roznica = (p: Vec2) => dist(p, s.f1) - dist(p, s.f2);
      for (const p of piecePolyline(shapeToPiece(s), 32)) expect(roznica(p)).toBeCloseTo(2 * s.a * s.branch, 9);
      for (const p of pts) {
        expect(roznica(p)).toBeCloseTo(-2 * s.a * s.branch, 9);
        expect(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1, `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}) poza planszą`).toBe(true);
      }
    },
  );

  it("druga gałąź jest rysowana tylko na poziomie ktora-galaz — na pozostałych hiperbolicznych (i wszystkich innych) nie", () => {
    const zDrugaGalezia = LEVELS.filter((l) =>
      [...l.pieces.flatMap((p) => [p.start, p.solution]), ...l.obstacles].some((s) => twinPolyline(s) !== undefined),
    ).map((l) => l.id);
    expect(zDrugaGalezia).toEqual(["ktora-galaz"]);
  });

  it("poziom ktora-galaz: flaga drugiej gałęzi przeżywa przeciąganie (applyDrag, każdy uchwyt)", () => {
    const piece = ktoraGalaz().pieces[0];
    const cel = piece.solution.kind === "hiperbola" ? piece.solution.f2 : vec(0.4, 0.6);
    for (const h of handlePositions(piece.start)) {
      const moved = applyDrag(piece.start, h.id, cel, lockedSize(piece));
      expect(moved.kind === "hiperbola" && moved.twin, `uchwyt ${h.id}`).toBe(true);
      expect(twinPolyline(moved), `uchwyt ${h.id}`).toBeDefined();
    }
  });

  it("poziom ktora-galaz: odbija tylko czynna gałąź — żadne odbicie rozwiązania nie leży na drugiej", () => {
    const l = ktoraGalaz();
    const s = l.pieces[0].solution;
    if (s.kind !== "hiperbola") throw new Error("zły rodzaj");
    const roznica = (p: Vec2) => dist(p, s.f1) - dist(p, s.f2);
    let naCzynnej = 0;
    for (const b of proofFor(l, [s]).balls) {
      for (const odbicie of b.path.slice(1, -1)) {
        if (Math.abs(roznica(odbicie) - 2 * s.a * s.branch) < 1e-6) naCzynnej++;
        expect(Math.abs(roznica(odbicie) + 2 * s.a * s.branch), `odbicie (${odbicie.x.toFixed(3)}, ${odbicie.y.toFixed(3)})`)
          .toBeGreaterThan(1e-6);
      }
    }
    // bez tego test przeszedłby pusto, gdyby hiperbola nie odbijała niczego
    expect(naCzynnej).toBeGreaterThan(0);
  });

  // Poziom 24 to dwie drogi do jednego dołka (para parabol oraz elipsa z hiperbolą).
  // Sama obecność trzech rodzajów krzywych nic nie znaczy — poprzednia wersja poziomu
  // miała parabolę-dekorację, której usunięcie niczego nie zmieniało. Dlatego test
  // odtwarza tor KAŻDEJ piłki rozwiązania i dla każdego odbicia ustala, od której
  // krzywej ono było (ta sama reguła co w `trace`: najbliższe trafienie wzdłuż odcinka).
  // Każdy element gracza i każda przeszkoda musi odbić co najmniej jedną piłkę, a ściany
  // żadnej — obie drogi mają działać na lustrach, nie na bandach.
  it("poziom zwienczenie-3: każda krzywa (elementy gracza i przeszkody) odbija co najmniej jedną piłkę rozwiązania", () => {
    const l = LEVELS.find((x) => x.id === "zwienczenie-3");
    if (l === undefined) throw new Error("brak poziomu zwienczenie-3");
    const rodzaje = new Set([...solutions(l).map((s) => s.kind), ...l.obstacles.map((o) => o.kind)]);
    expect(rodzaje).toContain("elipsa");
    expect(rodzaje).toContain("parabola");
    expect(rodzaje).toContain("hiperbola");

    // kolejność jak w `levelCurves`: elementy gracza, przeszkody, na końcu ściany
    const krzywe = levelCurves(l, solutions(l));
    const ileLuster = l.pieces.length + l.obstacles.length;
    const odbite = new Set<number>();
    for (const b of proofFor(l, solutions(l)).balls) {
      for (let i = 1; i < b.path.length - 1; i++) {
        const skad = b.path[i - 1];
        const kierunek = norm(sub(b.path[i], skad));
        let najblizej = Infinity;
        let ktora = -1;
        krzywe.forEach((c, j) => {
          const t = rayPiece(skad, kierunek, c);
          if (t !== null && t < najblizej) { najblizej = t; ktora = j; }
        });
        odbite.add(ktora);
      }
    }
    for (let j = 0; j < ileLuster; j++) expect(odbite.has(j), `krzywa ${j} nie odbija żadnej piłki`).toBe(true);
    expect([...odbite].filter((j) => j < 0 || j >= ileLuster), "odbicia od ścian").toEqual([]);
  });

  // Szara strefa: niezmiennik §8 etapu 1 mówi, że promień przyskakiwania nie jest mniejszy
  // od pasa, w którym niedokładne ustawienie jeszcze wygrywa. Test 5% próbkuje tylko 8
  // kierunków DOKŁADNIE na SNAP_RADIUS i przepuścił przy standardowym dołku wygrane daleko
  // poza zasięgiem przyskakiwania: na poziomie 24 plamę do ok. 0.19 od piłki i pasek ok. 0.23
  // od niej, na poziomach 21–23 wygrane aż po 0.6 od M (i dalej). Tu próbkujemy cały
  // pierścień SNAP_RADIUS … 0.6 wokół celu każdego wolnego ogniska — żadne położenie spoza
  // zasięgu przyskakiwania nie może wygrać.
  //
  // Położenie przeliczamy przez `applyDrag`, dokładnie jak gra (z `lockedA`, gdy rozmiar jest
  // zablokowany), a nie przez samo podstawienie ogniska. Różnica jest istotna na poziomie 21:
  // podstawienie zostawia `a` bez zmian, więc daleko od M elipsa albo się nie konstruuje
  // (test milczałby), albo przy c tuż pod a robi się dowolnie cienka — kształty, których
  // gracz nie umie ustawić. Gra zamiast tego podnosi `a` do c + MIN_GAP i to tę „igłę"
  // trzeba sprawdzić (patrz `t21_23` w `src/levels/stage3.ts`).
  //
  // Tylko te cztery poziomy — decyzja właściciela: tu każdy wolny uchwyt jest ogniskiem,
  // które przyskakuje dokładnie, więc naprawiono je mniejszym dołkiem bez kosztu dla gracza.
  // Szare strefy pozostałych poziomów (18 i 20 z wierzchołkiem ciągniętym palcem, wydane
  // 1–16) to osobne, odłożone zadanie; ten test ich celowo nie obejmuje.
  //
  // Druga liczba to liczba wolnych ognisk poziomu — test sprawdza, że przejrzał je wszystkie
  // (21: oba ogniska elipsy, 22–23: M, 24: ognisko paraboli A i dalsze ognisko hiperboli).
  const BEZ_SZAREJ_STREFY: [string, number][] = [
    ["druga-strona", 1], ["wspolne-ognisko", 2], ["ktora-galaz", 1], ["zwienczenie-3", 2],
  ];

  /** Położenia wolnych ognisk poziomu w pierścieniu SNAP_RADIUS … rMax, które wygrywają. */
  const szaraStrefa = (level: Level, kierunki: number, promienie: number, rMax: number) => {
    const wygrane: string[] = [];
    let sprawdzone = 0;
    level.pieces.forEach((piece, k) => {
      const sol = piece.solution;
      const lockedA = lockedSize(piece);
      // każde wolne ognisko elementu razem z jego celem
      const wolne: { uchwyt: Handle; cel: Vec2 }[] = sol.kind === "odcinek" ? []
        : sol.kind === "parabola" ? [{ uchwyt: "ognisko", cel: sol.focus }]
        : [{ uchwyt: "ognisko1", cel: sol.f1 }, { uchwyt: "ognisko2", cel: sol.f2 }];
      for (const { uchwyt, cel } of wolne) {
        if (piece.locked.includes(uchwyt)) continue;
        for (let i = 0; i < kierunki; i++) {
          for (let j = 0; j < promienie; j++) {
            const r = SNAP_RADIUS + ((rMax - SNAP_RADIUS) * (j + 0.5)) / promienie;
            const f = add(cel, scale(fromAngle((2 * Math.PI * i) / kierunki), r));
            const moved = solutions(level).map((s, q) => (q === k ? applyDrag(sol, uchwyt, f, lockedA) : s));
            sprawdzone++;
            if (solves(level, moved)) {
              wygrane.push(`element ${k} ${uchwyt}: (${f.x.toFixed(3)}, ${f.y.toFixed(3)}) r = ${r.toFixed(3)}`);
            }
          }
        }
      }
    });
    return { wygrane, sprawdzone };
  };

  it.each(BEZ_SZAREJ_STREFY)("poziom %s: żadne wolne ognisko ustawione poza promieniem przyskakiwania nie wygrywa", (id, ileWolnych) => {
    const l = LEVELS.find((x) => x.id === id);
    if (l === undefined) throw new Error(`brak poziomu ${id}`);
    // 240 × 64: przy brzegu pierścienia próbki co ok. 0.016 wzdłuż okręgu i co ok. 0.007
    // w promieniu. Gęstszy przegląd kosztuje sekundy CI na każdy poziom, a łapie tylko
    // wąskie wyspy; zapas dołka dobierano osobnym, gęstym pomiarem (patrz `t21_23`, `t24`).
    const KIERUNKI = 240;
    const PROMIENIE = 64;
    const { wygrane, sprawdzone } = szaraStrefa(l, KIERUNKI, PROMIENIE, 0.6);
    expect(wygrane, "wygrane poza zasięgiem przyskakiwania").toEqual([]);
    expect(sprawdzone).toBe(ileWolnych * KIERUNKI * PROMIENIE);
  }, 30_000);

  // Zadanie 15c. Zadanie 15b znalazło na poziomie 21 DOKŁADNE rozwiązanie z drugim
  // ogniskiem elipsy poza planszą: piłka → M → hiperbola-przeszkoda → GÓRNA ŚCIANA →
  // dołek, gdzie M siedzi w zwierciadlanym odbiciu dołka względem ściany y = 1
  // (dołek (−0.2, 0.3) → M = (−0.2, 1.7)). Żaden dołek go nie usuwa (raport 15b),
  // bo trafia idealnie — jedynym lekiem jest uczynić tę pozycję nieosiągalną palcem.
  // Ten test odtwarza obejście DOKŁADNIE tak, jak zrobiłby to gracz: `ognisko1` do
  // piłki (przyskok), `ognisko2` do M poza planszą — oba przez `applyDrag`, z tym
  // samym `lockedA`, co w grze (poziom ma zablokowany rozmiar).
  it("poziom wspolne-ognisko: obejście z ogniskiem poza planszą (−0.2, 1.7) jest NIEOSIĄGALNE przez applyDrag", () => {
    const level = LEVELS.find((l) => l.id === "wspolne-ognisko");
    if (level === undefined) throw new Error("brak poziomu wspolne-ognisko");
    const piece = level.pieces[0];
    const start = piece.start;
    if (start.kind !== "elipsa") throw new Error("poziom wspolne-ognisko ma mieć elipsę");
    const lockedA = lockedSize(piece);
    let bypass: MovableShape = applyDrag(start, "ognisko1", level.ball, lockedA);
    bypass = applyDrag(bypass, "ognisko2", vec(-0.2, 1.7), lockedA);
    expect(solves(level, [bypass])).toBe(false);
  });

  it("poziom wspologniskowe: każdy rozmiar powyżej pasma przegrywa (duża elipsa nie omija okręgu)", () => {
    const level = LEVELS.find((l) => l.id === "wspologniskowe")!;
    const base = level.pieces[0].solution;
    for (let i = 0; i <= 119; i++) {
      const a = 0.62 + 0.02 * i;    // 0.62 … 3.0
      const resized = { ...base, a };
      expect(solves(level, [resized]), `a = ${a.toFixed(2)}`).toBe(false);
    }
  });
});
