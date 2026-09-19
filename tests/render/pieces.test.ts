import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci } from "../../src/core/conic";
import { whole } from "../../src/core/piece";
import { makeCamera } from "../../src/render/camera";
import { drawPiece, sectorWedge } from "../../src/render/draw";
import { ellipse, shapeToPiece } from "../../src/levels";

function recordingCtx() {
  const calls: { op: string; args?: number[] }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, moveTo() {}, lineTo() {},
    closePath() { calls.push({ op: "closePath" }); },
    arc(...args: number[]) { calls.push({ op: "arc", args }); },
    stroke() { calls.push({ op: "stroke" }); },
    fill() { calls.push({ op: "fill" }); },
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
    drawPiece(arc.ctx, cam, shapeToPiece(ellipse(vec(-0.3, 0), vec(0.3, 0), 0.5, { start: 0, end: 2 })), "k", "p", 2);
    expect(arc.calls.filter((c) => c.op === "closePath")).toHaveLength(0);
    expect(arc.calls.filter((c) => c.op === "stroke")).toHaveLength(2);   // poświata + linia
  });

  it("wachlarz to jedno wypełnienie bez obrysu, kąty świata odwrócone na ekran", () => {
    const { ctx, calls } = recordingCtx();
    sectorWedge(ctx, cam, vec(0.1, -0.2), { center: 1, width: 0.5 }, 3, "klin");
    expect(calls.filter((c) => c.op === "fill")).toHaveLength(1);
    expect(calls.filter((c) => c.op === "stroke")).toHaveLength(0);
    const arc = calls.find((c) => c.op === "arc")!;
    expect(arc.args![3]).toBeCloseTo(-1.25, 12);
    expect(arc.args![4]).toBeCloseTo(-0.75, 12);
  });
});
