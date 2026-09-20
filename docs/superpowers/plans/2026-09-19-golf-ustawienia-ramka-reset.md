# Golf geometryczny — plan implementacji (ustawienia, ramka, reset)

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> `superpowers:subagent-driven-development` (zalecane) albo
> `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu.
> Kroki używają składni checkboxów (`- [ ]`) do śledzenia postępu.

**Cel:** Menu ustawień z przełącznikami „Tory podglądu” i „Podpowiedzi” (domyślnie
wyłączone), ekran wygranej bez zdania o ośmiu torach, ładna ramka planszy z mniejszym
wachlarzem i przycisk resetu poziomu.

**Architektura:** Czysta logika ustawień (typ, domyślne, zapis, przełączenie) w nowym
`src/ui/settings.ts`, obok `progress.ts`. Układ ekranu ustawień, przycisk ⚙ i podział
dolnego paska to czyste funkcje w `src/ui/menu.ts`, testowalne bez przeglądarki. Ramka
planszy i przycięty klin to nowe prymitywy w `src/render/draw.ts`. `src/ui/screens.ts`
tylko je składa.

**Stos:** TypeScript (strict), Canvas 2D, Vite 8, Vitest 5. **Zero zależności produkcyjnych.**

**Spec:** `docs/superpowers/specs/2026-09-19-golf-ustawienia-ramka-reset-design.md`
(specy etapów 1–2 i wcześniejszych poprawek obowiązują tam, gdzie ten ich nie zmienia).

## Ograniczenia globalne

- **Zero zależności produkcyjnych**; **budżet paczki < 100 KB gzip** (`tests/budget.test.ts`).
- **`shadowBlur` / `shadowColor` zakazane** — także w komentarzach, bo test szuka tych
  słów w całym `src` (poświata przez podwójny obrys).
- **`src/core/` bez zmian** i importuje tylko z `src/core/`.
- **Świat `[-1, 1]²`, oś Y w górę**; ściany planszy to nadal cztery odcinki z ostrymi
  narożnikami — zaokrąglenie rogów jest wyłącznie rysunkiem.
- **Cele dotykowe ≥ 44 px CSS**; plansza między `TOP_BAND = 112` a `ACTION_BAND = 0.86 · h`.
- **Pamięć przeglądarki bywa niedostępna** — brak pamięci, wyjątek i uszkodzony zapis
  dają wartości domyślne i nie wywracają gry (jak `progress.ts`).
- **Identyfikatory 16 poziomów i zapisany postęp zostają**; ustawienia mają własny klucz
  `golf-geometryczny/ustawienia`.
- **Język:** nazwy w kodzie po angielsku, komentarze i teksty dla gracza po polsku
  (cudzysłów „…”).
- **TypeScript `strict`, `noUnusedLocals`, `tsconfig` obejmuje `tests/`** — każde zadanie
  kończy się zielonym `npx tsc --noEmit && npm test`.
- **Gałąź `poprawki-etap-2`**, katalog projektu, commit po każdym zadaniu; wiadomość
  kończy się linią `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Sprawdzone przed zapisaniem planu

Cały plan zaimplementowano na prototypie: 328 testów zielonych, `tsc` czysty, paczka
zbudowana i obejrzana w przeglądarce (390×664 i 664×390): ramka stonowana, plansza
jaśniejsza, podpowiedzi i tory domyślnie wyłączone, dolny pasek „Reset | Sprawdź”,
⚙ w prawym górnym rogu.

---

## Struktura plików

| Plik | Zmiana |
|---|---|
| `src/ui/settings.ts` | **nowy**: `Settings`, `DEFAULT_SETTINGS`, `SETTING_ROWS`, `loadSettings`, `saveSettings`, `toggleSetting` |
| `src/ui/menu.ts` | `settingsButton`, `settingsLayout`, `EditAction`, `editAction` |
| `src/render/draw.ts` | paleta (`board`, `frame`, `frameGlow`), `SECTOR_REACH`, `FRAME_RADIUS`, `boardFrame`, `sectorWedge` z przycięciem |
| `src/ui/screens.ts` | ramka zamiast rysowania ścian, mały klin, ⚙ i ekran ustawień, przełączniki, reset w dolnym pasku, baner wygranej |
| `tests/ui/settings.test.ts` | **nowy** |
| `tests/ui/menu.test.ts`, `tests/render/pieces.test.ts` | nowe testy |

---

## Zadanie 1: Logika ustawień

Spec §2 (część „Zapis”, „Podział odpowiedzialności”).

**Pliki:**
- Nowy: `src/ui/settings.ts`, `tests/ui/settings.test.ts`

**Interfejsy (produkuje):**
- `interface Settings { previewPaths: boolean; hints: boolean }`
- `const DEFAULT_SETTINGS: Settings` (oba `false`)
- `const SETTING_ROWS: { key: keyof Settings; label: string }[]`
- `loadSettings(store: Store | null): Settings`, `saveSettings(store: Store | null, s: Settings): void`,
  `toggleSetting(s: Settings, key: keyof Settings): Settings`
- Konsumuje: `Store` z `src/ui/progress.ts`.

- [ ] **Krok 1: Napisz testy, które nie przejdą**

Utwórz `tests/ui/settings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { Store } from "../../src/ui/progress";
import { DEFAULT_SETTINGS, SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "../../src/ui/settings";

const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};

const broken: Store = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

describe("ustawienia", () => {
  it("domyślnie oba przełączniki są wyłączone", () => {
    expect(DEFAULT_SETTINGS).toEqual({ previewPaths: false, hints: false });
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
  });

  it("zapis wraca po ponownym wczytaniu, pod własnym kluczem (nie psuje postępu)", () => {
    const s = memory({ "golf-geometryczny/postep": '{"solved":["skos"],"last":2}' });
    saveSettings(s, { previewPaths: true, hints: false });
    expect(loadSettings(s)).toEqual({ previewPaths: true, hints: false });
    expect(s.data["golf-geometryczny/postep"]).toBe('{"solved":["skos"],"last":2}');
  });

  it("przełączenie jednego ustawienia nie zmienia drugiego", () => {
    const on = toggleSetting(DEFAULT_SETTINGS, "hints");
    expect(on).toEqual({ previewPaths: false, hints: true });
    expect(toggleSetting(on, "hints")).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ previewPaths: false, hints: false });   // bez mutacji
  });

  it("brak pamięci i pamięć rzucająca wyjątkami nie wywracają gry", () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(null, DEFAULT_SETTINGS)).not.toThrow();
    expect(() => saveSettings(broken, DEFAULT_SETTINGS)).not.toThrow();
  });

  it("uszkodzony zapis daje ustawienia domyślne; tylko jawne true włącza", () => {
    for (const raw of ["{", "null", "42", '{"previewPaths":"tak","hints":1}', "[]"]) {
      expect(loadSettings(memory({ "golf-geometryczny/ustawienia": raw })), raw).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("ekran ustawień ma wiersz dla każdego ustawienia, z polską etykietą", () => {
    expect(SETTING_ROWS.map((r) => r.key).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    expect(SETTING_ROWS.map((r) => r.label)).toEqual(["Tory podglądu", "Podpowiedzi"]);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/settings.test.ts`
Expected: FAIL — nie da się rozwiązać importu `../../src/ui/settings`.

- [ ] **Krok 3: Implementacja — `src/ui/settings.ts`**

```ts
import { Store } from "./progress";

/** Ustawienia gracza. Oba przełączniki domyślnie wyłączone (decyzja właściciela). */
export interface Settings {
  /** blade tory dwóch piłek w trybie edycji */
  previewPaths: boolean;
  /** tekst podpowiedzi pod tytułem poziomu */
  hints: boolean;
}

export const DEFAULT_SETTINGS: Settings = { previewPaths: false, hints: false };

/** Wiersze ekranu ustawień, w kolejności wyświetlania. */
export const SETTING_ROWS: { key: keyof Settings; label: string }[] = [
  { key: "previewPaths", label: "Tory podglądu" },
  { key: "hints", label: "Podpowiedzi" },
];

const KEY = "golf-geometryczny/ustawienia";

/** Ta sama odporność co postęp: brak pamięci, wyjątki i uszkodzony zapis dają domyślne. */
export function loadSettings(store: Store | null): Settings {
  try {
    const raw = store?.getItem(KEY);
    if (raw == null) return DEFAULT_SETTINGS;
    const s = JSON.parse(raw) as Partial<Settings> | null;
    // tylko jawne `true` włącza — wszystko inne (brak pola, śmieci) to wartość domyślna
    return { previewPaths: s?.previewPaths === true, hints: s?.hints === true };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: Store | null, s: Settings): void {
  try { store?.setItem(KEY, JSON.stringify(s)); } catch { /* bez pamięci też się gra */ }
}

export const toggleSetting = (s: Settings, key: keyof Settings): Settings => ({ ...s, [key]: !s[key] });
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/settings.ts tests/ui/settings.test.ts
git commit -m "feat(ui): ustawienia gracza - tory podgladu i podpowiedzi, domyslnie wylaczone"
```

---

## Zadanie 2: Układ — przycisk ⚙, wiersze ustawień, dolny pasek edycji

Spec §2 (wejście, ekran) i §5 (podział dolnego pasa).

**Pliki:**
- Zmiana: `src/ui/menu.ts`
- Test: `tests/ui/menu.test.ts`

**Interfejsy (produkuje):**
- `settingsButton(width: number): Rect` — `{ x: width − 50, y: 6, w: 44, h: 44 }`
- `settingsLayout(width: number, height: number, count: number): Rect[]`
- `type EditAction = "reset" | "sprawdz"`; `editAction(p: Vec2, width: number, height: number): EditAction | null`
- Konsumuje: `Rect`, `hitTile`, `ACTION_BAND`, `TOP` (prywatna stała w tym pliku), `SIDE`.

- [ ] **Krok 1: Napisz testy, które nie przejdą**

W `tests/ui/menu.test.ts` zastąp import z `../../src/ui/menu`:

```ts
import {
  ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, editAction, hitRect, hitTile, menuLayout, playArea, settingsButton,
  settingsLayout, winAction, winLabels,
} from "../../src/ui/menu";
```

i dopisz na końcu pliku:

```ts
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
});
```

(`center`, `makeCamera`, `vec` są już w tym pliku.)

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/menu.test.ts`
Expected: FAIL — `settingsButton`, `settingsLayout`, `editAction` nie istnieją.

- [ ] **Krok 3: Implementacja w `src/ui/menu.ts`**

Pod `MENU_BUTTON`:

```ts
/** Przycisk ⚙ w prawym górnym rogu — lustrzane odbicie ☰; zależy od szerokości ekranu. */
export const settingsButton = (width: number): Rect => ({ x: width - 6 - 44, y: 6, w: 44, h: 44 });
```

Na końcu pliku:

```ts
export type EditAction = "reset" | "sprawdz";

/** W trybie edycji dolny pas dzieli się na „Reset” (lewo) i „Sprawdź” (prawo) — ten sam
 *  układ co „Jeszcze raz | Następny” na ekranie wygranej. Wyżej: nic. */
export function editAction(p: Vec2, width: number, height: number): EditAction | null {
  if (p.y < height * ACTION_BAND) return null;
  return p.x < width / 2 ? "reset" : "sprawdz";
}

const ROW_H = 56;
const ROW_GAP = 12;
const ROW_MAX_W = 360;

/** Wiersze ekranu ustawień: jeden pod drugim, wyśrodkowane, każdy ≥ 44 px wysokości,
 *  poniżej przycisków ☰ / ⚙ i nagłówka. */
export function settingsLayout(width: number, height: number, count: number): Rect[] {
  const w = Math.min(ROW_MAX_W, width - 2 * SIDE);
  const total = count * ROW_H + (count - 1) * ROW_GAP;
  const top = Math.max(TOP, (height - total) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: (width - w) / 2,
    y: top + i * (ROW_H + ROW_GAP),
    w, h: ROW_H,
  }));
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/menu.ts tests/ui/menu.test.ts
git commit -m "feat(ui): uklad przycisku ustawien, wierszy ustawien i dolnego paska edycji"
```

---

## Zadanie 3: Ramka planszy i mały, przycięty wachlarz

Spec §4.

**Pliki:**
- Zmiana: `src/render/draw.ts`, `src/ui/screens.ts`
- Test: `tests/render/pieces.test.ts`

**Interfejsy (produkuje):**
- `PALETTE.board`, `PALETTE.frame`, `PALETTE.frameGlow`
- `const SECTOR_REACH = 0.4`, `const FRAME_RADIUS = 6`
- `boardFrame(ctx, cam, fill: string, color: string, glow: string, width: number): void`
- `sectorWedge(...)` — ta sama sygnatura, teraz przycina rysowanie do planszy.

- [ ] **Krok 1: Testy**

W `tests/render/pieces.test.ts` zamień import z `../../src/render/draw` na:

```ts
import { FRAME_RADIUS, SECTOR_REACH, boardFrame, drawPiece, sectorWedge } from "../../src/render/draw";
```

Rozszerz nagrywający kontekst (`recordingCtx`) o operacje, których używa ramka i przycięcie:

```ts
function recordingCtx() {
  const calls: { op: string; args?: number[]; style?: string; lineWidth?: number }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, moveTo() {}, lineTo() {},
    closePath() { calls.push({ op: "closePath" }); },
    arc(...args: number[]) { calls.push({ op: "arc", args }); },
    rect(...args: number[]) { calls.push({ op: "rect", args }); },
    roundRect(...args: number[]) { calls.push({ op: "roundRect", args }); },
    save() { calls.push({ op: "save" }); },
    restore() { calls.push({ op: "restore" }); },
    clip() { calls.push({ op: "clip" }); },
    stroke() { calls.push({ op: "stroke", style: String(ctx.strokeStyle), lineWidth: ctx.lineWidth }); },
    fill() { calls.push({ op: "fill", style: String(ctx.fillStyle) }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}
```

W teście „wachlarz to jedno wypełnienie bez obrysu…” zamień `3` na `SECTOR_REACH`
i dopisz sprawdzenie promienia, a pod nim dwa nowe testy:

```ts
  it("wachlarz to jedno wypełnienie bez obrysu, kąty świata odwrócone na ekran", () => {
    const { ctx, calls } = recordingCtx();
    sectorWedge(ctx, cam, vec(0.1, -0.2), { center: 1, width: 0.5 }, SECTOR_REACH, "klin");
    expect(calls.filter((c) => c.op === "fill")).toHaveLength(1);
    expect(calls.filter((c) => c.op === "stroke")).toHaveLength(0);
    const arc = calls.find((c) => c.op === "arc")!;
    expect(arc.args![2]).toBeCloseTo(SECTOR_REACH * cam.scale, 12);
    expect(arc.args![3]).toBeCloseTo(-1.25, 12);
    expect(arc.args![4]).toBeCloseTo(-0.75, 12);
  });

  it("wachlarz jest mały i przycięty do planszy: przycięcie przed wypełnieniem, potem przywrócenie", () => {
    expect(SECTOR_REACH).toBe(0.4);
    const { ctx, calls } = recordingCtx();
    sectorWedge(ctx, cam, vec(0.9, 0.9), { center: 0.5, width: 1 }, SECTOR_REACH, "klin");
    const ops = calls.map((c) => c.op);
    expect(ops.indexOf("clip")).toBeGreaterThan(ops.indexOf("rect"));
    expect(ops.indexOf("fill")).toBeGreaterThan(ops.indexOf("clip"));
    expect(ops[0]).toBe("save");
    expect(ops[ops.length - 1]).toBe("restore");
    // przycięcie to dokładnie kwadrat planszy [-1, 1]²
    const tl = cam.toScreen(vec(-1, 1)), br = cam.toScreen(vec(1, -1));
    expect(calls.find((c) => c.op === "rect")!.args).toEqual([tl.x, tl.y, br.x - tl.x, br.y - tl.y]);
  });

  it("ramka: tło planszy, potem szeroka poświata pod cienką linią, zaokrąglone rogi na brzegu planszy", () => {
    const { ctx, calls } = recordingCtx();
    boardFrame(ctx, cam, "tlo", "linia", "poswiata", 1);
    expect(calls.filter((c) => c.op === "fill").map((c) => c.style)).toEqual(["tlo"]);
    const strokes = calls.filter((c) => c.op === "stroke");
    expect(strokes.map((s) => s.style)).toEqual(["poswiata", "linia"]);
    expect(strokes[0].lineWidth!).toBeGreaterThan(strokes[1].lineWidth!);
    const tl = cam.toScreen(vec(-1, 1)), br = cam.toScreen(vec(1, -1));
    for (const r of calls.filter((c) => c.op === "roundRect")) {
      expect(r.args).toEqual([tl.x, tl.y, br.x - tl.x, br.y - tl.y, FRAME_RADIUS]);
    }
  });
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/render/pieces.test.ts`
Expected: FAIL — `SECTOR_REACH`, `FRAME_RADIUS`, `boardFrame` nie istnieją.

- [ ] **Krok 3: `src/render/draw.ts`**

W `PALETTE`, pod `sector`:

```ts
  board: "#10161e",
  frame: "#64748b",
  frameGlow: "rgba(100, 116, 139, 0.18)",
```

Pod zamknięciem `PALETTE` (przed `type Ctx`):

```ts
/** Promień klina wachlarza w jednostkach świata — mały, żeby mieścił się w ramce. */
export const SECTOR_REACH = 0.4;

/** Promień zaokrąglenia rogów ramki w pikselach CSS. Tylko rysunek: ściany (fizyka)
 *  mają ostre narożniki, a 6 px różnicy w rogu jest niewidoczne dla gry. */
export const FRAME_RADIUS = 6;

/** Prostokąt planszy [-1, 1]² na ekranie. */
function boardRect(cam: Camera): { x: number; y: number; w: number; h: number } {
  const tl = cam.toScreen({ x: -1, y: 1 });
  const br = cam.toScreen({ x: 1, y: -1 });
  return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
}
```

(`Camera` i `Vec2` są już zaimportowane w tym pliku; `type Ctx` zostaje bez zmian.)

Zastąp `sectorWedge` i dopisz `boardFrame`:

```ts
/** Blady klin wachlarza od piłki. Samo wypełnienie, bez obrysu i bez poświaty,
 *  przycięte do planszy — klin nigdy nie wychodzi za ramkę. */
export function sectorWedge(
  ctx: Ctx, cam: Camera, apex: Vec2, sector: Sector, reach: number, fill: string,
): void {
  const s = cam.toScreen(apex);
  const r = reach * cam.scale;
  // oś Y ekranu jest odwrócona, więc kąty świata zmieniają znak
  const from = -(sector.center + sector.width / 2);
  const to = -(sector.center - sector.width / 2);
  const b = boardRect(cam);
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.arc(s.x, s.y, r, from, to);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Plansza: tło o odcień jaśniejsze od ekranu i cienka stonowana ramka z poświatą przez
 *  podwójny obrys (bez rozmycia cienia), z lekko zaokrąglonymi rogami. */
export function boardFrame(
  ctx: Ctx, cam: Camera, fill: string, color: string, glow: string, width: number,
): void {
  const b = boardRect(cam);
  const outline = () => {
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, FRAME_RADIUS);
  };
  ctx.fillStyle = fill;
  outline();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = width * 5;
  outline();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  outline();
  ctx.stroke();
}
```

**Uwaga:** w komentarzach nie wolno pisać słowa `shadowBlur` — test zakazu szuka go
w całym `src` (stąd „bez rozmycia cienia”).

- [ ] **Krok 4: `src/ui/screens.ts` — ramka zamiast rysowania ścian, mały klin**

Importy: usuń `BOARD_WALLS` z importu `../levels` i cały import `SPAN` z `../render/shapes`;
import z `../render/draw` rozszerz:

```ts
import {
  PALETTE, SECTOR_REACH, boardFrame, drawPiece, glowDot, glowPolyline, holeMark, ringHandle, sectorWedge,
} from "../render/draw";
```

W `draw`, zaraz po wypełnieniu tła, zamień blok wachlarza i pętlę po `BOARD_WALLS` na:

```ts
    // brzeg planszy jest ścianą: jaśniejsze tło planszy i stonowana ramka
    boardFrame(ctx, c, PALETTE.board, PALETTE.frame, PALETTE.frameGlow, 1);

    // wachlarz tylko w edycji i tylko gdy poziom go ma — bez niego łuk „nie tam,
    // gdzie lecą piłki” wyglądałby na błąd gry; mały i przycięty do planszy
    if (game.phase === "edycja" && level.sector !== undefined) {
      sectorWedge(ctx, c, level.ball, level.sector, SECTOR_REACH, PALETTE.sector);
    }
```

- [ ] **Krok 5: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (fizyka ścian bez zmian — `levelCurves` nadal dokłada `BOARD_WALLS`).

- [ ] **Krok 6: Commit**

```bash
git add src/render/draw.ts src/ui/screens.ts tests/render/pieces.test.ts
git commit -m "feat(render): stonowana ramka planszy i maly wachlarz przyciety do planszy"
```

---

## Zadanie 4: Ekran ustawień, przełączniki, reset i baner wygranej

Spec §2 (ekran, zachowanie), §3 i §5.

**Pliki:**
- Zmiana: `src/ui/screens.ts`
- Test: `tests/ui/menu.test.ts`

**Interfejsy:**
- Konsumuje: `settingsButton`, `settingsLayout`, `editAction`, `hitTile` (zad. 2);
  `SETTING_ROWS`, `loadSettings`, `saveSettings`, `toggleSetting` (zad. 1);
  `winLabels` (istnieje), `newGame` (istnieje).

- [ ] **Krok 1: Test tekstu ekranu wygranej**

Na końcu `tests/ui/menu.test.ts`:

```ts
describe("tekst ekranu wygranej", () => {
  it("nie ma już zdania o ośmiu torach (decyzja właściciela)", () => {
    const src = readFileSync("src/ui/screens.ts", "utf8");
    expect(src.includes("Osiem torów")).toBe(false);
  });
});
```

i dopisz import `import { readFileSync } from "node:fs";` na początku pliku (tak jak
robi to `tests/render/no-shadow-blur.test.ts` dla zakazu cienia).

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/menu.test.ts`
Expected: FAIL — `screens.ts` nadal zawiera „Osiem torów”.

- [ ] **Krok 3: Stan i przełączanie ekranu ustawień w `src/ui/screens.ts`**

Importy — dopisz:

```ts
import {
  MENU_BUTTON, editAction, hitRect, hitTile, menuLayout, playArea, settingsButton, settingsLayout, winAction, winLabels,
} from "./menu";
import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
```

(`ACTION_BAND` znika z importu — po zmianie w kroku 5 nie jest już używany w tym pliku.)

Obok `let menuOpen = false;`:

```ts
  let settings = loadSettings(store);
  let settingsOpen = false;
```

W `toggleMenu` dopisz `settingsOpen = false;` po `menuOpen = !menuOpen;`, a pod całą
funkcją dodaj:

```ts
  function toggleSettings(): void {
    settingsOpen = !settingsOpen;
    menuOpen = false;
    // jak menu poziomów: ustawienia przerywają trwający dowód
    if (settingsOpen && game.phase === "dowod") game = retry(game);
  }
```

W `frame` zmień warunek na `if (!menuOpen && !settingsOpen) {`.

- [ ] **Krok 4: Dotyk ⚙ i wierszy — w `pointerdown`, zaraz po bloku `MENU_BUTTON`**

```ts
    if (hitRect(settingsButton(viewW()), p)) {
      toggleSettings();
      consumedReset = true;
      return;
    }
    if (settingsOpen) {
      // wiersz przełącza ustawienie (ekran zostaje otwarty), tło zamyka ustawienia
      const i = hitTile(settingsLayout(viewW(), viewH(), SETTING_ROWS.length), p);
      if (i === null) settingsOpen = false;
      else {
        settings = toggleSetting(settings, SETTING_ROWS[i].key);
        saveSettings(store, settings);
      }
      consumedReset = true;
      return;
    }
```

- [ ] **Krok 5: Reset w dolnym pasku — w `pointerup`**

Zastąp dwie ostatnie linie obsługi:

```ts
    if (wasDragging || afterReset || game.phase !== "edycja") return;
    // dolny pas: „Reset” (stan startowy poziomu) po lewej, „Sprawdź” po prawej
    const action = editAction(toScreenPoint(e), viewW(), viewH());
    if (action === "reset") game = newGame(game.level);
    if (action === "sprawdz") game = startProof(game);
```

- [ ] **Krok 6: Rysowanie — przełączniki, baner, ekran ustawień**

Podgląd torów w gałęzi `game.phase === "edycja"`:

```ts
      // podgląd na żywo: dwie piłki, blade tory — tylko gdy gracz włączył to w ustawieniach
      if (settings.previewPaths) {
        for (const b of preview(game).balls) {
          glowPolyline(ctx, c, b.path, "rgba(226,232,240,0.28)", "rgba(226,232,240,0.06)", 1);
        }
      }
```

Baner edycji (podpowiedź zależna od ustawienia, dolny pasek z resetem):

```ts
      banner(level.title, settings.hints ? level.hint : "", ["Reset", "Sprawdź"]);
```

Baner wygranej — usuń komentarz o jednoczesności i zdanie o ośmiu torach:

```ts
        // pod tytułem tylko dopisek ostatniego poziomu; na pozostałych — nic
        const allSolved = LEVELS.every((l) => progress.solved.includes(l.id));
        const { right, note } = winLabels(isLast(), allSolved);
        banner("Wpadły wszystkie", note ?? "", ["Jeszcze raz", right]);
```

Na końcu `draw`, obok `if (menuOpen) drawMenu(); drawMenuButton();`:

```ts
    if (menuOpen) drawMenu();
    if (settingsOpen) drawSettings();
    drawMenuButton();
    drawSettingsButton();
```

i dwie nowe funkcje wewnątrz `draw`, nad `drawMenu`:

```ts
    /** Zębatka rysowana liniami — nie polegamy na glifie ⚙ w czcionce telefonu. */
    function drawSettingsButton(): void {
      const b = settingsButton(viewW());
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.strokeStyle = settingsOpen ? PALETTE.curve : PALETTE.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const t = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + 8 * Math.cos(t), cy + 8 * Math.sin(t));
        ctx.lineTo(cx + 11 * Math.cos(t), cy + 11 * Math.sin(t));
        ctx.stroke();
      }
    }

    function drawSettings(): void {
      const w = viewW();
      const h = viewH();
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.text;
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText("Ustawienia", w / 2, 34);
      settingsLayout(w, h, SETTING_ROWS.length).forEach((r, i) => {
        const on = settings[SETTING_ROWS[i].key];
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = PALETTE.tile;
        ctx.fill();
        ctx.lineWidth = on ? 2 : 1;
        ctx.strokeStyle = on ? PALETTE.curve : PALETTE.tileEdge;
        ctx.stroke();
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(SETTING_ROWS[i].label, r.x + 16, r.y + r.h / 2 + 6);
        ctx.textAlign = "right";
        ctx.fillStyle = on ? PALETTE.curve : PALETTE.muted;
        ctx.fillText(on ? "wł." : "wył.", r.x + r.w - 16, r.y + r.h / 2 + 6);
      });
      ctx.textAlign = "left";
    }
```

- [ ] **Krok 7: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 8: Commit**

```bash
git add src/ui/screens.ts tests/ui/menu.test.ts
git commit -m "feat(ui): ekran ustawien, przelaczniki, reset poziomu i baner bez zdania o torach"
```

---

## Zadanie 5: Sprawdzenie w przeglądarce i zapis rozstrzygnięć

**Pliki:**
- Zmiana: `docs/superpowers/decyzje-etap-2.md`

- [ ] **Krok 1: Przeglądarka (Playwright)**

`npm run build`, potem `npx vite preview --port 4173 --strictPort` w tle. Skrypt
Playwright i zrzuty **poza repozytorium**; nie dodawaj Playwrighta do `package.json`.
Zrzuty oglądasz (narzędzie Read czyta PNG). Ustawienia siedzą w
`localStorage["golf-geometryczny/ustawienia"]`, postęp w `…/postep`.
Przyciski: ☰ `(6, 6, 44, 44)`, ⚙ `(szerokość − 50, 6, 44, 44)`, dolny pas `y > 0.86 · h`
(lewa połowa reset, prawa sprawdź), wiersze ustawień z `settingsLayout`.

Sprawdź i zapisz wynik każdego punktu (z nazwą zrzutu), na `390×664` i `664×390`:
1. Pierwsze uruchomienie: brak torów podglądu i brak podpowiedzi pod tytułem.
2. ⚙ otwiera ekran ustawień; dotknięcie wiersza przełącza (napis „wł.”/„wył.” i obwódka),
   po zamknięciu widać tory i podpowiedź; po przeładowaniu strony ustawienia zostają
   (sprawdź też `localStorage`).
3. Ramka: stonowana linia, jaśniejsze tło planszy, nic nie przecina napisów.
4. Wachlarz (poziom 13): mały klin, w całości wewnątrz ramki.
5. „Reset” w dolnym pasku: po przeciągnięciu ogniska wraca stan startowy poziomu;
   „Sprawdź” dalej uruchamia dowód; puszczenie uchwytu w dolnym pasie nie robi ani
   jednego, ani drugiego.
6. Ekran wygranej (dowolny poziom): tylko „Wpadły wszystkie”, bez zdania o ośmiu torach;
   na poziomie 16 dopisek „To był ostatni poziom.” i przycisk „Menu”.

Nie zmieniaj kodu gry. Błąd to wynik: opisz kroki i zrzut, zgłoś DONE_WITH_CONCERNS.

- [ ] **Krok 2: Dopisz rozstrzygnięcia**

Na końcu `docs/superpowers/decyzje-etap-2.md` dodaj sekcję „Ustawienia, ramka i reset
(spec `2026-09-19-golf-ustawienia-ramka-reset-design.md`)” w formacie reszty dokumentu
(uzasadnienie + „Koszt, jeśli źle: …”), z punktami:
- menu ustawień z dwoma przełącznikami, oba domyślnie wyłączone (decyzja właściciela);
  osobny klucz w pamięci, ta sama odporność co postęp;
- zniknięcie zdania „Osiem torów, jedno miejsce…” (decyzja właściciela) — na ekranie
  wygranej zostaje tytuł, a na ostatnim poziomie dopisek;
- ramka: stonowana linia + jaśniejsze tło planszy, rogi zaokrąglone tylko w rysunku
  (fizyka ścian bez zmian, ostre narożniki);
- wachlarz: promień `0.4` zamiast `3` i przycięcie do planszy;
- reset poziomu w dolnym pasku (lewa połowa), bez potwierdzenia;
- wyniki sprawdzenia z kroku 1, z rozdziałem: emulacja kontra prawdziwy telefon.

- [ ] **Krok 3: Weryfikacja i commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

```bash
git add docs/superpowers/decyzje-etap-2.md
git commit -m "docs: rozstrzygniecia - ustawienia, ramka, wachlarz i reset poziomu"
```
