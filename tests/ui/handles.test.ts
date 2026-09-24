import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import {
  EllipseShape, Level, LEVELS, MIN_ARC_LENGTH, MovableShape, SNAP_RADIUS, arcEllipse, arcLengthBetween, arcParams,
  circle, ellipse, ellipseParam, ellipsePoint, hyperbola, paramAtLength, parabola, perimeter, segment, shapeAxisAngle,
  shapeConic,
} from "../../src/levels";
import { applyDrag, handlePositions, moveArcEnd, pickHandle, snapTargets, snapTo } from "../../src/ui/handles";
import { ellipseFromFoci, evalConic } from "../../src/core/conic";

const state: EllipseShape = ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8);
// wyniesione nad oba bloki: `par` z testów paraboli jest potrzebny też w ostatnim
// teście hiperboli (przyskakiwanie widzi ogniska obu krzywych naraz)
const par = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });

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
    expect(pickHandle(vec(0.8, 0), [state], [[]], 0.1)).toEqual({ piece: 0, id: "rozmiar" });
    expect(pickHandle(vec(0.8, 0), [state], [["rozmiar"]], 0.1)).toBeNull();
  });

  it("przeciągnięcie ogniska zachowuje elipsę mimo małego a", () => {
    const next = applyDrag(ellipse(vec(-0.1, 0), vec(0.1, 0), 0.15), "ognisko1", vec(-0.9, 0));
    expect(next.f1.x).toBeCloseTo(-0.9, 9);
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
  });

  it("przeciągnięcie rozmiaru ustawia a jako połowę sumy odległości", () => {
    const next = applyDrag(state, "rozmiar", vec(0, 0.6));
    const expected = (dist(vec(0, 0.6), state.f1) + dist(vec(0, 0.6), state.f2)) / 2;
    expect(next.a).toBeCloseTo(expected, 9);
    expect(next.f1).toEqual(state.f1);
  });

  it("uchwyt rozmiaru przeciągnięty między ogniska nie tworzy niemożliwej elipsy", () => {
    // punkt DOKŁADNIE na odcinku między ogniskami: (d1 + d2) / 2 === c, więc bez zacisku
    // wyszłoby a === c i `ellipseFromFoci` rzuciłoby pod palcem gracza
    const next = applyDrag(state, "rozmiar", vec(0, 0));
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
    expect(() => ellipseFromFoci(next.f1, next.f2, next.a)).not.toThrow();
  });

  it("przyskakiwanie łapie punkt dokładnie na granicy promienia", () => {
    // Wartości dobrane tak, żeby odległość wyszła DOKŁADNIE równa promieniowi.
    // Nie wolno tu pisać `0.5 + SNAP_RADIUS`: dodanie 0.5 przesuwa liczbę w grubszy
    // zakres wykładnika, zaokrąglenie idzie w górę i po odjęciu wychodzi wartość
    // większa od SNAP_RADIUS o ~2.8e-17 — punkt naprawdę leży poza promieniem,
    // a test sprawdzałby coś innego, niż zamierzał. 0.25 jest potęgą dwójki,
    // więc reprezentowane bez błędu.
    const origin = vec(0, 0);
    expect(snapTo(vec(0.25, 0), [origin], 0.25)).toEqual(origin);
    const justOutside = vec(0.26, 0);
    expect(snapTo(justOutside, [origin], 0.25)).toEqual(justOutside);
  });

  it("gdy dwa uchwyty są w zasięgu, wygrywa bliższy", () => {
    // ognisko2 w (0.5,0), uchwyt rozmiaru w (0.8,0); promień 0.4 obejmuje oba naraz
    expect(pickHandle(vec(0.55, 0), [state], [[]], 0.4)?.id).toBe("ognisko2");
    expect(pickHandle(vec(0.75, 0), [state], [[]], 0.4)?.id).toBe("rozmiar");
  });

  it("nietknięte ognisko zachowuje TOŻSAMOŚĆ obiektu, nie tylko wartość", () => {
    const next = applyDrag(state, "ognisko1", vec(-0.9, 0));
    expect(next.f2).toBe(state.f2);
  });

  it("środek liczy się jako średnia ognisk, nie ich suma", () => {
    // fixture symetryczny wokół zera maskuje zgubione dzielenie przez 2 — ten nie maskuje
    const asym = ellipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6);
    const hs = handlePositions(asym);
    expect(dist(hs[2].pos, vec(0.3, 0.4))).toBeCloseTo(asym.a, 12);
  });
});

describe("uchwyty wielu elementów", () => {
  const other = ellipse(vec(0.1, 0.5), vec(0.7, 0.3), 0.5);

  it("przy dwóch elementach wygrywa bliższy uchwyt, z właściwym numerem elementu", () => {
    // ognisko2 elementu 0 w (0.5, 0), ognisko1 elementu 1 w (0.1, 0.5); promień obejmuje oba
    expect(pickHandle(vec(0.45, 0.05), [state, other], [[], []], 0.6)).toEqual({ piece: 0, id: "ognisko2" });
    expect(pickHandle(vec(0.15, 0.45), [state, other], [[], []], 0.6)).toEqual({ piece: 1, id: "ognisko1" });
  });

  it("blokady są per element: ten sam uchwyt zablokowany w jednym, wolny w drugim", () => {
    // w promieniu 0.2 od (0.15, 0.45) jest tylko ognisko1 elementu 1
    expect(pickHandle(vec(0.15, 0.45), [state, other], [[], ["ognisko1"]], 0.2)).toBeNull();
    expect(pickHandle(vec(0.15, 0.45), [state, other], [["ognisko1"], []], 0.2)).toEqual({ piece: 1, id: "ognisko1" });
  });
});

describe("uchwyty łuku (łuk opisany długością)", () => {
  // elipsa niesymetryczna wokół zera; łuk „od 1 do 3” w parametrze, zapisany długością
  const shape = arcEllipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, 1, 3);
  const ends = (s: EllipseShape) => arcParams(s, s.arc!);
  const lengthOf = (s: EllipseShape) => { const e = ends(s); return arcLengthBetween(s, e.start, e.end); };

  it("końce łuku są uchwytami tylko wtedy, gdy łuk istnieje; rozmiar siedzi w środku łuku", () => {
    expect(handlePositions(state).map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
    const hs = handlePositions(shape);
    expect(hs.map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar", "poczatek", "koniec"]);
    expect(ellipseParam(shape, hs[2].pos)).toBeCloseTo(shape.arc.mid, 9);
    expect(ellipseParam(shape, hs[3].pos)).toBeCloseTo(1, 9);
    expect(ellipseParam(shape, hs[4].pos)).toBeCloseTo(3, 9);
  });

  it("uchwyt końca łuku po przeciągnięciu leży na krzywej pod kątem palca, a drugi koniec stoi", () => {
    const finger = vec(-0.2, 0.9);   // poza krzywą
    const next = applyDrag(shape, "koniec", finger);
    const end = handlePositions(next).find((h) => h.id === "koniec")!.pos;
    expect(evalConic(shapeConic(next), end)).toBeCloseTo(0, 12);
    expect(dist(end, ellipsePoint(shape, ellipseParam(shape, finger)))).toBeLessThan(1e-9);
    expect(ends(next).start).toBeCloseTo(1, 9);
    expect(next.f1).toBe(shape.f1);
  });

  it("minimalna długość łuku: dokładnie na granicy przechodzi, dalej jest zaciskana", () => {
    // koniec dokładnie MIN_ARC_LENGTH za początkiem: zostaje pod palcem
    const edge = paramAtLength(shape, 1, MIN_ARC_LENGTH);
    const atEdge = { ...shape, arc: moveArcEnd(shape, "koniec", edge) };
    expect(lengthOf(atEdge)).toBeCloseTo(MIN_ARC_LENGTH, 9);
    expect(ends(atEdge).end).toBeCloseTo(edge, 9);
    // koniec jeszcze bliżej początku: zaciśnięty do MIN_ARC_LENGTH, początek stoi
    const closer = { ...shape, arc: moveArcEnd(shape, "koniec", paramAtLength(shape, 1, MIN_ARC_LENGTH / 2)) };
    expect(lengthOf(closer)).toBeCloseTo(MIN_ARC_LENGTH, 9);
    expect(ends(closer).start).toBeCloseTo(1, 9);
  });

  it("końce nie mogą się minąć: początek przeciągnięty za koniec zatrzymuje się przed nim", () => {
    const moved = { ...shape, arc: moveArcEnd(shape, "poczatek", 3.5) };
    expect(lengthOf(moved)).toBeCloseTo(MIN_ARC_LENGTH, 9);
    expect(ends(moved).end).toBeCloseTo(3, 9);
    expect(ends(moved).start).toBeLessThan(ends(moved).end);
  });

  it("maksymalna długość łuku: obwód − MIN_ARC_LENGTH, sprawdzona na długim łuku", () => {
    // na łuku od 0 do 5.5 koniec przeciągnięty do 8.5 (wrap(3) = 3) przekracza granicę
    const long = arcEllipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, 0, 5.5);
    const max = { ...long, arc: moveArcEnd(long, "koniec", 8.5) };
    expect(lengthOf(max)).toBeCloseTo(perimeter(long) - MIN_ARC_LENGTH, 9);
    expect(ends(max).start).toBeCloseTo(0, 9);
    const maxStart = { ...long, arc: moveArcEnd(long, "poczatek", -3) };
    expect(lengthOf(maxStart)).toBeCloseTo(perimeter(long) - MIN_ARC_LENGTH, 9);
    expect(ends(maxStart).end).toBeCloseTo(5.5, 9);
    // tuż poniżej granicy: bez zacisku, koniec pod palcem
    const below = { ...long, arc: moveArcEnd(long, "koniec", 5.9) };
    expect(ends(below).end).toBeCloseTo(5.9, 9);
  });

  it("łuk zachowuje długość, gdy elipsa rośnie, i obejmuje wtedy mniejszy zakres parametru", () => {
    const bigger = applyDrag(shape, "rozmiar", vec(2, 2));
    expect(bigger.a).toBeGreaterThan(2 * shape.a);
    expect(bigger.arc).toBe(shape.arc);
    expect(lengthOf(bigger)).toBeCloseTo(shape.arc.length, 9);
    expect(ends(bigger).end - ends(bigger).start).toBeLessThan(ends(shape).end - ends(shape).start);
  });

  it("przeciągnięcie końca łuku bez łuku nic nie zmienia", () => {
    expect(applyDrag(state, "koniec", vec(0, 1))).toBe(state);
  });

  it("ognisk nic nie ogranicza: przy dalekim przeciągnięciu rozmiar rośnie, ognisko jest pod palcem", () => {
    const far = vec(-3, 0.2);
    const next = applyDrag(shape, "ognisko1", far);
    expect(next.f1).toBe(far);
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
    expect(next.arc).toBe(shape.arc);
  });

  it("z zablokowanym rozmiarem (lockedA) powiększone a wraca do wartości poziomu, gdy ognisko wróci na miejsce", () => {
    const lockedA = shape.a;
    const far = vec(-3, 0.2);
    const away = applyDrag(shape, "ognisko1", far, lockedA);
    expect(away.a).toBeGreaterThan(shape.a);
    const back = applyDrag(away, "ognisko1", shape.f1, lockedA);
    expect(back.a).toBe(shape.a);
    // bez blokady ten sam powrót zostawia rozmiar powiększony — gracz utknąłby
    const backNoLock = applyDrag(away, "ognisko1", shape.f1);
    expect(backNoLock.a).toBeGreaterThan(shape.a);
  });
});

describe("przyskakiwanie etapu 2", () => {
  const fixed = arcEllipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, -3, -0.7);
  const round = circle(vec(0.3, -0.6), 0.1);
  const level: Level = {
    id: "t", title: "t", hint: "t", ball: vec(-0.6, 0.1), hole: vec(0.5, 0.1),
    pieces: [], obstacles: [fixed, round, segment(vec(-1, -0.9), vec(1, -0.9))],
    test: { balls: 8, maxBounces: 4, holeRadius: 0.05 },
  };
  const mine = ellipse(vec(-0.6, 0.1), vec(-0.2, 0.3), 0.4);
  const second = ellipse(vec(0.2, -0.3), vec(0.6, -0.2), 0.4);

  it("cele: piłka, dołek, ogniska stałych elips i ogniska POZOSTAŁYCH elementów gracza", () => {
    const targets = snapTargets(level, [mine, second], 0);
    expect(targets).toContain(level.ball);
    expect(targets).toContain(level.hole);
    expect(targets).toContain(fixed.f1);
    expect(targets).toContain(fixed.f2);
    expect(targets).toContain(second.f1);
    expect(targets).toContain(second.f2);
    expect(targets).not.toContain(mine.f2);       // własne ognisko nie jest celem
    expect(targets).not.toContain(round.f1);      // środek okręgu nie jest celem
  });

  it("ognisko przyskakuje do ogniska przeszkody i do ogniska drugiego elementu gracza", () => {
    const near = vec(fixed.f1.x + SNAP_RADIUS / 2, fixed.f1.y);
    expect(snapTo(near, snapTargets(level, [mine, second], 0), SNAP_RADIUS)).toBe(fixed.f1);
    const nearSecond = vec(second.f1.x, second.f1.y + SNAP_RADIUS / 2);
    expect(snapTo(nearSecond, snapTargets(level, [mine, second], 0), SNAP_RADIUS)).toBe(second.f1);
  });

  it("poziom kaskady: ognisko pierwszego łuku daje się postawić w M samym przyskokiem", () => {
    const kaskada = LEVELS.find((l) => l.id === "kaskada")!;
    // poziom kaskady ma same elipsy — `asEllipse` zawęża typ, nie zmienia zachowania
    const asEllipse = (s: MovableShape): EllipseShape => {
      if (s.kind !== "elipsa") throw new Error("poziom kaskady ma mieć same elipsy");
      return s;
    };
    const m = asEllipse(kaskada.pieces[0].solution).f2;
    const targets = snapTargets(kaskada, kaskada.pieces.map((p) => asEllipse(p.start)), 0);
    expect(snapTo(vec(m.x + 0.05, m.y - 0.05), targets, SNAP_RADIUS)).toEqual(m);
  });
});

describe("uchwyty paraboli", () => {
  it("ma dokładnie dwa uchwyty: ognisko i wierzchołek", () => {
    expect(handlePositions(par).map((h) => h.id).sort()).toEqual(["ognisko", "wierzcholek"]);
  });

  it("przeciągnięcie ogniska przenosi ognisko", () => {
    const next = applyDrag(par, "ognisko", vec(-0.4, 0.2));
    expect(next.kind).toBe("parabola");
    if (next.kind === "parabola") expect(next.focus).toEqual(vec(-0.4, 0.2));
  });

  it("ognisko nie może usiąść na wierzchołku — parabola musi istnieć", () => {
    const next = applyDrag(par, "ognisko", par.vertex);
    if (next.kind !== "parabola") throw new Error("zły rodzaj");
    expect(dist(next.focus, next.vertex)).toBeGreaterThan(0);
    expect(() => shapeConic(next)).not.toThrow();
  });

  it("przeciągnięcie wierzchołka zmienia i oś, i rozmiar", () => {
    const next = applyDrag(par, "wierzcholek", vec(-0.5, -0.4));
    if (next.kind !== "parabola") throw new Error("zły rodzaj");
    expect(next.vertex).toEqual(vec(-0.5, -0.4));
    expect(shapeAxisAngle(next)).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("uchwyty hiperboli", () => {
  const hyp = hyperbola(vec(-0.5, 0), vec(0.5, 0), 0.3, 1, { mid: 0, span: 2 });

  it("ma ten sam komplet uchwytów co elipsa", () => {
    expect(handlePositions(hyp).map((h) => h.id).sort()).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
  });

  it("uchwyt rozmiaru siedzi w wierzchołku CZYNNEJ gałęzi", () => {
    const poz = (s: typeof hyp) => handlePositions(s).find((h) => h.id === "rozmiar")!.pos;
    expect(poz(hyp).x).toBeCloseTo(0.3, 9);
    expect(poz({ ...hyp, branch: -1 }).x).toBeCloseTo(-0.3, 9);
  });

  it("NIEZMIENNIK: a zostaje w (0, c) po przeciągnięciu rozmiaru gdziekolwiek", () => {
    for (const cel of [vec(5, 0), vec(-5, 0), vec(0, 0), vec(0.5, 0), vec(0.499, 0)]) {
      const next = applyDrag(hyp, "rozmiar", cel);
      if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
      expect(next.a).toBeGreaterThan(0);
      expect(next.a).toBeLessThan(dist(next.f1, next.f2) / 2);
      expect(() => shapeConic(next)).not.toThrow();
    }
  });

  it("NIEZMIENNIK: a zostaje w (0, c) po przeciągnięciu ogniska na drugie", () => {
    const next = applyDrag(hyp, "ognisko1", vec(0.5, 0));
    if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(() => shapeConic(next)).not.toThrow();
  });

  it("NIEZMIENNIK: rozmiar nie przeskakuje między gałęziami", () => {
    // palec po przeciwnej stronie środka niż czynna gałąź
    const next = applyDrag(hyp, "rozmiar", vec(-0.4, 0.1));
    if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(next.branch).toBe(1);
  });

  it("przyskakiwanie widzi ogniska nowych krzywych", () => {
    const lvl = { ball: vec(0, 0), hole: vec(1, 1), obstacles: [] } as unknown as Level;
    expect(snapTargets(lvl, [hyp, par], 0)).toContainEqual(vec(-0.5, 0));
  });

  it("NIEZMIENNIK: a zostaje w (0, c) nawet gdy c ciasne z danych poziomu, nie z przeciągnięcia ogniska", () => {
    // c = 0.0005, poniżej dawnego stałego sufitu MIN_GAP*2 = 0.002 — `rozmiar` nigdy
    // nie dotyka ognisk (więc `keepApart` go nie chroni), a mimo to sufit musi być
    // ściśle mniejszy od tego ciasnego c
    const tight = hyperbola(vec(-0.0005, 0), vec(0.0005, 0), 0.0002, 1, { mid: 0, span: 2 });
    const next = applyDrag(tight, "rozmiar", vec(5, 0));
    if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
    const c = dist(next.f1, next.f2) / 2;
    expect(next.a).toBeGreaterThan(0);
    expect(next.a).toBeLessThan(c);
    expect(() => shapeConic(next)).not.toThrow();
  });

  // Ta sama pułapka co dla elipsy (patrz test wyżej w "uchwyty"): poziom blokuje uchwyt
  // rozmiaru i liczy na to, że `a` wraca do wartości poziomu, gdy ogniska znów się zejdą.
  // Bez `lockedA` w `dragHyperbola` zacisk `0 < a < c` obniża `a`, gdy ogniska są blisko,
  // ale nic go potem nie podnosi — gracz utyka na poziomie, którego nie da się wygrać.
  it("z zablokowanym rozmiarem (lockedA) a wraca do wartości poziomu, gdy ognisko wróci na miejsce", () => {
    const lockedA = hyp.a;
    const near = vec(-0.49, 0); // blisko ognisko1 — c się zaciska do 0.005, a razem z nim
    const away = applyDrag(hyp, "ognisko2", near, lockedA);
    if (away.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(away.a).toBeLessThan(hyp.a);
    const back = applyDrag(away, "ognisko2", hyp.f2, lockedA);
    if (back.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(back.a).toBe(hyp.a);
    // bez blokady a zostaje przycięte i NIE wraca samo — gracz ma wolny uchwyt rozmiaru
    // i sam je poprawi, tak jak dla elipsy (patrz komentarz w `applyDrag`)
    const backNoLock = applyDrag(away, "ognisko2", hyp.f2);
    if (backNoLock.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(backNoLock.a).toBeLessThan(hyp.a);
  });
});
