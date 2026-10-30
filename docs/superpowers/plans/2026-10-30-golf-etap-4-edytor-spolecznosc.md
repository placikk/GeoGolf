# Etap 4: edytor, link i poziomy społeczności — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Edytor poziomów z udostępnianiem linkiem (autor musi przejść swój poziom, link niesie dowód), zakładki „Od twórców | Społeczność" z katalogiem dokładanym przez twórcę, poziomami z linków i projektami autora.

**Architecture:** Nowa warstwa `src/share/` (format linku: kodowanie, walidacja, dowód, identyfikator, katalog) i `src/editor/` (stan edytora i jego operacje, uchwyty, zaznaczanie) — czyste funkcje, testowane w Node. `src/ui/collections.ts` trzyma projekty i poziomy z linków w `localStorage`, `src/ui/playlist.ts` — która lista poziomów jest grana. `src/ui/screens.ts` tylko rysuje i rozdziela dotknięcia; okienko „Udostępnij" to jedyny element HTML (`<dialog>` w `index.html`). Rdzeń `src/core/` bez zmian.

**Tech Stack:** TypeScript, Canvas 2D, Vite 8, Vitest 5. Zero zależności produkcyjnych. W przeglądarce: `btoa`/`atob`, `TextEncoder`/`TextDecoder`, `<dialog>`, `navigator.share`, `navigator.clipboard`.

**Spec:** `docs/superpowers/specs/2026-10-30-golf-etap-4-edytor-spolecznosc-design.md`

## Global Constraints

- **Zero zależności produkcyjnych.** Nic nie dochodzi do `dependencies` w `package.json`.
- **Budżet paczki < 100 KB gzip** (`tests/budget.test.ts`). Stan wyjściowy ok. 15.4 KB; po planie ok. 23.8 KB.
- **`src/core/` nie importuje niczego spoza `src/core/`** (`tests/layering.test.ts`); ten plan nie zmienia `src/core/`.
- **`src/share/` i `src/editor/` nie dotykają DOM** — importują z `src/core/`, `src/levels/`, czystego `src/ui/handles.ts` i (tylko `src/editor/interaction.ts`) czystego `src/render/shapes.ts`.
- **Bez rzutowań `as` i bez `!` w nowym kodzie produkcyjnym.** (`as const` na stałych tablicach — dozwolone, to nie rzutowanie typu.)
- **`shadowBlur`/`shadowColor` zakazane** (`tests/render/no-shadow-blur.test.ts`).
- **Wygrana to „wszystkie wpadną"**; żaden test ani warunek nie zależy od jednoczesnego dotarcia ani od liczby odbić.
- **Uchwyty zostają w planszy `[-1, 1]²`** — także w edytorze (piłka, dołek, uchwyty strzału).
- **Komentarze po polsku, tłumaczą „dlaczego" i są prawdziwe.** Fałszywy komentarz to błąd.
- **Pola dotyku ≥ 44 px** (kafelki, przyciski, zakładki).
- **Tekst od obcych rysuje się tylko na płótnie** (`fillText`), nigdy jako HTML; dekodowanie linku nigdy nie rzuca.
- **Commity po polsku**: krótki temat, pusta linia, treść, trailer `Co-Authored-By:` podany w zleceniu; każda część osobnym `-m`. Bez `--amend`.
- **Nie dotykać plików spoza listy zadania**, w szczególności nieśledzonego `do poprawy.txt`.

## Odstępstwa planu od litery specyfikacji (świadome)

1. **Szkic w formacie linku.** Projekt zapisuje się tym samym kodem co link, a `decodeLevel(code, { draft: true })` dopuszcza 0 elementów gracza (autor dopiero zaczyna). Jedna walidacja zamiast dwóch formatów.
2. **`src/editor/interaction.ts` importuje `piecePolyline` z `src/render/shapes.ts`** do zaznaczania stuknięciem — to czysta geometria (bez DOM), a liczenie łamanej krzywej drugi raz byłoby duplikatem.
3. **„Usuń" bez zaznaczenia usuwa cały projekt** (po `window.confirm`), zamiast być nieaktywne (spec §2.2) — inaczej przy limicie 20 projektów nie dałoby się zwolnić miejsca.
4. **Zablokowany uchwyt to pełna kropka w środku uchwytu**, nie kłódka — glif kłódki bywa różny albo nieobecny w czcionkach telefonów (ta sama zasada co rysowany liniami „⚙" i „?").
5. **„Łuk" to przycisk dolnego pasa** (aktywny, gdy zaznaczona jest elipsa niebędąca okręgiem), a **„Udostępnij" zajmuje miejsce „Zagraj"**, gdy projekt jest gotowy — pięć pól ≥ 44 px mieści się na 320 px.
6. **Gra testowa autora:** lewy górny przycisk rysuje się jako „‹" i wraca do edytora; po wygranej dolny pas to „Edytuj | Udostępnij".
7. **`screens.ts` nie jest dzielony** (spec §2.5 dopuszczał wydzielenie `editorScreen.ts`). Logika edytora siedzi w czystych modułach `src/editor/`; w `screens.ts` zostaje rysowanie i rozdzielanie dotknięć, które dzielą stan ekranu (menu, plansza z zasadą, komunikat) — wydzielenie wymagałoby przebudowy całego ekranu.
8. **Link do poziomu, który jest w katalogu, otwiera go w katalogu** (nie dubluje w „Z linków"); własnych projektów autora nie porównujemy — projekt nie ma identyfikatora poziomu, dopóki nie zostanie udostępniony.
9. **Katalog startuje pusty** — dokłada go właściciel (`src/levels/community.ts`); testy procedury działają na przykładowych poziomach (`tests/share/samples.ts`).

## Kalibracja — sprawdzona przed napisaniem planu

Cały plan został przeprowadzony przez autora planu na kopii repozytorium; każdy blok kodu poniżej pochodzi z tej kopii. Po każdym zadaniu `npx tsc --noEmit` był czysty, a `npx vitest run` zielony — liczby testów po zadaniach: 715 → 729 → 740 → 745 → 762 → 773 → 781 → 784 → 790 (stan wyjściowy 691). Paczka po zadaniu 9: 23.83 KB gzip.

Przykładowe poziomy (`tests/share/samples.ts`) — każdy przechodzi dowód przed i po zaokrągleniu, linki 179–316 znaków. Największy poprawny poziom (3 elementy, 8 przeszkód z łukami, tytuł 40 polskich znaków) mieści się w 2000 znaków.

Zadania 8 i 9 (ekran gry) zostały dodatkowo przeklikane w przeglądarce bez okna (Chromium, Playwright z pamięci podręcznej `npx`, poza repozytorium), 390×844, bez błędów w konsoli: zakładka „Społeczność"; otwarcie linku (także w już otwartej karcie, gdy menu jest otwarte); zły link → komunikat; nowy projekt → „Dodaj" → elipsa → zmiana rozmiaru → „Zagraj" → ogniska na piłkę i dołek → „Sprawdź" → wygrana → „Udostępnij" z tytułem → link w schowku → otwarcie linku w nowej karcie pokazuje „Społeczność · <tytuł>".

---

## Zadanie 1: Format poziomu — kodowanie i walidacja

`src/share/codec.ts`: typ poziomu gracza (`SharedLevel`, `SharedShot`), stałe kawałki paraboli i hiperboli, zaokrąglanie do 4 miejsc, zapis do kodu base64url i odczyt z pełną walidacją (nigdy nie rzuca). Tryb szkicu (`{ draft: true }`) dopuszcza brak elementów gracza. Pliki pomocnicze testów: `tests/share/samples.ts` (sześć przykładowych poprawnych poziomów — używają ich też zadania 2–9) i `tests/share/wire.ts` (psucie pojedynczych pól, deterministyczny generator liczb losowych).

**Pliki:**
- Nowy: `src/share/codec.ts`
- Nowy: `tests/share/codec.test.ts`
- Nowy: `tests/share/samples.ts`
- Nowy: `tests/share/wire.ts`

**Interfejsy:**
- Produkuje (`src/share/codec.ts`): `type SharedShot = { kind: "360" } | { kind: "wachlarz"; center; width } | { kind: "jedna"; center }`; `interface SharedLevel { title; ball; hole; shot; pieces: PlayerPiece[]; obstacles: Shape[] }`; `PARABOLA_SPAN`, `HYPERBOLA_SPAN`, `MAX_PIECES = 3`, `MAX_OBSTACLES = 8`, `MAX_TITLE = 40`; `round4(x)`, `roundShared(l)`, `encodeLevel(l): string`, `decodeLevel(code, opts?: { draft?: boolean }): DecodeResult` (`{ ok: true; level } | { ok: false; reason }`), `lockedValues(shape, handle): number[]`, `cleanTitle(t): string`.
- Produkuje (testy): `SAMPLES: SharedLevel[]` (`tests/share/samples.ts`); `toWire`, `fromWire`, `fromJsonText`, `rng` (`tests/share/wire.ts`).

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Nowy plik `tests/share/codec.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { arcEllipse, circle, ellipse, hyperbola, parabola, segment } from "../../src/levels";
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
  it("tysiące losowo popsutych kodów: odczyt nigdy nie rzuca, a przyjęty kod daje się zapisać", () => {
    const next = rng(20261030);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let accepted = 0;
    for (let i = 0; i < 3000; i++) {
      const code = encodeLevel(SAMPLES[i % SAMPLES.length]);
      const at = Math.floor(next() * code.length);
      const variant = i % 3;
      const broken = variant === 0 ? code.slice(0, at)
        : variant === 1 ? code.slice(0, at) + alphabet[Math.floor(next() * alphabet.length)] + code.slice(at + 1)
        : code.slice(0, at) + code.slice(at + 1);
      const d = decodeLevel(broken);
      if (d.ok) {
        accepted++;
        expect(() => encodeLevel(d.level)).not.toThrow();
      }
    }
    // większość zmian psuje JSON albo walidację; część (np. zmieniona cyfra) daje inny poprawny poziom
    expect(accepted).toBeLessThan(3000);
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
```

Nowy plik `tests/share/samples.ts` — cała zawartość:

```ts
import { vec } from "../../src/core/vec";
import { arcEllipse, circle, ellipse, hyperbola, parabola, segment } from "../../src/levels";
import { HYPERBOLA_SPAN, PARABOLA_SPAN, SharedLevel } from "../../src/share/codec";

/** Przykładowe poprawne poziomy gracza — po jednym na każdy rodzaj elementu i strzału, plus
 *  łuk, blokady i przeszkody każdego rodzaju. Wszystkie przechodzą dowód (`verifyShared`):
 *  rozwiązanie wygrywa, start nie. Geometrie wzięte z poziomów twórców o tych samych
 *  parametrach dowodu i sprawdzone przy pisaniu planu. */
const luk = arcEllipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, 0, Math.PI);

export const SAMPLES: SharedLevel[] = [
  {
    title: "Elipsa na 360°",
    ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" },
    pieces: [{
      start: ellipse(vec(-0.15, 0.35), vec(0.35, -0.2), 0.8),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8),
      locked: ["rozmiar"],
    }],
    obstacles: [],
  },
  {
    title: "Łuk w wachlarzu",
    ball: vec(-0.5, -0.3), hole: vec(0.5, -0.3), shot: { kind: "wachlarz", center: Math.PI / 2, width: Math.PI },
    pieces: [{
      start: { ...ellipse(vec(-0.25, 0.05), vec(0.35, -0.25), 0.8), arc: luk.arc },
      solution: luk,
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [],
  },
  {
    title: "Dwie parabole",
    ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "wachlarz", center: Math.PI, width: 2 },
    pieces: [{
      start: parabola(vec(-0.42, 0.34), vec(-0.8, 0), PARABOLA_SPAN),
      solution: parabola(vec(-0.5, 0), vec(-0.8, 0), PARABOLA_SPAN),
      locked: ["wierzcholek"],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), PARABOLA_SPAN)],
  },
  {
    title: "Hiperbola przy elipsie",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3), shot: { kind: "wachlarz", center: (215 * Math.PI) / 180, width: 1.4 },
    pieces: [{
      start: hyperbola(vec(-0.2, 0.3), vec(0.19, 0.17), 0.18, 1, HYPERBOLA_SPAN),
      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, HYPERBOLA_SPAN),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, (150 * Math.PI) / 180, (260 * Math.PI) / 180)],
  },
  {
    title: "Lustro",
    ball: vec(-0.5, -0.5), hole: vec(0.3, -0.5), shot: { kind: "jedna", center: Math.PI / 2 },
    pieces: [{
      start: segment(vec(0, 0.5), vec(1, 0.5)),
      solution: segment(vec(-0.73097, 0.20433), vec(-0.26903, 0.39567)),
      locked: [],
    }],
    obstacles: [],
  },
  {
    title: "Przeszkody każdego rodzaju",
    ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" },
    pieces: [{
      start: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.85),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.58),
      locked: ["ognisko1", "ognisko2"],
    }],
    obstacles: [
      circle(vec(0, 0.45), 0.12),
      segment(vec(-0.9, -0.9), vec(-0.6, -0.9)),
      hyperbola(vec(0.6, 0.85), vec(0.9, 0.85), 0.1, 1, HYPERBOLA_SPAN),
    ],
  },
];
```

Nowy plik `tests/share/wire.ts` — cała zawartość:

```ts
import { SharedLevel, encodeLevel } from "../../src/share/codec";

/** Pomocnicze dla testów: zapis poziomu jako obiekt JSON i z powrotem do kodu — żeby psuć
 *  pojedyncze pola, a nie tylko bajty. */
export const toWire = (l: SharedLevel): Record<string, unknown> => {
  const code = encodeLevel(l).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(code), (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

export const fromWire = (w: unknown): string => {
  let bin = "";
  for (const byte of new TextEncoder().encode(JSON.stringify(w))) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Kod z surowym tekstem JSON — dla liczb, których `JSON.stringify` nie zapisze (1e999). */
export const fromJsonText = (text: string): string => {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Deterministyczny generator liczb losowych (mulberry32) — ten sam przebieg przy każdym uruchomieniu. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/share/codec.test.ts`
Oczekiwane: NIE przechodzi — moduł `src/share/codec.ts` nie istnieje.

- [ ] **Krok 3: Implementacja**


Nowy plik `src/share/codec.ts` — cała zawartość:

```ts
import { Vec2, add, dist, scale } from "../core/vec";
import {
  ArcRange, EllipseShape, HyperbolaShape, Handle, MIN_ARC_LENGTH, MovableShape, ParabolaShape, PlayerPiece, SegmentShape,
  Shape, Span,
} from "../levels/types";
import { perimeter } from "../levels/arc";
import { MIN_SEGMENT_LENGTH, handlePositions } from "../ui/handles";

/** Kierunek strzału poziomu gracza — to on wyznacza liczbę piłek, dołek i limit odbić
 *  (`sharedTest`), więc te liczby nie jadą w linku. */
export type SharedShot =
  | { kind: "360" }
  | { kind: "wachlarz"; center: number; width: number }
  | { kind: "jedna"; center: number };

/** Poziom zrobiony w edytorze: podzbiór `Level` bez pól, które wynikają z rodzaju strzału. */
export interface SharedLevel {
  title: string;
  ball: Vec2;
  hole: Vec2;
  shot: SharedShot;
  pieces: PlayerPiece[];
  obstacles: Shape[];
}

/** Stałe kawałki krzywych nieograniczonych w poziomach gracza — edytor ich nie zmienia,
 *  więc nie ma ich w linku. Te same wartości co w etapie 3 (`KAWALEK`, kawałek hiperboli). */
export const PARABOLA_SPAN: Span = { mid: 0, span: 1.2 };
export const HYPERBOLA_SPAN: Span = { mid: 0, span: 1.6 };

export const MAX_PIECES = 3;
export const MAX_OBSTACLES = 8;
export const MAX_TITLE = 40;
const VERSION = 1;

/** Zaokrąglenie do 4 miejsc — link niesie dokładnie te liczby, które przeszły dowód
 *  (edytor zaokrągla PRZED weryfikacją). `+ 0` zamienia −0 na 0, żeby zapis był jednoznaczny. */
export const round4 = (x: number): number => Math.round(x * 1e4) / 1e4 + 0;
const rp = (p: Vec2): Vec2 => ({ x: round4(p.x), y: round4(p.y) });

function roundShape(s: Shape): Shape {
  if (s.kind === "odcinek") return { kind: "odcinek", from: rp(s.from), to: rp(s.to) };
  if (s.kind === "parabola") return { kind: "parabola", focus: rp(s.focus), vertex: rp(s.vertex), span: PARABOLA_SPAN };
  if (s.kind === "hiperbola") {
    return { kind: "hiperbola", f1: rp(s.f1), f2: rp(s.f2), a: round4(s.a), branch: 1, span: HYPERBOLA_SPAN };
  }
  const base: EllipseShape = { kind: "elipsa", f1: rp(s.f1), f2: rp(s.f2), a: round4(s.a) };
  return s.arc === undefined ? base : { ...base, arc: { mid: round4(s.arc.mid), length: round4(s.arc.length) } };
}

function roundShot(s: SharedShot): SharedShot {
  if (s.kind === "360") return s;
  if (s.kind === "jedna") return { kind: "jedna", center: round4(s.center) };
  return { kind: "wachlarz", center: round4(s.center), width: round4(s.width) };
}

/** Poziom po zaokrągleniu — dokładnie to, co odbiorca dostanie z linku. */
export function roundShared(l: SharedLevel): SharedLevel {
  return {
    title: l.title,
    ball: rp(l.ball),
    hole: rp(l.hole),
    shot: roundShot(l.shot),
    pieces: l.pieces.map((p) => ({ start: roundShape(p.start), solution: roundShape(p.solution), locked: [...p.locked] })),
    obstacles: l.obstacles.map(roundShape),
  };
}

// ── zapis ────────────────────────────────────────────────────────────────────────────
// Kształt jako tablica z literą rodzaju: krótko, a kolejność pól jest częścią formatu v1.

type Wire = (string | number)[];

function shapeToWire(s: Shape): Wire {
  if (s.kind === "odcinek") return ["o", s.from.x, s.from.y, s.to.x, s.to.y];
  if (s.kind === "parabola") return ["p", s.focus.x, s.focus.y, s.vertex.x, s.vertex.y];
  if (s.kind === "hiperbola") return ["h", s.f1.x, s.f1.y, s.f2.x, s.f2.y, s.a];
  const e: Wire = ["e", s.f1.x, s.f1.y, s.f2.x, s.f2.y, s.a];
  return s.arc === undefined ? e : [...e, s.arc.mid, s.arc.length];
}

function shotToWire(s: SharedShot): number | number[] {
  if (s.kind === "360") return 0;
  if (s.kind === "jedna") return [s.center];
  return [s.center, s.width];
}

/** UTF-8 → base64url bez dopełnienia. `btoa`/`TextEncoder` są w przeglądarce i w Node —
 *  zero zależności. */
function toBase64Url(text: string): string {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(code)) return null;
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Kod poziomu do linku (`#poziom=<kod>`). Zaokrągla, więc kod zawsze odpowiada poziomowi
 *  z `roundShared`. */
export function encodeLevel(level: SharedLevel): string {
  const l = roundShared(level);
  const wire = {
    v: VERSION,
    t: l.title,
    b: [l.ball.x, l.ball.y],
    h: [l.hole.x, l.hole.y],
    s: shotToWire(l.shot),
    p: l.pieces.map((p) => [shapeToWire(p.start), shapeToWire(p.solution), p.locked]),
    o: l.obstacles.map(shapeToWire),
  };
  return toBase64Url(JSON.stringify(wire));
}

// ── odczyt ───────────────────────────────────────────────────────────────────────────

export type DecodeResult = { ok: true; level: SharedLevel } | { ok: false; reason: string };

/** Błąd walidacji — wyłapywany w `decodeLevel`, nigdy nie wychodzi na zewnątrz. */
class Invalid extends Error {}
function fail(reason: string): never {
  throw new Invalid(reason);
}

const num = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : fail("liczba"));
const inBoard = (p: Vec2): Vec2 => (Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 ? p : fail("punkt poza planszą"));
const point = (xs: unknown[], i: number): Vec2 => inBoard({ x: num(xs[i]), y: num(xs[i + 1]) });
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : fail("tablica"));

/** Długość odcinka w danych: tolerancja na zaokrąglenie do 4 miejsc (0.2 → 0.19998). */
const MIN_SEGMENT_IN_DATA = MIN_SEGMENT_LENGTH - 1e-3;

function wireToShape(x: unknown): Shape {
  const w = arr(x);
  const kind = w[0];
  if (kind === "o") {
    if (w.length !== 5) fail("odcinek");
    const s: SegmentShape = { kind: "odcinek", from: point(w, 1), to: point(w, 3) };
    if (dist(s.from, s.to) < MIN_SEGMENT_IN_DATA) fail("odcinek za krótki");
    return s;
  }
  if (kind === "p") {
    if (w.length !== 5) fail("parabola");
    const s: ParabolaShape = { kind: "parabola", focus: point(w, 1), vertex: point(w, 3), span: PARABOLA_SPAN };
    if (dist(s.focus, s.vertex) < 1e-3) fail("parabola bez ogniskowej");
    return s;
  }
  if (kind === "h") {
    if (w.length !== 6) fail("hiperbola");
    const s: HyperbolaShape = {
      kind: "hiperbola", f1: point(w, 1), f2: point(w, 3), a: num(w[5]), branch: 1, span: HYPERBOLA_SPAN,
    };
    if (!(s.a > 0 && s.a < dist(s.f1, s.f2) / 2)) fail("hiperbola: a poza (0, c)");
    return s;
  }
  if (kind === "e") {
    if (w.length !== 6 && w.length !== 8) fail("elipsa");
    const base: EllipseShape = { kind: "elipsa", f1: point(w, 1), f2: point(w, 3), a: num(w[5]) };
    if (!(base.a > dist(base.f1, base.f2) / 2) || base.a > 10) fail("elipsa: a poza (c, 10]");
    if (w.length === 6) return base;
    const arc: ArcRange = { mid: num(w[6]), length: num(w[7]) };
    if (arc.length < MIN_ARC_LENGTH || arc.length > perimeter(base) - MIN_ARC_LENGTH) fail("łuk");
    return { ...base, arc };
  }
  return fail("nieznany kształt");
}

function wireToShot(x: unknown): SharedShot {
  if (x === 0) return { kind: "360" };
  const w = arr(x);
  if (w.length === 1) return { kind: "jedna", center: num(w[0]) };
  if (w.length === 2) {
    const width = num(w[1]);
    if (!(width > 0 && width <= 2 * Math.PI)) fail("szerokość wachlarza");
    return { kind: "wachlarz", center: num(w[0]), width };
  }
  return fail("strzał");
}

/** Liczby, które zablokowany uchwyt trzyma w miejscu — muszą być takie same w starcie
 *  i rozwiązaniu, inaczej poziom byłby po cichu nie do wygrania (gracz nie ruszy uchwytu). */
export function lockedValues(s: MovableShape, h: Handle): number[] {
  const p = (v: Vec2): number[] => [v.x, v.y];
  if (s.kind === "odcinek") {
    if (h === "koniec1") return p(s.from);
    if (h === "koniec2") return p(s.to);
    return p(scale(add(s.from, s.to), 0.5));
  }
  if (s.kind === "parabola") return h === "ognisko" ? p(s.focus) : p(s.vertex);
  if (h === "ognisko1") return p(s.f1);
  if (h === "ognisko2") return p(s.f2);
  if (h === "rozmiar") return [s.a];
  // początek i koniec łuku: łuk opisany środkiem i długością, więc cały łuk
  return s.kind === "elipsa" && s.arc !== undefined ? [s.arc.mid, s.arc.length] : [];
}

function wireToPiece(x: unknown): PlayerPiece {
  const w = arr(x);
  if (w.length !== 3) fail("element");
  const start = wireToShape(w[0]);
  const solution = wireToShape(w[1]);
  if (start.kind !== solution.kind) fail("start i rozwiązanie różnych rodzajów");
  if ((start.kind === "elipsa" && start.arc !== undefined) !== (solution.kind === "elipsa" && solution.arc !== undefined)) {
    fail("łuk tylko w starcie albo tylko w rozwiązaniu");
  }
  const ids = handlePositions(start).map((h) => h.id);
  const locked = arr(w[2]).map((h): Handle => {
    const id = ids.find((i) => i === h);
    return id ?? fail("blokada nieistniejącego uchwytu");
  });
  if (new Set(locked).size !== locked.length) fail("powtórzona blokada");
  for (const h of locked) {
    const a = lockedValues(start, h);
    const b = lockedValues(solution, h);
    if (a.some((v, i) => Math.abs(v - b[i]) > 1e-9)) fail("zablokowany uchwyt przesunięty");
  }
  return { start, solution, locked };
}

/** Tytuł bez znaków sterujących, przycięty z brzegów; 1–40 znaków. */
export const cleanTitle = (t: string): string => t.replace(/[\u0000-\u001f\u007f]/g, "").trim();

function wireToLevel(x: unknown, minPieces: number): SharedLevel {
  if (typeof x !== "object" || x === null || Array.isArray(x)) fail("obiekt");
  const o: Record<string, unknown> = { ...x };
  if (o.v !== VERSION) fail("wersja");
  const title = typeof o.t === "string" ? cleanTitle(o.t) : fail("tytuł");
  if (title.length < 1 || [...title].length > MAX_TITLE) fail("długość tytułu");
  const b = arr(o.b);
  const h = arr(o.h);
  if (b.length !== 2 || h.length !== 2) fail("piłka lub dołek");
  const pieces = arr(o.p).map(wireToPiece);
  const obstacles = arr(o.o).map(wireToShape);
  if (pieces.length < minPieces || pieces.length > MAX_PIECES) fail("liczba elementów");
  if (obstacles.length > MAX_OBSTACLES) fail("liczba przeszkód");
  return { title, ball: point(b, 0), hole: point(h, 0), shot: wireToShot(o.s), pieces, obstacles };
}

/** Kod z linku → poziom albo powód odrzucenia. Nigdy nie rzuca — kod pochodzi od obcych.
 *  `draft`: szkic z edytora — ten sam format i ta sama walidacja, ale wolno mu nie mieć
 *  jeszcze żadnego elementu gracza (autor dopiero zaczyna). Link do szkicu nie powstaje
 *  nigdy — „Udostępnij" wymaga poziomu, który przeszedł dowód. */
export function decodeLevel(code: string, opts: { draft?: boolean } = {}): DecodeResult {
  const text = fromBase64Url(code);
  if (text === null) return { ok: false, reason: "zły zapis" };
  try {
    return { ok: true, level: wireToLevel(JSON.parse(text), opts.draft === true ? 0 : 1) };
  } catch (e) {
    return { ok: false, reason: e instanceof Invalid ? e.message : "zły zapis" };
  }
}
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 715 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/share/codec.ts tests/share/codec.test.ts tests/share/samples.ts tests/share/wire.ts
git commit -m "feat(link): format poziomu gracza - kodowanie i walidacja" -m "JSON z wersja, zaokraglony do 4 miejsc, w base64url. Odczyt waliduje kazde pole i nigdy nie rzuca; tryb szkicu dopuszcza brak elementow." -m "<trailer ze zlecenia>"
```

---

## Zadanie 2: Dowód, identyfikator i link

`src/share/verify.ts`: parametry dowodu z rodzaju strzału, poziom gracza jako `Level`, dowód „rozwiązanie wygrywa, start nie" (`verifyShared`, ta sama funkcja dla edytora, linku i katalogu), identyfikator `spol-` + FNV-1a, budowa linku i odczyt kodu z końcówki adresu, `openCode` (odkodowanie + walidacja + dowód + identyfikator z kodu kanonicznego).

**Pliki:**
- Nowy: `src/share/verify.ts`
- Nowy: `tests/share/verify.test.ts`

**Interfejsy:**
- Konsumuje: z zadania 1 — `SharedLevel`, `SharedShot`, `decodeLevel`, `encodeLevel`.
- Produkuje: `sharedTest(shot): Level["test"]`, `sharedToLevel(l, id): Level`, `solvesLevel(level, pieces): boolean`, `verifyShared(l): { ok: true } | { ok: false; reason }`, `levelId(code): string`, `linkFor(base, code): string`, `codeFromHash(hash): string | null`, `openCode(code): Opened` (`{ ok: true; code; shared; level } | { ok: false; reason }`).

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Nowy plik `tests/share/verify.test.ts` — cała zawartość:

```ts
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
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/share/verify.test.ts`
Oczekiwane: NIE przechodzi — moduł `src/share/verify.ts` nie istnieje.

- [ ] **Krok 3: Implementacja**


Nowy plik `src/share/verify.ts` — cała zawartość:

```ts
import { runProof } from "../core/verify";
import { HOLE_RADIUS, Level, MovableShape } from "../levels/types";
import { levelCurves, shapeAxisAngle } from "../levels/shape";
import { SharedLevel, SharedShot, decodeLevel, encodeLevel } from "./codec";

/** Parametry dowodu wynikające z rodzaju strzału — te same co w poziomach twórców:
 *  wachlarz i 360° jak etapy 1–3, jedna piłka jak etap 0 (większy dołek, mniej odbić). */
export function sharedTest(shot: SharedShot): Level["test"] {
  return shot.kind === "jedna"
    ? { balls: 1, maxBounces: 3, holeRadius: 1.5 * HOLE_RADIUS }
    : { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };
}

const sharedSector = (shot: SharedShot): Level["sector"] =>
  shot.kind === "360" ? undefined
  : shot.kind === "jedna" ? { center: shot.center, width: 0 }
  : { center: shot.center, width: shot.width };

/** Poziom gracza jako zwykły `Level` — gra, menu i postęp nie odróżniają go od poziomów twórców. */
export function sharedToLevel(l: SharedLevel, id: string): Level {
  return {
    id, title: l.title, hint: "", ball: l.ball, hole: l.hole,
    pieces: l.pieces, obstacles: l.obstacles,
    sector: sharedSector(l.shot), test: sharedTest(l.shot),
  };
}

/** Ten sam dowód co w grze (`src/ui/game.ts`): oś pierwszego elementu jako baza strzału 360°.
 *  Kształt, którego nie da się zbudować, nie rozwiązuje niczego (zamiast rzucać). */
export function solvesLevel(level: Level, pieces: MovableShape[]): boolean {
  try {
    return runProof({
      ball: level.ball, hole: level.hole,
      holeRadius: level.test.holeRadius, maxBounces: level.test.maxBounces,
      curves: levelCurves(level, pieces),
      baseAngle: shapeAxisAngle(pieces[0]),
      sector: level.sector, count: level.test.balls,
    }).solved;
  } catch {
    return false;
  }
}

export type Verdict = { ok: true } | { ok: false; reason: string };

/** „Działający poziom": rozwiązanie autora wygrywa, a stan startowy nie. Ta sama funkcja dla
 *  edytora (przed „Udostępnij"), dla otwieranego linku i dla katalogu w testach. */
export function verifyShared(l: SharedLevel): Verdict {
  const level = sharedToLevel(l, "sprawdzany");
  if (!solvesLevel(level, l.pieces.map((p) => p.solution))) return { ok: false, reason: "rozwiązanie nie wygrywa" };
  if (solvesLevel(level, l.pieces.map((p) => p.start))) return { ok: false, reason: "start już wygrywa" };
  return { ok: true };
}

/** FNV-1a 32 bity: krótki, deterministyczny skrót kodu. Kolizje przy kilkudziesięciu poziomach
 *  są praktycznie wykluczone, a identyfikator i tak służy tylko do zapisu postępu. */
export function levelId(code: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `spol-${h.toString(16).padStart(8, "0")}`;
}

const HASH_KEY = "#poziom=";

/** Link do poziomu pod podanym adresem gry (bez końcówki `#…`). */
export const linkFor = (base: string, code: string): string => `${base}${HASH_KEY}${code}`;

/** Kod poziomu z końcówki adresu (`location.hash`) albo `null`. */
export const codeFromHash = (hash: string): string | null =>
  hash.startsWith(HASH_KEY) && hash.length > HASH_KEY.length ? hash.slice(HASH_KEY.length) : null;

export type Opened =
  | { ok: true; code: string; shared: SharedLevel; level: Level }
  | { ok: false; reason: string };

/** Kod z linku albo z katalogu → grywalny poziom. Odkodowanie, walidacja, dowód; identyfikator
 *  z kodu PO ponownym zakodowaniu, więc ten sam poziom ma zawsze ten sam identyfikator. */
export function openCode(code: string): Opened {
  const d = decodeLevel(code);
  if (!d.ok) return d;
  const v = verifyShared(d.level);
  if (!v.ok) return v;
  const canonical = encodeLevel(d.level);
  return { ok: true, code: canonical, shared: d.level, level: sharedToLevel(d.level, levelId(canonical)) };
}
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 729 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/share/verify.ts tests/share/verify.test.ts
git commit -m "feat(link): dowod poziomu gracza, identyfikator i link" -m "Rozwiazanie autora musi wygrac, a start nie. Identyfikator z kodu kanonicznego, wiec ten sam poziom ma zawsze ten sam." -m "<trailer ze zlecenia>"
```

---

## Zadanie 3: Projekty autora i poziomy z linków w pamięci przeglądarki

`src/ui/collections.ts`: lista kodów „Z linków" (najnowszy pierwszy, bez duplikatów po identyfikatorze, do 30, przy odczycie tylko te, które przechodzą dowód) i projekty autora (`{ key, code, ready }`, do 20, szkic musi się odczytać jako szkic, „gotowy" bez dowodu wraca do szkicu). Odporność jak postęp: brak pamięci, wyjątki, śmieci → pusta lista.

**Pliki:**
- Nowy: `src/ui/collections.ts`
- Nowy: `tests/ui/collections.test.ts`

**Interfejsy:**
- Konsumuje: `Store` (`src/ui/progress.ts`), `decodeLevel` (zad. 1), `levelId`, `openCode` (zad. 2).
- Produkuje: `MAX_LINKS = 30`, `MAX_PROJECTS = 20`, `loadLinks(store): string[]`, `addLink(codes, code): string[]`, `saveLinks(store, codes)`, `interface Project { key; code; ready }`, `loadProjects(store): Project[]`, `upsertProject(list, p): Project[] | null`, `removeProject(list, key)`, `saveProjects(store, list)`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Nowy plik `tests/ui/collections.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { Store } from "../../src/ui/progress";
import {
  MAX_LINKS, MAX_PROJECTS, Project, addLink, loadLinks, loadProjects, removeProject, saveLinks, saveProjects, upsertProject,
} from "../../src/ui/collections";
import { encodeLevel } from "../../src/share/codec";
import { levelId } from "../../src/share/verify";
import { SAMPLES } from "../share/samples";
import { fromWire, toWire } from "../share/wire";

const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};
const broken: Store = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

const codes = SAMPLES.map(encodeLevel);
/** Poprawny szkic bez elementów i kod, który nie przechodzi dowodu (start = rozwiązanie). */
const emptyDraft = fromWire({ ...toWire(SAMPLES[0]), p: [] });
const startWins = encodeLevel({ ...SAMPLES[0], pieces: [{ ...SAMPLES[0].pieces[0], start: SAMPLES[0].pieces[0].solution }] });

describe("poziomy z linków", () => {
  it("zapis i odczyt, od najnowszego", () => {
    const s = memory();
    let list: string[] = [];
    for (const c of codes) list = addLink(list, c);
    saveLinks(s, list);
    expect(loadLinks(s)).toEqual([...codes].reverse());
  });

  it("ten sam poziom drugi raz nie dubluje się, tylko wraca na początek", () => {
    const list = addLink(addLink(addLink([], codes[0]), codes[1]), codes[0]);
    expect(list).toEqual([codes[0], codes[1]]);
  });

  it(`najwyżej ${MAX_LINKS} — najstarsze wypadają`, () => {
    let list: string[] = [];
    // różne poziomy: ten sam układ z innym tytułem ma inny kod i inny identyfikator
    for (let i = 0; i < MAX_LINKS + 5; i++) list = addLink(list, encodeLevel({ ...SAMPLES[0], title: `Poziom ${i}` }));
    expect(list).toHaveLength(MAX_LINKS);
    expect(levelId(list[0])).toBe(levelId(encodeLevel({ ...SAMPLES[0], title: `Poziom ${MAX_LINKS + 4}` })));
  });

  it("przy odczycie wypadają kody uszkodzone i nieprzechodzące dowodu", () => {
    const s = memory({ "golf-geometryczny/z-linkow": JSON.stringify([codes[0], "!!!", 42, startWins, emptyDraft, codes[1]]) });
    expect(loadLinks(s)).toEqual([codes[0], codes[1]]);
  });

  it("brak pamięci, wyjątki i śmieci dają pustą listę", () => {
    expect(loadLinks(null)).toEqual([]);
    expect(loadLinks(broken)).toEqual([]);
    expect(() => saveLinks(broken, codes)).not.toThrow();
    for (const raw of ["{", "null", "42", "{\"a\":1}"]) {
      expect(loadLinks(memory({ "golf-geometryczny/z-linkow": raw })), raw).toEqual([]);
    }
  });
});

describe("projekty autora", () => {
  const p = (key: string, code: string, ready = false): Project => ({ key, code, ready });

  it("zapis i odczyt, gotowy zostaje gotowy", () => {
    const s = memory();
    saveProjects(s, [p("a", codes[0], true), p("b", emptyDraft)]);
    expect(loadProjects(s)).toEqual([p("a", codes[0], true), p("b", emptyDraft)]);
  });

  it("„gotowy”, który nie przechodzi dowodu, wraca do szkicu", () => {
    const s = memory();
    saveProjects(s, [p("a", startWins, true)]);
    expect(loadProjects(s)).toEqual([p("a", startWins, false)]);
  });

  it("przy odczycie wypadają wpisy uszkodzone i powtórzone klucze", () => {
    const s = memory({
      "golf-geometryczny/moje": JSON.stringify([p("a", codes[0]), { key: "b" }, p("c", "!!!"), p("a", codes[1]), null, 7]),
    });
    expect(loadProjects(s)).toEqual([p("a", codes[0])]);
  });

  it("upsert: istniejący w miejscu, nowy na początek, ponad limit — null", () => {
    const list = [p("a", codes[0]), p("b", codes[1])];
    expect(upsertProject(list, p("b", codes[2]))).toEqual([p("a", codes[0]), p("b", codes[2])]);
    expect(upsertProject(list, p("c", codes[3]))).toEqual([p("c", codes[3]), ...list]);
    const full = Array.from({ length: MAX_PROJECTS }, (_, i) => p(`k${i}`, codes[0]));
    expect(upsertProject(full, p("nowy", codes[0]))).toBeNull();
    expect(upsertProject(full, p("k3", codes[1]))?.[3]).toEqual(p("k3", codes[1]));
  });

  it("usuwanie po kluczu", () => {
    expect(removeProject([p("a", codes[0]), p("b", codes[1])], "a")).toEqual([p("b", codes[1])]);
  });

  it("brak pamięci i wyjątki", () => {
    expect(loadProjects(null)).toEqual([]);
    expect(loadProjects(broken)).toEqual([]);
    expect(() => saveProjects(broken, [])).not.toThrow();
  });
});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/collections.test.ts`
Oczekiwane: NIE przechodzi — moduł `src/ui/collections.ts` nie istnieje.

- [ ] **Krok 3: Implementacja**


Nowy plik `src/ui/collections.ts` — cała zawartość:

```ts
import { Store } from "./progress";
import { decodeLevel } from "../share/codec";
import { levelId, openCode } from "../share/verify";

/** Poziomy zapamiętane w przeglądarce: projekty autora i poziomy otwarte z linków. Ta sama
 *  odporność co postęp — brak pamięci, wyjątki i uszkodzony zapis dają pustą listę, a każdy
 *  wpis przy odczycie przechodzi tę samą walidację co link (zapis mógł zmienić ktokolwiek). */

const LINKS_KEY = "golf-geometryczny/z-linkow";
const PROJECTS_KEY = "golf-geometryczny/moje";
export const MAX_LINKS = 30;
export const MAX_PROJECTS = 20;

function readJson(store: Store | null, key: string): unknown {
  try {
    const raw = store?.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(store: Store | null, key: string, value: unknown): void {
  try { store?.setItem(key, JSON.stringify(value)); } catch { /* bez pamięci też się gra */ }
}

// ── z linków ─────────────────────────────────────────────────────────────────────────

/** Kody poziomów otwartych z linków, od najnowszego. Zostają tylko te, które dalej
 *  przechodzą dowód — kod kanoniczny, więc ten sam poziom nie pojawi się dwa razy. */
export function loadLinks(store: Store | null): string[] {
  const raw = readJson(store, LINKS_KEY);
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const o = openCode(c);
    if (o.ok) out.push(o.code);
  }
  return dedupe(out).slice(0, MAX_LINKS);
}

const dedupe = (codes: string[]): string[] => {
  const seen = new Set<string>();
  return codes.filter((c) => {
    const id = levelId(c);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/** Dopisuje kod na początek (najnowszy pierwszy); ten sam poziom przesuwa się na początek
 *  zamiast się dublować; najstarsze wypadają za limitem. */
export const addLink = (codes: string[], code: string): string[] => dedupe([code, ...codes]).slice(0, MAX_LINKS);

export const saveLinks = (store: Store | null, codes: string[]): void => writeJson(store, LINKS_KEY, codes);

// ── projekty ─────────────────────────────────────────────────────────────────────────

/** Projekt z edytora. `code` to zapis poziomu w formacie linku (dla szkicu — z dopuszczonym
 *  brakiem elementów); `ready` — przeszedł dowód, więc `code` jest gotowym kodem do linku. */
export interface Project { key: string; code: string; ready: boolean }

/** Projekty autora. Szkic musi się odczytać jako szkic; „gotowy", który nie przechodzi już
 *  dowodu (np. ręcznie zmieniony zapis), wraca do szkicu zamiast zniknąć. */
export function loadProjects(store: Store | null): Project[] {
  const raw = readJson(store, PROJECTS_KEY);
  if (!Array.isArray(raw)) return [];
  const out: Project[] = [];
  const keys = new Set<string>();
  for (const p of raw) {
    if (typeof p !== "object" || p === null) continue;
    const key = "key" in p ? p.key : undefined;
    const code = "code" in p ? p.code : undefined;
    const ready = "ready" in p ? p.ready : undefined;
    if (typeof key !== "string" || typeof code !== "string" || keys.has(key)) continue;
    if (!decodeLevel(code, { draft: true }).ok) continue;
    keys.add(key);
    out.push({ key, code, ready: ready === true && openCode(code).ok });
  }
  return out.slice(0, MAX_PROJECTS);
}

/** Zapisuje projekt: istniejący (ten sam `key`) podmienia w miejscu, nowy dopisuje na początek.
 *  Nowy ponad limit — `null` (edytor nie pozwala wtedy założyć kolejnego). */
export function upsertProject(list: Project[], p: Project): Project[] | null {
  if (list.some((q) => q.key === p.key)) return list.map((q) => (q.key === p.key ? p : q));
  return list.length >= MAX_PROJECTS ? null : [p, ...list];
}

export const removeProject = (list: Project[], key: string): Project[] => list.filter((p) => p.key !== key);

export const saveProjects = (store: Store | null, list: Project[]): void => writeJson(store, PROJECTS_KEY, list);
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 740 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/collections.ts tests/ui/collections.test.ts
git commit -m "feat(pamiec): projekty autora i poziomy z linkow" -m "Odpornosc jak postep; kazdy wpis przy odczycie przechodzi te sama walidacje co link." -m "<trailer ze zlecenia>"
```

---

## Zadanie 4: Katalog społeczności i plansza według mechaniki

`src/levels/community.ts` — pusty katalog z instrukcją dla twórcy (same dane, bez importów); `src/share/catalog.ts` — katalog jako grywalne poziomy; `mechanicCard(level)` w `src/levels/cards.ts` — plansza „?" dla poziomów spoza listy twórców (najtrudniejsza obecna mechanika). Test katalogu jest strażnikiem wydania: każdy wpis musi się otworzyć.

**Pliki:**
- Zmiana: `src/levels/cards.ts`
- Nowy: `src/levels/community.ts`
- Nowy: `src/share/catalog.ts`
- Zmiana: `tests/levels/cards.test.ts`
- Nowy: `tests/share/catalog.test.ts`

**Interfejsy:**
- Konsumuje: `openCode` (zad. 2), `CARDS`, `isCircle`.
- Produkuje: `interface CommunityEntry { link; author }`, `COMMUNITY: CommunityEntry[]`; `interface CatalogLevel { level; code; author }`, `loadCatalog(entries = COMMUNITY): CatalogLevel[]`; `mechanicCard(level: Level): Card | undefined`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Zmiana w `tests/levels/cards.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,7 +1,7 @@
 import { describe, it, expect } from "vitest";
 import { Vec2, dot, norm, sub } from "../../src/core/vec";
-import { CARDS, LEVELS, autoCard, cardFor, introCard, sceneTraces } from "../../src/levels";
+import { CARDS, LEVELS, autoCard, cardFor, introCard, mechanicCard, sceneTraces } from "../../src/levels";
 
 const IDS = LEVELS.map((l) => l.id);
 /** Kierunek ostatniego odcinka toru — dokąd piłka leci po ostatnim odbiciu. */
 const lastDir = (path: Vec2[]): Vec2 => norm(sub(path[path.length - 1], path[path.length - 2]));
@@ -121,4 +121,26 @@ describe("sceny plansz pokazują to, co mówi zdanie", () => {
       expect(t.path.length - 2).toBeGreaterThanOrEqual(1);
     }
   });
 });
+
+describe("plansza dla poziomu społeczności (według mechaniki)", () => {
+  const byId = (id: string) => {
+    const l = LEVELS.find((x) => x.id === id);
+    if (l === undefined) throw new Error(id);
+    return l;
+  };
+
+  it("najtrudniejsza obecna mechanika wygrywa", () => {
+    expect(mechanicCard(byId("zwienczenie-3"))?.id).toBe("hiperbola");     // parabole i hiperbola
+    expect(mechanicCard(byId("teleskop"))?.id).toBe("parabola");
+    expect(mechanicCard(byId("kaskada"))?.id).toBe("kaskada");             // dwa łuki elips
+    expect(mechanicCard(byId("polelipsa"))?.id).toBe("luk");
+    expect(mechanicCard(byId("przeszkoda"))?.id).toBe("elipsa");           // okrąg się nie liczy
+    expect(mechanicCard(byId("za-rogiem"))?.id).toBe("odbicie");           // same odcinki
+  });
+
+  it("liczy też przeszkody, nie tylko elementy gracza", () => {
+    // „druga-strona": gracz ma hiperbolę, ale „wspolne-ognisko" ma ją jako przeszkodę
+    expect(mechanicCard(byId("wspolne-ognisko"))?.id).toBe("hiperbola");
+  });
+});
```

Nowy plik `tests/share/catalog.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { COMMUNITY } from "../../src/levels/community";
import { encodeLevel } from "../../src/share/codec";
import { loadCatalog } from "../../src/share/catalog";
import { openCode } from "../../src/share/verify";
import { SAMPLES } from "./samples";

// Strażnik wydania: każdy wpis katalogu dopisany przez twórcę musi się otworzyć — odkodować
// i przejść dowód. Pusty katalog przechodzi, ale testy niżej sprawdzają samą procedurę na
// przykładowych poziomach, więc strażnik nie jest pusty, gdy katalog wreszcie się zapełni.
describe("katalog społeczności", () => {
  it.each(COMMUNITY.map((e, i) => [i, e] as const))("wpis %i otwiera się i przechodzi dowód", (_i, e) => {
    const o = openCode(e.link);
    expect(o.ok ? "ok" : o.reason).toBe("ok");
    expect(e.author.trim().length).toBeGreaterThan(0);
    expect([...e.author].length).toBeLessThanOrEqual(40);
  });

  it("identyfikatory katalogu są unikalne i rozłączne z poziomami twórców", () => {
    const ids = loadCatalog().map((c) => c.level.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tworcy = new Set(LEVELS.map((l) => l.id));
    for (const id of ids) expect(tworcy.has(id), id).toBe(false);
    expect(loadCatalog()).toHaveLength(COMMUNITY.length);
  });

  it("procedura na przykładach: wpisy odkodowane w tej samej kolejności, z autorem", () => {
    const entries = SAMPLES.map((s, i) => ({ link: encodeLevel(s), author: `Autor ${i}` }));
    const cat = loadCatalog(entries);
    expect(cat.map((c) => c.author)).toEqual(entries.map((e) => e.author));
    expect(cat.map((c) => c.level.title)).toEqual(SAMPLES.map((s) => s.title));
    expect(cat.every((c) => c.level.id.startsWith("spol-"))).toBe(true);
  });

  it("wpis, który się nie otwiera, nie trafia do gry", () => {
    expect(loadCatalog([{ link: "!!!", author: "x" }, { link: encodeLevel(SAMPLES[0]), author: "y" }]).map((c) => c.author))
      .toEqual(["y"]);
  });
});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/share/catalog.test.ts tests/levels/cards.test.ts`
Oczekiwane: NIE przechodzą — brak `src/levels/community.ts`, `src/share/catalog.ts`, `mechanicCard`.

- [ ] **Krok 3: Implementacja**


Zmiana w `src/levels/cards.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,8 +1,8 @@
 import { Vec2, fromAngle, vec } from "../core/vec";
 import { TraceResult, trace } from "../core/trace";
-import { HOLE_RADIUS, Shape } from "./types";
-import { BOARD_WALLS, arcEllipse, ellipse, hyperbola, parabola, segment, shapeToPiece } from "./shape";
+import { HOLE_RADIUS, Level, Shape } from "./types";
+import { BOARD_WALLS, arcEllipse, ellipse, hyperbola, isCircle, parabola, segment, shapeToPiece } from "./shape";
 
 /** Jeden strzał miniscenki: skąd i pod jakim kątem. Zwykle wszystkie z jednej piłki
  *  (wachlarz), ale scena hiperboli strzela z kilku miejsc naraz w jeden punkt. */
 export interface Shot { from: Vec2; angle: number }
@@ -140,4 +140,20 @@ export function cardFor(ids: readonly string[], index: number): Card | undefined
     }
   }
   return found;
 }
+
+/** Plansza dla poziomu spoza listy twórców (społeczność): najtrudniejsza mechanika obecna
+ *  w poziomie — elementy gracza i przeszkody razem — pierwsza pasująca z listy: hiperbola,
+ *  parabola, kaskada (co najmniej dwie elipsy niebędące okręgami), łuk, elipsa, a przy samych
+ *  odcinkach i okręgach — odbicie. Poziomy twórców mają swoją kolejność (`cardFor`). */
+export function mechanicCard(level: Level): Card | undefined {
+  const shapes: Shape[] = [...level.pieces.map((p) => p.start), ...level.obstacles];
+  const ellipses = shapes.filter((s) => s.kind === "elipsa" && !isCircle(s));
+  const id = shapes.some((s) => s.kind === "hiperbola") ? "hiperbola"
+    : shapes.some((s) => s.kind === "parabola") ? "parabola"
+    : ellipses.length >= 2 ? "kaskada"
+    : ellipses.some((s) => s.kind === "elipsa" && s.arc !== undefined) ? "luk"
+    : ellipses.length === 1 ? "elipsa"
+    : "odbicie";
+  return CARDS.find((c) => c.id === id);
+}
```

Nowy plik `src/levels/community.ts` — cała zawartość:

```ts
/** Katalog poziomów społeczności — dokłada go twórca gry. Jak dodać poziom:
 *
 *  1. Ktoś przysyła link `…/#poziom=<kod>`.
 *  2. Dopisz `{ link: "<kod>", author: "<imię>" }` na końcu listy (sam kod, bez `#poziom=`).
 *  3. `npm test` — `tests/share/catalog.test.ts` odkodowuje każdy wpis i puszcza dowód
 *     (rozwiązanie autora wygrywa, start nie); zły wpis zatrzymuje testy, a więc i wydanie
 *     (CI uruchamia testy przed publikacją na GitHub Pages).
 *  4. Commit i wypchnięcie.
 *
 *  Same dane, bez importów — odkodowuje je `src/share/catalog.ts`. */
export interface CommunityEntry { link: string; author: string }

export const COMMUNITY: CommunityEntry[] = [];
```

Nowy plik `src/share/catalog.ts` — cała zawartość:

```ts
import { Level } from "../levels/types";
import { COMMUNITY, CommunityEntry } from "../levels/community";
import { openCode } from "./verify";

export interface CatalogLevel { level: Level; code: string; author: string }

/** Katalog jako grywalne poziomy. Wpis, który się nie otwiera, w grze po prostu się nie
 *  pokazuje — ale testy katalogu go nie przepuszczą, więc do wydania nie dochodzi. */
export function loadCatalog(entries: readonly CommunityEntry[] = COMMUNITY): CatalogLevel[] {
  const out: CatalogLevel[] = [];
  for (const e of entries) {
    const o = openCode(e.link);
    if (o.ok) out.push({ level: o.level, code: o.code, author: e.author });
  }
  return out;
}
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 745 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/community.ts src/share/catalog.ts src/levels/cards.ts tests/share/catalog.test.ts tests/levels/cards.test.ts
git commit -m "feat(katalog): katalog spolecznosci i plansza wedlug mechaniki" -m "Katalog to dane w repozytorium; test odkodowuje kazdy wpis i puszcza dowod, wiec zly wpis zatrzymuje wydanie." -m "<trailer ze zlecenia>"
```

---

## Zadanie 5: Model edytora

`src/editor/model.ts`: stan edytora (start elementów gracza z blokadami, przeszkody, strzał, zaznaczenie) i operacje: dodaj z limitami, usuń zaznaczone, przełącz blokadę (tylko istniejących uchwytów), łuk (pełna ↔ półelipsa, blokady końców znikają z łukiem), cykl strzału; projekt ↔ `SharedLevel`; „Zagraj" (`prepareTest`: brak elementów / start już wygrywa / poziom do zagrania) i wygrana autora (`acceptWin`: zaokrąglone ustawienie musi przejść dowód jeszcze raz).

**Pliki:**
- Nowy: `src/editor/model.ts`
- Nowy: `tests/editor/model.test.ts`

**Interfejsy:**
- Konsumuje: `handlePositions` (`src/ui/handles.ts`), zad. 1 (`roundShared`, `encodeLevel`, `MAX_*`, `*_SPAN`), zad. 2 (`sharedToLevel`, `solvesLevel`, `verifyShared`).
- Produkuje: `EditorPiece`, `Selection`, `EditorState`, `PieceKind`, `ObstacleKind`; `newEditor(title)`, `canAddPiece`, `canAddObstacle`, `addPiece`, `addObstacle`, `removeSelected`, `toggleLock(s, index, id)`, `canToggleArc(s)`, `toggleArc`, `replaceShape(s, sel, shape)`, `cycleShot`, `toShared(s, solution?)`, `fromShared(l)`, `draftCode(s)`, `prepareTest(s): TestStart`, `acceptWin(shared, solution): { ok: true; code } | { ok: false }`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**

Uwaga: w nazwach testów cudzysłów zamykający musi być typograficzny (`„Zagraj”`) — prosty `"` zamknąłby literał napisu (zmierzone: błąd TS1005).

Nowy plik `tests/editor/model.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipse } from "../../src/levels";
import { MAX_OBSTACLES, MAX_PIECES, decodeLevel, roundShared } from "../../src/share/codec";
import { openCode } from "../../src/share/verify";
import {
  EditorState, acceptWin, addObstacle, addPiece, cycleShot, draftCode, fromShared, newEditor, prepareTest, removeSelected,
  toShared, toggleArc, toggleLock,
} from "../../src/editor/model";
import { SAMPLES } from "../share/samples";

const e0 = newEditor("Mój poziom");

describe("edytor — operacje", () => {
  it("nowy poziom: piłka i dołek na osi, bez elementów, strzał 360°", () => {
    expect(e0).toMatchObject({ ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" }, pieces: [], obstacles: [] });
  });

  it("dodawanie zaznacza nowy element; limit 3 elementów i 8 przeszkód", () => {
    let s = e0;
    for (const k of ["elipsa", "parabola", "hiperbola", "odcinek"] as const) s = addPiece(s, k);
    expect(s.pieces.map((p) => p.shape.kind)).toEqual(["elipsa", "parabola", "hiperbola"]);
    expect(s.pieces).toHaveLength(MAX_PIECES);
    expect(s.selected).toEqual({ kind: "element", index: 2 });
    let o = e0;
    for (let i = 0; i < MAX_OBSTACLES + 2; i++) o = addObstacle(o, i % 2 === 0 ? "okrag" : "banda");
    expect(o.obstacles).toHaveLength(MAX_OBSTACLES);
  });

  it("każdy domyślny kształt da się zapisać jako szkic", () => {
    let s = e0;
    for (const k of ["elipsa", "parabola", "odcinek"] as const) s = addPiece(s, k);
    for (const k of ["okrag", "banda", "elipsa", "parabola", "hiperbola"] as const) s = addObstacle(s, k);
    expect(decodeLevel(draftCode(s), { draft: true }).ok).toBe(true);
  });

  it("usuwanie zaznaczonego; bez zaznaczenia nic", () => {
    const s = addObstacle(addPiece(e0, "elipsa"), "okrag");
    expect(removeSelected(s).obstacles).toEqual([]);
    expect(removeSelected(s).pieces).toHaveLength(1);
    expect(removeSelected({ ...s, selected: null })).toEqual({ ...s, selected: null });
  });

  it("blokada: przełącza istniejący uchwyt, nieistniejący ignoruje", () => {
    const s = addPiece(e0, "elipsa");
    const z = toggleLock(s, 0, "rozmiar");
    expect(z.pieces[0].locked).toEqual(["rozmiar"]);
    expect(toggleLock(z, 0, "rozmiar").pieces[0].locked).toEqual([]);
    expect(toggleLock(s, 0, "wierzcholek")).toBe(s);
    expect(toggleLock(s, 5, "rozmiar")).toBe(s);
  });

  it("łuk: pełna elipsa ↔ półelipsa; blokady końców znikają razem z łukiem; okrąg bez łuku", () => {
    let s = addPiece(e0, "elipsa");
    s = toggleArc(s);
    const shape = s.pieces[0].shape;
    expect(shape.kind === "elipsa" && shape.arc !== undefined).toBe(true);
    s = toggleLock(s, 0, "poczatek");
    expect(s.pieces[0].locked).toEqual(["poczatek"]);
    s = toggleArc(s);
    expect(s.pieces[0].locked).toEqual([]);
    const okrag = addObstacle(e0, "okrag");
    expect(toggleArc(okrag)).toBe(okrag);
  });

  it("strzał po kolei: 360° → wachlarz → jedna piłka (ten sam kierunek) → 360°", () => {
    const a = cycleShot(e0);
    expect(a.shot).toEqual({ kind: "wachlarz", center: Math.PI / 2, width: Math.PI / 2 });
    const b = cycleShot(a);
    expect(b.shot).toEqual({ kind: "jedna", center: Math.PI / 2 });
    expect(cycleShot(b).shot).toEqual({ kind: "360" });
  });
});

describe("edytor — zapis, „Zagraj” i wygrana autora", () => {
  /** Edytor z próbki: start jak w próbce, rozwiązanie znane z próbki. */
  const fromSample = (i: number): EditorState => fromShared(SAMPLES[i]);

  it("projekt ↔ poziom gracza: start zostaje startem, wszystko zaokrąglone", () => {
    for (const s of SAMPLES) {
      const shared = toShared(fromShared(s));
      expect(shared.pieces.map((p) => p.start)).toEqual(roundShared(s).pieces.map((p) => p.start));
      // bez wygranej rozwiązanie = start
      expect(shared.pieces.map((p) => p.solution)).toEqual(shared.pieces.map((p) => p.start));
    }
  });

  it("„Zagraj” bez elementów — odmowa", () => {
    expect(prepareTest(e0)).toEqual({ ok: false, reason: "brak elementów" });
  });

  it("„Zagraj”, gdy start już wygrywa — odmowa", () => {
    const s = fromSample(0);
    const wygrany: EditorState = { ...s, pieces: [{ ...s.pieces[0], shape: SAMPLES[0].pieces[0].solution }] };
    expect(prepareTest(wygrany)).toEqual({ ok: false, reason: "start już wygrywa" });
  });

  it.each(SAMPLES.map((s, i) => [s.title, i] as const))("%s: autor przechodzi → gotowy kod, który otwiera się z linku", (_t, i) => {
    const t = prepareTest(fromSample(i));
    if (!t.ok) throw new Error(t.reason);
    const w = acceptWin(t.shared, SAMPLES[i].pieces.map((p) => p.solution));
    if (!w.ok) throw new Error("wygrana nie przeszła dowodu");
    expect(openCode(w.code).ok).toBe(true);
  });

  it("„wygrana”, która po zaokrągleniu nie wygrywa, nie daje kodu", () => {
    const t = prepareTest(fromSample(0));
    if (!t.ok) throw new Error(t.reason);
    expect(acceptWin(t.shared, [ellipse(vec(-0.3, 0.2), vec(0.5, 0), 0.8)])).toEqual({ ok: false });
  });
});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/editor/model.test.ts`
Oczekiwane: NIE przechodzi — moduł `src/editor/model.ts` nie istnieje.

- [ ] **Krok 3: Implementacja**


Nowy plik `src/editor/model.ts` — cała zawartość:

```ts
import { Vec2, vec } from "../core/vec";
import { Handle, Level, MovableShape, Shape } from "../levels/types";
import { arcEllipse, circle, ellipse, hyperbola, isCircle, parabola, segment } from "../levels/shape";
import { handlePositions } from "../ui/handles";
import {
  HYPERBOLA_SPAN, MAX_OBSTACLES, MAX_PIECES, PARABOLA_SPAN, SharedLevel, SharedShot, encodeLevel, roundShared,
} from "../share/codec";
import { sharedToLevel, solvesLevel, verifyShared } from "../share/verify";

/** Element gracza w edytorze: kształt to stan STARTOWY (rozwiązanie powstaje dopiero, gdy
 *  autor przejdzie poziom) i blokady uchwytów. */
export interface EditorPiece { shape: MovableShape; locked: Handle[] }

export type Selection = { kind: "element" | "przeszkoda"; index: number };

export interface EditorState {
  title: string;
  ball: Vec2;
  hole: Vec2;
  shot: SharedShot;
  pieces: EditorPiece[];
  obstacles: Shape[];
  selected: Selection | null;
}

export type PieceKind = "elipsa" | "parabola" | "hiperbola" | "odcinek";
export type ObstacleKind = "okrag" | "banda" | "elipsa" | "parabola" | "hiperbola";

/** Nowy poziom: piłka i dołek na osi, bez elementów, strzał na 360°. */
export const newEditor = (title: string): EditorState => ({
  title, ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" }, pieces: [], obstacles: [], selected: null,
});

/** Domyślny kształt na środku planszy — mały, żeby nie zasłaniał piłki i dołka. */
function defaultShape(kind: PieceKind | ObstacleKind): Shape {
  if (kind === "elipsa") return ellipse(vec(-0.3, 0), vec(0.3, 0), 0.45);
  if (kind === "parabola") return parabola(vec(0, 0), vec(-0.3, 0), PARABOLA_SPAN);
  if (kind === "hiperbola") return hyperbola(vec(-0.3, 0), vec(0.3, 0), 0.15, 1, HYPERBOLA_SPAN);
  if (kind === "okrag") return circle(vec(0, 0), 0.15);
  return segment(vec(-0.3, 0), vec(0.3, 0));
}

export const canAddPiece = (s: EditorState): boolean => s.pieces.length < MAX_PIECES;
export const canAddObstacle = (s: EditorState): boolean => s.obstacles.length < MAX_OBSTACLES;

/** Dodaje element gracza i go zaznacza; ponad limit — stan bez zmian. */
export function addPiece(s: EditorState, kind: PieceKind): EditorState {
  if (!canAddPiece(s)) return s;
  const pieces = [...s.pieces, { shape: defaultShape(kind), locked: [] }];
  return { ...s, pieces, selected: { kind: "element", index: pieces.length - 1 } };
}

export function addObstacle(s: EditorState, kind: ObstacleKind): EditorState {
  if (!canAddObstacle(s)) return s;
  const obstacles = [...s.obstacles, defaultShape(kind)];
  return { ...s, obstacles, selected: { kind: "przeszkoda", index: obstacles.length - 1 } };
}

export function removeSelected(s: EditorState): EditorState {
  const sel = s.selected;
  if (sel === null) return s;
  return sel.kind === "element"
    ? { ...s, pieces: s.pieces.filter((_, i) => i !== sel.index), selected: null }
    : { ...s, obstacles: s.obstacles.filter((_, i) => i !== sel.index), selected: null };
}

/** Przełącza blokadę uchwytu elementu gracza — tylko uchwytu, który ten element ma. */
export function toggleLock(s: EditorState, index: number, id: Handle): EditorState {
  const piece = s.pieces[index];
  if (piece === undefined || !handlePositions(piece.shape).some((h) => h.id === id)) return s;
  const locked = piece.locked.includes(id) ? piece.locked.filter((h) => h !== id) : [...piece.locked, id];
  return { ...s, pieces: s.pieces.map((p, i) => (i === index ? { ...p, locked } : p)) };
}

/** Kształt po zmianie: blokady uchwytów, których już nie ma (np. końców łuku po powrocie
 *  do pełnej elipsy), znikają. */
const keepLocks = (shape: MovableShape, locked: Handle[]): Handle[] => {
  const ids = handlePositions(shape).map((h) => h.id);
  return locked.filter((h) => ids.includes(h));
};

/** Zaznaczona elipsa (nie okrąg): pełna ↔ półelipsa od parametru 0 do π. */
export function toggleArc(s: EditorState): EditorState {
  const sel = s.selected;
  if (sel === null) return s;
  const shape = sel.kind === "element" ? s.pieces[sel.index]?.shape : s.obstacles[sel.index];
  if (shape === undefined || shape.kind !== "elipsa" || isCircle(shape)) return s;
  const next: Shape = shape.arc === undefined ? arcEllipse(shape.f1, shape.f2, shape.a, 0, Math.PI) : ellipse(shape.f1, shape.f2, shape.a);
  return replaceShape(s, sel, next);
}

/** Podmienia kształt elementu albo przeszkody (blokady dopasowane do nowego kształtu). */
export function replaceShape(s: EditorState, sel: Selection, shape: Shape): EditorState {
  if (sel.kind === "przeszkoda") return { ...s, obstacles: s.obstacles.map((o, i) => (i === sel.index ? shape : o)) };
  return {
    ...s,
    pieces: s.pieces.map((p, i) => (i === sel.index ? { shape, locked: keepLocks(shape, p.locked) } : p)),
  };
}

/** Kierunek strzału po kolei: 360° → wachlarz → jedna piłka → 360°. Wachlarz startuje w górę,
 *  ćwierć obrotu szeroki; jedna piłka dziedziczy jego kierunek. */
export function cycleShot(s: EditorState): EditorState {
  const shot: SharedShot = s.shot.kind === "360" ? { kind: "wachlarz", center: Math.PI / 2, width: Math.PI / 2 }
    : s.shot.kind === "wachlarz" ? { kind: "jedna", center: s.shot.center }
    : { kind: "360" };
  return { ...s, shot };
}

/** Projekt edytora jako poziom gracza; bez rozwiązania — rozwiązanie = start (szkic). */
export function toShared(s: EditorState, solution?: MovableShape[]): SharedLevel {
  return roundShared({
    title: s.title, ball: s.ball, hole: s.hole, shot: s.shot,
    pieces: s.pieces.map((p, i) => ({ start: p.shape, solution: solution?.[i] ?? p.shape, locked: p.locked })),
    obstacles: s.obstacles,
  });
}

/** Projekt z zapisu z powrotem do edytora: kształty startowe, bez zaznaczenia. */
export const fromShared = (l: SharedLevel): EditorState => ({
  title: l.title, ball: l.ball, hole: l.hole, shot: l.shot,
  pieces: l.pieces.map((p) => ({ shape: p.start, locked: p.locked })), obstacles: l.obstacles, selected: null,
});

/** Zapis szkicu (format linku z dopuszczonym brakiem elementów). */
export const draftCode = (s: EditorState): string => encodeLevel(toShared(s));

export type TestStart =
  | { ok: true; shared: SharedLevel; level: Level }
  | { ok: false; reason: "brak elementów" | "start już wygrywa" };

/** „Zagraj": zaokrąglony poziom do zagrania przez autora — chyba że nie ma czym grać albo
 *  start już wygrywa (wtedy nie ma czego udowadniać). */
export function prepareTest(s: EditorState): TestStart {
  if (s.pieces.length === 0) return { ok: false, reason: "brak elementów" };
  const shared = toShared(s);
  const level = sharedToLevel(shared, "edytor");
  return solvesLevel(level, shared.pieces.map((p) => p.start))
    ? { ok: false, reason: "start już wygrywa" }
    : { ok: true, shared, level };
}

/** Autor wygrał: jego ustawienie, ZAOKRĄGLONE, musi przejść dowód jeszcze raz — zaokrąglenie
 *  mogło zepsuć wygraną na krawędzi. Wynik to gotowy kod do linku. */
export function acceptWin(shared: SharedLevel, solution: MovableShape[]): { ok: true; code: string } | { ok: false } {
  const withSolution = roundShared({
    ...shared, pieces: shared.pieces.map((p, i) => ({ ...p, solution: solution[i] ?? p.solution })),
  });
  return verifyShared(withSolution).ok ? { ok: true, code: encodeLevel(withSolution) } : { ok: false };
}
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 762 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/editor/model.ts tests/editor/model.test.ts
git commit -m "feat(edytor): model edytora - elementy, blokady, luk, strzal" -m "Zagraj odmawia bez elementow i gdy start wygrywa; wygrana autora po zaokragleniu musi przejsc dowod jeszcze raz." -m "<trailer ze zlecenia>"
```

---

## Zadanie 6: Uchwyty, przeciąganie i zaznaczanie w edytorze

`src/editor/interaction.ts`: wszystkie uchwyty edytora (piłka, dołek, kierunek i szerokość strzału, uchwyty elementów — także zablokowanych — i przeszkód), łapanie najbliższego, przeciąganie przez `applyDrag` z gry z przyskakiwaniem ognisk do piłki, dołka i ognisk innych kształtów, zaznaczanie krzywej najbliższej stuknięciu.

**Pliki:**
- Nowy: `src/editor/interaction.ts`
- Nowy: `tests/editor/interaction.test.ts`

**Interfejsy:**
- Konsumuje: zad. 5 (`EditorState`, `Selection`, `replaceShape`); `applyDrag`, `handlePositions`, `snapTo` (`src/ui/handles.ts`); `piecePolyline` (`src/render/shapes.ts`); `shapeFoci`, `shapeToPiece`.
- Produkuje: `type EditorHandleRef` (`pilka` | `dolek` | `kierunek` | `szerokosc` | `{ target: "element" | "przeszkoda"; index; id }`), `SHOT_REACH = 0.4`, `editorHandles(s)`, `pickEditorHandle(s, world, radius)`, `applyEditorDrag(s, ref, to, snap)`, `selectAt(s, world, radius): Selection | null`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Nowy plik `tests/editor/interaction.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { dist, vec } from "../../src/core/vec";
import { SNAP_RADIUS } from "../../src/levels";
import { addObstacle, addPiece, cycleShot, newEditor } from "../../src/editor/model";
import { SHOT_REACH, applyEditorDrag, editorHandles, pickEditorHandle, selectAt } from "../../src/editor/interaction";

const e0 = newEditor("Test");
const inBoard = (p: { x: number; y: number }) => Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;

describe("uchwyty edytora", () => {
  it("piłka i dołek zawsze; uchwyty strzału zależnie od rodzaju", () => {
    const targets = (s: typeof e0) => editorHandles(s).map((h) => h.ref.target);
    expect(targets(e0)).toEqual(["pilka", "dolek"]);
    expect(targets(cycleShot(e0))).toEqual(["pilka", "dolek", "kierunek", "szerokosc"]);
    expect(targets(cycleShot(cycleShot(e0)))).toEqual(["pilka", "dolek", "kierunek"]);
  });

  it("uchwyty elementów i przeszkód — te same co w grze", () => {
    const s = addObstacle(addPiece(e0, "parabola"), "banda");
    const refs = editorHandles(s).map((h) => h.ref);
    expect(refs).toContainEqual({ target: "element", index: 0, id: "ognisko" });
    expect(refs).toContainEqual({ target: "element", index: 0, id: "wierzcholek" });
    expect(refs).toContainEqual({ target: "przeszkoda", index: 0, id: "srodek" });
  });

  it("uchwyt kierunku leży SHOT_REACH od piłki, a przy ścianie zostaje w planszy", () => {
    const s = cycleShot(e0);
    const kier = editorHandles(s).find((h) => h.ref.target === "kierunek");
    expect(kier && dist(kier.pos, s.ball)).toBeCloseTo(SHOT_REACH, 12);
    const przyScianie = { ...s, ball: vec(-0.5, 0.9) };
    for (const h of editorHandles(przyScianie)) expect(inBoard(h.pos), h.ref.target).toBe(true);
  });

  it("łapanie: najbliższy uchwyt w promieniu, poza nim nic", () => {
    expect(pickEditorHandle(e0, vec(-0.48, 0.01), 0.1)).toEqual({ target: "pilka" });
    expect(pickEditorHandle(e0, vec(0, 0.8), 0.1)).toBeNull();
  });
});

describe("przeciąganie w edytorze", () => {
  it("piłka i dołek idą za palcem, ale nie za planszę", () => {
    expect(applyEditorDrag(e0, { target: "pilka" }, vec(0.2, 0.3), SNAP_RADIUS).ball).toEqual(vec(0.2, 0.3));
    expect(applyEditorDrag(e0, { target: "dolek" }, vec(1.5, -2), SNAP_RADIUS).hole).toEqual(vec(1, -1));
  });

  it("kierunek strzału: kąt od piłki do palca", () => {
    const s = applyEditorDrag(cycleShot(e0), { target: "kierunek" }, vec(-0.5, -1), SNAP_RADIUS);
    expect(s.shot.kind === "wachlarz" && s.shot.center).toBeCloseTo(-Math.PI / 2, 12);
  });

  it("szerokość wachlarza: dwa razy odchylenie od środka, w [0.2, 2π]", () => {
    const s = cycleShot(e0); // środek π/2
    const w = (to: { x: number; y: number }) => {
      const r = applyEditorDrag(s, { target: "szerokosc" }, to, SNAP_RADIUS).shot;
      return r.kind === "wachlarz" ? r.width : NaN;
    };
    // piłka w (−0.5, 0), środek wachlarza π/2: palec pod 45° od piłki to odchylenie π/4
    expect(w(vec(0, 0.5))).toBeCloseTo(Math.PI / 2, 12);
    expect(w(vec(0, 0))).toBeCloseTo(Math.PI, 12);
    expect(w(vec(-0.5, 0.5))).toBeCloseTo(0.2, 12);      // tuż przy środku — minimum
    expect(w(vec(-0.5, -0.5))).toBeCloseTo(2 * Math.PI, 12);
  });

  it("ognisko przyskakuje do piłki, dołka i ognisk innych kształtów", () => {
    let s = addPiece(e0, "elipsa");
    s = applyEditorDrag(s, { target: "element", index: 0, id: "ognisko1" }, vec(-0.52, 0.02), SNAP_RADIUS);
    const e = s.pieces[0].shape;
    expect(e.kind === "elipsa" && e.f1).toEqual(vec(-0.5, 0));
    s = addObstacle(s, "elipsa"); // ogniska (−0.3, 0) i (0.3, 0)
    s = applyEditorDrag(s, { target: "element", index: 0, id: "ognisko2" }, vec(0.31, 0.02), SNAP_RADIUS);
    const e2 = s.pieces[0].shape;
    expect(e2.kind === "elipsa" && e2.f2).toEqual(vec(0.3, 0));
  });

  it("zablokowane uchwyty w edytorze dalej się przesuwa — blokada działa dopiero w grze", () => {
    let s = addPiece(e0, "odcinek");
    s = { ...s, pieces: [{ ...s.pieces[0], locked: ["koniec1"] }] };
    s = applyEditorDrag(s, { target: "element", index: 0, id: "koniec1" }, vec(-0.6, 0.5), SNAP_RADIUS);
    const o = s.pieces[0].shape;
    expect(o.kind === "odcinek" && o.from).toEqual(vec(-0.6, 0.5));
    expect(s.pieces[0].locked).toEqual(["koniec1"]);
  });
});

describe("zaznaczanie stuknięciem", () => {
  it("krzywa w promieniu — zaznaczona; puste miejsce — nic", () => {
    const s = addObstacle(addPiece(e0, "odcinek"), "okrag"); // odcinek y = 0 od −0.3 do 0.3; okrąg r 0.15 w (0,0)
    expect(selectAt(s, vec(0.25, 0.01), 0.05)).toEqual({ kind: "element", index: 0 });
    expect(selectAt(s, vec(0, 0.16), 0.05)).toEqual({ kind: "przeszkoda", index: 0 });
    expect(selectAt(s, vec(0.8, 0.8), 0.05)).toBeNull();
  });

  it("pełna elipsa łapie się także w miejscu, gdzie łamana się zamyka", () => {
    const s = addPiece(e0, "elipsa"); // a = 0.45, wierzchołek osi w (0.45, 0) — tam zaczyna się łamana
    expect(selectAt(s, vec(0.449, -0.002), 0.01)).toEqual({ kind: "element", index: 0 });
  });
});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/editor/interaction.test.ts`
Oczekiwane: NIE przechodzi — moduł `src/editor/interaction.ts` nie istnieje.

- [ ] **Krok 3: Implementacja**


Nowy plik `src/editor/interaction.ts` — cała zawartość:

```ts
import { Vec2, add, dist, dot, fromAngle, scale, sub } from "../core/vec";
import { Handle, MovableShape } from "../levels/types";
import { shapeFoci, shapeToPiece } from "../levels/shape";
import { piecePolyline } from "../render/shapes";
import { applyDrag, handlePositions, snapTo } from "../ui/handles";
import { EditorState, Selection, replaceShape } from "./model";

/** Co przeciąga palec w edytorze. W edytorze ruchome jest wszystko: piłka, dołek, kierunek
 *  i szerokość strzału, uchwyty elementów gracza (także zablokowane — blokada działa w grze,
 *  autor ustawia start) i uchwyty przeszkód. */
export type EditorHandleRef =
  | { target: "pilka" } | { target: "dolek" } | { target: "kierunek" } | { target: "szerokosc" }
  | { target: "element"; index: number; id: Handle }
  | { target: "przeszkoda"; index: number; id: Handle };

/** Odległość uchwytów strzału od piłki — jak klin wachlarza w grze (`SECTOR_REACH`). */
export const SHOT_REACH = 0.4;

const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
const inBoard = (p: Vec2): Vec2 => ({ x: clamp(p.x, -1, 1), y: clamp(p.y, -1, 1) });
const wrap = (x: number): number => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));

/** Punkt w odległości co najwyżej `max` od `from` w kierunku `angle`, ale nie za brzegiem
 *  planszy — uchwyt strzału przy piłce stojącej przy ścianie zostaje w planszy. */
function reachInBoard(from: Vec2, angle: number, max: number): Vec2 {
  const d = fromAngle(angle);
  let t = max;
  if (d.x > 0) t = Math.min(t, (1 - from.x) / d.x);
  if (d.x < 0) t = Math.min(t, (-1 - from.x) / d.x);
  if (d.y > 0) t = Math.min(t, (1 - from.y) / d.y);
  if (d.y < 0) t = Math.min(t, (-1 - from.y) / d.y);
  return add(from, scale(d, Math.max(0, t)));
}

/** Wszystkie uchwyty edytora z pozycjami — do rysowania i do łapania palcem. */
export function editorHandles(s: EditorState): { ref: EditorHandleRef; pos: Vec2 }[] {
  const out: { ref: EditorHandleRef; pos: Vec2 }[] = [
    { ref: { target: "pilka" }, pos: s.ball },
    { ref: { target: "dolek" }, pos: s.hole },
  ];
  if (s.shot.kind !== "360") {
    out.push({ ref: { target: "kierunek" }, pos: reachInBoard(s.ball, s.shot.center, SHOT_REACH) });
  }
  if (s.shot.kind === "wachlarz") {
    out.push({ ref: { target: "szerokosc" }, pos: reachInBoard(s.ball, s.shot.center + s.shot.width / 2, SHOT_REACH) });
  }
  s.pieces.forEach((p, index) => {
    for (const h of handlePositions(p.shape)) out.push({ ref: { target: "element", index, id: h.id }, pos: h.pos });
  });
  s.obstacles.forEach((o, index) => {
    for (const h of handlePositions(o)) out.push({ ref: { target: "przeszkoda", index, id: h.id }, pos: h.pos });
  });
  return out;
}

/** Najbliższy uchwyt w promieniu albo `null`. */
export function pickEditorHandle(s: EditorState, world: Vec2, radius: number): EditorHandleRef | null {
  let best: EditorHandleRef | null = null;
  let bestD = radius;
  for (const h of editorHandles(s)) {
    const d = dist(world, h.pos);
    if (d <= bestD) { bestD = d; best = h.ref; }
  }
  return best;
}

const isFocus = (id: Handle): boolean => id === "ognisko" || id === "ognisko1" || id === "ognisko2";

/** Cele przyskakiwania ogniska w edytorze: piłka, dołek i ogniska WSZYSTKICH innych kształtów
 *  (elementów i przeszkód) — kaskadę buduje się, stawiając ognisko na ognisku. */
function snapTargetsFor(s: EditorState, ref: { target: "element" | "przeszkoda"; index: number }): Vec2[] {
  const others: MovableShape[] = [
    ...s.pieces.filter((_, i) => !(ref.target === "element" && i === ref.index)).map((p) => p.shape),
    ...s.obstacles.filter((_, i) => !(ref.target === "przeszkoda" && i === ref.index)),
  ];
  return [s.ball, s.hole, ...others.flatMap(shapeFoci)];
}

/** Przeciągnięcie uchwytu do punktu świata `to`. Uchwyty kształtów przez `applyDrag` z gry
 *  (te same reguły: plansza, minimalne odległości), ogniska przyskakują w promieniu `snap`. */
export function applyEditorDrag(s: EditorState, ref: EditorHandleRef, to: Vec2, snap: number): EditorState {
  if (ref.target === "pilka") return { ...s, ball: inBoard(to) };
  if (ref.target === "dolek") return { ...s, hole: inBoard(to) };
  if (ref.target === "kierunek") {
    if (s.shot.kind === "360") return s;
    const center = Math.atan2(to.y - s.ball.y, to.x - s.ball.x);
    return { ...s, shot: { ...s.shot, center } };
  }
  if (ref.target === "szerokosc") {
    if (s.shot.kind !== "wachlarz") return s;
    const half = Math.abs(wrap(Math.atan2(to.y - s.ball.y, to.x - s.ball.x) - s.shot.center));
    return { ...s, shot: { ...s.shot, width: clamp(2 * half, 0.2, 2 * Math.PI) } };
  }
  const shape = ref.target === "element" ? s.pieces[ref.index]?.shape : s.obstacles[ref.index];
  if (shape === undefined) return s;
  const target = isFocus(ref.id) ? snapTo(to, snapTargetsFor(s, ref), snap) : to;
  const sel: Selection = { kind: ref.target, index: ref.index };
  return replaceShape(s, sel, applyDrag(shape, ref.id, target));
}

/** Odległość punktu od odcinka a–b. */
function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  const t = len2 === 0 ? 0 : clamp(dot(sub(p, a), ab) / len2, 0, 1);
  return dist(p, add(a, scale(ab, t)));
}

/** Krzywa najbliższa stuknięciu, w promieniu `radius`, albo `null` (stuknięcie w puste
 *  miejsce zdejmuje zaznaczenie). Elementy gracza i przeszkody na równi. */
export function selectAt(s: EditorState, world: Vec2, radius: number): Selection | null {
  let best: Selection | null = null;
  let bestD = radius;
  const consider = (shape: MovableShape, sel: Selection) => {
    const piece = shapeToPiece(shape);
    const pts = piecePolyline(piece, 96);
    // pełna elipsa: łamana nie wraca do pierwszego punktu, a stuknięcie w tę szczelinę też się liczy
    if (piece.arc === undefined && piece.range === undefined) pts.push(pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const d = distToSegment(world, pts[i - 1], pts[i]);
      if (d <= bestD) { bestD = d; best = sel; }
    }
  };
  s.pieces.forEach((p, index) => consider(p.shape, { kind: "element", index }));
  s.obstacles.forEach((o, index) => consider(o, { kind: "przeszkoda", index }));
  return best;
}
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 773 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/editor/interaction.ts tests/editor/interaction.test.ts
git commit -m "feat(edytor): uchwyty, przeciaganie i zaznaczanie" -m "Te same uchwyty i reguly co w grze; ogniska przyskakuja do pilki, dolka i ognisk innych ksztaltow." -m "<trailer ze zlecenia>"
```

---

## Zadanie 7: Układ menu — zakładki i przewijana lista społeczności

Czyste funkcje w `src/ui/menu.ts`: dwie zakładki między ☰ i ⚙, układ listy społeczności (sekcje z nagłówkami, siatka kafelków 2/4 kolumny, pusta sekcja zostawia miejsce na napis, przesunięcie o `scroll`), granice przewijania, trafienie kafelka tylko w pasie listy, rozróżnienie stuknięcia od przeciągnięcia.

**Pliki:**
- Zmiana: `src/ui/menu.ts`
- Zmiana: `tests/ui/menu.test.ts`

**Interfejsy:**
- Produkuje: `type MenuTab = "tworcy" | "spolecznosc"`, `tabRects(width): [Rect, Rect]`, `SECTION_HEADER_H = 32`, `COMMUNITY_TILE_H = 76`, `interface CommunityTile`, `interface CommunityLayout { headers; tiles; viewport; maxScroll }`, `communityLayout(width, height, counts, scroll)`, `clampScroll(scroll, max)`, `hitCommunity(layout, p)`, `isTap(down, up)`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Zmiana w `tests/ui/menu.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,9 +1,10 @@
 import { describe, it, expect } from "vitest";
 import { readFileSync } from "node:fs";
 import { vec } from "../../src/core/vec";
 import {
-  ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, cardLayout, editAction, helpButton, hitRect, hitTile, inActionBand,
+  ACTION_BAND, COMMUNITY_TILE_H, MENU_BUTTON, Rect, SECTION_HEADER_H, TOP_BAND, cardLayout, clampScroll, communityLayout,
+  editAction, helpButton, hitCommunity, hitRect, hitTile, inActionBand, isTap, tabRects,
   menuLayout, playArea, resultBanner, settingsButton, settingsLayout, TILE_DESCENT, TILE_LINE_H, TILE_TITLE_Y, tileTitle, titleLineCount, winAction,
   winLabels, wrapByWords,
 } from "../../src/ui/menu";
 import { makeCamera } from "../../src/render/camera";
@@ -332,4 +333,72 @@ describe("tileTitle — tytuł w kafelku menu", () => {
       });
     });
   }
 });
+
+describe("zakładki menu", () => {
+  for (const w of [320, 390, 844]) {
+    it(`szerokość ${w}: dwie zakładki ≥ 44 px, obok siebie, bez ☰ i ⚙`, () => {
+      const [a, b] = tabRects(w);
+      for (const t of [a, b]) {
+        expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
+        expect(overlap(t, MENU_BUTTON)).toBe(false);
+        expect(overlap(t, settingsButton(w))).toBe(false);
+        expect(t.y + t.h).toBeLessThanOrEqual(72);
+      }
+      expect(overlap(a, b)).toBe(false);
+      expect(a.x).toBeLessThan(b.x);
+    });
+  }
+});
+
+describe("lista społeczności", () => {
+  const W = 390, H = 844;
+
+  it("sekcje jedna pod drugą, kafelki ≥ 44 px, w pasie listy i bez nakładania", () => {
+    const l = communityLayout(W, H, [3, 5, 2], 0);
+    expect(l.headers.map((h) => h.section)).toEqual([0, 1, 2]);
+    expect(l.headers[0].y).toBeLessThan(l.headers[1].y);
+    expect(l.tiles).toHaveLength(10);
+    l.tiles.forEach((t, i) => {
+      expect(Math.min(t.rect.w, t.rect.h), `kafelek ${i}`).toBeGreaterThanOrEqual(44);
+      expect(t.rect.x >= 0 && t.rect.x + t.rect.w <= W).toBe(true);
+      l.tiles.slice(i + 1).forEach((u) => expect(overlap(t.rect, u.rect)).toBe(false));
+      // kafelek sekcji leży pod jej nagłówkiem i nad nagłówkiem następnej
+      const head = l.headers[t.section];
+      expect(t.rect.y).toBeGreaterThanOrEqual(head.y + SECTION_HEADER_H);
+      const next = l.headers[t.section + 1];
+      if (next !== undefined) expect(t.rect.y + t.rect.h).toBeLessThanOrEqual(next.y);
+    });
+  });
+
+  it("pusta sekcja zostawia miejsce na napis", () => {
+    const l = communityLayout(W, H, [0, 1], 0);
+    expect(l.headers[1].y - l.headers[0].y).toBeGreaterThanOrEqual(SECTION_HEADER_H + COMMUNITY_TILE_H);
+  });
+
+  it("przewijanie: wszystko przesuwa się o tyle samo, granice przewinięcia", () => {
+    const a = communityLayout(W, H, [20, 20, 30], 0);
+    const b = communityLayout(W, H, [20, 20, 30], 100);
+    expect(b.tiles[5].rect.y).toBeCloseTo(a.tiles[5].rect.y - 100, 9);
+    expect(a.maxScroll).toBeGreaterThan(0);
+    expect(communityLayout(W, H, [1], 0).maxScroll).toBe(0);
+    expect(clampScroll(-5, 50)).toBe(0);
+    expect(clampScroll(70, 50)).toBe(50);
+    expect(clampScroll(20, 50)).toBe(20);
+  });
+
+  it("dotknięcie trafia w kafelek tylko w pasie listy", () => {
+    const l = communityLayout(W, H, [4], 0);
+    const t = l.tiles[1];
+    expect(hitCommunity(l, vec(t.rect.x + 5, t.rect.y + 5))).toEqual(t);
+    const przewiniety = communityLayout(W, H, [4], 60);
+    const pod = przewiniety.tiles[0];   // wjechał pod zakładki
+    expect(pod.rect.y).toBeLessThan(przewiniety.viewport.y);
+    expect(hitCommunity(przewiniety, vec(pod.rect.x + 5, pod.rect.y + 2))).toBeNull();
+  });
+
+  it("dotknięcie a przeciągnięcie", () => {
+    expect(isTap(vec(10, 10), vec(14, 13))).toBe(true);
+    expect(isTap(vec(10, 10), vec(10, 30))).toBe(false);
+  });
+});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/menu.test.ts`
Oczekiwane: NIE przechodzi — brak `tabRects`, `communityLayout` itd.

- [ ] **Krok 3: Implementacja**


Zmiana w `src/ui/menu.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -209,4 +209,70 @@ export function cardLayout(width: number, height: number, count: number): Rect[]
       ? { x: area.x + offset, y: area.y + (area.h - size) / 2, w: size, h: size }
       : { x: area.x + (area.w - size) / 2, y: area.y + offset, w: size, h: size };
   });
 }
+
+// ── menu poziomów: zakładki i lista społeczności ───────────────────────────────────────
+
+export type MenuTab = "tworcy" | "spolecznosc";
+
+/** Dwie zakładki u góry menu, między ☰ i ⚙ — każda co najmniej 44 px wysokości. */
+export function tabRects(width: number): [Rect, Rect] {
+  const x0 = 6 + 44 + 6;
+  const w = (width - 2 * x0) / 2;
+  return [{ x: x0, y: 6, w, h: 44 }, { x: x0 + w, y: 6, w, h: 44 }];
+}
+
+/** Wysokość nagłówka sekcji i kafelka listy społeczności. Kafelek mieści tytuł w dwóch
+ *  liniach i dopisek (autor albo stan projektu). */
+export const SECTION_HEADER_H = 32;
+export const COMMUNITY_TILE_H = 76;
+
+export interface CommunityTile { section: number; index: number; rect: Rect }
+export interface CommunityLayout {
+  headers: { section: number; y: number }[];
+  tiles: CommunityTile[];
+  /** pas listy na ekranie — rysujemy i łapiemy dotknięcia tylko w nim */
+  viewport: Rect;
+  maxScroll: number;
+}
+
+/** Lista społeczności: sekcje jedna pod drugą (nagłówek, potem kafelki w siatce — w pionie 2
+ *  kolumny, w poziomie 4), przesunięte o `scroll` pikseli w górę. Pusta sekcja zajmuje jeden
+ *  rząd na napis „Na razie pusto". `counts[i]` — liczba kafelków sekcji `i`. */
+export function communityLayout(width: number, height: number, counts: number[], scroll: number): CommunityLayout {
+  const cols = width >= height ? 4 : 2;
+  const w = (width - 2 * SIDE - (cols - 1) * GAP) / cols;
+  const viewport = { x: 0, y: TOP, w: width, h: Math.max(0, height - TOP - SIDE) };
+  const headers: { section: number; y: number }[] = [];
+  const tiles: CommunityTile[] = [];
+  let y = 0;
+  counts.forEach((count, section) => {
+    headers.push({ section, y: viewport.y + y - scroll });
+    y += SECTION_HEADER_H;
+    const rows = Math.max(1, Math.ceil(count / cols));
+    for (let index = 0; index < count; index++) {
+      tiles.push({
+        section, index,
+        rect: {
+          x: SIDE + (index % cols) * (w + GAP),
+          y: viewport.y + y + Math.floor(index / cols) * (COMMUNITY_TILE_H + GAP) - scroll,
+          w, h: COMMUNITY_TILE_H,
+        },
+      });
+    }
+    y += rows * COMMUNITY_TILE_H + (rows - 1) * GAP + GAP;
+  });
+  return { headers, tiles, viewport, maxScroll: Math.max(0, y - viewport.h) };
+}
+
+/** Przewinięcie przycięte do [0, maxScroll] — lista nie odjeżdża za swój początek ani koniec. */
+export const clampScroll = (scroll: number, maxScroll: number): number => Math.min(Math.max(scroll, 0), maxScroll);
+
+/** Kafelek pod palcem — tylko w pasie listy (kafelek przewinięty pod zakładki się nie liczy). */
+export function hitCommunity(layout: CommunityLayout, p: Vec2): CommunityTile | null {
+  if (!hitRect(layout.viewport, p)) return null;
+  return layout.tiles.find((t) => hitRect(t.rect, p)) ?? null;
+}
+
+/** Dotknięcie, a nie przeciągnięcie: palec przesunął się o mniej niż 8 px. */
+export const isTap = (down: Vec2, up: Vec2): boolean => Math.hypot(up.x - down.x, up.y - down.y) < 8;
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 781 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/menu.ts tests/ui/menu.test.ts
git commit -m "feat(menu): zakladki i przewijana lista spolecznosci" -m "Czyste funkcje ukladu: sekcje z naglowkami, kafelki co najmniej 44 px, przewijanie z granicami, dotkniecie tylko w pasie listy." -m "<trailer ze zlecenia>"
```

---

## Zadanie 8: Zakładka „Społeczność", otwieranie linku i granie poziomów społeczności

`src/ui/playlist.ts` (czyste: która lista jest grana, baner, „?", plansza przy wejściu) i zmiany w `src/ui/screens.ts`: zakładki w menu, lista „Katalog" i „Z linków" z przewijaniem, otwarcie `#poziom=…` przy starcie i przy `hashchange` (zamyka menu i ustawienia; link do poziomu z katalogu otwiera go w katalogu), komunikat w pigułce, „Następny"/„Menu" w obrębie sekcji, „ostatnio grany" tylko dla twórców. Lista „Z linków" odkodowuje się raz (odkodowanie to pełny dowód), nie w każdej klatce. Sekcję „Twoje poziomy" dokłada zadanie 9 razem z edytorem.

Ekran nie ma testów jednostkowych — logika siedzi w `playlist.ts`, `menu.ts`, `collections.ts`, `share/`. Po zadaniu przeklikaj grę (instrukcja w kroku 4).

**Pliki:**
- Nowy: `src/ui/playlist.ts`
- Zmiana: `src/ui/screens.ts`
- Nowy: `tests/ui/playlist.test.ts`

**Interfejsy:**
- Konsumuje: zad. 2 (`codeFromHash`, `openCode`), zad. 3 (`addLink`, `loadLinks`, `saveLinks`), zad. 4 (`loadCatalog`, `mechanicCard`), zad. 7 (zakładki, lista).
- Produkuje: `type Section = "tworcy" | "katalog" | "linki"`, `interface Playlist { section; levels; index }`, `current`, `isLastIn`, `nextIn`, `bannerLabel`, `helpCard`, `autoCardIn` (`src/ui/playlist.ts`). W `screens.ts`: `play(next: Playlist)` zastępuje `goTo(index)`; stałe `COMMUNITY_SECTIONS`, `TOAST_S`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Nowy plik `tests/ui/playlist.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { encodeLevel } from "../../src/share/codec";
import { openCode } from "../../src/share/verify";
import { autoCardIn, bannerLabel, current, helpCard, isLastIn, nextIn } from "../../src/ui/playlist";
import { SAMPLES } from "../share/samples";

const community = SAMPLES.map((s) => {
  const o = openCode(encodeLevel(s));
  if (!o.ok) throw new Error(o.reason);
  return o.level;
});

describe("lista poziomów w grze", () => {
  it("twórcy: numer w banerze, plansza pod „?” i plansza przy wejściu jak dotąd", () => {
    const p = { section: "tworcy" as const, levels: LEVELS, index: 3 };
    expect(bannerLabel(p)).toBe(`Poziom 4 / ${LEVELS.length}`);
    expect(current(p).id).toBe("ogniska");
    expect(helpCard(p)?.id).toBe("elipsa");
    expect(autoCardIn(p, [])?.id).toBe("elipsa");
    expect(autoCardIn(p, ["ogniska"])).toBeUndefined();
  });

  it("społeczność: „Społeczność” w banerze, plansza według mechaniki, bez planszy przy wejściu", () => {
    const p = { section: "katalog" as const, levels: community, index: 2 }; // „Dwie parabole"
    expect(bannerLabel(p)).toBe("Społeczność");
    expect(helpCard(p)?.id).toBe("parabola");
    expect(autoCardIn(p, [])).toBeUndefined();
    expect(helpCard({ ...p, index: 4 })?.id).toBe("odbicie"); // „Lustro"
  });

  it("następny i ostatni na liście", () => {
    const p = { section: "linki" as const, levels: community, index: 0 };
    expect(nextIn(p).index).toBe(1);
    expect(isLastIn(p)).toBe(false);
    const last = { ...p, index: community.length - 1 };
    expect(isLastIn(last)).toBe(true);
    expect(nextIn(last).index).toBe(community.length - 1);
  });
});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/playlist.test.ts`
Oczekiwane: NIE przechodzi — moduł `src/ui/playlist.ts` nie istnieje.

- [ ] **Krok 3: Implementacja**

Zmiany w `screens.ts` to jedna spójna przebudowa: `levelIndex` znika na rzecz `playlist`. Po wprowadzeniu `npx tsc --noEmit` musi być czysty — kompilator wskaże każde pozostałe użycie `levelIndex`/`goTo` (w `drawMenu` zostaje lokalne `levelIndex` dla podświetlenia kafelka).

Nowy plik `src/ui/playlist.ts` — cała zawartość:

```ts
import { Card, Level, autoCard, cardFor, mechanicCard } from "../levels";

/** Skąd gra bierze bieżący poziom: lista twórców albo jedna z sekcji zakładki „Społeczność".
 *  „Następny", baner i „?" zależą od listy, nie od tego, jak poziom powstał. */
export type Section = "tworcy" | "katalog" | "linki";

export interface Playlist { section: Section; levels: Level[]; index: number }

export const current = (p: Playlist): Level => p.levels[p.index];
export const isLastIn = (p: Playlist): boolean => p.index >= p.levels.length - 1;
export const nextIn = (p: Playlist): Playlist => ({ ...p, index: Math.min(p.index + 1, p.levels.length - 1) });

/** Pierwsza linia banera: numer na liście twórców, „Społeczność" dla reszty. */
export const bannerLabel = (p: Playlist): string =>
  p.section === "tworcy" ? `Poziom ${p.index + 1} / ${p.levels.length}` : "Społeczność";

/** Plansza pod „?": u twórców — ostatnia plansza przed poziomem; w społeczności — według
 *  mechaniki, bo poziomy społeczności nie mają swojej kolejności. */
export const helpCard = (p: Playlist): Card | undefined =>
  p.section === "tworcy" ? cardFor(p.levels.map((l) => l.id), p.index) : mechanicCard(current(p));

/** Plansza pokazywana sama przy wejściu na poziom — tylko u twórców (tam wprowadza mechanikę). */
export const autoCardIn = (p: Playlist, solved: readonly string[]): Card | undefined =>
  p.section === "tworcy" ? autoCard(current(p).id, solved) : undefined;
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,8 +1,6 @@
 import { Vec2, vec } from "../core/vec";
-import {
-  Card, LEVELS, SNAP_RADIUS, Shape, autoCard, cardFor, sceneTraces, shapeFoci, shapeToPiece,
-} from "../levels";
+import { Card, LEVELS, Level, SNAP_RADIUS, Shape, sceneTraces, shapeFoci, shapeToPiece } from "../levels";
 import { makeCamera, rectCamera } from "../render/camera";
 import {
   PALETTE, SECTOR_REACH, boardFrame, dashedPolyline, drawPiece, glowDot, glowPolyline, handleShape, holeMark,
   sectorWedge,
@@ -12,30 +10,48 @@ import { handleMark, shapeStyle } from "../render/style";
 import { positionAt, trailSegment } from "../render/trails";
 import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
 import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
 import {
-  MENU_BUTTON, cardLayout, editAction, helpButton, hitRect, hitTile, inActionBand, menuLayout, playArea, resultBanner,
-  settingsButton, settingsLayout, TILE_LINE_H, TILE_NUMBER_Y, TILE_TITLE_Y, tileTitle, titleLineCount, winAction,
-  winLabels, wrapByWords,
+  MENU_BUTTON, MenuTab, SECTION_HEADER_H, cardLayout, clampScroll, communityLayout, editAction, helpButton, hitCommunity,
+  hitRect, hitTile, inActionBand, isTap, menuLayout, playArea, resultBanner, settingsButton, settingsLayout, tabRects,
+  TILE_LINE_H, TILE_NUMBER_Y, TILE_TITLE_Y, tileTitle, titleLineCount, winAction, winLabels, wrapByWords,
 } from "./menu";
 import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
 import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";
+import { Playlist, autoCardIn, bannerLabel, current, helpCard, isLastIn, nextIn } from "./playlist";
+import { addLink, loadLinks, saveLinks } from "./collections";
+import { loadCatalog } from "../share/catalog";
+import { codeFromHash, openCode } from "../share/verify";
 
 const TRAIL = 0.35;
 const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy
+const TOAST_S = 2.5;    // jak długo wisi komunikat na dole ekranu
+
+/** Sekcje zakładki „Społeczność" w kolejności rysowania. */
+const COMMUNITY_SECTIONS = ["katalog", "linki"] as const;
 
 export function mount(canvas: HTMLCanvasElement): void {
   const ctx = canvas.getContext("2d")!;
   const store = browserStore();
   let progress = loadProgress(store, LEVELS.map((l) => l.id));
   // brak zapisu (albo poziom, którego już nie ma) → -1 → pierwszy poziom
-  let levelIndex = Math.max(0, LEVELS.findIndex((l) => l.id === progress.lastId));
-  let game: GameState = newGame(LEVELS[levelIndex]);
+  let playlist: Playlist = {
+    section: "tworcy", levels: LEVELS, index: Math.max(0, LEVELS.findIndex((l) => l.id === progress.lastId)),
+  };
+  let game: GameState = newGame(current(playlist));
   let menuOpen = false;
+  let menuTab: MenuTab = "tworcy";
+  let communityScroll = 0;
+  /** palec położony na liście społeczności — przewijanie albo stuknięcie rozstrzyga `pointerup` */
+  let listPointer: { down: Vec2; scroll0: number } | null = null;
+  const catalog = loadCatalog();
+  let links = loadLinks(store);
+  /** komunikat na dole ekranu (np. o złym linku) i czas, do którego wisi */
+  let toast: { text: string; until: number } | null = null;
   let settings = loadSettings(store);
   let settingsOpen = false;
   /** otwarta plansza z zasadą; `null` — żadna */
-  let card: Card | null = autoCard(LEVELS[levelIndex].id, progress.solved) ?? null;
+  let card: Card | null = autoCardIn(playlist, progress.solved) ?? null;
   let dragging: HandleRef | null = null;
   let pointer: Vec2 | null = null;
   let consumedReset = false;
   let last = performance.now();
@@ -63,22 +79,63 @@ export function mount(canvas: HTMLCanvasElement): void {
   const toWorld = (e: PointerEvent): Vec2 => cam().toWorld(toScreenPoint(e));
   const viewW = () => canvas.width / dpr();
   const viewH = () => canvas.height / dpr();
 
-  const isLast = (): boolean => levelIndex === LEVELS.length - 1;
-
-  function goTo(index: number): void {
-    levelIndex = index;
-    game = newGame(LEVELS[index]);
-    progress = { ...progress, lastId: LEVELS[index].id };
-    saveProgress(store, progress);
+  /** Poziomy z linków, odkodowane RAZ (odkodowanie to pełny dowód) — odświeżane tylko przy
+   *  dopisaniu linku, nie w każdej klatce rysowania. */
+  const decodeLinks = (): Level[] => links.flatMap((c) => { const o = openCode(c); return o.ok ? [o.level] : []; });
+  let linkLevels = decodeLinks();
+  const catalogLevels = catalog.map((c) => c.level);
+  const sectionLevels = (section: (typeof COMMUNITY_SECTIONS)[number]): Level[] =>
+    section === "katalog" ? catalogLevels : linkLevels;
+
+  function play(next: Playlist): void {
+    playlist = next;
+    game = newGame(current(next));
+    // „ostatnio grany" dotyczy tylko listy twórców — poziomy społeczności nie mają numeru
+    if (next.section === "tworcy") {
+      progress = { ...progress, lastId: current(next).id };
+      saveProgress(store, progress);
+    }
     // pierwszy poziom nowej mechaniki, jeszcze niezaliczony: najpierw zasada
-    card = autoCard(LEVELS[index].id, progress.solved) ?? null;
+    card = autoCardIn(next, progress.solved) ?? null;
+  }
+
+  // zegar `performance.now`, nie `time` z klatki — `openFromHash` woła to przed pierwszą klatką
+  const say = (text: string): void => { toast = { text, until: performance.now() / 1000 + TOAST_S }; };
+
+  /** Link `…#poziom=<kod>`: poziom trafia do „Z linków" i od razu się otwiera (poziom
+   *  z katalogu otwiera się w katalogu); zły link — komunikat i zwykła gra. Końcówka adresu
+   *  znika, żeby odświeżenie strony nie otwierało poziomu drugi raz. */
+  function openFromHash(): void {
+    const code = codeFromHash(window.location.hash);
+    if (code === null) return;
+    history.replaceState(null, "", window.location.pathname + window.location.search);
+    // link wklejony w otwartej już karcie (`hashchange`) — menu i ustawienia nie mogą go zasłonić
+    menuOpen = false;
+    settingsOpen = false;
+    if (game.phase === "dowod") game = retry(game);
+    const o = openCode(code);
+    if (!o.ok) {
+      say("Ten link nie zawiera działającego poziomu");
+      return;
+    }
+    const inCatalog = catalog.findIndex((c) => c.level.id === o.level.id);
+    if (inCatalog >= 0) {
+      play({ section: "katalog", levels: catalogLevels, index: inCatalog });
+      return;
+    }
+    links = addLink(links, o.code);
+    saveLinks(store, links);
+    linkLevels = decodeLinks();
+    play({ section: "linki", levels: linkLevels, index: 0 });
   }
 
   function toggleMenu(): void {
     menuOpen = !menuOpen;
     settingsOpen = false;
+    // menu otwiera się na zakładce bieżącego poziomu
+    if (menuOpen) menuTab = playlist.section === "tworcy" ? "tworcy" : "spolecznosc";
     // Menu przerywa trwający dowód: po zamknięciu gracz wraca do edycji swoich elementów.
     if (menuOpen && game.phase === "dowod") game = retry(game);
   }
 
@@ -88,9 +145,9 @@ export function mount(canvas: HTMLCanvasElement): void {
 
   /** „?" — plansza mechaniki bieżącego poziomu. Dowód nie może trwać, gdy „?" jest
    *  dotykalne (patrz `helpVisible`), więc nie ma czego przerywać. */
   function openHelp(): void {
-    card = cardFor(LEVELS.map((l) => l.id), levelIndex) ?? null;
+    card = helpCard(playlist) ?? null;
   }
 
   function toggleSettings(): void {
     settingsOpen = !settingsOpen;
@@ -137,18 +194,30 @@ export function mount(canvas: HTMLCanvasElement): void {
       consumedReset = true;
       return;
     }
     if (menuOpen) {
+      consumedReset = true;
+      const tab = tabRects(viewW()).findIndex((r) => hitRect(r, p));
+      if (tab >= 0) {
+        menuTab = tab === 0 ? "tworcy" : "spolecznosc";
+        communityScroll = 0;
+        return;
+      }
+      if (menuTab === "spolecznosc") {
+        // przewinięcie czy stuknięcie — rozstrzyga `pointerup`
+        listPointer = { down: p, scroll0: communityScroll };
+        canvas.setPointerCapture(e.pointerId);
+        return;
+      }
       // kafelek wybiera poziom (także ten sam — od nowa), tło po prostu zamyka menu
       const i = hitTile(menuLayout(viewW(), viewH(), LEVELS.length), p);
-      if (i !== null) goTo(i);
+      if (i !== null) play({ section: "tworcy", levels: LEVELS, index: i });
       menuOpen = false;
-      consumedReset = true;
       return;
     }
     if (game.phase === "wygrana") {
-      const action = winAction(p, viewW(), viewH(), isLast());
-      if (action === "nastepny") goTo(levelIndex + 1);
+      const action = winAction(p, viewW(), viewH(), isLastIn(playlist));
+      if (action === "nastepny") play(nextIn(playlist));
       if (action === "menu") menuOpen = true;
       if (action === "powtorz") game = retry(game);
       consumedReset = true;
       return;
@@ -174,9 +243,17 @@ export function mount(canvas: HTMLCanvasElement): void {
     pointer = w;
     canvas.setPointerCapture(e.pointerId);
   });
 
+  const communityCounts = (): number[] => COMMUNITY_SECTIONS.map((sec) => sectionLevels(sec).length);
+
   canvas.addEventListener("pointermove", (e) => {
+    if (listPointer !== null) {
+      const dy = toScreenPoint(e).y - listPointer.down.y;
+      const { maxScroll } = communityLayout(viewW(), viewH(), communityCounts(), 0);
+      communityScroll = clampScroll(listPointer.scroll0 - dy, maxScroll);
+      return;
+    }
     if (dragging === null) return;
     const w = toWorld(e);
     pointer = w;
     const { piece, id } = dragging;
@@ -190,17 +267,33 @@ export function mount(canvas: HTMLCanvasElement): void {
     const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped, lockedA) : s));
     game = { ...game, pieces };
   });
 
-  const endDrag = (): void => { dragging = null; pointer = null; };
+  const endDrag = (): void => { dragging = null; pointer = null; listPointer = null; };
   canvas.addEventListener("pointercancel", endDrag);
 
   // JEDEN listener, nie dwa. Osobny `endDrag` zarejestrowany wcześniej wyzerowałby
   // `dragging`, ZANIM drugi listener zdążyłby sprawdzić, czy właśnie trwało przeciąganie
   // — więc puszczenie uchwytu w dolnym pasie ekranu uruchamiałoby dowód wbrew graczowi
   // i kasowało jego niedokończoną edycję. W pionie geometria kamery przypadkiem chroni
   // przed tym (plansza nie sięga pasa przycisku), ale nic nie wymusza pionu.
+  /** Stuknięcie w listę społeczności: kafelek otwiera poziom swojej sekcji, tło zamyka menu. */
+  function tapCommunity(p: Vec2): void {
+    const hit = hitCommunity(communityLayout(viewW(), viewH(), communityCounts(), communityScroll), p);
+    menuOpen = false;
+    if (hit === null) return;
+    const section = COMMUNITY_SECTIONS[hit.section];
+    play({ section, levels: sectionLevels(section), index: hit.index });
+  }
+
   canvas.addEventListener("pointerup", (e) => {
+    if (listPointer !== null) {
+      const up = toScreenPoint(e);
+      if (isTap(listPointer.down, up)) tapCommunity(up);
+      listPointer = null;
+      consumedReset = false;
+      return;
+    }
     const wasDragging = dragging !== null;
     const afterReset = consumedReset;
     consumedReset = false;
     endDrag();
@@ -333,10 +426,10 @@ export function mount(canvas: HTMLCanvasElement): void {
         for (const b of game.proof.balls) {
           glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
         }
         // pod tytułem tylko dopisek ostatniego poziomu; na pozostałych — nic
-        const allSolved = LEVELS.every((l) => progress.solved.includes(l.id));
-        const { right, note } = winLabels(isLast(), allSolved);
+        const allSolved = playlist.levels.every((l) => progress.solved.includes(l.id));
+        const { right, note } = winLabels(isLastIn(playlist), allSolved);
         banner(resultBanner(game.proof.balls.length, 0).title, note ?? "", ["Jeszcze raz", right]);
       } else if (game.phase === "porazka") {
         const missed = game.proof.balls.filter((b) => !b.holed).length;
         const { title, note } = resultBanner(game.proof.balls.length, missed);
@@ -352,16 +445,33 @@ export function mount(canvas: HTMLCanvasElement): void {
     }
     drawMenuButton();
     drawSettingsButton();
     if (helpVisible()) drawHelpButton();
+    if (toast !== null && time < toast.until) drawToast(toast.text);
+
+    /** Komunikat w pigułce nad dolnym pasem — znika sam po `TOAST_S` sekund. */
+    function drawToast(text: string): void {
+      const w = viewW();
+      const y = viewH() * 0.82;
+      ctx.font = "14px system-ui, sans-serif";
+      const tw = Math.min(w - 32, measure(text) + 32);
+      ctx.fillStyle = PALETTE.overlay;
+      ctx.beginPath();
+      ctx.roundRect(w / 2 - tw / 2, y - 22, tw, 32, 16);
+      ctx.fill();
+      ctx.textAlign = "center";
+      ctx.fillStyle = PALETTE.text;
+      ctx.fillText(text, w / 2, y - 1);
+      ctx.textAlign = "left";
+    }
 
     function banner(title: string, hint: string, action: string | [string, string]): void {
       const w = viewW();
       const h = viewH();
       ctx.textAlign = "center";
       ctx.fillStyle = PALETTE.muted;
       ctx.font = "12px system-ui, sans-serif";
-      ctx.fillText(`Poziom ${levelIndex + 1} / ${LEVELS.length}`, w / 2, 22);
+      ctx.fillText(bannerLabel(playlist), w / 2, 22);
       ctx.fillStyle = PALETTE.text;
       ctx.font = "600 18px system-ui, sans-serif";
       ctx.fillText(title, w / 2, 46);
       // Podpowiedź ZAWIJAMY. Bez tego instrukcja poziomu urywa się na szerokości
@@ -401,9 +511,9 @@ export function mount(canvas: HTMLCanvasElement): void {
     /** „?" w kółku tuż za napisem „Poziom N / M" (ten sam wiersz, `helpButton` obejmuje oba).
      *  Kółko liniami i „?" znakiem ASCII — nie polegamy na glifie ⓘ w czcionce telefonu. */
     function drawHelpButton(): void {
       ctx.font = "12px system-ui, sans-serif";
-      const tw = ctx.measureText(`Poziom ${levelIndex + 1} / ${LEVELS.length}`).width;
+      const tw = ctx.measureText(bannerLabel(playlist)).width;
       const cx = viewW() / 2 + tw / 2 + 14;
       ctx.strokeStyle = PALETTE.muted;
       ctx.lineWidth = 1.5;
       ctx.beginPath();
@@ -498,12 +608,14 @@ export function mount(canvas: HTMLCanvasElement): void {
       const w = viewW();
       const h = viewH();
       ctx.fillStyle = PALETTE.overlay;
       ctx.fillRect(0, 0, w, h);
-      ctx.textAlign = "center";
-      ctx.fillStyle = PALETTE.text;
-      ctx.font = "600 18px system-ui, sans-serif";
-      ctx.fillText("Poziomy", w / 2, 34);
+      drawTabs();
+      if (menuTab === "spolecznosc") {
+        drawCommunity();
+        return;
+      }
+      const levelIndex = playlist.section === "tworcy" ? playlist.index : -1;
       menuLayout(w, h, LEVELS.length).forEach((t, i) => {
         const lvl = LEVELS[i];
         ctx.beginPath();
         ctx.roundRect(t.x, t.y, t.w, t.h, 10);
@@ -533,10 +645,88 @@ export function mount(canvas: HTMLCanvasElement): void {
         });
       });
       ctx.textAlign = "left";
     }
+
+    /** Zakładki „Od twórców | Społeczność": wybrana jaśniejsza i podkreślona. */
+    function drawTabs(): void {
+      const labels = ["Od twórców", "Społeczność"];
+      tabRects(viewW()).forEach((r, i) => {
+        const on = (i === 0) === (menuTab === "tworcy");
+        ctx.textAlign = "center";
+        ctx.font = "600 16px system-ui, sans-serif";
+        ctx.fillStyle = on ? PALETTE.text : PALETTE.muted;
+        ctx.fillText(labels[i], r.x + r.w / 2, r.y + r.h / 2 + 6);
+        if (on) {
+          ctx.fillStyle = PALETTE.curve;
+          ctx.fillRect(r.x + 12, r.y + r.h - 3, r.w - 24, 2);
+        }
+      });
+      ctx.textAlign = "left";
+    }
+
+    /** Zakładka „Społeczność": sekcje z nagłówkami, przewijane, przycięte do pasa listy. */
+    function drawCommunity(): void {
+      const layout = communityLayout(viewW(), viewH(), communityCounts(), communityScroll);
+      const v = layout.viewport;
+      ctx.save();
+      ctx.beginPath();
+      ctx.rect(v.x, v.y, v.w, v.h);
+      ctx.clip();
+      const titles = { katalog: "Katalog", linki: "Z linków" };
+      const empty = {
+        katalog: "Na razie pusto — przyślij twórcy link do swojego poziomu.",
+        linki: "Tu trafią poziomy otwarte z linków.",
+      };
+      for (const head of layout.headers) {
+        const section = COMMUNITY_SECTIONS[head.section];
+        ctx.textAlign = "left";
+        ctx.font = "600 15px system-ui, sans-serif";
+        ctx.fillStyle = PALETTE.text;
+        ctx.fillText(titles[section], 16, head.y + 22);
+        if (sectionLevels(section).length === 0) {
+          ctx.font = "13px system-ui, sans-serif";
+          ctx.fillStyle = PALETTE.muted;
+          ctx.fillText(empty[section], 16, head.y + SECTION_HEADER_H + 24);
+        }
+      }
+      for (const t of layout.tiles) {
+        const section = COMMUNITY_SECTIONS[t.section];
+        const lvl = sectionLevels(section)[t.index];
+        const r = t.rect;
+        const here = playlist.section === section && playlist.index === t.index;
+        ctx.beginPath();
+        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
+        ctx.fillStyle = PALETTE.tile;
+        ctx.fill();
+        ctx.lineWidth = here ? 2 : 1;
+        ctx.strokeStyle = here ? PALETTE.curve : PALETTE.tileEdge;
+        ctx.stroke();
+        if (progress.solved.includes(lvl.id)) {
+          ctx.textAlign = "right";
+          ctx.font = "600 18px system-ui, sans-serif";
+          ctx.fillStyle = PALETTE.curve;
+          ctx.fillText("✓", r.x + r.w - 10, r.y + 24);
+        }
+        ctx.textAlign = "left";
+        ctx.fillStyle = PALETTE.text;
+        const title = tileTitle(lvl.title, r.w - 40, (size) => {
+          ctx.font = `600 ${size + 1}px system-ui, sans-serif`;
+          return measure;
+        }, 2);
+        ctx.font = `600 ${title.size + 1}px system-ui, sans-serif`;
+        title.lines.forEach((line, j) => ctx.fillText(line, r.x + 12, r.y + 24 + j * 17));
+        ctx.font = "12px system-ui, sans-serif";
+        ctx.fillStyle = PALETTE.muted;
+        const note = section === "katalog" ? (catalog[t.index]?.author ?? "") : "z linku";
+        ctx.fillText(note, r.x + 12, r.y + r.h - 12);
+      }
+      ctx.restore();
+    }
   }
 
   window.addEventListener("resize", resize);
+  window.addEventListener("hashchange", openFromHash);
   resize();
+  openFromHash();
   requestAnimationFrame(frame);
 }
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 784 testów zielonych. Ręcznie (`npm run dev` albo `npm run build && npx vite preview`), ekran 390×844: ☰ → „Społeczność" — dwie sekcje z napisami „Na razie pusto…" i „Tu trafią…"; zakoduj `SAMPLES[2]` (`npx vite-node` z `encodeLevel`) i otwórz `/#poziom=<kod>` — gra pokazuje „Społeczność · Dwie parabole", a w menu kafelek „z linku"; `/#poziom=zepsuty` — komunikat „Ten link nie zawiera działającego poziomu"; konsola bez błędów.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/playlist.ts tests/ui/playlist.test.ts src/ui/screens.ts
git commit -m "feat(spolecznosc): zakladka Spolecznosc, linki i granie poziomow gracza" -m "Katalog i poziomy z linkow w przewijanej liscie; link otwiera poziom od razu, zly link daje komunikat. Lista z linkow odkodowuje sie raz, nie w kazdej klatce." -m "<trailer ze zlecenia>"
```

---

## Zadanie 9: Edytor na ekranie, gra testowa autora i „Udostępnij"

Czyste funkcje w `src/ui/menu.ts` (dolny pas edytora — pięć pól, okno „Dodaj" — 4 + 5 kafelków) i `canToggleArc` w `src/editor/model.ts`; w `src/ui/screens.ts`: sekcja „Twoje poziomy" („+ Nowy poziom" i projekty ze stanem), sesja edytora (zapis po każdej zmianie, w trakcie przeciągania — po puszczeniu palca), rysowanie edytora (strzał, kształty, zaznaczenie, uchwyty z kropką blokady, baner z podpowiedzią, dolny pas, okno „Dodaj"), dotyk (okno „Dodaj", pas, uchwyt — przeciągnięcie albo stuknięcie, zaznaczenie), gra testowa („‹" wraca do edytora, wygrana autora → `acceptWin` → „Edytuj | Udostępnij", nie trafia do postępu), „Udostępnij" (okienko `<dialog>` z tytułem w `index.html`, `navigator.share` → schowek → `window.prompt`).

**Pliki:**
- Zmiana: `index.html`
- Zmiana: `src/editor/model.ts`
- Zmiana: `src/ui/menu.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/editor/model.test.ts`
- Zmiana: `tests/ui/menu.test.ts`

**Interfejsy:**
- Konsumuje: zad. 1 (`MAX_TITLE`, `SharedLevel`, `cleanTitle`, `decodeLevel`, `encodeLevel`), zad. 2 (`linkFor`), zad. 3 (projekty), zad. 5–6 (model i interakcja edytora), zad. 7–8.
- Produkuje: `EDITOR_ACTIONS`, `editorBar(width, height)`, `editorBarHit(p, width, height)`, `addSheetLayout(width, height): { players; fixed }` (`menu.ts`); `canToggleArc(s)` (`model.ts`); w `index.html` — `<dialog id="udostepnij">` z `<input id="tytul" maxlength="40">` i przyciskami `value="anuluj"` / `value="ok"`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Zmiana w `tests/editor/model.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -3,9 +3,9 @@ import { vec } from "../../src/core/vec";
 import { ellipse } from "../../src/levels";
 import { MAX_OBSTACLES, MAX_PIECES, decodeLevel, roundShared } from "../../src/share/codec";
 import { openCode } from "../../src/share/verify";
 import {
-  EditorState, acceptWin, addObstacle, addPiece, cycleShot, draftCode, fromShared, newEditor, prepareTest, removeSelected,
+  EditorState, acceptWin, addObstacle, addPiece, canToggleArc, cycleShot, draftCode, fromShared, newEditor, prepareTest, removeSelected,
   toShared, toggleArc, toggleLock,
 } from "../../src/editor/model";
 import { SAMPLES } from "../share/samples";
 
@@ -60,8 +60,12 @@ describe("edytor — operacje", () => {
     s = toggleArc(s);
     expect(s.pieces[0].locked).toEqual([]);
     const okrag = addObstacle(e0, "okrag");
     expect(toggleArc(okrag)).toBe(okrag);
+    expect(canToggleArc(okrag)).toBe(false);
+    expect(canToggleArc(addPiece(e0, "elipsa"))).toBe(true);
+    expect(canToggleArc(addPiece(e0, "parabola"))).toBe(false);
+    expect(canToggleArc({ ...addPiece(e0, "elipsa"), selected: null })).toBe(false);
   });
 
   it("strzał po kolei: 360° → wachlarz → jedna piłka (ten sam kierunek) → 360°", () => {
     const a = cycleShot(e0);
```

Zmiana w `tests/ui/menu.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,9 +1,9 @@
 import { describe, it, expect } from "vitest";
 import { readFileSync } from "node:fs";
 import { vec } from "../../src/core/vec";
 import {
-  ACTION_BAND, COMMUNITY_TILE_H, MENU_BUTTON, Rect, SECTION_HEADER_H, TOP_BAND, cardLayout, clampScroll, communityLayout,
+  ACTION_BAND, COMMUNITY_TILE_H, EDITOR_ACTIONS, MENU_BUTTON, addSheetLayout, editorBar, editorBarHit, Rect, SECTION_HEADER_H, TOP_BAND, cardLayout, clampScroll, communityLayout,
   editAction, helpButton, hitCommunity, hitRect, hitTile, inActionBand, isTap, tabRects,
   menuLayout, playArea, resultBanner, settingsButton, settingsLayout, TILE_DESCENT, TILE_LINE_H, TILE_TITLE_Y, tileTitle, titleLineCount, winAction,
   winLabels, wrapByWords,
 } from "../../src/ui/menu";
@@ -401,4 +401,32 @@ describe("lista społeczności", () => {
     expect(isTap(vec(10, 10), vec(14, 13))).toBe(true);
     expect(isTap(vec(10, 10), vec(10, 30))).toBe(false);
   });
 });
+
+describe("edytor: dolny pas i okno „Dodaj”", () => {
+  for (const [w, h] of [[320, 568], [390, 844], [844, 390]] as const) {
+    it(`${w}×${h}: pięć przycisków w dolnym pasie, każdy ≥ 44 px`, () => {
+      const bar = editorBar(w, h);
+      expect(bar).toHaveLength(EDITOR_ACTIONS.length);
+      for (const r of bar) {
+        expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(44);
+        expect(r.y).toBeGreaterThanOrEqual(h * ACTION_BAND);
+      }
+      expect(editorBarHit(vec(bar[3].x + 5, bar[3].y + 5), w, h)).toBe(3);
+      expect(editorBarHit(vec(w / 2, h / 2), w, h)).toBeNull();
+    });
+
+    it(`${w}×${h}: okno „Dodaj” — 4 + 5 kafelków ≥ 44 px, na ekranie, bez nakładania`, () => {
+      const { players, fixed } = addSheetLayout(w, h);
+      expect(players).toHaveLength(4);
+      expect(fixed).toHaveLength(5);
+      const all = [...players, ...fixed];
+      all.forEach((r, i) => {
+        expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(44);
+        expect(r.x >= 0 && r.x + r.w <= w && r.y >= 0 && r.y + r.h <= h * ACTION_BAND).toBe(true);
+        all.slice(i + 1).forEach((u) => expect(overlap(r, u)).toBe(false));
+      });
+      expect(fixed[0].y).toBeGreaterThan(players[0].y + players[0].h);
+    });
+  }
+});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/menu.test.ts tests/editor/model.test.ts`
Oczekiwane: NIE przechodzą — brak `editorBar`, `addSheetLayout`, `canToggleArc`.

- [ ] **Krok 3: Implementacja**

Kolejność w `pointerdown` jest celowa: plansza z zasadą → „?" → „‹" w grze testowej → ☰ → ⚙ → ustawienia → menu → **edytor** → wygrana autora → zwykła wygrana → dowód/porażka → uchwyty gry. W `draw()` edytor rysuje się zamiast sceny gry i kończy rysowanie (`return`) po swoich nakładkach; funkcje rysujące są deklaracjami w ciele `draw`, więc wywołanie przed miejscem definicji działa.

Zmiana w `index.html` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -9,11 +9,31 @@
     <title>Golf geometryczny</title>
     <style>
       html, body { margin: 0; height: 100%; background: #0b0f14; overflow: hidden; }
       canvas { display: block; touch-action: none; }
+      /* okienko „Udostępnij" — jedyny element HTML nad płótnem (pole tekstowe = klawiatura telefonu) */
+      dialog { background: #10161e; color: #cbd5e1; border: 1px solid #64748b; border-radius: 12px;
+        font: 16px system-ui, sans-serif; width: min(320px, 86vw); }
+      dialog::backdrop { background: rgba(11, 15, 20, 0.8); }
+      dialog label { display: block; margin-bottom: 16px; }
+      dialog input { display: block; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px;
+        font: inherit; color: inherit; background: #0b0f14; border: 1px solid #64748b; border-radius: 8px; }
+      dialog menu { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 0; }
+      dialog button { flex: 1; min-height: 44px; font: 600 16px system-ui, sans-serif; border-radius: 8px;
+        border: 1px solid #64748b; background: transparent; color: #cbd5e1; }
+      dialog button[value="ok"] { color: #0b0f14; background: #5eead4; border-color: #5eead4; }
     </style>
   </head>
   <body>
     <canvas id="plansza"></canvas>
+    <dialog id="udostepnij">
+      <form method="dialog">
+        <label>Tytuł poziomu<input id="tytul" maxlength="40" autocomplete="off" /></label>
+        <menu>
+          <button value="anuluj">Anuluj</button>
+          <button value="ok">Udostępnij</button>
+        </menu>
+      </form>
+    </dialog>
     <script type="module" src="/src/main.ts"></script>
   </body>
 </html>
```

Zmiana w `src/editor/model.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -78,8 +78,16 @@ const keepLocks = (shape: MovableShape, locked: Handle[]): Handle[] => {
   const ids = handlePositions(shape).map((h) => h.id);
   return locked.filter((h) => ids.includes(h));
 };
 
+/** Czy „Łuk" ma co zrobić: zaznaczona jest elipsa, która nie jest okręgiem. */
+export function canToggleArc(s: EditorState): boolean {
+  const sel = s.selected;
+  if (sel === null) return false;
+  const shape = sel.kind === "element" ? s.pieces[sel.index]?.shape : s.obstacles[sel.index];
+  return shape !== undefined && shape.kind === "elipsa" && !isCircle(shape);
+}
+
 /** Zaznaczona elipsa (nie okrąg): pełna ↔ półelipsa od parametru 0 do π. */
 export function toggleArc(s: EditorState): EditorState {
   const sel = s.selected;
   if (sel === null) return s;
```

Zmiana w `src/ui/menu.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -275,4 +275,37 @@ export function hitCommunity(layout: CommunityLayout, p: Vec2): CommunityTile |
 }
 
 /** Dotknięcie, a nie przeciągnięcie: palec przesunął się o mniej niż 8 px. */
 export const isTap = (down: Vec2, up: Vec2): boolean => Math.hypot(up.x - down.x, up.y - down.y) < 8;
+
+// ── edytor: dolny pas i okno „Dodaj" ────────────────────────────────────────────────────
+
+/** Przyciski dolnego pasa edytora, od lewej. Ostatni to „Zagraj", a gdy projekt przeszedł
+ *  weryfikację — „Udostępnij". */
+export const EDITOR_ACTIONS = ["Dodaj", "Usuń", "Łuk", "Kierunek", "Zagraj"] as const;
+
+/** Pięć równych pól w dolnym pasie — na 320 px po 64 px, więc każde ≥ 44 px. */
+export function editorBar(width: number, height: number): Rect[] {
+  const top = height * ACTION_BAND;
+  const w = width / EDITOR_ACTIONS.length;
+  return EDITOR_ACTIONS.map((_, i) => ({ x: i * w, y: top, w, h: height - top }));
+}
+
+/** Indeks przycisku pasa edytora pod palcem albo `null`. */
+export function editorBarHit(p: Vec2, width: number, height: number): number | null {
+  const i = editorBar(width, height).findIndex((r) => hitRect(r, p));
+  return i < 0 ? null : i;
+}
+
+/** Okno „Dodaj": rząd elementów gracza (4) i rząd stałych (5), kafelki ≥ 44 px, wyśrodkowane
+ *  w pionie; nad każdym rzędem miejsce na podpis. */
+export function addSheetLayout(width: number, height: number): { players: Rect[]; fixed: Rect[] } {
+  const size = Math.min(72, (width - 2 * SIDE - 4 * GAP) / 5);
+  const row = (n: number, y: number): Rect[] => {
+    const total = n * size + (n - 1) * GAP;
+    return Array.from({ length: n }, (_, i) => ({ x: (width - total) / 2 + i * (size + GAP), y, w: size, h: size }));
+  };
+  const label = 28;
+  const block = 2 * (label + size) + GAP;
+  const top = Math.max(TOP, (height - block) / 2);
+  return { players: row(4, top + label), fixed: row(5, top + label + size + GAP + label) };
+}
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,6 +1,6 @@
 import { Vec2, vec } from "../core/vec";
-import { Card, LEVELS, Level, SNAP_RADIUS, Shape, sceneTraces, shapeFoci, shapeToPiece } from "../levels";
+import { Card, LEVELS, Level, SNAP_RADIUS, Shape, mechanicCard, sceneTraces, shapeFoci, shapeToPiece } from "../levels";
 import { makeCamera, rectCamera } from "../render/camera";
 import {
   PALETTE, SECTOR_REACH, boardFrame, dashedPolyline, drawPiece, glowDot, glowPolyline, handleShape, holeMark,
   sectorWedge,
@@ -10,25 +10,55 @@ import { handleMark, shapeStyle } from "../render/style";
 import { positionAt, trailSegment } from "../render/trails";
 import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
 import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
 import {
-  MENU_BUTTON, MenuTab, SECTION_HEADER_H, cardLayout, clampScroll, communityLayout, editAction, helpButton, hitCommunity,
+  EDITOR_ACTIONS, MENU_BUTTON, MenuTab, SECTION_HEADER_H, addSheetLayout, cardLayout, editorBar, editorBarHit, clampScroll, communityLayout, editAction, helpButton, hitCommunity,
   hitRect, hitTile, inActionBand, isTap, menuLayout, playArea, resultBanner, settingsButton, settingsLayout, tabRects,
   TILE_LINE_H, TILE_NUMBER_Y, TILE_TITLE_Y, tileTitle, titleLineCount, winAction, winLabels, wrapByWords,
 } from "./menu";
 import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
 import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";
 import { Playlist, autoCardIn, bannerLabel, current, helpCard, isLastIn, nextIn } from "./playlist";
-import { addLink, loadLinks, saveLinks } from "./collections";
+import {
+  MAX_PROJECTS, Project, addLink, loadLinks, loadProjects, removeProject, saveLinks, saveProjects, upsertProject,
+} from "./collections";
 import { loadCatalog } from "../share/catalog";
-import { codeFromHash, openCode } from "../share/verify";
+import { MAX_TITLE, SharedLevel, cleanTitle, decodeLevel, encodeLevel } from "../share/codec";
+import { codeFromHash, linkFor, openCode } from "../share/verify";
+import {
+  EditorState, ObstacleKind, PieceKind, acceptWin, addObstacle, addPiece, canAddObstacle, canAddPiece, canToggleArc,
+  cycleShot, draftCode, fromShared, newEditor, prepareTest, removeSelected, toggleArc, toggleLock,
+} from "../editor/model";
+import { EditorHandleRef, applyEditorDrag, editorHandles, pickEditorHandle, selectAt } from "../editor/interaction";
 
 const TRAIL = 0.35;
 const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy
 const TOAST_S = 2.5;    // jak długo wisi komunikat na dole ekranu
 
 /** Sekcje zakładki „Społeczność" w kolejności rysowania. */
-const COMMUNITY_SECTIONS = ["katalog", "linki"] as const;
+const COMMUNITY_SECTIONS = ["katalog", "moje", "linki"] as const;
+type CommunitySection = (typeof COMMUNITY_SECTIONS)[number];
+
+/** Kafelki okna „Dodaj" — w tej samej kolejności co `addSheetLayout`. */
+const PIECE_KINDS: { kind: PieceKind; label: string }[] = [
+  { kind: "elipsa", label: "Elipsa" }, { kind: "parabola", label: "Parabola" },
+  { kind: "hiperbola", label: "Hiperbola" }, { kind: "odcinek", label: "Lustro" },
+];
+const OBSTACLE_KINDS: { kind: ObstacleKind; label: string }[] = [
+  { kind: "okrag", label: "Okrąg" }, { kind: "banda", label: "Banda" }, { kind: "elipsa", label: "Elipsa" },
+  { kind: "parabola", label: "Parabola" }, { kind: "hiperbola", label: "Hiperbola" },
+];
+
+/** Projekt otwarty w edytorze. `code` — zapis do pamięci (szkic albo, gdy `ready`, gotowy kod
+ *  linku z rozwiązaniem autora); `testing` — poziom, który autor właśnie przechodzi. */
+interface EditorSession {
+  key: string;
+  state: EditorState;
+  ready: boolean;
+  code: string;
+  testing: SharedLevel | null;
+  addOpen: boolean;
+}
 
 export function mount(canvas: HTMLCanvasElement): void {
   const ctx = canvas.getContext("2d")!;
   const store = browserStore();
@@ -46,8 +76,14 @@ export function mount(canvas: HTMLCanvasElement): void {
   const catalog = loadCatalog();
   let links = loadLinks(store);
   /** komunikat na dole ekranu (np. o złym linku) i czas, do którego wisi */
   let toast: { text: string; until: number } | null = null;
+  let projects: Project[] = loadProjects(store);
+  let editor: EditorSession | null = null;
+  /** uchwyt przeciągany w edytorze; `moved` — palec ruszył się dalej niż stuknięcie */
+  let editorDrag: { ref: EditorHandleRef; down: Vec2; moved: boolean } | null = null;
+  const inEditor = (): boolean => editor !== null && editor.testing === null;
+  const inTest = (): boolean => editor !== null && editor.testing !== null;
   let settings = loadSettings(store);
   let settingsOpen = false;
   /** otwarta plansza z zasadą; `null` — żadna */
   let card: Card | null = autoCardIn(playlist, progress.solved) ?? null;
@@ -84,12 +120,13 @@ export function mount(canvas: HTMLCanvasElement): void {
    *  dopisaniu linku, nie w każdej klatce rysowania. */
   const decodeLinks = (): Level[] => links.flatMap((c) => { const o = openCode(c); return o.ok ? [o.level] : []; });
   let linkLevels = decodeLinks();
   const catalogLevels = catalog.map((c) => c.level);
-  const sectionLevels = (section: (typeof COMMUNITY_SECTIONS)[number]): Level[] =>
-    section === "katalog" ? catalogLevels : linkLevels;
+  const sectionLevels = (section: "katalog" | "linki"): Level[] => (section === "katalog" ? catalogLevels : linkLevels);
 
   function play(next: Playlist): void {
+    // zwykła gra zamyka edytor — projekt jest już zapisany (każda zmiana zapisuje się sama)
+    editor = null;
     playlist = next;
     game = newGame(current(next));
     // „ostatnio grany" dotyczy tylko listy twórców — poziomy społeczności nie mają numeru
     if (next.section === "tworcy") {
@@ -100,8 +137,139 @@ export function mount(canvas: HTMLCanvasElement): void {
     card = autoCardIn(next, progress.solved) ?? null;
   }
 
   // zegar `performance.now`, nie `time` z klatki — `openFromHash` woła to przed pierwszą klatką
+  /** Zapis projektu w pamięci przeglądarki — po każdej zmianie (bez przycisku „Zapisz"). */
+  function saveProject(e: EditorSession): void {
+    const list = upsertProject(projects, { key: e.key, code: e.code, ready: e.ready });
+    if (list === null) return;
+    projects = list;
+    saveProjects(store, projects);
+  }
+
+  /** Zmiana treści projektu: wraca do szkicu (trzeba go przejść jeszcze raz). `save: false`
+   *  w trakcie przeciągania — zapis dopiero po puszczeniu palca. */
+  function editorChanged(next: EditorState, save = true): void {
+    if (editor === null) return;
+    editor = { ...editor, state: next, ready: false, code: draftCode(next) };
+    if (save) saveProject(editor);
+  }
+
+  /** Samo zaznaczenie nie zmienia treści — gotowy projekt zostaje gotowy. */
+  function editorSelect(next: EditorState["selected"]): void {
+    if (editor !== null) editor = { ...editor, state: { ...editor.state, selected: next } };
+  }
+
+  function newProject(): void {
+    menuOpen = false;
+    if (projects.length >= MAX_PROJECTS) {
+      say(`Najwyżej ${MAX_PROJECTS} projektów — usuń któryś`);
+      return;
+    }
+    const state = newEditor(`Mój poziom ${projects.length + 1}`);
+    editor = { key: `moj-${Date.now().toString(36)}`, state, ready: false, code: draftCode(state), testing: null, addOpen: false };
+    saveProject(editor);
+  }
+
+  function openProject(p: Project): void {
+    menuOpen = false;
+    const d = decodeLevel(p.code, { draft: true });
+    if (!d.ok) return;
+    editor = { key: p.key, state: fromShared(d.level), ready: p.ready, code: p.code, testing: null, addOpen: false };
+  }
+
+  /** „Zagraj": autor przechodzi swój poziom zwykłą grą. */
+  function startTest(): void {
+    if (editor === null) return;
+    const t = prepareTest(editor.state);
+    if (!t.ok) {
+      say(t.reason === "brak elementów" ? "Dodaj co najmniej jeden element gracza" : "Start już wygrywa — przestaw coś");
+      return;
+    }
+    editor = { ...editor, testing: t.shared };
+    game = newGame(t.level);
+    card = null;
+  }
+
+  const backToEditor = (): void => {
+    if (editor !== null) editor = { ...editor, testing: null };
+  };
+
+  /** Autor wygrał: zaokrąglone ustawienie przechodzi dowód jeszcze raz i staje się rozwiązaniem. */
+  function acceptAuthorWin(): void {
+    if (editor === null || editor.testing === null) return;
+    const r = acceptWin(editor.testing, game.pieces);
+    if (!r.ok) {
+      say("Za blisko krawędzi — spróbuj jeszcze raz");
+      game = retry(game);
+      return;
+    }
+    editor = { ...editor, ready: true, code: r.code };
+    saveProject(editor);
+    say("Przeszedłeś swój poziom — możesz go udostępnić");
+  }
+
+  /** Akcje dolnego pasa edytora (`EDITOR_ACTIONS`). */
+  function editorAction(i: number): void {
+    if (editor === null) return;
+    const st = editor.state;
+    if (i === 0) {
+      editor = { ...editor, addOpen: true };
+    } else if (i === 1) {
+      if (st.selected !== null) editorChanged(removeSelected(st));
+      else if (window.confirm(`Usunąć cały projekt „${st.title}"?`)) {
+        projects = removeProject(projects, editor.key);
+        saveProjects(store, projects);
+        editor = null;
+        menuOpen = true;
+        menuTab = "spolecznosc";
+      }
+    } else if (i === 2) {
+      if (canToggleArc(st)) editorChanged(toggleArc(st));
+    } else if (i === 3) {
+      editorChanged(cycleShot(st));
+    } else if (editor.ready) {
+      share();
+    } else {
+      startTest();
+    }
+  }
+
+  // ── „Udostępnij": okienko z tytułem (HTML nad płótnem — działa klawiatura telefonu) ──────
+  const shareDialog = document.getElementById("udostepnij");
+  const titleInput = document.getElementById("tytul");
+
+  function share(): void {
+    if (editor === null || !editor.ready) return;
+    if (!(shareDialog instanceof HTMLDialogElement) || !(titleInput instanceof HTMLInputElement)) return;
+    titleInput.value = editor.state.title;
+    shareDialog.returnValue = "";
+    shareDialog.showModal();
+  }
+
+  /** Okienko zamknięte: przy „Udostępnij" — nowy tytuł do kodu (dowodu to nie zmienia), zapis
+   *  projektu i link do systemowego udostępniania albo do schowka. */
+  function finishShare(): void {
+    if (editor === null || !(shareDialog instanceof HTMLDialogElement) || !(titleInput instanceof HTMLInputElement)) return;
+    if (shareDialog.returnValue !== "ok") return;
+    const typed = [...cleanTitle(titleInput.value)].slice(0, MAX_TITLE).join("");
+    const title = typed.length > 0 ? typed : editor.state.title;
+    const d = decodeLevel(editor.code);
+    if (!d.ok) return;
+    const code = encodeLevel({ ...d.level, title });
+    editor = { ...editor, code, state: { ...editor.state, title } };
+    saveProject(editor);
+    const link = linkFor(window.location.origin + window.location.pathname, code);
+    if (typeof navigator.share === "function") {
+      navigator.share({ title, url: link }).catch(() => { /* gracz zamknął okno udostępniania */ });
+    } else if (navigator.clipboard !== undefined) {
+      navigator.clipboard.writeText(link).then(() => say("Skopiowano link"), () => window.prompt("Skopiuj link:", link));
+    } else {
+      window.prompt("Skopiuj link:", link);
+    }
+  }
+  if (shareDialog instanceof HTMLDialogElement) shareDialog.addEventListener("close", finishShare);
+
   const say = (text: string): void => { toast = { text, until: performance.now() / 1000 + TOAST_S }; };
 
   /** Link `…#poziom=<kod>`: poziom trafia do „Z linków" i od razu się otwiera (poziom
    *  z katalogu otwiera się w katalogu); zły link — komunikat i zwykła gra. Końcówka adresu
@@ -140,14 +308,15 @@ export function mount(canvas: HTMLCanvasElement): void {
   }
 
   /** „?" jest rysowane i dotykalne tylko poza menu, ustawieniami i dowodem (wtedy napis
    *  „Poziom N / M" obok niego też nie jest rysowany). */
-  const helpVisible = (): boolean => !menuOpen && !settingsOpen && game.phase !== "dowod";
+  const helpVisible = (): boolean => !menuOpen && !settingsOpen && game.phase !== "dowod" && !inEditor();
 
   /** „?" — plansza mechaniki bieżącego poziomu. Dowód nie może trwać, gdy „?" jest
    *  dotykalne (patrz `helpVisible`), więc nie ma czego przerywać. */
   function openHelp(): void {
-    card = helpCard(playlist) ?? null;
+    // w grze testowej autora — plansza według mechaniki, jak dla poziomów społeczności
+    card = (inTest() ? mechanicCard(game.level) : helpCard(playlist)) ?? null;
   }
 
   function toggleSettings(): void {
     settingsOpen = !settingsOpen;
@@ -172,8 +341,14 @@ export function mount(canvas: HTMLCanvasElement): void {
       openHelp();
       consumedReset = true;
       return;
     }
+    if (hitRect(MENU_BUTTON, p) && inTest() && !menuOpen && !settingsOpen) {
+      // w grze testowej przycisk w lewym górnym rogu to „‹" — powrót do edytora
+      backToEditor();
+      consumedReset = true;
+      return;
+    }
     if (hitRect(MENU_BUTTON, p)) {
       toggleMenu();
       consumedReset = true;
       return;
@@ -213,8 +388,21 @@ export function mount(canvas: HTMLCanvasElement): void {
       if (i !== null) play({ section: "tworcy", levels: LEVELS, index: i });
       menuOpen = false;
       return;
     }
+    if (editor !== null && editor.testing === null) {
+      editorDown(e, p);
+      consumedReset = true;
+      return;
+    }
+    if (game.phase === "wygrana" && inTest()) {
+      // wygrana autora: „Edytuj" wraca do edytora, prawa połowa udostępnia
+      const action = winAction(p, viewW(), viewH(), true);
+      if (action === "powtorz") backToEditor();
+      else if (action !== null) share();
+      consumedReset = true;
+      return;
+    }
     if (game.phase === "wygrana") {
       const action = winAction(p, viewW(), viewH(), isLastIn(playlist));
       if (action === "nastepny") play(nextIn(playlist));
       if (action === "menu") menuOpen = true;
@@ -243,11 +431,73 @@ export function mount(canvas: HTMLCanvasElement): void {
     pointer = w;
     canvas.setPointerCapture(e.pointerId);
   });
 
-  const communityCounts = (): number[] => COMMUNITY_SECTIONS.map((sec) => sectionLevels(sec).length);
+  const countOf = (sec: CommunitySection): number => (sec === "moje" ? projects.length + 1 : sectionLevels(sec).length);
+  const communityCounts = (): number[] => COMMUNITY_SECTIONS.map(countOf);
+
+  /** Dotknięcie w edytorze: okno „Dodaj", dolny pas, uchwyt (przeciąganie albo stuknięcie —
+   *  rozstrzyga `pointerup`) albo zaznaczenie krzywej. */
+  function editorDown(e: PointerEvent, p: Vec2): void {
+    if (editor === null) return;
+    const w = viewW();
+    const h = viewH();
+    if (editor.addOpen) {
+      const sheet = addSheetLayout(w, h);
+      const i = sheet.players.findIndex((r) => hitRect(r, p));
+      const j = sheet.fixed.findIndex((r) => hitRect(r, p));
+      const st = editor.state;
+      editor = { ...editor, addOpen: false };
+      if (i >= 0 && canAddPiece(st)) editorChanged(addPiece(st, PIECE_KINDS[i].kind));
+      if (j >= 0 && canAddObstacle(st)) editorChanged(addObstacle(st, OBSTACLE_KINDS[j].kind));
+      return;
+    }
+    const bar = editorBarHit(p, w, h);
+    if (bar !== null) {
+      editorAction(bar);
+      return;
+    }
+    const world = toWorld(e);
+    const radius = (HANDLE_PX * 1.5) / cam().scale;
+    const ref = pickEditorHandle(editor.state, world, radius);
+    if (ref !== null) {
+      editorDrag = { ref, down: p, moved: false };
+      canvas.setPointerCapture(e.pointerId);
+      return;
+    }
+    editorSelect(selectAt(editor.state, world, radius));
+  }
+
+  /** Puszczenie uchwytu: po przeciągnięciu — zapis; po stuknięciu — zaznaczenie właściciela
+   *  uchwytu, a stuknięcie w uchwyt JUŻ zaznaczonego elementu gracza przełącza jego blokadę. */
+  function editorUp(): void {
+    if (editor === null || editorDrag === null) return;
+    const { ref, moved } = editorDrag;
+    editorDrag = null;
+    if (moved) {
+      saveProject(editor);
+      return;
+    }
+    const sel = editor.state.selected;
+    if (ref.target === "element") {
+      if (sel !== null && sel.kind === "element" && sel.index === ref.index) {
+        editorChanged(toggleLock(editor.state, ref.index, ref.id));
+      } else {
+        editorSelect({ kind: "element", index: ref.index });
+      }
+    } else if (ref.target === "przeszkoda") {
+      editorSelect({ kind: "przeszkoda", index: ref.index });
+    }
+  }
 
   canvas.addEventListener("pointermove", (e) => {
+    if (editorDrag !== null && editor !== null) {
+      const sp = toScreenPoint(e);
+      if (!editorDrag.moved && isTap(editorDrag.down, sp)) return;
+      editorDrag = { ...editorDrag, moved: true };
+      editorChanged(applyEditorDrag(editor.state, editorDrag.ref, toWorld(e), SNAP_RADIUS), false);
+      return;
+    }
     if (listPointer !== null) {
       const dy = toScreenPoint(e).y - listPointer.down.y;
       const { maxScroll } = communityLayout(viewW(), viewH(), communityCounts(), 0);
       communityScroll = clampScroll(listPointer.scroll0 - dy, maxScroll);
@@ -267,26 +517,37 @@ export function mount(canvas: HTMLCanvasElement): void {
     const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped, lockedA) : s));
     game = { ...game, pieces };
   });
 
-  const endDrag = (): void => { dragging = null; pointer = null; listPointer = null; };
+  const endDrag = (): void => { dragging = null; pointer = null; listPointer = null; editorDrag = null; };
   canvas.addEventListener("pointercancel", endDrag);
 
   // JEDEN listener, nie dwa. Osobny `endDrag` zarejestrowany wcześniej wyzerowałby
   // `dragging`, ZANIM drugi listener zdążyłby sprawdzić, czy właśnie trwało przeciąganie
   // — więc puszczenie uchwytu w dolnym pasie ekranu uruchamiałoby dowód wbrew graczowi
   // i kasowało jego niedokończoną edycję. W pionie geometria kamery przypadkiem chroni
   // przed tym (plansza nie sięga pasa przycisku), ale nic nie wymusza pionu.
-  /** Stuknięcie w listę społeczności: kafelek otwiera poziom swojej sekcji, tło zamyka menu. */
+  /** Stuknięcie w listę społeczności: kafelek otwiera poziom swojej sekcji (w „Twoich
+   *  poziomach" — edytor albo nowy projekt), tło zamyka menu. */
   function tapCommunity(p: Vec2): void {
     const hit = hitCommunity(communityLayout(viewW(), viewH(), communityCounts(), communityScroll), p);
     menuOpen = false;
     if (hit === null) return;
     const section = COMMUNITY_SECTIONS[hit.section];
+    if (section === "moje") {
+      if (hit.index === 0) newProject();
+      else openProject(projects[hit.index - 1]);
+      return;
+    }
     play({ section, levels: sectionLevels(section), index: hit.index });
   }
 
   canvas.addEventListener("pointerup", (e) => {
+    if (editorDrag !== null) {
+      editorUp();
+      consumedReset = false;
+      return;
+    }
     if (listPointer !== null) {
       const up = toScreenPoint(e);
       if (isTap(listPointer.down, up)) tapCommunity(up);
       listPointer = null;
@@ -311,10 +572,13 @@ export function mount(canvas: HTMLCanvasElement): void {
     if (!menuOpen && !settingsOpen && card === null) {
       const before = game.phase;
       game = advance(game, dt);
       if (before === "dowod" && game.phase === "wygrana") {
-        progress = markSolved(progress, game.level.id);
-        saveProgress(store, progress);
+        if (inTest()) acceptAuthorWin();
+        else {
+          progress = markSolved(progress, game.level.id);
+          saveProgress(store, progress);
+        }
       }
     }
     draw();
     requestAnimationFrame(frame);
@@ -328,8 +592,18 @@ export function mount(canvas: HTMLCanvasElement): void {
 
     // brzeg planszy jest ścianą: jaśniejsze tło planszy i stonowana ramka
     boardFrame(ctx, c, PALETTE.board, PALETTE.frame, PALETTE.frameGlow, 1);
 
+    if (editor !== null && editor.testing === null) {
+      drawEditor(editor);
+      if (menuOpen) drawMenu();
+      if (settingsOpen) drawSettings();
+      drawMenuButton();
+      drawSettingsButton();
+      if (toast !== null && time < toast.until) drawToast(toast.text);
+      return;
+    }
+
     // wachlarz tylko w edycji i tylko gdy poziom go ma — bez niego łuk „nie tam,
     // gdzie lecą piłki" wyglądałby na błąd gry; klin jest mały i przycięty do planszy,
     // strzałka nie jest przycinana, ale się mieści: piłki etapu 0 leżą co najmniej 0.4
     // pod górną ścianą (patrz test w `tests/levels.test.ts`)
@@ -421,9 +695,14 @@ export function mount(canvas: HTMLCanvasElement): void {
         const color = game.phase === "porazka" && !b.holed ? PALETTE.miss : PALETTE.trail;
         glowPolyline(ctx, c, trailSegment(b.path, s, TRAIL), color, PALETTE.trailGlow, 2);
         glowDot(ctx, c, positionAt(b.path, s), PALETTE.ball, PALETTE.ballGlow, 4);
       }
-      if (game.phase === "wygrana") {
+      if (game.phase === "wygrana" && inTest()) {
+        for (const b of game.proof.balls) {
+          glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
+        }
+        banner(resultBanner(game.proof.balls.length, 0).title, "", ["Edytuj", "Udostępnij"]);
+      } else if (game.phase === "wygrana") {
         for (const b of game.proof.balls) {
           glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
         }
         // pod tytułem tylko dopisek ostatniego poziomu; na pozostałych — nic
@@ -469,9 +748,9 @@ export function mount(canvas: HTMLCanvasElement): void {
       const h = viewH();
       ctx.textAlign = "center";
       ctx.fillStyle = PALETTE.muted;
       ctx.font = "12px system-ui, sans-serif";
-      ctx.fillText(bannerLabel(playlist), w / 2, 22);
+      ctx.fillText(topLabel(), w / 2, 22);
       ctx.fillStyle = PALETTE.text;
       ctx.font = "600 18px system-ui, sans-serif";
       ctx.fillText(title, w / 2, 46);
       // Podpowiedź ZAWIJAMY. Bez tego instrukcja poziomu urywa się na szerokości
@@ -499,10 +778,27 @@ export function mount(canvas: HTMLCanvasElement): void {
       }
       ctx.textAlign = "left";
     }
 
+    /** Pierwsza linia banera: numer albo „Społeczność", w edytorze „Edytor", w grze autora „Test". */
+    function topLabel(): string {
+      if (editor === null) return bannerLabel(playlist);
+      return editor.testing === null ? "Edytor" : "Test";
+    }
+
     function drawMenuButton(): void {
       const b = MENU_BUTTON;
+      if (inTest() && !menuOpen && !settingsOpen) {
+        // „‹" — w grze testowej ten przycisk wraca do edytora
+        ctx.strokeStyle = PALETTE.text;
+        ctx.lineWidth = 2.5;
+        ctx.beginPath();
+        ctx.moveTo(b.x + b.w / 2 + 5, b.y + b.h / 2 - 10);
+        ctx.lineTo(b.x + b.w / 2 - 5, b.y + b.h / 2);
+        ctx.lineTo(b.x + b.w / 2 + 5, b.y + b.h / 2 + 10);
+        ctx.stroke();
+        return;
+      }
       ctx.fillStyle = menuOpen ? PALETTE.curve : PALETTE.text;
       for (let i = -1; i <= 1; i++) {
         ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 + i * 6 - 1, 20, 2);
       }
@@ -511,9 +807,9 @@ export function mount(canvas: HTMLCanvasElement): void {
     /** „?" w kółku tuż za napisem „Poziom N / M" (ten sam wiersz, `helpButton` obejmuje oba).
      *  Kółko liniami i „?" znakiem ASCII — nie polegamy na glifie ⓘ w czcionce telefonu. */
     function drawHelpButton(): void {
       ctx.font = "12px system-ui, sans-serif";
-      const tw = ctx.measureText(bannerLabel(playlist)).width;
+      const tw = ctx.measureText(topLabel()).width;
       const cx = viewW() / 2 + tw / 2 + 14;
       ctx.strokeStyle = PALETTE.muted;
       ctx.lineWidth = 1.5;
       ctx.beginPath();
@@ -556,8 +852,101 @@ export function mount(canvas: HTMLCanvasElement): void {
       ctx.fillText("Gram", w / 2, h * 0.93);
       ctx.textAlign = "left";
     }
 
+    /** Edytor: strzał, przeszkody, elementy gracza (zaznaczony z szerszą poświatą), piłka, dołek,
+     *  wszystkie uchwyty (zablokowany uchwyt elementu ma pełną kropkę w środku), baner
+     *  z podpowiedzią, dolny pas i okno „Dodaj". */
+    function drawEditor(ed: EditorSession): void {
+      const st = ed.state;
+      const w = viewW();
+      const h = viewH();
+      if (st.shot.kind === "wachlarz") {
+        sectorWedge(ctx, c, st.ball, { center: st.shot.center, width: st.shot.width }, SECTOR_REACH, PALETTE.sector);
+      } else if (st.shot.kind === "jedna") {
+        for (const linia of shotArrow(st.ball, st.shot.center, SECTOR_REACH)) {
+          glowPolyline(ctx, c, linia, PALETTE.shot, "rgba(0,0,0,0)", 1.5);
+        }
+      }
+      const sel = st.selected;
+      const drawShape = (shape: Shape, owner: "gracz" | "staly", selected: boolean) => {
+        const style = shapeStyle(shape, owner);
+        if (shape.kind === "parabola") dashedPolyline(ctx, c, parabolaAxis(shape), style.line, 1);
+        drawPiece(ctx, c, shapeToPiece(shape), style.line, selected ? "rgba(248,250,252,0.22)" : style.glow, selected ? 3 : 2);
+      };
+      st.obstacles.forEach((o, i) => drawShape(o, "staly", sel !== null && sel.kind === "przeszkoda" && sel.index === i));
+      st.pieces.forEach((q, i) => drawShape(q.shape, "gracz", sel !== null && sel.kind === "element" && sel.index === i));
+      holeMark(ctx, c, st.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 9);
+      glowDot(ctx, c, st.ball, PALETTE.ball, PALETTE.ballGlow, 6);
+      for (const hnd of editorHandles(st)) {
+        const ref = hnd.ref;
+        if (ref.target === "element") {
+          const piece = st.pieces[ref.index];
+          const style = shapeStyle(piece.shape, "gracz");
+          handleShape(ctx, c, hnd.pos, handleMark(ref.id), style.line, style.glow, 11);
+          if (piece.locked.includes(ref.id)) glowDot(ctx, c, hnd.pos, style.line, "rgba(0,0,0,0)", 4);
+        } else if (ref.target === "przeszkoda") {
+          const style = shapeStyle(st.obstacles[ref.index], "staly");
+          handleShape(ctx, c, hnd.pos, handleMark(ref.id), style.line, "rgba(0,0,0,0)", 9);
+        } else {
+          handleShape(ctx, c, hnd.pos, "kwadrat", PALETTE.muted, "rgba(0,0,0,0)", 9);
+        }
+      }
+      const hint = sel === null ? "Stuknij krzywą, żeby ją zaznaczyć. Uchwyty przeciągaj."
+        : sel.kind === "element" ? "Stuknij uchwyt zaznaczonego elementu, żeby go zablokować graczowi."
+        : "Zaznaczona przeszkoda: przeciągaj jej uchwyty albo ją usuń.";
+      banner(st.title, hint, ["", ""]);
+      // dolny pas: pięć przycisków; nieaktywne przygaszone
+      ctx.fillStyle = PALETTE.overlay;
+      ctx.fillRect(0, h * 0.86, w, h * 0.14);
+      const enabled = [canAddPiece(st) || canAddObstacle(st), true, canToggleArc(st), true, true];
+      editorBar(w, h).forEach((r, i) => {
+        const label = i === EDITOR_ACTIONS.length - 1 && ed.ready ? "Udostępnij" : EDITOR_ACTIONS[i];
+        ctx.textAlign = "center";
+        ctx.font = "600 14px system-ui, sans-serif";
+        ctx.fillStyle = !enabled[i] ? PALETTE.muted : i === EDITOR_ACTIONS.length - 1 ? PALETTE.curve : PALETTE.text;
+        ctx.fillText(label, r.x + r.w / 2, h * 0.93);
+      });
+      ctx.textAlign = "left";
+      if (ed.addOpen) drawAddSheet(st);
+    }
+
+    function drawAddSheet(st: EditorState): void {
+      const w = viewW();
+      const h = viewH();
+      ctx.fillStyle = PALETTE.overlay;
+      ctx.fillRect(0, 0, w, h);
+      const { players, fixed } = addSheetLayout(w, h);
+      const rows = [
+        { title: "Twoje — tym rusza gracz", rects: players, labels: PIECE_KINDS.map((k) => k.label), on: canAddPiece(st) },
+        { title: "Stałe", rects: fixed, labels: OBSTACLE_KINDS.map((k) => k.label), on: canAddObstacle(st) },
+      ];
+      for (const row of rows) {
+        ctx.textAlign = "left";
+        ctx.font = "600 14px system-ui, sans-serif";
+        ctx.fillStyle = PALETTE.text;
+        ctx.fillText(row.title, row.rects[0].x, row.rects[0].y - 10);
+        row.rects.forEach((r, i) => {
+          ctx.beginPath();
+          ctx.roundRect(r.x, r.y, r.w, r.h, 10);
+          ctx.fillStyle = PALETTE.tile;
+          ctx.fill();
+          ctx.lineWidth = 1;
+          ctx.strokeStyle = PALETTE.tileEdge;
+          ctx.stroke();
+          ctx.textAlign = "center";
+          ctx.font = "11px system-ui, sans-serif";
+          ctx.fillStyle = row.on ? PALETTE.text : PALETTE.muted;
+          ctx.fillText(row.labels[i], r.x + r.w / 2, r.y + r.h / 2 + 4);
+        });
+      }
+      ctx.textAlign = "center";
+      ctx.font = "13px system-ui, sans-serif";
+      ctx.fillStyle = PALETTE.muted;
+      ctx.fillText("Stuknij obok, żeby zamknąć.", w / 2, fixed[0].y + fixed[0].h + 32);
+      ctx.textAlign = "left";
+    }
+
     /** Zębatka rysowana liniami — nie polegamy na glifie ⚙ w czcionce telefonu. */
     function drawSettingsButton(): void {
       const b = settingsButton(viewW());
       const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
@@ -671,29 +1060,34 @@ export function mount(canvas: HTMLCanvasElement): void {
       ctx.save();
       ctx.beginPath();
       ctx.rect(v.x, v.y, v.w, v.h);
       ctx.clip();
-      const titles = { katalog: "Katalog", linki: "Z linków" };
+      const titles = { katalog: "Katalog", moje: "Twoje poziomy", linki: "Z linków" };
       const empty = {
         katalog: "Na razie pusto — przyślij twórcy link do swojego poziomu.",
+        moje: "",
         linki: "Tu trafią poziomy otwarte z linków.",
       };
       for (const head of layout.headers) {
         const section = COMMUNITY_SECTIONS[head.section];
         ctx.textAlign = "left";
         ctx.font = "600 15px system-ui, sans-serif";
         ctx.fillStyle = PALETTE.text;
         ctx.fillText(titles[section], 16, head.y + 22);
-        if (sectionLevels(section).length === 0) {
+        if (countOf(section) === 0) {
           ctx.font = "13px system-ui, sans-serif";
           ctx.fillStyle = PALETTE.muted;
           ctx.fillText(empty[section], 16, head.y + SECTION_HEADER_H + 24);
         }
       }
       for (const t of layout.tiles) {
         const section = COMMUNITY_SECTIONS[t.section];
-        const lvl = sectionLevels(section)[t.index];
         const r = t.rect;
+        if (section === "moje") {
+          drawProjectTile(r, t.index);
+          continue;
+        }
+        const lvl = sectionLevels(section)[t.index];
         const here = playlist.section === section && playlist.index === t.index;
         ctx.beginPath();
         ctx.roundRect(r.x, r.y, r.w, r.h, 10);
         ctx.fillStyle = PALETTE.tile;
@@ -721,8 +1115,38 @@ export function mount(canvas: HTMLCanvasElement): void {
         ctx.fillText(note, r.x + 12, r.y + r.h - 12);
       }
       ctx.restore();
     }
+
+    /** Kafelek „Twoich poziomów": pierwszy to „+ Nowy poziom", reszta — projekty ze stanem. */
+    function drawProjectTile(r: { x: number; y: number; w: number; h: number }, index: number): void {
+      ctx.beginPath();
+      ctx.roundRect(r.x, r.y, r.w, r.h, 10);
+      ctx.fillStyle = PALETTE.tile;
+      ctx.fill();
+      ctx.lineWidth = 1;
+      ctx.strokeStyle = PALETTE.tileEdge;
+      ctx.stroke();
+      ctx.textAlign = "left";
+      if (index === 0) {
+        ctx.font = "600 15px system-ui, sans-serif";
+        ctx.fillStyle = PALETTE.curve;
+        ctx.fillText("+ Nowy poziom", r.x + 12, r.y + r.h / 2 + 5);
+        return;
+      }
+      const p = projects[index - 1];
+      const d = decodeLevel(p.code, { draft: true });
+      ctx.fillStyle = PALETTE.text;
+      const title = tileTitle(d.ok ? d.level.title : "?", r.w - 24, (size) => {
+        ctx.font = `600 ${size + 1}px system-ui, sans-serif`;
+        return measure;
+      }, 2);
+      ctx.font = `600 ${title.size + 1}px system-ui, sans-serif`;
+      title.lines.forEach((line, j) => ctx.fillText(line, r.x + 12, r.y + 24 + j * 17));
+      ctx.font = "12px system-ui, sans-serif";
+      ctx.fillStyle = p.ready ? PALETTE.curve : PALETTE.muted;
+      ctx.fillText(p.ready ? "gotowy" : "szkic", r.x + 12, r.y + r.h - 12);
+    }
   }
 
   window.addEventListener("resize", resize);
   window.addEventListener("hashchange", openFromHash);
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 790 testów zielonych. `npm run build` — ok. 23.8 KB gzip. Ręcznie, 390×844 (tak jak przeklikał autor planu): ☰ → „Społeczność" → „+ Nowy poziom" → „Dodaj" → „Elipsa" (rząd „Twoje") → przeciągnij kwadratowy uchwyt rozmiaru z (0.45, 0) do (0.8, 0) → „Zagraj" → ogniska z (±0.3, 0) na piłkę i dołek → „Sprawdź" → „Wpadły wszystkie", komunikat „Przeszedłeś swój poziom — możesz go udostępnić", pas „Edytuj | Udostępnij" → „Udostępnij" → okienko z tytułem → „Udostępnij" → link w schowku (komunikat „Skopiowano link", gdy brak `navigator.share`) → otwarcie linku w nowej karcie: „Społeczność · <tytuł>"; konsola bez błędów.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/menu.ts src/editor/model.ts tests/editor/model.test.ts tests/ui/menu.test.ts src/ui/screens.ts index.html
git commit -m "feat(edytor): edytor na ekranie, gra testowa autora i Udostepnij" -m "Twoje poziomy w zakladce Spolecznosc, zapis po kazdej zmianie, wygrana autora daje gotowy kod, okienko z tytulem i link do udostepnienia albo schowka." -m "<trailer ze zlecenia>"
```

---

## Zadanie 10: README, pomiary i dokument decyzji

**Pliki:**
- Zmiana: `README.md`
- Nowy: `docs/superpowers/decyzje-etap-4.md`

**Interfejsy:** brak — dokumentacja i pomiary.

- [ ] **Krok 1: Pomiary na kodzie końcowym**

```bash
npx tsc --noEmit
npx vitest run
npm run build
ls docs/superpowers/specs docs/superpowers/plans docs/superpowers/decyzje-*.md | wc -l
```

Zapisz dosłownie: liczbę testów i plików testów, rozmiar paczki gzip, liczbę specyfikacji, planów i dokumentów decyzji w `docs/superpowers/` (po dodaniu tego zadania).

- [ ] **Krok 2: README (po angielsku, jak reszta pliku)**

1. Sekcja **Engineering**: zaktualizuj liczbę testów i plików testów oraz rozmiar paczki do zmierzonych; w linii „Layered design" dopisz `share/` (format linku i dowód) i `editor/` (model edytora) między `levels/` a `render/`.
2. Sekcja **How it was built**: zaktualizuj liczby specyfikacji, planów i dokumentów decyzji.
3. Nowa sekcja **przed „Under the hood"**:

```markdown
## Make your own level

Open the menu, switch to **Community** and tap **+ New level**. Place mirrors and obstacles, lock the handles the player must not move, pick the shot direction, then tap **Play** and solve your own level. Only then does **Share** appear: the whole level, including your winning setup as proof, is packed into the link itself (`…/GeoGolf/#poziom=…`), so no server is involved. Whoever opens the link gets the level only if that proof still holds — the solution must win and the starting position must not.

**Adding a level to the community catalog** (maintainers): paste the code after `#poziom=` into [`src/levels/community.ts`](src/levels/community.ts) together with the author's name and run `npm test`. The catalog test decodes every entry and replays the proof; CI runs the same tests before every deploy, so a broken entry never reaches the site.
```

4. Sekcja **Roadmap**: usuń punkt „Level editor with sharing by link…".

- [ ] **Krok 3: Dokument decyzji**

`docs/superpowers/decyzje-etap-4.md` (po polsku, dla właściciela), sekcje:

1. **Co zostało zrobione** — druga część `do poprawy.txt` (zakładki, weryfikacja) i etap 4 mapy; gdzie co jest w kodzie.
2. **Decyzje właściciela z brainstormingu** — cztery z nagłówka specyfikacji.
3. **Odstępstwa planu od specyfikacji** — dziewięć punktów z nagłówka planu, każdy z powodem; plus rozstrzygnięcia podjęte w trakcie realizacji (z ledgera, każde `Ruling:` z kosztem, jeśli źle).
4. **Pomiary** — z kroku 1; długości linków przykładowych poziomów (`encodeLevel(SAMPLES[i]).length`).
5. **Instrukcja katalogu** — kroki z `src/levels/community.ts`, po polsku.
6. **Lista kontrolna przejścia w przeglądarce** (spec §7), na telefonie i komputerze: zbudować poziom każdego rodzaju (elipsa, parabola, hiperbola, lustro z jedną piłką), przejść go, udostępnić; otworzyć link w innej przeglądarce; zepsuć link ręcznie — komunikat; wkleić link w już otwartej karcie z otwartym menu — menu się zamyka, poziom się otwiera; dopisać wpis do katalogu i zobaczyć go po wydaniu; przewijanie zakładki „Społeczność" przy wielu projektach i linkach; „Usuń" bez zaznaczenia usuwa projekt po potwierdzeniu; limit 20 projektów — komunikat.
7. **Odłożone** — z ledgera (`minor (deferred)`) i wcześniejsze odłożone tematy (szare strefy starych poziomów, „igła", uchwyt rozmiaru elipsy poza planszą na 9 poziomach, kryterium ±3° etapu 0).

Nie zmieniaj `do poprawy.txt`.

- [ ] **Krok 4: Commit**

```bash
git add README.md docs/superpowers/decyzje-etap-4.md
git commit -m "docs: etap 4 w README i dokument decyzji" -m "Jak zrobic wlasny poziom i jak dopisac go do katalogu; pomiary, rozstrzygniecia i lista kontrolna dla wlasciciela." -m "<trailer ze zlecenia>"
```
