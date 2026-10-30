import { describe, it, expect } from "vitest";
import { dist, vec } from "../../src/core/vec";
import { SNAP_RADIUS } from "../../src/levels";
import { addObstacle, addPiece, cycleShot, newEditor } from "../../src/editor/model";
import { SHOT_REACH, applyEditorDrag, editorHandles, pickEditorHandle, selectAt } from "../../src/editor/interaction";

const e0 = newEditor("Test");
const inBoard = (p: { x: number; y: number }) => Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;

describe("uchwyty edytora", () => {
  it("piłka i dołek zawsze; uchwyty strzału zależnie od rodzaju", () => {
    const targets = (s: typeof e0) => editorHandles(s).map((h) => h.ref.target);
    expect(targets(e0)).toEqual(["pilka", "dolek"]);
    expect(targets(cycleShot(e0))).toEqual(["pilka", "dolek", "kierunek", "szerokosc"]);
    expect(targets(cycleShot(cycleShot(e0)))).toEqual(["pilka", "dolek", "kierunek"]);
  });

  it("uchwyty elementów i przeszkód — te same co w grze", () => {
    const s = addObstacle(addPiece(e0, "parabola"), "banda");
    const refs = editorHandles(s).map((h) => h.ref);
    expect(refs).toContainEqual({ target: "element", index: 0, id: "ognisko" });
    expect(refs).toContainEqual({ target: "element", index: 0, id: "wierzcholek" });
    expect(refs).toContainEqual({ target: "przeszkoda", index: 0, id: "srodek" });
  });

  it("uchwyt kierunku leży SHOT_REACH od piłki, a przy ścianie zostaje w planszy", () => {
    const s = cycleShot(e0);
    const kier = editorHandles(s).find((h) => h.ref.target === "kierunek");
    expect(kier && dist(kier.pos, s.ball)).toBeCloseTo(SHOT_REACH, 12);
    const przyScianie = { ...s, ball: vec(-0.5, 0.9) };
    for (const h of editorHandles(przyScianie)) expect(inBoard(h.pos), h.ref.target).toBe(true);
  });

  it("łapanie: najbliższy uchwyt w promieniu, poza nim nic", () => {
    expect(pickEditorHandle(e0, vec(-0.48, 0.01), 0.1)).toEqual({ target: "pilka" });
    expect(pickEditorHandle(e0, vec(0, 0.8), 0.1)).toBeNull();
  });
});

describe("przeciąganie w edytorze", () => {
  it("piłka i dołek idą za palcem, ale nie za planszę", () => {
    expect(applyEditorDrag(e0, { target: "pilka" }, vec(0.2, 0.3), SNAP_RADIUS).ball).toEqual(vec(0.2, 0.3));
    expect(applyEditorDrag(e0, { target: "dolek" }, vec(1.5, -2), SNAP_RADIUS).hole).toEqual(vec(1, -1));
  });

  it("kierunek strzału: kąt od piłki do palca", () => {
    const s = applyEditorDrag(cycleShot(e0), { target: "kierunek" }, vec(-0.5, -1), SNAP_RADIUS);
    expect(s.shot.kind === "wachlarz" && s.shot.center).toBeCloseTo(-Math.PI / 2, 12);
  });

  it("szerokość wachlarza: dwa razy odchylenie od środka, w [0.2, 2π]", () => {
    const s = cycleShot(e0); // środek π/2
    const w = (to: { x: number; y: number }) => {
      const r = applyEditorDrag(s, { target: "szerokosc" }, to, SNAP_RADIUS).shot;
      return r.kind === "wachlarz" ? r.width : NaN;
    };
    // piłka w (−0.5, 0), środek wachlarza π/2: palec pod 45° od piłki to odchylenie π/4
    expect(w(vec(0, 0.5))).toBeCloseTo(Math.PI / 2, 12);
    expect(w(vec(0, 0))).toBeCloseTo(Math.PI, 12);
    expect(w(vec(-0.5, 0.5))).toBeCloseTo(0.2, 12);      // tuż przy środku — minimum
    expect(w(vec(-0.5, -0.5))).toBeCloseTo(2 * Math.PI, 12);
  });

  it("ognisko przyskakuje do piłki, dołka i ognisk innych kształtów", () => {
    let s = addPiece(e0, "elipsa");
    s = applyEditorDrag(s, { target: "element", index: 0, id: "ognisko1" }, vec(-0.52, 0.02), SNAP_RADIUS);
    const e = s.pieces[0].shape;
    expect(e.kind === "elipsa" && e.f1).toEqual(vec(-0.5, 0));
    s = addObstacle(s, "elipsa"); // ogniska (−0.3, 0) i (0.3, 0)
    s = applyEditorDrag(s, { target: "element", index: 0, id: "ognisko2" }, vec(0.31, 0.02), SNAP_RADIUS);
    const e2 = s.pieces[0].shape;
    expect(e2.kind === "elipsa" && e2.f2).toEqual(vec(0.3, 0));
  });

  it("zablokowane uchwyty w edytorze dalej się przesuwa — blokada działa dopiero w grze", () => {
    let s = addPiece(e0, "odcinek");
    s = { ...s, pieces: [{ ...s.pieces[0], locked: ["koniec1"] }] };
    s = applyEditorDrag(s, { target: "element", index: 0, id: "koniec1" }, vec(-0.6, 0.5), SNAP_RADIUS);
    const o = s.pieces[0].shape;
    expect(o.kind === "odcinek" && o.from).toEqual(vec(-0.6, 0.5));
    expect(s.pieces[0].locked).toEqual(["koniec1"]);
  });
});

describe("zaznaczanie stuknięciem", () => {
  it("krzywa w promieniu — zaznaczona; puste miejsce — nic", () => {
    const s = addObstacle(addPiece(e0, "odcinek"), "okrag"); // odcinek y = 0 od −0.3 do 0.3; okrąg r 0.15 w (0,0)
    expect(selectAt(s, vec(0.25, 0.01), 0.05)).toEqual({ kind: "element", index: 0 });
    expect(selectAt(s, vec(0, 0.16), 0.05)).toEqual({ kind: "przeszkoda", index: 0 });
    expect(selectAt(s, vec(0.8, 0.8), 0.05)).toBeNull();
  });

  it("pełna elipsa łapie się także w miejscu, gdzie łamana się zamyka", () => {
    const s = addPiece(e0, "elipsa"); // a = 0.45, wierzchołek osi w (0.45, 0) — tam zaczyna się łamana
    expect(selectAt(s, vec(0.449, -0.002), 0.01)).toEqual({ kind: "element", index: 0 });
  });
});
