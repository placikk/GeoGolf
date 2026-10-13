import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { dashedPolyline, handleShape, holeMark, ringHandle } from "../../src/render/draw";
import { makeCamera } from "../../src/render/camera";

function recordingCtx() {
  const calls: { op: string; lineWidth?: number; style?: string }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, closePath() {},
    moveTo() { calls.push({ op: "moveTo" }); },
    lineTo() { calls.push({ op: "lineTo" }); },
    arc() { calls.push({ op: "arc" }); },
    stroke() { calls.push({ op: "stroke", lineWidth: ctx.lineWidth, style: String(ctx.strokeStyle) }); },
    fill() { calls.push({ op: "fill", style: String(ctx.fillStyle) }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const cam = makeCamera(100, 100);

describe("znaczniki: ruchome kontra stałe", () => {
  // Uchwyt ogniska musi być PUSTY w środku: gdy ognisko siada na piłce albo w dołku,
  // pierścień otacza punkt zamiast go zakrywać — widać oba naraz.
  it("uchwyt ogniska to pusty pierścień z poświatą: dwa obrysy, zero wypełnień", () => {
    const { ctx, calls } = recordingCtx();
    ringHandle(ctx, cam, vec(0, 0), "glowny", "poswiata", 10);
    expect(calls.filter((c) => c.op === "fill")).toHaveLength(0);
    const strokes = calls.filter((c) => c.op === "stroke");
    expect(strokes.map((s) => s.style)).toEqual(["poswiata", "glowny"]);
    expect(strokes[0].lineWidth!).toBeGreaterThan(strokes[1].lineWidth!);
  });

  it("dołek ma ciemny środek i obwódkę w swoim kolorze", () => {
    const { ctx, calls } = recordingCtx();
    holeMark(ctx, cam, vec(0, 0), "brzeg", "poswiata", "srodek", 9);
    expect(calls.filter((c) => c.op === "fill").map((c) => c.style)).toEqual(["poswiata", "srodek"]);
    expect(calls.filter((c) => c.op === "stroke").map((c) => c.style)).toEqual(["brzeg"]);
  });

  // Romb i kwadrat to też PUSTE znaki z poświatą — z tej samej przyczyny co pierścień:
  // uchwyt postawiony na piłce albo w dołku nie może go zakryć.
  for (const mark of ["romb", "kwadrat"] as const) {
    it(`uchwyt „${mark}" to pusty czworokąt z poświatą: dwa obrysy, zero wypełnień, zero łuków`, () => {
      const { ctx, calls } = recordingCtx();
      handleShape(ctx, cam, vec(0, 0), mark, "glowny", "poswiata", 10);
      expect(calls.filter((c) => c.op === "fill")).toHaveLength(0);
      expect(calls.filter((c) => c.op === "arc")).toHaveLength(0);
      // każdy z dwóch obrysów: moveTo + trzy lineTo
      expect(calls.filter((c) => c.op === "lineTo")).toHaveLength(6);
      const strokes = calls.filter((c) => c.op === "stroke");
      expect(strokes.map((s) => s.style)).toEqual(["poswiata", "glowny"]);
    });
  }

  it("uchwyt „pierscien\" rysuje pierścień", () => {
    const { ctx, calls } = recordingCtx();
    handleShape(ctx, cam, vec(0, 0), "pierscien", "glowny", "poswiata", 10);
    expect(calls.filter((c) => c.op === "arc")).toHaveLength(2);
    expect(calls.filter((c) => c.op === "lineTo")).toHaveLength(0);
  });
});

describe("oś paraboli: linia przerywana", () => {
  it("kreskuje tylko swój obrys — po rysunku kreskowanie jest wyłączone", () => {
    const dashes: number[][] = [];
    // w obiekcie, nie w `let` — TypeScript nie widzi przypisań z wnętrza metod fałszywego ctx
    const seen: { current: number[]; atStroke: number[] | null } = { current: [], atStroke: null };
    const ctx = {
      lineWidth: 0, strokeStyle: "",
      beginPath() {}, moveTo() {}, lineTo() {},
      setLineDash(d: number[]) { seen.current = d; dashes.push(d); },
      stroke() { seen.atStroke = seen.current; },
    };
    dashedPolyline(ctx as unknown as CanvasRenderingContext2D, cam, [vec(0, 0), vec(1, 0)], "kolor", 1);
    expect(seen.atStroke?.length ?? 0).toBeGreaterThan(0);
    expect(dashes[dashes.length - 1]).toEqual([]);
  });
});
