# Wprowadzenia i wygląd krzywych — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać na początek gry trzy poziomy bilardowe z ruchomym lustrem-odcinkiem, plansze z zasadą przy pierwszym poziomie każdej mechaniki, kolory według rodzaju krzywej, kształty uchwytów, stałą oś paraboli i zapis postępu odporny na zmianę kolejności poziomów.

**Architecture:** Rdzeń (`src/core/`) zostaje bez zmian — odcinek już jest kawałkiem krzywej (przeszkody, ściany), a jedna piłka to zwykły wachlarz o szerokości 0. Odcinek wchodzi do `MovableShape` w warstwie poziomów i dostaje uchwyty w `src/ui/handles.ts`. Plansze z zasadą to dane (`src/levels/cards.ts`) z miniscenkami liczonymi tym samym `trace`, rysowane tymi samymi funkcjami co gra. Wygląd wybierają czyste funkcje (`src/render/style.ts`, `parabolaAxis`, `shotArrow`), testowane bez płótna.

**Tech Stack:** TypeScript, Canvas 2D, Vite 8, Vitest 5. Zero zależności produkcyjnych.

**Spec:** `docs/superpowers/specs/2026-10-13-golf-wprowadzenia-i-wyglad-design.md`

## Global Constraints

- **Zero zależności produkcyjnych.** Nic nie dochodzi do `dependencies` w `package.json`.
- **Budżet paczki < 100 KB gzip**, egzekwowany przez `tests/budget.test.ts`. Stan wyjściowy: 12.55 KB; po całym planie ok. 15.3 KB.
- **`src/core/` nie importuje niczego spoza `src/core/`** (`tests/layering.test.ts`). Ten plan nie zmienia ani jednego pliku w `src/core/`.
- **`shadowBlur` i `shadowColor` zakazane** (`tests/render/no-shadow-blur.test.ts`). Poświata = dwa obrysy; linia przerywana = `setLineDash`.
- **Bez rzutowań `as` i bez `!` w nowym kodzie produkcyjnym.** (W testach dopuszczalne tam, gdzie plik już tak robi.)
- **Wygrana to „wszystkie wpadną".** Piłki nie muszą wpaść w tej samej chwili. Żaden test ani warunek nie może zależeć od jednoczesnego dotarcia ani od liczby odbić.
- **Uchwyty zostają w planszy `[-1, 1]²`** — `clampToBoard` w `applyDrag` działa dla każdego kształtu, także odcinka.
- **Komentarze tłumaczą „dlaczego", nie „co", po polsku — i muszą być prawdziwe.** Gałęzie etapu 3 traktowały nieprawdziwy komentarz jako błąd; ten plan też.
- **Nazewnictwo** jak w repozytorium: wartości domeny po polsku (`"odcinek"`, `"koniec1"`, `"srodek"`), nazwy funkcji i pól technicznych po angielsku.
- **Commity po polsku**: krótki temat, pusta linia, treść, na końcu trailer `Co-Authored-By:` podany w zleceniu; każda część osobnym `-m`. Bez `--amend`, bez przepisywania historii.
- **Nie dotykać plików, których zadanie nie wymienia** — w szczególności nieśledzonego `do poprawy.txt` w katalogu głównym.

## Odstępstwa planu od litery specyfikacji (świadome)

1. **Minimalna długość lustra to `MIN_SEGMENT_LENGTH = 0.2`, nie `MIN_GAP`** (spec §1.2). Przy długości rzędu `MIN_GAP` trzy uchwyty odcinka leżą bliżej siebie niż promień łapania palcem (`HANDLE_PX · 1.5` ≈ 0.2 jednostki na telefonie) i gracz nie umie złapać końca osobno od środka.
2. **Miniscena planszy ma listę strzałów `shots: { from, angle }[]`, nie `ball` + `angles`** (spec §2.1). Scena hiperboli pokazuje piłki lecące w stronę ogniska z kilku miejsc naraz — z jednego punktu tego nie da się narysować. Wachlarz z jednej piłki to po prostu strzały o wspólnym `from`. Pole `bounces` mówi, ile odbić rysować.
3. **Przycisk „?" leży w wierszu „Poziom N / M" na środku u góry**, nie obok ⚙ (spec §2.2 mówi tylko „w pasku"). Obok ⚙ na telefonie 390 px zachodziłby na najdłuższe tytuły („Teraz rozmiar ma znaczenie" ≈ 250 px).
4. **Dodatki, których spec nie wymienia, a wynikają z jednej piłki:** podgląd torów strzela `min(2, balls)` piłkami (dwie piłki jednopiłkowego poziomu leciałyby tym samym torem), a baner po dowodzie mówi w liczbie pojedynczej („Wpadła" / „Chybiła" zamiast „Chybiło 1 z 1").
5. **Numery poziomów w komentarzach** etapów 2–3 i testów zostają historyczne (każdy plik z takimi numerami dostaje notkę na górze), a **nazwy testów** podają identyfikatory zamiast numerów — nazwa testu pojawia się w wyniku i nie może kłamać.

## Kalibracja — sprawdzona przed napisaniem planu

Cały plan został przeprowadzony na kopii repozytorium przez autora planu: każdy blok kodu poniżej pochodzi z tej kopii, a po każdym zadaniu `npx tsc --noEmit` był czysty i `npx vitest run` zielony. Liczby testów po zadaniach: 548 → 551 → 616 → 617 → 628 → 634 → 647 → 659. Poziomy etapu 0 i sceny plansz zmierzone silnikiem:

| Poziom / scena | Rozwiązanie | Start | Obrót lustra ±3° |
|---|---|---|---|
| `odbicie` | wpada po 1 odbiciu | pudło | pudło o 0.70 / 0.78 |
| `dwa-odbicia` | wpada po 2 odbiciach | pudło | pudło o 1.64 / 1.64 |
| `za-rogiem` | wpada po 1 odbiciu (tor przecina x = 0 na y ≈ 0.1, nad ścianą do y = −0.1) | pudło | pudło o 0.42 / 0.41 |

Sceny plansz: elipsa 8/8 w dołku, łuk 8/8, kaskada 8/8 (po 2 odbiciach), hiperbola 6/6 po jednym odbiciu, parabola — wszystkie tory po odbiciu równoległe (kierunek 0.000), płaskie lustro — siedem różnych kierunków co ok. 0.15 rad.

Jeśli którakolwiek liczba w trakcie wykonania wyjdzie inna, to nie jest „drobna różnica" — zatrzymaj się i zgłoś.

---

## Zadanie 1: Lustro-odcinek jako element gracza

Odcinek staje się kształtem, którym gracz rusza: trzy uchwyty (`koniec1`, `koniec2`, `srodek`), minimalna długość, środek nie wyprowadza końców poza planszę. `Shape` i `MovableShape` stają się tą samą unią czterech rodzajów; `CurveShape` nazywa trzy krzywe z ogniskami. Żaden poziom jeszcze nie używa ruchomego odcinka — to przychodzi w zadaniu 3.

Dlaczego tyle zmian w `tests/levels.test.ts`: po poszerzeniu `MovableShape` TypeScript przestaje zawężać kilka miejsc w testach (np. `{ ...sol, f1 }` dla kształtu, który może być odcinkiem). Każde takie miejsce dostaje jawne `sol.kind === "odcinek"` — odcinek nie ma ognisk ani kawałka do skracania, więc te testy go pomijają. Zmierzone: bez tych zmian `tsc` zgłasza błędy w liniach ok. 202–225, 240, 259, 300 i 503 tego pliku.

**Pliki:**
- Zmiana: `src/levels/shape.ts`
- Zmiana: `src/levels/types.ts`
- Zmiana: `src/ui/handles.ts`
- Zmiana: `tests/levels.test.ts`
- Zmiana: `tests/ui/handles.test.ts`

**Interfejsy:**
- Produkuje: w `src/levels/types.ts` — `Handle` z nowymi wartościami `"koniec1" | "koniec2" | "srodek"`; `CurveShape = EllipseShape | ParabolaShape | HyperbolaShape`; `Shape = CurveShape | SegmentShape`; `MovableShape = Shape`. W `src/ui/handles.ts` — `export const MIN_SEGMENT_LENGTH = 0.2`; `handlePositions(odcinek)` zwraca `[koniec1 = from, koniec2 = to, srodek = środek]`; `applyDrag` obsługuje `kind: "odcinek"`. W `src/levels/shape.ts` — `shapeFoci(odcinek) = []`, `shapeAxisAngle(odcinek) = kąt from→to`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**

Dopisz na końcu `tests/ui/handles.test.ts` blok „lustro-odcinek gracza" i rozszerz importy. Zmiany w `tests/levels.test.ts` są potrzebne, żeby suita w ogóle się skompilowała po kroku 3 — wprowadź je w tym kroku razem z nowymi testami.

Zmiana w `tests/levels.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -189,9 +189,9 @@ describe("poziomy", () => {
       if (!piece.locked.includes("rozmiar")) return;
       const start = piece.start;
       const sol = piece.solution;
       // parabola nie ma uchwytu rozmiaru — nie ma czego przywracać
-      if (start.kind === "parabola" || sol.kind === "parabola") return;
+      if (start.kind === "parabola" || start.kind === "odcinek" || sol.kind === "parabola" || sol.kind === "odcinek") return;
       // pułapka dotyczy tylko ognisk, którymi gracz naprawdę może objechać — objazd
       // ciągnie WOLNE ogniska; gdy oba są też zablokowane (np. okrąg poziomu 11),
       // nie ma czym objeżdżać. Na poziomach z zablokowanym tylko jednym ogniskiem
       // (np. planowane 22–23: zablokowane `ognisko1` i `rozmiar`) objazd musi ciągnąć
@@ -204,9 +204,9 @@ describe("poziomy", () => {
       // dragHyperbola/dragEllipse nigdy nie zmieniają `kind`; parabola już wykluczona
       // wyżej — to tylko odzyskuje dla TypeScriptu zawężenie zgubione przez ogólne
       // przeciążenie applyDrag (zwraca MovableShape)
       const narrow = (s: MovableShape) => {
-        if (s.kind === "parabola") throw new Error("zły rodzaj");
+        if (s.kind === "parabola" || s.kind === "odcinek") throw new Error("zły rodzaj");
         return s;
       };
 
       // Elipsa i hiperbola bronią zacisku na przeciwnych krańcach: elipsie `a` rośnie
@@ -234,9 +234,9 @@ describe("poziomy", () => {
   it.each(byId)("poziom %s: każde odblokowane ognisko1 przesunięte o promień przyskakiwania odpada", (_id, level) => {
     level.pieces.forEach((piece, k) => {
       const sol = piece.solution;
       // parabola nie ma uchwytu `ognisko1` — jej jedyne ognisko sprawdza osobny test niżej
-      if (piece.locked.includes("ognisko1") || sol.kind === "parabola") return;
+      if (piece.locked.includes("ognisko1") || sol.kind === "parabola" || sol.kind === "odcinek") return;
       for (let i = 0; i < 8; i++) {
         const shifted: MovableShape = { ...sol, f1: add(sol.f1, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) };
         const moved = solutions(level).map((s, j) => (j === k ? shifted : s));
         expect(solves(level, moved), `element ${k}, kierunek ${i}`).toBe(false);
@@ -252,9 +252,9 @@ describe("poziomy", () => {
   it.each(byId)("poziom %s: każde odblokowane ognisko2 odpada w co najmniej 6 z 8 kierunków", (_id, level) => {
     level.pieces.forEach((piece, k) => {
       const sol = piece.solution;
       // parabola nie ma uchwytu `ognisko2` — jej jedyne ognisko sprawdza osobny test niżej
-      if (piece.locked.includes("ognisko2") || sol.kind === "parabola") return;
+      if (piece.locked.includes("ognisko2") || sol.kind === "parabola" || sol.kind === "odcinek") return;
       let missed = 0;
       for (let i = 0; i < 8; i++) {
         const shifted: MovableShape = { ...sol, f2: add(sol.f2, scale(fromAngle((i * Math.PI) / 4), SNAP_RADIUS)) };
         const moved = solutions(level).map((s, j) => (j === k ? shifted : s));
@@ -294,9 +294,10 @@ describe("poziomy", () => {
   // opiera się na końcu odcinka — sprawdzone przez usunięcie wszystkich odcinków z tego testu.
   const shrinkSpan = (span: Span, d: number): Span =>
     span.length !== undefined ? { ...span, length: span.length - 2 * d } : { ...span, span: span.span - 2 * d };
   const shrinkMovable = (s: MovableShape, d: number): MovableShape =>
-    s.kind === "elipsa"
+    s.kind === "odcinek" ? s
+    : s.kind === "elipsa"
       ? (s.arc === undefined ? s : { ...s, arc: { ...s.arc, length: s.arc.length - 2 * d } })
       : { ...s, span: shrinkSpan(s.span, d) };
   const shrinkShape = (s: Shape, d: number): Shape => (s.kind === "odcinek" ? s : shrinkMovable(s, d));
 
@@ -497,10 +498,10 @@ describe("poziomy", () => {
     level.pieces.forEach((piece, k) => {
       const sol = piece.solution;
       const lockedA = lockedSize(piece);
       // każde wolne ognisko elementu razem z jego celem
-      const wolne: { uchwyt: Handle; cel: Vec2 }[] = sol.kind === "parabola"
-        ? [{ uchwyt: "ognisko", cel: sol.focus }]
+      const wolne: { uchwyt: Handle; cel: Vec2 }[] = sol.kind === "odcinek" ? []
+        : sol.kind === "parabola" ? [{ uchwyt: "ognisko", cel: sol.focus }]
         : [{ uchwyt: "ognisko1", cel: sol.f1 }, { uchwyt: "ognisko2", cel: sol.f2 }];
       for (const { uchwyt, cel } of wolne) {
         if (piece.locked.includes(uchwyt)) continue;
         for (let i = 0; i < kierunki; i++) {
```

Zmiana w `tests/ui/handles.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -2,11 +2,13 @@ import { describe, it, expect } from "vitest";
 import { Vec2, vec, dist } from "../../src/core/vec";
 import {
   EllipseShape, Level, LEVELS, MIN_ARC_LENGTH, MovableShape, SNAP_RADIUS, arcEllipse, arcLengthBetween, arcParams,
   circle, ellipse, ellipseParam, ellipsePoint, hyperbola, paramAtLength, parabola, perimeter, segment, shapeAxisAngle,
-  shapeConic,
+  shapeConic, shapeFoci,
 } from "../../src/levels";
-import { applyDrag, handlePositions, lockedSize, moveArcEnd, pickHandle, snapTargets, snapTo } from "../../src/ui/handles";
+import {
+  MIN_SEGMENT_LENGTH, applyDrag, handlePositions, lockedSize, moveArcEnd, pickHandle, snapTargets, snapTo,
+} from "../../src/ui/handles";
 import { ellipseFromFoci, evalConic } from "../../src/core/conic";
 
 const state: EllipseShape = ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8);
 // wyniesione nad oba bloki: `par` z testów paraboli jest potrzebny też w ostatnim
@@ -429,4 +431,69 @@ describe("lockedSize", () => {
   it("parabola nie ma rozmiaru — nawet blokada `rozmiar` nic nie daje", () => {
     expect(lockedSize({ start: par, solution: par, locked: ["rozmiar"] })).toBeUndefined();
   });
 });
+
+describe("lustro-odcinek gracza", () => {
+  const lustro = segment(vec(-0.2, 0.3), vec(0.2, 0.5));
+
+  it("ma trzy uchwyty: dwa końce i środek", () => {
+    const hs = handlePositions(lustro);
+    expect(hs.map((h) => h.id)).toEqual(["koniec1", "koniec2", "srodek"]);
+    expect(hs[0].pos).toEqual(lustro.from);
+    expect(hs[1].pos).toEqual(lustro.to);
+    expect(hs[2].pos.x).toBeCloseTo(0, 12);
+    expect(hs[2].pos.y).toBeCloseTo(0.4, 12);
+  });
+
+  it("koniec idzie za palcem, drugi koniec stoi", () => {
+    const moved = applyDrag(lustro, "koniec2", vec(0.5, -0.1));
+    expect(moved).toEqual(segment(lustro.from, vec(0.5, -0.1)));
+  });
+
+  it("środek przesuwa cały odcinek bez obrotu i bez zmiany długości", () => {
+    const moved = applyDrag(lustro, "srodek", vec(0.3, -0.2));
+    if (moved.kind !== "odcinek") throw new Error("zły rodzaj");
+    expect(moved.from.x).toBeCloseTo(0.1, 12);
+    expect(moved.from.y).toBeCloseTo(-0.3, 12);
+    expect(moved.to.x).toBeCloseTo(0.5, 12);
+    expect(moved.to.y).toBeCloseTo(-0.1, 12);
+  });
+
+  it("środek nie wyprowadza żadnego końca poza planszę", () => {
+    const moved = applyDrag(lustro, "srodek", vec(0.95, 0.95));
+    if (moved.kind !== "odcinek") throw new Error("zły rodzaj");
+    for (const p of [moved.from, moved.to]) {
+      expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
+      expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
+    }
+    // kierunek i długość bez zmian — przesunięcie, nie obrót
+    expect(moved.to.x - moved.from.x).toBeCloseTo(0.4, 12);
+    expect(moved.to.y - moved.from.y).toBeCloseTo(0.2, 12);
+    // dosunięty do brzegu, nie zatrzymany wcześniej
+    expect(Math.max(moved.from.y, moved.to.y)).toBeCloseTo(1, 12);
+  });
+
+  it("koniec nie zbliża się do drugiego bardziej niż MIN_SEGMENT_LENGTH", () => {
+    for (const cel of [lustro.from, vec(-0.15, 0.32)]) {
+      const moved = applyDrag(lustro, "koniec2", cel);
+      if (moved.kind !== "odcinek") throw new Error("zły rodzaj");
+      expect(dist(moved.from, moved.to)).toBeCloseTo(MIN_SEGMENT_LENGTH, 12);
+    }
+  });
+
+  it("przy brzegu odsunięcie końca idzie w stronę planszy", () => {
+    const przyBrzegu = segment(vec(0.95, 0), vec(0.5, 0));
+    const moved = applyDrag(przyBrzegu, "koniec2", vec(1, 0));
+    if (moved.kind !== "odcinek") throw new Error("zły rodzaj");
+    expect(moved.to.x).toBeCloseTo(0.75, 12);
+    expect(dist(moved.from, moved.to)).toBeCloseTo(MIN_SEGMENT_LENGTH, 12);
+  });
+
+  it("uchwytów odcinka nie dotyczy przyskakiwanie — nie ma ognisk", () => {
+    expect(shapeFoci(lustro)).toEqual([]);
+  });
+
+  it("kąt osi odcinka to kierunek od from do to", () => {
+    expect(shapeAxisAngle(lustro)).toBeCloseTo(Math.atan2(0.2, 0.4), 12);
+  });
+});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/handles.test.ts`
Oczekiwane: testy z bloku „lustro-odcinek gracza" NIE przechodzą (`MIN_SEGMENT_LENGTH` jest `undefined`, `handlePositions` odcinka zwraca uchwyty elipsy z `NaN`). Pozostałe testy pliku przechodzą.

- [ ] **Krok 3: Implementacja**

Kolejność w `applyDrag` ma znaczenie: odcinek obsługujemy zaraz po `clampToBoard`, przed parabolą — reszta funkcji zakłada elipsę.

`MovableShape = Shape` zamiast osobnej unii: od tego zadania każdy kształt może być elementem gracza; nazwa zostaje, bo mówi, do czego pole służy (`PlayerPiece.start`, `GameState.pieces`).

W `src/levels/types.ts` stary komentarz „Czym gracz może ruszać. Odcinki są stałe — jak w etapie 2.” znika — od tego zadania jest nieprawdziwy.

Zmiana w `src/levels/shape.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -68,8 +68,9 @@ export function shapeFrame(s: ParabolaShape | HyperbolaShape): CurveFrame {
 
 /** Ogniska kształtu — cele przyskakiwania. Okrąg (f1 = f2) zwraca pustą listę:
  *  jego „ognisko" to środek przeszkody, nigdy nie jest sensownym celem (etap 2). */
 export function shapeFoci(s: MovableShape): Vec2[] {
+  if (s.kind === "odcinek") return [];
   if (s.kind === "parabola") return [s.focus];
   if (s.kind === "hiperbola") return [s.f1, s.f2];
   return isCircle(s) ? [] : [s.f1, s.f2];
 }
@@ -78,8 +79,9 @@ export function shapeFoci(s: MovableShape): Vec2[] {
 export function shapeAxisAngle(s: MovableShape): number {
   const u =
     s.kind === "elipsa" ? ellipseAxis(s)
     : s.kind === "parabola" ? norm(sub(s.focus, s.vertex))
+    : s.kind === "odcinek" ? norm(sub(s.to, s.from))
     : norm(sub(s.f2, s.f1));
   return Math.atan2(u.y, u.x);
 }
```

Zmiana w `src/levels/types.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -13,9 +13,10 @@ export const SNAP_RADIUS = 0.05 * DIAGONAL;
 export const MIN_ARC_LENGTH = 0.05;
 
 export type Handle =
   | "ognisko1" | "ognisko2" | "rozmiar" | "poczatek" | "koniec"   // elipsa i jej łuk
-  | "ognisko" | "wierzcholek";                                     // parabola
+  | "ognisko" | "wierzcholek"                                       // parabola
+  | "koniec1" | "koniec2" | "srodek";                              // odcinek
 
 /** Dwa sposoby opisania kawałka krzywej; twórca poziomu wybiera pasujący.
  *  `length` — długość wzdłuż krzywej: gdy krzywa rośnie, ten sam kawałek obejmuje jej
  *  mniejszy wycinek, więc rozdmuchaniem krzywej nie da się zastąpić kaskady (etap 2).
@@ -46,13 +47,16 @@ export interface ParabolaShape { kind: "parabola"; focus: Vec2; vertex: Vec2; sp
 export interface HyperbolaShape {
   kind: "hiperbola"; f1: Vec2; f2: Vec2; a: number; branch: 1 | -1; span: Span; twin?: true;
 }
 
-/** Czym gracz może ruszać. Odcinki są stałe — jak w etapie 2. */
-export type MovableShape = EllipseShape | ParabolaShape | HyperbolaShape;
-
 export interface SegmentShape { kind: "odcinek"; from: Vec2; to: Vec2 }
-export type Shape = MovableShape | SegmentShape;
+
+/** Krzywe z ogniskami — to, co ma ogniska do przyskakiwania i kolor rodzaju. */
+export type CurveShape = EllipseShape | ParabolaShape | HyperbolaShape;
+export type Shape = CurveShape | SegmentShape;
+
+/** Czym gracz może ruszać — od etapu 0 także lustrem-odcinkiem, więc każdym kształtem. */
+export type MovableShape = Shape;
 
 /** Element, którym rusza gracz. Blokady są per element, nie per poziom. */
 export interface PlayerPiece { start: MovableShape; solution: MovableShape; locked: Handle[] }
```

Zmiana w `src/ui/handles.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,7 +1,8 @@
 import { Vec2, add, dist, dot, norm, scale, sub } from "../core/vec";
 import {
   ArcRange, EllipseShape, Handle, HyperbolaShape, Level, MIN_ARC_LENGTH, MovableShape, ParabolaShape, PlayerPiece,
+  SegmentShape,
 } from "../levels/types";
 import { ellipseAxis, ellipseCenter, ellipseParam, ellipsePoint, shapeFoci } from "../levels/shape";
 import { arcFromParams, arcLengthBetween, arcParams, paramAtLength, perimeter } from "../levels/arc";
 
@@ -16,8 +17,15 @@ export interface HandleRef { piece: number; id: Handle }
 const hyperbolaVertex = (s: HyperbolaShape): Vec2 =>
   add(scale(add(s.f1, s.f2), 0.5), scale(norm(sub(s.f2, s.f1)), s.branch * s.a));
 
 export function handlePositions(state: MovableShape): { id: Handle; pos: Vec2 }[] {
+  if (state.kind === "odcinek") {
+    return [
+      { id: "koniec1", pos: state.from },
+      { id: "koniec2", pos: state.to },
+      { id: "srodek", pos: scale(add(state.from, state.to), 0.5) },
+    ];
+  }
   if (state.kind === "parabola") {
     return [{ id: "ognisko", pos: state.focus }, { id: "wierzcholek", pos: state.vertex }];
   }
   if (state.kind === "hiperbola") {
@@ -173,8 +181,36 @@ function dragParabola(s: ParabolaShape, handle: Handle, to: Vec2): ParabolaShape
   const vertex = dist(s.focus, to) < MIN_GAP ? add(s.focus, scale(os, -MIN_GAP)) : to;
   return { ...s, vertex };
 }
 
+/** Najkrótsze lustro-odcinek. Nie MIN_GAP: przy krótszym trzy uchwyty odcinka leżą bliżej
+ *  siebie niż promień łapania palcem, więc gracz nie umie złapać końca osobno od środka. */
+export const MIN_SEGMENT_LENGTH = 0.2;
+
+/** Koniec odcinka odsunięty od drugiego końca na co najmniej MIN_SEGMENT_LENGTH. Gdy odsunięcie
+ *  wyprowadziłoby koniec poza planszę (drugi koniec przy brzegu), idzie w przeciwną stronę —
+ *  plansza ma bok 2, więc jedna z dwóch stron zawsze się mieści. */
+const keepLength = (moved: Vec2, other: Vec2, fallback: Vec2): Vec2 => {
+  const d = dist(moved, other);
+  if (d >= MIN_SEGMENT_LENGTH) return moved;
+  const dir = d < 1e-12 ? norm(fallback) : norm(sub(moved, other));
+  const there = add(other, scale(dir, MIN_SEGMENT_LENGTH));
+  return inBoard(there) ? there : add(other, scale(dir, -MIN_SEGMENT_LENGTH));
+};
+
+/** Odcinek: końce idą za palcem (z minimalną długością), środek przesuwa cały odcinek bez
+ *  obrotu — o tyle, o ile oba końce zostają w planszy. */
+function dragSegment(s: SegmentShape, handle: Handle, to: Vec2): SegmentShape {
+  if (handle === "koniec1") return { ...s, from: keepLength(to, s.to, sub(s.from, s.to)) };
+  if (handle === "koniec2") return { ...s, to: keepLength(to, s.from, sub(s.to, s.from)) };
+  if (handle !== "srodek") return s;
+  const d = sub(to, scale(add(s.from, s.to), 0.5));
+  const dx = clamp(d.x, BOARD_MIN - Math.min(s.from.x, s.to.x), BOARD_MAX - Math.max(s.from.x, s.to.x));
+  const dy = clamp(d.y, BOARD_MIN - Math.min(s.from.y, s.to.y), BOARD_MAX - Math.max(s.from.y, s.to.y));
+  const delta = { x: dx, y: dy };
+  return { ...s, from: add(s.from, delta), to: add(s.to, delta) };
+}
+
 /** Gdy przeciągane ognisko usiądzie na drugim, c → 0 i żadne a nie mieści się w (0, c) —
  *  `fit` poniżej wtedy nie ma z czego wybrać. Tak jak parabola broni się przed ogniskiem
  *  w wierzchołku, odsuwamy przeciągane ognisko o MIN_FOCUS_GAP od drugiego, zamiast
  *  pozwolić im się zlać w jeden punkt. */
@@ -253,8 +289,9 @@ export function applyDrag(
   // (odległość do celu liczona od przyciętego punktu, nie od palca, bywałaby większa
   // niż promień). Cele przyskakiwania (ogniska poziomu) same leżą w planszy, więc
   // wynik przyskoku i tak przechodzi przez przycięcie bez zmiany.
   const clamped = clampToBoard(to);
+  if (state.kind === "odcinek") return dragSegment(state, handle, clamped);
   if (state.kind === "parabola") return dragParabola(state, handle, clamped);
   if (state.kind === "hiperbola") return dragHyperbola(state, handle, clamped, lockedA);
   if (handle === "poczatek" || handle === "koniec") {
     // kąt palca w układzie elipsy → parametr: uchwyt ślizga się po krzywej, nie schodzi z niej.
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

Uruchom: `npx tsc --noEmit` — czysto. `npx vitest run` — wszystko zielone, 548 testów.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/types.ts src/levels/shape.ts src/ui/handles.ts tests/ui/handles.test.ts tests/levels.test.ts
git commit -m "feat(uchwyty): lustro-odcinek jako element gracza" -m "Trzy uchwyty: dwa konce i srodek. Minimalna dlugosc 0.2, zeby uchwyty dalo sie zlapac osobno; srodek przesuwa bez obrotu i nie wyprowadza koncow poza plansze." -m "<trailer ze zlecenia>"
```

---

## Zadanie 2: Zapis postępu po identyfikatorze poziomu

Dziś `Progress.last` to INDEKS ostatnio granego poziomu. Zadania 3 i 4 przesuwają i zamieniają poziomy, więc powracający gracz trafiłby na inny poziom. To zadanie idzie PRZED nimi: zapis trzyma `lastId`, a stary zapis z liczbowym `last` jest przeliczany przez zamrożoną listę 24 identyfikatorów w starej kolejności (`LEGACY_ORDER`). Przy okazji `loadProgress` traci rzutowanie `as Partial<Progress>` i trzy `!` — parsujemy `unknown` z zawężaniem `"pole" in p`.

**Pliki:**
- Zmiana: `src/ui/progress.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/ui/progress.test.ts`

**Interfejsy:**
- Produkuje: `interface Progress { solved: string[]; lastId: string | null }`; `export const LEGACY_ORDER: readonly string[]` (24 identyfikatory, stara kolejność); `loadProgress(store: Store | null, ids: readonly string[]): Progress` — **drugi argument zmienia się z liczby poziomów na listę identyfikatorów**; `saveProgress` i `markSolved` bez zmian sygnatur.
- `src/ui/screens.ts` liczy `levelIndex` z `lastId` (`findIndex`, brak → 0) i w `goTo` zapisuje `lastId`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**

Zmień `tests/ui/progress.test.ts` zgodnie z diffem poniżej (wynikowy plik ma 10 testów).

Zmiana w `tests/ui/progress.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,6 +1,7 @@
 import { describe, it, expect } from "vitest";
-import { loadProgress, markSolved, saveProgress, Store } from "../../src/ui/progress";
+import { LEGACY_ORDER, loadProgress, markSolved, saveProgress, Store } from "../../src/ui/progress";
+import { LEVELS } from "../../src/levels";
 
 const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
   const data = { ...init };
   return {
@@ -14,44 +15,65 @@ const broken: Store = {
   getItem: () => { throw new Error("SecurityError"); },
   setItem: () => { throw new Error("QuotaExceededError"); },
 };
 
+const KEY = "golf-geometryczny/postep";
+const IDS = LEVELS.map((l) => l.id);
+
 describe("postęp", () => {
   it("bez zapisu zaczyna od pierwszego poziomu i niczego zaliczonego", () => {
-    expect(loadProgress(memory(), 8)).toEqual({ solved: [], last: 0 });
+    expect(loadProgress(memory(), IDS)).toEqual({ solved: [], lastId: null });
   });
 
   it("zapisany postęp wraca po ponownym wczytaniu", () => {
     const s = memory();
-    saveProgress(s, { solved: ["ogniska", "skos"], last: 3 });
-    expect(loadProgress(s, 8)).toEqual({ solved: ["ogniska", "skos"], last: 3 });
+    saveProgress(s, { solved: ["ogniska", "skos"], lastId: "skos" });
+    expect(loadProgress(s, IDS)).toEqual({ solved: ["ogniska", "skos"], lastId: "skos" });
   });
 
   it("brak pamięci przeglądarki nie wywraca gry", () => {
-    expect(loadProgress(null, 8)).toEqual({ solved: [], last: 0 });
-    expect(() => saveProgress(null, { solved: [], last: 0 })).not.toThrow();
+    expect(loadProgress(null, IDS)).toEqual({ solved: [], lastId: null });
+    expect(() => saveProgress(null, { solved: [], lastId: null })).not.toThrow();
   });
 
   it("pamięć rzucająca wyjątkami nie wywraca gry", () => {
-    expect(loadProgress(broken, 8)).toEqual({ solved: [], last: 0 });
-    expect(() => saveProgress(broken, { solved: ["x"], last: 1 })).not.toThrow();
+    expect(loadProgress(broken, IDS)).toEqual({ solved: [], lastId: null });
+    expect(() => saveProgress(broken, { solved: ["x"], lastId: "x" })).not.toThrow();
   });
 
   it("uszkodzony zapis daje stan domyślny", () => {
-    for (const raw of ["{", "null", "42", '{"solved":"x","last":"y"}', '{"solved":[1,2],"last":1}']) {
-      const p = loadProgress(memory({ "golf-geometryczny/postep": raw }), 8);
+    for (const raw of ["{", "null", "42", '"x"', '{"solved":"x","lastId":7}', '{"solved":[1,2],"last":"y"}']) {
+      const p = loadProgress(memory({ [KEY]: raw }), IDS);
       expect(p.solved.every((s) => typeof s === "string"), raw).toBe(true);
-      expect(Number.isInteger(p.last) && p.last >= 0 && p.last < 8, raw).toBe(true);
+      expect(p.lastId === null || IDS.includes(p.lastId), raw).toBe(true);
     }
   });
 
-  it("ostatni poziom spoza zakresu (np. po usunięciu poziomów) wraca do pierwszego", () => {
-    const s = memory();
-    saveProgress(s, { solved: [], last: 11 });
-    expect(loadProgress(s, 8).last).toBe(0);
+  it("ostatni poziom, którego już nie ma, daje brak zapisu ostatniego poziomu", () => {
+    expect(loadProgress(memory({ [KEY]: '{"solved":[],"lastId":"usuniety"}' }), IDS).lastId).toBeNull();
+  });
+
+  // Stary zapis (przed etapem 0) trzymał INDEKS w kolejności 24 poziomów. Indeks 20 to był
+  // poziom 21 „wspolne-ognisko" — po dodaniu etapu 0 i zamianie z „druga-strona" stoi on
+  // pod innym numerem, a gracz ma wrócić dokładnie do niego, nie do poziomu 21 nowej listy.
+  it("stary zapis z indeksem przelicza się na ten sam poziom, nie na ten sam numer", () => {
+    const p = loadProgress(memory({ [KEY]: '{"solved":["ogniska"],"last":20}' }), IDS);
+    expect(p).toEqual({ solved: ["ogniska"], lastId: "wspolne-ognisko" });
+  });
+
+  it("stary indeks spoza starej listy daje brak zapisu ostatniego poziomu", () => {
+    for (const last of [-1, 24, 2.5]) {
+      expect(loadProgress(memory({ [KEY]: JSON.stringify({ solved: [], last }) }), IDS).lastId, String(last)).toBeNull();
+    }
+  });
+
+  it("stara kolejność to 24 różne identyfikatory, wszystkie wciąż w grze", () => {
+    expect(LEGACY_ORDER).toHaveLength(24);
+    expect(new Set(LEGACY_ORDER).size).toBe(24);
+    for (const id of LEGACY_ORDER) expect(IDS, id).toContain(id);
   });
 
   it("zaliczenie dopisuje poziom raz, bez duplikatów", () => {
-    const p = markSolved(markSolved({ solved: [], last: 0 }, "skos"), "skos");
+    const p = markSolved(markSolved({ solved: [], lastId: null }, "skos"), "skos");
     expect(p.solved).toEqual(["skos"]);
   });
 });
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/progress.test.ts`
Oczekiwane: NIE przechodzi — `LEGACY_ORDER` jest `undefined`, wynik `loadProgress` ma pole `last`, nie `lastId`.

- [ ] **Krok 3: Implementacja**

Wprowadź zmiany z diffów poniżej: `src/ui/progress.ts` zmienia się prawie w całości (`LEGACY_ORDER` przepisz dosłownie — to zapis historii), `src/ui/screens.ts` w dwóch miejscach.

Zmiana w `src/ui/progress.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -6,29 +6,53 @@ export interface Store {
 
 export interface Progress {
   /** identyfikatory zaliczonych poziomów */
   solved: string[];
-  /** indeks ostatnio granego poziomu */
-  last: number;
+  /** identyfikator ostatnio granego poziomu; `null` — brak zapisu albo poziom, którego już nie ma */
+  lastId: string | null;
 }
 
 const KEY = "golf-geometryczny/postep";
-const EMPTY: Progress = { solved: [], last: 0 };
+const EMPTY: Progress = { solved: [], lastId: null };
+
+/** Kolejność 24 poziomów sprzed etapu 0. Stary zapis trzymał w polu `last` INDEKS w tej
+ *  kolejności, a etap 0 przesunął wszystkie poziomy (i zamienił miejscami „druga-strona"
+ *  z „wspolne-ognisko"), więc stary indeks przeliczamy przez tę listę na identyfikator.
+ *  To zapis historii, nie bieżąca kolejność — nie zmieniać razem z `LEVELS`. */
+export const LEGACY_ORDER: readonly string[] = [
+  "ogniska", "rozmiar", "skos", "blisko", "ciasna", "przeszkoda", "dwie-przeszkody", "zwienczenie",
+  "polelipsa", "bandy", "przycinanie", "wspologniskowe", "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
+  "ognisko-paraboli", "parabola-rozmiar", "obrot-osi", "teleskop", "wspolne-ognisko", "druga-strona", "ktora-galaz",
+  "zwienczenie-3",
+];
 
 /** Pamięć przeglądarki bywa niedostępna (tryb prywatny, zablokowane dane witryny)
  *  i wtedy sam dostęp do `localStorage` rzuca wyjątek. Gra ma działać dalej, tylko bez pamięci. */
 export function browserStore(): Store | null {
   try { return window.localStorage; } catch { return null; }
 }
 
-export function loadProgress(store: Store | null, levelCount: number): Progress {
+/** Ostatni poziom z zapisu: nowy zapis ma `lastId`, stary — indeks `last` w `LEGACY_ORDER`.
+ *  Identyfikator, którego nie ma w `ids` (poziom usunięty), daje `null`. */
+function lastIdFrom(p: object, ids: readonly string[]): string | null {
+  const lastId = "lastId" in p ? p.lastId : undefined;
+  if (typeof lastId === "string") return ids.includes(lastId) ? lastId : null;
+  const last = "last" in p ? p.last : undefined;
+  if (typeof last !== "number" || !Number.isInteger(last) || last < 0 || last >= LEGACY_ORDER.length) return null;
+  const id = LEGACY_ORDER[last];
+  return ids.includes(id) ? id : null;
+}
+
+/** `ids` — identyfikatory poziomów w grze; zapis wskazujący poziom spoza nich jest pomijany. */
+export function loadProgress(store: Store | null, ids: readonly string[]): Progress {
   try {
     const raw = store?.getItem(KEY);
     if (raw == null) return EMPTY;
-    const p = JSON.parse(raw) as Partial<Progress> | null;
-    const solved = Array.isArray(p?.solved) ? p.solved.filter((s) => typeof s === "string") : [];
-    const last = Number.isInteger(p?.last) && p!.last! >= 0 && p!.last! < levelCount ? p!.last! : 0;
-    return { solved, last };
+    const p: unknown = JSON.parse(raw);
+    if (typeof p !== "object" || p === null) return EMPTY;
+    const solvedRaw = "solved" in p ? p.solved : undefined;
+    const solved = Array.isArray(solvedRaw) ? solvedRaw.filter((s): s is string => typeof s === "string") : [];
+    return { solved, lastId: lastIdFrom(p, ids) };
   } catch {
     return EMPTY;
   }
 }
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -20,10 +20,11 @@ const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy
 
 export function mount(canvas: HTMLCanvasElement): void {
   const ctx = canvas.getContext("2d")!;
   const store = browserStore();
-  let progress = loadProgress(store, LEVELS.length);
-  let levelIndex = progress.last;
+  let progress = loadProgress(store, LEVELS.map((l) => l.id));
+  // brak zapisu (albo poziom, którego już nie ma) → -1 → pierwszy poziom
+  let levelIndex = Math.max(0, LEVELS.findIndex((l) => l.id === progress.lastId));
   let game: GameState = newGame(LEVELS[levelIndex]);
   let menuOpen = false;
   let settings = loadSettings(store);
   let settingsOpen = false;
@@ -60,9 +61,9 @@ export function mount(canvas: HTMLCanvasElement): void {
 
   function goTo(index: number): void {
     levelIndex = index;
     game = newGame(LEVELS[index]);
-    progress = { ...progress, last: index };
+    progress = { ...progress, lastId: LEVELS[index].id };
     saveProgress(store, progress);
   }
 
   function toggleMenu(): void {
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 551 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/progress.ts src/ui/screens.ts tests/ui/progress.test.ts
git commit -m "feat(postep): ostatni poziom zapisany po identyfikatorze" -m "Stary zapis z indeksem przeliczany przez zamrozona liste 24 poziomow w starej kolejnosci. Bez rzutowan i ! przy wczytywaniu." -m "<trailer ze zlecenia>"
```

---

## Zadanie 3: Etap 0 — trzy poziomy bilardowe

Nowy plik `src/levels/stage0.ts` z poziomami `odbicie`, `dwa-odbicia`, `za-rogiem` (jedna piłka, wachlarz szerokości 0, dołek 1.5 · `HOLE_RADIUS`) na początku `LEVELS`. Testy poziomów dostają reguły jednopiłkowe: jedna piłka ⇔ wachlarz zerowej szerokości; test parzystej liczby piłek obejmuje tylko poziomy bez wachlarza (spec §1.4); kryterium dla odcinka to obrót ±3° wokół środka. `tests/ui/game.test.ts` wybiera poziomy po identyfikatorze — dotąd brał `LEVELS[0]` i `LEVELS[1]`, które teraz są poziomami bilardowymi. Podgląd strzela `min(2, balls)` piłkami, baner po dowodzie mówi w liczbie pojedynczej przy jednej piłce (`resultBanner` w `menu.ts`).

Współrzędne poziomów są wynikiem kalibracji (tabela na górze planu) — nie zaokrąglaj ich dalej.

**Pliki:**
- Zmiana: `src/levels/index.ts`
- Nowy: `src/levels/stage0.ts`
- Zmiana: `src/ui/game.ts`
- Zmiana: `src/ui/menu.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/levels.test.ts`
- Zmiana: `tests/ui/game.test.ts`
- Zmiana: `tests/ui/menu.test.ts`

**Interfejsy:**
- Konsumuje: z zadania 1 — `segment`, ruchomy `SegmentShape`, `handlePositions` odcinka.
- Produkuje: `STAGE_0: Level[]` (`src/levels/stage0.ts`); `LEVELS = [...STAGE_0, ...STAGE_1, ...STAGE_2, ...STAGE_3]` (27 poziomów); `resultBanner(total: number, missed: number): { title: string; note: string }` w `src/ui/menu.ts`; `preview` w `src/ui/game.ts` strzela `Math.min(2, level.test.balls)` piłkami.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Zmiana w `tests/levels.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -2,9 +2,10 @@ import { describe, it, expect } from "vitest";
 import { Vec2, add, dist, fromAngle, len, norm, scale, sub, vec } from "../src/core/vec";
 import { rayPiece } from "../src/core/piece";
 import { runProof } from "../src/core/verify";
 import {
-  DIAGONAL, Handle, HyperbolaShape, Level, LEVELS, MIN_ARC_LENGTH, MovableShape, SNAP_RADIUS, Shape, Span, levelCurves,
+  DIAGONAL, Handle, HyperbolaShape, Level, LEVELS, MIN_ARC_LENGTH, MovableShape, SNAP_RADIUS, SegmentShape, Shape, Span,
+  levelCurves,
   perimeter, shapeAxisAngle, shapeConic, shapeFoci, shapeToPiece,
 } from "../src/levels";
 import { piecePolyline, twinPolyline } from "../src/render/shapes";
 import { applyDrag, handlePositions, lockedSize } from "../src/ui/handles";
@@ -40,18 +41,24 @@ const STAGE_1_IDS = [
 ];
 
 describe("poziomy", () => {
   it("liczba poziomów i unikalne identyfikatory", () => {
-    expect(LEVELS).toHaveLength(24);
+    expect(LEVELS).toHaveLength(27);
     expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
   });
 
+  it("etap 0 otwiera grę: trzy poziomy bilardowe", () => {
+    expect(LEVELS.slice(0, 3).map((l) => l.id)).toEqual(["odbicie", "dwa-odbicia", "za-rogiem"]);
+  });
+
+  // numery się przesunęły o etap 0, ale identyfikatory i ich wzajemna kolejność zostały —
+  // zapis postępu trzyma identyfikatory (`progress.ts`, `LEGACY_ORDER`)
   it("identyfikatory etapu 1 zostały, w tej samej kolejności — zapisany postęp przetrwa", () => {
-    expect(LEVELS.slice(0, 8).map((l) => l.id)).toEqual(STAGE_1_IDS);
+    expect(LEVELS.slice(3, 11).map((l) => l.id)).toEqual(STAGE_1_IDS);
   });
 
   it("identyfikatory etapu 2 zostały, w tej samej kolejności", () => {
-    expect(LEVELS.slice(8, 16).map((l) => l.id)).toEqual([
+    expect(LEVELS.slice(11, 19).map((l) => l.id)).toEqual([
       "polelipsa", "bandy", "przycinanie", "wspologniskowe",
       "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
     ]);
   });
@@ -67,10 +74,20 @@ describe("poziomy", () => {
   // gdzie wcześniej i+count/2) — wynik dowodu się nie zmienia. Przy NIEPARZYSTYM count
   // byłby to naprawdę inny zestaw kierunków. Niezmiennik pilnowany tu, nie w rdzeniu:
   // nieparzyste count jest świadomie dopuszczone przez specyfikację etapu 1 (jedna piłka
   // celowo na osi), więc `launchAngles`/`runProof` nie mają prawa tego zabraniać.
-  it("każdy poziom ma PARZYSTĄ liczbę piłek — inaczej kierunek osi przestaje być obojętny", () => {
-    for (const l of LEVELS) expect(l.test.balls % 2).toBe(0);
+  // Dotyczy tylko dowodu na 360° — z wachlarzem kierunki liczy `sector`, nie oś, więc
+  // obrót bazy o π niczego nie zmienia (i poziomy jednopiłkowe mogą istnieć).
+  it("każdy poziom bez wachlarza ma PARZYSTĄ liczbę piłek — inaczej kierunek osi przestaje być obojętny", () => {
+    for (const l of LEVELS.filter((x) => x.sector === undefined)) expect(l.test.balls % 2, l.id).toBe(0);
+  });
+
+  // Jedna piłka ma sens tylko z wachlarzem zerowej szerokości (jeden znany kierunek strzału);
+  // i odwrotnie — wachlarz zerowej szerokości przy wielu piłkach puściłby je wszystkie jednym torem.
+  it("poziom jednopiłkowy ma wachlarz zerowej szerokości — i tylko on", () => {
+    for (const l of LEVELS) {
+      expect(l.test.balls === 1, l.id).toBe(l.sector !== undefined && l.sector.width === 0);
+    }
   });
 
   // Hiperbola poziomu bywa przeszkodą (odbija piłkę, poziom 21) ALBO elementem gracza
   // (poziom 22: gracz rusza samą hiperbolą) — test musi znaleźć ją w obu miejscach,
@@ -122,9 +139,10 @@ describe("poziomy", () => {
         }
       }
     }
     if (level.sector !== undefined) {
-      expect(level.sector.width).toBeGreaterThan(0);
+      // zero tylko przy jednej piłce — pilnuje osobny test wyżej
+      expect(level.sector.width).toBeGreaterThanOrEqual(0);
       expect(level.sector.width).toBeLessThanOrEqual(2 * Math.PI);
     }
   });
 
@@ -155,8 +173,14 @@ describe("poziomy", () => {
         // rysowanie drugiej gałęzi to też dana poziomu, nie stan gracza
         expect(sol.twin).toBe(start.twin);
         continue;
       }
+      if (start.kind === "odcinek" && sol.kind === "odcinek") {
+        if (locked.includes("koniec1")) expect(sol.from).toEqual(start.from);
+        if (locked.includes("koniec2")) expect(sol.to).toEqual(start.to);
+        if (locked.includes("srodek")) expect(scale(add(sol.from, sol.to), 0.5)).toEqual(scale(add(start.from, start.to), 0.5));
+        continue;
+      }
       // tu zostaje elipsa: rodzaje startu i rozwiązania są równe, sprawdzone wyżej
       if (start.kind !== "elipsa" || sol.kind !== "elipsa") continue;
       if (locked.includes("rozmiar")) expect(start.a).toBe(sol.a);
       if (locked.includes("ognisko1")) expect(sol.f1).toEqual(start.f1);
@@ -281,8 +305,32 @@ describe("poziomy", () => {
       }
     });
   });
 
+  // Kryterium 5% nie pasuje do odcinka: przesunięcie środka wzdłuż własnej prostej lustra
+  // niczego nie zmienia, dopóki piłka w lustro trafia. Odpowiednik dla lustra płaskiego to
+  // obrót — o ±3° wokół środka musi dać pudło (spec wprowadzeń §1.4).
+  const rotate = (s: SegmentShape, deg: number): SegmentShape => {
+    const c = scale(add(s.from, s.to), 0.5);
+    const t = (deg * Math.PI) / 180;
+    const turn = (p: Vec2) => {
+      const d = sub(p, c);
+      return add(c, vec(d.x * Math.cos(t) - d.y * Math.sin(t), d.x * Math.sin(t) + d.y * Math.cos(t)));
+    };
+    return { ...s, from: turn(s.from), to: turn(s.to) };
+  };
+
+  it.each(byId)("poziom %s: każde lustro-odcinek obrócone o ±3° odpada", (_id, level) => {
+    level.pieces.forEach((piece, k) => {
+      const sol = piece.solution;
+      if (sol.kind !== "odcinek") return;
+      for (const deg of [-3, 3]) {
+        const moved = solutions(level).map((s, j) => (j === k ? rotate(sol, deg) : s));
+        expect(solves(level, moved), `element ${k}, ${deg}°`).toBe(false);
+      }
+    });
+  });
+
   // Skracamy o 0.02 z każdej strony — dawny 1° parametru na elipsie a ≈ 1 to ok. 0.017.
   // Elipsa: tylko jeśli ma łuk (`arc`). Parabola/hiperbola: `span` jest OBOWIĄZKOWY
   // (parabola jest nieograniczona), więc kawałek zawsze się skraca — wariant `length`
   // wprost o 2d, wariant `span` też o 2d, ale w innej walucie: dla paraboli parametr
```

Zmiana w `tests/ui/game.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -3,9 +3,16 @@ import { vec } from "../../src/core/vec";
 import { LEVELS, Level, parabola, HOLE_RADIUS } from "../../src/levels";
 import { pathLength } from "../../src/render/trails";
 import { advance, newGame, preview, retry, startProof, BALL_SPEED } from "../../src/ui/game";
 
-const level = LEVELS[0];
+/** Poziom po identyfikatorze — numery przesuwa każdy nowy etap (etap 0 dodał trzy na początku). */
+const byId = (id: string): Level => {
+  const l = LEVELS.find((x) => x.id === id);
+  if (l === undefined) throw new Error(`brak poziomu ${id}`);
+  return l;
+};
+
+const level = byId("ogniska");
 
 describe("stan gry", () => {
   it("nowa gra startuje w edycji, ze stanem początkowym poziomu", () => {
     const g = newGame(level);
@@ -17,8 +24,12 @@ describe("stan gry", () => {
   it("podgląd używa dwóch piłek, nie ośmiu", () => {
     expect(preview(newGame(level)).balls).toHaveLength(2);
   });
 
+  it("podgląd na poziomie jednopiłkowym ma jedną piłkę, nie dwie tym samym torem", () => {
+    expect(preview(newGame(byId("odbicie"))).balls).toHaveLength(1);
+  });
+
   it("uruchomienie dowodu daje osiem piłek i fazę dowodu", () => {
     const g = startProof({ ...newGame(level), pieces: [level.pieces[0].solution] });
     expect(g.phase).toBe("dowod");
     expect(g.proof?.balls).toHaveLength(8);
@@ -43,9 +54,9 @@ describe("stan gry", () => {
     // Dlatego mierzymy przy DWÓCH różnych długościach toru: poziom "rozmiar" rozwiązuje
     // każde `a`, więc a=0.75 daje tor 1.5, a a=1.0 daje 2.0. Jeśli faza zmienia się
     // dokładnie po `długość / BALL_SPEED` w obu przypadkach, stała prędkości jest ta sama
     // na obu dystansach — czyli odwzorowanie jest wprost proporcjonalne, a nie wygładzone.
-    const free = LEVELS[1];
+    const free = byId("rozmiar");
     for (const a of [0.75, 1.0]) {
       const resized = { ...free.pieces[0].solution, a };
       let g = startProof({ ...newGame(free), pieces: [resized] });
       expect(g.proof!.solved, `a=${a}`).toBe(true);
@@ -76,9 +87,9 @@ describe("stan gry", () => {
       expect(newGame(two).pieces).toEqual(two.pieces.map((p) => p.start));
     });
 
     it("podgląd na poziomie z wachlarzem strzela w wachlarz", () => {
-      const fan = LEVELS.find((l) => l.sector !== undefined)!;
+      const fan = byId("polelipsa");
       const { center, width } = fan.sector!;
       for (const b of preview(newGame(fan)).balls) {
         const t = Math.atan2(b.path[1].y - b.path[0].y, b.path[1].x - b.path[0].x);
         const off = Math.atan2(Math.sin(t - center), Math.cos(t - center));
@@ -97,9 +108,9 @@ describe("stan gry", () => {
   });
 });
 
 describe("jeszcze raz", () => {
-  const lvl = LEVELS[1];
+  const lvl = byId("rozmiar");
   // ustawienie gracza inne niż start i inne niż zapisane rozwiązanie
   const mine = { ...lvl.pieces[0].solution, a: 0.9 };
 
   const finish = (g: ReturnType<typeof newGame>) => {
```

Zmiana w `tests/ui/menu.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -2,9 +2,9 @@ import { describe, it, expect } from "vitest";
 import { readFileSync } from "node:fs";
 import { vec } from "../../src/core/vec";
 import {
   ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, editAction, hitRect, hitTile, inActionBand, menuLayout, playArea,
-  settingsButton, settingsLayout, winAction, winLabels,
+  resultBanner, settingsButton, settingsLayout, winAction, winLabels,
 } from "../../src/ui/menu";
 import { makeCamera } from "../../src/render/camera";
 import { LEVELS } from "../../src/levels";
 
@@ -198,4 +198,16 @@ describe("tekst ekranu wygranej", () => {
     const src = readFileSync("src/ui/screens.ts", "utf8");
     expect(src.includes("Osiem torów")).toBe(false);
   });
 });
+
+describe("napisy po dowodzie", () => {
+  it("wiele piłek: liczba mnoga i licznik chybionych", () => {
+    expect(resultBanner(8, 0).title).toBe("Wpadły wszystkie");
+    expect(resultBanner(8, 3)).toEqual({ title: "Nie wszystkie", note: "Chybiło 3 z 8. Zobacz, którędy." });
+  });
+
+  it("jedna piłka: liczba pojedyncza, bez „1 z 1\"", () => {
+    expect(resultBanner(1, 0).title).toBe("Wpadła");
+    expect(resultBanner(1, 1)).toEqual({ title: "Chybiła", note: "Zobacz, którędy poleciała." });
+  });
+});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/levels.test.ts tests/ui/game.test.ts tests/ui/menu.test.ts`
Oczekiwane: NIE przechodzą — „liczba poziomów" (24 zamiast 27), „etap 0 otwiera grę", przesunięte wycinki etapów 1–2, `byId("odbicie")` rzuca „brak poziomu odbicie", `resultBanner` nie jest funkcją.

- [ ] **Krok 3: Implementacja**


Zmiana w `src/levels/index.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,7 +1,8 @@
 import { vec } from "../core/vec";
 import { HOLE_RADIUS, Level } from "./types";
 import { circle, ellipse } from "./shape";
+import { STAGE_0 } from "./stage0";
 import { STAGE_2 } from "./stage2";
 import { STAGE_3 } from "./stage3";
 
 export * from "./types";
@@ -117,5 +118,5 @@ const STAGE_1: Level[] = [
     test: t,
   },
 ];
 
-export const LEVELS: Level[] = [...STAGE_1, ...STAGE_2, ...STAGE_3];
+export const LEVELS: Level[] = [...STAGE_0, ...STAGE_1, ...STAGE_2, ...STAGE_3];
```

Nowy plik `src/levels/stage0.ts` — cała zawartość:

```ts
import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { segment } from "./shape";

/** Etap 0 — bilard. Płaskie lustro nie skupia wachlarza (odbity wachlarz rozchodzi się
 *  dalej, jakby wylatywał z odbicia piłki w lustrze), więc tu leci JEDNA piłka w jednym,
 *  znanym kierunku: `balls: 1` i wachlarz o szerokości 0. Dołek półtora raza większy niż
 *  w reszcie gry — to wstęp. Kryterium dokładności dla odcinka: obrót lustra o ±3° wokół
 *  środka daje pudło (patrz `tests/levels.test.ts`); 3° obraca odbitą piłkę o 6°, a przy
 *  drodze do dołka ≥ 1 to ponad 0.1 bokiem, więcej niż promień dołka (≈ 0.085). */
const t0 = (maxBounces: number) => ({ balls: 1, maxBounces, holeRadius: 1.5 * HOLE_RADIUS });
const W_GORE = { center: Math.PI / 2, width: 0 };

export const STAGE_0: Level[] = [
  {
    // Piłka leci pionowo w górę, dołek leży obok niej. Lustro nad piłką, nachylone tak,
    // żeby odbicie szło po skosie w dół — rozwiązań jest cała rodzina (każda wysokość ma
    // swój kąt); zapisane trafia w (−0.5, 0.3) i odsyła piłkę pod 45°.
    id: "odbicie", title: "Odbicie",
    hint: "Postaw lustro nad piłką i obróć je tak, żeby odbiła się prosto do dołka.",
    ball: vec(-0.5, -0.5), hole: vec(0.3, -0.5),
    pieces: [{
      start: segment(vec(0, 0.5), vec(0.4, 0.5)),
      solution: segment(vec(-0.73097, 0.20433), vec(-0.26903, 0.39567)),
      locked: [],
    }],
    obstacles: [],
    sector: W_GORE,
    test: t0(2),
  },
  {
    // Najpierw stała banda (pod 45°, w (0.6, 0.4)) zawraca piłkę w lewo, poziomo po y = 0.4;
    // lustro gracza na tej prostej kieruje ją w dół, do dołka pod spodem.
    id: "dwa-odbicia", title: "Dwa odbicia",
    hint: "Piłka odbije się najpierw od bandy. Złap ją lustrem i skieruj do dołka.",
    ball: vec(0.6, -0.6), hole: vec(-0.5, -0.6),
    pieces: [{
      start: segment(vec(-0.6, -0.1), vec(-0.2, -0.1)),
      solution: segment(vec(-0.65, 0.25), vec(-0.35, 0.55)),
      locked: [],
    }],
    obstacles: [segment(vec(0.45, 0.55), vec(0.75, 0.25))],
    sector: W_GORE,
    test: t0(3),
  },
  {
    // Ściana od dołu planszy do y = −0.1 zasłania prostą drogę. Lustro postawione za nisko
    // posyła piłkę w ścianę; dopiero wyżej (zapisane: trafienie w (−0.6, 0.8), tor przecina
    // x = 0 na y ≈ 0.1) piłka przechodzi nad nią.
    id: "za-rogiem", title: "Za rogiem",
    hint: "Ściana zasłania dołek. Lustro musi posłać piłkę ponad nią.",
    ball: vec(-0.6, -0.6), hole: vec(0.6, -0.6),
    pieces: [{
      start: segment(vec(-0.4, 0.1), vec(0, 0.1)),
      solution: segment(vec(-0.78758, 0.73061), vec(-0.41242, 0.86939)),
      locked: [],
    }],
    obstacles: [segment(vec(0, -1), vec(0, -0.1))],
    sector: W_GORE,
    test: t0(2),
  },
];
```

Zmiana w `src/ui/game.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -32,9 +32,10 @@ const proofFor = (state: GameState, count: number): Proof =>
     sector: state.level.sector,
     count,
   });
 
-export const preview = (state: GameState): Proof => proofFor(state, 2);
+/** Podgląd: dwie piłki — chyba że poziom ma jedną (bilard), wtedy dwie byłyby tym samym torem. */
+export const preview = (state: GameState): Proof => proofFor(state, Math.min(2, state.level.test.balls));
 
 export const startProof = (state: GameState): GameState => ({
   ...state, phase: "dowod", proof: proofFor(state, state.level.test.balls), elapsed: 0,
 });
```

Zmiana w `src/ui/menu.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -69,8 +69,15 @@ export function winLabels(isLast: boolean, allSolved: boolean): { right: string;
   if (!isLast) return { right: "Następny", note: null };
   return { right: "Menu", note: allSolved ? "Wszystkie poziomy ukończone." : "To był ostatni poziom." };
 }
 
+/** Napisy banera po dowodzie. Jedna piłka (bilard etapu 0) mówi w liczbie pojedynczej —
+ *  „Wpadły wszystkie" i „Chybiło 1 z 1" brzmiałyby jak błąd gry. */
+export function resultBanner(total: number, missed: number): { title: string; note: string } {
+  if (missed === 0) return { title: total === 1 ? "Wpadła" : "Wpadły wszystkie", note: "" };
+  if (total === 1) return { title: "Chybiła", note: "Zobacz, którędy poleciała." };
+  return { title: "Nie wszystkie", note: `Chybiło ${missed} z ${total}. Zobacz, którędy.` };
+}
 
 export function hitTile(tiles: Rect[], p: Vec2): number | null {
   const i = tiles.findIndex((t) => hitRect(t, p));
   return i < 0 ? null : i;
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -8,10 +8,10 @@ import { curveHints, twinPolyline } from "../render/shapes";
 import { positionAt, trailSegment } from "../render/trails";
 import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
 import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
 import {
-  MENU_BUTTON, editAction, hitRect, hitTile, inActionBand, menuLayout, playArea, settingsButton, settingsLayout,
-  winAction, winLabels,
+  MENU_BUTTON, editAction, hitRect, hitTile, inActionBand, menuLayout, playArea, resultBanner, settingsButton,
+  settingsLayout, winAction, winLabels,
 } from "./menu";
 import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
 import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";
 
@@ -302,12 +302,13 @@ export function mount(canvas: HTMLCanvasElement): void {
         }
         // pod tytułem tylko dopisek ostatniego poziomu; na pozostałych — nic
         const allSolved = LEVELS.every((l) => progress.solved.includes(l.id));
         const { right, note } = winLabels(isLast(), allSolved);
-        banner("Wpadły wszystkie", note ?? "", ["Jeszcze raz", right]);
+        banner(resultBanner(game.proof.balls.length, 0).title, note ?? "", ["Jeszcze raz", right]);
       } else if (game.phase === "porazka") {
         const missed = game.proof.balls.filter((b) => !b.holed).length;
-        banner("Nie wszystkie", `Chybiło ${missed} z ${game.proof.balls.length}. Zobacz, którędy.`, "Jeszcze raz");
+        const { title, note } = resultBanner(game.proof.balls.length, missed);
+        banner(title, note, "Jeszcze raz");
       }
     }
 
     if (menuOpen) drawMenu();
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 616 testów zielonych. Dodatkowo: `npx vite-node scripts/sprawdz-poziom.ts odbicie` (i dwa pozostałe) — rozwiązanie 1/1 wpadło, start 0/1.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/stage0.ts src/levels/index.ts src/ui/game.ts src/ui/menu.ts src/ui/screens.ts tests/levels.test.ts tests/ui/game.test.ts tests/ui/menu.test.ts
git commit -m "feat(poziomy): etap 0 - trzy poziomy bilardowe z lustrem-odcinkiem" -m "Jedna pilka, wachlarz szerokosci 0, wiekszy dolek. Kryterium dla odcinka: obrot o 3 stopnie daje pudlo. Podglad i baner po dowodzie znaja jedna pilke." -m "<trailer ze zlecenia>"
```

---

## Zadanie 4: „Druga strona" przed „Wspólnym ogniskiem" i numery w komentarzach

`druga-strona` (jeden uchwyt) wprowadza hiperbolę lepiej niż `wspolne-ognisko`, więc zamieniają się miejscami. Geometria i kalibracja obu poziomów bez zmian — zmieniają się komentarze i podpowiedzi, które opisywały kolejność. Numery poziomów w komentarzach `stage2.ts`, `stage3.ts` i `tests/levels.test.ts` stają się historyczne (notka na górze każdego pliku), nazwy testów podają identyfikatory, a cztery pojedyncze wzmianki w `handles.ts`, `screens.ts`, `menu.ts` i `render/shapes.ts` dostają identyfikator zamiast numeru.

**Pliki:**
- Zmiana: `src/levels/stage2.ts`
- Zmiana: `src/levels/stage3.ts`
- Zmiana: `src/render/shapes.ts`
- Zmiana: `src/ui/handles.ts`
- Zmiana: `src/ui/menu.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/levels.test.ts`
- Zmiana: `tests/ui/progress.test.ts`

**Interfejsy:**
- Konsumuje: `LEGACY_ORDER` z zadania 2 (test postępu dostaje asercję, że stary indeks 20 to teraz INNY numer niż dawniej).
- Produkuje: kolejność `STAGE_3`: `ognisko-paraboli, parabola-rozmiar, obrot-osi, teleskop, druga-strona, wspolne-ognisko, ktora-galaz, zwienczenie-3`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Zmiana w `tests/levels.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -35,8 +35,12 @@ const solves = (level: Level, pieces: MovableShape[]): boolean => {
 
 const solutions = (level: Level) => level.pieces.map((p) => p.solution);
 const byId = LEVELS.map((l) => [l.id, l] as const);
 
+// Numery poziomów w komentarzach tego pliku to numeracja z czasów, gdy powstawał dany test
+// (etapy 1–3: 1–24). W grze są o 3 większe — etap 0 dodał trzy poziomy na początku — a
+// „druga-strona" (stary 22) stoi teraz przed „wspolne-ognisko" (stary 21). Nazwy testów
+// podają identyfikatory.
 const STAGE_1_IDS = [
   "ogniska", "rozmiar", "skos", "blisko", "ciasna", "przeszkoda", "dwie-przeszkody", "zwienczenie",
 ];
 
@@ -55,8 +59,17 @@ describe("poziomy", () => {
   it("identyfikatory etapu 1 zostały, w tej samej kolejności — zapisany postęp przetrwa", () => {
     expect(LEVELS.slice(3, 11).map((l) => l.id)).toEqual(STAGE_1_IDS);
   });
 
+  // Jedyna zmiana kolejności od wydania: „druga-strona" (jeden uchwyt) wprowadza hiperbolę,
+  // więc stoi przed „wspolne-ognisko". Zapis postępu przelicza stare indeksy (`LEGACY_ORDER`).
+  it("etap 3: parabole, potem hiperbole od najprostszej", () => {
+    expect(LEVELS.slice(19, 27).map((l) => l.id)).toEqual([
+      "ognisko-paraboli", "parabola-rozmiar", "obrot-osi", "teleskop",
+      "druga-strona", "wspolne-ognisko", "ktora-galaz", "zwienczenie-3",
+    ]);
+  });
+
   it("identyfikatory etapu 2 zostały, w tej samej kolejności", () => {
     expect(LEVELS.slice(11, 19).map((l) => l.id)).toEqual([
       "polelipsa", "bandy", "przycinanie", "wspologniskowe",
       "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
@@ -366,13 +379,13 @@ describe("poziomy", () => {
     solutions(level).some((s) => shapeFoci(s).some((f) => !same(f, level.ball) && !same(f, level.hole)));
 
   // Poziomy 21–22 SĄ kaskadami: ich rozwiązania mają ognisko we wspólnym punkcie M,
   // poza piłką i dołkiem — stąd rozszerzenie tej sztywnej listy.
-  it("kaskady istnieją tam, gdzie powinny: 13, 14, 15, 16, 21, 22, 23, 24", () => {
+  it("kaskady istnieją tam, gdzie powinny: cztery z etapu 2 i cztery hiperboliczne z etapu 3", () => {
     expect(LEVELS.filter(isCascade).map((l) => l.id)).toEqual(
       [
         "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
-        "wspolne-ognisko", "druga-strona", "ktora-galaz", "zwienczenie-3",
+        "druga-strona", "wspolne-ognisko", "ktora-galaz", "zwienczenie-3",
       ],
     );
   });
 
@@ -424,9 +437,9 @@ describe("poziomy", () => {
     return l;
   };
 
   it.each(["start", "solution"] as const)(
-    "poziom 23 (%s): druga gałąź jest rysowana — cała na planszy, po drugiej stronie niż czynna",
+    "poziom ktora-galaz (%s): druga gałąź jest rysowana — cała na planszy, po drugiej stronie niż czynna",
     (ktory) => {
       const s = ktoraGalaz().pieces[0][ktory];
       if (s.kind !== "hiperbola") throw new Error("zły rodzaj");
       const druga = twinPolyline(s);
@@ -442,16 +455,16 @@ describe("poziomy", () => {
       }
     },
   );
 
-  it("druga gałąź jest rysowana tylko na poziomie 23 — na 21, 22 i 24 (i wszystkich innych) nie", () => {
+  it("druga gałąź jest rysowana tylko na poziomie ktora-galaz — na pozostałych hiperbolicznych (i wszystkich innych) nie", () => {
     const zDrugaGalezia = LEVELS.filter((l) =>
       [...l.pieces.flatMap((p) => [p.start, p.solution]), ...l.obstacles].some((s) => twinPolyline(s) !== undefined),
     ).map((l) => l.id);
     expect(zDrugaGalezia).toEqual(["ktora-galaz"]);
   });
 
-  it("poziom 23: flaga drugiej gałęzi przeżywa przeciąganie (applyDrag, każdy uchwyt)", () => {
+  it("poziom ktora-galaz: flaga drugiej gałęzi przeżywa przeciąganie (applyDrag, każdy uchwyt)", () => {
     const piece = ktoraGalaz().pieces[0];
     const cel = piece.solution.kind === "hiperbola" ? piece.solution.f2 : vec(0.4, 0.6);
     for (const h of handlePositions(piece.start)) {
       const moved = applyDrag(piece.start, h.id, cel, lockedSize(piece));
@@ -459,9 +472,9 @@ describe("poziomy", () => {
       expect(twinPolyline(moved), `uchwyt ${h.id}`).toBeDefined();
     }
   });
 
-  it("poziom 23: odbija tylko czynna gałąź — żadne odbicie rozwiązania nie leży na drugiej", () => {
+  it("poziom ktora-galaz: odbija tylko czynna gałąź — żadne odbicie rozwiązania nie leży na drugiej", () => {
     const l = ktoraGalaz();
     const s = l.pieces[0].solution;
     if (s.kind !== "hiperbola") throw new Error("zły rodzaj");
     const roznica = (p: Vec2) => dist(p, s.f1) - dist(p, s.f2);
@@ -483,9 +496,9 @@ describe("poziomy", () => {
   // odtwarza tor KAŻDEJ piłki rozwiązania i dla każdego odbicia ustala, od której
   // krzywej ono było (ta sama reguła co w `trace`: najbliższe trafienie wzdłuż odcinka).
   // Każdy element gracza i każda przeszkoda musi odbić co najmniej jedną piłkę, a ściany
   // żadnej — obie drogi mają działać na lustrach, nie na bandach.
-  it("poziom 24: każda krzywa (elementy gracza i przeszkody) odbija co najmniej jedną piłkę rozwiązania", () => {
+  it("poziom zwienczenie-3: każda krzywa (elementy gracza i przeszkody) odbija co najmniej jedną piłkę rozwiązania", () => {
     const l = LEVELS.find((x) => x.id === "zwienczenie-3");
     if (l === undefined) throw new Error("brak poziomu zwienczenie-3");
     const rodzaje = new Set([...solutions(l).map((s) => s.kind), ...l.obstacles.map((o) => o.kind)]);
     expect(rodzaje).toContain("elipsa");
@@ -535,9 +548,9 @@ describe("poziomy", () => {
   //
   // Druga liczba to liczba wolnych ognisk poziomu — test sprawdza, że przejrzał je wszystkie
   // (21: oba ogniska elipsy, 22–23: M, 24: ognisko paraboli A i dalsze ognisko hiperboli).
   const BEZ_SZAREJ_STREFY: [string, number][] = [
-    ["wspolne-ognisko", 2], ["druga-strona", 1], ["ktora-galaz", 1], ["zwienczenie-3", 2],
+    ["druga-strona", 1], ["wspolne-ognisko", 2], ["ktora-galaz", 1], ["zwienczenie-3", 2],
   ];
 
   /** Położenia wolnych ognisk poziomu w pierścieniu SNAP_RADIUS … rMax, które wygrywają. */
   const szaraStrefa = (level: Level, kierunki: number, promienie: number, rMax: number) => {
@@ -600,9 +613,9 @@ describe("poziomy", () => {
     bypass = applyDrag(bypass, "ognisko2", vec(-0.2, 1.7), lockedA);
     expect(solves(level, [bypass])).toBe(false);
   });
 
-  it("poziom 12: każdy rozmiar powyżej pasma przegrywa (duża elipsa nie omija okręgu)", () => {
+  it("poziom wspologniskowe: każdy rozmiar powyżej pasma przegrywa (duża elipsa nie omija okręgu)", () => {
     const level = LEVELS.find((l) => l.id === "wspologniskowe")!;
     const base = level.pieces[0].solution;
     for (let i = 0; i <= 119; i++) {
       const a = 0.62 + 0.02 * i;    // 0.62 … 3.0
```

Zmiana w `tests/ui/progress.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -57,8 +57,10 @@ describe("postęp", () => {
   // pod innym numerem, a gracz ma wrócić dokładnie do niego, nie do poziomu 21 nowej listy.
   it("stary zapis z indeksem przelicza się na ten sam poziom, nie na ten sam numer", () => {
     const p = loadProgress(memory({ [KEY]: '{"solved":["ogniska"],"last":20}' }), IDS);
     expect(p).toEqual({ solved: ["ogniska"], lastId: "wspolne-ognisko" });
+    // i to naprawdę jest inny numer niż dawniej — inaczej test nie dowodziłby przeliczenia
+    expect(LEVELS[20].id).not.toBe("wspolne-ognisko");
   });
 
   it("stary indeks spoza starej listy daje brak zapisu ostatniego poziomu", () => {
     for (const last of [-1, 24, 2.5]) {
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/levels.test.ts tests/ui/progress.test.ts`
Oczekiwane: NIE przechodzą dwa testy — „etap 3: parabole, potem hiperbole od najprostszej" i lista kaskad w nowej kolejności. Nowa asercja w teście postępu (`LEVELS[20].id` to nie `wspolne-ognisko`) przechodzi już teraz i ma przechodzić dalej — pilnuje, że przeliczenie starego indeksu nie jest przypadkiem tożsamościowe.

- [ ] **Krok 3: Implementacja**

Zamiana to przeniesienie CAŁEGO obiektu `druga-strona` (z komentarzem) przed obiekt `wspolne-ognisko` w tablicy `STAGE_3`, plus nowe teksty komentarzy i podpowiedzi z diffu. Długi komentarz o trzech warunkach układu zostaje przy `wspolne-ognisko`; `druga-strona` odsyła do niego.

Zmiana w `src/levels/stage2.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -3,8 +3,11 @@ import { EllipseShape, HOLE_RADIUS, Level } from "./types";
 import { arcEllipse, circle, ellipse, segment } from "./shape";
 
 const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };
 
+// Numery poziomów w komentarzach tego pliku to numeracja z czasów etapu 2 (9–16).
+// W grze są o 3 większe — etap 0 dodał trzy poziomy na początku. Szukaj po identyfikatorze.
+
 const deg = (x: number): number => (x * Math.PI) / 180;
 
 /** Start i rozwiązanie elementu gracza z łukiem: długość łuku liczona na rozwiązaniu,
  *  start dostaje TEN SAM łuk (ten sam środek i długość) — tak jak gracz go zastaje. */
```

Zmiana w `src/levels/stage3.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -3,8 +3,13 @@ import { EllipseShape, HOLE_RADIUS, Level } from "./types";
 import { arcEllipse, ellipse, hyperbola, parabola } from "./shape";
 
 const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };
 
+// Numery poziomów w komentarzach tego pliku to numeracja z czasów etapu 3 (17–24).
+// W grze są o 3 większe (etap 0 dodał trzy poziomy na początku), a „druga-strona" stoi
+// teraz PRZED „wspolne-ognisko" — stary 21 to „wspolne-ognisko", stary 22 to „druga-strona".
+// Szukaj po identyfikatorze, nie po numerze.
+
 /** Poziom 17 ma mniejszy dołek, żeby żadna piłka nie skracała drogi przy osi. Promień
  *  wystrzelony pod kątem δ od osi odbija się na wysokość y = 2p·tan(δ/2); przy p = 0.3,
  *  wachlarzu szerokości 2 i ośmiu piłkach dwie środkowe mają δ = 0.125, czyli y ≈ 0.0375 —
  *  mniej niż standardowy HOLE_RADIUS ≈ 0.0566, więc wpadałyby po jednym odbiciu i docierały
@@ -160,8 +165,29 @@ export const STAGE_3: Level[] = [
     sector: WACHLARZ_W_LEWO,
     test: t,
   },
   {
+    // Wstęp do hiperboli: elipsa stała (ogniska: piłka i M), gracz rusza HIPERBOLĄ.
+    // Zablokowane `ognisko1` (dołek) i `rozmiar`: zostaje jeden uchwyt — drugie ognisko
+    // hiperboli na M — więc to najprostszy poziom z hiperbolą i dlatego stoi przed
+    // „wspolne-ognisko", które tę samą geometrię odwraca. Dlaczego geometria wygląda
+    // właśnie tak — patrz komentarz przy „wspolne-ognisko" niżej.
+    id: "druga-strona", title: "Druga strona",
+    hint: "Elipsa zbiera piłki w swoim drugim ognisku. Postaw tam dalsze ognisko hiperboli.",
+    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
+    pieces: [{
+      start: hyperbola(vec(-0.2, 0.3), vec(0.19, 0.17), 0.18, 1, { mid: 0, span: 1.6 }),
+      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 }),
+      locked: ["ognisko1", "rozmiar"],
+    }],
+    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260))],
+    sector: { center: deg(215), width: 1.4 },
+    // mniejszy dołek i krótszy limit odbić — patrz `t21_23` na górze pliku
+    test: t21_23,
+  },
+  {
+    // Ta sama geometria co „druga-strona", od drugiej strony: hiperbola stała, gracz rusza
+    // ELIPSĄ. Uczy, że wspólne ognisko jest wspólne — można je dosunąć z każdej strony.
     // Układ pozaosiowy, trzy warunki naraz — i wszystkie trzy są konieczne:
     //
     // 1. WACHLARZ + ŁUK. Elipsa NIE może być pełna. Pełna elipsa zbiera piłki do M
     //    ze WSZYSTKICH stron, a gałąź hiperboli jest wklęsła tylko w jedną — piłki
@@ -176,9 +202,9 @@ export const STAGE_3: Level[] = [
     //
     // c hiperboli = |M dołek| / 2 ≈ 0.302, a = 0.18 → wierzchołek ≈ (0.239, 0.500),
     // czyli między środkiem a M — na drodze zbiegających piłek.
     id: "wspolne-ognisko", title: "Wspólne ognisko",
-    hint: "Hiperbola przejmuje zbiegający pęk. Daj jej to ognisko, na które czeka.",
+    hint: "Teraz stoi hiperbola. Drugie ognisko elipsy postaw w dalszym ognisku hiperboli.",
     ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
     pieces: [{
       ...withSolutionArc(
         ellipse(vec(-0.42, -0.18), vec(0.15, 0.3), 0.78),
@@ -190,25 +216,8 @@ export const STAGE_3: Level[] = [
     sector: { center: deg(215), width: 1.4 },
     // mniejszy dołek i krótszy limit odbić — patrz `t21_23` na górze pliku
     test: t21_23,
   },
-  {
-    // Ta sama geometria od drugiej strony: elipsa stała, gracz rusza HIPERBOLĄ.
-    // Uczy, że wspólne ognisko jest wspólne — można je dosunąć z każdej strony.
-    // Zablokowane `ognisko1` (dołek) i `rozmiar`: zostaje jeden uchwyt, jedna lekcja.
-    id: "druga-strona", title: "Druga strona",
-    hint: "Tym razem lustro stoi. Przesuń hiperbolę tak, żeby jej dalsze ognisko usiadło w ognisku elipsy.",
-    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
-    pieces: [{
-      start: hyperbola(vec(-0.2, 0.3), vec(0.19, 0.17), 0.18, 1, { mid: 0, span: 1.6 }),
-      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 }),
-      locked: ["ognisko1", "rozmiar"],
-    }],
-    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260))],
-    sector: { center: deg(215), width: 1.4 },
-    // mniejszy dołek i krótszy limit odbić — patrz `t21_23` na górze pliku
-    test: t21_23,
-  },
   {
     // Jedyny poziom, na którym OBIE gałęzie są widoczne: flaga `twin` (decyzja właściciela
     // z 2026-09-26). Nie z powodu geometrii — druga gałąź zmieściłaby się na planszy także
     // na 21, 22 i 24 — tylko dlatego, że tu jest lekcją. Czynna jest ta wskazana przez
```

Zmiana w `src/render/shapes.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -38,9 +38,9 @@ export function piecePolyline(piece: Piece, steps = 128): Vec2[] {
     // jest najmniejsza przy wierzchołku — dla paraboli rośnie jak √(1 + t²/4p²) (ok. 41%
     // zmienności), dla hiperboli ostro jak cosh. Punkty się zatem gęszczą przy
     // wierzchołku, gdzie krzywizna jest największa — dokładnie gdzie polylinii trzeba
     // największej gęstości. Dla paraboli tylko składowa prostopadła zmienia się równomiernie,
-    // co jest ważne na poziomie 18 (szerokość wiązki odbitej = zakres t niezależnie od p).
+    // co jest ważne na poziomie „parabola-rozmiar" (szerokość wiązki odbitej = zakres t niezależnie od p).
     return rangePolyline(range.frame, range.from, range.to, steps);
   }
   const arc = piece.arc;
   if (arc === undefined) return conicPolyline(piece.conic, steps);
```

Zmiana w `src/ui/handles.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -100,13 +100,13 @@ const BOARD_MIN = -1;
 const BOARD_MAX = 1;
 
 /** DLACZEGO tu: `applyDrag` jest jedynym miejscem, przez które przechodzi i gra
  *  (`screens.ts` woła go po `toWorld`/`snapTo`), i testy, które chcą modelować grę
- *  (np. szara strefa poziomów 21–24 w `tests/levels.test.ts`) — wołają `applyDrag`
+ *  (np. szara strefa poziomów z hiperbolą w `tests/levels.test.ts`) — wołają `applyDrag`
  *  PROSTO, z pominięciem `screens.ts`. Przycięcie w samym `screens.ts` byłoby
  *  obejściem: testy sterujące `applyDrag` nadal eksplorowałyby pozycje poza planszą,
  *  których gra już nie umie wytworzyć (patrz zadanie 15b — dokładne rozwiązanie
- *  poziomu 21 z ogniskiem w (−0.2, 1.7)). Jeden punkt obsługuje obu wywołujących. */
+ *  poziomu „wspolne-ognisko" z ogniskiem w (−0.2, 1.7)). Jeden punkt obsługuje obu wywołujących. */
 const clampToBoard = (p: Vec2): Vec2 => {
   const x = clamp(p.x, BOARD_MIN, BOARD_MAX);
   const y = clamp(p.y, BOARD_MIN, BOARD_MAX);
   // ta sama referencja, gdy już w planszy — nie tworzymy śmieci i nie łamiemy
```

Zmiana w `src/ui/menu.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -33,9 +33,9 @@ export const hitRect = (r: Rect, p: Vec2): boolean =>
   p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
 
 /** Siatka kafelków: w pionie 2 kolumny, w poziomie 4 — ale nie za cenę celu dotykowego.
  *  Gdy tylu wierszy przy tej bazowej liczbie kolumn zepchnęłoby kafelek pod 44 px
- *  (poziomy 21+ na małych telefonach), siatka dostaje dodatkową kolumnę — dokładnie tyle,
+ *  (od ok. 21 poziomów na małych telefonach), siatka dostaje dodatkową kolumnę — dokładnie tyle,
  *  by wiersze zmieściły się w `maxRows`. Przy liczbie poziomów z etapów 1–2 (≤ 16) to
  *  zawsze `base`, więc stare ekrany wyglądają tak jak wcześniej. */
 export function menuLayout(width: number, height: number, count: number): Rect[] {
   const base = width >= height ? 4 : 2;
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -234,9 +234,9 @@ export function mount(canvas: HTMLCanvasElement): void {
         }
       }
     };
 
-    /** Druga gałąź hiperboli z flagą `twin` (dziś tylko poziom 23): blado, tak jak linie
+    /** Druga gałąź hiperboli z flagą `twin` (dziś tylko „ktora-galaz"): blado, tak jak linie
      *  pomocnicze, ale NIEZALEŻNIE od podpowiedzi — tam jest częścią poziomu, nie pomocą.
      *  Rysowana przed samą krzywą, żeby krzywa leżała na wierzchu. */
     const drawTwin = (s: Shape): void => {
       const druga = twinPolyline(s);
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 617 testów zielonych. `npx vite-node scripts/sprawdz-poziom.ts druga-strona` i `wspolne-ognisko` — rozwiązanie 8/8, start 0/8 (bez zmian względem etapu 3).

- [ ] **Krok 5: Commit**

```bash
git add src/levels/stage2.ts src/levels/stage3.ts src/render/shapes.ts src/ui/handles.ts src/ui/menu.ts src/ui/screens.ts tests/levels.test.ts tests/ui/progress.test.ts
git commit -m "feat(poziomy): druga strona wprowadza hiperbole przed wspolnym ogniskiem" -m "Jeden uchwyt zamiast elipsy z blokadami. Numery poziomow w komentarzach oznaczone jako historyczne, nazwy testow podaja identyfikatory." -m "<trailer ze zlecenia>"
```

---

## Zadanie 5: Kolor według rodzaju krzywej i kształty uchwytów

Nowy moduł `src/render/style.ts`: `KIND_COLORS` (elipsa turkus, parabola fiolet, hiperbola fuksja, odcinek błękit), `shapeStyle(s, "gracz" | "staly")` i `handleMark(id)`. Stałe elipsy/parabole/hiperbole rysują się przygaszonym kolorem rodzaju z bladymi ogniskami; czerwone zostają tylko przeszkody — okręgi (`isCircle`) i stałe odcinki. Uchwyty: pierścień — ognisko, romb — wierzchołek, kwadrat — reszta (`handleShape` w `draw.ts`). Z `PALETTE` znikają nieużywane już `handle`, `handleGlow` i `fixedFocus`.

**Pliki:**
- Zmiana: `src/render/draw.ts`
- Nowy: `src/render/style.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/render/marks.test.ts`
- Nowy: `tests/render/style.test.ts`

**Interfejsy:**
- Produkuje: `src/render/style.ts` — `KIND_COLORS: Record<Shape["kind"], { line; glow; dim; focus }>`, `interface ShapeStyle { line: string; glow: string; focus: string | null }`, `shapeStyle(s: Shape, owner: "gracz" | "staly"): ShapeStyle`, `handleMark(id: Handle): HandleMark`. `src/render/draw.ts` — `type HandleMark = "pierscien" | "romb" | "kwadrat"`, `handleShape(ctx, cam, p, mark, color, glow, radius)`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**

`tests/render/marks.test.ts`: fałszywy ctx nagrywa teraz także `moveTo`, `lineTo` i `arc` — potrzebne, żeby odróżnić czworokąt od pierścienia.

Zmiana w `tests/render/marks.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,14 +1,17 @@
 import { describe, it, expect } from "vitest";
 import { vec } from "../../src/core/vec";
-import { holeMark, ringHandle } from "../../src/render/draw";
+import { handleShape, holeMark, ringHandle } from "../../src/render/draw";
 import { makeCamera } from "../../src/render/camera";
 
 function recordingCtx() {
   const calls: { op: string; lineWidth?: number; style?: string }[] = [];
   const ctx = {
     lineCap: "", lineJoin: "", lineWidth: 0, strokeStyle: "", fillStyle: "",
-    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
+    beginPath() {}, closePath() {},
+    moveTo() { calls.push({ op: "moveTo" }); },
+    lineTo() { calls.push({ op: "lineTo" }); },
+    arc() { calls.push({ op: "arc" }); },
     stroke() { calls.push({ op: "stroke", lineWidth: ctx.lineWidth, style: String(ctx.strokeStyle) }); },
     fill() { calls.push({ op: "fill", style: String(ctx.fillStyle) }); },
   };
   return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
@@ -33,5 +36,27 @@ describe("znaczniki: ruchome kontra stałe", () => {
     holeMark(ctx, cam, vec(0, 0), "brzeg", "poswiata", "srodek", 9);
     expect(calls.filter((c) => c.op === "fill").map((c) => c.style)).toEqual(["poswiata", "srodek"]);
     expect(calls.filter((c) => c.op === "stroke").map((c) => c.style)).toEqual(["brzeg"]);
   });
+
+  // Romb i kwadrat to też PUSTE znaki z poświatą — z tej samej przyczyny co pierścień:
+  // uchwyt postawiony na piłce albo w dołku nie może go zakryć.
+  for (const mark of ["romb", "kwadrat"] as const) {
+    it(`uchwyt „${mark}" to pusty czworokąt z poświatą: dwa obrysy, zero wypełnień, zero łuków`, () => {
+      const { ctx, calls } = recordingCtx();
+      handleShape(ctx, cam, vec(0, 0), mark, "glowny", "poswiata", 10);
+      expect(calls.filter((c) => c.op === "fill")).toHaveLength(0);
+      expect(calls.filter((c) => c.op === "arc")).toHaveLength(0);
+      // każdy z dwóch obrysów: moveTo + trzy lineTo
+      expect(calls.filter((c) => c.op === "lineTo")).toHaveLength(6);
+      const strokes = calls.filter((c) => c.op === "stroke");
+      expect(strokes.map((s) => s.style)).toEqual(["poswiata", "glowny"]);
+    });
+  }
+
+  it("uchwyt „pierscien\" rysuje pierścień", () => {
+    const { ctx, calls } = recordingCtx();
+    handleShape(ctx, cam, vec(0, 0), "pierscien", "glowny", "poswiata", 10);
+    expect(calls.filter((c) => c.op === "arc")).toHaveLength(2);
+    expect(calls.filter((c) => c.op === "lineTo")).toHaveLength(0);
+  });
 });
```

Nowy plik `tests/render/style.test.ts` — cała zawartość:

```ts
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
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/render/style.test.ts tests/render/marks.test.ts`
Oczekiwane: NIE przechodzą — brak modułu `src/render/style.ts`, `handleShape` nie istnieje.

- [ ] **Krok 3: Implementacja**


Zmiana w `src/render/draw.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -19,17 +19,14 @@ export const PALETTE = {
   holeGlow: "rgba(251, 191, 36, 0.20)",
   holeInside: "#05070a",
   obstacle: "#f87171",
   obstacleGlow: "rgba(248, 113, 113, 0.16)",
-  handle: "#5eead4",
-  handleGlow: "rgba(94, 234, 212, 0.22)",
   miss: "#f87171",
   text: "#cbd5e1",
   muted: MUTED,
   overlay: "rgba(11, 15, 20, 0.94)",
   tile: "rgba(94, 234, 212, 0.05)",
   tileEdge: "rgba(203, 213, 225, 0.22)",
-  fixedFocus: "rgba(248, 113, 113, 0.45)",
   hint: "rgba(203, 213, 225, 0.30)",
   sector: "rgba(248, 250, 252, 0.05)",
   board: "#10161e",
   frame: MUTED,
@@ -114,8 +111,47 @@ export function ringHandle(
   ring();
   ctx.stroke();
 }
 
+/** Kształty uchwytów — patrz `handleMark` w `style.ts`. */
+export type HandleMark = "pierscien" | "romb" | "kwadrat";
+
+/** Pusty wielokąt z poświatą — ten sam podwójny obrys co pierścień, inne obrysy. */
+function polygonHandle(ctx: Ctx, pts: Vec2[], color: string, glow: string): void {
+  const path = () => {
+    ctx.beginPath();
+    ctx.moveTo(pts[0].x, pts[0].y);
+    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
+    ctx.closePath();
+  };
+  ctx.lineJoin = "round";
+  ctx.strokeStyle = glow;
+  ctx.lineWidth = 10;
+  path();
+  ctx.stroke();
+  ctx.strokeStyle = color;
+  ctx.lineWidth = 2.5;
+  path();
+  ctx.stroke();
+}
+
+/** Uchwyt w kształcie `mark`. `radius` jak w `ringHandle`: romb ma wierzchołki w tej
+ *  odległości od środka, kwadrat — pół boku równe 0.8 promienia (podobna powierzchnia). */
+export function handleShape(
+  ctx: Ctx, cam: Camera, p: Vec2, mark: HandleMark, color: string, glow: string, radius: number,
+): void {
+  if (mark === "pierscien") {
+    ringHandle(ctx, cam, p, color, glow, radius);
+    return;
+  }
+  const s = cam.toScreen(p);
+  const r = mark === "romb" ? radius : 0.8 * radius;
+  const pts = mark === "romb"
+    ? [{ x: s.x, y: s.y - r }, { x: s.x + r, y: s.y }, { x: s.x, y: s.y + r }, { x: s.x - r, y: s.y }]
+    : [{ x: s.x - r, y: s.y - r }, { x: s.x + r, y: s.y - r }, { x: s.x + r, y: s.y + r }, { x: s.x - r, y: s.y + r }];
+  polygonHandle(ctx, pts, color, glow);
+}
+
 /** Dołek: ciemny środek z jasną obwódką — wygląda jak otwór, nie jak kolejna kropka. */
 export function holeMark(
   ctx: Ctx, cam: Camera, p: Vec2, rim: string, glow: string, inside: string, radius: number,
 ): void {
```

Nowy plik `src/render/style.ts` — cała zawartość:

```ts
import { Handle, Shape } from "../levels/types";
import { isCircle } from "../levels/shape";
import { HandleMark, PALETTE } from "./draw";

/** Barwy jednego rodzaju kształtu: pełna (gracz), poświata, przygaszona (stały kształt
 *  tego rodzaju) i blada (ogniska stałego kształtu). */
interface KindColors { line: string; glow: string; dim: string; focus: string }

/** Każdy rodzaj krzywej ma własny kolor — elipsa i parabola wyglądają podobnie, a działają
 *  inaczej (uwaga 3 właściciela). Żaden nie jest czerwony (przeszkody), złoty (dołek) ani
 *  żółty (tory piłek). */
export const KIND_COLORS: Record<Shape["kind"], KindColors> = {
  elipsa: {
    line: "#5eead4", glow: "rgba(94, 234, 212, 0.16)",
    dim: "rgba(94, 234, 212, 0.55)", focus: "rgba(94, 234, 212, 0.45)",
  },
  parabola: {
    line: "#a78bfa", glow: "rgba(167, 139, 250, 0.16)",
    dim: "rgba(167, 139, 250, 0.55)", focus: "rgba(167, 139, 250, 0.45)",
  },
  hiperbola: {
    line: "#f0abfc", glow: "rgba(240, 171, 252, 0.16)",
    dim: "rgba(240, 171, 252, 0.55)", focus: "rgba(240, 171, 252, 0.45)",
  },
  odcinek: {
    line: "#7dd3fc", glow: "rgba(125, 211, 252, 0.16)",
    dim: "rgba(125, 211, 252, 0.55)", focus: "rgba(125, 211, 252, 0.45)",
  },
};

const NO_GLOW = "rgba(0,0,0,0)";

export interface ShapeStyle {
  line: string;
  glow: string;
  /** kolor kropek ognisk; `null` — nie rysować (przeszkoda albo kształt gracza, którego
   *  ogniska są uchwytami) */
  focus: string | null;
}

/** Przeszkoda w sensie wyglądu: rzecz, która tylko zawadza albo odbija jak banda — okrąg
 *  (elipsa o zlanych ogniskach) i stały odcinek. Zostaje czerwona jak w etapach 1–2. */
const isObstacle = (s: Shape): boolean => s.kind === "odcinek" || (s.kind === "elipsa" && isCircle(s));

/** Jak narysować kształt. Gracz: pełny kolor rodzaju z poświatą. Stały: przeszkoda na
 *  czerwono, a stała elipsa/parabola/hiperbola — część konstrukcji, nie przeszkoda — w kolorze
 *  swojego rodzaju, przygaszona, bez poświaty, z bladymi ogniskami (np. stała parabola przy
 *  dołku na „ognisko-paraboli" jest wtedy widocznie parabolą, nie czerwoną zawadą). */
export function shapeStyle(s: Shape, owner: "gracz" | "staly"): ShapeStyle {
  const k = KIND_COLORS[s.kind];
  if (owner === "gracz") return { line: k.line, glow: k.glow, focus: null };
  if (isObstacle(s)) return { line: PALETTE.obstacle, glow: PALETTE.obstacleGlow, focus: null };
  return { line: k.dim, glow: NO_GLOW, focus: k.focus };
}

/** Kształt uchwytu mówi, czym jest: pierścień — ognisko (to, co stawia się na piłce albo
 *  w dołku), romb — wierzchołek paraboli, kwadrat — cała reszta. */
export function handleMark(id: Handle): HandleMark {
  if (id === "ognisko" || id === "ognisko1" || id === "ognisko2") return "pierscien";
  if (id === "wierzcholek") return "romb";
  return "kwadrat";
}
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,11 +1,12 @@
 import { Vec2, vec } from "../core/vec";
 import { LEVELS, SNAP_RADIUS, Shape, shapeFoci, shapeToPiece } from "../levels";
 import { makeCamera } from "../render/camera";
 import {
-  PALETTE, SECTOR_REACH, boardFrame, drawPiece, glowDot, glowPolyline, holeMark, ringHandle, sectorWedge,
+  PALETTE, SECTOR_REACH, boardFrame, drawPiece, glowDot, glowPolyline, handleShape, holeMark, sectorWedge,
 } from "../render/draw";
 import { curveHints, twinPolyline } from "../render/shapes";
+import { handleMark, shapeStyle } from "../render/style";
 import { positionAt, trailSegment } from "../render/trails";
 import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
 import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
 import {
@@ -245,24 +246,27 @@ export function mount(canvas: HTMLCanvasElement): void {
 
     for (const o of level.obstacles) {
       drawHints(o);
       drawTwin(o);
-      drawPiece(ctx, c, shapeToPiece(o), PALETTE.obstacle, PALETTE.obstacleGlow, 2);
+      const st = shapeStyle(o, "staly");
+      drawPiece(ctx, c, shapeToPiece(o), st.line, st.glow, 2);
       // ogniska stałych elips/paraboli/hiperboli blado — lekcje kaskad to „trafić
-      // ogniskiem w to ognisko"; okręgi pomijamy: ich „ognisko" to środek przeszkody, nie cel
-      if (o.kind !== "odcinek") {
-        for (const f of shapeFoci(o)) glowDot(ctx, c, f, PALETTE.fixedFocus, PALETTE.obstacleGlow, 2.5);
+      // ogniskiem w to ognisko"; przeszkody (okręgi, odcinki) ich nie mają (`focus: null`)
+      if (st.focus !== null) {
+        for (const f of shapeFoci(o)) glowDot(ctx, c, f, st.focus, "rgba(0,0,0,0)", 2.5);
       }
     }
 
     for (const s of game.pieces) {
       drawHints(s);
       drawTwin(s);
-      drawPiece(ctx, c, shapeToPiece(s), PALETTE.curve, PALETTE.curveGlow, 2);
+      const st = shapeStyle(s, "gracz");
+      drawPiece(ctx, c, shapeToPiece(s), st.line, st.glow, 2);
     }
 
     // Stałe punkty są pełne (piłka) albo wyglądają jak otwór (dołek); wszystko, co da się
-    // przeciągnąć, to pulsujący pusty pierścień w kolorze elipsy. Pierścienie rysujemy
+    // przeciągnąć, to pulsujący pusty znak w kolorze swojej krzywej — pierścień (ognisko),
+    // romb (wierzchołek) albo kwadrat (reszta), patrz `handleMark`. Uchwyty rysujemy
     // na końcu, żeby ognisko postawione na piłce otaczało ją, a nie znikało pod nią.
     holeMark(ctx, c, level.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 9);
     glowDot(ctx, c, level.ball, PALETTE.ball, PALETTE.ballGlow, 6);
 
@@ -271,9 +275,10 @@ export function mount(canvas: HTMLCanvasElement): void {
         for (const h of handlePositions(s)) {
           if (level.pieces[piece].locked.includes(h.id)) continue;
           const active = dragging !== null && dragging.piece === piece && dragging.id === h.id;
           const r = active ? 15 : 12 + 1.5 * Math.sin(time * 3.2);
-          ringHandle(ctx, c, h.pos, PALETTE.handle, PALETTE.handleGlow, r);
+          const st = shapeStyle(s, "gracz");
+          handleShape(ctx, c, h.pos, handleMark(h.id), st.line, st.glow, r);
         }
       });
       // podgląd na żywo: dwie piłki, blade tory — tylko gdy gracz włączył to w ustawieniach
       if (settings.previewPaths) {
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 628 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/render/style.ts src/render/draw.ts src/ui/screens.ts tests/render/style.test.ts tests/render/marks.test.ts
git commit -m "feat(wyglad): kolor wedlug rodzaju krzywej i ksztalt uchwytu wedlug roli" -m "Elipsa turkus, parabola fiolet, hiperbola fuksja, odcinek blekit. Stale krzywe przygaszone w kolorze rodzaju, czerwone tylko okregi i bandy. Pierscien ognisko, romb wierzcholek, kwadrat reszta." -m "<trailer ze zlecenia>"
```

---

## Zadanie 6: Oś paraboli i strzałka strzału jednopiłkowego

`parabolaAxis(s)` — odcinek od wierzchołka przez ognisko do brzegu planszy; rysowany zawsze (niezależnie od podpowiedzi) cienką przerywaną linią w kolorze paraboli, pod samą krzywą; dla stałej paraboli przygaszony. `shotArrow(apex, angle, reach)` — trzon i grot; poziom z wachlarzem zerowej szerokości rysuje strzałkę zamiast pustego klina.

**Pliki:**
- Zmiana: `src/render/draw.ts`
- Zmiana: `src/render/shapes.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/render/marks.test.ts`
- Zmiana: `tests/render/shapes.test.ts`

**Interfejsy:**
- Konsumuje: `shapeStyle` z zadania 5 (kolor osi = kolor linii kształtu).
- Produkuje: `src/render/shapes.ts` — `parabolaAxis(s: ParabolaShape): [Vec2, Vec2]`, `shotArrow(apex: Vec2, angle: number, reach: number): Vec2[][]`. `src/render/draw.ts` — `dashedPolyline(ctx, cam, pts, color, width)`, `PALETTE.shot`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**

Uwaga do testu linii przerywanej: stan zapisany przez metody fałszywego ctx trzymaj w obiekcie (`seen`), nie w zmiennych `let` — TypeScript nie widzi przypisań z wnętrza metod i zawęża `let x: T | null = null` do `never` (zmierzone: błąd TS2339 przy `x?.length`).

Zmiana w `tests/render/marks.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,7 +1,7 @@
 import { describe, it, expect } from "vitest";
 import { vec } from "../../src/core/vec";
-import { handleShape, holeMark, ringHandle } from "../../src/render/draw";
+import { dashedPolyline, handleShape, holeMark, ringHandle } from "../../src/render/draw";
 import { makeCamera } from "../../src/render/camera";
 
 function recordingCtx() {
   const calls: { op: string; lineWidth?: number; style?: string }[] = [];
@@ -59,4 +59,21 @@ describe("znaczniki: ruchome kontra stałe", () => {
     expect(calls.filter((c) => c.op === "arc")).toHaveLength(2);
     expect(calls.filter((c) => c.op === "lineTo")).toHaveLength(0);
   });
 });
+
+describe("oś paraboli: linia przerywana", () => {
+  it("kreskuje tylko swój obrys — po rysunku kreskowanie jest wyłączone", () => {
+    const dashes: number[][] = [];
+    // w obiekcie, nie w `let` — TypeScript nie widzi przypisań z wnętrza metod fałszywego ctx
+    const seen: { current: number[]; atStroke: number[] | null } = { current: [], atStroke: null };
+    const ctx = {
+      lineWidth: 0, strokeStyle: "",
+      beginPath() {}, moveTo() {}, lineTo() {},
+      setLineDash(d: number[]) { seen.current = d; dashes.push(d); },
+      stroke() { seen.atStroke = seen.current; },
+    };
+    dashedPolyline(ctx as unknown as CanvasRenderingContext2D, cam, [vec(0, 0), vec(1, 0)], "kolor", 1);
+    expect(seen.atStroke?.length ?? 0).toBeGreaterThan(0);
+    expect(dashes[dashes.length - 1]).toEqual([]);
+  });
+});
```

Zmiana w `tests/render/shapes.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,11 +1,13 @@
 import { describe, it, expect } from "vitest";
-import { vec } from "../../src/core/vec";
+import { Vec2, dist, fromAngle, vec } from "../../src/core/vec";
 import { ellipseFromFoci, evalConic, hyperbolaFromFoci, lineThrough, parabolaFromFocusVertex } from "../../src/core/conic";
 import { makeCamera } from "../../src/render/camera";
-import { conicPolyline, piecePolyline, twinPolyline } from "../../src/render/shapes";
+import { conicPolyline, parabolaAxis, piecePolyline, shotArrow, twinPolyline } from "../../src/render/shapes";
 import { Piece, onPiece, whole } from "../../src/core/piece";
-import { arcEllipse, ellipse, ellipsePoint, hyperbola, parabola, segment, shapeFrame, shapeToPiece } from "../../src/levels";
+import {
+  LEVELS, ParabolaShape, arcEllipse, ellipse, ellipsePoint, hyperbola, parabola, segment, shapeFrame, shapeToPiece,
+} from "../../src/levels";
 import { CurveFrame, frameParam, framePoint } from "../../src/core/frame";
 
 describe("kamera", () => {
   it("środek świata trafia w środek ekranu", () => {
@@ -194,4 +196,62 @@ describe("druga gałąź hiperboli (tylko rysunek)", () => {
       expect(frameParam(shapeFrame(s), p).branch).toBe(-1);
     }
   });
 });
+
+describe("oś paraboli", () => {
+  const naBrzegu = (p: Vec2) => Math.max(Math.abs(p.x), Math.abs(p.y));
+  /** Ognisko leży na odcinku osi, między wierzchołkiem a końcem: suma odległości = długość. */
+  const przezOgnisko = (s: ParabolaShape, [a, b]: [Vec2, Vec2]) =>
+    dist(a, s.focus) + dist(s.focus, b) - dist(a, b);
+
+  it("od wierzchołka przez ognisko do brzegu planszy — oś pozioma", () => {
+    const s = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });
+    const os = parabolaAxis(s);
+    expect(os[0]).toEqual(s.vertex);
+    expect(os[1].x).toBeCloseTo(1, 12);
+    expect(os[1].y).toBeCloseTo(0, 12);
+  });
+
+  it("oś ukośna kończy się na brzegu, nie za nim i nie przed nim", () => {
+    const s = parabola(vec(-0.53787, -0.53787), vec(-0.75, -0.75), { mid: 0, span: 1.2 });
+    const os = parabolaAxis(s);
+    expect(naBrzegu(os[1])).toBeCloseTo(1, 12);
+    expect(przezOgnisko(s, os)).toBeCloseTo(0, 12);
+  });
+
+  it("każda parabola każdego poziomu: wierzchołek w planszy, oś przez ognisko do brzegu", () => {
+    for (const l of LEVELS) {
+      const parabole = [...l.pieces.flatMap((p) => [p.start, p.solution]), ...l.obstacles]
+        .filter((x): x is ParabolaShape => x.kind === "parabola");
+      for (const s of parabole) {
+        expect(naBrzegu(s.vertex), l.id).toBeLessThanOrEqual(1);
+        const os = parabolaAxis(s);
+        expect(naBrzegu(os[1]), l.id).toBeCloseTo(1, 12);
+        expect(przezOgnisko(s, os), l.id).toBeCloseTo(0, 12);
+      }
+    }
+  });
+});
+
+describe("strzałka strzału", () => {
+  it("trzon od piłki w kierunku strzału, grot symetryczny w czubku", () => {
+    const apex = vec(-0.5, -0.5);
+    const [trzon, grot] = shotArrow(apex, Math.PI / 2, 0.4);
+    expect(trzon[0]).toEqual(apex);
+    expect(trzon[1].x).toBeCloseTo(-0.5, 12);
+    expect(trzon[1].y).toBeCloseTo(-0.1, 12);
+    expect(grot[1]).toEqual(trzon[1]);
+    // ramiona po obu stronach trzonu, w tej samej odległości od czubka i cofnięte w dół
+    expect(dist(grot[0], grot[1])).toBeCloseTo(0.1, 12);
+    expect(dist(grot[2], grot[1])).toBeCloseTo(0.1, 12);
+    expect(grot[0].x + grot[2].x).toBeCloseTo(2 * -0.5, 12);
+    expect(grot[0].y).toBeLessThan(trzon[1].y);
+  });
+
+  it("kierunek idzie za kątem", () => {
+    const [trzon] = shotArrow(vec(0, 0), 0.3, 1);
+    const d = fromAngle(0.3);
+    expect(trzon[1].x).toBeCloseTo(d.x, 12);
+    expect(trzon[1].y).toBeCloseTo(d.y, 12);
+  });
+});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/render/shapes.test.ts tests/render/marks.test.ts`
Oczekiwane: NIE przechodzą — `parabolaAxis`, `shotArrow`, `dashedPolyline` nie istnieją.

- [ ] **Krok 3: Implementacja**


Zmiana w `src/render/draw.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -27,8 +27,10 @@ export const PALETTE = {
   tile: "rgba(94, 234, 212, 0.05)",
   tileEdge: "rgba(203, 213, 225, 0.22)",
   hint: "rgba(203, 213, 225, 0.30)",
   sector: "rgba(248, 250, 252, 0.05)",
+  // strzałka strzału jednopiłkowego — wyraźniejsza niż klin, bo to jeden kierunek, nie pole
+  shot: "rgba(248, 250, 252, 0.45)",
   board: "#10161e",
   frame: MUTED,
   // ta sama barwa co `frame`/`muted`, tylko przy niskiej krycia — poświata ramki
   frameGlow: "rgba(100, 116, 139, 0.18)",
@@ -77,8 +79,26 @@ export function glowPolyline(
   trace();
   ctx.stroke();
 }
 
+/** Cienka przerywana łamana bez poświaty — oś paraboli. Kreskowanie wyłączane na końcu,
+ *  żeby nie przeciekło do następnych rysunków na tym samym kontekście. */
+export function dashedPolyline(ctx: Ctx, cam: Camera, pts: Vec2[], color: string, width: number): void {
+  if (pts.length < 2) return;
+  ctx.setLineDash([6, 6]);
+  ctx.strokeStyle = color;
+  ctx.lineWidth = width;
+  ctx.beginPath();
+  const s0 = cam.toScreen(pts[0]);
+  ctx.moveTo(s0.x, s0.y);
+  for (let i = 1; i < pts.length; i++) {
+    const s = cam.toScreen(pts[i]);
+    ctx.lineTo(s.x, s.y);
+  }
+  ctx.stroke();
+  ctx.setLineDash([]);
+}
+
 export function glowDot(
   ctx: Ctx, cam: Camera, p: Vec2, color: string, glow: string, radius: number,
 ): void {
   const s = cam.toScreen(p);
```

Zmiana w `src/render/shapes.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,5 +1,5 @@
-import { Vec2, add, dist, dot, norm, perp, scale, sub, vec } from "../core/vec";
+import { Vec2, add, dist, dot, fromAngle, norm, perp, scale, sub, vec } from "../core/vec";
 import { Conic, classify, ellipseGeometry } from "../core/conic";
 import { Piece } from "../core/piece";
 import { CurveFrame, framePoint } from "../core/frame";
 import { HyperbolaShape, ParabolaShape, Shape } from "../levels/types";
@@ -105,4 +105,26 @@ export function twinPolyline(s: Shape, steps = 128): Vec2[] | undefined {
   const { from, to } = spanRange(shapeFrame(s), s.span);
   const druga = shapeFrame({ ...s, branch: s.branch === 1 ? -1 : 1 });
   return rangePolyline(druga, from, to, steps);
 }
+
+/** Oś paraboli od wierzchołka przez ognisko do brzegu planszy [-1, 1]² — tam, dokąd poleci
+ *  wiązka odbita z ogniska (uwaga 4 właściciela: oś nie jest oczywista). Wierzchołek leży
+ *  w planszy (uchwyty są przycinane, dane poziomów pilnuje test), więc wyjście istnieje;
+ *  `Math.max(0, …)` tylko na wypadek wierzchołka na samym brzegu, skierowanego na zewnątrz. */
+export function parabolaAxis(s: ParabolaShape): [Vec2, Vec2] {
+  const u = norm(sub(s.focus, s.vertex));
+  let t = Infinity;
+  if (u.x > 0) t = Math.min(t, (1 - s.vertex.x) / u.x);
+  if (u.x < 0) t = Math.min(t, (-1 - s.vertex.x) / u.x);
+  if (u.y > 0) t = Math.min(t, (1 - s.vertex.y) / u.y);
+  if (u.y < 0) t = Math.min(t, (-1 - s.vertex.y) / u.y);
+  return [s.vertex, add(s.vertex, scale(u, Math.max(0, t)))];
+}
+
+/** Strzałka strzału jednopiłkowego: trzon od piłki długości `reach` w kierunku `angle`
+ *  i grot z dwóch ramion po 0.25·reach, rozchylonych o ±0.5 rad od trzonu. */
+export function shotArrow(apex: Vec2, angle: number, reach: number): Vec2[][] {
+  const tip = add(apex, scale(fromAngle(angle), reach));
+  const wing = (side: number): Vec2 => add(tip, scale(fromAngle(angle + Math.PI + side * 0.5), 0.25 * reach));
+  return [[apex, tip], [wing(1), tip, wing(-1)]];
+}
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,11 +1,12 @@
 import { Vec2, vec } from "../core/vec";
 import { LEVELS, SNAP_RADIUS, Shape, shapeFoci, shapeToPiece } from "../levels";
 import { makeCamera } from "../render/camera";
 import {
-  PALETTE, SECTOR_REACH, boardFrame, drawPiece, glowDot, glowPolyline, handleShape, holeMark, sectorWedge,
+  PALETTE, SECTOR_REACH, boardFrame, dashedPolyline, drawPiece, glowDot, glowPolyline, handleShape, holeMark,
+  sectorWedge,
 } from "../render/draw";
-import { curveHints, twinPolyline } from "../render/shapes";
+import { curveHints, parabolaAxis, shotArrow, twinPolyline } from "../render/shapes";
 import { handleMark, shapeStyle } from "../render/style";
 import { positionAt, trailSegment } from "../render/trails";
 import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
 import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
@@ -222,9 +223,16 @@ export function mount(canvas: HTMLCanvasElement): void {
 
     // wachlarz tylko w edycji i tylko gdy poziom go ma — bez niego łuk „nie tam,
     // gdzie lecą piłki" wyglądałby na błąd gry; mały i przycięty do planszy
     if (game.phase === "edycja" && level.sector !== undefined) {
-      sectorWedge(ctx, c, level.ball, level.sector, SECTOR_REACH, PALETTE.sector);
+      // jedna piłka (wachlarz zerowej szerokości) — klin byłby pusty, więc strzałka kierunku
+      if (level.sector.width === 0) {
+        for (const linia of shotArrow(level.ball, level.sector.center, SECTOR_REACH)) {
+          glowPolyline(ctx, c, linia, PALETTE.shot, "rgba(0,0,0,0)", 1.5);
+        }
+      } else {
+        sectorWedge(ctx, c, level.ball, level.sector, SECTOR_REACH, PALETTE.sector);
+      }
     }
 
     /** Linie pomocnicze krzywej (kierownica, asymptoty) — tylko przy włączonych
      *  podpowiedziach; tak samo dla przeszkód i elementów gracza. */
@@ -247,8 +255,10 @@ export function mount(canvas: HTMLCanvasElement): void {
     for (const o of level.obstacles) {
       drawHints(o);
       drawTwin(o);
       const st = shapeStyle(o, "staly");
+      // oś paraboli zawsze (nie tylko przy podpowiedziach) — pod krzywą, żeby jej nie przecinać
+      if (o.kind === "parabola") dashedPolyline(ctx, c, parabolaAxis(o), st.line, 1);
       drawPiece(ctx, c, shapeToPiece(o), st.line, st.glow, 2);
       // ogniska stałych elips/paraboli/hiperboli blado — lekcje kaskad to „trafić
       // ogniskiem w to ognisko"; przeszkody (okręgi, odcinki) ich nie mają (`focus: null`)
       if (st.focus !== null) {
@@ -259,8 +269,9 @@ export function mount(canvas: HTMLCanvasElement): void {
     for (const s of game.pieces) {
       drawHints(s);
       drawTwin(s);
       const st = shapeStyle(s, "gracz");
+      if (s.kind === "parabola") dashedPolyline(ctx, c, parabolaAxis(s), st.line, 1);
       drawPiece(ctx, c, shapeToPiece(s), st.line, st.glow, 2);
     }
 
     // Stałe punkty są pełne (piłka) albo wyglądają jak otwór (dołek); wszystko, co da się
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 634 testy zielone (w tym `tests/budget.test.ts`: paczka ok. 13.9 KB gzip).

- [ ] **Krok 5: Commit**

```bash
git add src/render/shapes.ts src/render/draw.ts src/ui/screens.ts tests/render/shapes.test.ts tests/render/marks.test.ts
git commit -m "feat(wyglad): os paraboli zawsze widoczna i strzalka strzalu jednej pilki" -m "Przerywana os od wierzcholka przez ognisko do brzegu planszy, takze dla stalej paraboli. Poziom jednopilkowy pokazuje kierunek strzalu zamiast pustego klina." -m "<trailer ze zlecenia>"
```

---

## Zadanie 7: Plansze z zasadą — dane i miniscenki

`src/levels/cards.ts`: sześć plansz (odbicie, elipsa, łuk, kaskada, parabola, hiperbola), każda z miniscenką liczoną przez `sceneTraces` (ten sam `trace` co dowód, ze ścianami planszy). `introCard(id)` — plansza stojąca przed poziomem; `cardFor(ids, index)` — plansza mechaniki, do której należy poziom (ostatnia nie dalej niż on). Scena kaskady to układ poziomu `kaskada` odbity względem osi x — ta sama lekcja, nie jego rozwiązanie.

**Pliki:**
- Nowy: `src/levels/cards.ts`
- Zmiana: `src/levels/index.ts`
- Nowy: `tests/levels/cards.test.ts`

**Interfejsy:**
- Konsumuje: `trace` (`src/core/trace.ts`), `BOARD_WALLS`, `shapeToPiece`, konstruktory kształtów.
- Produkuje (eksportowane też przez `src/levels/index.ts`): `interface Shot { from: Vec2; angle: number }`, `interface CardScene { shots: Shot[]; shapes: Shape[]; hole?: Vec2; bounces: number }`, `interface Card { id; before; title; text; scenes: CardScene[] }`, `CARDS: Card[]`, `sceneTraces(scene): TraceResult[]`, `introCard(id): Card | undefined`, `cardFor(ids: readonly string[], index: number): Card | undefined`.

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Nowy plik `tests/levels/cards.test.ts` — cała zawartość:

```ts
import { describe, it, expect } from "vitest";
import { Vec2, dot, norm, sub } from "../../src/core/vec";
import { CARDS, LEVELS, cardFor, introCard, sceneTraces } from "../../src/levels";

const IDS = LEVELS.map((l) => l.id);
/** Kierunek ostatniego odcinka toru — dokąd piłka leci po ostatnim odbiciu. */
const lastDir = (path: Vec2[]): Vec2 => norm(sub(path[path.length - 1], path[path.length - 2]));
const card = (id: string) => {
  const c = CARDS.find((x) => x.id === id);
  if (c === undefined) throw new Error(`brak planszy ${id}`);
  return c;
};

describe("plansze z zasadą — dane", () => {
  it("każda plansza stoi przed istniejącym poziomem, każda przed innym", () => {
    for (const c of CARDS) expect(IDS, c.id).toContain(c.before);
    expect(new Set(CARDS.map((c) => c.before)).size).toBe(CARDS.length);
  });

  it("kolejność plansz to kolejność ich poziomów", () => {
    const at = CARDS.map((c) => IDS.indexOf(c.before));
    for (let i = 1; i < at.length; i++) expect(at[i], CARDS[i].id).toBeGreaterThan(at[i - 1]);
  });

  it("pierwsza plansza stoi przed pierwszym poziomem — „?\" ma zawsze co otworzyć", () => {
    expect(CARDS[0].before).toBe(IDS[0]);
    for (let i = 0; i < IDS.length; i++) expect(cardFor(IDS, i), IDS[i]).toBeDefined();
  });

  it("sześć mechanik: odbicie, elipsa, łuk, kaskada, parabola, hiperbola", () => {
    expect(CARDS.map((c) => [c.id, c.before])).toEqual([
      ["odbicie", "odbicie"], ["elipsa", "ogniska"], ["luk", "polelipsa"],
      ["kaskada", "kaskada"], ["parabola", "ognisko-paraboli"], ["hiperbola", "druga-strona"],
    ]);
  });
});

describe("która plansza dla którego poziomu", () => {
  it("na poziomie, przed którym stoi plansza — ta plansza", () => {
    for (const c of CARDS) expect(cardFor(IDS, IDS.indexOf(c.before))?.id).toBe(c.id);
  });

  it("tuż przed następną planszą — wciąż poprzednia", () => {
    for (let i = 1; i < CARDS.length; i++) {
      expect(cardFor(IDS, IDS.indexOf(CARDS[i].before) - 1)?.id).toBe(CARDS[i - 1].id);
    }
  });

  it("ostatni poziom gry należy do ostatniej planszy", () => {
    expect(cardFor(IDS, IDS.length - 1)?.id).toBe(CARDS[CARDS.length - 1].id);
  });

  it("plansza pokazuje się sama tylko na swoim poziomie", () => {
    expect(introCard("ogniska")?.id).toBe("elipsa");
    expect(introCard("rozmiar")).toBeUndefined();
  });
});

describe("sceny plansz pokazują to, co mówi zdanie", () => {
  it("każda scena się liczy, a scena z dołkiem trafia wszystkimi strzałami", () => {
    for (const c of CARDS) {
      c.scenes.forEach((s, i) => {
        const tory = sceneTraces(s);
        expect(tory, `${c.id} scena ${i}`).toHaveLength(s.shots.length);
        if (s.hole !== undefined) expect(tory.every((t) => t.holed), `${c.id} scena ${i}`).toBe(true);
      });
    }
  });

  it("odbicie: kąt padania równy kątowi odbicia", () => {
    const s = card("odbicie").scenes[0];
    const lustro = s.shapes[0];
    if (lustro.kind !== "odcinek") throw new Error("zły rodzaj");
    const [tor] = sceneTraces(s);
    const przed = norm(sub(tor.path[1], tor.path[0]));
    const po = norm(sub(tor.path[2], tor.path[1]));
    const wzdluz = norm(sub(lustro.to, lustro.from));
    // składowa wzdłuż lustra bez zmian, składowa w poprzek — ta sama co do wartości, odwrócona
    expect(dot(po, wzdluz)).toBeCloseTo(dot(przed, wzdluz), 12);
    expect(Math.abs(1 - dot(po, wzdluz) ** 2 - (1 - dot(przed, wzdluz) ** 2))).toBeLessThan(1e-12);
    expect(tor.path[1].y).toBeCloseTo(0.4, 12);
  });

  it("elipsa: płaskie lustro rozsyła wachlarz — po odbiciu każda piłka leci gdzie indziej", () => {
    const tory = sceneTraces(card("elipsa").scenes[0]);
    const katy = tory.map((t) => Math.atan2(lastDir(t.path).y, lastDir(t.path).x)).sort((a, b) => a - b);
    for (let i = 1; i < katy.length; i++) expect(katy[i] - katy[i - 1]).toBeGreaterThan(0.05);
  });

  it("parabola: z ogniska — po odbiciu wszystkie równolegle do osi", () => {
    for (const t of sceneTraces(card("parabola").scenes[0])) {
      expect(t.path.length - 2, "jedno odbicie od paraboli").toBeGreaterThanOrEqual(1);
      expect(Math.abs(norm(sub(t.path[2], t.path[1])).y)).toBeLessThan(1e-9);
    }
  });

  it("hiperbola: strzały w jedno ognisko trafiają w drugie po JEDNYM odbiciu", () => {
    for (const t of sceneTraces(card("hiperbola").scenes[0])) {
      expect(t.holed).toBe(true);
      expect(t.path.length - 2).toBe(1);
    }
  });
});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/levels/cards.test.ts`
Oczekiwane: NIE przechodzi — `CARDS` i reszta nie istnieją.

- [ ] **Krok 3: Implementacja**


Nowy plik `src/levels/cards.ts` — cała zawartość:

```ts
import { Vec2, fromAngle, vec } from "../core/vec";
import { TraceResult, trace } from "../core/trace";
import { HOLE_RADIUS, Shape } from "./types";
import { BOARD_WALLS, arcEllipse, ellipse, hyperbola, parabola, segment, shapeToPiece } from "./shape";

/** Jeden strzał miniscenki: skąd i pod jakim kątem. Zwykle wszystkie z jednej piłki
 *  (wachlarz), ale scena hiperboli strzela z kilku miejsc naraz w jeden punkt. */
export interface Shot { from: Vec2; angle: number }

/** Rysunek na planszy z zasadą — liczony prawdziwym silnikiem (`sceneTraces`), więc nie
 *  może pokazać czegoś, czego gra nie robi. Współrzędne jak na planszy gry, [-1, 1]². */
export interface CardScene {
  shots: Shot[];
  shapes: Shape[];
  /** brak — scena nie ma dołka (np. płaskie lustro, które niczego nie zbiera) */
  hole?: Vec2;
  /** ile odbić rysujemy; tor kończy się na następnym trafieniu (zwykle ścianie) */
  bounces: number;
}

/** Plansza z zasadą nowej mechaniki. Pokazuje się sama przed poziomem `before`, dopóki ten
 *  nie jest zaliczony; „?" otwiera ją na każdym późniejszym poziomie tej mechaniki. */
export interface Card { id: string; before: string; title: string; text: string; scenes: CardScene[] }

const deg = (x: number): number => (x * Math.PI) / 180;
/** `n` kątów równo wewnątrz wachlarza — ta sama reguła (i + ½) co `launchAngles`. */
const fan = (center: number, width: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => center - width / 2 + ((i + 0.5) * width) / n);
const from = (p: Vec2, angles: number[]): Shot[] => angles.map((angle) => ({ from: p, angle }));

/** Strzały z kilku miejsc, każdy wycelowany w `target`. */
const aimedAt = (target: Vec2, starts: Vec2[]): Shot[] =>
  starts.map((p) => ({ from: p, angle: Math.atan2(target.y - p.y, target.x - p.x) }));

export const CARDS: Card[] = [
  {
    id: "odbicie", before: "odbicie", title: "Odbicie",
    text: "Piłka odbija się od lustra pod tym samym kątem, pod jakim w nie uderzyła.",
    scenes: [{ shots: from(vec(-0.6, -0.7), [deg(65)]), shapes: [segment(vec(-0.6, 0.4), vec(0.6, 0.4))], bounces: 1 }],
  },
  {
    id: "elipsa", before: "ogniska", title: "Elipsa",
    text: "Płaskie lustro rozsyła wachlarz w różne strony. Elipsa zbiera w drugim ognisku wszystko, co wyleci z pierwszego.",
    scenes: [
      { shots: from(vec(0, -0.6), fan(Math.PI / 2, deg(60), 7)), shapes: [segment(vec(-0.8, 0.3), vec(0.8, 0.3))], bounces: 1 },
      {
        shots: from(vec(-0.5, 0), fan(0, 2 * Math.PI, 8)), shapes: [ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8)],
        hole: vec(0.5, 0), bounces: 1,
      },
    ],
  },
  {
    id: "luk", before: "polelipsa", title: "Łuk",
    text: "Lustro nie musi być całe — wystarczy kawałek tam, dokąd lecą piłki. Jego końce też da się przesuwać.",
    scenes: [{
      shots: from(vec(-0.5, -0.3), fan(Math.PI / 2, Math.PI, 8)),
      shapes: [arcEllipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, 0, Math.PI)],
      hole: vec(0.5, -0.3), bounces: 1,
    }],
  },
  {
    // układ poziomu „kaskada" odbity względem osi x — ta sama lekcja, nie jego rozwiązanie
    id: "kaskada", before: "kaskada", title: "Kaskada",
    text: "Piłki zebrane w ognisku lecą dalej, jakby wyleciały z nowej piłki. Ognisko jednego lustra może być ogniskiem następnego.",
    scenes: [{
      shots: from(vec(-0.6, -0.1), fan(deg(-45), deg(60), 8)),
      shapes: [
        arcEllipse(vec(-0.6, -0.1), vec(-0.1, -0.1), 0.4, deg(-120), deg(-20)),
        arcEllipse(vec(-0.1, -0.1), vec(0.5, -0.1), 0.4, deg(40), deg(175)),
      ],
      hole: vec(0.5, -0.1), bounces: 2,
    }],
  },
  {
    id: "parabola", before: "ognisko-paraboli", title: "Parabola",
    text: "Piłka z ogniska paraboli odbija się równolegle do osi. Wiązka równoległa do osi zbiega się z powrotem w ognisku.",
    scenes: [{
      shots: from(vec(-0.3, 0), fan(Math.PI, 2, 8)),
      shapes: [parabola(vec(-0.3, 0), vec(-0.6, 0), { mid: 0, span: 1.6 })],
      bounces: 1,
    }],
  },
  {
    // strzały spoza gałęzi, wycelowane w jej ognisko M = (0.4, 0); dołek w drugim ognisku
    id: "hiperbola", before: "druga-strona", title: "Hiperbola",
    text: "Piłka lecąca w stronę jednego ogniska hiperboli odbija się prosto do drugiego.",
    scenes: [{
      shots: aimedAt(vec(0.4, 0), [
        vec(-0.7, 0.8), vec(-0.2, 0.9), vec(0.2, 0.9), vec(-0.7, -0.8), vec(-0.2, -0.9), vec(0.2, -0.9),
      ]),
      shapes: [hyperbola(vec(-0.4, 0), vec(0.4, 0), 0.2, 1, { mid: 0, span: 2.4 })],
      hole: vec(-0.4, 0), bounces: 1,
    }],
  },
];

/** Punkt daleko za planszą: scena bez dołka i tak potrzebuje go dla `trace`, a tor opuszcza
 *  [-2, 2]² (granica `trace`), zanim zbliży się do niego na promień dołka. */
const NO_HOLE = vec(99, 99);

/** Tory miniscenki — ten sam `trace` co w dowodzie, ze ścianami planszy. */
export function sceneTraces(scene: CardScene): TraceResult[] {
  const curves = [...scene.shapes.map(shapeToPiece), ...BOARD_WALLS.map(shapeToPiece)];
  return scene.shots.map((s) =>
    trace(s.from, fromAngle(s.angle), {
      curves, hole: scene.hole ?? NO_HOLE, holeRadius: HOLE_RADIUS, maxBounces: scene.bounces, maxLength: 10,
    }));
}

/** Plansza, którą gra pokazuje sama przy wejściu na poziom `id` (jeśli ten nie jest zaliczony). */
export const introCard = (id: string): Card | undefined => CARDS.find((c) => c.before === id);

/** Plansza mechaniki, do której należy poziom o indeksie `index`: ostatnia plansza, której
 *  `before` stoi w `ids` nie dalej niż on. Tak „?" na poziomie 22 przypomina parabolę, choć
 *  sama plansza paraboli stoi przed 20. */
export function cardFor(ids: readonly string[], index: number): Card | undefined {
  let found: Card | undefined;
  let foundAt = -1;
  for (const c of CARDS) {
    const at = ids.indexOf(c.before);
    if (at >= 0 && at <= index && at > foundAt) {
      found = c;
      foundAt = at;
    }
  }
  return found;
}
```

Zmiana w `src/levels/index.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -8,8 +8,9 @@ import { STAGE_3 } from "./stage3";
 export * from "./types";
 export * from "./shape";
 export * from "./arc";
 export * from "./span";
+export * from "./cards";
 
 const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };
 
 const STAGE_1: Level[] = [
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 647 testów zielonych.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/cards.ts src/levels/index.ts tests/levels/cards.test.ts
git commit -m "feat(plansze): szesc plansz z zasada i miniscenki liczone silnikiem" -m "Odbicie, elipsa, luk, kaskada, parabola, hiperbola. Rysunek liczy ten sam trace co dowod, wiec nie moze pokazac czegos, czego gra nie robi." -m "<trailer ze zlecenia>"
```

---

## Zadanie 8: Plansze z zasadą w grze — rysowanie, „?" i pokazywanie przy wejściu

Plansza pokazuje się sama przy wejściu na swój poziom, dopóki ten nie jest zaliczony (`autoCard`), także przy pierwszym uruchomieniu gry. Zamyka ją tylko dotknięcie dolnego pasa („Gram"). Przycisk „?" to wiersz „Poziom N / M" na środku u góry (`helpButton`) z małym kółkiem „?" za napisem; otwiera `cardFor` bieżącego poziomu i — jak menu — przerywa trwający dowód. Miniscenki rysuje ta sama warstwa co grę, przez `rectCamera` (plansza [-1, 1]² wpasowana w prostokąt). Gra nie liczy dowodu, gdy plansza jest otwarta.

**Pliki:**
- Zmiana: `src/levels/cards.ts`
- Zmiana: `src/render/camera.ts`
- Zmiana: `src/ui/menu.ts`
- Zmiana: `src/ui/screens.ts`
- Zmiana: `tests/levels/cards.test.ts`
- Zmiana: `tests/render/shapes.test.ts`
- Zmiana: `tests/ui/menu.test.ts`

**Interfejsy:**
- Konsumuje: z zadania 7 — `Card`, `cardFor`, `sceneTraces`, `introCard`; z zadań 5–6 — `shapeStyle`, `parabolaAxis`, `dashedPolyline`.
- Produkuje: `autoCard(id: string, solved: readonly string[]): Card | undefined` (`cards.ts`); `rectCamera(r, margin = 0.06): Camera` (`camera.ts`); `helpButton(width): Rect` i `cardLayout(width, height, count): Rect[]` (`menu.ts`).

- [ ] **Krok 1: Testy (najpierw, przed kodem)**


Zmiana w `tests/levels/cards.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,7 +1,7 @@
 import { describe, it, expect } from "vitest";
 import { Vec2, dot, norm, sub } from "../../src/core/vec";
-import { CARDS, LEVELS, cardFor, introCard, sceneTraces } from "../../src/levels";
+import { CARDS, LEVELS, autoCard, cardFor, introCard, sceneTraces } from "../../src/levels";
 
 const IDS = LEVELS.map((l) => l.id);
 /** Kierunek ostatniego odcinka toru — dokąd piłka leci po ostatnim odbiciu. */
 const lastDir = (path: Vec2[]): Vec2 => norm(sub(path[path.length - 1], path[path.length - 2]));
@@ -53,8 +53,15 @@ describe("która plansza dla którego poziomu", () => {
   it("plansza pokazuje się sama tylko na swoim poziomie", () => {
     expect(introCard("ogniska")?.id).toBe("elipsa");
     expect(introCard("rozmiar")).toBeUndefined();
   });
+
+  it("sama — dopóki poziom nie jest zaliczony; potem tylko pod „?\"", () => {
+    expect(autoCard("ogniska", [])?.id).toBe("elipsa");
+    expect(autoCard("ogniska", ["skos"])?.id).toBe("elipsa");
+    expect(autoCard("ogniska", ["ogniska"])).toBeUndefined();
+    expect(autoCard("rozmiar", [])).toBeUndefined();
+  });
 });
 
 describe("sceny plansz pokazują to, co mówi zdanie", () => {
   it("każda scena się liczy, a scena z dołkiem trafia wszystkimi strzałami", () => {
```

Zmiana w `tests/render/shapes.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,8 +1,8 @@
 import { describe, it, expect } from "vitest";
 import { Vec2, dist, fromAngle, vec } from "../../src/core/vec";
 import { ellipseFromFoci, evalConic, hyperbolaFromFoci, lineThrough, parabolaFromFocusVertex } from "../../src/core/conic";
-import { makeCamera } from "../../src/render/camera";
+import { makeCamera, rectCamera } from "../../src/render/camera";
 import { conicPolyline, parabolaAxis, piecePolyline, shotArrow, twinPolyline } from "../../src/render/shapes";
 import { Piece, onPiece, whole } from "../../src/core/piece";
 import {
   LEVELS, ParabolaShape, arcEllipse, ellipse, ellipsePoint, hyperbola, parabola, segment, shapeFrame, shapeToPiece,
@@ -254,4 +254,20 @@ describe("strzałka strzału", () => {
     expect(trzon[1].x).toBeCloseTo(d.x, 12);
     expect(trzon[1].y).toBeCloseTo(d.y, 12);
   });
 });
+
+describe("kamera prostokąta (miniscenki)", () => {
+  it("plansza [-1, 1]² wpasowana w prostokąt i wyśrodkowana w nim", () => {
+    const r = { x: 40, y: 200, w: 300, h: 200 };
+    const c = rectCamera(r, 0);
+    expect(c.toScreen(vec(0, 0))).toEqual(vec(190, 300));
+    // krótszy bok wyznacza skalę: wysokość 200 → 100 px na jednostkę
+    expect(c.scale).toBeCloseTo(100, 9);
+    const g = c.toScreen(vec(-1, 1));
+    expect(g.x).toBeCloseTo(90, 9);
+    expect(g.y).toBeCloseTo(200, 9);
+    const back = c.toWorld(c.toScreen(vec(0.3, -0.7)));
+    expect(back.x).toBeCloseTo(0.3, 12);
+    expect(back.y).toBeCloseTo(-0.7, 12);
+  });
+});
```

Zmiana w `tests/ui/menu.test.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,10 +1,10 @@
 import { describe, it, expect } from "vitest";
 import { readFileSync } from "node:fs";
 import { vec } from "../../src/core/vec";
 import {
-  ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, editAction, hitRect, hitTile, inActionBand, menuLayout, playArea,
-  resultBanner, settingsButton, settingsLayout, winAction, winLabels,
+  ACTION_BAND, MENU_BUTTON, Rect, TOP_BAND, cardLayout, editAction, helpButton, hitRect, hitTile, inActionBand,
+  menuLayout, playArea, resultBanner, settingsButton, settingsLayout, winAction, winLabels,
 } from "../../src/ui/menu";
 import { makeCamera } from "../../src/render/camera";
 import { LEVELS } from "../../src/levels";
 
@@ -210,4 +210,36 @@ describe("napisy po dowodzie", () => {
     expect(resultBanner(1, 0).title).toBe("Wpadła");
     expect(resultBanner(1, 1)).toEqual({ title: "Chybiła", note: "Zobacz, którędy poleciała." });
   });
 });
+
+describe("przycisk „?\"", () => {
+  for (const w of [320, 390, 844, 1280]) {
+    it(`szerokość ${w}: wygodny cel dotykowy, na środku u góry, nie wchodzi na ☰ ani ⚙`, () => {
+      const b = helpButton(w);
+      expect(Math.min(b.w, b.h)).toBeGreaterThanOrEqual(44);
+      expect(b.x + b.w / 2).toBeCloseTo(w / 2, 9);
+      expect(b.y + b.h).toBeLessThanOrEqual(TOP_BAND);
+      expect(overlap(b, MENU_BUTTON)).toBe(false);
+      expect(overlap(b, settingsButton(w))).toBe(false);
+    });
+  }
+});
+
+describe("plansza z zasadą — układ rysunków", () => {
+  for (const [name, w, h] of [["pion", 390, 844], ["poziom", 844, 390], ["mały", 320, 568]] as const) {
+    for (const n of [1, 2]) {
+      it(`${name}, ${n === 1 ? "jeden rysunek" : "dwa rysunki"}: kwadraty pod tekstem, nad „Gram", bez nakładania`, () => {
+        const rs = cardLayout(w, h, n);
+        expect(rs).toHaveLength(n);
+        rs.forEach((r, i) => {
+          expect(r.w).toBeCloseTo(r.h, 9);
+          expect(r.w, `rysunek ${i}`).toBeGreaterThan(100);
+          expect(r.x >= 0 && r.x + r.w <= w, `rysunek ${i} w poziomie`).toBe(true);
+          expect(r.y, `rysunek ${i} pod tekstem`).toBeGreaterThanOrEqual(150);
+          expect(r.y + r.h, `rysunek ${i} nad pasem`).toBeLessThanOrEqual(h * ACTION_BAND);
+          rs.slice(i + 1).forEach((u) => expect(overlap(r, u)).toBe(false));
+        });
+      });
+    }
+  }
+});
```

- [ ] **Krok 2: Uruchom testy — mają nie przejść**

Uruchom: `npx vitest run tests/ui/menu.test.ts tests/render/shapes.test.ts tests/levels/cards.test.ts`
Oczekiwane: NIE przechodzą — `helpButton`, `cardLayout`, `rectCamera`, `autoCard` nie istnieją.

- [ ] **Krok 3: Implementacja**

W `screens.ts` kolejność w `pointerdown` jest celowa: otwarta plansza połyka KAŻDE dotknięcie (zamyka ją tylko dolny pas), potem „?", dopiero potem ☰ i ⚙. W `draw()` otwarta plansza rysuje się na wierzchu i kończy rysowanie (`return`) — przyciski ☰, ⚙ i „?" pod nią nie działają, więc nie są rysowane.

Zmiana w `src/levels/cards.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -106,11 +106,16 @@ export function sceneTraces(scene: CardScene): TraceResult[] {
       curves, hole: scene.hole ?? NO_HOLE, holeRadius: HOLE_RADIUS, maxBounces: scene.bounces, maxLength: 10,
     }));
 }
 
-/** Plansza, którą gra pokazuje sama przy wejściu na poziom `id` (jeśli ten nie jest zaliczony). */
+/** Plansza, która stoi przed poziomem `id` (albo żadna). */
 export const introCard = (id: string): Card | undefined => CARDS.find((c) => c.before === id);
 
+/** Plansza, którą gra pokazuje sama przy wejściu na poziom `id`: jego plansza, dopóki poziom
+ *  nie jest zaliczony. Zaliczony — gracz zna zasadę, plansza została pod „?". */
+export const autoCard = (id: string, solved: readonly string[]): Card | undefined =>
+  solved.includes(id) ? undefined : introCard(id);
+
 /** Plansza mechaniki, do której należy poziom o indeksie `index`: ostatnia plansza, której
  *  `before` stoi w `ids` nie dalej niż on. Tak „?" na poziomie 22 przypomina parabolę, choć
  *  sama plansza paraboli stoi przed 20. */
 export function cardFor(ids: readonly string[], index: number): Card | undefined {
```

Zmiana w `src/render/camera.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -23,4 +23,17 @@ export function makeCamera(
     toScreen: (p) => vec(cx + p.x * scale, cy - p.y * scale),
     toWorld: (p) => vec((p.x - cx) / scale, (cy - p.y) / scale),
   };
 }
+
+/** Kwadrat planszy [-1, 1]² wpasowany w prostokąt `r` z marginesem i wyśrodkowany w nim —
+ *  miniscenka na planszy z zasadą używa tych samych funkcji rysujących co gra. */
+export function rectCamera(r: { x: number; y: number; w: number; h: number }, margin = 0.06): Camera {
+  const scale = (Math.min(r.w, r.h) * (1 - 2 * margin)) / 2;
+  const cx = r.x + r.w / 2;
+  const cy = r.y + r.h / 2;
+  return {
+    scale,
+    toScreen: (p) => vec(cx + p.x * scale, cy - p.y * scale),
+    toWorld: (p) => vec((p.x - cx) / scale, (cy - p.y) / scale),
+  };
+}
```

Zmiana w `src/ui/menu.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -8,8 +8,14 @@ export const MENU_BUTTON: Rect = { x: 6, y: 6, w: 44, h: 44 };
 
 /** Przycisk ⚙ w prawym górnym rogu — lustrzane odbicie ☰; zależy od szerokości ekranu. */
 export const settingsButton = (width: number): Rect => ({ x: width - 6 - 44, y: 6, w: 44, h: 44 });
 
+/** Przycisk „?" (plansza z zasadą): wiersz z numerem poziomu na środku u góry. Nie obok ⚙ —
+ *  tam na telefonie zachodziłby na najdłuższe tytuły („Teraz rozmiar ma znaczenie" ma ok.
+ *  250 px przy 390 px ekranu). 44 px wysokości jak każdy cel dotykowy; zahacza o górę tytułu,
+ *  ale tytuł niczego nie robi po dotknięciu, więc nic nie zasłania. */
+export const helpButton = (width: number): Rect => ({ x: width / 2 - 80, y: 0, w: 160, h: 44 });
+
 /** Dolny pas ekranu, w którym leżą przyciski akcji (ten sam próg co „Sprawdź”). */
 export const ACTION_BAND = 0.86;
 
 /** Czy punkt leży w dolnym pasie akcji (Reset / Sprawdź / przyciski ekranów). */
@@ -107,4 +113,25 @@ export function settingsLayout(width: number, height: number, count: number): Re
     y: top + i * (ROW_H + ROW_GAP),
     w, h: ROW_H,
   }));
 }
+
+/** Górna krawędź rysunków planszy z zasadą: pod tytułem (34 px) i zdaniem zasady zawiniętym
+ *  w najwyżej cztery linie po 20 px od 70 px. */
+const CARD_SCENES_TOP = 160;
+
+/** Kwadratowe pola na `count` miniscenek planszy z zasadą: między tekstem a dolnym pasem
+ *  („Gram"), obok siebie, gdy jest szerzej niż wyżej, inaczej jedna pod drugą. */
+export function cardLayout(width: number, height: number, count: number): Rect[] {
+  const area = { x: SIDE, y: CARD_SCENES_TOP, w: width - 2 * SIDE, h: height * ACTION_BAND - GAP - CARD_SCENES_TOP };
+  const side = area.w >= area.h ? "obok" : "pod";
+  const along = side === "obok" ? area.w : area.h;
+  const across = side === "obok" ? area.h : area.w;
+  const size = Math.max(0, Math.min(across, (along - (count - 1) * GAP) / count));
+  const total = count * size + (count - 1) * GAP;
+  return Array.from({ length: count }, (_, i) => {
+    const offset = (along - total) / 2 + i * (size + GAP);
+    return side === "obok"
+      ? { x: area.x + offset, y: area.y + (area.h - size) / 2, w: size, h: size }
+      : { x: area.x + (area.w - size) / 2, y: area.y + offset, w: size, h: size };
+  });
+}
```

Zmiana w `src/ui/screens.ts` (diff względem stanu po poprzednim zadaniu):

```diff
@@ -1,7 +1,9 @@
 import { Vec2, vec } from "../core/vec";
-import { LEVELS, SNAP_RADIUS, Shape, shapeFoci, shapeToPiece } from "../levels";
-import { makeCamera } from "../render/camera";
+import {
+  Card, LEVELS, SNAP_RADIUS, Shape, autoCard, cardFor, sceneTraces, shapeFoci, shapeToPiece,
+} from "../levels";
+import { makeCamera, rectCamera } from "../render/camera";
 import {
   PALETTE, SECTOR_REACH, boardFrame, dashedPolyline, drawPiece, glowDot, glowPolyline, handleShape, holeMark,
   sectorWedge,
 } from "../render/draw";
@@ -10,10 +12,10 @@ import { handleMark, shapeStyle } from "../render/style";
 import { positionAt, trailSegment } from "../render/trails";
 import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
 import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
 import {
-  MENU_BUTTON, editAction, hitRect, hitTile, inActionBand, menuLayout, playArea, resultBanner, settingsButton,
-  settingsLayout, winAction, winLabels,
+  MENU_BUTTON, cardLayout, editAction, helpButton, hitRect, hitTile, inActionBand, menuLayout, playArea, resultBanner,
+  settingsButton, settingsLayout, winAction, winLabels,
 } from "./menu";
 import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
 import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";
 
@@ -29,8 +31,10 @@ export function mount(canvas: HTMLCanvasElement): void {
   let game: GameState = newGame(LEVELS[levelIndex]);
   let menuOpen = false;
   let settings = loadSettings(store);
   let settingsOpen = false;
+  /** otwarta plansza z zasadą; `null` — żadna */
+  let card: Card | null = autoCard(LEVELS[levelIndex].id, progress.solved) ?? null;
   let dragging: HandleRef | null = null;
   let pointer: Vec2 | null = null;
   let consumedReset = false;
   let last = performance.now();
@@ -65,8 +69,10 @@ export function mount(canvas: HTMLCanvasElement): void {
     levelIndex = index;
     game = newGame(LEVELS[index]);
     progress = { ...progress, lastId: LEVELS[index].id };
     saveProgress(store, progress);
+    // pierwszy poziom nowej mechaniki, jeszcze niezaliczony: najpierw zasada
+    card = autoCard(LEVELS[index].id, progress.solved) ?? null;
   }
 
   function toggleMenu(): void {
     menuOpen = !menuOpen;
@@ -74,8 +80,16 @@ export function mount(canvas: HTMLCanvasElement): void {
     // Menu przerywa trwający dowód: po zamknięciu gracz wraca do edycji swoich elementów.
     if (menuOpen && game.phase === "dowod") game = retry(game);
   }
 
+  /** „?" — plansza mechaniki bieżącego poziomu. Jak menu przerywa trwający dowód. */
+  function openHelp(): void {
+    card = cardFor(LEVELS.map((l) => l.id), levelIndex) ?? null;
+    menuOpen = false;
+    settingsOpen = false;
+    if (game.phase === "dowod") game = retry(game);
+  }
+
   function toggleSettings(): void {
     settingsOpen = !settingsOpen;
     menuOpen = false;
     // jak menu poziomów: ustawienia przerywają trwający dowód
@@ -100,8 +114,20 @@ export function mount(canvas: HTMLCanvasElement): void {
   };
 
   canvas.addEventListener("pointerdown", (e) => {
     const p = toScreenPoint(e);
+    if (card !== null) {
+      // plansza z zasadą zamyka się tylko przyciskiem „Gram" (dolny pas) — przypadkowe
+      // dotknięcie tekstu czy rysunku nie zabiera jej sprzed oczu
+      if (inActionBand(p, viewH())) card = null;
+      consumedReset = true;
+      return;
+    }
+    if (hitRect(helpButton(viewW()), p)) {
+      openHelp();
+      consumedReset = true;
+      return;
+    }
     if (hitRect(MENU_BUTTON, p)) {
       toggleMenu();
       consumedReset = true;
       return;
@@ -199,9 +225,9 @@ export function mount(canvas: HTMLCanvasElement): void {
   function frame(now: number): void {
     const dt = Math.min((now - last) / 1000, 0.05);
     last = now;
     time = now / 1000;
-    if (!menuOpen && !settingsOpen) {
+    if (!menuOpen && !settingsOpen && card === null) {
       const before = game.phase;
       game = advance(game, dt);
       if (before === "dowod" && game.phase === "wygrana") {
         progress = markSolved(progress, game.level.id);
@@ -328,10 +354,15 @@ export function mount(canvas: HTMLCanvasElement): void {
     }
 
     if (menuOpen) drawMenu();
     if (settingsOpen) drawSettings();
+    if (card !== null) {
+      drawCard(card);
+      return;
+    }
     drawMenuButton();
     drawSettingsButton();
+    drawHelpButton();
 
     function banner(title: string, hint: string, action: string | [string, string]): void {
       const w = viewW();
       const h = viewH();
@@ -375,8 +406,57 @@ export function mount(canvas: HTMLCanvasElement): void {
         ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 + i * 6 - 1, 20, 2);
       }
     }
 
+    /** „?" w kółku tuż za napisem „Poziom N / M" (ten sam wiersz, `helpButton` obejmuje oba).
+     *  Kółko liniami i „?" znakiem ASCII — nie polegamy na glifie ⓘ w czcionce telefonu. */
+    function drawHelpButton(): void {
+      ctx.font = "12px system-ui, sans-serif";
+      const tw = ctx.measureText(`Poziom ${levelIndex + 1} / ${LEVELS.length}`).width;
+      const cx = viewW() / 2 + tw / 2 + 14;
+      ctx.strokeStyle = PALETTE.muted;
+      ctx.lineWidth = 1.5;
+      ctx.beginPath();
+      ctx.arc(cx, 18, 8, 0, 2 * Math.PI);
+      ctx.stroke();
+      ctx.textAlign = "center";
+      ctx.fillStyle = PALETTE.muted;
+      ctx.fillText("?", cx, 22);
+      ctx.textAlign = "left";
+    }
+
+    /** Plansza z zasadą: tytuł, zdanie, miniscenki liczone silnikiem i „Gram" w dolnym pasie.
+     *  Rysunek tymi samymi funkcjami co gra — te same kolory rodzajów, tory i dołek. */
+    function drawCard(k: Card): void {
+      const w = viewW();
+      const h = viewH();
+      ctx.fillStyle = PALETTE.overlay;
+      ctx.fillRect(0, 0, w, h);
+      ctx.textAlign = "center";
+      ctx.fillStyle = PALETTE.text;
+      ctx.font = "600 18px system-ui, sans-serif";
+      ctx.fillText(k.title, w / 2, 34);
+      ctx.font = "15px system-ui, sans-serif";
+      wrapByWords(k.text, w - 32).slice(0, 4).forEach((line, i) => ctx.fillText(line, w / 2, 70 + i * 20));
+      cardLayout(w, h, k.scenes.length).forEach((r, i) => {
+        const scene = k.scenes[i];
+        const rc = rectCamera(r);
+        boardFrame(ctx, rc, PALETTE.board, PALETTE.frame, PALETTE.frameGlow, 1);
+        for (const s of scene.shapes) {
+          const st = shapeStyle(s, "gracz");
+          if (s.kind === "parabola") dashedPolyline(ctx, rc, parabolaAxis(s), st.line, 1);
+          drawPiece(ctx, rc, shapeToPiece(s), st.line, st.glow, 2);
+        }
+        for (const t of sceneTraces(scene)) glowPolyline(ctx, rc, t.path, PALETTE.trail, PALETTE.trailGlow, 1.5);
+        if (scene.hole !== undefined) holeMark(ctx, rc, scene.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 6);
+        for (const shot of scene.shots) glowDot(ctx, rc, shot.from, PALETTE.ball, PALETTE.ballGlow, 4);
+      });
+      ctx.font = "600 16px system-ui, sans-serif";
+      ctx.fillStyle = PALETTE.curve;
+      ctx.fillText("Gram", w / 2, h * 0.93);
+      ctx.textAlign = "left";
+    }
+
     /** Zębatka rysowana liniami — nie polegamy na glifie ⚙ w czcionce telefonu. */
     function drawSettingsButton(): void {
       const b = settingsButton(viewW());
       const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
```

- [ ] **Krok 4: Uruchom wszystko — ma przejść**

`npx tsc --noEmit` — czysto. `npx vitest run` — 659 testów zielonych. `npm run build` — paczka ok. 15.3 KB gzip.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/cards.ts src/render/camera.ts src/ui/menu.ts src/ui/screens.ts tests/levels/cards.test.ts tests/render/shapes.test.ts tests/ui/menu.test.ts
git commit -m "feat(plansze): plansza z zasada przy wejsciu na poziom i przycisk ?" -m "Sama przed pierwszym poziomem mechaniki, dopoki nie jest zaliczony; zamyka ja Gram. Przycisk ? w wierszu z numerem poziomu otwiera zasade biezacej mechaniki." -m "<trailer ze zlecenia>"
```

---

## Zadanie 9: Weryfikacja końcowa i dokument decyzji

**Pliki:**
- Nowy: `docs/superpowers/decyzje-wprowadzenia.md`

**Interfejsy:** brak — tylko dokumentacja i pomiary.

- [ ] **Krok 1: Pomiary na kodzie końcowym**

Uruchom i zapisz wyniki (dosłownie, z commitem, na którym mierzono):

```bash
npx tsc --noEmit
npx vitest run
npm run build
for id in odbicie dwa-odbicia za-rogiem druga-strona wspolne-ognisko; do npx vite-node scripts/sprawdz-poziom.ts $id; done
```

Oczekiwane: tsc czysto; 659 testów zielonych; paczka < 100 KB gzip (ok. 15.3 KB); poziomy etapu 0 — rozwiązanie 1/1, start 0/1; `druga-strona` i `wspolne-ognisko` — rozwiązanie 8/8, start 0/8.

- [ ] **Krok 2: Dokument decyzji**

Napisz `docs/superpowers/decyzje-wprowadzenia.md` (po polsku, dla właściciela projektu), z sekcjami:

1. **Co zostało zrobione** — cztery uwagi z `do poprawy.txt` i gdzie każda jest zrealizowana (pliki, poziomy, plansze).
2. **Decyzje właściciela z brainstormingu** — bilard z jedną piłką i ruchomym odcinkiem; plansza z zasadą przy pierwszym poziomie mechaniki; kolor + kształt uchwytów; oś zawsze, przerywana; podejście A (etap 0 + plansze); przygaszone kolorowe stałe krzywe zamiast czerwonych.
3. **Odstępstwa planu od specyfikacji** — pięć punktów z nagłówka planu, każdy z powodem.
4. **Kalibracja** — tabela z kroku 1 (rozwiązanie, start, obrót ±3° dla etapu 0) i wyniki scen plansz.
5. **Nowa numeracja** — tabela: nowy numer → identyfikator → stary numer (1–27), żeby właściciel mógł przełożyć listy kontrolne etapów 1–3.
6. **Lista kontrolna przejścia w przeglądarce** — dla właściciela, na telefonie i komputerze:
   - pierwsze uruchomienie (wyczyszczone dane witryny): od razu plansza „Odbicie"; „Gram" ją zamyka; dotknięcie tekstu/rysunku nie zamyka;
   - trzy poziomy bilardowe: strzałka strzału widoczna; uchwyty odcinka (dwa kwadraty na końcach, kwadrat w środku) dają się złapać osobno; środek nie wyprowadza lustra za ramkę; baner „Wpadła" / „Chybiła";
   - plansze pokazują się same przed `ogniska`, `polelipsa`, `kaskada`, `ognisko-paraboli`, `druga-strona` — i nie pokazują się ponownie po zaliczeniu;
   - „?" w wierszu „Poziom N / M" na każdym poziomie otwiera właściwą planszę (np. na `obrot-osi` — parabolę);
   - kolory: elipsa turkus, parabola fiolet, hiperbola fuksja, lustro błękit; stałe krzywe przygaszone; okręgi i bandy czerwone; czy fuksja nie myli się z czerwienią;
   - uchwyty: pierścienie na ogniskach, romb na wierzchołku paraboli;
   - oś paraboli przerywana na każdym poziomie z parabolą, także stałej;
   - powrót ze starym zapisem: jeśli przeglądarka ma zapis sprzed tej zmiany, gra otwiera ten sam poziom co wcześniej (np. „Wspólne ognisko"), nie ten sam numer.
7. **Odłożone** — z poprzednich etapów bez zmian (szare strefy 1–16, 18, 20; „igła"; uchwyt rozmiaru elipsy poza planszą na 9 poziomach) oraz etap 4 z `do poprawy.txt`.

Nie zmieniaj `do poprawy.txt`.

- [ ] **Krok 3: Commit**

```bash
git add docs/superpowers/decyzje-wprowadzenia.md
git commit -m "docs: decyzje wprowadzen i wygladu, kalibracja i lista kontrolna" -m "Pomiary na kodzie koncowym, nowa numeracja poziomow i przejscie w przegladarce dla wlasciciela." -m "<trailer ze zlecenia>"
```
