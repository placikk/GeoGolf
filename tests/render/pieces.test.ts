import { describe, it, expect } from "vitest";
import { Vec2, vec } from "../../src/core/vec";
import { ellipseFromFoci, parabolaFromFocusVertex } from "../../src/core/conic";
import { Piece, whole } from "../../src/core/piece";
import { makeCamera } from "../../src/render/camera";
import { FRAME_RADIUS, SECTOR_REACH, boardFrame, drawPiece, sectorWedge } from "../../src/render/draw";
import { curveHints } from "../../src/render/shapes";
import { arcEllipse, hyperbola, parabola, shapeToPiece } from "../../src/levels";

function recordingCtx() {
  const calls: { op: string; args?: number[]; style?: string; lineWidth?: number }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, moveTo() {}, lineTo() {},
    closePath() { calls.push({ op: "closePath" }); },
    arc(...args: number[]) { calls.push({ op: "arc", args }); },
    rect(...args: number[]) { calls.push({ op: "rect", args }); },
    roundRect(...args: number[]) { calls.push({ op: "roundRect", args }); },
    save() { calls.push({ op: "save" }); },
    restore() { calls.push({ op: "restore" }); },
    clip() { calls.push({ op: "clip" }); },
    stroke() { calls.push({ op: "stroke", style: String(ctx.strokeStyle), lineWidth: ctx.lineWidth }); },
    fill() { calls.push({ op: "fill", style: String(ctx.fillStyle) }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const cam = makeCamera(200, 200);

describe("rysowanie kawałków", () => {
  it("cała elipsa jest zamknięta, łuk nie — łuk ma końce", () => {
    const full = recordingCtx();
    drawPiece(full.ctx, cam, whole(ellipseFromFoci(vec(-0.3, 0), vec(0.3, 0), 0.5)), "k", "p", 2);
    expect(full.calls.filter((c) => c.op === "closePath")).toHaveLength(2);

    const arc = recordingCtx();
    drawPiece(arc.ctx, cam, shapeToPiece(arcEllipse(vec(-0.3, 0), vec(0.3, 0), 0.5, 0, 2)), "k", "p", 2);
    expect(arc.calls.filter((c) => c.op === "closePath")).toHaveLength(0);
    expect(arc.calls.filter((c) => c.op === "stroke")).toHaveLength(2);   // poświata + linia
  });

  it("wachlarz to jedno wypełnienie bez obrysu, kąty świata odwrócone na ekran", () => {
    const { ctx, calls } = recordingCtx();
    sectorWedge(ctx, cam, vec(0.1, -0.2), { center: 1, width: 0.5 }, SECTOR_REACH, "klin");
    expect(calls.filter((c) => c.op === "fill")).toHaveLength(1);
    expect(calls.filter((c) => c.op === "stroke")).toHaveLength(0);
    const arc = calls.find((c) => c.op === "arc")!;
    expect(arc.args![2]).toBeCloseTo(SECTOR_REACH * cam.scale, 12);
    expect(arc.args![3]).toBeCloseTo(-1.25, 12);
    expect(arc.args![4]).toBeCloseTo(-0.75, 12);
  });

  it("wachlarz jest mały i przycięty do planszy: przycięcie przed wypełnieniem, potem przywrócenie", () => {
    expect(SECTOR_REACH).toBe(0.4);
    const { ctx, calls } = recordingCtx();
    sectorWedge(ctx, cam, vec(0.9, 0.9), { center: 0.5, width: 1 }, SECTOR_REACH, "klin");
    const ops = calls.map((c) => c.op);
    expect(ops.indexOf("clip")).toBeGreaterThan(ops.indexOf("rect"));
    expect(ops.indexOf("fill")).toBeGreaterThan(ops.indexOf("clip"));
    expect(ops[0]).toBe("save");
    expect(ops[ops.length - 1]).toBe("restore");
    // przycięcie to dokładnie kwadrat planszy [-1, 1]²
    const tl = cam.toScreen(vec(-1, 1)), br = cam.toScreen(vec(1, -1));
    expect(calls.find((c) => c.op === "rect")!.args).toEqual([tl.x, tl.y, br.x - tl.x, br.y - tl.y]);
  });

  it("ramka: tło planszy, potem szeroka poświata pod cienką linią, zaokrąglone rogi na brzegu planszy", () => {
    const { ctx, calls } = recordingCtx();
    boardFrame(ctx, cam, "tlo", "linia", "poswiata", 1);
    expect(calls.filter((c) => c.op === "fill").map((c) => c.style)).toEqual(["tlo"]);
    const strokes = calls.filter((c) => c.op === "stroke");
    expect(strokes.map((s) => s.style)).toEqual(["poswiata", "linia"]);
    expect(strokes[0].lineWidth!).toBeGreaterThan(strokes[1].lineWidth!);
    const tl = cam.toScreen(vec(-1, 1)), br = cam.toScreen(vec(1, -1));
    for (const r of calls.filter((c) => c.op === "roundRect")) {
      expect(r.args).toEqual([tl.x, tl.y, br.x - tl.x, br.y - tl.y, FRAME_RADIUS]);
    }
  });
});

describe("obrys kawałka z zakresem nie domyka się", () => {
  it("parabola rysuje się jako łamana otwarta", () => {
    const pp: Piece = {
      conic: parabolaFromFocusVertex(vec(-0.5, 0), vec(-0.8, 0)),
      range: {
        from: -0.6, to: 0.6,
        frame: { kind: "parabola", vertex: vec(-0.8, 0), axis: vec(1, 0), p: 0.3 },
      },
    };
    const { ctx, calls } = recordingCtx();
    drawPiece(ctx, cam, pp, "#fff", "#000", 2);
    expect(calls.filter((c) => c.op === "closePath")).toHaveLength(0);
  });
});

describe("podpowiedzi krzywych", () => {
  it("parabola ma jedną podpowiedź: kierownicę, prostopadłą do osi", () => {
    const par = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });
    const h = curveHints(par);
    expect(h).toHaveLength(1);
    // kierownica leży p za wierzchołkiem, po przeciwnej stronie niż ognisko
    for (const p of h[0]) expect(p.x).toBeCloseTo(-1.1, 9);
  });

  it("hiperbola ma dwie podpowiedzi: asymptoty przez środek", () => {
    const hyp = hyperbola(vec(-0.5, 0), vec(0.5, 0), 0.3, 1, { mid: 0, span: 2 });
    const h = curveHints(hyp);
    expect(h).toHaveLength(2);
    // obie przechodzą przez środek (0,0) o nachyleniach ±b/a
    const nachylenie = (l: Vec2[]) => (l[1].y - l[0].y) / (l[1].x - l[0].x);
    const b = Math.sqrt(0.25 - 0.09);
    expect(Math.abs(nachylenie(h[0]))).toBeCloseTo(b / 0.3, 9);
    expect(nachylenie(h[0])).toBeCloseTo(-nachylenie(h[1]), 9);
  });
});
