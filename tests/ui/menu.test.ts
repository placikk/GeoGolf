import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { vec } from "../../src/core/vec";
import {
  ACTION_BAND, COMMUNITY_TILE_H, MENU_BUTTON, Rect, SECTION_HEADER_H, TOP_BAND, cardLayout, clampScroll, communityLayout,
  editAction, helpButton, hitCommunity, hitRect, hitTile, inActionBand, isTap, tabRects,
  menuLayout, playArea, resultBanner, settingsButton, settingsLayout, TILE_DESCENT, TILE_LINE_H, TILE_TITLE_Y, tileTitle, titleLineCount, winAction,
  winLabels, wrapByWords,
} from "../../src/ui/menu";
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

describe("przycisk ustawień i ekran ustawień", () => {
  const overlapR = (a: Rect, b: Rect) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  for (const [w, h] of [[375, 667], [390, 664], [664, 390], [1280, 720]] as const) {
    it(`${w}×${h}: ⚙ w prawym górnym rogu, ≥ 44 px, nie nachodzi na ☰ ani na planszę`, () => {
      const b = settingsButton(w);
      expect(b.x + b.w).toBeLessThanOrEqual(w);
      expect(b.x).toBeGreaterThan(w / 2);
      expect(b.y).toBeLessThan(20);
      expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(44);
      expect(overlapR(b, MENU_BUTTON)).toBe(false);
      const cam = makeCamera(w, h, 0.06, playArea(h));
      const tl = cam.toScreen(vec(-1, 1)), br = cam.toScreen(vec(1, -1));
      expect(overlapR(b, { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y })).toBe(false);
    });

    it(`${w}×${h}: wiersze ustawień mieszczą się, są celami ≥ 44 px i nie nachodzą na nic`, () => {
      const rows = settingsLayout(w, h, 2);
      rows.forEach((r, i) => {
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h, `wiersz ${i}`).toBe(true);
        expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(44);
        expect(overlapR(r, MENU_BUTTON)).toBe(false);
        expect(overlapR(r, settingsButton(w))).toBe(false);
        rows.slice(i + 1).forEach((u) => expect(overlapR(r, u)).toBe(false));
      });
      rows.forEach((r, i) => expect(hitTile(rows, center(r))).toBe(i));
      expect(hitTile(rows, vec(w / 2, h - 2))).toBeNull();
    });
  }
});

describe("dolny pas w edycji", () => {
  const w = 390, h = 844;
  it("lewa połowa to reset, prawa to sprawdź", () => {
    expect(editAction(vec(50, h * 0.93), w, h)).toBe("reset");
    expect(editAction(vec(340, h * 0.93), w, h)).toBe("sprawdz");
  });

  it("dotknięcie ponad pasem nic nie robi; granica pasa należy już do pasa", () => {
    expect(editAction(vec(50, h * 0.5), w, h)).toBeNull();
    expect(editAction(vec(340, h * ACTION_BAND - 1), w, h)).toBeNull();
    expect(editAction(vec(340, h * ACTION_BAND), w, h)).toBe("sprawdz");
  });

  it("inActionBand: granica pasa jest już w pasie, piksel wyżej jeszcze nie", () => {
    expect(inActionBand(vec(50, h * ACTION_BAND - 1), h)).toBe(false);
    expect(inActionBand(vec(50, h * ACTION_BAND), h)).toBe(true);
    expect(inActionBand(vec(50, h * ACTION_BAND + 10), h)).toBe(true);
  });

  it("editAction zgadza się z inActionBand: null dokładnie wtedy, gdy poza pasem", () => {
    for (const y of [h * 0.5, h * ACTION_BAND - 1, h * ACTION_BAND, h * ACTION_BAND + 10, h - 1]) {
      for (const x of [10, w / 2, w - 10]) {
        const p = vec(x, y);
        expect(editAction(p, w, h) === null).toBe(!inActionBand(p, h));
      }
    }
  });
});

describe("tekst ekranu wygranej", () => {
  it("nie ma już zdania o ośmiu torach (decyzja właściciela)", () => {
    const src = readFileSync("src/ui/screens.ts", "utf8");
    expect(src.includes("Osiem torów")).toBe(false);
  });
});

describe("napisy po dowodzie", () => {
  it("wiele piłek: liczba mnoga i licznik chybionych", () => {
    expect(resultBanner(8, 0).title).toBe("Wpadły wszystkie");
    expect(resultBanner(8, 3)).toEqual({ title: "Nie wszystkie", note: "Chybiło 3 z 8. Zobacz, którędy." });
  });

  it("jedna piłka: liczba pojedyncza, bez „1 z 1\"", () => {
    expect(resultBanner(1, 0).title).toBe("Wpadła");
    expect(resultBanner(1, 1)).toEqual({ title: "Chybiła", note: "Zobacz, którędy poleciała." });
  });
});

describe("przycisk „?\"", () => {
  for (const w of [320, 390, 844, 1280]) {
    it(`szerokość ${w}: wygodny cel dotykowy, na środku u góry, nie wchodzi na ☰ ani ⚙`, () => {
      const b = helpButton(w);
      expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(44);
      expect(b.x + b.w / 2).toBeCloseTo(w / 2, 9);
      expect(b.y + b.h).toBeLessThanOrEqual(TOP_BAND);
      expect(overlap(b, MENU_BUTTON)).toBe(false);
      expect(overlap(b, settingsButton(w))).toBe(false);
    });
  }
});

describe("plansza z zasadą — układ rysunków", () => {
  for (const [name, w, h] of [["pion", 390, 844], ["poziom", 844, 390], ["mały", 320, 568]] as const) {
    for (const n of [1, 2]) {
      it(`${name}, ${n === 1 ? "jeden rysunek" : "dwa rysunki"}: kwadraty pod tekstem, nad „Gram", bez nakładania`, () => {
        const rs = cardLayout(w, h, n);
        expect(rs).toHaveLength(n);
        rs.forEach((r, i) => {
          expect(r.w).toBeCloseTo(r.h, 9);
          expect(r.w, `rysunek ${i}`).toBeGreaterThan(100);
          expect(r.x >= 0 && r.x + r.w <= w, `rysunek ${i} w poziomie`).toBe(true);
          expect(r.y, `rysunek ${i} pod tekstem`).toBeGreaterThanOrEqual(150);
          expect(r.y + r.h, `rysunek ${i} nad pasem`).toBeLessThanOrEqual(h * ACTION_BAND);
          rs.slice(i + 1).forEach((u) => expect(overlap(r, u)).toBe(false));
        });
      });
    }
  }
});

// sztuczna czcionka: każdy znak ma szerokość równą rozmiarowi czcionki × 0,5 (13 px → 6,5 px na znak)
const measureAt = (size: number) => (t: string) => t.length * size * 0.5;

describe("wrapByWords", () => {
  const measure = measureAt(10); // 5 px na znak

  it("zawija po słowach, gdy słowa się mieszczą", () => {
    expect(wrapByWords("Teraz rozmiar ma znaczenie", 70, measure)).toEqual(["Teraz rozmiar", "ma znaczenie"]);
  });

  it("dzieli słowo dłuższe niż cała linia, żeby nic nie wystawało poza kafelek", () => {
    const lines = wrapByWords("Współogniskowe", 40, measure);
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((l) => expect(measure(l)).toBeLessThanOrEqual(40));
    expect(lines.map((l) => l.replace(/-$/, "")).join("")).toBe("Współogniskowe");
  });
});

describe("tileTitle — tytuł w kafelku menu", () => {
  it("zostawia pełną czcionkę, gdy każde słowo się mieści", () => {
    expect(tileTitle("Dwa ogniska", 120, measureAt)).toEqual({ size: 13, lines: ["Dwa ogniska"] });
  });

  it("zmniejsza czcionkę, zanim podzieli słowo", () => {
    // „Współogniskowe" (14 znaków): 91 px przy 13 px, 77 px przy 11 px
    expect(tileTitle("Współogniskowe", 87, measureAt)).toEqual({ size: 12, lines: ["Współogniskowe"] });
  });

  it("na bardzo wąskim kafelku dzieli słowo przy najmniejszej czcionce", () => {
    const { size, lines } = tileTitle("Współogniskowe", 64, measureAt);
    expect(size).toBe(11);
    lines.forEach((l) => expect(measureAt(11)(l)).toBeLessThanOrEqual(64));
  });

  it("tytuł, który się nie mieści, kończy się wielokropkiem w granicach kafelka", () => {
    const { size, lines } = tileTitle("Rozmiar bez znaczenia", 87, measureAt, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0].endsWith("…")).toBe(true);
    expect(measureAt(size)(lines[0])).toBeLessThanOrEqual(87);
  });

  it("wielokropek wypełnia linię resztą tytułu, a nie tylko pierwszym słowem", () => {
    // „Dwa ogniska" przy 50 px zawija się na „Dwa" / „ogniska" — skrót ma brzmieć „Dwa og…"
    const { size, lines } = tileTitle("Dwa ogniska", 50, measureAt, 1);
    expect(lines[0]).toBe("Dwa og…");
    expect(measureAt(size)(lines[0])).toBeLessThanOrEqual(50);
  });

  it("bez miejsca na tytuł zostaje sam numer", () => {
    expect(tileTitle("Dwa ogniska", 120, measureAt, 0).lines).toEqual([]);
  });

  it("titleLineCount: im niższy kafelek, tym mniej linii (0–3)", () => {
    expect(titleLineCount(44)).toBe(0);
    expect(titleLineCount(62)).toBe(1);
    expect(titleLineCount(73)).toBe(2);
    expect(titleLineCount(120)).toBe(3);
  });

  // 27 poziomów na typowych telefonach: przy minimalnej liczbie kolumn kafelki miały ok. 48 px
  // i tytuły wchodziły na następny wiersz (412 × 915) — siatka dostaje wtedy kolumnę więcej
  for (const [w, h] of [[390, 844], [412, 915]]) {
    it(`na ekranie ${w} × ${h} pod numerem mieszczą się dwie linie tytułu`, () => {
      menuLayout(w, h, LEVELS.length).forEach((t) => expect(titleLineCount(t.h)).toBeGreaterThanOrEqual(2));
    });
  }

  it("dodatkowa kolumna nie robi kafelka węższego niż 96 px (360 × 740 zostaje przy 3)", () => {
    const tiles = menuLayout(360, 740, LEVELS.length);
    expect(new Set(tiles.map((t) => t.x)).size).toBe(3);
    tiles.forEach((t) => expect(t.w).toBeGreaterThanOrEqual(96));
  });

  // od starego iPhone'a SE po duże Androidy i poziomy ekran
  for (const [w, h] of [[320, 568], [320, 640], [360, 740], [390, 844], [412, 915], [844, 390]]) {
    it(`żaden tytuł nie wystaje poza kafelek na ekranie ${w} × ${h}`, () => {
      const tiles = menuLayout(w, h, LEVELS.length);
      LEVELS.forEach((lvl, i) => {
        const t = tiles[i];
        const { size, lines } = tileTitle(lvl.title, t.w - 24, measureAt, titleLineCount(t.h));
        lines.forEach((l) => expect(measureAt(size)(l)).toBeLessThanOrEqual(t.w - 24));
        if (lines.length > 0) {
          expect(TILE_TITLE_Y + (lines.length - 1) * TILE_LINE_H + TILE_DESCENT).toBeLessThanOrEqual(t.h);
        }
      });
    });
  }
});

describe("zakładki menu", () => {
  for (const w of [320, 390, 844]) {
    it(`szerokość ${w}: dwie zakładki ≥ 44 px, obok siebie, bez ☰ i ⚙`, () => {
      const [a, b] = tabRects(w);
      for (const t of [a, b]) {
        expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
        expect(overlap(t, MENU_BUTTON)).toBe(false);
        expect(overlap(t, settingsButton(w))).toBe(false);
        expect(t.y + t.h).toBeLessThanOrEqual(72);
      }
      expect(overlap(a, b)).toBe(false);
      expect(a.x).toBeLessThan(b.x);
    });
  }
});

describe("lista społeczności", () => {
  const W = 390, H = 844;

  it("sekcje jedna pod drugą, kafelki ≥ 44 px, w pasie listy i bez nakładania", () => {
    const l = communityLayout(W, H, [3, 5, 2], 0);
    expect(l.headers.map((h) => h.section)).toEqual([0, 1, 2]);
    expect(l.headers[0].y).toBeLessThan(l.headers[1].y);
    expect(l.tiles).toHaveLength(10);
    l.tiles.forEach((t, i) => {
      expect(Math.min(t.rect.w, t.rect.h), `kafelek ${i}`).toBeGreaterThanOrEqual(44);
      expect(t.rect.x >= 0 && t.rect.x + t.rect.w <= W).toBe(true);
      l.tiles.slice(i + 1).forEach((u) => expect(overlap(t.rect, u.rect)).toBe(false));
      // kafelek sekcji leży pod jej nagłówkiem i nad nagłówkiem następnej
      const head = l.headers[t.section];
      expect(t.rect.y).toBeGreaterThanOrEqual(head.y + SECTION_HEADER_H);
      const next = l.headers[t.section + 1];
      if (next !== undefined) expect(t.rect.y + t.rect.h).toBeLessThanOrEqual(next.y);
    });
  });

  it("pusta sekcja zostawia miejsce na napis", () => {
    const l = communityLayout(W, H, [0, 1], 0);
    expect(l.headers[1].y - l.headers[0].y).toBeGreaterThanOrEqual(SECTION_HEADER_H + COMMUNITY_TILE_H);
  });

  it("przewijanie: wszystko przesuwa się o tyle samo, granice przewinięcia", () => {
    const a = communityLayout(W, H, [20, 20, 30], 0);
    const b = communityLayout(W, H, [20, 20, 30], 100);
    expect(b.tiles[5].rect.y).toBeCloseTo(a.tiles[5].rect.y - 100, 9);
    expect(a.maxScroll).toBeGreaterThan(0);
    expect(communityLayout(W, H, [1], 0).maxScroll).toBe(0);
    expect(clampScroll(-5, 50)).toBe(0);
    expect(clampScroll(70, 50)).toBe(50);
    expect(clampScroll(20, 50)).toBe(20);
  });

  it("dotknięcie trafia w kafelek tylko w pasie listy", () => {
    const l = communityLayout(W, H, [4], 0);
    const t = l.tiles[1];
    expect(hitCommunity(l, vec(t.rect.x + 5, t.rect.y + 5))).toEqual(t);
    const przewiniety = communityLayout(W, H, [4], 60);
    const pod = przewiniety.tiles[0];   // wjechał pod zakładki
    expect(pod.rect.y).toBeLessThan(przewiniety.viewport.y);
    expect(hitCommunity(przewiniety, vec(pod.rect.x + 5, pod.rect.y + 2))).toBeNull();
  });

  it("dotknięcie a przeciągnięcie", () => {
    expect(isTap(vec(10, 10), vec(14, 13))).toBe(true);
    expect(isTap(vec(10, 10), vec(10, 30))).toBe(false);
  });
});
