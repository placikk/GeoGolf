import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { arcEllipse, circle, ellipse, hyperbola, parabola, segment, shapeConic, shapeToPiece } from "../../src/levels";
import {
  HYPERBOLA_SPAN, MAX_OBSTACLES, MAX_PIECES, PARABOLA_SPAN, SharedLevel, cleanTitle, decodeLevel, encodeLevel, round4,
  roundShared,
} from "../../src/share/codec";
import { SAMPLES } from "./samples";
import { fromJsonText, fromWire, rng, toWire } from "./wire";

const decoded = (code: string): SharedLevel => {
  const d = decodeLevel(code);
  if (!d.ok) throw new Error(`odrzucony: ${d.reason}`);
  return d.level;
};

describe("kodek poziomu — zapis i odczyt", () => {
  it.each(SAMPLES.map((s) => [s.title, s] as const))("%s: odczyt zapisu to ten sam poziom po zaokrągleniu", (_t, s) => {
    expect(decoded(encodeLevel(s))).toEqual(roundShared(s));
  });

  it("zapis jest kanoniczny: odczytany i zapisany ponownie daje ten sam kod", () => {
    for (const s of SAMPLES) {
      const code = encodeLevel(s);
      expect(encodeLevel(decoded(code)), s.title).toBe(code);
    }
  });

  it("zaokrąglenie: 4 miejsca, bez ujemnego zera, idempotentne", () => {
    expect(round4(0.123456)).toBe(0.1235);
    expect(Object.is(round4(-0.00001), 0)).toBe(true);
    for (const s of SAMPLES) expect(roundShared(roundShared(s)), s.title).toEqual(roundShared(s));
  });

  it("kod to base64url — bez znaków, które psują link (+, /, =)", () => {
    for (const s of SAMPLES) expect(encodeLevel(s), s.title).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("polskie litery w tytule przechodzą przez zapis", () => {
    const s = { ...SAMPLES[0], title: "Żółć gęślą jaźń" };
    expect(decoded(encodeLevel(s)).title).toBe("Żółć gęślą jaźń");
  });

  // Największy poprawny poziom: 3 elementy gracza (w tym łuk), 8 przeszkód, tytuł 40 znaków
  // z polskimi literami (2 bajty w UTF-8). Link musi się zmieścić w każdym komunikatorze.
  it("największy poprawny poziom daje link krótszy niż 2000 znaków", () => {
    const luk = arcEllipse(vec(-0.55, -0.35), vec(0.45, -0.35), 0.7123, 0.1234, 3.0123);
    const big: SharedLevel = {
      title: "ąęółśżźćń".repeat(4) + "ąęół",
      ball: vec(-0.5123, -0.4567), hole: vec(0.4321, 0.3456),
      shot: { kind: "wachlarz", center: 1.2345, width: 2.3456 },
      pieces: [
        { start: luk, solution: luk, locked: ["poczatek", "koniec"] },
        { start: parabola(vec(0.1234, 0.5678), vec(0.2345, 0.8765), PARABOLA_SPAN), solution: parabola(vec(0.1234, 0.5678), vec(0.2345, 0.8765), PARABOLA_SPAN), locked: [] },
        { start: hyperbola(vec(-0.4321, 0.6543), vec(0.3456, 0.7654), 0.1234, 1, HYPERBOLA_SPAN), solution: hyperbola(vec(-0.4321, 0.6543), vec(0.3456, 0.7654), 0.1234, 1, HYPERBOLA_SPAN), locked: [] },
      ],
      obstacles: Array.from({ length: MAX_OBSTACLES }, (_, i) =>
        arcEllipse(vec(-0.9 + i * 0.2, -0.95), vec(-0.85 + i * 0.2, -0.9), 0.1234, 0.5, 2.5)),
    };
    expect([...big.title]).toHaveLength(40);
    expect(decodeLevel(encodeLevel(big)).ok).toBe(true);
    expect(encodeLevel(big).length).toBeLessThan(2000);
  });
});

describe("kodek poziomu — odrzucanie złych kodów", () => {
  const base = SAMPLES[0];
  const rejects = (code: string) => {
    const d = decodeLevel(code);
    expect(d.ok).toBe(false);
  };
  const withWire = (edit: (w: Record<string, unknown>) => void) => {
    const w = toWire(base);
    edit(w);
    return fromWire(w);
  };

  it("zły base64, zły UTF-8, zły JSON", () => {
    rejects("");
    rejects("!!!");
    rejects("a+b/c=");
    rejects(fromJsonText("{\"v\":1,"));
    rejects("_w");   // 0xFF — niepoprawny UTF-8
  });

  it("zła wersja, nie-obiekt, brak pól", () => {
    rejects(withWire((w) => { w.v = 2; }));
    rejects(fromWire([1, 2, 3]));
    rejects(fromWire(null));
    rejects(fromWire("tekst"));
    for (const k of ["t", "b", "h", "s", "p", "o"]) rejects(withWire((w) => { delete w[k]; }));
  });

  it("liczba nieskończona i nie-liczba", () => {
    const text = JSON.stringify(toWire(base)).replace("\"b\":[-0.5,0]", "\"b\":[1e999,0]");
    expect(text).toContain("1e999");
    rejects(fromJsonText(text));
    rejects(withWire((w) => { w.b = ["-0.5", 0]; }));
  });

  it("punkt poza planszą", () => {
    rejects(withWire((w) => { w.h = [1.0001, 0]; }));
  });

  it("tytuł: pusty, za długi, sam znak sterujący", () => {
    rejects(withWire((w) => { w.t = ""; }));
    rejects(withWire((w) => { w.t = "x".repeat(41); }));
    rejects(withWire((w) => { w.t = "\u0007"; }));
    expect(cleanTitle("  a\u0000b\u001fc\u007f  ")).toBe("abc");
  });

  it("kształty, których nie da się zbudować", () => {
    const one = (shape: unknown) => withWire((w) => { w.p = [[shape, shape, []]]; });
    rejects(one(["e", -0.5, 0, 0.5, 0, 0.5]));          // elipsa a = c
    rejects(one(["e", -0.5, 0, 0.5, 0, 11]));           // elipsa absurdalnie duża
    rejects(one(["h", -0.5, 0, 0.5, 0, 0.5]));          // hiperbola a = c
    rejects(one(["h", -0.5, 0, 0.5, 0, 0]));            // hiperbola a = 0
    rejects(one(["p", 0.2, 0.2, 0.2, 0.2]));            // ognisko w wierzchołku
    rejects(one(["o", 0, 0, 0.1, 0]));                  // odcinek krótszy niż minimum
    rejects(one(["e", -0.5, 0, 0.5, 0, 0.8, 0, 0.01])); // łuk krótszy niż minimum
    rejects(one(["x", 0, 0, 1, 1]));                    // nieznany rodzaj
    rejects(one(["e", -0.5, 0, 0.5]));                  // za mało liczb
  });

  it("liczby z więcej niż 4 miejscami po przecinku i niemal zerowe są odrzucane", () => {
    const one = (shape: unknown) => withWire((w) => { w.p = [[shape, shape, []]]; });
    rejects(one(["h", -0.5, 0, 0.5, 0, 1e-300]));        // a > 0, ale 1/a² to nieskończoność
    rejects(one(["e", -0.123456789, 0, 0.5, 0, 0.8]));   // za dużo miejsc po przecinku
    rejects(withWire((w) => { w.b = [0.123456789, 0]; }));
  });

  it("szkic może nie mieć elementów gracza — poziom do linku musi mieć co najmniej jeden", () => {
    const pusty = withWire((w) => { w.p = []; });
    expect(decodeLevel(pusty).ok).toBe(false);
    const d = decodeLevel(pusty, { draft: true });
    expect(d.ok && d.level.pieces).toEqual([]);
    // reszta walidacji obowiązuje też szkic
    expect(decodeLevel(withWire((w) => { w.p = []; w.h = [2, 0]; }), { draft: true }).ok).toBe(false);
  });

  it("za dużo i za mało elementów, za dużo przeszkód", () => {
    const p = toWire(base).p;
    if (!Array.isArray(p)) throw new Error("brak elementów");
    rejects(withWire((w) => { w.p = []; }));
    rejects(withWire((w) => { w.p = Array.from({ length: MAX_PIECES + 1 }, () => p[0]); }));
    rejects(withWire((w) => { w.o = Array.from({ length: MAX_OBSTACLES + 1 }, () => ["o", -0.9, -0.9, -0.5, -0.9]); }));
  });

  it("blokady: nieistniejący uchwyt, powtórzona, przesunięty zablokowany uchwyt", () => {
    const e = ["e", -0.5, 0, 0.5, 0, 0.8];
    const moved = ["e", -0.4, 0, 0.5, 0, 0.8];
    rejects(withWire((w) => { w.p = [[e, e, ["ognisko"]]]; }));            // parabola ma „ognisko", elipsa nie
    rejects(withWire((w) => { w.p = [[e, e, ["rozmiar", "rozmiar"]]]; }));
    rejects(withWire((w) => { w.p = [[e, moved, ["ognisko1"]]]; }));
    expect(decodeLevel(withWire((w) => { w.p = [[e, moved, ["ognisko2"]]]; })).ok).toBe(true);
  });

  it("start i rozwiązanie różnych rodzajów albo łuk tylko po jednej stronie", () => {
    const e = ["e", -0.5, 0, 0.5, 0, 0.8];
    rejects(withWire((w) => { w.p = [[e, ["p", 0.5, 0, 0.8, 0], []]]; }));
    rejects(withWire((w) => { w.p = [[e, [...e, 0, 1], []]]; }));
  });

  it("strzał: szerokość wachlarza poza (0, 2π], zły zapis", () => {
    rejects(withWire((w) => { w.s = [1, 0]; }));
    rejects(withWire((w) => { w.s = [1, 7]; }));
    rejects(withWire((w) => { w.s = [1, 2, 3]; }));
    rejects(withWire((w) => { w.s = 1; }));
  });

  // Kod przychodzi od obcych: nic, co da się wpisać w adres, nie może wywrócić gry.
  it("tysiące losowo popsutych kodów: odczyt nigdy nie rzuca, a przyjęty poziom da się zbudować", () => {
    const next = rng(20261030);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const edge = [0, -0, 1, -1, 1e-300, 1e300, 0.5, 1e-4, 0.12345, 2];
    // zamienia jedną losową liczbę (gdziekolwiek w zagnieżdżonych tablicach) na wartość brzegową
    const numberPaths: (string | number)[][] = [];
    const collect = (v: unknown, path: (string | number)[]) => {
      if (typeof v === "number") numberPaths.push(path);
      else if (Array.isArray(v)) v.forEach((x, i) => collect(x, [...path, i]));
      else if (typeof v === "object" && v !== null) Object.entries(v).forEach(([k, x]) => collect(x, [...path, k]));
    };
    const mutateNumber = (sample: SharedLevel): string => {
      const w = toWire(sample);
      numberPaths.length = 0;
      collect(w, []);
      const path = numberPaths[Math.floor(next() * numberPaths.length)];
      let node: unknown = w;
      for (const key of path.slice(0, -1)) {
        node = (node as Record<string | number, unknown>)[key];
      }
      (node as Record<string | number, unknown>)[path[path.length - 1]] = edge[Math.floor(next() * edge.length)];
      return fromWire(w);
    };
    const total = 4000;
    let accepted = 0;
    for (let i = 0; i < total; i++) {
      const sample = SAMPLES[i % SAMPLES.length];
      const code = encodeLevel(sample);
      const at = Math.floor(next() * code.length);
      const variant = i % 4;
      const broken = variant === 0 ? code.slice(0, at)
        : variant === 1 ? code.slice(0, at) + alphabet[Math.floor(next() * alphabet.length)] + code.slice(at + 1)
        : variant === 2 ? code.slice(0, at) + code.slice(at + 1)
        : mutateNumber(sample);
      const d = decodeLevel(broken);
      if (d.ok) {
        accepted++;
        expect(() => encodeLevel(d.level)).not.toThrow();
        const shapes = [...d.level.pieces.flatMap((p) => [p.start, p.solution]), ...d.level.obstacles];
        for (const shape of shapes) {
          expect(() => shapeToPiece(shape)).not.toThrow();
          for (const v of Object.values(shapeConic(shape))) expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
    // większość zmian psuje JSON albo walidację; część (np. zmieniona cyfra) daje inny poprawny poziom
    expect(accepted).toBeLessThan(total);
    expect(accepted).toBeGreaterThan(0);
  });
});

describe("kodek — kształty stałe każdego rodzaju", () => {
  it("okrąg, banda, elipsa z łukiem, parabola i hiperbola jako przeszkody przechodzą zapis", () => {
    const s: SharedLevel = {
      ...SAMPLES[0],
      obstacles: [
        circle(vec(0, 0.45), 0.12),
        segment(vec(-0.9, -0.9), vec(-0.6, -0.9)),
        arcEllipse(vec(-0.6, 0.6), vec(-0.3, 0.6), 0.2, 0, Math.PI),
        parabola(vec(0.6, -0.6), vec(0.8, -0.6), PARABOLA_SPAN),
        hyperbola(vec(0.6, 0.85), vec(0.9, 0.85), 0.1, 1, HYPERBOLA_SPAN),
        ellipse(vec(0.7, 0.2), vec(0.8, 0.2), 0.08),
      ],
    };
    expect(decoded(encodeLevel(s))).toEqual(roundShared(s));
  });
});
