import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

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
});
