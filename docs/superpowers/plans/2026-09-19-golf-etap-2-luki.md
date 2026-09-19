# Golf geometryczny — plan implementacji (etap 2: łuki i odcinki)

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> `superpowers:subagent-driven-development` (zalecane) albo
> `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu.
> Kroki używają składni checkboxów (`- [ ]`) do śledzenia postępu.

**Cel:** Pozwolić grze ciąć krzywe — łuki elips i odcinki prostych — i zbudować na tym
osiem nowych poziomów (9–16): półelipsę, bandy, przycinanie, krzywe współogniskowe
i kaskady przez wspólne ognisko.

**Architektura:** Rdzeń dostaje `Piece` = stożkowa + opcjonalny łuk `{from, via, to}`.
Przynależność trafienia do łuku sprawdza strona cięciwy (dla prostej: rzut na odcinek),
więc rdzeń nie zna typu krzywej poza „prosta / nie prosta”. Poziom opisuje kształty
w parametrach elipsy (`levels/shape.ts` przelicza je na `Piece`), gracz rusza listą
elementów z uchwytami blokowanymi per element, a dowód może strzelać w wachlarzu.

**Stos:** TypeScript (strict), Canvas 2D, Vite 8, Vitest 5. **Zero zależności
produkcyjnych.**

**Spec:** `docs/superpowers/specs/2026-09-19-golf-etap-2-luki-design.md` (etap 2)
oraz `docs/superpowers/specs/2026-09-09-golf-geometryczny-design.md` (etap 1 —
obowiązuje wszystko, czego spec etapu 2 nie zmienia).

## Ograniczenia globalne

Obowiązują w **każdym** zadaniu, nawet jeśli zadanie ich nie powtarza:

- **Zero zależności produkcyjnych.** `dependencies` w `package.json` zostaje puste.
- **Budżet paczki: < 100 KB gzip.** Pilnowany przez `tests/budget.test.ts`.
- **`shadowBlur` / `shadowColor` na Canvasie są zakazane.** Poświata wyłącznie przez
  podwójny obrys.
- **`src/core/` nie importuje niczego spoza `src/core/`.** Pilnowane przez
  `tests/layering.test.ts` — obejmuje nowy `core/piece.ts` automatycznie.
- **Prędkość piłki jest dosłowna.** Żadnych krzywych czasu na ruchu piłek.
- **Świat to kwadrat `[-1, 1] × [-1, 1]`, oś Y w górę.** `DIAGONAL = 2 * Math.SQRT2`.
- **Tolerancja dołka `0.02 * DIAGONAL`, promień przyskakiwania `0.05 * DIAGONAL`**,
  nigdy mniejszy od pasa tolerancji. Przybywa tylko celów przyskakiwania.
- **Wygrana to „wszystkie wpadną”** — bez wymogu jednoczesności (rozstrzygnięcie
  właściciela, punkt 29 w `decyzje-etap-1.md`). Dwóch taktów animacji (błysk odbicia,
  rozbłysk dołka) **nie robimy**.
- **Identyfikatory ośmiu poziomów etapu 1 zostają** i w tej samej kolejności:
  `ogniska, rozmiar, skos, blisko, ciasna, przeszkoda, dwie-przeszkody, zwienczenie`.
- **Testy etapu 1 przechodzą bez zmiany oczekiwań.** Wolno zmienić formę wywołania
  (np. `curves: [k]` → `curves: [whole(k)]`), nie wolno zmienić wartości oczekiwanej.
- **Testy graniczne ćwiczą samą granicę** na wartościach dokładnie reprezentowalnych,
  a fixture'y nie są symetryczne wokół zera tam, gdzie symetria maskowałaby błąd
  (punkt 20 w `decyzje-etap-1.md`).
- **Język:** nazwy w kodzie po angielsku, teksty dla gracza po polsku. Wartości
  `Handle` i pola `kind` są polskie — tak jest w specyfikacji i w kodzie etapu 1.
- **TypeScript `strict`, żadnego `any`.** `tsconfig.json` obejmuje `src` **i** `tests`,
  a `npm run build` zaczyna od `tsc --noEmit` — dlatego **każde zadanie kończy się
  zielonym `npx tsc --noEmit` i zielonym `npm test`** (test budżetu buduje paczkę).
- **Gałąź:** praca na `etap-2-luki` w katalogu projektu (ta sama praktyka co
  w etapie 1, punkt 1 w `decyzje-etap-1.md`). Commit po każdym zadaniu.

---

## Rozstrzygnięcia podjęte przy pisaniu planu

Każde z nich zostało sprawdzone na prototypie przed zapisaniem (worktree w katalogu
tymczasowym: cały plan zaimplementowany, 246 testów zielonych, `tsc` czysty, mutacje
kluczowych warunków wykrywane).

1. **„Cofnij” nie istnieje w kodzie etapu 1** — spec etapu 2 (§6) zakłada pasek
   „Sprawdź, Cofnij, Reset”, ale etap 1 ma tylko „Sprawdź”, a reset to ponowne
   wejście w poziom (`goTo`). Spec mówi też „pasek dolny bez zmian”, więc **nie
   dodajemy przycisków**. Reset (nowa gra) naturalnie przywraca całą listę elementów.
2. **Kryterium 5% per element** jest rozpisane na dwa testy. `ognisko1` każdego
   odblokowanego elementu: pudło w **każdym** z 8 kierunków (dokładnie test etapu 1).
   `ognisko2`: pudło w **co najmniej 6 z 8** kierunków. Powód: znany z etapu 1
   wyjątek (dawna notatka „pozycja 12” w `tests/levels.test.ts`): ognisko po stronie
   dołka przesunięte **wzdłuż własnej osi** zostawia tory tak blisko dołka, że część
   przesunięć przechodzi. Zmierzone: poziomy etapu 1 mają 1–2 takie kierunki, nowe
   0–2, zawsze na osi elementu.
3. **Okręgi (`f1 = f2`) nie mają bladych ognisk i nie są celem przyskakiwania.**
   „Ognisko” okręgu to środek przeszkody — nigdy nie jest sensownym celem, a pokazanie
   go zmieniłoby wygląd poziomów 6–8.
4. **Uchwyt rozmiaru na łuku siedzi w środku łuku**, nie na wierzchołku osi wielkiej —
   wierzchołek może wypaść w przerwie łuku, a wtedy gracz chwytałby powietrze. Na pełnej
   elipsie zostaje na wierzchołku (test etapu 1 bez zmian).
5. **`MIN_ARC = 10°` mieszka w `levels/types.ts`**, bo obowiązuje i dane poziomów
   (test), i przeciąganie (`ui/handles.ts`). Łuk ma długość z `[MIN_ARC, 2π − MIN_ARC]`.
6. **Kolor stałych kształtów zostaje czerwony (`PALETTE.obstacle`)**, także dla łuków,
   które na poziomach 12–16 są pożytecznymi lustrami. Spec tego nie zmienia; kwestia
   do oceny okiem w zadaniu 12.
7. **Geometria kaskad (13–16):** piłka za punktem M leci **w poprzek** osi drugiej
   elipsy, a nie w stronę dołka. W pierwszej wersji (piłki za M w stronę dołka)
   przesunięcie ogniska drugiego łuku o 5% **wygrywało we wszystkich 8 kierunkach** —
   trafienie blisko dołka zmniejsza błąd zamiast go powiększać. Wszystkie kaskady
   stoją na jednym sprawdzonym układzie (obróconym albo przesuniętym).
8. **Poziom 11 „Przycinanie”:** okrąg gracza wokół piłki odbija ją prosto z powrotem
   przez piłkę do stałego lustra po drugiej stronie. Gracz przycina okrąg tak, żeby
   zakrywał przerwę w lustrze i **odsłonił** drogę tam, gdzie lustro jest. To jest
   wariant „odsłonić drogę” ze specu, na wachlarzu 360°.
9. **Poziom 12:** o rozmiarze decyduje czerwony okrąg pod łukiem gracza — bez niego
   każdy rozmiar współogniskowego łuku by działał.
10. **Poziom 16** ma tytuł „Zwieńczenie kaskad” (poziom 8 już nazywa się „Zwieńczenie”,
    a tytuły widać obok siebie w menu). Gracz rusza drugim łukiem: ogniska i rozmiar.
    Banda i okrąg na osi M–dołek zostawiają pasmo `a ∈ [0.38, 0.44]`, rozwiązanie
    `a = 0.41`.
11. **Poziomy etapu 2 w osobnym pliku `levels/stage2.ts`** — `levels/index.ts`
    urósłby do ~250 linii danych.

---

## Struktura plików

| Plik | Zmiana | Odpowiedzialność |
|---|---|---|
| `src/core/intersect.ts` | zmiana | `rayConicAll` (wszystkie trafienia) + `rayConic` jako pierwszy element |
| `src/core/piece.ts` | **nowy** | `Arc`, `Piece`, `whole`, `onPiece`, `rayPiece` |
| `src/core/trace.ts` | zmiana | `curves: Piece[]` |
| `src/core/verify.ts` | zmiana | `Sector`, wachlarz w `launchAngles` i `runProof`, `curves: Piece[]` |
| `src/levels/types.ts` | przepisany | `Handle` (+ końce łuku), `ArcRange`, `Shape`, `PlayerPiece`, `Level`, `MIN_ARC` |
| `src/levels/shape.ts` | **nowy** | konstruktory kształtów, parametr elipsy, `shapeToPiece`, `levelCurves` |
| `src/levels/index.ts` | przepisany | osiem poziomów etapu 1 w nowym modelu + `STAGE_2` |
| `src/levels/stage2.ts` | **nowy** | poziomy 9–16 |
| `src/render/shapes.ts` | zmiana | `piecePolyline` |
| `src/render/draw.ts` | zmiana | `drawPiece`, `sectorWedge`, dwa kolory w palecie |
| `src/ui/game.ts` | przepisany | stan z listą `pieces`, wachlarz w dowodzie |
| `src/ui/handles.ts` | przepisany | uchwyty wielu elementów, końce łuku, `moveArcEnd`, `snapTargets` |
| `src/ui/screens.ts` | zmiana | rysowanie kawałków, wachlarz, ogniska stałych elips, przeciąganie po liście |
| `tests/core/piece.test.ts` | **nowy** | przynależność do łuku i `rayPiece` |
| `tests/levels/shape.test.ts` | **nowy** | parametr elipsy, `shapeToPiece`, okrąg = `circleConic` |
| `tests/render/pieces.test.ts` | **nowy** | `drawPiece` (zamknięcie), `sectorWedge` |
| pozostałe testy | zmiana | forma wywołań + nowe przypadki |

---

## Zadanie 1: `rayConicAll` — wszystkie trafienia półprostej

**Pliki:**
- Zmiana: `src/core/intersect.ts`
- Test: `tests/core/intersect.test.ts`

**Interfejsy:**
- Konsumuje: `Conic`, `evalConic` z `core/conic.ts` (bez zmian).
- Produkuje: `rayConicAll(p: Vec2, d: Vec2, k: Conic): number[]` — wszystkie `t > EPS_T`,
  rosnąco. `rayConic(p, d, k): number | null` — pierwszy element albo `null`, zachowanie
  bez zmian.

- [ ] **Krok 1: Napisz testy, które nie przejdą**

W `tests/core/intersect.test.ts` zmień import:

```ts
import { rayConic, rayConicAll } from "../../src/core/intersect";
```

i dopisz na końcu bloku `describe("przecięcie półprostej ze stożkową", …)` (przed jego
zamykającym `});`):

```ts
  it("rayConicAll zwraca oba pierwiastki rosnąco", () => {
    // x² + y² = 1 z (−2, 0) w prawo: a=1, b=−4, c=3 → t = 1 i t = 3, oba dokładnie
    expect(rayConicAll(vec(-2, 0), vec(1, 0), circle)).toEqual([1, 3]);
    // ze środka: drugi pierwiastek (t = −1) leży za plecami i odpada
    expect(rayConicAll(vec(0, 0), vec(1, 0), circle)).toEqual([1]);
    expect(rayConicAll(vec(-2, 5), vec(1, 0), circle)).toEqual([]);
    const wall = lineThrough(vec(0, 0.5), vec(1, 0));
    expect(rayConicAll(vec(0, 0), vec(0, 1), wall)).toHaveLength(1);
  });

  it("rayConic to zawsze pierwszy element rayConicAll", () => {
    let seed = 13579;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const cases: Conic[] = [
      { A: 1, B: 0, C: 1, D: -4, E: 0, F: 3 },
      ellipseFromFoci(vec(0.1, 0.5), vec(0.9, 0.2), 0.7),
      lineThrough(vec(0.3, 0.4), norm(vec(2, 1))),
    ];
    for (const k of cases) {
      for (let i = 0; i < 50; i++) {
        const p = vec(rnd() * 2 - 1, rnd() * 2 - 1);
        const d = fromAngle(rnd() * 2 * Math.PI);
        const all = rayConicAll(p, d, k);
        expect(rayConic(p, d, k)).toBe(all.length > 0 ? all[0] : null);
        for (let j = 1; j < all.length; j++) expect(all[j]).toBeGreaterThan(all[j - 1]);
      }
    }
  });
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/intersect.test.ts`
Expected: FAIL — `rayConicAll` nie jest eksportowane (`is not a function`).

- [ ] **Krok 3: Implementacja**

W `src/core/intersect.ts` zastąp całą funkcję `rayConic` dwiema funkcjami:

```ts
/** Wszystkie trafienia przed piłką (t > EPS_T), rosnąco. Łuk potrzebuje obu: gdy bliższe
 *  wypada w przerwie łuku, piłka leci do dalszego. */
export function rayConicAll(p: Vec2, d: Vec2, k: Conic): number[] {
  const a = k.A * d.x * d.x + k.B * d.x * d.y + k.C * d.y * d.y;
  const b =
    2 * k.A * p.x * d.x +
    k.B * (p.x * d.y + p.y * d.x) +
    2 * k.C * p.y * d.y +
    k.D * d.x +
    k.E * d.y;
  const c = evalConic(k, p);

  if (Math.abs(a) < EPS_A) {
    if (Math.abs(b) < EPS_A) return [];
    const t = -c / b;
    return t > EPS_T ? [t] : [];
  }

  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  // postać stabilna numerycznie: unika odejmowania bliskich sobie liczb
  const q = -0.5 * (b + Math.sign(b || 1) * sq);
  const t1 = q / a;
  const t2 = c / q;

  return [t1, t2].filter((t) => Number.isFinite(t) && t > EPS_T).sort((x, y) => x - y);
}

export function rayConic(p: Vec2, d: Vec2, k: Conic): number | null {
  const hits = rayConicAll(p, d, k);
  return hits.length > 0 ? hits[0] : null;
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/core && npx tsc --noEmit`
Expected: PASS, wszystkie stare testy `intersect.test.ts` nadal zielone.

- [ ] **Krok 5: Commit**

```bash
git add src/core/intersect.ts tests/core/intersect.test.ts
git commit -m "feat(core): rayConicAll - wszystkie trafienia polprostej, rayConic jako pierwsze"
```

---

## Zadanie 2: `Piece` — kawałek krzywej i test przynależności

**Pliki:**
- Nowy: `src/core/piece.ts`
- Test: `tests/core/piece.test.ts`

**Interfejsy:**
- Konsumuje: `rayConicAll` (zadanie 1), `classify` z `core/conic.ts`.
- Produkuje:
  - `interface Arc { from: Vec2; via: Vec2; to: Vec2 }`
  - `interface Piece { conic: Conic; arc?: Arc }`
  - `const ARC_EPS = 1e-9`
  - `whole(conic: Conic): Piece`
  - `onPiece(piece: Piece, p: Vec2): boolean` — `p` leży na krzywej; czy na zachowanej części
  - `rayPiece(p: Vec2, d: Vec2, piece: Piece): number | null`

- [ ] **Krok 1: Napisz testy, które nie przejdą**

Utwórz `tests/core/piece.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { Vec2, add, fromAngle, scale, vec } from "../../src/core/vec";
import { ellipseFromFoci, lineThrough } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";
import { Piece, onPiece, rayPiece, whole } from "../../src/core/piece";

// Okrąg NIE w środku układu: implementacja licząca stronę cięciwy względem (0,0)
// zamiast względem `from` przeszłaby na okręgu wokół zera.
const C = vec(0.3, 0.2);
const R = 0.5;
const circle = ellipseFromFoci(C, C, R);
const at = (deg: number): Vec2 => add(C, scale(fromAngle((deg * Math.PI) / 180), R));

/** Górna połowa: od 0° przez 90° do 180°. */
const upper: Piece = { conic: circle, arc: { from: at(0), via: at(90), to: at(180) } };
/** Łuk WIĘKSZY niż pół okręgu: cięciwa nad środkiem, `via` na dole — zachowane 240°. */
const big: Piece = { conic: circle, arc: { from: at(150), via: at(270), to: at(30) } };

const wall: Piece = {
  conic: lineThrough(vec(0.25, 0.5), vec(1, 0)),
  arc: { from: vec(0.25, 0.5), via: vec(0.5, 0.5), to: vec(0.75, 0.5) },
};

describe("przynależność do łuku", () => {
  it("punkt po stronie `via` należy, po drugiej stronie cięciwy nie", () => {
    expect(onPiece(upper, at(45))).toBe(true);
    expect(onPiece(upper, at(135))).toBe(true);
    expect(onPiece(upper, at(270))).toBe(false);
    expect(onPiece(upper, at(200))).toBe(false);
  });

  it("łuk większy niż pół: `via` po dużej stronie, znak nie jest zakodowany na sztywno", () => {
    expect(onPiece(big, at(270))).toBe(true);
    expect(onPiece(big, at(0))).toBe(true);     // pod cięciwą, ale po stronie `via`
    expect(onPiece(big, at(180))).toBe(true);
    expect(onPiece(big, at(90))).toBe(false);   // jedyny wycięty kawałek to górne 120°
  });

  it("końce łuku liczą się włącznie", () => {
    // p − from jest DOKŁADNIE zerem, a cross(chord, chord) też — test ostry `> 0` odpada
    expect(onPiece(upper, upper.arc!.from)).toBe(true);
    expect(onPiece(upper, upper.arc!.to)).toBe(true);
    expect(onPiece(big, big.arc!.from)).toBe(true);
    expect(onPiece(big, big.arc!.to)).toBe(true);
  });

  it("odcinek: końce włącznie, tuż za końcami już nie", () => {
    // wartości dokładnie reprezentowalne: 0.25, 0.5, 0.75 to sumy potęg dwójki
    expect(onPiece(wall, vec(0.5, 0.5))).toBe(true);
    expect(onPiece(wall, vec(0.25, 0.5))).toBe(true);
    expect(onPiece(wall, vec(0.75, 0.5))).toBe(true);
    expect(onPiece(wall, vec(0.8125, 0.5))).toBe(false);
    expect(onPiece(wall, vec(0.1875, 0.5))).toBe(false);
  });

  it("brak łuku = cała krzywa", () => {
    expect(onPiece(whole(circle), at(270))).toBe(true);
  });
});

describe("półprosta a kawałek krzywej", () => {
  it("bliższe trafienie w przerwie łuku → piłka leci do dalszego", () => {
    // pionowo w górę przez środek: najpierw dół okręgu (przerwa), potem góra (łuk)
    const p = vec(0.3, -0.5), d = vec(0, 1);
    expect(rayConic(p, d, circle)).toBeCloseTo(0.2, 12);
    expect(rayPiece(p, d, upper)).toBeCloseTo(1.2, 12);
  });

  it("oba trafienia w przerwie → brak trafienia", () => {
    // poziomo pod środkiem okręgu: oba przecięcia leżą w dolnej, wyciętej połowie
    expect(rayConic(vec(-1, 0), vec(1, 0), circle)).not.toBeNull();
    expect(rayPiece(vec(-1, 0), vec(1, 0), upper)).toBeNull();
  });

  it("trafienie tuż za końcem odcinka nie jest trafieniem, a w sam koniec jest", () => {
    expect(rayPiece(vec(0.8125, 0), vec(0, 1), wall)).toBeNull();
    expect(rayPiece(vec(0.75, 0), vec(0, 1), wall)).toBe(0.5);
  });

  it("cała krzywa: rayPiece to dokładnie rayConic", () => {
    const k = ellipseFromFoci(vec(-0.2, 0.1), vec(0.5, 0.3), 0.6);
    for (let i = 0; i < 16; i++) {
      const d = fromAngle(i * 0.4 + 0.1);
      expect(rayPiece(vec(0.1, 0.2), d, whole(k))).toBe(rayConic(vec(0.1, 0.2), d, k));
    }
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/piece.test.ts`
Expected: FAIL — nie da się rozwiązać importu `../../src/core/piece`.

- [ ] **Krok 3: Implementacja**

Utwórz `src/core/piece.ts`:

```ts
import { Vec2, add, dot, len, scale, sub } from "./vec";
import { Conic, classify } from "./conic";
import { rayConicAll } from "./intersect";

/** `via` to dowolny punkt na ZACHOWANEJ części krzywej — wskazuje stronę cięciwy
 *  zamiast flagi, której znak łatwo pomylić. Dla prostej `via` nie jest używany. */
export interface Arc { from: Vec2; via: Vec2; to: Vec2 }

/** Kawałek krzywej: brak `arc` oznacza całą krzywą. */
export interface Piece { conic: Conic; arc?: Arc }

/** Tolerancja przynależności do łuku, w jednostkach świata. Końce liczą się włącznie. */
export const ARC_EPS = 1e-9;

export const whole = (conic: Conic): Piece => ({ conic });

const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;

/** Czy punkt P LEŻĄCY NA krzywej należy do zachowanej części. Prosta przecina stożkową
 *  w co najwyżej dwóch punktach, więc cięciwa from→to dzieli KAŻDĄ stożkową na dwie
 *  części po przeciwnych stronach — wystarczy porównać stronę P ze stroną `via`. */
export function onPiece(piece: Piece, p: Vec2): boolean {
  const arc = piece.arc;
  if (arc === undefined) return true;
  const chord = sub(arc.to, arc.from);
  const length = len(chord);
  if (classify(piece.conic) === "prosta") {
    const s = dot(sub(p, arc.from), chord) / length;
    return s >= -ARC_EPS && s <= length + ARC_EPS;
  }
  const side = cross(chord, sub(p, arc.from)) / length;
  const keep = Math.sign(cross(chord, sub(arc.via, arc.from)));
  return side * keep >= -ARC_EPS;
}

/** Pierwsze trafienie w ZACHOWANĄ część krzywej albo null. */
export function rayPiece(p: Vec2, d: Vec2, piece: Piece): number | null {
  for (const t of rayConicAll(p, d, piece.conic)) {
    if (onPiece(piece, add(p, scale(d, t)))) return t;
  }
  return null;
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/core tests/layering.test.ts && npx tsc --noEmit`
Expected: PASS (test warstw obejmuje nowy plik — importuje tylko `./…`).

- [ ] **Krok 5: Commit**

```bash
git add src/core/piece.ts tests/core/piece.test.ts
git commit -m "feat(core): Piece - luk przez punkt via, przynaleznosc przez strone cieciwy, rayPiece"
```

---

## Zadanie 3: `trace` i `runProof` na `Piece[]`

**Pliki:**
- Zmiana: `src/core/trace.ts`, `src/core/verify.ts`, `src/levels/types.ts` (tylko `levelCurves`)
- Test: `tests/core/trace.test.ts`, `tests/core/verify.test.ts`

**Interfejsy:**
- Konsumuje: `Piece`, `rayPiece`, `whole` (zadanie 2).
- Produkuje: `TraceOptions.curves: Piece[]`, `ProofInput.curves: Piece[]`
  (`aimCurve: Conic` bez zmian). `levelCurves(level, state): Piece[]` — przejściowo,
  do zadania 5, opakowuje dotychczasowe krzywe w `whole`.

- [ ] **Krok 1: Dostosuj stare testy do nowej formy i dopisz twierdzenie na łukach**

W `tests/core/trace.test.ts`:

```ts
// import — dopisz pod importem trace:
import { Piece, whole } from "../../src/core/piece";

// helper `base` — zamień pierwsze pole:
const base = (curves: Conic[], hole = vec(9, 9), holeRadius = 0): TraceOptions => ({
  curves: curves.map(whole), hole, holeRadius, maxBounces: 1, maxLength: 100,
});
```

W teście „tor opuszczający planszę kończy się szybko…” zamień `curves: [k]` na
`curves: [whole(k)]`. Na końcu bloku `describe("śledzenie toru", …)` dopisz:

```ts
  it("TWIERDZENIE NA ŁUKACH: strzał z ogniska w dowolny punkt łuku trafia ten punkt i leci do drugiego ogniska", () => {
    // Losowe elipsy i losowe łuki; kierunek celuje w punkt WEWNĄTRZ łuku. Przycinanie,
    // które odrzuca poprawne trafienia albo przepuszcza piłkę przez łuk, tu czerwienieje.
    let seed = 424242;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    let ran = 0;
    for (let i = 0; i < 300; i++) {
      const f1 = vec(rnd() * 1.2 - 0.6, rnd() * 1.2 - 0.6);
      const f2 = vec(rnd() * 1.2 - 0.6, rnd() * 1.2 - 0.6);
      const c = dist(f1, f2) / 2;
      if (c < 0.05) continue;
      const a = c + 0.05 + rnd() * 0.8;
      const b = Math.sqrt(a * a - c * c);
      const u = norm({ x: f2.x - f1.x, y: f2.y - f1.y });
      const center = vec((f1.x + f2.x) / 2, (f1.y + f2.y) / 2);
      const point = (t: number) => vec(
        center.x + u.x * a * Math.cos(t) - u.y * b * Math.sin(t),
        center.y + u.y * a * Math.cos(t) + u.x * b * Math.sin(t),
      );
      const start = rnd() * 2 * Math.PI;
      const span = (60 + rnd() * 240) * (Math.PI / 180);
      const piece: Piece = {
        conic: ellipseFromFoci(f1, f2, a),
        arc: { from: point(start), via: point(start + span / 2), to: point(start + span) },
      };
      const target = point(start + span * (0.1 + 0.8 * rnd()));
      const dir = norm({ x: target.x - f1.x, y: target.y - f1.y });

      const r = trace(f1, dir, { curves: [piece], hole: vec(9, 9), holeRadius: 0, maxBounces: 1, maxLength: 100 });
      expect(r.path.length).toBeGreaterThanOrEqual(3);
      expect(dist(r.path[1], target)).toBeCloseTo(0, 9);
      expect(dist(f1, r.path[1]) + dist(r.path[1], f2)).toBeCloseTo(2 * a, 9);
      expect(dist(r.path[1], f2) + dist(f2, r.path[2]) - dist(r.path[1], r.path[2])).toBeCloseTo(0, 9);
      ran++;
    }
    expect(ran).toBeGreaterThan(250);
  });
```

W `tests/core/verify.test.ts` dopisz import
`import { whole } from "../../src/core/piece";` i zamień każde `curves: [k]`
na `curves: [whole(k)]` (cztery miejsca). Oczekiwania bez zmian.

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx tsc --noEmit`
Expected: FAIL — `Type 'Piece[]' is not assignable to type 'Conic[]'` w testach.
(Vitest bez typów przeszedłby przypadkiem — dlatego tu liczy się `tsc`.)

- [ ] **Krok 3: Implementacja**

`src/core/trace.ts` — importy i pętla trafień:

```ts
import { Vec2, add, dist, dot, norm, scale, sub } from "./vec";
import { Piece, rayPiece } from "./piece";
import { normalAt, reflectDir } from "./reflect";

export interface TraceOptions {
  curves: Piece[];
  // …pozostałe pola bez zmian
```

w `trace`:

```ts
    let best: number | null = null;
    let bestCurve: Piece | null = null;
    for (const piece of opt.curves) {
      const t = rayPiece(p, d, piece);
      if (t !== null && (best === null || t < best)) { best = t; bestCurve = piece; }
    }
```

i przy odbiciu `d = reflectDir(d, normalAt(bestCurve.conic, hit));` — łuk nie zmienia
krzywej, tylko to, gdzie da się w nią trafić.

`src/core/verify.ts` — dopisz `import { Piece } from "./piece";` i w `ProofInput`
zmień `curves: Conic[];` na `curves: Piece[];`.

`src/levels/types.ts` — `levelCurves` opakowuje krzywe (przejściowo, do zadania 5):

```ts
import { Conic, circleConic, ellipseFromFoci } from "../core/conic";
import { Piece, whole } from "../core/piece";
// …
export const levelCurves = (level: Level, state: EllipseState): Piece[] =>
  [
    ellipseFromFoci(state.f1, state.f2, state.a),
    ...level.obstacles.map((o) => circleConic(o.center, o.radius)),
  ].map(whole);
```

(`Conic` zostaje w imporcie tylko wtedy, gdy nadal jest używany — `noUnusedLocals`.)

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — wszystkie testy, łącznie z poziomami i UI (nic poza typem się nie zmieniło).

- [ ] **Krok 5: Commit**

```bash
git add src/core/trace.ts src/core/verify.ts src/levels/types.ts tests/core/trace.test.ts tests/core/verify.test.ts
git commit -m "feat(core): trace i runProof na Piece[], twierdzenie 2a na lukach"
```

---

## Zadanie 4: Dowód w wachlarzu

**Pliki:**
- Zmiana: `src/core/verify.ts`
- Test: `tests/core/verify.test.ts`

**Interfejsy:**
- Produkuje:
  - `interface Sector { center: number; width: number }` (radiany, układ świata)
  - `launchAngles(aimCurve: Conic, count = BALL_COUNT, sector?: Sector): number[]`
  - `ProofInput.sector?: Sector`

- [ ] **Krok 1: Napisz testy, które nie przejdą**

Na końcu `describe("dowód ósemką", …)` w `tests/core/verify.test.ts`:

```ts
  it("wachlarz: kąty równo rozłożone i ściśle wewnątrz sektora", () => {
    // środek 1 rad, nie 0: błąd znaku przy środku zerowym by się schował
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const sector = { center: 1, width: 0.5 };
    const angles = launchAngles(k, 8, sector);
    expect(angles).toHaveLength(8);
    expect(angles[0]).toBeCloseTo(1 - 0.25 + 0.5 / 16, 12);
    expect(angles[7]).toBeCloseTo(1 + 0.25 - 0.5 / 16, 12);
    for (let i = 1; i < 8; i++) expect(angles[i] - angles[i - 1]).toBeCloseTo(0.5 / 8, 12);
    for (const t of angles) {
      expect(t).toBeGreaterThan(0.75);
      expect(t).toBeLessThan(1.25);
    }
  });

  it("wachlarz, podgląd dwupiłkowy: ten sam wzór z n = 2", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const [a, b] = launchAngles(k, 2, { center: 1, width: 0.5 });
    expect(a).toBeCloseTo(0.875, 12);
    expect(b).toBeCloseTo(1.125, 12);
  });

  it("brak wachlarza → dokładnie kąty etapu 1", () => {
    const k = ellipseFromFoci(vec(-0.3, -0.4), vec(0.4, -0.264), 0.8);
    expect(launchAngles(k, 8, undefined)).toEqual(launchAngles(k, 8));
    const ball = vec(-0.3, -0.4), hole = vec(0.4, -0.264);
    const input = { ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], aimCurve: k };
    expect(runProof({ ...input, sector: undefined })).toEqual(runProof(input));
  });

  it("runProof strzela w kierunkach wachlarza", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(ball, hole, 0.8);
    const sector = { center: 2, width: 1 };
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], aimCurve: k, sector });
    const angles = launchAngles(k, 8, sector);
    p.balls.forEach((b, i) => {
      const d = { x: b.path[1].x - b.path[0].x, y: b.path[1].y - b.path[0].y };
      expect(Math.atan2(d.y, d.x)).toBeCloseTo(angles[i], 9);
    });
  });
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/verify.test.ts`
Expected: FAIL — kąty nie mieszczą się w sektorze (trzeci argument jest ignorowany).

- [ ] **Krok 3: Implementacja**

W `src/core/verify.ts` zastąp `launchAngles` i rozszerz `ProofInput`/`runProof`:

```ts
/** Wachlarz strzału: kąty w radianach, w układzie świata. */
export interface Sector { center: number; width: number }

export function launchAngles(aimCurve: Conic, count: number = BALL_COUNT, sector?: Sector): number[] {
  if (sector !== undefined) {
    // (i + ½): równo wewnątrz wachlarza, żadna piłka nie leci po samej krawędzi
    const step = sector.width / count;
    const first = sector.center - sector.width / 2;
    return Array.from({ length: count }, (_, i) => first + (i + 0.5) * step);
  }
  const base = classify(aimCurve) === "elipsa" ? ellipseGeometry(aimCurve).angle : 0;
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => base + (i + 0.25) * step);
}
```

W `ProofInput` pod `count?: number;` dopisz:

```ts
  /** brak = 360° jak w etapie 1 */
  sector?: Sector;
```

W `runProof`:
`const angles = launchAngles(input.aimCurve, input.count ?? BALL_COUNT, input.sector);`

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/core && npx tsc --noEmit`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add src/core/verify.ts tests/core/verify.test.ts
git commit -m "feat(core): dowod w wachlarzu (sector), bez wachlarza zachowanie etapu 1"
```

---

## Zadanie 5: Model poziomu z listą elementów i migracja ośmiu poziomów

Największe zadanie planu: dotyka `levels/` i każdego pliku `ui/`, bo `tsc` obejmuje
wszystko naraz. **Dowodem poprawności migracji są niezmienione oczekiwania testów
etapu 1** — przy prototypie wszystkie osiem poziomów dało identyczny wynik.

**Pliki:**
- Przepisany: `src/levels/types.ts`, `src/levels/index.ts`, `src/ui/game.ts`
- Nowy: `src/levels/shape.ts`
- Zmiana: `src/ui/handles.ts` (wersja przejściowa — pełna w zadaniu 7), `src/ui/screens.ts`
- Test: nowy `tests/levels/shape.test.ts`; przepisany `tests/levels.test.ts`;
  zmiana `tests/ui/game.test.ts`, `tests/ui/handles.test.ts`

**Interfejsy:**
- Konsumuje: `Piece` (zad. 2), `Sector` (zad. 4), `ellipseFromFoci`, `lineThrough`.
- Produkuje (`levels/types.ts`): `MIN_ARC`, `Handle`, `ArcRange`, `EllipseShape`,
  `SegmentShape`, `Shape`, `PlayerPiece`, `Level` — dokładnie jak niżej.
- Produkuje (`levels/shape.ts`):
  `ellipse(f1, f2, a, arc?)`, `circle(center, radius)`, `segment(from, to)`,
  `ellipseAxis(s): Vec2`, `ellipseCenter(s): Vec2`, `semiMinor(s): number`,
  `ellipsePoint(s, t): Vec2`, `ellipseParam(s, p): number`, `shapeConic(s): Conic`,
  `shapeToPiece(s): Piece`, `levelCurves(level, pieces: EllipseShape[]): Piece[]`.
  Wszystko reeksportowane z `src/levels/index.ts`.
- Produkuje (`ui/game.ts`): `GameState.pieces: EllipseShape[]` zamiast `ellipse`.
- Produkuje (`ui/handles.ts`): `interface HandleRef { piece: number; id: Handle }`,
  `pickHandle(world, pieces: EllipseShape[], locks: Handle[][], radius): HandleRef | null`.

- [ ] **Krok 1: Testy kształtów (nowy plik)**

Utwórz `tests/levels/shape.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, scale, vec } from "../../src/core/vec";
import { circleConic, classify, evalConic } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";
import { onPiece, rayPiece } from "../../src/core/piece";
import {
  circle, ellipse, ellipseParam, ellipsePoint, levelCurves, segment, shapeConic, shapeToPiece, LEVELS,
} from "../../src/levels";

// ogniska nieosiowe i niesymetryczne wokół zera
const e = ellipse(vec(-0.2, 0.3), vec(0.5, -0.1), 0.6);

describe("kształty poziomu", () => {
  it("punkt z parametru leży na elipsie", () => {
    for (let t = -3; t <= 3; t += 0.37) expect(evalConic(shapeConic(e), ellipsePoint(e, t))).toBeCloseTo(0, 12);
  });

  it("parametr 0 to wierzchołek za ogniskiem f2, π/2 leży na lewo od osi f1→f2", () => {
    const c = scale(add(e.f1, e.f2), 0.5);
    const p0 = ellipsePoint(e, 0);
    expect(dist(p0, e.f2)).toBeLessThan(dist(p0, e.f1));
    expect(dist(p0, c)).toBeCloseTo(e.a, 12);
    const axis = { x: e.f2.x - e.f1.x, y: e.f2.y - e.f1.y };
    const q = { x: ellipsePoint(e, Math.PI / 2).x - c.x, y: ellipsePoint(e, Math.PI / 2).y - c.y };
    expect(axis.x * q.y - axis.y * q.x).toBeGreaterThan(0);   // przeciwnie do wskazówek zegara
  });

  it("ellipseParam odwraca ellipsePoint", () => {
    for (const t of [-2.9, -1, 0, 0.4, 1.7, 3.1]) expect(ellipseParam(e, ellipsePoint(e, t))).toBeCloseTo(t, 12);
  });

  it("łuk z parametrów: końce i `via` w środku zakresu", () => {
    const arc = ellipse(e.f1, e.f2, e.a, { start: 2, end: 5 });
    const p = shapeToPiece(arc);
    expect(p.arc!.from).toEqual(ellipsePoint(arc, 2));
    expect(p.arc!.to).toEqual(ellipsePoint(arc, 5));
    expect(p.arc!.via).toEqual(ellipsePoint(arc, 3.5));
    expect(onPiece(p, ellipsePoint(arc, 4.5))).toBe(true);
    expect(onPiece(p, ellipsePoint(arc, 1))).toBe(false);
    expect(onPiece(p, ellipsePoint(arc, 5.5))).toBe(false);
  });

  it("okrąg (f1 = f2) trafia się tak samo jak `circleConic` z etapu 1", () => {
    const center = vec(0.42, -0.42);
    const k = shapeConic(circle(center, 0.2));
    expect(classify(k)).toBe("elipsa");
    for (let i = 0; i < 12; i++) {
      const d = fromAngle(i * 0.5 + 0.05);
      const t = rayConic(vec(0, 0), d, k);
      const t1 = rayConic(vec(0, 0), d, circleConic(center, 0.2));
      if (t1 === null) expect(t).toBeNull();
      else expect(t).toBeCloseTo(t1, 12);
    }
  });

  it("odcinek to prosta przycięta do końców", () => {
    const p = shapeToPiece(segment(vec(0.1, 0.4), vec(0.7, 0.4)));
    expect(classify(p.conic)).toBe("prosta");
    expect(rayPiece(vec(0.3, 0), vec(0, 1), p)).toBeCloseTo(0.4, 12);
    expect(rayPiece(vec(0.8, 0), vec(0, 1), p)).toBeNull();
  });

  it("levelCurves: najpierw elementy gracza, potem przeszkody", () => {
    const level = LEVELS.find((l) => l.id === "dwie-przeszkody")!;
    const pieces = level.pieces.map((p) => p.solution);
    const curves = levelCurves(level, pieces);
    expect(curves).toHaveLength(pieces.length + level.obstacles.length);
    expect(curves[0]).toEqual(shapeToPiece(pieces[0]));
    expect(curves[curves.length - 1]).toEqual(shapeToPiece(level.obstacles[level.obstacles.length - 1]));
  });
});
```

- [ ] **Krok 2: Przepisz `tests/levels.test.ts`**

Stare oczekiwania zostają (rozwiązanie rozwiązuje, start nie, `f1` przesunięte o promień
przyskakiwania odpada w każdym z 8 kierunków) — zmienia się tylko dostęp do danych.
Dochodzą testy etapu 2, które na poziomach etapu 1 przechodzą z definicji albo
z zapasem. Cały plik:

```ts
import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, scale } from "../src/core/vec";
import { runProof } from "../src/core/verify";
import {
  DIAGONAL, EllipseShape, Level, LEVELS, MIN_ARC, SNAP_RADIUS, Shape, levelCurves, shapeConic,
} from "../src/levels";

const proofFor = (level: Level, pieces: EllipseShape[], obstacles: Shape[] = level.obstacles) =>
  runProof({
    ball: level.ball,
    hole: level.hole,
    holeRadius: level.test.holeRadius,
    maxBounces: level.test.maxBounces,
    curves: levelCurves({ ...level, obstacles }, pieces),
    aimCurve: shapeConic(pieces[0]),
    sector: level.sector,
    count: level.test.balls,
  });

/** Kształt, którego nie da się skonstruować (a <= c), tym bardziej nie rozwiązuje poziomu.
 *  Bez tego przechwycenia test zmuszałby geometrię poziomów do ustępstw wobec własnej
 *  ułomności (patrz komentarz etapu 1 przy teście przesunięcia ogniska). */
const solves = (level: Level, pieces: EllipseShape[]): boolean => {
  try {
    return proofFor(level, pieces).solved;
  } catch {
    return false;
  }
};

const solutions = (level: Level) => level.pieces.map((p) => p.solution);
const byId = LEVELS.map((l) => [l.id, l] as const);

const STAGE_1_IDS = [
  "ogniska", "rozmiar", "skos", "blisko", "ciasna", "przeszkoda", "dwie-przeszkody", "zwienczenie",
];

describe("poziomy", () => {
  it("liczba poziomów i unikalne identyfikatory", () => {
    expect(LEVELS).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });

  it("identyfikatory etapu 1 zostały, w tej samej kolejności — zapisany postęp przetrwa", () => {
    expect(LEVELS.slice(0, 8).map((l) => l.id)).toEqual(STAGE_1_IDS);
  });

  it("niezmiennik: promień przyskakiwania nie jest mniejszy od pasa tolerancji", () => {
    expect(SNAP_RADIUS).toBeGreaterThanOrEqual(0.05 * DIAGONAL);
  });

  it.each(byId)("poziom %s: zapisane rozwiązanie faktycznie rozwiązuje", (_id, level) => {
    expect(proofFor(level, solutions(level)).solved).toBe(true);
  });

  it.each(byId)("poziom %s: stan początkowy NIE jest rozwiązaniem", (_id, level) => {
    expect(solves(level, level.pieces.map((p) => p.start))).toBe(false);
  });

  it.each(byId)("poziom %s: każdy kształt daje się skonstruować, łuki mają poprawny zakres", (_id, level) => {
    const shapes: Shape[] = [...level.pieces.flatMap((p) => [p.start, p.solution]), ...level.obstacles];
    for (const s of shapes) {
      if (s.kind === "odcinek") {
        expect(dist(s.from, s.to)).toBeGreaterThan(0);
        continue;
      }
      expect(s.a).toBeGreaterThan(dist(s.f1, s.f2) / 2);
      expect(() => shapeConic(s)).not.toThrow();
      if (s.arc !== undefined) {
        expect(s.arc.end - s.arc.start).toBeGreaterThanOrEqual(MIN_ARC);
        expect(s.arc.end - s.arc.start).toBeLessThanOrEqual(2 * Math.PI - MIN_ARC);
      }
    }
    if (level.sector !== undefined) {
      expect(level.sector.width).toBeGreaterThan(0);
      expect(level.sector.width).toBeLessThanOrEqual(2 * Math.PI);
    }
  });

  // Kryterium 5% z §6 etapu 1, per element. Ognisko pierwsze każdego elementu: pudło
  // w KAŻDYM z ośmiu kierunków — dokładnie ten sam test co w etapie 1.
  it.each(byId)("poziom %s: każde odblokowane ognisko1 przesunięte o promień przyskakiwania odpada", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      if (piece.locked.includes("ognisko1")) return;
      for (let i = 0; i < 8; i++) {
        const moved = solutions(level).map((s, j) =>
          j === k ? { ...s, f1: add(s.f1, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) } : s);
        expect(solves(level, moved), `element ${k}, kierunek ${i}`).toBe(false);
      }
    });
  });

  // Ognisko drugie: znany z etapu 1 wyjątek — ognisko po stronie dołka przesunięte
  // WZDŁUŻ własnej osi zostawia tory tak blisko dołka, że część przesunięć nadal
  // przechodzi (twierdzenie o odbiciu celuje dokładnie w przesunięte ognisko, a `trace`
  // sprawdza dołek na całym odcinku). Wymagamy pudła w co najmniej 6 z 8 kierunków;
  // zmierzone: żaden poziom nie ma więcej niż dwóch wyjątków i leżą one na osi elementu.
  it.each(byId)("poziom %s: każde odblokowane ognisko2 odpada w co najmniej 6 z 8 kierunków", (_id, level) => {
    level.pieces.forEach((piece, k) => {
      if (piece.locked.includes("ognisko2")) return;
      let missed = 0;
      for (let i = 0; i < 8; i++) {
        const moved = solutions(level).map((s, j) =>
          j === k ? { ...s, f2: add(s.f2, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) } : s);
        if (!solves(level, moved)) missed++;
      }
      expect(missed, `element ${k}`).toBeGreaterThanOrEqual(6);
    });
  });

  it.each(byId)("poziom %s: rozwiązanie nie opiera się na krawędzi łuku (skrócenie o 1° z obu stron)", (_id, level) => {
    const d = Math.PI / 180;
    const shrink = <S extends Shape>(s: S): S =>
      s.kind === "elipsa" && s.arc !== undefined ? { ...s, arc: { start: s.arc.start + d, end: s.arc.end - d } } : s;
    expect(proofFor(level, solutions(level).map(shrink), level.obstacles.map(shrink)).solved).toBe(true);
  });
});
```

- [ ] **Krok 3: Dostosuj testy UI**

`tests/ui/game.test.ts` — tylko forma dostępu do danych, oczekiwania bez zmian:
- `expect(g.ellipse).toEqual(level.start);` → `expect(g.pieces).toEqual([level.pieces[0].start]);`
- każde `{ ...newGame(level), ellipse: level.solution }` →
  `{ ...newGame(level), pieces: [level.pieces[0].solution] }`
- `{ ...newGame(free), ellipse: { ...free.solution, a } }` →
  `{ ...newGame(free), pieces: [{ ...free.pieces[0].solution, a }] }`

`tests/ui/handles.test.ts` — nagłówek pliku:

```ts
import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import { EllipseShape, SNAP_RADIUS, ellipse } from "../../src/levels";
import { applyDrag, handlePositions, pickHandle, snapTo } from "../../src/ui/handles";
import { ellipseFromFoci } from "../../src/core/conic";

const state: EllipseShape = ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8);
```

oraz w istniejących testach:
- `pickHandle(vec(0.8, 0), state, [], 0.1)).toBe("rozmiar")` →
  `pickHandle(vec(0.8, 0), [state], [[]], 0.1)).toEqual({ piece: 0, id: "rozmiar" })`
- `pickHandle(vec(0.8, 0), state, ["rozmiar"], 0.1)` → `pickHandle(vec(0.8, 0), [state], [["rozmiar"]], 0.1)`
- `pickHandle(vec(0.55, 0), state, [], 0.4)).toBe("ognisko2")` →
  `pickHandle(vec(0.55, 0), [state], [[]], 0.4)?.id).toBe("ognisko2")` (tak samo dla `0.75` / `"rozmiar"`)
- `applyDrag({ f1: vec(-0.1, 0), f2: vec(0.1, 0), a: 0.15 }, …)` → `applyDrag(ellipse(vec(-0.1, 0), vec(0.1, 0), 0.15), …)`
- `const asym: EllipseState = { f1: vec(0.1, 0.2), f2: vec(0.5, 0.6), a: 0.6 };` → `const asym = ellipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6);`

i dopisz na końcu pliku:

```ts
describe("uchwyty wielu elementów", () => {
  const other = ellipse(vec(0.1, 0.5), vec(0.7, 0.3), 0.5);

  it("przy dwóch elementach wygrywa bliższy uchwyt, z właściwym numerem elementu", () => {
    // ognisko2 elementu 0 w (0.5, 0), ognisko1 elementu 1 w (0.1, 0.5); promień obejmuje oba
    expect(pickHandle(vec(0.45, 0.05), [state, other], [[], []], 0.6)).toEqual({ piece: 0, id: "ognisko2" });
    expect(pickHandle(vec(0.15, 0.45), [state, other], [[], []], 0.6)).toEqual({ piece: 1, id: "ognisko1" });
  });

  it("blokady są per element: ten sam uchwyt zablokowany w jednym, wolny w drugim", () => {
    // w promieniu 0.2 od (0.15, 0.45) jest tylko ognisko1 elementu 1
    expect(pickHandle(vec(0.15, 0.45), [state, other], [[], ["ognisko1"]], 0.2)).toBeNull();
    expect(pickHandle(vec(0.15, 0.45), [state, other], [["ognisko1"], []], 0.2)).toEqual({ piece: 1, id: "ognisko1" });
  });
});
```

- [ ] **Krok 4: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels tests/levels.test.ts tests/ui`
Expected: FAIL — brak `ellipse`, `shapeToPiece`, `MIN_ARC`… w `src/levels`.

- [ ] **Krok 5: `src/levels/types.ts` (cały plik)**

```ts
import { Vec2 } from "../core/vec";
import { Sector } from "../core/verify";

export const DIAGONAL = 2 * Math.SQRT2;
export const HOLE_RADIUS = 0.02 * DIAGONAL;
/** Niezmiennik ze specyfikacji: promień przyskakiwania nigdy mniejszy
 *  od pasa, w którym niedokładne ustawienie jeszcze przechodzi test. */
export const SNAP_RADIUS = 0.05 * DIAGONAL;

/** Najkrótszy łuk w parametrze elipsy — dla danych poziomu i dla przeciągania końców.
 *  Pilnuje też, żeby końce się nie minęły: długość łuku leży w [MIN_ARC, 2π − MIN_ARC]. */
export const MIN_ARC = (10 * Math.PI) / 180;

export type Handle = "ognisko1" | "ognisko2" | "rozmiar" | "poczatek" | "koniec";

/** Zakres łuku jako PARAMETR elipsy w jej układzie własnym (oś od f1 do f2):
 *  x = a·cos t, y = b·sin t. Łuk biegnie przeciwnie do ruchu wskazówek zegara
 *  od `start` do `end`; niezmiennik: start < end < start + 2π. */
export interface ArcRange { start: number; end: number }

export interface EllipseShape { kind: "elipsa"; f1: Vec2; f2: Vec2; a: number; arc?: ArcRange }
export interface SegmentShape { kind: "odcinek"; from: Vec2; to: Vec2 }
export type Shape = EllipseShape | SegmentShape;

/** Element, którym rusza gracz. Blokady są per element, nie per poziom. */
export interface PlayerPiece { start: EllipseShape; solution: EllipseShape; locked: Handle[] }

export interface Level {
  id: string;
  title: string;
  hint: string;
  ball: Vec2;
  hole: Vec2;
  /** czym rusza gracz — jeden lub więcej elementów */
  pieces: PlayerPiece[];
  /** stałe: łuki, okręgi, odcinki */
  obstacles: Shape[];
  /** brak = dowód na 360° jak w etapie 1 */
  sector?: Sector;
  test: { balls: number; maxBounces: number; holeRadius: number };
}
```

(`levels/types.ts` importuje typ z `core/verify.ts` — `levels/` zależy od `core/`,
w tę stronę wolno.)

- [ ] **Krok 6: `src/levels/shape.ts` (nowy)**

```ts
import { Vec2, add, dist, norm, perp, scale, sub, vec } from "../core/vec";
import { Conic, ellipseFromFoci, lineThrough } from "../core/conic";
import { Piece } from "../core/piece";
import { ArcRange, EllipseShape, Level, SegmentShape, Shape } from "./types";

export const ellipse = (f1: Vec2, f2: Vec2, a: number, arc?: ArcRange): EllipseShape =>
  arc === undefined ? { kind: "elipsa", f1, f2, a } : { kind: "elipsa", f1, f2, a, arc };

/** Okrąg to elipsa o zlanych ogniskach — osobny typ okręgu nie istnieje. */
export const circle = (center: Vec2, radius: number): EllipseShape => ellipse(center, center, radius);

export const segment = (from: Vec2, to: Vec2): SegmentShape => ({ kind: "odcinek", from, to });

/** Kierunek osi f1→f2; dla okręgu (f1 = f2) umownie oś x. */
export function ellipseAxis(s: EllipseShape): Vec2 {
  return dist(s.f1, s.f2) < 1e-12 ? vec(1, 0) : norm(sub(s.f2, s.f1));
}

export const ellipseCenter = (s: EllipseShape): Vec2 => scale(add(s.f1, s.f2), 0.5);

export function semiMinor(s: EllipseShape): number {
  const c = dist(s.f1, s.f2) / 2;
  return Math.sqrt(s.a * s.a - c * c);
}

/** Punkt elipsy o parametrze t w jej układzie własnym. */
export function ellipsePoint(s: EllipseShape, t: number): Vec2 {
  const u = ellipseAxis(s);
  return add(ellipseCenter(s), add(scale(u, s.a * Math.cos(t)), scale(perp(u), semiMinor(s) * Math.sin(t))));
}

/** Odwrotność `ellipsePoint`: parametr punktu elipsy leżącego najbliżej kierunku od środka
 *  do `p` w układzie własnym. Dla punktu na elipsie jest dokładną odwrotnością. */
export function ellipseParam(s: EllipseShape, p: Vec2): number {
  const u = ellipseAxis(s);
  const q = sub(p, ellipseCenter(s));
  const x = (q.x * u.x + q.y * u.y) / s.a;
  const y = (-q.x * u.y + q.y * u.x) / semiMinor(s);
  return Math.atan2(y, x);
}

export const shapeConic = (s: Shape): Conic =>
  s.kind === "elipsa" ? ellipseFromFoci(s.f1, s.f2, s.a) : lineThrough(s.from, sub(s.to, s.from));

/** Kształt z danych poziomu → kawałek krzywej dla rdzenia. */
export function shapeToPiece(s: Shape): Piece {
  const conic = shapeConic(s);
  if (s.kind === "odcinek") {
    return { conic, arc: { from: s.from, via: scale(add(s.from, s.to), 0.5), to: s.to } };
  }
  if (s.arc === undefined) return { conic };
  const { start, end } = s.arc;
  return {
    conic,
    arc: { from: ellipsePoint(s, start), via: ellipsePoint(s, (start + end) / 2), to: ellipsePoint(s, end) },
  };
}

/** Elementy gracza, potem przeszkody. */
export const levelCurves = (level: Level, pieces: EllipseShape[]): Piece[] => [
  ...pieces.map(shapeToPiece),
  ...level.obstacles.map(shapeToPiece),
];
```

- [ ] **Krok 7: `src/levels/index.ts` (cały plik) — migracja mechaniczna**

`start`/`solution`/`locked` przechodzą do `pieces[0]`, przeszkody `{center, radius}`
na `circle(center, radius)`. Liczby bez zmian.

```ts
import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { circle, ellipse } from "./shape";

export * from "./types";
export * from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

const STAGE_1: Level[] = [
  {
    id: "ogniska",
    title: "Dwa ogniska",
    hint: "Przesuń oba ogniska tak, żeby jedno usiadło na piłce, a drugie w dołku.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: ellipse(vec(-0.15, 0.35), vec(0.35, -0.2), 0.8),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8),
      locked: ["rozmiar"],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "rozmiar",
    title: "Rozmiar bez znaczenia",
    hint: "Teraz możesz zmieniać też rozmiar. Sprawdź, czy to cokolwiek psuje.",
    ball: vec(-0.4, 0), hole: vec(0.4, 0),
    pieces: [{
      start: ellipse(vec(-0.1, 0.3), vec(0.3, 0.1), 0.6),
      solution: ellipse(vec(-0.4, 0), vec(0.4, 0), 0.75),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "skos",
    title: "Na ukos",
    hint: "Oś elipsy nie musi być pozioma.",
    ball: vec(-0.45, -0.45), hole: vec(0.45, 0.45),
    pieces: [{
      start: ellipse(vec(-0.4, 0.4), vec(0.4, -0.4), 0.9),
      solution: ellipse(vec(-0.45, -0.45), vec(0.45, 0.45), 0.9),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "blisko",
    title: "Prawie okrąg",
    hint: "Gdy ogniska się zbliżają, elipsa staje się okręgiem.",
    ball: vec(-0.12, 0.1), hole: vec(0.12, -0.1),
    pieces: [{
      start: ellipse(vec(-0.6, 0.2), vec(0.5, -0.3), 0.8),
      solution: ellipse(vec(-0.12, 0.1), vec(0.12, -0.1), 0.55),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "ciasna",
    title: "Wąska jak igła",
    hint: "Ogniska daleko od siebie zostawiają mało miejsca na elipsę.",
    ball: vec(-0.75, 0), hole: vec(0.75, 0),
    pieces: [{
      start: ellipse(vec(-0.3, 0.2), vec(0.3, -0.2), 0.9),
      solution: ellipse(vec(-0.75, 0), vec(0.75, 0), 0.85),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "przeszkoda",
    title: "Teraz rozmiar ma znaczenie",
    hint: "Ogniska to nie wszystko — elipsa musi zmieścić się obok przeszkody.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.85),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.58),   // pasmo a ∈ (0.50, 0.60)
      locked: [],
    }],
    obstacles: [circle(vec(0, 0.45), 0.12)],
    test: t,
  },
  {
    id: "dwie-przeszkody",
    title: "Z dwóch stron",
    hint: "Pasmo dopuszczalnych rozmiarów właśnie się zwęziło.",
    ball: vec(-0.45, 0), hole: vec(0.45, 0),
    pieces: [{
      start: ellipse(vec(-0.45, 0), vec(0.45, 0), 0.8),
      solution: ellipse(vec(-0.45, 0), vec(0.45, 0), 0.50),  // pasmo a ∈ (0.45, 0.54)
      locked: [],
    }],
    obstacles: [circle(vec(0, 0.42), 0.12), circle(vec(0, -0.42), 0.12)],
    test: t,
  },
  {
    id: "zwienczenie",
    title: "Zwieńczenie",
    hint: "Wszystko naraz: skos, rozmiar i przeszkoda.",
    ball: vec(-0.6, -0.55), hole: vec(0.55, 0.6),
    pieces: [{
      start: ellipse(vec(-0.2, 0.2), vec(0.2, -0.2), 0.7),
      solution: ellipse(vec(-0.6, -0.55), vec(0.55, 0.6), 0.86),  // pasmo a ∈ (0.82, 0.92)
      locked: [],
    }],
    obstacles: [circle(vec(0.42, -0.42), 0.2)],
    test: t,
  },
];

export const LEVELS: Level[] = [...STAGE_1];
```

- [ ] **Krok 8: `src/ui/game.ts` (cały plik)**

```ts
import { Proof, runProof } from "../core/verify";
import { EllipseShape, Level, levelCurves, shapeConic } from "../levels";

/** jednostek świata na sekundę — prędkość jest dosłowna, bez krzywych czasu */
export const BALL_SPEED = 1.2;

export type Phase = "edycja" | "dowod" | "wygrana" | "porazka";

export interface GameState {
  level: Level;
  /** bieżący kształt każdego elementu gracza, w kolejności `level.pieces` */
  pieces: EllipseShape[];
  phase: Phase;
  proof: Proof | null;
  /** sekundy od startu dowodu */
  elapsed: number;
}

export const newGame = (level: Level): GameState => ({
  level, pieces: level.pieces.map((p) => p.start), phase: "edycja", proof: null, elapsed: 0,
});

const proofFor = (state: GameState, count: number): Proof =>
  runProof({
    ball: state.level.ball,
    hole: state.level.hole,
    holeRadius: state.level.test.holeRadius,
    maxBounces: state.level.test.maxBounces,
    curves: levelCurves(state.level, state.pieces),
    // kierunek bazowy dowodu 360° to oś pierwszego elementu gracza — jak w etapie 1
    aimCurve: shapeConic(state.pieces[0]),
    sector: state.level.sector,
    count,
  });

export const preview = (state: GameState): Proof => proofFor(state, 2);

export const startProof = (state: GameState): GameState => ({
  ...state, phase: "dowod", proof: proofFor(state, state.level.test.balls), elapsed: 0,
});

export function advance(state: GameState, dt: number): GameState {
  if (state.phase !== "dowod" || state.proof === null) return state;
  const elapsed = state.elapsed + dt;
  const travelled = elapsed * BALL_SPEED;
  const longest = Math.max(...state.proof.balls.map((b) => b.length));
  if (travelled < longest) return { ...state, elapsed };
  return { ...state, elapsed, phase: state.proof.solved ? "wygrana" : "porazka" };
}
```

- [ ] **Krok 9: `src/ui/handles.ts` — wersja przejściowa (bez łuków)**

Pełna wersja z końcami łuku przychodzi w zadaniu 7. Tu tylko typy i lista elementów:

```ts
import { Vec2, add, dist, norm, scale, sub, vec } from "../core/vec";
import { EllipseShape, Handle } from "../levels/types";

const MIN_GAP = 1e-3;

/** Który uchwyt którego elementu gracza. */
export interface HandleRef { piece: number; id: Handle }

export function handlePositions(state: EllipseShape): { id: Handle; pos: Vec2 }[] {
  const center = scale(add(state.f1, state.f2), 0.5);
  const axis = dist(state.f1, state.f2) < 1e-9 ? vec(1, 0) : norm(sub(state.f2, state.f1));
  return [
    { id: "ognisko1", pos: state.f1 },
    { id: "ognisko2", pos: state.f2 },
    { id: "rozmiar", pos: add(center, scale(axis, state.a)) },
  ];
}

export function snapTo(p: Vec2, targets: Vec2[], radius: number): Vec2 {
  let best: Vec2 | null = null;
  let bestD = radius;
  for (const t of targets) {
    const d = dist(p, t);
    if (d <= bestD) { bestD = d; best = t; }
  }
  return best ?? p;
}

/** Najbliższy odblokowany uchwyt ze WSZYSTKICH elementów gracza. `locks[i]` to blokady
 *  elementu `pieces[i]`. */
export function pickHandle(
  world: Vec2, pieces: EllipseShape[], locks: Handle[][], radius: number,
): HandleRef | null {
  let best: HandleRef | null = null;
  let bestD = radius;
  pieces.forEach((state, piece) => {
    for (const h of handlePositions(state)) {
      if (locks[piece].includes(h.id)) continue;
      const d = dist(world, h.pos);
      if (d <= bestD) { bestD = d; best = { piece, id: h.id }; }
    }
  });
  return best;
}

export function applyDrag(state: EllipseShape, handle: Handle, to: Vec2): EllipseShape {
  if (handle === "rozmiar") {
    const a = (dist(to, state.f1) + dist(to, state.f2)) / 2;
    return { ...state, a: Math.max(a, dist(state.f1, state.f2) / 2 + MIN_GAP) };
  }
  const next = handle === "ognisko1" ? { ...state, f1: to } : { ...state, f2: to };
  return { ...next, a: Math.max(next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
```

- [ ] **Krok 10: `src/ui/screens.ts` — dostosowanie do listy elementów**

Importy (zamiast `circleConic, ellipseFromFoci` i starego `handles`):

```ts
import { Vec2, vec } from "../core/vec";
import { LEVELS, SNAP_RADIUS, shapeConic } from "../levels";
import { makeCamera } from "../render/camera";
import { PALETTE, drawConic, glowDot, glowPolyline, holeMark, ringHandle } from "../render/draw";
import { positionAt, trailSegment } from "../render/trails";
import { HandleRef, applyDrag, handlePositions, pickHandle, snapTo } from "./handles";
```

Stan przeciągania: `let dragging: HandleRef | null = null;`

Komentarz w `toggleMenu`: „…gracz wraca do edycji swoich elementów.”

W `pointerdown`:

```ts
    dragging = pickHandle(
      w, game.pieces, game.level.pieces.map((p) => p.locked), (HANDLE_PX * 1.5) / cam().scale,
    );
```

W `pointermove` (cele przyskakiwania bez zmian — rozszerza je zadanie 7):

```ts
    const { piece, id } = dragging;
    const snapped = id === "rozmiar"
      ? w
      : snapTo(w, [game.level.ball, game.level.hole], SNAP_RADIUS);
    const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped) : s));
    game = { ...game, pieces };
```

W `draw` przeszkody i elementy gracza (rysowanie łuków przychodzi w zadaniu 6; na
poziomach etapu 1 wszystkie kształty są pełnymi krzywymi, więc obraz się nie zmienia):

```ts
    for (const o of level.obstacles) {
      drawConic(ctx, c, shapeConic(o), PALETTE.obstacle, PALETTE.obstacleGlow, 2);
    }

    for (const s of game.pieces) {
      drawConic(ctx, c, shapeConic(s), PALETTE.curve, PALETTE.curveGlow, 2);
    }
```

Uchwyty w fazie edycji:

```ts
      game.pieces.forEach((s, piece) => {
        for (const h of handlePositions(s)) {
          if (level.pieces[piece].locked.includes(h.id)) continue;
          const active = dragging !== null && dragging.piece === piece && dragging.id === h.id;
          const r = active ? 15 : 12 + 1.5 * Math.sin(time * 3.2);
          ringHandle(ctx, c, h.pos, PALETTE.handle, PALETTE.handleGlow, r);
        }
      });
```

- [ ] **Krok 11: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. W szczególności **wszystkie** testy poziomów etapu 1 i `game.test.ts`
z niezmienionymi oczekiwaniami. Jeśli któryś poziom etapu 1 zmienił wynik, **nie
kalibruj go** — szukaj błędu w migracji (np. zamienione `start`/`solution`, zgubione
`locked`, `circle` z promieniem zamiast średnicy).

- [ ] **Krok 12: Ręczny dym w przeglądarce**

Run: `npm run dev`, otwórz poziom 1 i poziom 8: elipsa, przeszkoda, uchwyty i dowód
wyglądają i działają jak przed zmianą.

- [ ] **Krok 13: Commit**

```bash
git add src/levels src/ui/game.ts src/ui/handles.ts src/ui/screens.ts tests/levels tests/levels.test.ts tests/ui/game.test.ts tests/ui/handles.test.ts
git commit -m "refactor(levels): model poziomu z lista elementow gracza, migracja osmiu poziomow etapu 1"
```

---

## Zadanie 6: Rysowanie łuków, odcinków, wachlarza i ognisk stałych elips

**Pliki:**
- Zmiana: `src/render/shapes.ts`, `src/render/draw.ts`, `src/ui/screens.ts`
- Test: `tests/render/shapes.test.ts`, nowy `tests/render/pieces.test.ts`

**Interfejsy:**
- Konsumuje: `Piece`, `onPiece` (zad. 2), `Sector` (zad. 4), `shapeToPiece` (zad. 5).
- Produkuje:
  - `piecePolyline(piece: Piece, steps = 128): Vec2[]`
  - `drawPiece(ctx, cam, piece: Piece, color: string, glow: string, width: number): void`
  - `sectorWedge(ctx, cam, apex: Vec2, sector: Sector, reach: number, fill: string): void`
  - `PALETTE.fixedFocus`, `PALETTE.sector`

- [ ] **Krok 1: Testy łamanej**

W `tests/render/shapes.test.ts` dopisz importy:

```ts
import { conicPolyline, piecePolyline } from "../../src/render/shapes";
import { Piece, onPiece, whole } from "../../src/core/piece";
import { ellipse, ellipsePoint, segment, shapeToPiece } from "../../src/levels";
```

(zastępując dotychczasowy import samego `conicPolyline`) i na końcu pliku:

```ts
describe("polilinia kawałka krzywej", () => {
  const base = ellipse(vec(-0.3, 0.2), vec(0.4, -0.1), 0.75);

  for (const [name, start, end] of [["łuk mniejszy niż pół", 0.5, 2.5], ["łuk większy niż pół", 2, 6.5]] as const) {
    it(`${name}: końce dokładnie, każdy punkt na krzywej i po stronie \`via\``, () => {
      const piece = shapeToPiece(ellipse(base.f1, base.f2, base.a, { start, end }));
      const pts = piecePolyline(piece, 64);
      expect(pts[0]).toEqual(piece.arc!.from);
      expect(pts[pts.length - 1]).toEqual(piece.arc!.to);
      for (const p of pts) {
        expect(evalConic(piece.conic, p)).toBeCloseTo(0, 9);
        expect(onPiece(piece, p)).toBe(true);
      }
    });
  }

  it("łuk opisany odwrotnie (from i to zamienione): próbkowanie idzie zgodnie ze wskazówkami", () => {
    // Bez tego testu implementacja „zawsze przeciwnie do wskazówek zegara” przechodziła
    // wszystko — sprawdzone mutacyjnie przy pisaniu planu.
    const forward = shapeToPiece(ellipse(base.f1, base.f2, base.a, { start: 0.5, end: 2.5 }));
    const piece: Piece = {
      conic: forward.conic,
      arc: { from: forward.arc!.to, via: forward.arc!.via, to: forward.arc!.from },
    };
    const pts = piecePolyline(piece, 64);
    expect(pts[0]).toEqual(piece.arc!.from);
    expect(pts[pts.length - 1]).toEqual(piece.arc!.to);
    for (const p of pts) expect(onPiece(piece, p)).toBe(true);
  });

  it("łuk przechodzi przez `via`: próbkowanie idzie właściwą stroną", () => {
    const shape = ellipse(base.f1, base.f2, base.a, { start: 2, end: 6.5 });
    const pts = piecePolyline(shapeToPiece(shape), 256);
    const via = ellipsePoint(shape, 4.25);
    expect(Math.min(...pts.map((p) => Math.hypot(p.x - via.x, p.y - via.y)))).toBeLessThan(0.02);
  });

  it("odcinek to dokładnie dwa końce", () => {
    const piece = shapeToPiece(segment(vec(0.1, 0.3), vec(0.6, -0.2)));
    expect(piecePolyline(piece)).toEqual([vec(0.1, 0.3), vec(0.6, -0.2)]);
  });

  it("cała krzywa jak dotąd", () => {
    const k = ellipseFromFoci(vec(-0.3, 0.2), vec(0.4, -0.1), 0.75);
    const piece: Piece = whole(k);
    expect(piecePolyline(piece, 32)).toEqual(conicPolyline(k, 32));
  });
});
```

- [ ] **Krok 2: Testy rysowania (nowy plik `tests/render/pieces.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci } from "../../src/core/conic";
import { whole } from "../../src/core/piece";
import { makeCamera } from "../../src/render/camera";
import { drawPiece, sectorWedge } from "../../src/render/draw";
import { ellipse, shapeToPiece } from "../../src/levels";

function recordingCtx() {
  const calls: { op: string; args?: number[] }[] = [];
  const ctx = {
    lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
    beginPath() {}, moveTo() {}, lineTo() {},
    closePath() { calls.push({ op: "closePath" }); },
    arc(...args: number[]) { calls.push({ op: "arc", args }); },
    stroke() { calls.push({ op: "stroke" }); },
    fill() { calls.push({ op: "fill" }); },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const cam = makeCamera(200, 200);

describe("rysowanie kawałków", () => {
  it("cała elipsa jest zamknięta, łuk nie — łuk ma końce", () => {
    const full = recordingCtx();
    drawPiece(full.ctx, cam, whole(ellipseFromFoci(vec(-0.3, 0), vec(0.3, 0), 0.5)), "k", "p", 2);
    expect(full.calls.filter((c) => c.op === "closePath")).toHaveLength(2);

    const arc = recordingCtx();
    drawPiece(arc.ctx, cam, shapeToPiece(ellipse(vec(-0.3, 0), vec(0.3, 0), 0.5, { start: 0, end: 2 })), "k", "p", 2);
    expect(arc.calls.filter((c) => c.op === "closePath")).toHaveLength(0);
    expect(arc.calls.filter((c) => c.op === "stroke")).toHaveLength(2);   // poświata + linia
  });

  it("wachlarz to jedno wypełnienie bez obrysu, kąty świata odwrócone na ekran", () => {
    const { ctx, calls } = recordingCtx();
    sectorWedge(ctx, cam, vec(0.1, -0.2), { center: 1, width: 0.5 }, 3, "klin");
    expect(calls.filter((c) => c.op === "fill")).toHaveLength(1);
    expect(calls.filter((c) => c.op === "stroke")).toHaveLength(0);
    const arc = calls.find((c) => c.op === "arc")!;
    expect(arc.args![3]).toBeCloseTo(-1.25, 12);
    expect(arc.args![4]).toBeCloseTo(-0.75, 12);
  });
});
```

- [ ] **Krok 3: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/render`
Expected: FAIL — `piecePolyline`, `drawPiece`, `sectorWedge` nie istnieją.

- [ ] **Krok 4: `piecePolyline` w `src/render/shapes.ts`**

Importy na górze pliku:

```ts
import { Vec2, add, dot, norm, perp, scale, sub, vec } from "../core/vec";
import { Conic, classify, ellipseGeometry } from "../core/conic";
import { Piece } from "../core/piece";
```

Na końcu pliku:

```ts
const TAU = 2 * Math.PI;
const mod = (x: number): number => ((x % TAU) + TAU) % TAU;

/** Łamana kawałka krzywej. Łuk elipsy: parametry `from` i `to`, próbkowanie w tym
 *  kierunku, który przechodzi przez `via`; końce łuku leżą w łamanej DOKŁADNIE.
 *  Odcinek: dwa punkty. Brak łuku: jak `conicPolyline`. */
export function piecePolyline(piece: Piece, steps = 128): Vec2[] {
  const arc = piece.arc;
  if (arc === undefined) return conicPolyline(piece.conic, steps);
  if (classify(piece.conic) === "prosta") return [arc.from, arc.to];

  const g = ellipseGeometry(piece.conic);
  const u = vec(Math.cos(g.angle), Math.sin(g.angle));
  const v = perp(u);
  const param = (p: Vec2): number => {
    const q = sub(p, g.center);
    return Math.atan2(dot(q, v) / g.b, dot(q, u) / g.a);
  };
  const t0 = param(arc.from);
  const ccw = mod(param(arc.to) - t0);
  // idziemy przeciwnie do wskazówek zegara, chyba że `via` leży po drugiej stronie
  const span = mod(param(arc.via) - t0) < ccw ? ccw : ccw - TAU;
  const n = Math.max(2, Math.ceil((steps * Math.abs(span)) / TAU));
  return Array.from({ length: n + 1 }, (_, i) => {
    if (i === 0) return arc.from;
    if (i === n) return arc.to;
    const t = t0 + (span * i) / n;
    return add(g.center, add(scale(u, g.a * Math.cos(t)), scale(v, g.b * Math.sin(t))));
  });
}
```

- [ ] **Krok 5: `drawPiece`, `sectorWedge` i paleta w `src/render/draw.ts`**

Importy:

```ts
import { Vec2 } from "../core/vec";
import { Conic } from "../core/conic";
import { Piece } from "../core/piece";
import { Sector } from "../core/verify";
import { Camera } from "./camera";
import { conicPolyline, piecePolyline } from "./shapes";
```

W `PALETTE` pod `handleGlow` dopisz:

```ts
  fixedFocus: "rgba(248, 113, 113, 0.45)",
  sector: "rgba(248, 250, 252, 0.05)",
```

Na końcu pliku:

```ts
/** Kawałek krzywej. Zamknięty obrys tylko dla całej elipsy — łuk ma końce. */
export function drawPiece(
  ctx: Ctx, cam: Camera, piece: Piece, color: string, glow: string, width: number,
): void {
  const pts = piecePolyline(piece);
  glowPolyline(ctx, cam, pts, color, glow, width, piece.arc === undefined && pts.length > 2);
}

/** Blady klin wachlarza od piłki. Samo wypełnienie, bez obrysu i bez poświaty. */
export function sectorWedge(
  ctx: Ctx, cam: Camera, apex: Vec2, sector: Sector, reach: number, fill: string,
): void {
  const s = cam.toScreen(apex);
  const r = reach * cam.scale;
  // oś Y ekranu jest odwrócona, więc kąty świata zmieniają znak
  const from = -(sector.center + sector.width / 2);
  const to = -(sector.center - sector.width / 2);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.arc(s.x, s.y, r, from, to);
  ctx.closePath();
  ctx.fill();
}
```

`drawConic` zostaje — test `no-shadow-blur.test.ts` sprawdza, że jest eksportowany.

- [ ] **Krok 6: `src/ui/screens.ts` — rysowanie kawałków, wachlarza i ognisk**

Importy:

```ts
import { Vec2, dist, vec } from "../core/vec";
import { LEVELS, SNAP_RADIUS, shapeToPiece } from "../levels";
import { makeCamera } from "../render/camera";
import { PALETTE, drawPiece, glowDot, glowPolyline, holeMark, ringHandle, sectorWedge } from "../render/draw";
```

W `draw`, zaraz po wypełnieniu tła, zamiast pętli przeszkód i rysowania elementów
z zadania 5:

```ts
    // wachlarz tylko w edycji i tylko gdy poziom go ma — bez niego łuk „nie tam,
    // gdzie lecą piłki” wyglądałby na błąd gry
    if (game.phase === "edycja" && level.sector !== undefined) {
      sectorWedge(ctx, c, level.ball, level.sector, 3, PALETTE.sector);
    }

    for (const o of level.obstacles) {
      drawPiece(ctx, c, shapeToPiece(o), PALETTE.obstacle, PALETTE.obstacleGlow, 2);
      // ogniska stałych elips blado — lekcje kaskad to „trafić ogniskiem w to ognisko”;
      // okręgi pomijamy: ich „ognisko” to środek przeszkody, nie cel
      if (o.kind === "elipsa" && dist(o.f1, o.f2) > 1e-12) {
        glowDot(ctx, c, o.f1, PALETTE.fixedFocus, PALETTE.obstacleGlow, 2.5);
        glowDot(ctx, c, o.f2, PALETTE.fixedFocus, PALETTE.obstacleGlow, 2.5);
      }
    }

    for (const s of game.pieces) {
      drawPiece(ctx, c, shapeToPiece(s), PALETTE.curve, PALETTE.curveGlow, 2);
    }
```

(`shapeConic` i `drawConic` znikają z importów `screens.ts` — `noUnusedLocals`.)

- [ ] **Krok 7: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS, łącznie z `no-shadow-blur.test.ts` i budżetem.

- [ ] **Krok 8: Commit**

```bash
git add src/render src/ui/screens.ts tests/render
git commit -m "feat(render): luki, odcinki, wachlarz i blade ogniska stalych elips"
```

---

## Zadanie 7: Uchwyty końców łuku i rozszerzone przyskakiwanie

**Pliki:**
- Przepisany: `src/ui/handles.ts`
- Zmiana: `src/ui/screens.ts` (tylko `pointermove`)
- Test: `tests/ui/handles.test.ts`

**Interfejsy:**
- Konsumuje: `MIN_ARC`, `ArcRange`, `Level`, `ellipseAxis`, `ellipseCenter`,
  `ellipseParam`, `ellipsePoint` (zad. 5).
- Produkuje (oprócz tego, co już było):
  - `moveArcEnd(arc: ArcRange, which: "poczatek" | "koniec", t: number): ArcRange`
  - `snapTargets(level: Level, pieces: EllipseShape[], dragged: number): Vec2[]`
  - `handlePositions` zwraca `poczatek`/`koniec`, gdy kształt ma łuk; `rozmiar` w środku łuku
  - `applyDrag` obsługuje `poczatek`/`koniec`

- [ ] **Krok 1: Testy, które nie przejdą**

W `tests/ui/handles.test.ts` rozszerz importy:

```ts
import { EllipseShape, Level, MIN_ARC, SNAP_RADIUS, circle, ellipse, ellipseParam, segment, shapeConic } from "../../src/levels";
import { applyDrag, handlePositions, moveArcEnd, pickHandle, snapTargets, snapTo } from "../../src/ui/handles";
import { ellipseFromFoci, evalConic } from "../../src/core/conic";
```

i dopisz na końcu pliku:

```ts
describe("uchwyty łuku", () => {
  it("końce łuku są uchwytami tylko wtedy, gdy łuk istnieje; rozmiar siedzi w środku łuku", () => {
    expect(handlePositions(state).map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
    const arc = ellipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, { start: 1, end: 3 });
    const hs = handlePositions(arc);
    expect(hs.map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar", "poczatek", "koniec"]);
    expect(ellipseParam(arc, hs[2].pos)).toBeCloseTo(2, 12);
    expect(ellipseParam(arc, hs[3].pos)).toBeCloseTo(1, 12);
    expect(ellipseParam(arc, hs[4].pos)).toBeCloseTo(3, 12);
  });

  it("uchwyt końca łuku po przeciągnięciu leży na krzywej, pod kątem palca", () => {
    const arc = ellipse(vec(0.1, 0.2), vec(0.5, 0.6), 0.6, { start: 1, end: 3 });
    const finger = vec(-0.2, 0.9);   // poza krzywą
    const next = applyDrag(arc, "koniec", finger);
    const end = handlePositions(next).find((h) => h.id === "koniec")!.pos;
    expect(evalConic(shapeConic(next), end)).toBeCloseTo(0, 12);
    expect(next.arc!.end).toBeCloseTo(ellipseParam(arc, finger), 12);
    expect(next.f1).toBe(arc.f1);
    expect(next.arc!.start).toBe(1);
  });

  it("minimalna długość łuku: dokładnie na granicy przechodzi, dalej jest zaciskana", () => {
    // start 0 i koniec 1: wrap(t − 0) = t, więc granica początku liczy się bez zaokrągleń
    const arc = { start: 0, end: 1 };
    expect(moveArcEnd(arc, "poczatek", 1 - MIN_ARC).start).toBe(1 - MIN_ARC);
    expect(moveArcEnd(arc, "poczatek", 1 - MIN_ARC / 2).start).toBe(1 - MIN_ARC);
    // dla końca 1 + (t − 1) nie jest dokładne w liczbach zmiennoprzecinkowych — tu tolerancja
    expect(moveArcEnd(arc, "koniec", MIN_ARC).end).toBeCloseTo(MIN_ARC, 15);
    expect(moveArcEnd(arc, "koniec", MIN_ARC / 2).end).toBe(MIN_ARC);
  });

  it("końce nie mogą się minąć: początek przeciągnięty za koniec zatrzymuje się przed nim", () => {
    const arc = { start: 0, end: 1 };
    const moved = moveArcEnd(arc, "poczatek", 1.5);
    expect(moved.end - moved.start).toBeGreaterThanOrEqual(MIN_ARC);
    expect(moved.start).toBeLessThan(moved.end);
    // w drugą stronę łuk nie może urosnąć ponad 2π − MIN_ARC
    const grown = moveArcEnd(arc, "koniec", -0.01);
    expect(grown.end - grown.start).toBeLessThanOrEqual(2 * Math.PI - MIN_ARC + 1e-12);
  });

  it("przeciągnięcie końca łuku bez łuku nic nie zmienia", () => {
    expect(applyDrag(state, "koniec", vec(0, 1))).toBe(state);
  });
});

describe("przyskakiwanie etapu 2", () => {
  const fixed = ellipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, { start: -3, end: -0.7 });
  const round = circle(vec(0.3, -0.6), 0.1);
  const level: Level = {
    id: "t", title: "t", hint: "t", ball: vec(-0.6, 0.1), hole: vec(0.5, 0.1),
    pieces: [], obstacles: [fixed, round, segment(vec(-1, -0.9), vec(1, -0.9))],
    test: { balls: 8, maxBounces: 4, holeRadius: 0.05 },
  };
  const mine = ellipse(vec(-0.6, 0.1), vec(-0.2, 0.3), 0.4);
  const second = ellipse(vec(0.2, -0.3), vec(0.6, -0.2), 0.4);

  it("cele: piłka, dołek, ogniska stałych elips i ogniska POZOSTAŁYCH elementów gracza", () => {
    const targets = snapTargets(level, [mine, second], 0);
    expect(targets).toContain(level.ball);
    expect(targets).toContain(level.hole);
    expect(targets).toContain(fixed.f1);
    expect(targets).toContain(fixed.f2);
    expect(targets).toContain(second.f1);
    expect(targets).toContain(second.f2);
    expect(targets).not.toContain(mine.f2);       // własne ognisko nie jest celem
    expect(targets).not.toContain(round.f1);      // środek okręgu nie jest celem
  });

  it("ognisko przyskakuje do ogniska przeszkody i do ogniska drugiego elementu gracza", () => {
    const near = vec(fixed.f1.x + SNAP_RADIUS / 2, fixed.f1.y);
    expect(snapTo(near, snapTargets(level, [mine, second], 0), SNAP_RADIUS)).toBe(fixed.f1);
    const nearSecond = vec(second.f1.x, second.f1.y + SNAP_RADIUS / 2);
    expect(snapTo(nearSecond, snapTargets(level, [mine, second], 0), SNAP_RADIUS)).toBe(second.f1);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/handles.test.ts`
Expected: FAIL — `moveArcEnd`, `snapTargets` nie istnieją; uchwyty łuku nie są zwracane.

- [ ] **Krok 3: `src/ui/handles.ts` (cały plik)**

```ts
import { Vec2, add, dist, scale } from "../core/vec";
import { ArcRange, EllipseShape, Handle, Level, MIN_ARC } from "../levels/types";
import { ellipseAxis, ellipseCenter, ellipseParam, ellipsePoint } from "../levels/shape";

const MIN_GAP = 1e-3;
const TAU = 2 * Math.PI;

/** Który uchwyt którego elementu gracza. */
export interface HandleRef { piece: number; id: Handle }

export function handlePositions(state: EllipseShape): { id: Handle; pos: Vec2 }[] {
  const out: { id: Handle; pos: Vec2 }[] = [
    { id: "ognisko1", pos: state.f1 },
    { id: "ognisko2", pos: state.f2 },
  ];
  if (state.arc === undefined) {
    out.push({ id: "rozmiar", pos: add(ellipseCenter(state), scale(ellipseAxis(state), state.a)) });
    return out;
  }
  // Na łuku wierzchołek osi wielkiej może leżeć w przerwie, więc uchwyt rozmiaru
  // siedzi w środku łuku — zawsze na tym, co gracz widzi.
  const { start, end } = state.arc;
  out.push(
    { id: "rozmiar", pos: ellipsePoint(state, (start + end) / 2) },
    { id: "poczatek", pos: ellipsePoint(state, start) },
    { id: "koniec", pos: ellipsePoint(state, end) },
  );
  return out;
}

export function snapTo(p: Vec2, targets: Vec2[], radius: number): Vec2 {
  let best: Vec2 | null = null;
  let bestD = radius;
  for (const t of targets) {
    const d = dist(p, t);
    if (d <= bestD) { bestD = d; best = t; }
  }
  return best ?? p;
}

/** Cele przyskakiwania ogniska elementu `dragged`: piłka, dołek, ogniska stałych elips
 *  (bez okręgów — ich „ognisko” to środek przeszkody, nigdy nie jest celem) i ogniska
 *  POZOSTAŁYCH elementów gracza. Bez ostatnich kaskada z dwóch elementów gracza byłaby
 *  palcem niewykonalna. */
export function snapTargets(level: Level, pieces: EllipseShape[], dragged: number): Vec2[] {
  const fixedFoci = level.obstacles.flatMap((o) =>
    o.kind === "elipsa" && dist(o.f1, o.f2) > 1e-12 ? [o.f1, o.f2] : []);
  const otherFoci = pieces.flatMap((p, i) => (i === dragged ? [] : [p.f1, p.f2]));
  return [level.ball, level.hole, ...fixedFoci, ...otherFoci];
}

/** Najbliższy odblokowany uchwyt ze WSZYSTKICH elementów gracza. `locks[i]` to blokady
 *  elementu `pieces[i]`. */
export function pickHandle(
  world: Vec2, pieces: EllipseShape[], locks: Handle[][], radius: number,
): HandleRef | null {
  let best: HandleRef | null = null;
  let bestD = radius;
  pieces.forEach((state, piece) => {
    for (const h of handlePositions(state)) {
      if (locks[piece].includes(h.id)) continue;
      const d = dist(world, h.pos);
      if (d <= bestD) { bestD = d; best = { piece, id: h.id }; }
    }
  });
  return best;
}

/** Sprowadza kąt do przedziału [−π, π]. */
const wrap = (x: number): number => x - TAU * Math.round(x / TAU);
const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);

/** Przesuwa jeden koniec łuku do parametru `t`. Nowy koniec wybieramy najbliżej starego
 *  (bez skoku o 2π), po czym zaciskamy tak, żeby łuk miał co najmniej MIN_ARC
 *  i końce się nie minęły. */
export function moveArcEnd(arc: ArcRange, which: "poczatek" | "koniec", t: number): ArcRange {
  if (which === "poczatek") {
    const start = arc.start + wrap(t - arc.start);
    return { start: clamp(start, arc.end - TAU + MIN_ARC, arc.end - MIN_ARC), end: arc.end };
  }
  const end = arc.end + wrap(t - arc.end);
  return { start: arc.start, end: clamp(end, arc.start + MIN_ARC, arc.start + TAU - MIN_ARC) };
}

export function applyDrag(state: EllipseShape, handle: Handle, to: Vec2): EllipseShape {
  if (handle === "poczatek" || handle === "koniec") {
    // kąt palca w układzie elipsy → parametr: uchwyt ślizga się po krzywej, nie schodzi z niej
    if (state.arc === undefined) return state;
    return { ...state, arc: moveArcEnd(state.arc, handle, ellipseParam(state, to)) };
  }
  if (handle === "rozmiar") {
    const a = (dist(to, state.f1) + dist(to, state.f2)) / 2;
    return { ...state, a: Math.max(a, dist(state.f1, state.f2) / 2 + MIN_GAP) };
  }
  const next = handle === "ognisko1" ? { ...state, f1: to } : { ...state, f2: to };
  return { ...next, a: Math.max(next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
```

Uwaga: łuk nie jest przeliczany przy przesuwaniu ognisk — zakres jest w parametrze
elipsy, więc łuk „jedzie razem z elipsą” (spec §4).

- [ ] **Krok 4: `src/ui/screens.ts` — przyskakiwanie do nowych celów**

Import: `import { HandleRef, applyDrag, handlePositions, pickHandle, snapTargets, snapTo } from "./handles";`

W `pointermove`:

```ts
    const { piece, id } = dragging;
    // przyskakują tylko ogniska; rozmiar i końce łuku idą za palcem
    const snapped = id === "ognisko1" || id === "ognisko2"
      ? snapTo(w, snapTargets(game.level, game.pieces, piece), SNAP_RADIUS)
      : w;
    const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped) : s));
    game = { ...game, pieces };
```

- [ ] **Krok 5: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS, w tym stare testy uchwytów (rozmiar pełnej elipsy nadal na wierzchołku).

- [ ] **Krok 6: Commit**

```bash
git add src/ui/handles.ts src/ui/screens.ts tests/ui/handles.test.ts
git commit -m "feat(ui): uchwyty koncow luku, minimalny luk, przyskakiwanie do ognisk przeszkod i elementow"
```

---

## Poziomy 9–16 — wspólne zasady (zadania 8–11)

- Dane leżą w `src/levels/stage2.ts` jako `export const STAGE_2: Level[]`;
  `src/levels/index.ts` składa `LEVELS = [...STAGE_1, ...STAGE_2]`.
- **Wszystkie liczby poniżej zostały sprawdzone na prototypie** wszystkimi testami
  z `tests/levels.test.ts` (rozwiązanie, start, konstruowalność, 5% dla obu ognisk,
  skrócenie łuków o 1°). Jeśli któryś test czerwienieje, najpierw sprawdź, czy dane
  zostały przepisane dokładnie — dopiero potem kalibruj, i to **na zasadach specu**:
  poprawia się geometria, nie kryterium.
- Każde zadanie z poziomami podnosi liczbę w teście „liczba poziomów…”
  w `tests/levels.test.ts` (8 → 10 → 12 → 14 → 16).
- Każdy nowy poziom trzeba **przejść palcem w przeglądarce** (`npm run dev`), od
  stanu startowego, samymi uchwytami — test tego nie zastąpi.

---

## Zadanie 8: Poziomy 9 „Półelipsa” i 10 „Bandy”

**Pliki:**
- Nowy: `src/levels/stage2.ts`
- Zmiana: `src/levels/index.ts`, `tests/levels.test.ts`, `tests/ui/game.test.ts`, `tests/ui/menu.test.ts`

**Interfejsy:**
- Produkuje: `STAGE_2: Level[]` (tu dwa pierwsze poziomy; kolejne zadania dopisują).

- [ ] **Krok 1: Testy**

`tests/levels.test.ts`: `expect(LEVELS).toHaveLength(8);` → `toHaveLength(10)`.

`tests/ui/game.test.ts` — dopisz na końcu pliku (import `LEVELS` już jest):

```ts
describe("stan gry etapu 2", () => {
  it("podgląd na poziomie z wachlarzem strzela w wachlarz", () => {
    const fan = LEVELS.find((l) => l.sector !== undefined)!;
    const { center, width } = fan.sector!;
    for (const b of preview(newGame(fan)).balls) {
      const t = Math.atan2(b.path[1].y - b.path[0].y, b.path[1].x - b.path[0].x);
      const off = Math.atan2(Math.sin(t - center), Math.cos(t - center));
      expect(Math.abs(off)).toBeLessThan(width / 2);
    }
  });

  it.each(LEVELS.slice(8).map((l) => [l.id, l] as const))(
    "poziom %s: rozwiązanie kończy się wygraną w pętli gry",
    (_id, lvl) => {
      let g = startProof({ ...newGame(lvl), pieces: lvl.pieces.map((p) => p.solution) });
      for (let i = 0; i < 1200 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
      expect(g.phase).toBe("wygrana");
    },
  );
});
```

`tests/ui/menu.test.ts` — dopisz import `import { LEVELS } from "../../src/levels";`
i na końcu pliku:

```ts
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
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels.test.ts tests/ui/game.test.ts`
Expected: FAIL — 8 poziomów zamiast 10; brak poziomu z wachlarzem (`fan` jest `undefined`).

- [ ] **Krok 3: `src/levels/stage2.ts`**

```ts
import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { ellipse, segment } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

export const STAGE_2: Level[] = [
  {
    // Wachlarz 180° w górę: dolna połowa elipsy nie ma czego odbijać, więc jej nie ma.
    id: "polelipsa", title: "Półelipsa",
    hint: "Piłki lecą tylko w górę — lustro potrzebne jest tylko tam, dokąd lecą.",
    ball: vec(-0.5, -0.3), hole: vec(0.5, -0.3),
    pieces: [{
      start: ellipse(vec(-0.25, 0.05), vec(0.35, -0.25), 0.8, { start: 0, end: Math.PI }),
      solution: ellipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, { start: 0, end: Math.PI }),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [],
    sector: { center: Math.PI / 2, width: Math.PI },
    test: t,
  },
  {
    // Ściany-odcinki nad i pod osią: b < 0.4, czyli a ∈ (0.45, 0.60).
    id: "bandy", title: "Bandy",
    hint: "Ściany są odcinkami. Elipsa musi zmieścić się między nimi.",
    ball: vec(-0.45, 0.1), hole: vec(0.45, 0.1),
    pieces: [{
      start: ellipse(vec(-0.3, 0.3), vec(0.3, -0.1), 0.9),
      solution: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.55),
      locked: [],
    }],
    obstacles: [segment(vec(-0.7, 0.5), vec(0.7, 0.5)), segment(vec(-0.7, -0.3), vec(0.7, -0.3))],
    test: t,
  },
];
```

W `src/levels/index.ts`: dopisz `import { STAGE_2 } from "./stage2";` i zmień ostatnią
linię na `export const LEVELS: Level[] = [...STAGE_1, ...STAGE_2];`.


- [ ] **Krok 4: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 5: Przejdź oba poziomy palcem**

`npm run dev`, menu → 9 i 10. Sprawdź: klin wachlarza na poziomie 9 widać w edycji
i znika w dowodzie; półelipsa obraca się razem z ogniskami; bandy to odcinki, nie
nieskończone proste.

- [ ] **Krok 6: Commit**

```bash
git add src/levels tests/levels.test.ts tests/ui/game.test.ts tests/ui/menu.test.ts
git commit -m "feat(levels): poziomy 9 Polelipsa i 10 Bandy"
```

---

## Zadanie 9: Poziomy 11 „Przycinanie” i 12 „Współogniskowe”

**Pliki:**
- Zmiana: `src/levels/stage2.ts`, `tests/levels.test.ts`

- [ ] **Krok 1: Test**

`tests/levels.test.ts`: `toHaveLength(10)` → `toHaveLength(12)`.
Run: `npx vitest run tests/levels.test.ts` → FAIL (10 zamiast 12).

- [ ] **Krok 2: Dane**

W `src/levels/stage2.ts` rozszerz import o `circle`
(`import { circle, ellipse, segment } from "./shape";`), pod stałą `t` dopisz
pomocnik stopni (od tego zadania poziomy podają zakresy łuków w stopniach):

```ts
const deg = (x: number): number => (x * Math.PI) / 180;
```

i dopisz na końcu `STAGE_2`:

```ts
  {
    // Okrąg wokół piłki odbija ją prosto z powrotem, przez piłkę, do stałego lustra
    // po drugiej stronie. Lustro (ogniska: piłka i dołek) ma przerwę od strony lewego
    // dolnego rogu; gracz zostawia z okręgu tylko tę część, która zakrywa przerwę.
    // Pełny okrąg zawraca też piłki lecące do lustra — stąd „odsłonić drogę”.
    id: "przycinanie", title: "Przycinanie",
    hint: "Okrąg wokół piłki odbija ją z powrotem. Przytnij go, żeby odsłonić drogę do lustra.",
    ball: vec(-0.35, -0.4), hole: vec(0.35, 0.4),
    pieces: [{
      start: ellipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, { start: deg(20), end: deg(340) }),
      solution: ellipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, { start: deg(150), end: deg(310) }),
      locked: ["ognisko1", "ognisko2", "rozmiar"],
    }],
    obstacles: [ellipse(vec(-0.35, -0.4), vec(0.35, 0.4), 0.8, { start: deg(-150), end: deg(150) })],
    test: t,
  },
  {
    // Górny łuk stoi (a = 0.75), gracz domyka dół łukiem współogniskowym. Okrąg pod spodem
    // wymusza mały rozmiar: b < 0.45, czyli a ∈ (0.45, 0.636).
    id: "wspologniskowe", title: "Współogniskowe",
    hint: "Dokończ lustro łukiem innej elipsy o tych samych ogniskach.",
    ball: vec(-0.45, 0.1), hole: vec(0.45, 0.1),
    pieces: [{
      start: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.9, { start: Math.PI, end: 2 * Math.PI }),
      solution: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.56, { start: Math.PI, end: 2 * Math.PI }),
      locked: ["ognisko1", "ognisko2", "poczatek", "koniec"],
    }],
    obstacles: [
      ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.75, { start: deg(-20), end: deg(200) }),
      circle(vec(0, -0.45), 0.1),
    ],
    test: t,
  },
```

- [ ] **Krok 3: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. (Na obu poziomach wszystkie ogniska są zablokowane, więc testy 5%
przechodzą bez sprawdzania — zakres ruchu to końce łuku albo rozmiar.)

- [ ] **Krok 4: Przejdź oba poziomy palcem**

Poziom 11: przeciągnij oba końce łuku — uchwyty ślizgają się po okręgu, nie schodzą
z niego, nie dają się zsunąć poniżej ~10°. Poziom 12: widać blade ogniska stałego łuku
(piłka i dołek), jedyny uchwyt siedzi w środku dolnego łuku.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/stage2.ts tests/levels.test.ts
git commit -m "feat(levels): poziomy 11 Przycinanie i 12 Wspologniskowe"
```

---

## Zadanie 10: Poziomy 13 „Kaskada” i 14 „Kaskada od końca”

Układ kaskady (rozstrzygnięcie 7): pierwszy łuk (ogniska: piłka B i punkt M) to górny
prawy kawałek elipsy `a = 0.4`, parametr `[20°, 120°]`; drugi łuk (ogniska: M i dołek)
to dolny kawałek elipsy `a = 0.4`, parametr `[−175°, −40°]`. Piłka strzelona
w wachlarz trafia pierwszy łuk nad M, spada przez M, trafia drugi łuk **w poprzek jego
osi** i leci do dołka. Poziom 14 to ten sam układ obrócony o 90°.

**Pliki:**
- Zmiana: `src/levels/stage2.ts`, `tests/levels.test.ts`, `tests/ui/handles.test.ts`

- [ ] **Krok 1: Testy**

`tests/levels.test.ts`: `toHaveLength(12)` → `toHaveLength(14)`.

`tests/ui/handles.test.ts` — dopisz `LEVELS` do importu z `../../src/levels` i na końcu
bloku `describe("przyskakiwanie etapu 2", …)`:

```ts
  it("poziom kaskady: ognisko pierwszego łuku daje się postawić w M samym przyskokiem", () => {
    const kaskada = LEVELS.find((l) => l.id === "kaskada")!;
    const m = kaskada.pieces[0].solution.f2;
    const targets = snapTargets(kaskada, kaskada.pieces.map((p) => p.start), 0);
    expect(snapTo(vec(m.x + 0.05, m.y - 0.05), targets, SNAP_RADIUS)).toEqual(m);
  });
```

Run: `npx vitest run tests/levels.test.ts tests/ui/handles.test.ts` → FAIL.

- [ ] **Krok 2: Dane — dopisz na końcu `STAGE_2`**

```ts
  {
    // M = (−0.1, 0.1) to ognisko stałego łuku — widoczne blado i będące celem przyskoku.
    id: "kaskada", title: "Kaskada",
    hint: "Drugi łuk prowadzi piłki z jednego punktu do dołka. Postaw ognisko w tym punkcie.",
    ball: vec(-0.6, 0.1), hole: vec(0.5, 0.1),
    pieces: [{
      start: ellipse(vec(-0.3, 0.45), vec(0.15, 0.55), 0.4, { start: deg(20), end: deg(120) }),
      solution: ellipse(vec(-0.6, 0.1), vec(-0.1, 0.1), 0.4, { start: deg(20), end: deg(120) }),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [ellipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, { start: deg(-175), end: deg(-40) })],
    sector: { center: deg(45), width: deg(60) },
    test: t,
  },
  {
    // Układ poziomu 13 obrócony o 90°; teraz stoi pierwszy łuk, a gracz buduje drugi.
    id: "kaskada-od-konca", title: "Kaskada od końca",
    hint: "Pierwszy łuk stoi. Zbuduj wyjście: drugi łuk z ogniskiem tam, gdzie zbiega się pierwszy.",
    ball: vec(0.05, -0.6), hole: vec(0.05, 0.5),
    pieces: [{
      start: ellipse(vec(0.45, -0.3), vec(0.55, 0.25), 0.4, { start: deg(-175), end: deg(-40) }),
      solution: ellipse(vec(0.05, -0.1), vec(0.05, 0.5), 0.4, { start: deg(-175), end: deg(-40) }),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [ellipse(vec(0.05, -0.6), vec(0.05, -0.1), 0.4, { start: deg(20), end: deg(120) })],
    sector: { center: deg(135), width: deg(60) },
    test: t,
  },
```

- [ ] **Krok 3: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Zmierzone na prototypie: poziom 13 — żadne przesunięcie żadnego ogniska
o 5% nie wygrywa; poziom 14 — `ognisko1` odpada we wszystkich 8 kierunkach,
`ognisko2` w 7 z 8 (wyjątek na osi elementu).

- [ ] **Krok 4: Przejdź oba poziomy palcem**

Sprawdź, że przyskok ogniska w M działa (M widać jako bladą kropkę) i że podgląd
dwupiłkowy celuje w wachlarz.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/stage2.ts tests/levels.test.ts tests/ui/handles.test.ts
git commit -m "feat(levels): poziomy 13 Kaskada i 14 Kaskada od konca"
```

---

## Zadanie 11: Poziomy 15 „Dwie elipsy” i 16 „Zwieńczenie kaskad”

**Pliki:**
- Zmiana: `src/levels/stage2.ts`, `tests/levels.test.ts`, `tests/ui/game.test.ts`

- [ ] **Krok 1: Testy**

`tests/levels.test.ts`: `toHaveLength(14)` → `toHaveLength(16)`.

`tests/ui/game.test.ts` — na początku bloku `describe("stan gry etapu 2", …)`:

```ts
  it("poziom z dwoma elementami startuje z oboma", () => {
    const two = LEVELS.find((l) => l.pieces.length === 2)!;
    expect(newGame(two).pieces).toEqual(two.pieces.map((p) => p.start));
  });
```

Run: `npx vitest run tests/levels.test.ts tests/ui/game.test.ts` → FAIL.

- [ ] **Krok 2: Dane — dopisz na końcu `STAGE_2`**

```ts
  {
    // Układ kaskady wzdłuż osi 3-4-5 (kierunek (0.6, 0.8)), żeby liczby zostały dziesiętne.
    // M = (−0.25, −0.2) nie jest ogniskiem żadnej przeszkody, więc nie jest pokazane —
    // gracz stawia oba ogniska, a drugie przyskakuje do pierwszego.
    id: "dwie-elipsy", title: "Dwie elipsy",
    hint: "Cała kaskada w twoich rękach. Punkt spotkania wybierasz sam.",
    ball: vec(-0.55, -0.6), hole: vec(0.11, 0.28),
    pieces: [
      {
        start: ellipse(vec(-0.6, 0.1), vec(-0.2, 0.4), 0.4, { start: deg(20), end: deg(120) }),
        solution: ellipse(vec(-0.55, -0.6), vec(-0.25, -0.2), 0.4, { start: deg(20), end: deg(120) }),
        locked: ["rozmiar", "poczatek", "koniec"],
      },
      {
        start: ellipse(vec(0.3, -0.55), vec(0.65, -0.2), 0.4, { start: deg(-175), end: deg(-40) }),
        solution: ellipse(vec(-0.25, -0.2), vec(0.11, 0.28), 0.4, { start: deg(-175), end: deg(-40) }),
        locked: ["rozmiar", "poczatek", "koniec"],
      },
    ],
    obstacles: [],
    sector: { center: deg(45) + Math.atan2(4, 3), width: deg(60) },
    test: t,
  },
  {
    // Kaskada przy dolnej krawędzi. Gracz rusza drugim łukiem: ogniska i rozmiar.
    // Banda pod spodem ogranicza rozmiar z góry, okrąg na osi M–dołek z dołu:
    // pasmo a ∈ [0.38, 0.44], rozwiązanie w środku.
    id: "zwienczenie-2", title: "Zwieńczenie kaskad",
    hint: "Kaskada, bandy i przeszkoda naraz.",
    ball: vec(-0.6, -0.4), hole: vec(0.5, -0.4),
    pieces: [{
      start: ellipse(vec(-0.2, 0.3), vec(0.3, 0.2), 0.7, { start: deg(-175), end: deg(-40) }),
      solution: ellipse(vec(-0.1, -0.4), vec(0.5, -0.4), 0.41, { start: deg(-175), end: deg(-40) }),
      locked: ["poczatek", "koniec"],
    }],
    obstacles: [
      ellipse(vec(-0.6, -0.4), vec(-0.1, -0.4), 0.4, { start: deg(20), end: deg(120) }),
      segment(vec(-0.5, -0.72), vec(0.8, -0.72)),
      circle(vec(0.05, -0.4), 0.08),
    ],
    sector: { center: deg(45), width: deg(60) },
    test: t,
  },
```

- [ ] **Krok 3: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — 16 poziomów, menu mieści się na 375×667.

- [ ] **Krok 4: Przejdź oba poziomy palcem**

Poziom 15 to ryzyko ze specu (§8, „za trudny”). Jeśli na telefonie jest nie do
przejścia, zgodnie ze specem **zablokuj jeden uchwyt** (np. `ognisko1` pierwszego łuku,
przy starcie ustawionym już na piłce) — nie zmieniaj geometrii bez ponownego
przejścia testów poziomów.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/stage2.ts tests/levels.test.ts tests/ui/game.test.ts
git commit -m "feat(levels): poziomy 15 Dwie elipsy i 16 Zwienczenie kaskad"
```

---

## Zadanie 12: Ręczne sprawdzenie na telefonie i zapis rozstrzygnięć

**Pliki:**
- Nowy: `docs/superpowers/decyzje-etap-2.md`

- [ ] **Krok 1: Uruchom wersję zbudowaną w sieci lokalnej**

```bash
npm run build && npx vite preview --host
```

Otwórz podany adres na telefonie (ta sama sieć Wi-Fi).

- [ ] **Krok 2: Lista kontrolna (każdy punkt na telefonie, w pionie)**

- poziomy 1–8 wyglądają i grają się jak przed zmianą; zapisany postęp (✓ w menu)
  przetrwał aktualizację;
- menu pokazuje 16 kafelków, każdy daje się trafić palcem;
- 9: klin wachlarza widoczny w edycji, niewidoczny w dowodzie;
- 11: końce łuku ślizgają się po okręgu, minimalny łuk ~10°, końce się nie mijają;
- 12–16: blade ogniska stałych elips widoczne, M na 15 niewidoczne;
- 13, 14, 16: przyskok ogniska w M działa bez celowania co do piksela;
- 15: da się przejść w rozsądnym czasie (jeśli nie — patrz zadanie 11, krok 4);
- wszystkie poziomy 9–16 dają się przejść od stanu startowego;
- **ocena kolorów (rozstrzygnięcie 6):** czy czerwone łuki-lustra na 12–16 nie
  sugerują „omijaj mnie”? Zapisz wrażenie — zmiana koloru to decyzja właściciela.

- [ ] **Krok 3: Zapisz rozstrzygnięcia**

Utwórz `docs/superpowers/decyzje-etap-2.md` w formacie `decyzje-etap-1.md`: przepisz
rozstrzygnięcia 1–11 z tego planu, dopisz wszystko, co zdecydowano w trakcie realizacji
(kalibracje, blokady dodane na poziomie 15, uwagi z listy kontrolnej) — z uzasadnieniem
i kosztem na wypadek, gdyby decyzja była błędna.

- [ ] **Krok 4: Pełna weryfikacja i commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS, budżet paczki < 100 KB gzip.

```bash
git add docs/superpowers/decyzje-etap-2.md
git commit -m "docs: rozstrzygniecia etapu 2 i wynik recznego sprawdzenia"
```
