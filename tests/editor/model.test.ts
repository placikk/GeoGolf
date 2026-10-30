import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipse } from "../../src/levels";
import { MAX_OBSTACLES, MAX_PIECES, decodeLevel, roundShared } from "../../src/share/codec";
import { openCode } from "../../src/share/verify";
import {
  EditorState, acceptWin, addObstacle, addPiece, canToggleArc, cycleShot, draftCode, fromShared, newEditor, prepareTest, removeSelected,
  toShared, toggleArc, toggleLock,
} from "../../src/editor/model";
import { SAMPLES } from "../share/samples";

const e0 = newEditor("Mój poziom");

describe("edytor — operacje", () => {
  it("nowy poziom: piłka i dołek na osi, bez elementów, strzał 360°", () => {
    expect(e0).toMatchObject({ ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" }, pieces: [], obstacles: [] });
  });

  it("dodawanie zaznacza nowy element; limit 3 elementów i 8 przeszkód", () => {
    let s = e0;
    for (const k of ["elipsa", "parabola", "hiperbola", "odcinek"] as const) s = addPiece(s, k);
    expect(s.pieces.map((p) => p.shape.kind)).toEqual(["elipsa", "parabola", "hiperbola"]);
    expect(s.pieces).toHaveLength(MAX_PIECES);
    expect(s.selected).toEqual({ kind: "element", index: 2 });
    let o = e0;
    for (let i = 0; i < MAX_OBSTACLES + 2; i++) o = addObstacle(o, i % 2 === 0 ? "okrag" : "banda");
    expect(o.obstacles).toHaveLength(MAX_OBSTACLES);
  });

  it("każdy domyślny kształt da się zapisać jako szkic", () => {
    let s = e0;
    for (const k of ["elipsa", "parabola", "odcinek"] as const) s = addPiece(s, k);
    for (const k of ["okrag", "banda", "elipsa", "parabola", "hiperbola"] as const) s = addObstacle(s, k);
    expect(decodeLevel(draftCode(s), { draft: true }).ok).toBe(true);
  });

  it("usuwanie zaznaczonego; bez zaznaczenia nic", () => {
    const s = addObstacle(addPiece(e0, "elipsa"), "okrag");
    expect(removeSelected(s).obstacles).toEqual([]);
    expect(removeSelected(s).pieces).toHaveLength(1);
    expect(removeSelected({ ...s, selected: null })).toEqual({ ...s, selected: null });
  });

  it("blokada: przełącza istniejący uchwyt, nieistniejący ignoruje", () => {
    const s = addPiece(e0, "elipsa");
    const z = toggleLock(s, 0, "rozmiar");
    expect(z.pieces[0].locked).toEqual(["rozmiar"]);
    expect(toggleLock(z, 0, "rozmiar").pieces[0].locked).toEqual([]);
    expect(toggleLock(s, 0, "wierzcholek")).toBe(s);
    expect(toggleLock(s, 5, "rozmiar")).toBe(s);
  });

  it("łuk: pełna elipsa ↔ półelipsa; blokady końców znikają razem z łukiem; okrąg bez łuku", () => {
    let s = addPiece(e0, "elipsa");
    s = toggleArc(s);
    const shape = s.pieces[0].shape;
    expect(shape.kind === "elipsa" && shape.arc !== undefined).toBe(true);
    s = toggleLock(s, 0, "poczatek");
    expect(s.pieces[0].locked).toEqual(["poczatek"]);
    s = toggleArc(s);
    expect(s.pieces[0].locked).toEqual([]);
    const okrag = addObstacle(e0, "okrag");
    expect(toggleArc(okrag)).toBe(okrag);
    expect(canToggleArc(okrag)).toBe(false);
    expect(canToggleArc(addPiece(e0, "elipsa"))).toBe(true);
    expect(canToggleArc(addPiece(e0, "parabola"))).toBe(false);
    expect(canToggleArc({ ...addPiece(e0, "elipsa"), selected: null })).toBe(false);
  });

  it("strzał po kolei: 360° → wachlarz → jedna piłka (ten sam kierunek) → 360°", () => {
    const a = cycleShot(e0);
    expect(a.shot).toEqual({ kind: "wachlarz", center: Math.PI / 2, width: Math.PI / 2 });
    const b = cycleShot(a);
    expect(b.shot).toEqual({ kind: "jedna", center: Math.PI / 2 });
    expect(cycleShot(b).shot).toEqual({ kind: "360" });
  });
});

describe("edytor — zapis, „Zagraj” i wygrana autora", () => {
  /** Edytor z próbki: start jak w próbce, rozwiązanie znane z próbki. */
  const fromSample = (i: number): EditorState => fromShared(SAMPLES[i]);

  it("projekt ↔ poziom gracza: start zostaje startem, wszystko zaokrąglone", () => {
    for (const s of SAMPLES) {
      const shared = toShared(fromShared(s));
      expect(shared.pieces.map((p) => p.start)).toEqual(roundShared(s).pieces.map((p) => p.start));
      // bez wygranej rozwiązanie = start
      expect(shared.pieces.map((p) => p.solution)).toEqual(shared.pieces.map((p) => p.start));
    }
  });

  it("„Zagraj” bez elementów — odmowa", () => {
    expect(prepareTest(e0)).toEqual({ ok: false, reason: "brak elementów" });
  });

  it("„Zagraj”, gdy start już wygrywa — odmowa", () => {
    const s = fromSample(0);
    const wygrany: EditorState = { ...s, pieces: [{ ...s.pieces[0], shape: SAMPLES[0].pieces[0].solution }] };
    expect(prepareTest(wygrany)).toEqual({ ok: false, reason: "start już wygrywa" });
  });

  it.each(SAMPLES.map((s, i) => [s.title, i] as const))("%s: autor przechodzi → gotowy kod, który otwiera się z linku", (_t, i) => {
    const t = prepareTest(fromSample(i));
    if (!t.ok) throw new Error(t.reason);
    const w = acceptWin(t.shared, SAMPLES[i].pieces.map((p) => p.solution));
    if (!w.ok) throw new Error("wygrana nie przeszła dowodu");
    expect(openCode(w.code).ok).toBe(true);
  });

  it("„wygrana”, która po zaokrągleniu nie wygrywa, nie daje kodu", () => {
    const t = prepareTest(fromSample(0));
    if (!t.ok) throw new Error(t.reason);
    expect(acceptWin(t.shared, [ellipse(vec(-0.3, 0.2), vec(0.5, 0), 0.8)])).toEqual({ ok: false });
  });
});
