import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { holeMark, ringHandle } from "../../src/render/draw";
import { makeCamera } from "../../src/render/camera";

function recordingCtx() {
  const calls: { op: string; lineWidth?: number; style?: string }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
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
});
