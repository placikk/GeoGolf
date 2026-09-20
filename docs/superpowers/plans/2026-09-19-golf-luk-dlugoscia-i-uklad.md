# Golf geometryczny — plan implementacji (łuk opisany długością, miejsce na napisy)

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> `superpowers:subagent-driven-development` (zalecane) albo
> `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu.
> Kroki używają składni checkboxów (`- [ ]`) do śledzenia postępu.

**Cel:** Łuk elipsy opisany długością zamiast zakresu kąta (co zamyka przechodzenie
kaskad jedną elipsą bez ograniczania ognisk), wycofanie ograniczenia odległości ognisk
oraz plansza, której ramka nie przecina napisów.

**Architektura:** Nowy plik `src/levels/arc.ts` liczy długość łuku elipsy z tablicy
skumulowanej długości i ją odwraca. `ArcRange` staje się `{ mid, length }`, a
`shapeToPiece` przelicza go na końce łuku dla rdzenia (rdzeń bez zmian). Kamera
dostaje pas ekranu między banerem a przyciskami.

**Stos:** TypeScript (strict), Canvas 2D, Vite 8, Vitest 5. **Zero zależności produkcyjnych.**

**Spec:** `docs/superpowers/specs/2026-09-19-golf-luk-dlugoscia-i-uklad-design.md`
(zastępuje §6 specu `2026-09-19-golf-etap-2-poprawki-design.md`; reszta tamtego
i specy etapów 1–2 obowiązują).

## Ograniczenia globalne

- **Zero zależności produkcyjnych**; **budżet paczki < 100 KB gzip** (`tests/budget.test.ts`).
- **`shadowBlur` / `shadowColor` zakazane**; poświata przez podwójny obrys.
- **`src/core/` bez zmian** i importuje tylko z `src/core/` (`tests/layering.test.ts`).
- **Świat `[-1, 1]²`, oś Y w górę**; ściana na brzegu planszy (z poprzednich poprawek) zostaje.
- **Tolerancja dołka `0.02 * DIAGONAL`, przyskakiwanie `0.05 * DIAGONAL`** — bez zmian.
- **Wygrana to „wszystkie wpadną”** — bez zmian.
- **Identyfikatory 16 poziomów zostają** (zapisany postęp).
- **Testy graniczne ćwiczą samą granicę**; fixture'y niesymetryczne wokół zera.
- **Język:** nazwy w kodzie po angielsku, komentarze i teksty po polsku (cudzysłów „…”).
- **TypeScript `strict`, `noUnusedLocals`, `tsconfig` obejmuje `tests/`** — każde zadanie
  kończy się zielonym `npx tsc --noEmit && npm test`.
- **Gałąź `poprawki-etap-2`**, katalog projektu, commit po każdym zadaniu; wiadomość
  kończy się linią `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Sprawdzone przed zapisaniem planu

Cały plan zaimplementowano na prototypie (tymczasowy worktree): 292 testy zielone,
`tsc` czysty. Mutacje wykrywane: brak zacisku długości przy przeciąganiu końca łuku,
kamera bez pasa, brak przycinania za długiego łuku, start elementu bez łuku rozwiązania.

Pomiary na nowym modelu (ze ścianami planszy):
- wszystkie 16 rozwiązań wygrywa, żaden start nie wygrywa, liczba przesunięć o 5%, które
  nadal wygrywają, jak dotąd (0–2 na ognisko2, 0 na ognisko1);
- odporność na skrócenie łuku o `0.02` z każdej strony: wszystkie 16 poziomów;
- **poziomy 13–16:** jedna elipsa przez piłkę i dołek z łukiem elementu nie wygrywa
  dla żadnego `a` od `0.56` do `3` (każdy element osobno);
- **poziom 12:** łuk gracza musiał dostać po 5° zakładki przy wierzchołkach (bez tego
  rozwiązanie nie znosiło skrócenia łuku). Wygrywa `a ∈ [0.455, 0.59]` poza dziurą
  przy `0.53–0.54` — tam piłka odbita od górnego stałego łuku przecina koniec łuku
  gracza (prawdziwa geometria tego rozmiaru, nie błąd); nic powyżej aż do `a = 3`;
- **poziom 16:** wygrywa `a ∈ [0.375, 0.44]` poza pojedynczym `0.385`; rozwiązanie `0.41`.

## Rozstrzygnięcia planu

1. `mid` w `ArcRange` to parametr **połowy długości** łuku, nie połowa zakresu
   parametru (spec pisze „`mid = 70°`” dla łuku 20°–120° w przybliżeniu). Dzięki temu
   `arcFromParams(α, β)` i `arcParams` są dokładnie odwrotne: końce wracają w α i β.
2. Łuk dłuższy niż `obwód − MIN_ARC_LENGTH` jest przy przeliczaniu przycinany
   (na małej elipsie łuk o stałej długości mógłby ją „owinąć”), żeby zawsze została
   przerwa i końce się nie zlały.
3. Blokada rozmiaru w teście niezmiennika: `start.a ≤ solution.a` (a może tylko rosnąć).
4. Osobny test „poziom 16: jedna elipsa…” znika — obejmuje go ogólny test kaskad.

---

## Struktura plików

| Plik | Zmiana |
|---|---|
| `src/levels/arc.ts` | **nowy**: `perimeter`, `arcLengthBetween`, `paramAtLength`, `arcParams`, `arcFromParams` |
| `src/levels/types.ts` | `ArcRange = { mid, length }`, `MIN_ARC_LENGTH` zamiast `MIN_ARC` |
| `src/levels/shape.ts` | `arcEllipse`, `shapeToPiece` przez `arcParams` |
| `src/levels/index.ts` | reeksport `./arc` |
| `src/levels/stage2.ts` | łuki przez `arcEllipse` / `withSolutionArc`; poziom 12 z zakładką 5° |
| `src/ui/handles.ts` | uchwyty i `moveArcEnd` na długości; (zad. 2) bez `sizeLocked` |
| `src/ui/screens.ts` | (zad. 2) bez `sizeLocked`; (zad. 3) kamera z `playArea` |
| `src/render/camera.ts`, `src/ui/menu.ts` | (zad. 3) `PlayArea`, `TOP_BAND`, `playArea` |
| testy | `tests/levels/arc.test.ts` (nowy) i zmiany w istniejących |

---

## Zadanie 1: Łuk opisany długością

Spec §2 (model, przeliczanie, dane, uchwyty końców łuku). Ograniczenie ognisk
(`sizeLocked`) **zostaje w tym zadaniu** — wycofuje je zadanie 2.

**Pliki:**
- Nowy: `src/levels/arc.ts`, `tests/levels/arc.test.ts`
- Zmiana: `src/levels/types.ts`, `src/levels/shape.ts`, `src/levels/index.ts`,
  `src/levels/stage2.ts`, `src/ui/handles.ts`
- Test: `tests/levels.test.ts`, `tests/levels/shape.test.ts`, `tests/render/shapes.test.ts`,
  `tests/render/pieces.test.ts`, `tests/ui/handles.test.ts`

**Interfejsy (produkuje):**
- `types.ts`: `const MIN_ARC_LENGTH = 0.05`; `interface ArcRange { mid: number; length: number }`
  (`MIN_ARC` znika).
- `arc.ts`: `perimeter(s): number`, `arcLengthBetween(s, t0, t1): number`,
  `paramAtLength(s, t0, len): number`, `arcParams(s, arc): { start: number; end: number }`,
  `arcFromParams(s, start, end): ArcRange` (wszystkie przyjmują `s: EllipseShape`).
- `shape.ts`: `arcEllipse(f1, f2, a, start, end): EllipseShape & { arc: ArcRange }`.
- `handles.ts`: `moveArcEnd(s: EllipseShape & { arc: ArcRange }, which: "poczatek" | "koniec", t: number): ArcRange`.

- [ ] **Krok 1: Testy modelu łuku (nowy plik `tests/levels/arc.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import {
  arcEllipse, arcFromParams, arcLengthBetween, arcParams, ellipse, MIN_ARC_LENGTH, paramAtLength, perimeter,
} from "../../src/levels";

// ogniska nieosiowe i niesymetryczne wokół zera
const e = ellipse(vec(-0.2, 0.3), vec(0.5, -0.1), 0.6);

describe("łuk opisany długością", () => {
  it("obwód okręgu to 2πr (z dokładnością łamanej)", () => {
    const c = ellipse(vec(0.3, -0.2), vec(0.3, -0.2), 0.25);
    expect(perimeter(c)).toBeCloseTo(2 * Math.PI * 0.25, 4);
  });

  it("długość od t0 do t1 i parametr po długości są wzajemnie odwrotne", () => {
    for (const [t0, len] of [[0.3, 0.2], [2.5, 1.1], [-1, 0.05], [5.9, 0.7], [1, -0.4]] as const) {
      const t1 = paramAtLength(e, t0, len);
      expect(arcLengthBetween(e, t0, t1)).toBeCloseTo(len, 9);
    }
  });

  it("łuk „od α do β” ma końce w α i β, a długość to długość tego kawałka", () => {
    const arc = arcFromParams(e, 2, 5);
    const { start, end } = arcParams(e, arc);
    expect(start).toBeCloseTo(2, 9);
    expect(end).toBeCloseTo(5, 9);
    expect(arc.length).toBeCloseTo(arcLengthBetween(e, 2, 5), 12);
    // środek to połowa DŁUGOŚCI, nie połowa parametru
    expect(arcLengthBetween(e, 2, arc.mid)).toBeCloseTo(arc.length / 2, 9);
  });

  it("przy dwa razy większym a łuk ma tę samą długość i obejmuje mniejszy zakres parametru", () => {
    const small = arcEllipse(e.f1, e.f2, e.a, 1, 2.5);
    const big = { ...small, a: 2 * small.a };
    const s = arcParams(small, small.arc);
    const b = arcParams(big, big.arc);
    expect(arcLengthBetween(big, b.start, b.end)).toBeCloseTo(small.arc.length, 9);
    expect(b.end - b.start).toBeLessThan(s.end - s.start);
  });

  it("łuk dłuższy niż obwód jest przycinany: zawsze zostaje przerwa MIN_ARC_LENGTH", () => {
    const arc = { mid: 1, length: 100 };
    const { start, end } = arcParams(e, arc);
    expect(arcLengthBetween(e, start, end)).toBeCloseTo(perimeter(e) - MIN_ARC_LENGTH, 9);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels/arc.test.ts`
Expected: FAIL — `arcEllipse`, `perimeter`… nie istnieją.

- [ ] **Krok 3: `src/levels/types.ts`**

Zamień `MIN_ARC` i `ArcRange`:

```ts
/** Najkrótszy łuk (długość wzdłuż krzywej, w jednostkach świata) — dla danych poziomu
 *  i dla przeciągania końców. Pilnuje też, żeby końce się nie minęły: długość łuku leży
 *  w [MIN_ARC_LENGTH, obwód − MIN_ARC_LENGTH]. */
export const MIN_ARC_LENGTH = 0.05;
```

```ts
/** Łuk elipsy opisany DŁUGOŚCIĄ, nie kątem. `mid` to parametr środka łuku w układzie
 *  własnym elipsy (x = a·cos t, y = b·sin t, oś od f1 do f2), więc łuk jedzie razem
 *  z elipsą. `length` to długość mierzona wzdłuż krzywej: gdy elipsa rośnie, ten sam łuk
 *  obejmuje jej mniejszy kawałek — dlatego dużą elipsą nie da się zastąpić kaskady. */
export interface ArcRange { mid: number; length: number }
```

- [ ] **Krok 4: `src/levels/arc.ts` (nowy)**

```ts
import { dist } from "../core/vec";
import { ArcRange, EllipseShape, MIN_ARC_LENGTH } from "./types";

const TAU = 2 * Math.PI;
/** Próbek na obwód. Łamana przez 512 punktów zaniża długość elipsy o ~1e-5 względnie —
 *  dużo poniżej tolerancji dołka; ważniejsze, że wszędzie liczymy TĄ SAMĄ funkcją. */
const SAMPLES = 512;

/** Skumulowana długość elipsy o półosiach a, b: cum[i] = długość od t = 0 do t = 2π·i/N.
 *  Nie zależy od położenia ani obrotu elipsy, tylko od a i b. */
function cumulative(s: EllipseShape): Float64Array {
  const c = dist(s.f1, s.f2) / 2;
  const a = s.a;
  const b = Math.sqrt(a * a - c * c);
  const cum = new Float64Array(SAMPLES + 1);
  let px = a, py = 0;
  for (let i = 1; i <= SAMPLES; i++) {
    const t = (TAU * i) / SAMPLES;
    const x = a * Math.cos(t), y = b * Math.sin(t);
    cum[i] = cum[i - 1] + Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return cum;
}

/** L(t): długość od parametru 0 do t, dla dowolnego rzeczywistego t (rosnąca). */
function lengthAt(cum: Float64Array, t: number): number {
  const k = Math.floor(t / TAU);
  const x = ((t - k * TAU) / TAU) * SAMPLES;
  const i = Math.min(Math.floor(x), SAMPLES - 1);
  return k * cum[SAMPLES] + cum[i] + (cum[i + 1] - cum[i]) * (x - i);
}

/** Odwrotność L: parametr t, dla którego L(t) = v. Kawałkami liniowa jak L, więc
 *  obie funkcje są swoimi dokładnymi odwrotnościami (z dokładnością do zaokrągleń). */
function paramAt(cum: Float64Array, v: number): number {
  const P = cum[SAMPLES];
  const k = Math.floor(v / P);
  const r = v - k * P;
  let lo = 0, hi = SAMPLES;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= r) lo = m; else hi = m;
  }
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 0 ? (r - cum[lo]) / seg : 0;
  return k * TAU + (TAU * (lo + f)) / SAMPLES;
}

export const perimeter = (s: EllipseShape): number => cumulative(s)[SAMPLES];

/** Długość wzdłuż elipsy od parametru t0 do t1 (ujemna, gdy t1 < t0). */
export function arcLengthBetween(s: EllipseShape, t0: number, t1: number): number {
  const cum = cumulative(s);
  return lengthAt(cum, t1) - lengthAt(cum, t0);
}

/** Parametr punktu leżącego `len` dalej wzdłuż elipsy od parametru t0 (wstecz, gdy len < 0). */
export function paramAtLength(s: EllipseShape, t0: number, len: number): number {
  const cum = cumulative(s);
  return paramAt(cum, lengthAt(cum, t0) + len);
}

/** Końce łuku w parametrze elipsy: po length/2 w obie strony od `mid`, mierząc wzdłuż
 *  krzywej. Łuk dłuższy niż obwód minus MIN_ARC_LENGTH jest przycinany, żeby zawsze
 *  została przerwa i końce się nie zlały. */
export function arcParams(s: EllipseShape, arc: ArcRange): { start: number; end: number } {
  const cum = cumulative(s);
  const len = Math.min(arc.length, cum[SAMPLES] - MIN_ARC_LENGTH);
  const m = lengthAt(cum, arc.mid);
  return { start: paramAt(cum, m - len / 2), end: paramAt(cum, m + len / 2) };
}

/** Łuk od parametru `start` do `end` (start < end < start + 2π) na TEJ elipsie, zapisany
 *  długością: `mid` to parametr połowy długości, nie połowa parametru. */
export function arcFromParams(s: EllipseShape, start: number, end: number): ArcRange {
  const cum = cumulative(s);
  const l0 = lengthAt(cum, start);
  const l1 = lengthAt(cum, end);
  return { mid: paramAt(cum, (l0 + l1) / 2), length: l1 - l0 };
}
```

- [ ] **Krok 5: `src/levels/shape.ts` i `src/levels/index.ts`**

`shape.ts`: pod importem z `./types` dodaj `import { arcFromParams, arcParams } from "./arc";`.
Nad `circle` dodaj:

```ts
/** Elipsa z łukiem „od `start` do `end`” (parametr, przeciwnie do wskazówek zegara) —
 *  długość łuku liczona na TEJ elipsie. Wygodny zapis danych poziomów w kątach. */
export function arcEllipse(
  f1: Vec2, f2: Vec2, a: number, start: number, end: number,
): EllipseShape & { arc: ArcRange } {
  return { kind: "elipsa", f1, f2, a, arc: arcFromParams(ellipse(f1, f2, a), start, end) };
}
```

W `shapeToPiece` zamień obsługę łuku elipsy:

```ts
  const { start, end } = arcParams(s, s.arc);
  return {
    conic,
    arc: { from: ellipsePoint(s, start), via: ellipsePoint(s, s.arc.mid), to: ellipsePoint(s, end) },
  };
```

`index.ts`: pod `export * from "./shape";` dodaj `export * from "./arc";`.

- [ ] **Krok 6: `src/levels/stage2.ts` — dane**

Importy: `import { EllipseShape, HOLE_RADIUS, Level } from "./types";` oraz
`import { arcEllipse, circle, ellipse, segment } from "./shape";`. Pod `const deg = …`:

```ts
/** Start i rozwiązanie elementu gracza z łukiem: długość łuku liczona na rozwiązaniu,
 *  start dostaje TEN SAM łuk (ten sam środek i długość) — tak jak gracz go zastaje. */
const withSolutionArc = (start: EllipseShape, solution: EllipseShape) =>
  ({ start: { ...start, arc: solution.arc }, solution });
```

Każdy element gracza, którego `start` i `solution` mają **ten sam** zakres łuku
(poziomy 9, 12, 13, 14, 15 × 2, 16), przepisz z

```ts
      start: ellipse(<S…>, { start: X, end: Y }),
      solution: ellipse(<R…>, { start: X, end: Y }),
```

na

```ts
      ...withSolutionArc(
        ellipse(<S…>),
        arcEllipse(<R…>, X, Y),
      ),
```

(pola `locked` bez zmian). Wszystkie pozostałe `ellipse(<…>, { start: X, end: Y })`
(przeszkody i oba kształty poziomu 11, które mają różne łuki) przepisz na
`arcEllipse(<…>, X, Y)`. Liczby bez zmian, **z jednym wyjątkiem — poziom 12**:
rozwiązanie gracza dostaje po 5° zakładki:

```ts
        arcEllipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.52, Math.PI - deg(5), 2 * Math.PI + deg(5)),
```

a komentarz nad poziomem 12 brzmi:

```ts
    // Górny łuk stoi (a = 0.75), gracz domyka dół łukiem współogniskowym. Duży okrąg pod
    // spodem wymusza mały rozmiar. Łuk gracza ma stałą DŁUGOŚĆ (połowa elipsy a = 0.52
    // i po 5° zakładki przy wierzchołkach — bez zakładki rozwiązanie nie znosiło skrócenia
    // łuku). Zmierzone (ze ścianami, krok 0.005): wygrywa a ∈ [0.455, 0.59] poza wąską
    // dziurą przy 0.53–0.54 (tam piłka odbita od górnego łuku przecina koniec łuku gracza
    // — prawdziwe zachowanie tej geometrii), nic powyżej aż do a = 3. Mniejszy okrąg
    // (r = 0.1) przepuszczał duże elipsy — osiem piłek przelatywało obok niego.
```

Dla orientacji — poziom 9 po zmianie:

```ts
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(-0.25, 0.05), vec(0.35, -0.25), 0.8),
        arcEllipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, 0, Math.PI),
      ),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
```

a poziom 11:

```ts
      start: arcEllipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, deg(60), deg(300)),
      solution: arcEllipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, deg(150), deg(310)),
      …
    obstacles: [arcEllipse(vec(-0.35, -0.4), vec(0.35, 0.4), 0.8, deg(-150), deg(150))],
```

- [ ] **Krok 7: `src/ui/handles.ts` — uchwyty na długości**

Importy:

```ts
import { Vec2, add, dist, scale, sub } from "../core/vec";
import { ArcRange, EllipseShape, Handle, Level, MIN_ARC_LENGTH } from "../levels/types";
import { ellipseAxis, ellipseCenter, ellipseParam, ellipsePoint, isCircle } from "../levels/shape";
import { arcFromParams, arcLengthBetween, arcParams, paramAtLength, perimeter } from "../levels/arc";
```

W `handlePositions` część dla łuku:

```ts
  const { start, end } = arcParams(state, state.arc);
  out.push(
    { id: "rozmiar", pos: ellipsePoint(state, state.arc.mid) },
    { id: "poczatek", pos: ellipsePoint(state, start) },
    { id: "koniec", pos: ellipsePoint(state, end) },
  );
```

`moveArcEnd` (cała funkcja z komentarzem):

```ts
/** Przesuwa jeden koniec łuku elipsy `s` do parametru `t`; drugi koniec stoi w miejscu.
 *  Nowy koniec wybieramy najbliżej starego (bez skoku o 2π), a długość łuku zaciskamy do
 *  [MIN_ARC_LENGTH, obwód − MIN_ARC_LENGTH], więc końce się nie mijają. Wynik: nowy
 *  środek i nowa długość łuku.
 *
 *  Znane zachowanie: gdy koniec już stoi na zacisku i palec jedzie dalej o więcej niż π
 *  (w parametrze) za jego starą pozycję, `wrap` wybiera drugi reprezentant kąta i koniec
 *  przeskakuje od razu pod palec. Akceptujemy to — koniec zawsze zostaje na krzywej,
 *  a długość łuku zawsze mieści się w zakresie. */
export function moveArcEnd(s: EllipseShape & { arc: ArcRange }, which: "poczatek" | "koniec", t: number): ArcRange {
  const { start, end } = arcParams(s, s.arc);
  const max = perimeter(s) - MIN_ARC_LENGTH;
  if (which === "poczatek") {
    const moved = start + wrap(t - start);
    const len = clamp(arcLengthBetween(s, moved, end), MIN_ARC_LENGTH, max);
    return arcFromParams(s, paramAtLength(s, end, -len), end);
  }
  const moved = end + wrap(t - end);
  const len = clamp(arcLengthBetween(s, start, moved), MIN_ARC_LENGTH, max);
  return arcFromParams(s, start, paramAtLength(s, start, len));
}
```

W `applyDrag` gałąź końców łuku:

```ts
    if (state.arc === undefined) return state;
    return { ...state, arc: moveArcEnd({ ...state, arc: state.arc }, handle, ellipseParam(state, to)) };
```

(`sizeLocked` i reszta `applyDrag` bez zmian w tym zadaniu.)

- [ ] **Krok 8: Testy istniejące — przejście na nowy model**

`tests/levels/shape.test.ts`: dodaj `arcEllipse` do importu z `../../src/levels`
i zastąp test „łuk z parametrów…”:

```ts
  it("łuk z parametrów: końce w zadanych parametrach, `via` w środku długości", () => {
    const arc = arcEllipse(e.f1, e.f2, e.a, 2, 5);
    const p = shapeToPiece(arc);
    expect(dist(p.arc!.from, ellipsePoint(arc, 2))).toBeLessThan(1e-9);
    expect(dist(p.arc!.to, ellipsePoint(arc, 5))).toBeLessThan(1e-9);
    expect(p.arc!.via).toEqual(ellipsePoint(arc, arc.arc.mid));
    expect(onPiece(p, ellipsePoint(arc, 4.5))).toBe(true);
    expect(onPiece(p, ellipsePoint(arc, 1))).toBe(false);
    expect(onPiece(p, ellipsePoint(arc, 5.5))).toBe(false);
  });
```

`tests/render/shapes.test.ts`: import z `../../src/levels` rozszerz o `arcEllipse`;
zamień `ellipse(base.f1, base.f2, base.a, { start, end })` →
`arcEllipse(base.f1, base.f2, base.a, start, end)`,
`ellipse(base.f1, base.f2, base.a, { start: 0.5, end: 2.5 })` →
`arcEllipse(base.f1, base.f2, base.a, 0.5, 2.5)`,
`ellipse(base.f1, base.f2, base.a, { start: 2, end: 6.5 })` →
`arcEllipse(base.f1, base.f2, base.a, 2, 6.5)`.

`tests/render/pieces.test.ts`: import `arcEllipse` zamiast `ellipse`;
`ellipse(vec(-0.3, 0), vec(0.3, 0), 0.5, { start: 0, end: 2 })` →
`arcEllipse(vec(-0.3, 0), vec(0.3, 0), 0.5, 0, 2)`.

`tests/levels.test.ts`: w imporcie `MIN_ARC` → `MIN_ARC_LENGTH`, dodaj `perimeter`.
W teście „każdy kształt daje się skonstruować…”:

```ts
        expect(s.arc.length).toBeGreaterThanOrEqual(MIN_ARC_LENGTH);
        expect(s.arc.length).toBeLessThanOrEqual(perimeter(s) - MIN_ARC_LENGTH);
```

W teście niezmiennika zastąp dwie linie z `arc!.start` / `arc!.end`:

```ts
      // łuk opisany środkiem i długością: końce nie są niezależne, więc blokada obu końców
      // oznacza ten sam łuk
      if (piece.locked.includes("poczatek") && piece.locked.includes("koniec")) {
        expect(piece.start.arc).toEqual(piece.solution.arc);
      }
```

Test odporności na krawędź łuku — komentarz, nazwa i `shrink`:

```ts
  // Skracamy tylko łuki elips (o 0.02 długości z każdej strony — dawny 1° parametru na
  // elipsie a ≈ 1 to ok. 0.017). Odcinki celowo zostają nietknięte: ściany tylko
  // ograniczają rozmiar/pozycję elementów gracza; żadne zapisane rozwiązanie nie opiera
  // się na końcu odcinka — sprawdzone przez usunięcie wszystkich odcinków z tego testu.
  it.each(byId)("poziom %s: rozwiązanie nie opiera się na krawędzi łuku (skrócenie o 0.02 z obu stron)", (_id, level) => {
    const d = 0.02;
    const shrink = <S extends Shape>(s: S): S =>
      s.kind === "elipsa" && s.arc !== undefined ? { ...s, arc: { ...s.arc, length: s.arc.length - 2 * d } } : s;
    expect(proofFor(level, solutions(level).map(shrink), level.obstacles.map(shrink)).solved).toBe(true);
  });
```

`tests/ui/handles.test.ts`: import z `../../src/levels`:

```ts
import {
  EllipseShape, Level, LEVELS, MIN_ARC_LENGTH, SNAP_RADIUS, arcEllipse, arcLengthBetween, arcParams, circle, ellipse,
  ellipseParam, ellipsePoint, paramAtLength, perimeter, segment, shapeConic,
} from "../../src/levels";
```

W „przyskakiwaniu etapu 2”: `ellipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, { start: -3, end: -0.7 })`
→ `arcEllipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, -3, -0.7)`. Cały blok
`describe("uchwyty łuku", …)` zastąp:

```ts
describe("uchwyty łuku (łuk opisany długością)", () => {
  // elipsa niesymetryczna wokół zera; łuk „od 1 do 3” w parametrze, zapisany długością
  const shape = arcEllipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, 1, 3);
  const ends = (s: EllipseShape) => arcParams(s, s.arc!);
  const lengthOf = (s: EllipseShape) => { const e = ends(s); return arcLengthBetween(s, e.start, e.end); };

  it("końce łuku są uchwytami tylko wtedy, gdy łuk istnieje; rozmiar siedzi w środku łuku", () => {
    expect(handlePositions(state).map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
    const hs = handlePositions(shape);
    expect(hs.map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar", "poczatek", "koniec"]);
    expect(ellipseParam(shape, hs[2].pos)).toBeCloseTo(shape.arc.mid, 9);
    expect(ellipseParam(shape, hs[3].pos)).toBeCloseTo(1, 9);
    expect(ellipseParam(shape, hs[4].pos)).toBeCloseTo(3, 9);
  });

  it("uchwyt końca łuku po przeciągnięciu leży na krzywej pod kątem palca, a drugi koniec stoi", () => {
    const finger = vec(-0.2, 0.9);   // poza krzywą
    const next = applyDrag(shape, "koniec", finger);
    const end = handlePositions(next).find((h) => h.id === "koniec")!.pos;
    expect(evalConic(shapeConic(next), end)).toBeCloseTo(0, 12);
    expect(dist(end, ellipsePoint(shape, ellipseParam(shape, finger)))).toBeLessThan(1e-9);
    expect(ends(next).start).toBeCloseTo(1, 9);
    expect(next.f1).toBe(shape.f1);
  });

  it("minimalna długość łuku: dokładnie na granicy przechodzi, dalej jest zaciskana", () => {
    // koniec dokładnie MIN_ARC_LENGTH za początkiem: zostaje pod palcem
    const edge = paramAtLength(shape, 1, MIN_ARC_LENGTH);
    const atEdge = { ...shape, arc: moveArcEnd(shape, "koniec", edge) };
    expect(lengthOf(atEdge)).toBeCloseTo(MIN_ARC_LENGTH, 9);
    expect(ends(atEdge).end).toBeCloseTo(edge, 9);
    // koniec jeszcze bliżej początku: zaciśnięty do MIN_ARC_LENGTH, początek stoi
    const closer = { ...shape, arc: moveArcEnd(shape, "koniec", paramAtLength(shape, 1, MIN_ARC_LENGTH / 2)) };
    expect(lengthOf(closer)).toBeCloseTo(MIN_ARC_LENGTH, 9);
    expect(ends(closer).start).toBeCloseTo(1, 9);
  });

  it("końce nie mogą się minąć: początek przeciągnięty za koniec zatrzymuje się przed nim", () => {
    const moved = { ...shape, arc: moveArcEnd(shape, "poczatek", 3.5) };
    expect(lengthOf(moved)).toBeCloseTo(MIN_ARC_LENGTH, 9);
    expect(ends(moved).end).toBeCloseTo(3, 9);
    expect(ends(moved).start).toBeLessThan(ends(moved).end);
  });

  it("maksymalna długość łuku: obwód − MIN_ARC_LENGTH, sprawdzona na długim łuku", () => {
    // na łuku od 0 do 5.5 koniec przeciągnięty do 8.5 (wrap(3) = 3) przekracza granicę
    const long = arcEllipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, 0, 5.5);
    const max = { ...long, arc: moveArcEnd(long, "koniec", 8.5) };
    expect(lengthOf(max)).toBeCloseTo(perimeter(long) - MIN_ARC_LENGTH, 9);
    expect(ends(max).start).toBeCloseTo(0, 9);
    const maxStart = { ...long, arc: moveArcEnd(long, "poczatek", -3) };
    expect(lengthOf(maxStart)).toBeCloseTo(perimeter(long) - MIN_ARC_LENGTH, 9);
    expect(ends(maxStart).end).toBeCloseTo(5.5, 9);
    // tuż poniżej granicy: bez zacisku, koniec pod palcem
    const below = { ...long, arc: moveArcEnd(long, "koniec", 5.9) };
    expect(ends(below).end).toBeCloseTo(5.9, 9);
  });

  it("łuk zachowuje długość, gdy elipsa rośnie, i obejmuje wtedy mniejszy zakres parametru", () => {
    const bigger = applyDrag(shape, "rozmiar", vec(2, 2));
    expect(bigger.a).toBeGreaterThan(2 * shape.a);
    expect(bigger.arc).toBe(shape.arc);
    expect(lengthOf(bigger)).toBeCloseTo(shape.arc.length, 9);
    expect(ends(bigger).end - ends(bigger).start).toBeLessThan(ends(shape).end - ends(shape).start);
  });

  it("przeciągnięcie końca łuku bez łuku nic nie zmienia", () => {
    expect(applyDrag(state, "koniec", vec(0, 1))).toBe(state);
  });
});
```

- [ ] **Krok 9: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Jeśli któryś test poziomu (rozwiązanie, start, 5%, skrócenie łuku)
zmienia wynik, najpierw sprawdź, czy dane przepisano dokładnie; nie kalibruj innych
liczb niż poziom 12 — zgłoś BLOCKED z wyjściem testu.

- [ ] **Krok 10: Commit**

```bash
git add src/levels tests/levels tests/levels.test.ts tests/render tests/ui/handles.test.ts src/ui/handles.ts
git commit -m "feat(levels): luk opisany dlugoscia zamiast zakresu kata"
```

---

## Zadanie 2: Ogniska bez ograniczeń

Spec §2 „Uchwyty — Ogniska”. Wycofuje `sizeLocked` z poprzednich poprawek.

**Pliki:**
- Zmiana: `src/ui/handles.ts`, `src/ui/screens.ts`, `docs/superpowers/decyzje-etap-1.md`
- Test: `tests/ui/handles.test.ts`, `tests/levels.test.ts`

**Interfejsy:** `applyDrag(state: EllipseShape, handle: Handle, to: Vec2): EllipseShape`
(trzy argumenty, jak przed poprawkami).

- [ ] **Krok 1: Testy**

`tests/ui/handles.test.ts`: usuń cały zagnieżdżony blok
`describe("zablokowany rozmiar stoi", …)` (w „przyskakiwaniu etapu 2”). Do bloku
`describe("uchwyty łuku (łuk opisany długością)", …)`, przed testem „przeciągnięcie końca
łuku bez łuku…”, dopisz:

```ts
  it("ognisk nic nie ogranicza: przy dalekim przeciągnięciu rozmiar rośnie, ognisko jest pod palcem", () => {
    const far = vec(-3, 0.2);
    const next = applyDrag(shape, "ognisko1", far);
    expect(next.f1).toBe(far);
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
    expect(next.arc).toBe(shape.arc);
  });
```

`tests/levels.test.ts`:

1. Test niezmiennika — komentarz i warunek dla rozmiaru:

```ts
  // Zablokowany uchwyt nie daje się przesunąć, więc to, czego dotyczy, musi być w starcie
  // takie samo jak w rozwiązaniu — inaczej poziom byłby cicho nie do wygrania. Rozmiar
  // jest wyjątkiem w jedną stronę: przy zablokowanym uchwycie `a` nadal rośnie, gdy
  // ogniska się rozjadą (i nigdy nie maleje), więc start nie może mieć większego `a`.
  it.each(byId)("poziom %s: zablokowane uchwyty zgadzają się między startem a rozwiązaniem", (_id, level) => {
    for (const piece of level.pieces) {
      if (piece.locked.includes("rozmiar")) expect(piece.start.a).toBeLessThanOrEqual(piece.solution.a);
      if (piece.locked.includes("ognisko1")) expect(piece.solution.f1).toEqual(piece.start.f1);
      if (piece.locked.includes("ognisko2")) expect(piece.solution.f2).toEqual(piece.start.f2);
      // łuk opisany środkiem i długością: końce nie są niezależne, więc blokada obu końców
      // oznacza ten sam łuk
      if (piece.locked.includes("poczatek") && piece.locked.includes("koniec")) {
        expect(piece.start.arc).toEqual(piece.solution.arc);
      }
    }
  });
```

2. Komentarz nad kaskadami i test „element z zablokowanym rozmiarem nie zbuduje…”
   zastąp:

```ts
  // Kaskada: w zapisanym rozwiązaniu jakieś ognisko leży poza piłką i dołkiem. Na takim
  // poziomie żaden element gracza nie może zastąpić całej kaskady jedną elipsą przez
  // piłkę i dołek — przy żadnym rozmiarze, bo łuk ma stałą DŁUGOŚĆ i na dużej elipsie
  // obejmuje za mały kawałek. (Poziom 9 nie jest kaskadą: tam jedna elipsa przez piłkę
  // i dołek JEST rozwiązaniem.)
```

```ts
  it.each(LEVELS.filter(isCascade).map((l) => [l.id, l] as const))(
    "poziom %s: jedna elipsa przez piłkę i dołek, z łukiem elementu, nie wygrywa dla żadnego rozmiaru",
    (_id, level) => {
      level.pieces.forEach((piece, k) => {
        for (let i = 0; i <= 61; i++) {
          const a = 0.56 + 0.04 * i;    // 0.56 … 3.0
          const one = { ...piece.solution, f1: level.ball, f2: level.hole, a };
          const pieces = level.pieces.map((q, j) => (j === k ? one : q.start));
          expect(solves(level, pieces), `element ${k}, a = ${a.toFixed(2)}`).toBe(false);
        }
      });
    },
  );
```

3. Usuń test „poziom 16: jedna elipsa przez piłkę i dołek nie wygrywa dla żadnego
   rozmiaru” — obejmuje go test kaskad powyżej.

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/handles.test.ts tests/levels.test.ts`
Expected: **PASS już teraz.** To zadanie usuwa mechanizm, a nie dodaje zachowania:
`sizeLocked` domyślnie jest `false`, a nowy test kaskad przechodzi dzięki samemu
modelowi długości z zadania 1 — i to jest dowód, że ograniczenie ognisk nie jest już
potrzebne. Zapisz ten wynik w raporcie jako dowód (zamiast fazy RED).

- [ ] **Krok 3: `src/ui/handles.ts`**

Import: `import { Vec2, add, dist, scale } from "../core/vec";` (bez `sub`).
`applyDrag` bez `sizeLocked` — usuń komentarz nad funkcją o `sizeLocked`, czwarty
parametr i całą gałąź `if (sizeLocked) { … }`; przed ostatnimi dwiema liniami dopisz
komentarz:

```ts
export function applyDrag(state: EllipseShape, handle: Handle, to: Vec2): EllipseShape {
  if (handle === "poczatek" || handle === "koniec") {
    // kąt palca w układzie elipsy → parametr: uchwyt ślizga się po krzywej, nie schodzi z niej
    if (state.arc === undefined) return state;
    return { ...state, arc: moveArcEnd({ ...state, arc: state.arc }, handle, ellipseParam(state, to)) };
  }
  if (handle === "rozmiar") {
    const a = (dist(to, state.f1) + dist(to, state.f2)) / 2;
    return { ...state, a: Math.max(a, dist(state.f1, state.f2) / 2 + MIN_GAP) };
  }
  // Ognisk nic nie ogranicza; gdy się rozjadą, rozmiar rośnie, żeby elipsa istniała —
  // także przy zablokowanym uchwycie rozmiaru. Kaskady nie da się przez to zastąpić jedną
  // dużą elipsą, bo łuk ma stałą DŁUGOŚĆ (patrz ArcRange).
  const next = handle === "ognisko1" ? { ...state, f1: to } : { ...state, f2: to };
  return { ...next, a: Math.max(next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
```

- [ ] **Krok 4: `src/ui/screens.ts`**

W `pointermove` zastąp dwie linie z `sizeLocked`:

```ts
    const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped) : s));
```

- [ ] **Krok 5: `docs/superpowers/decyzje-etap-1.md`**

Przy rozstrzygnięciu 3 zastąp dopisek „**ODWOŁANE** — …” linią:

```
**PRZYWRÓCONE** (2026-09-19) — po krótkim odwołaniu (poprawki po etapie 2, pkt 5) to
zachowanie znów obowiązuje: kaskad nie da się już przejść jedną elipsą, bo łuk ma stałą
długość (`decyzje-etap-2.md`, „Łuk opisany długością”).
```

- [ ] **Krok 6: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 7: Commit**

```bash
git add src/ui/handles.ts src/ui/screens.ts tests/ui/handles.test.ts tests/levels.test.ts docs/superpowers/decyzje-etap-1.md
git commit -m "fix(ui): ognisk nic nie ogranicza - kaskady chroni dlugosc luku"
```

---

## Zadanie 3: Miejsce na napisy

Spec §3.

**Pliki:**
- Zmiana: `src/render/camera.ts`, `src/ui/menu.ts`, `src/ui/screens.ts`
- Test: `tests/ui/menu.test.ts`

**Interfejsy (produkuje):**
- `camera.ts`: `interface PlayArea { top: number; bottom: number }`;
  `makeCamera(width, height, margin = 0.06, area: PlayArea = { top: 0, bottom: height }): Camera`.
- `menu.ts`: `const TOP_BAND = 112`; `playArea(height: number): PlayArea`.

- [ ] **Krok 1: Testy**

`tests/ui/menu.test.ts` — importy:

```ts
import { ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, hitRect, hitTile, menuLayout, playArea, winAction, winLabels } from "../../src/ui/menu";
import { makeCamera } from "../../src/render/camera";
```

Na końcu pliku:

```ts
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
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/menu.test.ts`
Expected: FAIL — `TOP_BAND`, `playArea` nie istnieją.

- [ ] **Krok 3: `src/render/camera.ts`**

Zastąp nagłówek `makeCamera` i trzy pierwsze stałe:

```ts
/** Pionowy pas ekranu przeznaczony na planszę (piksele CSS od góry). */
export interface PlayArea { top: number; bottom: number }

/** Kwadrat planszy [-1, 1]² wpasowany w pas `area` (domyślnie cały ekran) z marginesem
 *  i wyśrodkowany w nim. Pas zostawia miejsce na napisy u góry i przyciski u dołu. */
export function makeCamera(
  width: number, height: number, margin = 0.06, area: PlayArea = { top: 0, bottom: height },
): Camera {
  const scale = (Math.min(width, area.bottom - area.top) * (1 - 2 * margin)) / 2;
  const cx = width / 2;
  const cy = (area.top + area.bottom) / 2;
```

- [ ] **Krok 4: `src/ui/menu.ts`**

Import: `import { PlayArea } from "../render/camera";`. Pod `ACTION_BAND`:

```ts
/** Górny pas ekranu na baner: numer poziomu, tytuł, podpowiedź do trzech linii
 *  (linie na 70, 88, 106 px) i przycisk menu. */
export const TOP_BAND = 112;

/** Pas ekranu na planszę — między banerem a przyciskami, żeby ramka planszy nie
 *  przecinała napisów (w poziomie i na komputerze plansza zajęłaby całą wysokość). */
export const playArea = (height: number): PlayArea => ({ top: TOP_BAND, bottom: height * ACTION_BAND });
```

- [ ] **Krok 5: `src/ui/screens.ts`**

Import z `./menu` rozszerz o `playArea`. Zastąp definicję `cam`:

```ts
  // plansza między banerem a przyciskami: ramka nie przecina napisów (także w poziomie)
  const cam = () => makeCamera(
    canvas.width / dpr(), canvas.height / dpr(), 0.06, playArea(canvas.height / dpr()),
  );
```

- [ ] **Krok 6: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (testy kamery etapu 1 w `tests/render/shapes.test.ts` bez zmian —
domyślny pas to cały ekran).

- [ ] **Krok 7: Commit**

```bash
git add src/render/camera.ts src/ui/menu.ts src/ui/screens.ts tests/ui/menu.test.ts
git commit -m "fix(ui): plansza miedzy banerem a przyciskami - ramka nie przecina napisow"
```

---

## Zadanie 4: Sprawdzenie w przeglądarce i zapis rozstrzygnięć

**Pliki:**
- Zmiana: `docs/superpowers/decyzje-etap-2.md`

- [ ] **Krok 1: Przeglądarka (Playwright)**

`npm run build`, potem `npx vite preview --port 4173 --strictPort` w tle. Skrypt
Playwright (Chromium) i zrzuty **poza repozytorium**; nie dodawaj Playwrighta do
`package.json`. Zrzuty oglądasz (narzędzie Read czyta PNG). Postęp:
`localStorage["golf-geometryczny/postep"]`. Kamera jest teraz w `src/render/camera.ts`
z pasem z `playArea` w `src/ui/menu.ts` — przeliczaj współrzędne tak samo.

Sprawdź i zapisz wynik każdego punktu (z nazwą zrzutu):
1. Ekrany `390×664` (iPhone 12, pion), `664×390` (poziom) i `1280×720`: ramka planszy nie
   przecina banera ani napisów przycisków — na poziomie z długą podpowiedzią (np. 11)
   i na ekranie wygranej.
2. Poziom 13: rozsunięcie ognisk pierwszego łuku daleko od siebie — ognisko jedzie za
   palcem, elipsa rośnie, a łuk zachowuje długość (jest krótszym kawałkiem dużej elipsy);
   ustawienie obu ognisk na piłce i w dołku nie wygrywa.
3. Poziom 11: końce łuku ślizgają się po okręgu, łuk nie znika (minimum ~0.05 długości).
4. Wszystkie 16 poziomów daje się wygrać uchwytami od stanu startowego (potwierdzenie
   przez `localStorage`).

Nie zmieniaj kodu gry. Błąd to wynik: opisz kroki i zrzut.

- [ ] **Krok 2: Dopisz rozstrzygnięcia**

Na końcu `docs/superpowers/decyzje-etap-2.md` dodaj sekcję „Łuk opisany długością
i miejsce na napisy (spec `2026-09-19-golf-luk-dlugoscia-i-uklad-design.md`)”, w formacie
reszty dokumentu (uzasadnienie + „Koszt, jeśli źle: …”), z punktami:
- łuk opisany długością zamiast kąta — decyzja właściciela; pomiar: 13–16 nie do przejścia
  jedną elipsą dla `a ∈ [0.56, 3]`; **zastępuje pkt 5 sekcji „Poprawki po etapie 2”**
  (zablokowany rozmiar stoi) — ognisk znowu nic nie ogranicza;
- `mid` to połowa długości, łuk za długi przycinany do `obwód − MIN_ARC_LENGTH`,
  `MIN_ARC_LENGTH = 0.05`;
- poziom 12: 5° zakładki, pasmo `[0.455, 0.59]` z dziurą `0.53–0.54` i jej przyczyna;
  poziom 16: pasmo `[0.375, 0.44]` z pojedynczą dziurą `0.385`;
- test odporności: skrócenie o `0.02` długości zamiast 1°;
- plansza między banerem (`TOP_BAND = 112`) a przyciskami (`ACTION_BAND`);
- wyniki sprawdzenia z kroku 1, z wyraźnym rozdziałem: emulacja kontra prawdziwy telefon.

- [ ] **Krok 3: Weryfikacja i commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

```bash
git add docs/superpowers/decyzje-etap-2.md
git commit -m "docs: rozstrzygniecia - luk opisany dlugoscia i miejsce na napisy"
```
