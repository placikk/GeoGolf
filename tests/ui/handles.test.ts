import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import { EllipseShape, Level, LEVELS, MIN_ARC, SNAP_RADIUS, circle, ellipse, ellipseParam, segment, shapeConic } from "../../src/levels";
import { applyDrag, handlePositions, moveArcEnd, pickHandle, snapTargets, snapTo } from "../../src/ui/handles";
import { ellipseFromFoci, evalConic } from "../../src/core/conic";

const state: EllipseShape = ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8);

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

describe("uchwyty łuku", () => {
  it("końce łuku są uchwytami tylko wtedy, gdy łuk istnieje; rozmiar siedzi w środku łuku", () => {
    expect(handlePositions(state).map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
    const arc = ellipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, { start: 1, end: 3 });
    const hs = handlePositions(arc);
    expect(hs.map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar", "poczatek", "koniec"]);
    expect(ellipseParam(arc, hs[2].pos)).toBeCloseTo(2, 12);
    expect(ellipseParam(arc, hs[3].pos)).toBeCloseTo(1, 12);
    expect(ellipseParam(arc, hs[4].pos)).toBeCloseTo(3, 12);
  });

  it("uchwyt końca łuku po przeciągnięciu leży na krzywej, pod kątem palca", () => {
    const arc = ellipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, { start: 1, end: 3 });
    const finger = vec(-0.2, 0.9);   // poza krzywą
    const next = applyDrag(arc, "koniec", finger);
    const end = handlePositions(next).find((h) => h.id === "koniec")!.pos;
    expect(evalConic(shapeConic(next), end)).toBeCloseTo(0, 12);
    expect(next.arc!.end).toBeCloseTo(ellipseParam(arc, finger), 12);
    expect(next.f1).toBe(arc.f1);
    expect(next.arc!.start).toBe(1);
  });

  it("minimalna długość łuku: dokładnie na granicy przechodzi, dalej jest zaciskana", () => {
    // start 0 i koniec 1: wrap(t − 0) = t, więc granica początku liczy się bez zaokrągleń
    const arc = { start: 0, end: 1 };
    expect(moveArcEnd(arc, "poczatek", 1 - MIN_ARC).start).toBe(1 - MIN_ARC);
    expect(moveArcEnd(arc, "poczatek", 1 - MIN_ARC / 2).start).toBe(1 - MIN_ARC);
    // dla końca 1 + (t − 1) nie jest dokładne w liczbach zmiennoprzecinkowych — tu tolerancja
    expect(moveArcEnd(arc, "koniec", MIN_ARC).end).toBeCloseTo(MIN_ARC, 15);
    expect(moveArcEnd(arc, "koniec", MIN_ARC / 2).end).toBe(MIN_ARC);
  });

  it("końce nie mogą się minąć: początek przeciągnięty za koniec zatrzymuje się przed nim", () => {
    const arc = { start: 0, end: 1 };
    const moved = moveArcEnd(arc, "poczatek", 1.5);
    expect(moved.end - moved.start).toBeGreaterThanOrEqual(MIN_ARC);
    expect(moved.start).toBeLessThan(moved.end);
    // w drugą stronę łuk nie może urosnąć ponad 2π − MIN_ARC
    const grown = moveArcEnd(arc, "koniec", -0.01);
    expect(grown.end - grown.start).toBeLessThanOrEqual(2 * Math.PI - MIN_ARC + 1e-12);
  });

  it("maksymalna długość łuku: 2π − MIN_ARC, sprawdzona na długim łuku", () => {
    // Na długim łuku {start: 0, end: 5.5} możemy faktycznie dosięgnąć górnej granicy zacisku.
    // koniec przesunięty do 8.5: wrap(8.5 - 5.5) = wrap(3) = 3, więc 5.5 + 3 = 8.5,
    // a to > 2π − MIN_ARC, więc zostaje zaciśnięte.
    const longArc = { start: 0, end: 5.5 };
    const maxEnd = moveArcEnd(longArc, "koniec", 8.5);
    expect(maxEnd.end).toBe(2 * Math.PI - MIN_ARC);
    expect(maxEnd.start).toBe(0);
    expect(maxEnd.end - maxEnd.start).toBeCloseTo(2 * Math.PI - MIN_ARC, 12);

    // początek przesunięty do -3: wrap(-3 - 0) = -3 < 5.5 - 2π + MIN_ARC,
    // więc zostaje zaciśnięty na dolną granicę względem końca
    const maxStart = moveArcEnd(longArc, "poczatek", -3);
    expect(maxStart.start).toBeCloseTo(5.5 - 2 * Math.PI + MIN_ARC, 15);
    expect(maxStart.end).toBe(5.5);
    expect(maxStart.end - maxStart.start).toBeCloseTo(2 * Math.PI - MIN_ARC, 12);

    // Punkt tuż poniżej granicy nie będzie zaciśnięty
    const justBelow = moveArcEnd(longArc, "koniec", 5.9);
    expect(justBelow.end).toBeCloseTo(5.9, 15);
    expect(justBelow.start).toBe(0);
  });

  it("przeciągnięcie końca łuku bez łuku nic nie zmienia", () => {
    expect(applyDrag(state, "koniec", vec(0, 1))).toBe(state);
  });
});

describe("przyskakiwanie etapu 2", () => {
  const fixed = ellipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, { start: -3, end: -0.7 });
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
    const m = kaskada.pieces[0].solution.f2;
    const targets = snapTargets(kaskada, kaskada.pieces.map((p) => p.start), 0);
    expect(snapTo(vec(m.x + 0.05, m.y - 0.05), targets, SNAP_RADIUS)).toEqual(m);
  });

  describe("zablokowany rozmiar stoi", () => {
    // ognisko2 poza zerem i niesymetrycznie: zasięg liczony od złego ogniska by się ujawnił
    const locked = ellipse(vec(-0.1, 0.2), vec(0.3, 0.2), 0.5);

    it("ognisko przeciągnięte daleko zatrzymuje się na 2a − 2·MIN_GAP od drugiego, a się nie zmienia", () => {
      const next = applyDrag(locked, "ognisko1", vec(-3, 0.2), true);
      expect(next.a).toBe(0.5);
      expect(dist(next.f1, next.f2)).toBeCloseTo(2 * 0.5 - 2e-3, 12);
      expect(next.f1.y).toBeCloseTo(0.2, 12);                 // na prostej od f2 w stronę palca
      expect(next.f1.x).toBeLessThan(next.f2.x);
      expect(next.f2).toBe(locked.f2);
    });

    it("ognisko2 też: kierunek od ogniska1 w stronę palca", () => {
      const next = applyDrag(locked, "ognisko2", vec(0.3, 5), true);
      expect(next.a).toBe(0.5);
      expect(dist(next.f1, next.f2)).toBeCloseTo(1 - 2e-3, 12);
      const dir = { x: next.f2.x - locked.f1.x, y: next.f2.y - locked.f1.y };
      const want = { x: 0.3 - locked.f1.x, y: 5 - locked.f1.y };
      expect(dir.x * want.y - dir.y * want.x).toBeCloseTo(0, 12);   // współliniowe
    });

    it("w zasięgu ognisko idzie dokładnie pod palec", () => {
      const finger = vec(-0.5, 0.25);
      expect(applyDrag(locked, "ognisko1", finger, true).f1).toBe(finger);
    });

    it("odblokowany rozmiar: jak dotąd, a rośnie razem z ogniskami", () => {
      const next = applyDrag(locked, "ognisko1", vec(-3, 0.2), false);
      expect(next.f1).toEqual(vec(-3, 0.2));
      expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
    });

    it("rozsunięcie i zsunięcie ognisk przy blokadzie nie zostawia większej elipsy", () => {
      let s = applyDrag(locked, "ognisko1", vec(-3, 0.2), true);
      s = applyDrag(s, "ognisko1", locked.f1, true);
      expect(s.a).toBe(0.5);
    });

    it("granica zasięgu: palec dokładnie na 2a − 2·MIN_GAP zostaje pod palcem, o włos dalej jest zaciśnięty", () => {
      // reach = 2·0.5 − 2·MIN_GAP = 0.998 wzdłuż osi X od f2 (0.3, 0.2). edge liczony
      // TYM SAMYM odejmowaniem, którego wynik porównuje `dist` w handles.ts — sprawdzone
      // w node: dist(edge, f2) wychodzi DOKŁADNIE 0.998, bez błędu zaokrąglenia (0.3 i 1
      // mają dokładną reprezentację binarną na tyle bliską, że odejmowanie i późniejszy
      // hypot się nie rozjeżdżają), więc nie trzeba szukać osobnej reprezentowalnej liczby.
      const edge = vec(0.3 - (1 - 2e-3), 0.2);
      expect(dist(edge, locked.f2)).toBeLessThanOrEqual(1 - 2e-3);
      const onEdge = applyDrag(locked, "ognisko1", edge, true);
      expect(onEdge.f1).toEqual(edge);

      const beyond = vec(edge.x - 1e-6, 0.2);
      const clamped = applyDrag(locked, "ognisko1", beyond, true);
      expect(dist(clamped.f1, clamped.f2)).toBeCloseTo(1 - 2e-3, 12);
      expect(clamped.f1).not.toEqual(beyond);
    });
  });
});
