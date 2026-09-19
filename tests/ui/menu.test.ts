import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, hitRect, hitTile, menuLayout, playArea, winAction, winLabels } from "../../src/ui/menu";
import { makeCamera } from "../../src/render/camera";
import { LEVELS } from "../../src/levels";

const center = (r: Rect) => vec(r.x + r.w / 2, r.y + r.h / 2);
const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("menu poziomów", () => {
  for (const [name, w, h, cols] of [["pion", 390, 844, 2], ["poziom", 844, 390, 4]] as const) {
    describe(name, () => {
      const tiles = menuLayout(w, h, 8);

      it(`ma osiem kafelków w ${cols} kolumnach`, () => {
        expect(tiles).toHaveLength(8);
        expect(new Set(tiles.map((t) => t.x)).size).toBe(cols);
      });

      it("kafelki mieszczą się na ekranie, nie nachodzą na siebie ani na przycisk menu", () => {
        tiles.forEach((t, i) => {
          expect(t.x >= 0 && t.y >= 0 && t.x + t.w <= w && t.y + t.h <= h, `kafelek ${i}`).toBe(true);
          expect(overlap(t, MENU_BUTTON), `kafelek ${i} a przycisk`).toBe(false);
          tiles.slice(i + 1).forEach((u, j) => expect(overlap(t, u), `${i} i ${i + 1 + j}`).toBe(false));
        });
      });

      it("każdy kafelek jest wygodnym celem dotykowym (≥ 44 px)", () => {
        for (const t of tiles) expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
      });

      it("kolejność czytania: od lewej do prawej, potem w dół", () => {
        for (let i = 1; i < tiles.length; i++) {
          const a = tiles[i - 1], b = tiles[i];
          expect(b.y > a.y || (b.y === a.y && b.x > a.x)).toBe(true);
        }
      });

      it("dotknięcie środka kafelka zwraca jego numer, a dotknięcie tła nic", () => {
        tiles.forEach((t, i) => expect(hitTile(tiles, center(t))).toBe(i));
        expect(hitTile(tiles, vec(w / 2, 5))).toBeNull();
      });
    });
  }

  it("przycisk menu jest w lewym górnym rogu i ma co najmniej 44 px", () => {
    expect(MENU_BUTTON.x).toBeLessThan(20);
    expect(MENU_BUTTON.y).toBeLessThan(20);
    expect(Math.min(MENU_BUTTON.w, MENU_BUTTON.h)).toBeGreaterThanOrEqual(44);
    expect(hitRect(MENU_BUTTON, center(MENU_BUTTON))).toBe(true);
    expect(hitRect(MENU_BUTTON, vec(200, 200))).toBe(false);
  });
});

describe("ekran wygranej", () => {
  const w = 390, h = 844;
  it("lewa połowa dolnego pasa powtarza poziom, prawa przechodzi dalej", () => {
    expect(winAction(vec(50, h * 0.93), w, h)).toBe("powtorz");
    expect(winAction(vec(340, h * 0.93), w, h)).toBe("nastepny");
  });

  it("dotknięcie ponad dolnym pasem nic nie robi — żadnego przypadkowego przeskoku", () => {
    expect(winAction(vec(50, h * 0.5), w, h)).toBeNull();
    expect(winAction(vec(340, h * 0.2), w, h)).toBeNull();
  });
});

describe("menu z poziomami etapu 2", () => {
  // najniższy popularny telefon w pionie (iPhone SE: 375×667) i ten sam w poziomie
  for (const [w, h] of [[375, 667], [667, 375], [390, 844]] as const) {
    it(`${w}×${h}: wszystkie poziomy mieszczą się i są celami ≥ 44 px`, () => {
      const tiles = menuLayout(w, h, LEVELS.length);
      expect(tiles).toHaveLength(LEVELS.length);
      for (const t of tiles) {
        expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
        expect(t.y + t.h).toBeLessThanOrEqual(h);
      }
    });
  }
});

describe("ekran wygranej na ostatnim poziomie", () => {
  const w = 390, h = 844;
  it("prawa połowa dolnego pasa: na ostatnim poziomie menu, na innych następny", () => {
    expect(winAction(vec(340, h * 0.93), w, h, true)).toBe("menu");
    expect(winAction(vec(340, h * 0.93), w, h, false)).toBe("nastepny");
  });

  it("lewa połowa zawsze powtarza, a dotknięcie ponad pasem nic nie robi", () => {
    expect(winAction(vec(50, h * 0.93), w, h, true)).toBe("powtorz");
    expect(winAction(vec(340, h * 0.5), w, h, true)).toBeNull();
  });

  it("podpisy: następny bez dopisku; na ostatnim menu i podsumowanie zależne od postępu", () => {
    expect(winLabels(false, true)).toEqual({ right: "Następny", note: null });
    expect(winLabels(true, false)).toEqual({ right: "Menu", note: "To był ostatni poziom." });
    expect(winLabels(true, true)).toEqual({ right: "Menu", note: "Wszystkie poziomy ukończone." });
  });
});

describe("miejsce na napisy", () => {
  // telefon w pionie, ten sam w poziomie, komputer, najniższy popularny telefon
  for (const [w, h] of [[390, 664], [664, 390], [1280, 720], [375, 667]] as const) {
    it(`${w}×${h}: plansza leży między banerem a przyciskami i mieści się w szerokości`, () => {
      const cam = makeCamera(w, h, 0.06, playArea(h));
      const topLeft = cam.toScreen(vec(-1, 1));
      const bottomRight = cam.toScreen(vec(1, -1));
      expect(topLeft.y).toBeGreaterThanOrEqual(TOP_BAND);
      expect(bottomRight.y).toBeLessThanOrEqual(h * ACTION_BAND);
      expect(topLeft.x).toBeGreaterThanOrEqual(0);
      expect(bottomRight.x).toBeLessThanOrEqual(w);
      // wyśrodkowana w obszarze gry
      const mid = cam.toScreen(vec(0, 0));
      expect(mid.x).toBeCloseTo(w / 2, 9);
      expect(mid.y).toBeCloseTo((TOP_BAND + h * ACTION_BAND) / 2, 9);
      // obchód w obie strony
      const p = vec(0.37, -0.62);
      const back = cam.toWorld(cam.toScreen(p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    });
  }

  it("bez pasa kamera zachowuje się jak dotąd (środek ekranu)", () => {
    const cam = makeCamera(400, 800);
    expect(cam.toScreen(vec(0, 0)).y).toBeCloseTo(400, 9);
  });
});
