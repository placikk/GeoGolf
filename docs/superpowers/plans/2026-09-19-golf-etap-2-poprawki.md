# Golf geometryczny — plan implementacji (poprawki po etapie 2)

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> `superpowers:subagent-driven-development` (zalecane) albo
> `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu.
> Kroki używają składni checkboxów (`- [ ]`) do śledzenia postępu.

**Cel:** Pięć poprawek zgłoszonych przez właściciela po etapie 2: brzeg planszy jest
ścianą, „Jeszcze raz” zachowuje ustawienie, ostatni poziom kończy się „Menu”, poziom 12
nie daje się przejść dużą elipsą, a poziomy 13 i 15 — jedną elipsą.

**Architektura:** Ściany to cztery zwykłe odcinki dokładane przez `levelCurves`
(rdzeń bez zmian). Zablokowany rozmiar to parametr `sizeLocked` w `applyDrag`, który
trzyma `a` i ogranicza odsunięcie ogniska. „Jeszcze raz” to nowe przejście stanu
`retry`. Ekran wygranej ostatniego poziomu opisują czyste funkcje w `ui/menu.ts`.

**Stos:** TypeScript (strict), Canvas 2D, Vite 8, Vitest 5. **Zero zależności
produkcyjnych.**

**Spec:** `docs/superpowers/specs/2026-09-19-golf-etap-2-poprawki-design.md`
(obowiązują też spec etapu 1 i etapu 2 tam, gdzie ten ich nie zmienia).

## Ograniczenia globalne

- **Zero zależności produkcyjnych.** `dependencies` w `package.json` zostaje puste.
- **Budżet paczki: < 100 KB gzip** (`tests/budget.test.ts`).
- **`shadowBlur` / `shadowColor` zakazane.** Poświata wyłącznie przez podwójny obrys.
- **`src/core/` importuje tylko z `src/core/`** (`tests/layering.test.ts`). Ten plan
  nie zmienia `src/core/`.
- **Świat to kwadrat `[-1, 1] × [-1, 1]`, oś Y w górę.** Ściana stoi na brzegu tego
  kwadratu, nie na brzegu ekranu (decyzja właściciela).
- **Tolerancja dołka `0.02 * DIAGONAL`, promień przyskakiwania `0.05 * DIAGONAL`** — bez zmian.
- **Wygrana to „wszystkie wpadną”** — bez zmian.
- **Identyfikatory 16 poziomów zostają** — zapisany postęp gracza musi przetrwać.
- **Testy istniejące przechodzą bez zmiany oczekiwań**, z jednym wyjątkiem opisanym
  w zadaniu 2 (test kolejności `levelCurves`, którego przedmiot ta zmiana rozszerza).
- **Testy graniczne ćwiczą samą granicę**; fixture'y niesymetryczne wokół zera.
- **Język:** nazwy w kodzie po angielsku, komentarze i teksty dla gracza po polsku.
- **TypeScript `strict`, `noUnusedLocals`, `tsconfig` obejmuje `tests/`.** Każde
  zadanie kończy się zielonym `npx tsc --noEmit && npm test`.
- **Gałąź:** `poprawki-etap-2` (spec już na niej zacommitowany), katalog projektu.
  Commit po każdym zadaniu; wiadomość kończy się linią
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Sprawdzone przed zapisaniem planu

Cały plan zaimplementowano na prototypie (tymczasowy worktree): 270 testów zielonych,
`tsc` czysty. Mutacje sprawdzone: przywrócenie starego okręgu na poziomie 12 czerwieni
test regresyjny; wyłączenie gałęzi `sizeLocked` czerwieni 3 testy uchwytów.

---

## Struktura plików

| Plik | Zmiana |
|---|---|
| `src/ui/handles.ts` | `applyDrag(state, handle, to, sizeLocked = false)` |
| `src/levels/shape.ts` | `BOARD_WALLS`, `levelCurves` dokłada ściany |
| `src/levels/stage2.ts` | poziom 12: okrąg `(0, −0.5)`, `r = 0.25`, rozwiązanie `a = 0.52` |
| `src/ui/game.ts` | `retry(state)` |
| `src/ui/menu.ts` | `WinAction`, `winAction(..., isLast)`, `winLabels(isLast, allSolved)` |
| `src/ui/screens.ts` | przekazanie `sizeLocked`, ramka, `retry`, ekran ostatniego poziomu |
| `tests/ui/handles.test.ts`, `tests/levels.test.ts`, `tests/levels/shape.test.ts`, `tests/ui/game.test.ts`, `tests/ui/menu.test.ts` | nowe testy |
| `docs/superpowers/decyzje-etap-2.md` | dopisane rozstrzygnięcia (zadanie 5) |

---

## Zadanie 1: Zablokowany rozmiar naprawdę stoi

Spec §6. Dziś `applyDrag` podnosi `a`, gdy ogniska rozjadą się dalej niż `2a`, i nigdy
go nie obniża — gracz rozsuwa ogniska i zostaje z dużą elipsą mimo zablokowanego
rozmiaru. Tak da się przejść poziomy 13 i 15 jedną elipsą przez piłkę i dołek.

**Pliki:**
- Zmiana: `src/ui/handles.ts`, `src/ui/screens.ts`
- Test: `tests/ui/handles.test.ts`, `tests/levels.test.ts`

**Interfejsy:**
- Produkuje: `applyDrag(state: EllipseShape, handle: Handle, to: Vec2, sizeLocked = false): EllipseShape`.
  Przy `sizeLocked = true` i uchwycie ogniska: `a` bez zmian; ognisko w odległości
  najwyżej `2a − 2·MIN_GAP` od drugiego ogniska (na prostej od drugiego ogniska
  w stronę palca). Pozostałe przypadki bez zmian.

- [ ] **Krok 1: Testy uchwytów**

Na końcu `tests/ui/handles.test.ts` (`ellipse`, `vec`, `dist`, `applyDrag` są już
zaimportowane):

```ts
describe("zablokowany rozmiar stoi", () => {
  // ognisko2 poza zerem i niesymetrycznie: zasięg liczony od złego ogniska by się ujawnił
  const locked = ellipse(vec(-0.1, 0.2), vec(0.3, 0.2), 0.5);

  it("ognisko przeciągnięte daleko zatrzymuje się na 2a − 2·MIN_GAP od drugiego, a się nie zmienia", () => {
    const next = applyDrag(locked, "ognisko1", vec(-3, 0.2), true);
    expect(next.a).toBe(0.5);
    expect(dist(next.f1, next.f2)).toBeCloseTo(2 * 0.5 - 2e-3, 12);
    expect(next.f1.y).toBeCloseTo(0.2, 12);                 // na prostej od f2 w stronę palca
    expect(next.f1.x).toBeLessThan(next.f2.x);
    expect(next.f2).toBe(locked.f2);
  });

  it("ognisko2 też: kierunek od ogniska1 w stronę palca", () => {
    const next = applyDrag(locked, "ognisko2", vec(0.3, 5), true);
    expect(next.a).toBe(0.5);
    expect(dist(next.f1, next.f2)).toBeCloseTo(1 - 2e-3, 12);
    const dir = { x: next.f2.x - locked.f1.x, y: next.f2.y - locked.f1.y };
    const want = { x: 0.3 - locked.f1.x, y: 5 - locked.f1.y };
    expect(dir.x * want.y - dir.y * want.x).toBeCloseTo(0, 12);   // współliniowe
  });

  it("w zasięgu ognisko idzie dokładnie pod palec", () => {
    const finger = vec(-0.5, 0.25);
    expect(applyDrag(locked, "ognisko1", finger, true).f1).toBe(finger);
  });

  it("odblokowany rozmiar: jak dotąd, a rośnie razem z ogniskami", () => {
    const next = applyDrag(locked, "ognisko1", vec(-3, 0.2), false);
    expect(next.f1).toEqual(vec(-3, 0.2));
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
  });

  it("rozsunięcie i zsunięcie ognisk przy blokadzie nie zostawia większej elipsy", () => {
    let s = applyDrag(locked, "ognisko1", vec(-3, 0.2), true);
    s = applyDrag(s, "ognisko1", locked.f1, true);
    expect(s.a).toBe(0.5);
  });
});
```

(`MIN_GAP = 1e-3` jest prywatną stałą `ui/handles.ts`, stąd `2e-3` w testach.)

- [ ] **Krok 2: Test regresyjny kaskad**

Na końcu bloku `describe("poziomy", …)` w `tests/levels.test.ts` (przed jego
zamykającym `});`; `dist`, `Level`, `LEVELS`, `solutions` już są w pliku):

```ts
  // Kaskada: w zapisanym rozwiązaniu jakieś ognisko leży poza piłką i dołkiem. Na takim
  // poziomie element z zablokowanym rozmiarem nie może zastąpić całej kaskady jedną
  // elipsą przez piłkę i dołek — ma za mały rozmiar, żeby w ogóle ją zbudować.
  // (Poziom 9 nie jest kaskadą: tam jedna elipsa przez piłkę i dołek JEST rozwiązaniem.)
  const same = (p: { x: number; y: number }, q: { x: number; y: number }) => dist(p, q) < 1e-12;
  const isCascade = (level: Level) =>
    solutions(level).some((s) => [s.f1, s.f2].some((f) => !same(f, level.ball) && !same(f, level.hole)));

  it("kaskady istnieją tam, gdzie powinny: 13, 14, 15, 16", () => {
    expect(LEVELS.filter(isCascade).map((l) => l.id)).toEqual(
      ["kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2"],
    );
  });

  it.each(LEVELS.filter(isCascade).map((l) => [l.id, l] as const))(
    "poziom %s: element z zablokowanym rozmiarem nie zbuduje jednej elipsy przez piłkę i dołek",
    (_id, level) => {
      for (const piece of level.pieces) {
        if (!piece.locked.includes("rozmiar")) continue;
        expect(2 * piece.solution.a).toBeLessThanOrEqual(dist(level.ball, level.hole));
      }
    },
  );
```

Ten test przechodzi już dziś (dane są dobre); pilnuje, żeby przyszła zmiana danych
nie otworzyła dziury z powrotem. Właściwa naprawa jest w mechanice (krok 4).

- [ ] **Krok 3: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/handles.test.ts`
Expected: FAIL — ognisko idzie pod palec i `a` rośnie mimo `sizeLocked = true`
(czwarty argument jest ignorowany).

- [ ] **Krok 4: Implementacja w `src/ui/handles.ts`**

Import: `import { Vec2, add, dist, scale, sub } from "../core/vec";`

Zastąp nagłówek `applyDrag` i dopisz gałąź przed ostatnimi dwiema liniami funkcji:

```ts
/** `sizeLocked`: uchwyt rozmiaru tego elementu jest zablokowany. Wtedy `a` NIGDY się nie
 *  zmienia, a przeciągane ognisko zatrzymuje się na odległości 2a − 2·MIN_GAP od drugiego
 *  ogniska (na prostej od drugiego ogniska w stronę palca). Bez tego rozsunięcie ognisk
 *  podnosiło `a` na stałe i zablokowany rozmiar dało się obejść. */
export function applyDrag(state: EllipseShape, handle: Handle, to: Vec2, sizeLocked = false): EllipseShape {
  if (handle === "poczatek" || handle === "koniec") {
    // …bez zmian
  }
  if (handle === "rozmiar") {
    // …bez zmian
  }
  if (sizeLocked) {
    const other = handle === "ognisko1" ? state.f2 : state.f1;
    const reach = 2 * state.a - 2 * MIN_GAP;
    const d = dist(to, other);
    const at = d <= reach ? to : add(other, scale(sub(to, other), reach / d));
    return handle === "ognisko1" ? { ...state, f1: at } : { ...state, f2: at };
  }
  const next = handle === "ognisko1" ? { ...state, f1: to } : { ...state, f2: to };
  return { ...next, a: Math.max(next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
```

- [ ] **Krok 5: `src/ui/screens.ts` — przekazanie blokady**

W `pointermove` zastąp linię z `applyDrag(s, id, snapped)`:

```ts
    const sizeLocked = game.level.pieces[piece].locked.includes("rozmiar");
    const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped, sizeLocked) : s));
```

- [ ] **Krok 6: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 7: Commit**

```bash
git add src/ui/handles.ts src/ui/screens.ts tests/ui/handles.test.ts tests/levels.test.ts
git commit -m "fix(ui): zablokowany rozmiar stoi - ognisko nie odsunie sie dalej niz 2a"
```

---

## Zadanie 2: Brzeg planszy jest ścianą

Spec §2. Pomiar przed decyzją: z czterema ścianami każde z 16 rozwiązań nadal
wygrywa, żaden start nie wygrywa, a liczba przesunięć o 5%, które wygrywają, się nie
zmienia.

**Pliki:**
- Zmiana: `src/levels/shape.ts`, `src/ui/screens.ts`
- Test: `tests/levels/shape.test.ts`

**Interfejsy:**
- Produkuje: `BOARD_WALLS: SegmentShape[]` (eksport z `src/levels/shape.ts`,
  reeksportowany przez `src/levels/index.ts`); `levelCurves(level, pieces)` zwraca
  elementy gracza, przeszkody, a na końcu cztery ściany.

- [ ] **Krok 1: Testy**

W `tests/levels/shape.test.ts` dopisz do importu z `../../src/levels` nazwę
`BOARD_WALLS`, a pod importem `core/piece` dodaj:

```ts
import { trace } from "../../src/core/trace";
import { runProof } from "../../src/core/verify";
```

Test „levelCurves: najpierw elementy gracza, potem przeszkody” zastąp (jego przedmiot
— kolejność listy — ta zmiana rozszerza o ściany):

```ts
  it("levelCurves: najpierw elementy gracza, potem przeszkody, na końcu cztery ściany planszy", () => {
    const level = LEVELS.find((l) => l.id === "dwie-przeszkody")!;
    const pieces = level.pieces.map((p) => p.solution);
    const curves = levelCurves(level, pieces);
    const n = pieces.length + level.obstacles.length;
    expect(curves).toHaveLength(n + 4);
    expect(curves[0]).toEqual(shapeToPiece(pieces[0]));
    expect(curves[n - 1]).toEqual(shapeToPiece(level.obstacles[level.obstacles.length - 1]));
    expect(curves.slice(n)).toEqual(BOARD_WALLS.map(shapeToPiece));
  });

  it("ściany planszy to kwadrat [-1, 1]² zamknięty w obwód", () => {
    expect(BOARD_WALLS).toHaveLength(4);
    BOARD_WALLS.forEach((w, i) => {
      expect(Math.abs(w.from.x)).toBe(1);
      expect(Math.abs(w.from.y)).toBe(1);
      expect(w.to).toEqual(BOARD_WALLS[(i + 1) % 4].from);
    });
  });

  it("piłka puszczona prostopadle w ścianę wraca po tym samym torze", () => {
    // start niesymetryczny: odbicie liczone od złej ściany albo złą normalną by się ujawniło
    const r = trace(vec(0.25, 0.5), vec(1, 0), {
      curves: BOARD_WALLS.map(shapeToPiece), hole: vec(9, 9), holeRadius: 0, maxBounces: 1, maxLength: 100,
    });
    expect(r.path[1]).toEqual(vec(1, 0.5));
    expect(r.path[2].x).toBeCloseTo(-1, 12);
    expect(r.path[2].y).toBeCloseTo(0.5, 12);
  });

  it("piłka, która przedtem przepadała poza planszą, teraz odbija się od ramki", () => {
    // start poziomu 8: piłka leży poza małą elipsą startową, więc piłki lecą w brzeg planszy
    // (bez ścian przepadały za nim; zmierzone: wszystkie osiem trafia w ramkę)
    const level = LEVELS.find((l) => l.id === "zwienczenie")!;
    const pieces = level.pieces.map((p) => p.start);
    const proof = runProof({
      ball: level.ball, hole: level.hole, holeRadius: level.test.holeRadius,
      maxBounces: level.test.maxBounces, curves: levelCurves(level, pieces), aimCurve: shapeConic(pieces[0]),
    });
    const onFrame = (q: { x: number; y: number }) =>
      Math.abs(Math.abs(q.x) - 1) < 1e-9 || Math.abs(Math.abs(q.y) - 1) < 1e-9;
    expect(proof.balls.some((b) => b.path.slice(1, -1).some(onFrame))).toBe(true);
  });
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels/shape.test.ts`
Expected: FAIL — `BOARD_WALLS` nie istnieje.

- [ ] **Krok 3: `src/levels/shape.ts`**

Pod definicją `segment`:

```ts
/** Brzeg planszy [-1, 1]² jest ścianą: cztery zwykłe odcinki przez narożniki. Ten sam
 *  kwadrat na każdym ekranie, więc fizyka poziomu nie zależy od urządzenia. */
export const BOARD_WALLS: SegmentShape[] = [
  segment(vec(-1, -1), vec(1, -1)),
  segment(vec(1, -1), vec(1, 1)),
  segment(vec(1, 1), vec(-1, 1)),
  segment(vec(-1, 1), vec(-1, -1)),
];
```

`levelCurves`:

```ts
/** Elementy gracza, potem przeszkody, na końcu ściany brzegu planszy. */
export const levelCurves = (level: Level, pieces: EllipseShape[]): Piece[] => [
  ...pieces.map(shapeToPiece),
  ...level.obstacles.map(shapeToPiece),
  ...BOARD_WALLS.map(shapeToPiece),
];
```

`boundsExit` w `core/trace.ts` zostaje bez zmian — to bezpiecznik ostatniej szansy
(np. trafienie idealnie w narożnik).

- [ ] **Krok 4: `src/ui/screens.ts` — ramka**

Import: `import { BOARD_WALLS, LEVELS, SNAP_RADIUS, isCircle, shapeToPiece } from "../levels";`

W `draw`, tuż przed pętlą `for (const o of level.obstacles)`:

```ts
    // brzeg planszy jest ścianą — cienka ramka w kolorze stałych kształtów
    for (const w of BOARD_WALLS) {
      drawPiece(ctx, c, shapeToPiece(w), PALETTE.obstacle, PALETTE.obstacleGlow, 1);
    }
```

- [ ] **Krok 5: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — **wszystkie** testy poziomów (rozwiązania, starty, 5%, skrócenie łuków)
przechodzą ze ścianami bez zmiany oczekiwań. Jeśli któryś poziom zmienił wynik, nie
kalibruj go: zgłoś BLOCKED z wyjściem testu.

- [ ] **Krok 6: Commit**

```bash
git add src/levels/shape.ts src/ui/screens.ts tests/levels/shape.test.ts
git commit -m "feat: brzeg planszy jest sciana - cztery odcinki w levelCurves i ramka"
```

---

## Zadanie 3: Poziom 12 — większy okrąg; test poziomu 16

Spec §5 i §6 (test poziomu 16). Zależy od zadania 2: pomiary pasma są zrobione ze
ścianami.

**Pliki:**
- Zmiana: `src/levels/stage2.ts`
- Test: `tests/levels.test.ts`

- [ ] **Krok 1: Testy**

Na końcu bloku `describe("poziomy", …)` w `tests/levels.test.ts` (`solves` jest już
w pliku):

```ts
  it("poziom 12: każdy rozmiar powyżej pasma przegrywa (duża elipsa nie omija okręgu)", () => {
    const level = LEVELS.find((l) => l.id === "wspologniskowe")!;
    const base = level.pieces[0].solution;
    for (let i = 0; i <= 119; i++) {
      const a = 0.62 + 0.02 * i;    // 0.62 … 3.0
      expect(solves(level, [{ ...base, a }]), `a = ${a.toFixed(2)}`).toBe(false);
    }
  });

  it("poziom 16: jedna elipsa przez piłkę i dołek nie wygrywa dla żadnego rozmiaru", () => {
    const level = LEVELS.find((l) => l.id === "zwienczenie-2")!;
    const base = level.pieces[0].solution;
    for (let i = 0; i <= 122; i++) {
      const a = 0.56 + 0.02 * i;    // 0.56 … 3.0
      expect(solves(level, [{ ...base, f1: level.ball, f2: level.hole, a }]), `a = ${a.toFixed(2)}`).toBe(false);
    }
  });
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels.test.ts`
Expected: FAIL — test poziomu 12 (stary okrąg przepuszcza duże elipsy, np. `a = 0.62`).
Test poziomu 16 przechodzi już teraz — pilnuje przyszłych zmian.

- [ ] **Krok 3: Dane poziomu 12 w `src/levels/stage2.ts`**

W poziomie `id: "wspologniskowe"`:

- komentarz nad poziomem:

```ts
    // Górny łuk stoi (a = 0.75), gracz domyka dół łukiem współogniskowym. Duży okrąg pod
    // spodem wymusza mały rozmiar. Zmierzone (ze ścianami planszy, krok 0.005): wygrywa
    // jedno ciągłe pasmo a ∈ [0.455, 0.59], nic powyżej aż do a = 3. Mniejszy okrąg
    // (r = 0.1) przepuszczał duże elipsy — osiem piłek przelatywało obok niego.
```

- rozwiązanie: `0.56` → `0.52`
  (`solution: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.52, { start: Math.PI, end: 2 * Math.PI }),`)
- przeszkoda: `circle(vec(0, -0.45), 0.1)` → `circle(vec(0, -0.5), 0.25)`

Nic innego w poziomie się nie zmienia (identyfikator, start, łuk stały, blokady).

- [ ] **Krok 4: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (w tym: start poziomu 12 nierozwiązany, rozwiązanie odporne na skrócenie
łuków o 1°).

- [ ] **Krok 5: Commit**

```bash
git add src/levels/stage2.ts tests/levels.test.ts
git commit -m "fix(levels): poziom 12 - wiekszy okrag, duza elipsa juz nie przechodzi"
```

---

## Zadanie 4: „Jeszcze raz” zachowuje ustawienie; ostatni poziom kończy się „Menu”

Spec §3 i §4.

**Pliki:**
- Zmiana: `src/ui/game.ts`, `src/ui/menu.ts`, `src/ui/screens.ts`
- Test: `tests/ui/game.test.ts`, `tests/ui/menu.test.ts`

**Interfejsy:**
- Produkuje (`ui/game.ts`): `retry(state: GameState): GameState` — faza `edycja`,
  `proof = null`, `elapsed = 0`, `pieces` bez zmian (ten sam obiekt).
- Produkuje (`ui/menu.ts`):
  `type WinAction = "powtorz" | "nastepny" | "menu"`;
  `winAction(p: Vec2, width: number, height: number, isLast = false): WinAction | null`;
  `winLabels(isLast: boolean, allSolved: boolean): { right: string; note: string | null }`.

- [ ] **Krok 1: Testy stanu gry**

`tests/ui/game.test.ts`: dopisz `retry` do importu z `../../src/ui/game`, a na końcu pliku:

```ts
describe("jeszcze raz", () => {
  const lvl = LEVELS[1];
  // ustawienie gracza inne niż start i inne niż zapisane rozwiązanie
  const mine = { ...lvl.pieces[0].solution, a: 0.9 };

  const finish = (g: ReturnType<typeof newGame>) => {
    for (let i = 0; i < 1200 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    return g;
  };

  it("po wygranej wraca do edycji z TYM SAMYM ustawieniem (tożsamość obiektów)", () => {
    const won = finish(startProof({ ...newGame(lvl), pieces: [mine] }));
    expect(won.phase).toBe("wygrana");
    const again = retry(won);
    expect(again.phase).toBe("edycja");
    expect(again.proof).toBeNull();
    expect(again.elapsed).toBe(0);
    expect(again.pieces).toBe(won.pieces);
    expect(again.pieces[0]).toBe(mine);
  });

  it("po porażce też: ustawienie zostaje, nie wraca stan startowy", () => {
    const bad = { ...mine, f1: { x: -0.1, y: 0.3 } };
    const lost = finish(startProof({ ...newGame(lvl), pieces: [bad] }));
    expect(lost.phase).toBe("porazka");
    expect(retry(lost).pieces[0]).toBe(bad);
  });

  it("w trakcie dowodu: przerwanie wraca do edycji z tym samym ustawieniem", () => {
    const running = advance(startProof({ ...newGame(lvl), pieces: [mine] }), 0.1);
    expect(running.phase).toBe("dowod");
    expect(retry(running).pieces[0]).toBe(mine);
  });

  it("nowa gra nadal daje stan startowy", () => {
    expect(newGame(lvl).pieces).toEqual([lvl.pieces[0].start]);
  });
});
```

- [ ] **Krok 2: Testy ekranu wygranej**

`tests/ui/menu.test.ts`: dopisz `winLabels` do importu z `../../src/ui/menu`, a na końcu pliku:

```ts
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
```

Istniejące testy `winAction(p, w, h)` (bez czwartego argumentu) zostają bez zmian.

- [ ] **Krok 3: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/game.test.ts tests/ui/menu.test.ts`
Expected: FAIL — `retry` i `winLabels` nie istnieją.

- [ ] **Krok 4: `src/ui/game.ts`**

Nad `export const preview`:

```ts
/** „Jeszcze raz”: z powrotem do edycji z TYM SAMYM ustawieniem elementów, które gracz
 *  właśnie sprawdził. Reset do stanu startowego to `newGame` (kafelek poziomu w menu). */
export const retry = (state: GameState): GameState => ({
  ...state, phase: "edycja", proof: null, elapsed: 0,
});
```

- [ ] **Krok 5: `src/ui/menu.ts`**

Zastąp komentarz i funkcję `winAction`:

```ts
export type WinAction = "powtorz" | "nastepny" | "menu";

/** Na ekranie wygranej dolny pas dzieli się na „Jeszcze raz” (lewo) i „Następny” (prawo);
 *  na ostatnim poziomie prawa połowa to „Menu”. Dotknięcie wyżej niczego nie robi,
 *  żeby nie przeskoczyć poziomu przypadkiem. */
export function winAction(p: Vec2, width: number, height: number, isLast = false): WinAction | null {
  if (p.y < height * ACTION_BAND) return null;
  if (p.x < width / 2) return "powtorz";
  return isLast ? "menu" : "nastepny";
}

/** Prawy przycisk ekranu wygranej i dopisek do banera. Na ostatnim poziomie nie ma
 *  „Następnego” — jest „Menu” i podsumowanie. */
export function winLabels(isLast: boolean, allSolved: boolean): { right: string; note: string | null } {
  if (!isLast) return { right: "Następny", note: null };
  return { right: "Menu", note: allSolved ? "Wszystkie poziomy ukończone." : "To był ostatni poziom." };
}
```

- [ ] **Krok 6: `src/ui/screens.ts`**

Importy:

```ts
import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
import { ACTION_BAND, MENU_BUTTON, hitRect, hitTile, menuLayout, winAction, winLabels } from "./menu";
```

Nad funkcją `goTo`:

```ts
  const isLast = (): boolean => levelIndex === LEVELS.length - 1;
```

W `pointerdown` zastąp obsługę ekranu wygranej i pozostałych faz poza edycją:

```ts
    if (game.phase === "wygrana") {
      const action = winAction(p, viewW(), viewH(), isLast());
      if (action === "nastepny") goTo(levelIndex + 1);
      if (action === "menu") menuOpen = true;
      if (action === "powtorz") game = retry(game);
      consumedReset = true;
      return;
    }
    if (game.phase !== "edycja") {
      // dotknięcie w trakcie dowodu albo po porażce: z powrotem do edycji, ustawienie zostaje
      game = retry(game);
      consumedReset = true;
      return;
    }
```

(Zawijanie `% LEVELS.length` znika: na ostatnim poziomie prawy przycisk to „Menu”.)

W `draw`, w gałęzi `game.phase === "wygrana"`, zastąp wywołanie `banner(…)`
(komentarz o jednoczesności nad nim zostaje):

```ts
        const allSolved = LEVELS.every((l) => progress.solved.includes(l.id));
        const { right, note } = winLabels(isLast(), allSolved);
        const summary = game.proof.simultaneous
          ? "Osiem torów, jedno miejsce, ta sama chwila."
          : "Osiem torów, jedno miejsce.";
        banner("Wpadły wszystkie", note === null ? summary : `${summary} ${note}`, ["Jeszcze raz", right]);
```

(`progress` jest aktualizowane w `frame` przed rysowaniem, więc właśnie wygrany poziom
już się liczy do `allSolved`.)

- [ ] **Krok 7: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 8: Commit**

```bash
git add src/ui/game.ts src/ui/menu.ts src/ui/screens.ts tests/ui/game.test.ts tests/ui/menu.test.ts
git commit -m "feat(ui): jeszcze raz zachowuje ustawienie, ostatni poziom konczy sie menu"
```

---

## Zadanie 5: Sprawdzenie w przeglądarce i zapis rozstrzygnięć

**Pliki:**
- Zmiana: `docs/superpowers/decyzje-etap-2.md`

- [ ] **Krok 1: Przeglądarka (Playwright, emulacja telefonu)**

`npm run build`, potem `npx vite preview --port 4173 --strictPort` w tle. Skrypt
Playwright (Chromium, `devices["iPhone 12"]`) piszesz **poza repozytorium**, np.
w katalogu tymczasowym; nie dodawaj Playwrighta do `package.json`. Zrzuty ekranu
oglądasz (narzędzie Read czyta PNG). Postęp gracza jest w
`localStorage["golf-geometryczny/postep"]` (`{"solved":[…],"last":n}`); kamera:
`scale = min(w,h)·0.88/2`, `screen = (w/2 + x·scale, h/2 − y·scale)`; „Sprawdź” to
dotknięcie w pasie `y > 0.86·h`; przycisk menu to prostokąt `(6, 6, 44, 44)`.

Sprawdź i zapisz wynik każdego punktu (z nazwą zrzutu):
1. Ramka planszy jest widoczna na poziomach 1 i 16; na poziomie 8 w stanie startowym
   podgląd pokazuje tory odbite od ramki.
2. Poziom 13: próba rozsunięcia ognisk pierwszego łuku daleko od siebie — łuk nie rośnie
   (ognisko staje na granicy); nie da się ustawić obu ognisk na piłce i w dołku.
3. Poziom 12: rozmiar ustawiony na ok. `a = 0.9` przegrywa; rozwiązanie `a = 0.52` wygrywa.
4. „Jeszcze raz” po porażce i po wygranej (np. poziom 2) wraca do edycji z tym samym
   ustawieniem elementów (zrzut przed i po).
5. Poziom 16 (ostatni): po wygranej prawy przycisk to „Menu”, baner ma dopisek
   „To był ostatni poziom.”; dotknięcie „Menu” otwiera siatkę poziomów. Z postępem
   ustawionym tak, że zaliczone są wszystkie pozostałe 15 poziomów, dopisek brzmi
   „Wszystkie poziomy ukończone.”
6. Wszystkie 16 poziomów nadal daje się wygrać uchwytami od stanu startowego
   (potwierdzenie przez `localStorage`).

Nie zmieniaj kodu gry w tym zadaniu. Błąd to wynik: opisz kroki i zrzut.

- [ ] **Krok 2: Dopisz rozstrzygnięcia**

Na końcu `docs/superpowers/decyzje-etap-2.md` dodaj sekcję
„Poprawki po etapie 2 (spec `2026-09-19-golf-etap-2-poprawki-design.md`)”, w formacie
reszty dokumentu (uzasadnienie + koszt, jeśli źle), z punktami:
- ściana na brzegu planszy, nie ekranu (decyzja właściciela) — pomiar: 16 poziomów bez zmian;
- „Jeszcze raz” zachowuje ustawienie po wygranej, po porażce i w trakcie dowodu;
  pełny reset pod kafelkiem poziomu;
- ostatni poziom: „Menu” z podsumowaniem, zawijanie na pierwszy poziom usunięte;
- poziom 12: okrąg `(0, −0.5)`, `r = 0.25`, rozwiązanie `a = 0.52`, pasmo `[0.455, 0.59]`;
- zablokowany rozmiar stoi — **odwołuje rozstrzygnięcie 3 z `decyzje-etap-1.md`**
  (`applyDrag` podnosił `a` także przy zablokowanym rozmiarze); przyczyna: poziomy 13
  i 15 dawały się przejść jedną elipsą;
- wyniki sprawdzenia z kroku 1.

- [ ] **Krok 3: Weryfikacja i commit**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

```bash
git add docs/superpowers/decyzje-etap-2.md
git commit -m "docs: rozstrzygniecia poprawek po etapie 2 i wynik sprawdzenia"
```
