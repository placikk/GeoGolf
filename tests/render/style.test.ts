import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { Handle, arcEllipse, circle, ellipse, hyperbola, parabola, segment } from "../../src/levels";
import { PALETTE } from "../../src/render/draw";
import { KIND_COLORS, handleMark, shapeStyle } from "../../src/render/style";

const KAWALEK = { mid: 0, span: 1.2 };
const elipsa = ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8);
const luk = arcEllipse(vec(-0.5, 0), vec(0.5, 0), 0.8, 0, Math.PI);
const par = parabola(vec(0.5, 0), vec(0.8, 0), KAWALEK);
const hip = hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 });
const odc = segment(vec(0, -1), vec(0, -0.1));
const okrag = circle(vec(0, 0.45), 0.12);

describe("kolor według rodzaju", () => {
  it("cztery rodzaje — cztery różne kolory", () => {
    const kolory = Object.values(KIND_COLORS).map((k) => k.line);
    expect(new Set(kolory).size).toBe(4);
  });

  it("żaden kolor rodzaju nie jest kolorem przeszkody, dołka ani toru piłki", () => {
    for (const k of Object.values(KIND_COLORS)) {
      expect([PALETTE.obstacle, PALETTE.hole, PALETTE.trail, PALETTE.miss]).not.toContain(k.line);
    }
  });

  it("element gracza: pełny kolor swojego rodzaju, bez kropek ognisk (ogniska są uchwytami)", () => {
    for (const s of [elipsa, luk, par, hip, odc, okrag]) {
      expect(shapeStyle(s, "gracz"), s.kind).toEqual({ line: KIND_COLORS[s.kind].line, glow: KIND_COLORS[s.kind].glow, focus: null });
    }
  });

  it("stały okrąg i stały odcinek to przeszkody — czerwone, bez ognisk", () => {
    for (const s of [okrag, odc]) {
      expect(shapeStyle(s, "staly")).toEqual({ line: PALETTE.obstacle, glow: PALETTE.obstacleGlow, focus: null });
    }
  });

  it("stała elipsa, łuk, parabola i hiperbola: kolor rodzaju, przygaszony, bez poświaty, blade ogniska", () => {
    for (const s of [elipsa, luk, par, hip]) {
      const st = shapeStyle(s, "staly");
      expect(st.line, s.kind).toBe(KIND_COLORS[s.kind].dim);
      expect(st.line, s.kind).not.toBe(KIND_COLORS[s.kind].line);
      expect(st.glow, s.kind).toBe("rgba(0,0,0,0)");
      expect(st.focus, s.kind).toBe(KIND_COLORS[s.kind].focus);
    }
  });
});

describe("kształt uchwytu", () => {
  // wszystkie wartości unii `Handle` (typ wymusza, że każda pozycja jest poprawnym uchwytem)
  const ALL: Handle[] = [
    "ognisko1", "ognisko2", "rozmiar", "poczatek", "koniec", "ognisko", "wierzcholek", "koniec1", "koniec2", "srodek",
  ];

  it("ogniska to pierścienie", () => {
    for (const h of ["ognisko1", "ognisko2", "ognisko"] as const) expect(handleMark(h), h).toBe("pierscien");
  });

  it("wierzchołek paraboli to romb", () => {
    expect(handleMark("wierzcholek")).toBe("romb");
  });

  it("cała reszta to kwadraty", () => {
    const reszta = ALL.filter((h) => !["ognisko1", "ognisko2", "ognisko", "wierzcholek"].includes(h));
    expect(reszta).toHaveLength(6);
    for (const h of reszta) expect(handleMark(h), h).toBe("kwadrat");
  });
});
