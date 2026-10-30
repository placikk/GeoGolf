import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { HOLE_RADIUS, ellipse } from "../../src/levels";
import { SharedLevel, encodeLevel, roundShared } from "../../src/share/codec";
import { codeFromHash, levelId, linkFor, openCode, sharedTest, sharedToLevel, verifyShared } from "../../src/share/verify";
import { SAMPLES } from "./samples";

describe("weryfikacja poziomu gracza", () => {
  it.each(SAMPLES.map((s) => [s.title, s] as const))("%s: działa przed i po zaokrągleniu", (_t, s) => {
    expect(verifyShared(s)).toEqual({ ok: true });
    expect(verifyShared(roundShared(s))).toEqual({ ok: true });
  });

  it("rozwiązanie, które nie wygrywa — odrzucone", () => {
    const s = SAMPLES[0];
    const zle: SharedLevel = { ...s, pieces: [{ ...s.pieces[0], solution: ellipse(vec(-0.3, 0.2), vec(0.5, 0), 0.8) }] };
    expect(verifyShared(zle)).toEqual({ ok: false, reason: "rozwiązanie nie wygrywa" });
    expect(openCode(encodeLevel(zle)).ok).toBe(false);
  });

  it("start, który już wygrywa — odrzucony", () => {
    const s = SAMPLES[0];
    const latwy: SharedLevel = { ...s, pieces: [{ ...s.pieces[0], start: s.pieces[0].solution }] };
    expect(verifyShared(latwy)).toEqual({ ok: false, reason: "start już wygrywa" });
  });

  it("parametry dowodu wynikają ze strzału", () => {
    expect(sharedTest({ kind: "360" })).toEqual({ balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS });
    expect(sharedTest({ kind: "wachlarz", center: 1, width: 2 })).toEqual({ balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS });
    expect(sharedTest({ kind: "jedna", center: 1 })).toEqual({ balls: 1, maxBounces: 3, holeRadius: 1.5 * HOLE_RADIUS });
  });

  it("poziom gracza jako zwykły Level", () => {
    const l = sharedToLevel(SAMPLES[4], "spol-x");
    expect(l).toMatchObject({ id: "spol-x", title: "Lustro", hint: "", sector: { center: Math.PI / 2, width: 0 } });
    expect(l.test.balls).toBe(1);
    expect(sharedToLevel(SAMPLES[0], "a").sector).toBeUndefined();
    expect(sharedToLevel(SAMPLES[1], "a").sector).toEqual({ center: Math.PI / 2, width: Math.PI });
  });
});

describe("identyfikator, link, otwieranie", () => {
  it("identyfikator: deterministyczny, w formacie spol-xxxxxxxx, różny dla różnych poziomów", () => {
    const ids = SAMPLES.map((s) => levelId(encodeLevel(s)));
    for (const id of ids) expect(id).toMatch(/^spol-[0-9a-f]{8}$/);
    expect(new Set(ids).size).toBe(SAMPLES.length);
    expect(levelId(encodeLevel(SAMPLES[0]))).toBe(ids[0]);
  });

  it("link i końcówka adresu", () => {
    expect(linkFor("https://placikk.github.io/GeoGolf/", "abc")).toBe("https://placikk.github.io/GeoGolf/#poziom=abc");
    expect(codeFromHash("#poziom=abc")).toBe("abc");
    expect(codeFromHash("#poziom=")).toBeNull();
    expect(codeFromHash("#inne=abc")).toBeNull();
    expect(codeFromHash("")).toBeNull();
  });

  it("otwarcie kodu: poziom grywalny, identyfikator z kodu kanonicznego", () => {
    for (const s of SAMPLES) {
      const code = encodeLevel(s);
      const o = openCode(code);
      if (!o.ok) throw new Error(`${s.title}: ${o.reason}`);
      expect(o.code).toBe(code);
      expect(o.level.id).toBe(levelId(code));
      expect(o.shared).toEqual(roundShared(s));
    }
  });

  it("otwarcie złego kodu podaje powód i nie rzuca", () => {
    expect(openCode("!!!")).toEqual({ ok: false, reason: "zły zapis" });
  });
});
