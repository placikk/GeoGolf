import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import { EllipseShape, SNAP_RADIUS, ellipse } from "../../src/levels";
import { applyDrag, handlePositions, pickHandle, snapTo } from "../../src/ui/handles";
import { ellipseFromFoci } from "../../src/core/conic";

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
