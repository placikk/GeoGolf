import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { glowDot, glowPolyline } from "../../src/render/draw";
import { makeCamera } from "../../src/render/camera";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Fałszywy ctx, który nagrywa wywołania stroke/fill zamiast rysować. Nie potrzeba DOM. */
function recordingCtx() {
  const calls: { op: string; lineWidth?: number; style?: string }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
    stroke() { calls.push({ op: "stroke", lineWidth: ctx.lineWidth, style: String(ctx.strokeStyle) }); },
    fill() { calls.push({ op: "fill", style: String(ctx.fillStyle) }); },
  };
  return { ctx, calls };
}

describe("wydajność rysowania", () => {
  it("nigdzie w src nie używamy shadowBlur ani shadowColor", () => {
    for (const file of walk("src")) {
      const src = readFileSync(file, "utf8");
      expect(src.includes("shadowBlur"), `${file} używa shadowBlur`).toBe(false);
      expect(src.includes("shadowColor"), `${file} używa shadowColor`).toBe(false);
    }
  });

  it("moduł rysowania eksportuje paletę i prymitywy", async () => {
    const m = await import("../../src/render/draw");
    expect(typeof m.glowPolyline).toBe("function");
    expect(typeof m.glowDot).toBe("function");
    expect(typeof m.drawConic).toBe("function");
    expect(m.PALETTE.bg).toMatch(/^#/);
  });

  // Test zakazu (wyżej) pilnuje, że nie używamy `shadowBlur`/`shadowColor`. Ale substytutu —
  // podwójnego obrysu, którym poświata jest udawana — nic nie pilnowało: usunięcie szerokiego
  // półprzezroczystego przebiegu z `glowPolyline` (albo z `glowDot`) przechodziło 91/91.
  it("glowPolyline rysuje DWA obrysy: szeroką poświatę pod cienką główną linią", () => {
    const cam = makeCamera(100, 100);
    const { ctx, calls } = recordingCtx();
    glowPolyline(ctx as unknown as CanvasRenderingContext2D, cam, [vec(0, 0), vec(1, 1)], "kolor-glowny", "kolor-poswiaty", 2);

    const strokes = calls.filter((c) => c.op === "stroke");
    expect(strokes).toHaveLength(2);
    expect(strokes[0].style).toBe("kolor-poswiaty");
    expect(strokes[1].style).toBe("kolor-glowny");
    expect(strokes[0].lineWidth).toBe(strokes[1].lineWidth! * 5);
  });

  it("glowDot rysuje DWA wypełnienia: szeroką poświatę pod małą główną kropką", () => {
    const cam = makeCamera(100, 100);
    const { ctx, calls } = recordingCtx();
    glowDot(ctx as unknown as CanvasRenderingContext2D, cam, vec(0, 0), "kolor-glowny", "kolor-poswiaty", 4);

    const fills = calls.filter((c) => c.op === "fill");
    expect(fills).toHaveLength(2);
    expect(fills[0].style).toBe("kolor-poswiaty");
    expect(fills[1].style).toBe("kolor-glowny");
  });
});
