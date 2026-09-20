# Etap 3: parabola i hiperbola — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać parabolę i hiperbolę jako krzywe, którymi gracz manipuluje, oraz osiem poziomów (17–24) opartych na konstrukcjach dwustopniowych.

**Architecture:** Rdzeń geometryczny nie zmienia kontraktu — `rayConicAll`, `reflect`, `normalAt` i `trace` zostają bez zmian, bo stożkowa to nadal sześć liczb. Nowe są dwa konstruktory postaci kwadratowej, układ własny krzywej (`CurveFrame`) pozwalający liczyć punkt z parametru i parametr z punktu, oraz drugi tryb ograniczania kawałka (`Piece.range`) obok istniejącej cięciwy. Warstwa poziomów dostaje dwa nowe kształty addytywnie; `EllipseShape` i szesnaście istniejących poziomów zostają nietknięte.

**Tech Stack:** TypeScript, Canvas 2D, Vite 8, Vitest 5. Zero zależności produkcyjnych.

**Spec:** `docs/superpowers/specs/2026-09-20-golf-etap-3-parabola-hiperbola-design.md`

## Global Constraints

- **Zero zależności produkcyjnych.** Nic nie dochodzi do `dependencies` w `package.json`.
- **Budżet paczki < 100 KB gzip**, egzekwowany przez `tests/budget.test.ts`. Stan wyjściowy: 9.94 KB.
- **`src/core/` nie importuje niczego spoza `src/core/`.** Pilnuje `tests/layering.test.ts`.
- **`shadowBlur` zakazany.** Pilnuje `tests/render/no-shadow-blur.test.ts`. Poświata = dwie kreski.
- **Wygrana to „wszystkie wpadną".** Piłki **nie** muszą wpaść w tej samej chwili. Nie wolno dodać testu ani warunku żądającego `proof.simultaneous`.
- **Identyfikatory poziomów 1–16 i ich kolejność są nienaruszalne** — zapisany postęp gracza w `localStorage` musi przetrwać.
- **Nazewnictwo w kodzie i danych po polsku** tam, gdzie tak już jest (`"elipsa"`, `"ognisko1"`, `"rozmiar"`), po angielsku dla nazw funkcji i pól technicznych (`from`, `to`, `branch`) — dokładnie jak w istniejącym kodzie.
- **Tolerancja:** `HOLE_RADIUS = 0.02 · DIAGONAL`, `SNAP_RADIUS = 0.05 · DIAGONAL`, `DIAGONAL = 2√2`. Niezmiennik: `SNAP_RADIUS ≥ 0.05 · DIAGONAL`.
- **Kryterium 5%** liczone per element ruchomy: `ognisko1` — pudło w **każdym** z ośmiu kierunków; `ognisko2` — pudło w **co najmniej sześciu** z ośmiu.
- **Komentarze tłumaczą „dlaczego", nie „co".** Tak jest w całym repozytorium; utrzymać ten rejestr.

### Dwie decyzje planu odbiegające od litery specyfikacji

1. **Spec §4 zapowiada `conicParam(k, p)` odtwarzający parametr z samej postaci kwadratowej.** Plan zamiast tego przenosi układ własny krzywej do `ParamRange.frame` — warstwa poziomów, która i tak zna ognisko i wierzchołek, podaje go wprost. Powód: odtwarzanie geometrii paraboli z sześciu liczb wymaga rozkładu własnego macierzy części kwadratowej i domykania kwadratu, czyli kilkudziesięciu linii kodu wrażliwego na przypadki brzegowe, podczas gdy odwrotność parametryzacji przy danym układzie to jedna linia. Precedens w repozytorium: `Arc` też niesie `from`/`via`/`to`, które muszą leżeć na krzywej — informacja jest zdublowana świadomie.
2. **Spec §5 zapowiada dla paraboli postać zamkniętą długości łuku, a dla hiperboli Gaussa–Legendre'a.** Plan liczy obie **tą samą** skumulowaną tablicą próbek, dokładnie jak `src/levels/arc.ts` dla elipsy. Powód jest zapisany w komentarzu `arc.ts`: „ważniejsze, że wszędzie liczymy TĄ SAMĄ funkcją". Dodatkowo tablica kawałkami liniowa ma **dokładną** odwrotność, a postać zamknięta plus Newton już nie.

### Zasada konstrukcji poziomów hiperbolicznych (21–24)

Układ **musi być pozaosiowy**. Gdyby piłka, wspólne ognisko M i dołek leżały na jednej prostej, stożek odbity od hiperboli wracałby dokładnie w lustro pierwotne — prawdziwy teleskop ma tam dziurę, a model poziomu nie umie opisać elipsy z przerwą jako jednego elementu gracza. Oś elipsy (piłka–M) i oś hiperboli (M–dołek) to dwie różne proste dzielące tylko punkt M; dołek ma leżeć z boku, tak żeby wiązka odbita minęła lustro.

---

## Zadanie 1: Postacie kwadratowe paraboli i hiperboli

**Pliki:**
- Zmiana: `src/core/conic.ts`
- Test: `tests/core/conic.test.ts`

**Interfejsy:**
- Produkuje: `parabolaFromFocusVertex(focus: Vec2, vertex: Vec2): Conic`, `hyperbolaFromFoci(f1: Vec2, f2: Vec2, a: number): Conic`.

- [ ] **Krok 1: Testy**

Dopisz na końcu `tests/core/conic.test.ts` (importy `vec`, `classify`, `evalConic` są już w pliku; dopisz brakujące do istniejącej listy importów):

```ts
describe("parabola", () => {
  it("postać kanoniczna: wierzchołek w zerze, ognisko na osi x", () => {
    const k = parabolaFromFocusVertex(vec(0.3, 0), vec(0, 0));
    // y² = 4px przy p = 0.3
    expect(k.A).toBeCloseTo(0, 12);
    expect(k.B).toBeCloseTo(0, 12);
    expect(k.C).toBeCloseTo(1, 12);
    expect(k.D).toBeCloseTo(-1.2, 12);
    expect(k.E).toBeCloseTo(0, 12);
    expect(k.F).toBeCloseTo(0, 12);
  });

  it("klasyfikuje się jako parabola niezależnie od obrotu i przesunięcia", () => {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * 2 * Math.PI;
      const v = vec(Math.cos(ang) * 0.4, Math.sin(ang) * 0.3);
      const f = add(v, scale(fromAngle(ang + 0.7), 0.25));
      expect(classify(parabolaFromFocusVertex(f, v))).toBe("parabola");
    }
  });

  it("własność ognisko–kierownica: |PF| = odległość P od kierownicy", () => {
    const v = vec(-0.2, 0.1);
    const f = vec(0.1, 0.4);
    const k = parabolaFromFocusVertex(f, v);
    const p = dist(f, v);
    const u = norm(sub(f, v));
    const n = perp(u);
    for (const t of [-1.3, -0.4, 0, 0.6, 1.9]) {
      // punkt parametryzacji z zadania 2, tu wpisany wprost, żeby test był niezależny
      const pt = add(v, add(scale(u, (t * t) / (4 * p)), scale(n, t)));
      expect(evalConic(k, pt)).toBeCloseTo(0, 10);
      const doKierownicy = dot(sub(pt, v), u) + p;
      expect(dist(pt, f)).toBeCloseTo(doKierownicy, 10);
    }
  });

  it("ognisko w wierzchołku to błąd", () => {
    expect(() => parabolaFromFocusVertex(vec(0.2, 0.2), vec(0.2, 0.2))).toThrow();
  });
});

describe("hiperbola", () => {
  it("postać kanoniczna: ogniska na osi x", () => {
    const k = hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.3);
    // b² = 0.25 − 0.09 = 0.16
    expect(k.A).toBeCloseTo(1 / 0.09, 10);
    expect(k.B).toBeCloseTo(0, 12);
    expect(k.C).toBeCloseTo(-1 / 0.16, 10);
    expect(k.F).toBeCloseTo(-1, 12);
  });

  it("klasyfikuje się jako hiperbola niezależnie od obrotu", () => {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * 2 * Math.PI;
      const d = scale(fromAngle(ang), 0.5);
      expect(classify(hyperbolaFromFoci(scale(d, -1), d, 0.3))).toBe("hiperbola");
    }
  });

  it("własność różnicy odległości: ||PF₁| − |PF₂|| = 2a", () => {
    const f1 = vec(-0.4, -0.2), f2 = vec(0.3, 0.5), a = 0.25;
    const k = hyperbolaFromFoci(f1, f2, a);
    const c = dist(f1, f2) / 2;
    const b = Math.sqrt(c * c - a * a);
    const center = scale(add(f1, f2), 0.5);
    const u = norm(sub(f2, f1));
    const n = perp(u);
    for (const branch of [1, -1]) {
      for (const t of [-1.1, -0.3, 0, 0.5, 1.4]) {
        const pt = add(center, add(scale(u, branch * a * Math.cosh(t)), scale(n, b * Math.sinh(t))));
        expect(evalConic(k, pt)).toBeCloseTo(0, 10);
        expect(Math.abs(dist(pt, f1) - dist(pt, f2))).toBeCloseTo(2 * a, 10);
      }
    }
  });

  it("a poza (0, c) to błąd — hiperbola bez ognisk nie istnieje", () => {
    expect(() => hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.5)).toThrow();
    expect(() => hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0)).toThrow();
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/conic.test.ts`
Expected: FAIL — `parabolaFromFocusVertex is not defined`.

- [ ] **Krok 3: Implementacja**

W `src/core/conic.ts` rozszerz import wektorów na
`import { Vec2, dist, dot, perp, scale, sub, vec } from "./vec";`
i dopisz pod `ellipseFromFoci`:

```ts
/** Parabola z ogniska i wierzchołka. `p = |F − V|` to odległość ogniskowa, oś biegnie
 *  od wierzchołka do ogniska. Równanie: (n·q)² − 4p(u·q) = 0 przy q = P − V, więc
 *  wyróżnik wychodzi zerowy z konstrukcji i `classify` nie potrzebuje wyjątku. */
export function parabolaFromFocusVertex(focus: Vec2, vertex: Vec2): Conic {
  const p = dist(focus, vertex);
  if (p < EPS) throw new Error("ognisko paraboli nie może leżeć w jej wierzchołku");
  const u = scale(sub(focus, vertex), 1 / p);
  const n = perp(u);
  const s = dot(n, vertex);
  const w = dot(u, vertex);
  return {
    A: n.x * n.x,
    B: 2 * n.x * n.y,
    C: n.y * n.y,
    D: -2 * s * n.x - 4 * p * u.x,
    E: -2 * s * n.y - 4 * p * u.y,
    F: s * s + 4 * p * w,
  };
}

/** Hiperbola z dwóch ognisk i połowy osi rzeczywistej. To DOSŁOWNIE `ellipseFromFoci`
 *  ze znakiem przy drugiej półosi: `ib = −1/b²` zamiast `+1/b²`, i warunek odwrócony
 *  na `a < c`. Stąd wyróżnik dodatni, a reszta rdzenia niczego nie zauważa. */
export function hyperbolaFromFoci(f1: Vec2, f2: Vec2, a: number): Conic {
  const c = dist(f1, f2) / 2;
  if (!(a > 0 && a < c)) throw new Error("połowa osi rzeczywistej musi leżeć w (0, połowa odległości ognisk)");
  const b = Math.sqrt(c * c - a * a);
  const angle = Math.atan2(f2.y - f1.y, f2.x - f1.x);
  const u = Math.cos(angle), v = Math.sin(angle);
  const ia = 1 / (a * a), ib = -1 / (b * b);
  const cx = (f1.x + f2.x) / 2, cy = (f1.y + f2.y) / 2;

  const A = u * u * ia + v * v * ib;
  const B = 2 * u * v * (ia - ib);
  const C = v * v * ia + u * u * ib;
  return {
    A, B, C,
    D: -2 * A * cx - B * cy,
    E: -2 * C * cy - B * cx,
    F: A * cx * cx + B * cx * cy + C * cy * cy - 1,
  };
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/core/conic.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add src/core/conic.ts tests/core/conic.test.ts
git commit -m "feat(core): postacie kwadratowe paraboli i hiperboli"
```

---

## Zadanie 2: Układ własny krzywej nieograniczonej

**Pliki:**
- Nowy: `src/core/frame.ts`
- Test: `tests/core/frame.test.ts` (nowy)

**Interfejsy:**
- Konsumuje: `Vec2` i pomocniki z `src/core/vec.ts`.
- Produkuje:
  - `type CurveFrame = { kind: "parabola"; vertex: Vec2; axis: Vec2; p: number } | { kind: "hiperbola"; center: Vec2; axis: Vec2; a: number; b: number; branch: 1 | -1 }` — `axis` jest **jednostkowy**.
  - `framePoint(f: CurveFrame, t: number): Vec2`
  - `frameParam(f: CurveFrame, p: Vec2): { t: number; branch: 1 | -1 }`

- [ ] **Krok 1: Test**

Nowy plik `tests/core/frame.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { add, dist, norm, scale, sub, vec } from "../../src/core/vec";
import { CurveFrame, framePoint, frameParam } from "../../src/core/frame";
import { evalConic, hyperbolaFromFoci, parabolaFromFocusVertex } from "../../src/core/conic";

const PAR: CurveFrame = {
  kind: "parabola", vertex: vec(-0.2, 0.1), axis: norm(vec(3, 4)), p: 0.35,
};

const f1 = vec(-0.4, -0.2), f2 = vec(0.3, 0.5), A = 0.25;
const C = dist(f1, f2) / 2;
const HYP: CurveFrame = {
  kind: "hiperbola",
  center: scale(add(f1, f2), 0.5),
  axis: norm(sub(f2, f1)),
  a: A,
  b: Math.sqrt(C * C - A * A),
  branch: 1,
};

describe("układ własny krzywej", () => {
  it("framePoint paraboli leży na jej postaci kwadratowej", () => {
    const k = parabolaFromFocusVertex(add(PAR.vertex, scale(PAR.axis, PAR.p)), PAR.vertex);
    for (const t of [-2, -0.7, 0, 0.3, 1.6]) {
      expect(evalConic(k, framePoint(PAR, t))).toBeCloseTo(0, 10);
    }
  });

  it("framePoint hiperboli leży na jej postaci kwadratowej, obie gałęzie", () => {
    const k = hyperbolaFromFoci(f1, f2, A);
    for (const branch of [1, -1] as const) {
      const f = { ...HYP, branch };
      for (const t of [-1.8, -0.5, 0, 0.9]) {
        expect(evalConic(k, framePoint(f, t))).toBeCloseTo(0, 10);
      }
    }
  });

  it("frameParam jest dokładną odwrotnością framePoint", () => {
    for (const t of [-2, -0.7, 0, 0.3, 1.6]) {
      expect(frameParam(PAR, framePoint(PAR, t)).t).toBeCloseTo(t, 10);
      expect(frameParam(HYP, framePoint(HYP, t)).t).toBeCloseTo(t, 10);
    }
  });

  it("frameParam rozpoznaje gałąź", () => {
    for (const t of [-1.5, 0, 1.5]) {
      expect(frameParam(HYP, framePoint({ ...HYP, branch: 1 }, t)).branch).toBe(1);
      expect(frameParam(HYP, framePoint({ ...HYP, branch: -1 }, t)).branch).toBe(-1);
    }
  });

  it("parabola nie ma gałęzi — zawsze 1", () => {
    expect(frameParam(PAR, framePoint(PAR, -3)).branch).toBe(1);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/frame.test.ts`
Expected: FAIL — `Cannot find module '../../src/core/frame'`.

- [ ] **Krok 3: Implementacja**

Nowy plik `src/core/frame.ts`:

```ts
import { Vec2, add, dot, perp, scale, sub } from "./vec";

/** Układ własny krzywej nieograniczonej: tyle, ile trzeba, żeby policzyć punkt
 *  z parametru i parametr z punktu. Świadomie NIE odtwarzamy tego z postaci kwadratowej —
 *  warstwa poziomów zna ognisko i wierzchołek, więc podaje układ wprost, a my unikamy
 *  rozkładu własnego macierzy. Ta sama zasada co przy `Arc`: informacja jest zdublowana,
 *  bo tańsza do podania niż do odzyskania. `axis` musi być wektorem jednostkowym. */
export type CurveFrame =
  | { kind: "parabola"; vertex: Vec2; axis: Vec2; p: number }
  | { kind: "hiperbola"; center: Vec2; axis: Vec2; a: number; b: number; branch: 1 | -1 };

/** Punkt krzywej o parametrze `t`. Dla paraboli `t` to wprost odsunięcie prostopadłe
 *  od osi — dlatego wiązka odbita od paraboli ma szerokość równą zakresowi `t`,
 *  niezależnie od `p`. */
export function framePoint(f: CurveFrame, t: number): Vec2 {
  const n = perp(f.axis);
  if (f.kind === "parabola") {
    return add(f.vertex, add(scale(f.axis, (t * t) / (4 * f.p)), scale(n, t)));
  }
  return add(
    f.center,
    add(scale(f.axis, f.branch * f.a * Math.cosh(t)), scale(n, f.b * Math.sinh(t))),
  );
}

/** Parametr punktu LEŻĄCEGO na krzywej wraz z gałęzią, na której leży. Gałąź jest
 *  jedynym powodem, dla którego hiperbola nie mieści się w mechanizmie cięciwy z etapu 2:
 *  cięciwa dzieli płaszczyznę, a nie krzywą, więc druga gałąź wpada po tej samej stronie. */
export function frameParam(f: CurveFrame, p: Vec2): { t: number; branch: 1 | -1 } {
  const n = perp(f.axis);
  if (f.kind === "parabola") return { t: dot(sub(p, f.vertex), n), branch: 1 };
  const q = sub(p, f.center);
  return { t: Math.asinh(dot(q, n) / f.b), branch: dot(q, f.axis) >= 0 ? 1 : -1 };
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/core/frame.test.ts tests/layering.test.ts && npx tsc --noEmit`
Expected: PASS — w tym test warstw, bo `frame.ts` importuje wyłącznie `./vec`.

- [ ] **Krok 5: Commit**

```bash
git add src/core/frame.ts tests/core/frame.test.ts
git commit -m "feat(core): uklad wlasny paraboli i hiperboli - punkt z parametru i parametr z punktu"
```

---

## Zadanie 3: `Piece.range` — drugi tryb ograniczania kawałka

**Pliki:**
- Zmiana: `src/core/piece.ts`
- Test: `tests/core/piece.test.ts`

**Interfejsy:**
- Konsumuje: `CurveFrame`, `framePoint`, `frameParam` z zadania 2.
- Produkuje: `interface ParamRange { from: number; to: number; frame: CurveFrame }`, pole `range?: ParamRange` w `Piece`, rozszerzone `onPiece`. `rayPiece` bez zmian w sygnaturze.

- [ ] **Krok 1: Testy**

Dopisz na końcu `tests/core/piece.test.ts` (dopisz brakujące importy do istniejących list):

```ts
describe("kawałek ograniczony zakresem parametru", () => {
  const f1 = vec(-0.5, 0), f2 = vec(0.5, 0), a = 0.3;
  const frame: CurveFrame = {
    kind: "hiperbola", center: vec(0, 0), axis: vec(1, 0),
    a, b: Math.sqrt(0.25 - 0.09), branch: 1,
  };
  const piece: Piece = {
    conic: hyperbolaFromFoci(f1, f2, a),
    range: { from: -1, to: 1, frame },
  };

  it("punkt wewnątrz zakresu należy do kawałka", () => {
    expect(onPiece(piece, framePoint(frame, 0))).toBe(true);
    expect(onPiece(piece, framePoint(frame, 0.99))).toBe(true);
  });

  it("punkt poza zakresem nie należy", () => {
    expect(onPiece(piece, framePoint(frame, 1.5))).toBe(false);
    expect(onPiece(piece, framePoint(frame, -1.5))).toBe(false);
  });

  it("KLUCZOWE: punkt na nieczynnej gałęzi nie należy, choć leży na tej samej krzywej", () => {
    const other = { ...frame, branch: -1 as const };
    for (const t of [-0.5, 0, 0.5]) {
      const p = framePoint(other, t);
      expect(evalConic(piece.conic, p)).toBeCloseTo(0, 10);
      expect(onPiece(piece, p)).toBe(false);
    }
  });

  it("rayPiece pomija nieczynną gałąź i trafia w czynną", () => {
    // promień z lewej w prawo wzdłuż osi: najpierw lewa gałąź (x = −0.3), potem prawa (x = 0.3)
    const hits = rayPiece(vec(-2, 0), vec(1, 0), piece);
    expect(hits).not.toBeNull();
    expect(-2 + hits!).toBeCloseTo(0.3, 6);
  });

  it("końce zakresu liczą się włącznie", () => {
    expect(onPiece(piece, framePoint(frame, 1))).toBe(true);
    expect(onPiece(piece, framePoint(frame, -1))).toBe(true);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/piece.test.ts`
Expected: FAIL — `range` nie istnieje w typie `Piece`.

- [ ] **Krok 3: Implementacja**

W `src/core/piece.ts` dopisz import `import { CurveFrame, frameParam } from "./frame";`,
zamień definicję `Piece` i dopisz `ParamRange`:

```ts
/** Zakres parametru we własnym układzie krzywej — dla krzywych NIEOGRANICZONYCH.
 *  Rozwiązuje naraz trzy rzeczy, których cięciwa nie umie: skończoność ramion, wybór
 *  gałęzi hiperboli i odporność na gracza (gdziekolwiek przeciągnie uchwyt, kawałek
 *  zostaje tym samym kawałkiem tej samej gałęzi). */
export interface ParamRange { from: number; to: number; frame: CurveFrame }

/** Kawałek krzywej. Brak `arc` i `range` oznacza całą krzywą. Kawałek ma CO NAJWYŻEJ
 *  JEDEN tryb ograniczenia — `range` wygrywa, gdy ktoś poda oba (patrz test w
 *  `tests/core/piece.test.ts`, który tego pilnuje w danych poziomów). */
export interface Piece { conic: Conic; arc?: Arc; range?: ParamRange }
```

i na początku `onPiece`, przed obsługą `arc`:

```ts
export function onPiece(piece: Piece, p: Vec2): boolean {
  const range = piece.range;
  if (range !== undefined) {
    const { t, branch } = frameParam(range.frame, p);
    if (range.frame.kind === "hiperbola" && branch !== range.frame.branch) return false;
    return t >= range.from - ARC_EPS && t <= range.to + ARC_EPS;
  }
  const arc = piece.arc;
  // ...reszta bez zmian
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/core && npx tsc --noEmit`
Expected: PASS — wszystkie testy rdzenia, w tym niezmienione testy cięciwy z etapu 2.

- [ ] **Krok 5: Commit**

```bash
git add src/core/piece.ts tests/core/piece.test.ts
git commit -m "feat(core): kawalek ograniczony zakresem parametru - galaz hiperboli pod kontrola"
```

---

## Zadanie 4: `baseAngle` zamiast `aimCurve` w dowodzie

Dziś `launchAngles` liczy kierunek bazowy przez `ellipseGeometry(aimCurve)`, co **rzuca
wyjątkiem dla paraboli** (brak środka, wyznacznik zero). Zamiast uczyć rdzeń rozpoznawania
trzech geometrii, odbieramy mu to zadanie: kąt osi podaje warstwa, która i tak zna kształt.
Efekt uboczny jest korzystny — `core/verify.ts` przestaje zależeć od `core/conic.ts`.

**Pliki:**
- Zmiana: `src/core/verify.ts`, `src/ui/game.ts`, `src/levels/shape.ts`
- Test: `tests/core/verify.test.ts`, `tests/levels.test.ts`

**Interfejsy:**
- Produkuje: `launchAngles(baseAngle: number, count?: number, sector?: Sector): number[]`; w `ProofInput` pole `aimCurve: Conic` zastąpione przez `baseAngle: number`. W `src/levels/shape.ts`: `shapeAxisAngle(s: MovableShape): number` — na razie obsługuje tylko elipsę, zadanie 7 dołoży pozostałe.

- [ ] **Krok 1: Test**

W `tests/core/verify.test.ts` zamień wywołania `launchAngles(conic, …)` na `launchAngles(kat, …)`
i dopisz:

```ts
it("kierunek bazowy jest podawany wprost, nie odczytywany z krzywej", () => {
  const angles = launchAngles(0.4, 8);
  expect(angles[0]).toBeCloseTo(0.4 + 0.25 * (Math.PI / 4), 12);
  expect(angles).toHaveLength(8);
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/core/verify.test.ts`
Expected: FAIL — `launchAngles` dostaje liczbę tam, gdzie oczekuje `Conic`.

- [ ] **Krok 3: Implementacja**

W `src/core/verify.ts`:
- usuń `import { Conic, classify, ellipseGeometry } from "./conic";`,
- zamień nagłówek na
  `export function launchAngles(baseAngle: number, count: number = BALL_COUNT, sector?: Sector): number[] {`,
- w gałęzi bez wachlarza zamień dwie linie na:

```ts
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => baseAngle + (i + 0.25) * step);
```

- w `ProofInput` zamień `aimCurve: Conic;` na:

```ts
  /** kierunek, od którego odmierzamy osiem kierunków; dla elipsy to kąt jej osi */
  baseAngle: number;
```

- w `runProof` zamień pierwszą linię na
  `const angles = launchAngles(input.baseAngle, input.count ?? BALL_COUNT, input.sector);`

W `src/levels/shape.ts` dopisz:

```ts
/** Kąt osi kształtu w układzie świata — kierunek bazowy dowodu 360°. */
export function shapeAxisAngle(s: EllipseShape): number {
  const u = ellipseAxis(s);
  return Math.atan2(u.y, u.x);
}
```

W `src/ui/game.ts` w `proofFor` zamień
`aimCurve: shapeConic(state.pieces[0]),` na `baseAngle: shapeAxisAngle(state.pieces[0]),`
i popraw import na `import { EllipseShape, Level, levelCurves, shapeAxisAngle } from "../levels";`.

W `tests/levels.test.ts` w `proofFor` zamień `aimCurve: shapeConic(pieces[0]),`
na `baseAngle: shapeAxisAngle(pieces[0]),` i popraw listę importów.

- [ ] **Krok 4: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — cała suita (liczba testów rośnie z każdym zadaniem; zmierz ją przed
zmianą i porównaj po). Żaden wynik gry się nie zmienia, ale NIE dlatego, że kąt jest ten
sam: `ellipseGeometry` odzyskuje oś z wektora własnego, którego znak zależy od danych,
więc dla części elips nowy kąt różni się od starego o **dokładnie π** (zmierzone: 8 z 34
kształtów w poziomach 1–16). To nie zmienia wyniku, bo `launchAngles` rozkłada `count`
kierunków równo po pełnym okręgu, a π to dokładnie `count/2` kroków, gdy `count` jest
parzyste — czyli ten sam ZBIÓR kierunków, tylko inaczej ponumerowany. Wszystkie poziomy
mają `balls: 8`, podgląd ma 2. **Niezmiennik do utrzymania: liczba piłek musi być
parzysta.** Przy nieparzystej ten refaktor zmieniłby zbiór kierunków.

- [ ] **Krok 5: Commit**

```bash
git add src/core/verify.ts src/levels/shape.ts src/ui/game.ts tests/core/verify.test.ts tests/levels.test.ts
git commit -m "refactor(core): dowod dostaje kat bazowy zamiast krzywej - verify nie zna geometrii"
```

---

## Zadanie 5: Typy nowych kształtów

**Pliki:**
- Zmiana: `src/levels/types.ts`
- Test: `tests/levels/shape.test.ts`

**Interfejsy:**
- Produkuje:
  - `type Span = { mid: number; length: number } | { mid: number; span: number }`
  - `interface ParabolaShape { kind: "parabola"; focus: Vec2; vertex: Vec2; span: Span }`
  - `interface HyperbolaShape { kind: "hiperbola"; f1: Vec2; f2: Vec2; a: number; branch: 1 | -1; span: Span }`
  - `type MovableShape = EllipseShape | ParabolaShape | HyperbolaShape`
  - `Handle` rozszerzony o `"ognisko" | "wierzcholek"`
  - `ArcRange` = alias pierwszego wariantu `Span`

**Czego to zadanie NIE robi:** nie rusza `Shape` ani `PlayerPiece`. Rozszerzenie `Shape`
należy do zadania 7 (które umie zrobić z nowych kształtów `Piece`), a `PlayerPiece`
do zadania 10 (które umie je narysować i chwycić). Dzięki temu `npx tsc --noEmit`
pozostaje **zielony po każdym zadaniu planu**.

- [ ] **Krok 1: Test**

Dopisz na końcu `tests/levels/shape.test.ts`:

```ts
describe("typy nowych kształtów", () => {
  it("Span rozróżnia się obecnością pola, więc dane etapu 2 nie wymagają zmiany", () => {
    const dlugosc: Span = { mid: 0.2, length: 0.9 };
    const parametr: Span = { mid: 0.2, span: 1.4 };
    expect("length" in dlugosc).toBe(true);
    expect("length" in parametr).toBe(false);
  });

  it("ArcRange etapu 2 jest wariantem długościowym Span", () => {
    const arc: ArcRange = { mid: 0, length: 1 };
    const span: Span = arc;
    expect(span).toBe(arc);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels/shape.test.ts`
Expected: FAIL — `Span` nie jest eksportowany.

- [ ] **Krok 3: Implementacja**

W `src/levels/types.ts`:

- zamień `export type Handle = …` na:

```ts
export type Handle =
  | "ognisko1" | "ognisko2" | "rozmiar" | "poczatek" | "koniec"   // elipsa i jej łuk
  | "ognisko" | "wierzcholek";                                     // parabola
```

- pod komentarzem o `ArcRange` dopisz `Span` i przerób `ArcRange` na alias:

```ts
/** Dwa sposoby opisania kawałka krzywej; twórca poziomu wybiera pasujący.
 *  `length` — długość wzdłuż krzywej: gdy krzywa rośnie, ten sam kawałek obejmuje jej
 *  mniejszy wycinek, więc rozdmuchaniem krzywej nie da się zastąpić kaskady (etap 2).
 *  `span` — zakres parametru: rośnie razem z krzywą, ale za to jest odporny na to,
 *  gdzie gracz przeciągnie uchwyt, i jako jedyny wybiera gałąź hiperboli.
 *  Unia rozróżniana OBECNOŚCIĄ pola, nie znacznikiem — dzięki temu dane poziomów
 *  etapu 2 kompilują się bez ani jednej zmiany. */
export type Span = { mid: number; length: number } | { mid: number; span: number };

/** Nazwa z etapu 2 dla wariantu długościowego. */
export type ArcRange = { mid: number; length: number };
```

- pod `EllipseShape` dopisz nowe kształty (`Shape` i `PlayerPiece` zostają **bez zmian**):

```ts
/** Parabola: ognisko, wierzchołek i kawałek. `span` jest WYMAGANY — parabola jest
 *  nieograniczona, więc kawałek bez zakresu nie ma sensu i nie wolno go zapomnieć. */
export interface ParabolaShape { kind: "parabola"; focus: Vec2; vertex: Vec2; span: Span }

/** Hiperbola: dwa ogniska, połowa osi rzeczywistej (0 < a < c), wybrana gałąź i kawałek.
 *  `branch` należy do danych poziomu, nie do palca gracza — uchwyt rozmiaru nie
 *  przeskakuje między gałęziami. */
export interface HyperbolaShape {
  kind: "hiperbola"; f1: Vec2; f2: Vec2; a: number; branch: 1 | -1; span: Span;
}

/** Czym gracz może ruszać. Odcinki są stałe — jak w etapie 2. Rozszerzenie `Shape`
 *  o te kształty należy do zadania 7, kiedy `shapeToPiece` będzie umiało je obsłużyć. */
export type MovableShape = EllipseShape | ParabolaShape | HyperbolaShape;
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Nowe typy jeszcze nikt nie używa, więc nic się nie psuje.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/types.ts tests/levels/shape.test.ts
git commit -m "feat(levels): typy paraboli i hiperboli, Span opisany dlugoscia albo parametrem"
```

---

## Zadanie 6: Długość wzdłuż krzywej nieograniczonej

Odpowiednik `src/levels/arc.ts` dla paraboli i hiperboli. Osobny plik, nie rozszerzenie
`arc.ts`, bo elipsa jest **okresowa** (zawijanie o 2π, obwód), a te krzywe nie —
kod wyszedłby z trzech gałęzi `if` zamiast dwóch funkcji.

**Pliki:**
- Nowy: `src/levels/span.ts`
- Test: `tests/levels/span.test.ts` (nowy)

**Interfejsy:**
- Konsumuje: `CurveFrame`, `framePoint` (zadanie 2); `Span` (zadanie 5).
- Produkuje:
  - `frameTMax(f: CurveFrame): number` — parametr, przy którym krzywa na pewno jest poza planszą
  - `frameLengthBetween(f: CurveFrame, t0: number, t1: number): number`
  - `spanRange(f: CurveFrame, span: Span): { from: number; to: number }`

- [ ] **Krok 1: Test**

Nowy plik `tests/levels/span.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { dist, norm, vec } from "../../src/core/vec";
import { CurveFrame, framePoint } from "../../src/core/frame";
import { frameLengthBetween, frameTMax, spanRange } from "../../src/levels/span";

const PAR: CurveFrame = { kind: "parabola", vertex: vec(-0.3, 0), axis: vec(1, 0), p: 0.3 };
const HYP: CurveFrame = {
  kind: "hiperbola", center: vec(0, 0), axis: norm(vec(1, 1)), a: 0.3, b: 0.4, branch: 1,
};

/** Długość liczona niezależnie, gęstą łamaną — punkt odniesienia dla testu. */
const brutto = (f: CurveFrame, t0: number, t1: number): number => {
  const N = 20000;
  let sum = 0;
  let prev = framePoint(f, t0);
  for (let i = 1; i <= N; i++) {
    const p = framePoint(f, t0 + ((t1 - t0) * i) / N);
    sum += dist(prev, p);
    prev = p;
  }
  return sum;
};

describe("długość wzdłuż krzywej nieograniczonej", () => {
  it("zgadza się z gęstą łamaną, parabola", () => {
    expect(frameLengthBetween(PAR, -0.5, 1.2)).toBeCloseTo(brutto(PAR, -0.5, 1.2), 3);
  });

  it("zgadza się z gęstą łamaną, hiperbola", () => {
    expect(frameLengthBetween(HYP, -0.8, 0.9)).toBeCloseTo(brutto(HYP, -0.8, 0.9), 3);
  });

  it("jest ujemna, gdy idziemy wstecz", () => {
    expect(frameLengthBetween(PAR, 1, -1)).toBeCloseTo(-frameLengthBetween(PAR, -1, 1), 9);
  });

  it("spanRange po parametrze przepisuje zakres wprost", () => {
    // toBeCloseTo, nie toEqual: 0.2 − 1.4/2 daje −0.49999999999999994, a 0.2 + 1.4/2
    // daje 0.8999999999999999. Równość bitowa jest tu nieosiągalna i nie o nią chodzi.
    const r = spanRange(PAR, { mid: 0.2, span: 1.4 });
    expect(r.from).toBeCloseTo(-0.5, 9);
    expect(r.to).toBeCloseTo(0.9, 9);
  });

  it("spanRange po długości daje kawałek o zadanej długości", () => {
    const r = spanRange(HYP, { mid: 0.1, length: 0.6 });
    expect(frameLengthBetween(HYP, r.from, r.to)).toBeCloseTo(0.6, 6);
  });

  it("KLUCZOWE: kawałek opisany długością nie rośnie, gdy krzywa rośnie", () => {
    const maly = { ...HYP, a: 0.3, b: 0.4 };
    const duzy = { ...HYP, a: 0.6, b: 0.8 };
    const span = { mid: 0, length: 0.5 };
    const rm = spanRange(maly, span);
    const rd = spanRange(duzy, span);
    expect(frameLengthBetween(maly, rm.from, rm.to)).toBeCloseTo(0.5, 6);
    expect(frameLengthBetween(duzy, rd.from, rd.to)).toBeCloseTo(0.5, 6);
    // ten sam opis, a zakres parametru węższy na większej krzywej
    expect(rd.to - rd.from).toBeLessThan(rm.to - rm.from);
  });

  it("frameTMax wyprowadza krzywą poza planszę", () => {
    for (const f of [PAR, HYP]) {
      const t = frameTMax(f);
      const p = framePoint(f, t);
      expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeGreaterThan(2);
    }
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels/span.test.ts`
Expected: FAIL — `Cannot find module '../../src/levels/span'`.

- [ ] **Krok 3: Implementacja**

Nowy plik `src/levels/span.ts`:

```ts
import { dist } from "../core/vec";
import { CurveFrame, framePoint } from "../core/frame";
import { Span } from "./types";

/** Tyle samo co w `arc.ts` — ważniejsze od gęstości jest to, żeby WSZĘDZIE liczyć
 *  tą samą funkcją; wtedy długość i jej odwrotność są swoimi dokładnymi odwrotnościami. */
const SAMPLES = 512;

/** Zasięg planszy w `trace` to [-2, 2]². Ile trzeba odjechać od wierzchołka, żeby
 *  NA PEWNO z niego wyjść? Wierzchołek leży w [-1, 1]², więc wystarczy, by przesunięcie
 *  `d` dało `max(|dx|, |dy|) > 3`. Najgorszy przypadek to oś po skosie, gdzie
 *  `max(|dx|, |dy|) = |d|/√2`, czyli potrzeba `|d| > 3√2 ≈ 4.243`.
 *  Wartość 4 NIE wystarcza — zmierzone: parabola o p = 1000 i wierzchołku w (−1, −1)
 *  z osią po skosie ma w t = 4 punkt (1.83, 1.83), wciąż wewnątrz planszy. */
const REACH = 5;

/** Parametr, poza którym krzywa na pewno jest poza planszą — granica tablicy długości.
 *  Dla paraboli odsunięcie prostopadłe to wprost `t`. Dla hiperboli to `b·sinh t`. */
export function frameTMax(f: CurveFrame): number {
  if (f.kind === "parabola") return REACH;
  return Math.max(1, Math.asinh(REACH / f.b));
}

/** cum[i] = długość od t = −T do t = −T + 2T·i/N. Zależy tylko od kształtu krzywej. */
function cumulative(f: CurveFrame): { cum: Float64Array; T: number } {
  const T = frameTMax(f);
  const cum = new Float64Array(SAMPLES + 1);
  let prev = framePoint(f, -T);
  for (let i = 1; i <= SAMPLES; i++) {
    const p = framePoint(f, -T + (2 * T * i) / SAMPLES);
    cum[i] = cum[i - 1] + dist(prev, p);
    prev = p;
  }
  return { cum, T };
}

/** L(t): długość od −T do t. Kawałkami liniowa, rosnąca, zacięta na brzegach zakresu. */
function lengthAt(cum: Float64Array, T: number, t: number): number {
  const clamped = t < -T ? -T : t > T ? T : t;
  const x = ((clamped + T) / (2 * T)) * SAMPLES;
  const i = Math.min(Math.floor(x), SAMPLES - 1);
  return cum[i] + (cum[i + 1] - cum[i]) * (x - i);
}

/** Odwrotność L. Kawałkami liniowa jak L, więc obie są DOKŁADNYMI odwrotnościami. */
function paramAt(cum: Float64Array, T: number, v: number): number {
  const total = cum[SAMPLES];
  const r = v < 0 ? 0 : v > total ? total : v;
  let lo = 0, hi = SAMPLES;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= r) lo = m; else hi = m;
  }
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 0 ? (r - cum[lo]) / seg : 0;
  return -T + (2 * T * (lo + f)) / SAMPLES;
}

/** Długość wzdłuż krzywej od parametru t0 do t1 (ujemna, gdy t1 < t0). */
export function frameLengthBetween(f: CurveFrame, t0: number, t1: number): number {
  const { cum, T } = cumulative(f);
  return lengthAt(cum, T, t1) - lengthAt(cum, T, t0);
}

/** Zakres parametru kawałka. Opis długościowy jest TU przeliczany na parametryczny —
 *  dalej w dół (`Piece.range`, render, `onPiece`) istnieje już tylko zakres parametru. */
export function spanRange(f: CurveFrame, span: Span): { from: number; to: number } {
  if (!("length" in span)) {
    return { from: span.mid - span.span / 2, to: span.mid + span.span / 2 };
  }
  const { cum, T } = cumulative(f);
  const m = lengthAt(cum, T, span.mid);
  return {
    from: paramAt(cum, T, m - span.length / 2),
    to: paramAt(cum, T, m + span.length / 2),
  };
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/levels/span.test.ts && npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/span.ts tests/levels/span.test.ts
git commit -m "feat(levels): dlugosc wzdluz paraboli i hiperboli, kawalek opisany dowolnie"
```

---

## Zadanie 7: Kształty → `Piece`

**Pliki:**
- Zmiana: `src/levels/shape.ts`, `src/levels/types.ts` (rozszerzenie `Shape`), `src/levels/index.ts`
- Test: `tests/levels/shape.test.ts`, `tests/levels.test.ts`

**Uwaga o `tests/levels.test.ts`:** rozszerzenie `Shape` ZEPSUJE kompilację tego pliku.
Jego blok „każdy kształt daje się skonstruować" odsiewa `"odcinek"` i czyta `.a`/`.f1`/
`.arc`, co było poprawne, dopóki po odsianiu zostawała sama elipsa. Obramuj te asercje
warunkiem `s.kind === "elipsa"`, zostawiając sprawdzenie `shapeConic(s)` poza bramką —
ma nadal obejmować wszystkie krzywe.

**Interfejsy:**
- Konsumuje: `parabolaFromFocusVertex`, `hyperbolaFromFoci` (zadanie 1); `CurveFrame` (zadanie 2); `ParamRange` (zadanie 3); `Span`, `ParabolaShape`, `HyperbolaShape`, `MovableShape` (zadanie 5); `spanRange` (zadanie 6).
- Produkuje:
  - `parabola(focus: Vec2, vertex: Vec2, span: Span): ParabolaShape`
  - `hyperbola(f1: Vec2, f2: Vec2, a: number, branch: 1 | -1, span: Span): HyperbolaShape`
  - `shapeFrame(s: ParabolaShape | HyperbolaShape): CurveFrame`
  - `shapeFoci(s: MovableShape): Vec2[]`
  - `shapeAxisAngle(s: MovableShape): number` (rozszerzenie z zadania 4)
  - `shapeConic` i `shapeToPiece` przyjmują `Shape` = `MovableShape | SegmentShape`
  - `levelCurves(level: Level, pieces: MovableShape[]): Piece[]`

- [ ] **Krok 1: Testy**

Dopisz na końcu `tests/levels/shape.test.ts`:

```ts
describe("parabola i hiperbola jako kształty poziomu", () => {
  const par = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });
  // ogniska ODLEGŁE O 1.2, nie o 1: przy odległości 1 wektor f2−f1 jest już jednostkowy,
  // więc `norm()` byłby identycznością i test nie wykryłby jego usunięcia.
  const hyp = hyperbola(vec(-0.5, 0), vec(0.7, 0), 0.3, 1, { mid: 0, span: 2 });

  it("shapeFrame paraboli ma oś jednostkową od wierzchołka do ogniska", () => {
    const f = shapeFrame(par);
    expect(f.kind).toBe("parabola");
    expect(len(f.axis)).toBeCloseTo(1, 12);
    expect(f.axis.x).toBeCloseTo(1, 12);
    if (f.kind === "parabola") expect(f.p).toBeCloseTo(0.3, 12);
  });

  it("shapeFrame hiperboli liczy b z ognisk i a", () => {
    const f = shapeFrame(hyp);
    if (f.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(f.a).toBeCloseTo(0.3, 12);
    expect(len(f.axis)).toBeCloseTo(1, 12);
    expect(f.b).toBeCloseTo(Math.sqrt(0.36 - 0.09), 12);
    expect(f.branch).toBe(1);
  });

  it("shapeToPiece nowych krzywych daje range, NIGDY arc", () => {
    for (const s of [par, hyp]) {
      const piece = shapeToPiece(s);
      expect(piece.range).toBeDefined();
      expect(piece.arc).toBeUndefined();
    }
  });

  it("shapeToPiece daje range także przy opisie DŁUGOŚCIĄ", () => {
    const dlugi = hyperbola(vec(-0.5, 0), vec(0.5, 0), 0.3, 1, { mid: 0, length: 0.7 });
    const piece = shapeToPiece(dlugi);
    expect(piece.range).toBeDefined();
    expect(piece.arc).toBeUndefined();
  });

  it("końce kawałka leżą na postaci kwadratowej", () => {
    for (const s of [par, hyp]) {
      const piece = shapeToPiece(s);
      const r = piece.range!;
      for (const t of [r.from, (r.from + r.to) / 2, r.to]) {
        expect(evalConic(piece.conic, framePoint(r.frame, t))).toBeCloseTo(0, 9);
      }
    }
  });

  it("shapeAxisAngle zna wszystkie trzy krzywe", () => {
    expect(shapeAxisAngle(par)).toBeCloseTo(0, 12);
    expect(shapeAxisAngle(hyp)).toBeCloseTo(0, 12);
    expect(shapeAxisAngle(ellipse(vec(-1, 0), vec(1, 0), 2))).toBeCloseTo(0, 12);
  });

  it("shapeFoci zwraca ogniska każdej krzywej", () => {
    expect(shapeFoci(par)).toEqual([vec(-0.5, 0)]);
    expect(shapeFoci(hyp)).toEqual([vec(-0.5, 0), vec(0.7, 0)]);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/levels/shape.test.ts`
Expected: FAIL — `parabola is not exported`.

- [ ] **Krok 3: Implementacja**

W `src/levels/types.ts` zamień definicję `Shape`:

```ts
export type Shape = MovableShape | SegmentShape;
```

W `src/levels/shape.ts` rozszerz importy o
`hyperbolaFromFoci`, `parabolaFromFocusVertex` z `../core/conic`,
`CurveFrame` z `../core/frame`,
`spanRange` z `./span`,
`HyperbolaShape`, `MovableShape`, `ParabolaShape`, `Span` z `./types`,
oraz `len` z `../core/vec`. Dopisz:

```ts
export const parabola = (focus: Vec2, vertex: Vec2, span: Span): ParabolaShape =>
  ({ kind: "parabola", focus, vertex, span });

export const hyperbola = (
  f1: Vec2, f2: Vec2, a: number, branch: 1 | -1, span: Span,
): HyperbolaShape => ({ kind: "hiperbola", f1, f2, a, branch, span });

/** Układ własny krzywej dla rdzenia. Warstwa poziomów zna ognisko i wierzchołek,
 *  więc podaje je wprost — rdzeń nie musi ich odzyskiwać z sześciu liczb. */
export function shapeFrame(s: ParabolaShape | HyperbolaShape): CurveFrame {
  if (s.kind === "parabola") {
    const p = dist(s.focus, s.vertex);
    return { kind: "parabola", vertex: s.vertex, axis: norm(sub(s.focus, s.vertex)), p };
  }
  const c = dist(s.f1, s.f2) / 2;
  return {
    kind: "hiperbola",
    center: scale(add(s.f1, s.f2), 0.5),
    axis: norm(sub(s.f2, s.f1)),
    a: s.a,
    // zacisk pod pierwiastkiem jak w `arc.ts`: w trakcie przeciągania bywa a ≥ c
    b: Math.sqrt(Math.max(0, c * c - s.a * s.a)),
    branch: s.branch,
  };
}

/** Ogniska kształtu — cele przyskakiwania. Okrąg (f1 = f2) zwraca pustą listę:
 *  jego „ognisko" to środek przeszkody, nigdy nie jest sensownym celem (etap 2). */
export function shapeFoci(s: MovableShape): Vec2[] {
  if (s.kind === "parabola") return [s.focus];
  if (s.kind === "hiperbola") return [s.f1, s.f2];
  return isCircle(s) ? [] : [s.f1, s.f2];
}
```

Zamień `shapeAxisAngle` z zadania 4 na wersję dla wszystkich krzywych:

```ts
export function shapeAxisAngle(s: MovableShape): number {
  const u =
    s.kind === "elipsa" ? ellipseAxis(s)
    : s.kind === "parabola" ? norm(sub(s.focus, s.vertex))
    : norm(sub(s.f2, s.f1));
  return Math.atan2(u.y, u.x);
}
```

Zamień `shapeConic` i `shapeToPiece`:

```ts
export function shapeConic(s: Shape): Conic {
  if (s.kind === "elipsa") return ellipseFromFoci(s.f1, s.f2, s.a);
  if (s.kind === "parabola") return parabolaFromFocusVertex(s.focus, s.vertex);
  if (s.kind === "hiperbola") return hyperbolaFromFoci(s.f1, s.f2, s.a);
  return lineThrough(s.from, sub(s.to, s.from));
}

/** Kształt z danych poziomu → kawałek krzywej dla rdzenia.
 *  Parabola i hiperbola dostają ZAWSZE `range`, nigdy `arc` — także wtedy, gdy twórca
 *  poziomu opisał kawałek długością. Cięciwa dzieli płaszczyznę, nie krzywą, więc dla
 *  hiperboli przepuszczałaby trafienia w nieczynną gałąź. */
export function shapeToPiece(s: Shape): Piece {
  const conic = shapeConic(s);
  if (s.kind === "odcinek") {
    return { conic, arc: { from: s.from, via: scale(add(s.from, s.to), 0.5), to: s.to } };
  }
  if (s.kind === "parabola" || s.kind === "hiperbola") {
    const frame = shapeFrame(s);
    return { conic, range: { ...spanRange(frame, s.span), frame } };
  }
  if (s.arc === undefined) return { conic };
  const { start, end } = arcParams(s, s.arc);
  return {
    conic,
    arc: { from: ellipsePoint(s, start), via: ellipsePoint(s, s.arc.mid), to: ellipsePoint(s, end) },
  };
}
```

Zamień sygnaturę `levelCurves` na `(level: Level, pieces: MovableShape[])`.

W `src/levels/index.ts` dopisz `export * from "./span";`.

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. `PlayerPiece` nadal trzyma `EllipseShape`, więc `handles.ts`, `game.ts`
i `screens.ts` kompilują się bez zmian.

- [ ] **Krok 5: Commit**

```bash
git add src/levels tests/levels/shape.test.ts
git commit -m "feat(levels): parabola i hiperbola jako ksztalty - zawsze range, nigdy cieciwa"
```

---

## Zadanie 7b: Własność stałej drogi na losowych danych

Odpowiednik testu `2a` z etapu 1 i najważniejszy test tego etapu (spec §8). Etap 1 nie
sprawdzał poziomów, tylko **matematykę**: setki losowych elips i kierunków, żądanie, żeby
droga `ognisko → krzywa → ognisko` wynosiła `2a`. Tutaj to samo dla konstrukcji
dwustopniowych. Ten jeden test znajdzie błąd w każdej z nowych postaci kwadratowych,
w normalnej i w odbiciu — bo testuje własność, nie implementację.

Zadanie nie dodaje kodu produkcyjnego. Jeśli test nie przechodzi, błąd jest w zadaniu 1,
2, 3 albo 7 i tam należy go naprawić.

**Pliki:**
- Nowy: `tests/core/dwustopniowe.test.ts`

**Interfejsy:**
- Konsumuje: `ellipse`, `hyperbola`, `parabola`, `shapeToPiece` (zadanie 7); `trace` (bez zmian).

- [ ] **Krok 1: Test**

Nowy plik `tests/core/dwustopniowe.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { add, dist, fromAngle, sub, vec } from "../../src/core/vec";
import { trace } from "../../src/core/trace";
import { ellipse, hyperbola, parabola, shapeToPiece } from "../../src/levels/shape";

/** Powtarzalny generator — test ma być deterministyczny mimo „losowych" danych. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("konstrukcja dwustopniowa ma STAŁĄ długość drogi", () => {
  it("elipsa + hiperbola o wspólnym ognisku: droga = 2aₑ + 2aₕ", () => {
    const los = rng(20260920);
    let sprawdzonych = 0;

    for (let proba = 0; proba < 40; proba++) {
      const F0 = vec(-0.7 + los() * 0.2, -0.6 + los() * 0.3);
      const M = vec(0.2 + los() * 0.3, 0.4 + los() * 0.3);
      const H = vec(-0.3 + los() * 0.2, 0.1 + los() * 0.3);

      const ce = dist(F0, M) / 2;
      const ae = ce * (1.1 + los() * 0.3);
      const ch = dist(H, M) / 2;
      const ah = ch * (0.3 + los() * 0.3);
      const oczekiwana = 2 * ae + 2 * ah;

      const curves = [
        shapeToPiece(ellipse(F0, M, ae)),
        shapeToPiece(hyperbola(H, M, ah, 1, { mid: 0, span: 6 })),
      ];

      for (let i = 0; i < 16; i++) {
        const kierunek = fromAngle((i / 16) * 2 * Math.PI + 0.13);
        const wynik = trace(F0, kierunek, {
          curves, hole: H, holeRadius: 1e-6, maxBounces: 2, maxLength: 40,
        });
        if (!wynik.holed || wynik.path.length !== 4) continue; // ten kierunek minął gałąź
        sprawdzonych++;
        expect(wynik.length).toBeCloseTo(oczekiwana, 6);
      }
    }

    // gdyby geometria przestała działać, pętla przeszłaby „pusto" i test byłby fikcją
    expect(sprawdzonych).toBeGreaterThan(100);
  });

  it("dwie parabole o wspólnej osi: droga jest ta sama dla każdego kierunku", () => {
    const los = rng(777);
    for (let proba = 0; proba < 20; proba++) {
      const pa = 0.2 + los() * 0.2;
      const pb = 0.2 + los() * 0.2;
      const VA = vec(-0.85, 0);
      const VB = vec(0.85, 0);
      const FA = add(VA, vec(pa, 0));
      const FB = sub(VB, vec(pb, 0));

      const curves = [
        shapeToPiece(parabola(FA, VA, { mid: 0, span: 1.2 })),
        shapeToPiece(parabola(FB, VB, { mid: 0, span: 1.2 })),
      ];

      const drogi: number[] = [];
      for (let i = 0; i < 12; i++) {
        const kat = Math.PI - 0.9 + (i / 11) * 1.8;
        const wynik = trace(FA, fromAngle(kat), {
          curves, hole: FB, holeRadius: 1e-6, maxBounces: 2, maxLength: 40,
        });
        if (wynik.holed && wynik.path.length === 4) drogi.push(wynik.length);
      }

      expect(drogi.length).toBeGreaterThan(8);
      expect(Math.max(...drogi) - Math.min(...drogi)).toBeLessThan(1e-6);

      // Rozrzut sam w sobie nie wystarcza: łapie tylko niezgodność między kierunkami,
      // nie złapałby błędu JEDNAKOWEGO w obu parabolach (np. źle policzone `p`), bo
      // wtedy wszystkie dwanaście dróg nadal byłyby sobie równe, tylko równe źle. Wartość
      // niezależna od śledzenia: z definicji ognisko-kierownica droga to odległość między
      // kierownicami, bo składowe x punktów przecięcia się znoszą — nie zależy od kierunku
      // strzału. Kierownica A leży w VA.x − pa, kierownica B w VB.x + pb.
      const oczekiwanaDroga = (VB.x + pb) - (VA.x - pa);
      for (const droga of drogi) {
        expect(droga).toBeCloseTo(oczekiwanaDroga, 9);
      }
    }
  });
});
```

- [ ] **Krok 2: Uruchom**

Run: `npx vitest run tests/core/dwustopniowe.test.ts`
Expected: PASS.

Jeśli `sprawdzonych` wychodzi za małe, poluzuj zakres losowania `H` (wiązka musi trafiać
w gałąź), **nie** obniżaj progu — próg jest po to, żeby test nie przeszedł pusto.

Jeśli długości nie są stałe, kolejność podejrzanych: `hyperbolaFromFoci` (znak przy `1/b²`),
`normalAt` na nowej postaci, wybór gałęzi w `onPiece`. Diagnostyka: wypisz dla jednego
kierunku `|P·F₁| − |P·F₂|` w punkcie odbicia — musi wynosić `2aₕ`.

- [ ] **Krok 3: Commit**

```bash
git add tests/core/dwustopniowe.test.ts
git commit -m "test(core): stala droga w konstrukcji dwustopniowej na losowych danych"
```

---

## Zadanie 8: Rysowanie kawałka ograniczonego zakresem

**Pliki:**
- Zmiana: `src/render/shapes.ts`
- Test: `tests/render/shapes.test.ts`

**Interfejsy:**
- Konsumuje: `framePoint` (zadanie 2), `Piece.range` (zadanie 3).
- Produkuje: `piecePolyline` obsługuje kawałki z `range`; sygnatura bez zmian.

- [ ] **Krok 1: Testy**

Dopisz na końcu `tests/render/shapes.test.ts`:

```ts
describe("łamana kawałka z zakresem parametru", () => {
  const frame: CurveFrame = {
    kind: "hiperbola", center: vec(0, 0), axis: vec(1, 0), a: 0.3, b: 0.4, branch: 1,
  };
  const piece: Piece = {
    conic: hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.3),
    range: { from: -1.2, to: 0.8, frame },
  };

  it("zaczyna się i kończy DOKŁADNIE na końcach zakresu", () => {
    const pts = piecePolyline(piece, 32);
    expect(pts[0].x).toBeCloseTo(framePoint(frame, -1.2).x, 12);
    expect(pts[0].y).toBeCloseTo(framePoint(frame, -1.2).y, 12);
    expect(pts[pts.length - 1].x).toBeCloseTo(framePoint(frame, 0.8).x, 12);
    expect(pts[pts.length - 1].y).toBeCloseTo(framePoint(frame, 0.8).y, 12);
  });

  it("wszystkie punkty leżą na krzywej i na czynnej gałęzi", () => {
    for (const p of piecePolyline(piece, 32)) {
      expect(evalConic(piece.conic, p)).toBeCloseTo(0, 9);
      expect(p.x).toBeGreaterThan(0); // prawa gałąź
    }
  });

  it("parabola też się rysuje", () => {
    const pf: CurveFrame = { kind: "parabola", vertex: vec(-0.8, 0), axis: vec(1, 0), p: 0.3 };
    const pp: Piece = {
      conic: parabolaFromFocusVertex(vec(-0.5, 0), vec(-0.8, 0)),
      range: { from: -0.6, to: 0.6, frame: pf },
    };
    const pts = piecePolyline(pp, 16);
    expect(pts).toHaveLength(17);
    for (const p of pts) expect(evalConic(pp.conic, p)).toBeCloseTo(0, 9);
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/render/shapes.test.ts`
Expected: FAIL — `piecePolyline` ignoruje `range` i idzie ścieżką `conicPolyline`,
która dla hiperboli wywoła `ellipseGeometry` i policzy bzdury albo rzuci wyjątkiem.

- [ ] **Krok 3: Implementacja**

W `src/render/shapes.ts` dopisz import `import { framePoint } from "../core/frame";`
i na POCZĄTKU `piecePolyline`, przed obsługą `arc`:

```ts
export function piecePolyline(piece: Piece, steps = 128): Vec2[] {
  const range = piece.range;
  if (range !== undefined) {
    // krzywa nieograniczona: równe kroki parametru. NIE dają punktów równo rozłożonych
    // wzdłuż krzywej — na obu krzywych gęstnieją przy wierzchołku, bo tam prędkość
    // parametryzacji jest najmniejsza. I bardzo dobrze: wierzchołek to miejsce
    // największej krzywizny, czyli dokładnie tam, gdzie łamana potrzebuje punktów.
    // Parabola zagęszcza łagodnie (|dP/dt| = √(1 + t²/4p²), ~41% różnicy na zakresie
    // ±0.6 przy p = 0.3), hiperbola ostro (cosh/sinh). Równy jest tylko składnik
    // PROSTOPADŁY, bo dla paraboli parametr JEST tym odsunięciem — i na tym stoi
    // poziom 18, bo szerokość wiązki odbitej równa się zakresowi t niezależnie od p.
    const n = Math.max(2, steps);
    return Array.from({ length: n + 1 }, (_, i) =>
      framePoint(range.frame, range.from + ((range.to - range.from) * i) / n));
  }
  const arc = piece.arc;
  // ...reszta bez zmian
}
```

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/render && npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Krok 5: Commit**

```bash
git add src/render/shapes.ts tests/render/shapes.test.ts
git commit -m "feat(render): lamana paraboli i hiperboli z zakresu parametru"
```

---

## Zadanie 9: Cała gra na `MovableShape`

Ostatnia zmiana typów, i musi wyprzedzić uchwyty: `applyDrag` z zadania 10 zwraca
`MovableShape`, więc dopóki `GameState.pieces` trzyma `EllipseShape[]`, kompilator
odrzuca przypisanie. Po tym zadaniu poziom z parabolą już się przelicza i wygrywa —
brakuje tylko możliwości chwycenia jej palcem.

**Pliki:**
- Zmiana: `src/levels/types.ts`, `src/ui/game.ts`, `src/ui/screens.ts`
- Test: `tests/ui/game.test.ts`, `tests/levels.test.ts`, `tests/ui/handles.test.ts`

**Uwaga:** poszerzenie `PlayerPiece` zepsuje zawężanie typu także w `tests/levels.test.ts`
i `tests/ui/handles.test.ts`. Napraw bramką `kind === "elipsa"` albo pomocnikiem
`shapeFoci`, bez rzutowań.

**Interfejsy:**
- Produkuje: `PlayerPiece.start` i `.solution` typu `MovableShape`; `GameState.pieces: MovableShape[]`.

- [ ] **Krok 1: Test**

Dopisz na końcu `tests/ui/game.test.ts`:

```ts
describe("gra z krzywą nieograniczoną", () => {
  // dwie parabole naprzeciw siebie: ognisko → wiązka równoległa → drugie ognisko
  const poziom: Level = {
    id: "test-parabola", title: "test", hint: "",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: parabola(vec(-0.45, 0.3), vec(-0.8, 0), { mid: 0, span: 1.2 }),
      solution: parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 }),
      locked: ["wierzcholek"],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), { mid: 0, span: 1.2 })],
    sector: { center: Math.PI, width: 2 },
    // DOŁEK TRZY RAZY MNIEJSZY niż w prawdziwych poziomach, i to jest istotne.
    // Piłka wystrzelona pod kątem δ od osi trafia parabolę w punkcie o parametrze
    // t = 2p·tan(δ/2), a odbita biegnie równolegle na wysokości y = t. Przy wachlarzu
    // szerokości 2 i ośmiu piłkach dwie środkowe mają δ = 0.125, czyli y = 0.0375 —
    // MNIEJ niż HOLE_RADIUS = 0.0566. `trace` sprawdza dołek przed każdym odbiciem,
    // więc te dwie wpadłyby po JEDNYM odbiciu, nie dotykając drugiej paraboli, i test
    // dwóch odbić by nie przeszedł. Mniejszy dołek wymusza prawdziwą drogę dwustopniową,
    // czyli dokładnie to, co ten test ma udowodnić. Zapas: 0.0375 / 0.0189 ≈ 2×.
    test: { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS / 3 },
  };

  it("rozwiązanie wygrywa, stan startowy nie", () => {
    const rozw = { ...newGame(poziom), pieces: poziom.pieces.map((p) => p.solution) };
    expect(startProof(rozw).proof!.solved).toBe(true);
    expect(startProof(newGame(poziom)).proof!.solved).toBe(false);
  });

  it("wszystkie osiem odbija się dwa razy — to jest konstrukcja dwustopniowa", () => {
    const rozw = { ...newGame(poziom), pieces: poziom.pieces.map((p) => p.solution) };
    for (const b of startProof(rozw).proof!.balls) {
      expect(b.path).toHaveLength(4); // start, odbicie, odbicie, dołek
    }
  });
});
```

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/game.test.ts`
Expected: FAIL — `parabola` nie pasuje do `PlayerPiece.start` typu `EllipseShape`.

- [ ] **Krok 3: Implementacja**

W `src/levels/types.ts`:

```ts
export interface PlayerPiece { start: MovableShape; solution: MovableShape; locked: Handle[] }
```

W `src/ui/game.ts` zamień `pieces: EllipseShape[]` na `pieces: MovableShape[]`
(w `GameState`) i popraw import.

Uruchom `npx tsc --noEmit` i napraw każde zgłoszone miejsce w `src/ui/screens.ts`,
zamieniając `EllipseShape` na `MovableShape`. **Nie zmieniaj przy tym żadnej logiki** —
to jest wyłącznie poszerzenie typu; kompilator pokaże pełną listę.

Jeżeli `screens.ts` sięga gdzieś po pole `.arc` elementu gracza (uchwyty końców łuku),
obwaruj to `state.kind === "elipsa"`. Parabola i hiperbola nie mają uchwytów końców —
ich kawałek opisuje `span` z danych poziomu, nie palec gracza.

- [ ] **Krok 4: Uruchom wszystko**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: PASS, budżet nadal poniżej 100 KB gzip.

- [ ] **Krok 5: Commit**

```bash
git add src/levels/types.ts src/ui tests/ui/game.test.ts
git commit -m "feat: element gracza moze byc dowolna stozkowa, nie tylko elipsa"
```

---

## Zadanie 10: Uchwyty paraboli i hiperboli

**Pliki:**
- Zmiana: `src/ui/handles.ts`
- Test: `tests/ui/handles.test.ts`

**Interfejsy:**
- Konsumuje: `MovableShape`, `Handle` (zadanie 5); `shapeFoci` (zadanie 7); `GameState.pieces: MovableShape[]` (zadanie 9).
- Produkuje: `handlePositions`, `pickHandle`, `snapTargets`, `applyDrag` przyjmują i zwracają `MovableShape`.

Rozkład uchwytów (spec §7): hiperbola dziedziczy komplet elipsy (`ognisko1`, `ognisko2`,
`rozmiar`), parabola ma dwa (`ognisko`, `wierzcholek`). Zgodnie z §8 etapu 1 obrotu **nie**
rozdzielamy od rozmiaru — wierzchołek niesie oba, tak jak ogniska elipsy niosą obrót
i mimośród.

- [ ] **Krok 1: Testy**

Dopisz na końcu `tests/ui/handles.test.ts`:

```ts
describe("uchwyty paraboli", () => {
  const par = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });

  it("ma dokładnie dwa uchwyty: ognisko i wierzchołek", () => {
    expect(handlePositions(par).map((h) => h.id).sort()).toEqual(["ognisko", "wierzcholek"]);
  });

  it("przeciągnięcie ogniska przenosi ognisko", () => {
    const next = applyDrag(par, "ognisko", vec(-0.4, 0.2));
    expect(next.kind).toBe("parabola");
    if (next.kind === "parabola") expect(next.focus).toEqual(vec(-0.4, 0.2));
  });

  it("ognisko nie może usiąść na wierzchołku — parabola musi istnieć", () => {
    const next = applyDrag(par, "ognisko", par.vertex);
    if (next.kind !== "parabola") throw new Error("zły rodzaj");
    expect(dist(next.focus, next.vertex)).toBeGreaterThan(0);
    expect(() => shapeConic(next)).not.toThrow();
  });

  it("przeciągnięcie wierzchołka zmienia i oś, i rozmiar", () => {
    const next = applyDrag(par, "wierzcholek", vec(-0.5, -0.4));
    if (next.kind !== "parabola") throw new Error("zły rodzaj");
    expect(next.vertex).toEqual(vec(-0.5, -0.4));
    expect(shapeAxisAngle(next)).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("uchwyty hiperboli", () => {
  const hyp = hyperbola(vec(-0.5, 0), vec(0.5, 0), 0.3, 1, { mid: 0, span: 2 });

  it("ma ten sam komplet uchwytów co elipsa", () => {
    expect(handlePositions(hyp).map((h) => h.id).sort()).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
  });

  it("uchwyt rozmiaru siedzi w wierzchołku CZYNNEJ gałęzi", () => {
    const poz = (s: typeof hyp) => handlePositions(s).find((h) => h.id === "rozmiar")!.pos;
    expect(poz(hyp).x).toBeCloseTo(0.3, 9);
    expect(poz({ ...hyp, branch: -1 }).x).toBeCloseTo(-0.3, 9);
  });

  it("NIEZMIENNIK: a zostaje w (0, c) po przeciągnięciu rozmiaru gdziekolwiek", () => {
    for (const cel of [vec(5, 0), vec(-5, 0), vec(0, 0), vec(0.5, 0), vec(0.499, 0)]) {
      const next = applyDrag(hyp, "rozmiar", cel);
      if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
      expect(next.a).toBeGreaterThan(0);
      expect(next.a).toBeLessThan(dist(next.f1, next.f2) / 2);
      expect(() => shapeConic(next)).not.toThrow();
    }
  });

  it("NIEZMIENNIK: a zostaje w (0, c) po przeciągnięciu ogniska na drugie", () => {
    const next = applyDrag(hyp, "ognisko1", vec(0.5, 0));
    if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(() => shapeConic(next)).not.toThrow();
  });

  it("NIEZMIENNIK: rozmiar nie przeskakuje między gałęziami", () => {
    // palec po przeciwnej stronie środka niż czynna gałąź
    const next = applyDrag(hyp, "rozmiar", vec(-0.4, 0.1));
    if (next.kind !== "hiperbola") throw new Error("zły rodzaj");
    expect(next.branch).toBe(1);
  });

  it("przyskakiwanie widzi ogniska nowych krzywych", () => {
    const lvl = { ball: vec(0, 0), hole: vec(1, 1), obstacles: [] } as unknown as Level;
    expect(snapTargets(lvl, [hyp, par], 0)).toContainEqual(vec(-0.5, 0));
  });
});
```

Uwaga: `par` z pierwszego bloku jest potrzebny w ostatnim teście — wynieś go nad oba bloki.

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/ui/handles.test.ts`
Expected: FAIL — `handlePositions` nie przyjmuje paraboli.

- [ ] **Krok 3: Implementacja**

W `src/ui/handles.ts` rozszerz importy o `MovableShape`, `HyperbolaShape`, `ParabolaShape`
z `../levels/types` oraz `shapeFoci` z `../levels/shape`, i dopisz pomocnik:

```ts
/** Wierzchołek czynnej gałęzi hiperboli — tam siedzi uchwyt rozmiaru, bo tam gracz
 *  widzi krzywą. Wierzchołek drugiej gałęzi nie jest uchwytem niczego. */
const hyperbolaVertex = (s: HyperbolaShape): Vec2 =>
  add(scale(add(s.f1, s.f2), 0.5), scale(norm(sub(s.f2, s.f1)), s.branch * s.a));
```

Zamień `handlePositions` na rozgałęzioną wersję (ciało elipsy **bez zmian**):

```ts
export function handlePositions(state: MovableShape): { id: Handle; pos: Vec2 }[] {
  if (state.kind === "parabola") {
    return [{ id: "ognisko", pos: state.focus }, { id: "wierzcholek", pos: state.vertex }];
  }
  if (state.kind === "hiperbola") {
    return [
      { id: "ognisko1", pos: state.f1 },
      { id: "ognisko2", pos: state.f2 },
      { id: "rozmiar", pos: hyperbolaVertex(state) },
    ];
  }
  // ...dotychczasowe ciało dla elipsy, bez zmian
}
```

W `snapTargets` i `pickHandle` zamień typ `pieces: EllipseShape[]` na `pieces: MovableShape[]`,
a w `snapTargets` zamień obie listy ognisk na `shapeFoci`:

```ts
export function snapTargets(level: Level, pieces: MovableShape[], dragged: number): Vec2[] {
  const fixedFoci = level.obstacles.flatMap((o) => (o.kind === "odcinek" ? [] : shapeFoci(o)));
  const otherFoci = pieces.flatMap((p, i) => (i === dragged ? [] : shapeFoci(p)));
  return [level.ball, level.hole, ...fixedFoci, ...otherFoci];
}
```

Na początku `applyDrag` dopisz dwie gałęzie, przed dotychczasowym ciałem dla elipsy:

```ts
export function applyDrag(
  state: MovableShape, handle: Handle, to: Vec2, lockedA?: number,
): MovableShape {
  if (state.kind === "parabola") return dragParabola(state, handle, to);
  if (state.kind === "hiperbola") return dragHyperbola(state, handle, to);
  // ...dotychczasowe ciało dla elipsy, bez zmian
}
```

i dopisz obie funkcje nad `applyDrag`:

```ts
/** Parabola przestaje istnieć, gdy ognisko usiądzie w wierzchołku, więc odsuwamy je
 *  o MIN_GAP wzdłuż dotychczasowej osi — tak jak elipsa broni się przed a ≤ c. */
function dragParabola(s: ParabolaShape, handle: Handle, to: Vec2): ParabolaShape {
  const os = norm(sub(s.focus, s.vertex));
  if (handle === "ognisko") {
    const focus = dist(to, s.vertex) < MIN_GAP ? add(s.vertex, scale(os, MIN_GAP)) : to;
    return { ...s, focus };
  }
  if (handle !== "wierzcholek") return s;
  const vertex = dist(s.focus, to) < MIN_GAP ? add(s.focus, scale(os, -MIN_GAP)) : to;
  return { ...s, vertex };
}

/** Hiperbola istnieje tylko przy 0 < a < c, więc KAŻDE przeciągnięcie kończy się
 *  zaciśnięciem `a` do tego przedziału. Gałąź jest daną poziomu — uchwyt rozmiaru
 *  bierze z palca tylko ODLEGŁOŚĆ od środka wzdłuż osi, nigdy stronę. */
function dragHyperbola(s: HyperbolaShape, handle: Handle, to: Vec2): HyperbolaShape {
  const fit = (x: HyperbolaShape): HyperbolaShape => {
    const c = dist(x.f1, x.f2) / 2;
    return { ...x, a: clamp(x.a, MIN_GAP, Math.max(MIN_GAP * 2, c - MIN_GAP)) };
  };
  if (handle === "ognisko1") return fit({ ...s, f1: to });
  if (handle === "ognisko2") return fit({ ...s, f2: to });
  if (handle !== "rozmiar") return s;
  const center = scale(add(s.f1, s.f2), 0.5);
  return fit({ ...s, a: Math.abs(dot(sub(to, center), norm(sub(s.f2, s.f1)))) });
}
```

Dopisz do importu z `../core/vec` brakujące `dot`, `norm`, `sub`.

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run tests/ui/handles.test.ts && npx tsc --noEmit && npm test`
Expected: PASS — w tym wszystkie testy uchwytów elipsy z etapów 1–2, bo ich ciało
zostało nietknięte.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/handles.ts tests/ui/handles.test.ts
git commit -m "feat(ui): uchwyty paraboli i hiperboli z niezmiennikami a<c i stalej galezi"
```

---

## Zadanie 11: Otwarty obrys, kierownica i asymptoty

Dwie rzeczy naraz, bo obie dotyczą wyłącznie `render/draw.ts` i `screens.ts` i jedna
recenzja obejmuje obie.

**Usterka do naprawienia:** `drawPiece` zamyka obrys, gdy `piece.arc === undefined`
([draw.ts:147](src/render/draw.ts#L147)). Kawałek z `range` też nie ma `arc`, więc
parabola zostałaby domknięta pętlą między swoimi ramionami. Warunek ma brzmieć
„cała elipsa", a nie „brak cięciwy".

**Podpowiedzi (spec §7):** kierownica paraboli i asymptoty hiperboli rysują się pod
**istniejącym** przełącznikiem `settings.hints`, domyślnie wyłączonym. Żadnej nowej opcji.

**Pliki:**
- Zmiana: `src/render/draw.ts`, `src/ui/screens.ts`
- Test: `tests/render/pieces.test.ts`, `tests/render/marks.test.ts`

**Interfejsy:**
- Produkuje: `curveHints(s: ParabolaShape | HyperbolaShape): Vec2[][]` w `src/render/shapes.ts` — lista łamanych do narysowania cienką, bladą kreską. Dla paraboli jedna (kierownica), dla hiperboli dwie (asymptoty).
- Zmiana: `PALETTE.hint = "rgba(203, 213, 225, 0.30)"`.

- [ ] **Krok 1: Testy**

Dopisz na końcu `tests/render/pieces.test.ts`:

```ts
describe("obrys kawałka z zakresem nie domyka się", () => {
  it("parabola rysuje się jako łamana otwarta", () => {
    const pp: Piece = {
      conic: parabolaFromFocusVertex(vec(-0.5, 0), vec(-0.8, 0)),
      range: {
        from: -0.6, to: 0.6,
        frame: { kind: "parabola", vertex: vec(-0.8, 0), axis: vec(1, 0), p: 0.3 },
      },
    };
    const { ctx, calls } = recordingCtx();
    drawPiece(ctx, cam, pp, "#fff", "#000", 2);
    expect(calls.filter((c) => c.op === "closePath")).toHaveLength(0);
  });
});

describe("podpowiedzi krzywych", () => {
  it("parabola ma jedną podpowiedź: kierownicę, prostopadłą do osi", () => {
    const par = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });
    const h = curveHints(par);
    expect(h).toHaveLength(1);
    // kierownica leży p za wierzchołkiem, po przeciwnej stronie niż ognisko
    for (const p of h[0]) expect(p.x).toBeCloseTo(-1.1, 9);
  });

  it("hiperbola ma dwie podpowiedzi: asymptoty przez środek", () => {
    const hyp = hyperbola(vec(-0.5, 0), vec(0.5, 0), 0.3, 1, { mid: 0, span: 2 });
    const h = curveHints(hyp);
    expect(h).toHaveLength(2);
    // obie przechodzą przez środek (0,0) o nachyleniach ±b/a
    const nachylenie = (l: Vec2[]) => (l[1].y - l[0].y) / (l[1].x - l[0].x);
    const b = Math.sqrt(0.25 - 0.09);
    expect(Math.abs(nachylenie(h[0]))).toBeCloseTo(b / 0.3, 9);
    expect(nachylenie(h[0])).toBeCloseTo(-nachylenie(h[1]), 9);
  });
});
```

`recordingCtx` z `tests/render/marks.test.ts` nie rejestruje `closePath` — dopisz mu
`closePath() { calls.push({ op: "closePath" }); }` i wyeksportuj go do wspólnego użytku
albo powiel w `pieces.test.ts`, zgodnie z tym, co już jest w tym pliku.

- [ ] **Krok 2: Uruchom i sprawdź, że nie przechodzi**

Run: `npx vitest run tests/render`
Expected: FAIL — obrys się domyka, `curveHints` nie istnieje.

- [ ] **Krok 3: Implementacja**

W `src/render/draw.ts` zamień ostatnią linię `drawPiece`:

```ts
  // Zamknięty obrys TYLKO dla całej elipsy. Kawałek z zakresem parametru też nie ma
  // cięciwy, a domknięcie połączyłoby mu ramiona pętlą przez pół planszy.
  const zamkniety = piece.arc === undefined && piece.range === undefined && pts.length > 2;
  glowPolyline(ctx, cam, pts, color, glow, width, zamkniety);
```

i dopisz do `PALETTE`:

```ts
  hint: "rgba(203, 213, 225, 0.30)",
```

W `src/render/shapes.ts` dopisz:

```ts
/** Linie pomocnicze krzywej: kierownica paraboli (jej definicja) i asymptoty hiperboli
 *  (wyjaśniają kształt gałęzi). Rysujemy je tylko przy włączonych podpowiedziach —
 *  to pomoc dydaktyczna, nie ozdoba, więc należy tam, gdzie reszta pomocy. */
export function curveHints(s: ParabolaShape | HyperbolaShape): Vec2[][] {
  if (s.kind === "parabola") {
    const p = dist(s.focus, s.vertex);
    const u = norm(sub(s.focus, s.vertex));
    const stopa = add(s.vertex, scale(u, -p));
    const n = perp(u);
    return [[add(stopa, scale(n, -SPAN)), add(stopa, scale(n, SPAN))]];
  }
  const c = dist(s.f1, s.f2) / 2;
  const b = Math.sqrt(Math.max(0, c * c - s.a * s.a));
  const center = scale(add(s.f1, s.f2), 0.5);
  const u = norm(sub(s.f2, s.f1));
  const n = perp(u);
  // asymptota: kierunek a·u ± b·n, znormalizowany i przedłużony na całą planszę
  return [1, -1].map((znak) => {
    const d = norm(add(scale(u, s.a), scale(n, znak * b)));
    return [add(center, scale(d, -SPAN)), add(center, scale(d, SPAN))];
  });
}
```

Dopisz do importów w `shapes.ts`: `dist` z `../core/vec` oraz
`HyperbolaShape`, `ParabolaShape` z `../levels/types`.

W `src/ui/screens.ts`, w pętli po `level.obstacles` i w pętli po `game.pieces`,
dorysuj podpowiedzi przed samą krzywą:

```ts
      if (settings.hints && (o.kind === "parabola" || o.kind === "hiperbola")) {
        for (const linia of curveHints(o)) {
          glowPolyline(ctx, c, linia, PALETTE.hint, "rgba(0,0,0,0)", 1);
        }
      }
```

(w pętli po `game.pieces` to samo, z `s` zamiast `o`). Dopisz `curveHints` do importu
z `../render/shapes` i rozszerz warunek przy bladych ogniskach o nowe krzywe:

```ts
      if (o.kind !== "odcinek") {
        for (const f of shapeFoci(o)) glowDot(ctx, c, f, PALETTE.fixedFocus, PALETTE.obstacleGlow, 2.5);
      }
```

`shapeFoci` zwraca pustą listę dla okręgu, więc zachowanie etapu 2 zostaje bez zmian.

- [ ] **Krok 4: Uruchom testy**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, w tym `tests/render/no-shadow-blur.test.ts`.

- [ ] **Krok 5: Commit**

```bash
git add src/render src/ui/screens.ts tests/render
git commit -m "feat(render): otwarty obrys krzywej nieograniczonej, kierownica i asymptoty jako podpowiedzi"
```

---

## Zadanie 12: Narzędzie kalibracji + poziomy 17 i 18

Poziomy to dane, ale dane wyliczone. Współrzędne poniżej są **wyprowadzone
geometrycznie, nie zmierzone** — tak jak parametry poziomów etapów 1 i 2. Pierwszy krok
tego zadania daje narzędzie, którym się je domyka; kolejne zadania poziomowe z niego
korzystają.

**Pliki:**
- Nowy: `scripts/sprawdz-poziom.ts`, `src/levels/stage3.ts`
- Zmiana: `src/levels/index.ts`, `tests/levels.test.ts`, `tests/ui/menu.test.ts`
- Test: `tests/levels.test.ts`

**Interfejsy:**
- Produkuje: `STAGE_3: Level[]` (tu dwa pierwsze poziomy; kolejne zadania dopisują), `LEVELS = [...STAGE_1, ...STAGE_2, ...STAGE_3]`.

- [ ] **Krok 1: Narzędzie kalibracji**

Nowy plik `scripts/sprawdz-poziom.ts`:

```ts
/** Diagnostyka poziomu przy kalibracji. Uruchamiaj:
 *  npx vite-node scripts/sprawdz-poziom.ts <id-poziomu>
 *  Wypisuje dla ZAPISANEGO ROZWIĄZANIA: ile piłek wpadło, ile miało odbić,
 *  jak daleko chybiły te, które chybiły, i jaki jest rozrzut dróg. */
import { dist } from "../src/core/vec";
import { runProof } from "../src/core/verify";
import { LEVELS, levelCurves, shapeAxisAngle } from "../src/levels";

const id = process.argv[2];
const level = LEVELS.find((l) => l.id === id);
if (level === undefined) throw new Error(`nie ma poziomu ${id}; są: ${LEVELS.map((l) => l.id).join(", ")}`);

for (const [nazwa, pieces] of [
  ["rozwiązanie", level.pieces.map((p) => p.solution)],
  ["start", level.pieces.map((p) => p.start)],
] as const) {
  const proof = runProof({
    ball: level.ball, hole: level.hole,
    holeRadius: level.test.holeRadius, maxBounces: level.test.maxBounces,
    curves: levelCurves(level, pieces),
    baseAngle: shapeAxisAngle(pieces[0]),
    sector: level.sector, count: level.test.balls,
  });
  const wpadlo = proof.balls.filter((b) => b.holed).length;
  console.log(`\n== ${level.id} / ${nazwa}: ${wpadlo}/${level.test.balls} wpadło, rozrzut ${proof.spread.toExponential(2)}`);
  proof.balls.forEach((b, i) => {
    const koniec = b.path[b.path.length - 1];
    console.log(
      `  piłka ${i}: odbić ${b.path.length - 2}, ${b.holed ? "WPADŁA" : `chybiła o ${dist(koniec, level.hole).toFixed(4)} (promień ${level.test.holeRadius.toFixed(4)})`}`,
    );
  });
}
```

`scripts/` nie wchodzi do paczki produkcyjnej — sprawdź, że `vite.config.ts` buduje
wyłącznie z `index.html`, i jeśli `tsconfig.json` ma `include`, dopisz tam `scripts`.

- [ ] **Krok 2: Test liczby poziomów**

W `tests/levels.test.ts` zamień `expect(LEVELS).toHaveLength(16);` na `toHaveLength(18);`
i dopisz w tym samym `describe`:

```ts
  it("identyfikatory etapu 2 zostały, w tej samej kolejności", () => {
    expect(LEVELS.slice(8, 16).map((l) => l.id)).toEqual([
      "polelipsa", "bandy", "przycinanie", "wspologniskowe",
      "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
    ]);
  });
```

Run: `npx vitest run tests/levels.test.ts`
Expected: FAIL — 16 zamiast 18.

- [ ] **Krok 3: Dane poziomów**

Nowy plik `src/levels/stage3.ts`:

```ts
import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { parabola } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

/** Wachlarz poziomów parabolicznych. Piłka stoi w ognisku i strzela w lustro; kierunki
 *  poza wachlarzem nie mają w co trafić. Szerokość 2 rad, a nie π: przy pełnym π skrajne
 *  piłki lecą wzdłuż latus rectum i każde POWIĘKSZENIE paraboli sprawia, że wychodzą
 *  poza jej kawałek — a poziom 18 uczy właśnie, że rozmiar nie ma znaczenia. */
const WACHLARZ_W_LEWO = { center: Math.PI, width: 2 };

/** Kawałek paraboli: parametr to wprost odsunięcie prostopadłe od osi, więc zakres
 *  ±0.6 znaczy „wiązka szerokości 1.2" NIEZALEŻNIE od rozmiaru paraboli. Na tym stoi
 *  poziom 18: wiązka zawsze mieści się w luster odbierającym, choćby gracz urósł. */
const KAWALEK = { mid: 0, span: 1.2 };

export const STAGE_3: Level[] = [
  {
    // Dwie parabole naprzeciw siebie na osi x. Wierzchołek przybity w (−0.8, 0),
    // piłka w (−0.5, 0): gdy gracz trafi ogniskiem w piłkę, oś SAMA celuje w drugą
    // parabolę, bo wierzchołek, piłka i dołek są współliniowe. Jedna decyzja, jedna lekcja.
    id: "ognisko-paraboli", title: "Ognisko paraboli",
    hint: "Parabola wysyła z ogniska wszystko równolegle. Posadź ognisko na piłce.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: parabola(vec(-0.42, 0.34), vec(-0.8, 0), KAWALEK),
      solution: parabola(vec(-0.5, 0), vec(-0.8, 0), KAWALEK),
      locked: ["wierzcholek"],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), KAWALEK)],
    sector: WACHLARZ_W_LEWO,
    test: t,
  },
  {
    // To samo, ale wierzchołek zwolniony, a rozwiązanie ma INNĄ ogniskową (0.22 zamiast
    // 0.3) — dowód wprost w danych, że rozmiar nie ma znaczenia. Echo poziomu 2 z etapu 1;
    // gra tego nie wypowiada.
    id: "parabola-rozmiar", title: "Rozmiar bez znaczenia",
    hint: "Teraz możesz ruszać też wierzchołkiem. Sprawdź, czy rozmiar cokolwiek psuje.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: parabola(vec(-0.35, 0.25), vec(-0.7, -0.15), KAWALEK),
      solution: parabola(vec(-0.5, 0), vec(-0.72, 0), KAWALEK),
      locked: [],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), KAWALEK)],
    sector: WACHLARZ_W_LEWO,
    test: t,
  },
];
```

W `src/levels/index.ts` dopisz `import { STAGE_3 } from "./stage3";` i zmień ostatnią
linię na `export const LEVELS: Level[] = [...STAGE_1, ...STAGE_2, ...STAGE_3];`.

- [ ] **Krok 4: Kalibracja**

Run: `npx vite-node scripts/sprawdz-poziom.ts ognisko-paraboli`
Expected: `rozwiązanie: 8/8 wpadło`, każda piłka z **dwoma** odbiciami, `start: 0/8`.

Jeśli któraś piłka chybia:
- **chybia o mniej niż 2× promień dołka** → wiązka celuje dobrze, ale drugie lustro jest
  za wąskie: zwiększ `span` KAWALKA drugiej paraboli (przeszkody) do `1.4`;
- **chybia o dużo albo ma tylko jedno odbicie** → wiązka nie trafia w drugie lustro:
  sprawdź, czy wierzchołki obu parabol i oba ogniska leżą na osi x;
- **ma trzy lub więcej odbić** → wiązka ociera się o ścianę planszy: zwęź wachlarz
  do `width: 1.6`.

Powtórz dla `parabola-rozmiar`. Jeśli ten poziom wygrywa ze startu, odsuń start dalej
od rozwiązania — ognisko startowe musi być dalej niż `SNAP_RADIUS` (0.1414) od piłki.

- [ ] **Krok 5: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS — w tym istniejące testy „zapisane rozwiązanie rozwiązuje", „stan
początkowy NIE jest rozwiązaniem" i test kryterium 5%, które obejmują też nowe poziomy.

Jeśli kryterium 5% odpada dla `ognisko-paraboli`: zgodnie ze spec §9 **schodzimy
z promieniem dołka**, nie rozluźniamy kryterium. Zmień `holeRadius` tego poziomu
na `0.015 * DIAGONAL` i uruchom ponownie.

- [ ] **Krok 6: Przejdź oba poziomy palcem**

`npm run dev`, menu → 17 i 18. Sprawdź: parabola rysuje się jako łuk otwarty, nie pętla;
uchwyt wierzchołka na poziomie 17 jest nieaktywny, na 18 aktywny; po włączeniu podpowiedzi
w ustawieniach widać kierownicę.

- [ ] **Krok 7: Commit**

```bash
git add scripts src/levels tests/levels.test.ts tests/ui/menu.test.ts
git commit -m "feat(levels): poziomy 17 Ognisko paraboli i 18 Rozmiar bez znaczenia"
```

---

## Zadanie 13: Poziomy 19 „Obrót osi" i 20 „Teleskop"

**Pliki:**
- Zmiana: `src/levels/stage3.ts`, `tests/levels.test.ts`

- [ ] **Krok 1: Test**

W `tests/levels.test.ts` zamień `toHaveLength(18)` na `toHaveLength(20)`.
Run: `npx vitest run tests/levels.test.ts` → FAIL (18 zamiast 20).

- [ ] **Krok 2: Dane**

Dopisz na końcu `STAGE_3` w `src/levels/stage3.ts` (nad tablicą dodaj stałą
`const UKOS = { center: (5 * Math.PI) / 4, width: 2 };`):

```ts
  {
    // Ta sama konstrukcja obrócona o 45°. Ognisko PRZYBITE w piłce, wolny wierzchołek:
    // gracz nie może rozwiązać tego przesuwaniem ogniska, tylko celowaniem osi.
    // Oś u = (1,1)/√2, ogniskowa 0.3, więc wierzchołek leży 0.3·u za piłką.
    id: "obrot-osi", title: "Obrót osi",
    hint: "Ognisko już siedzi na piłce. Zostaje wycelować oś.",
    ball: vec(-0.538, -0.538), hole: vec(0.538, 0.538),
    pieces: [{
      start: parabola(vec(-0.538, -0.538), vec(-0.55, -0.85), KAWALEK),
      solution: parabola(vec(-0.538, -0.538), vec(-0.75, -0.75), KAWALEK),
      locked: ["ognisko"],
    }],
    obstacles: [parabola(vec(0.538, 0.538), vec(0.75, 0.75), KAWALEK)],
    sector: UKOS,
    test: t,
  },
  {
    // Oba lustra należą do gracza. Cztery uchwyty, trzy warunki: ognisko na piłce,
    // ognisko na dołku, osie równoległe. To jest zwieńczenie części parabolicznej.
    id: "teleskop", title: "Teleskop",
    hint: "Dwa lustra, dwa ogniska. Osie muszą patrzeć na siebie.",
    ball: vec(-0.55, 0), hole: vec(0.55, 0),
    pieces: [
      {
        start: parabola(vec(-0.45, 0.35), vec(-0.85, 0.1), KAWALEK),
        solution: parabola(vec(-0.55, 0), vec(-0.85, 0), KAWALEK),
        locked: [],
      },
      {
        start: parabola(vec(0.5, -0.3), vec(0.88, -0.15), KAWALEK),
        solution: parabola(vec(0.55, 0), vec(0.85, 0), KAWALEK),
        locked: [],
      },
    ],
    obstacles: [],
    sector: WACHLARZ_W_LEWO,
    test: t,
  },
```

- [ ] **Krok 3: Kalibracja**

Run: `npx vite-node scripts/sprawdz-poziom.ts obrot-osi`
Expected: `rozwiązanie: 8/8`, po dwa odbicia.

Jeśli piłki chybiają na `obrot-osi`: piłka i dołek muszą leżeć **dokładnie** w ogniskach.
Przelicz: `ball = vertexA + 0.3·u`, `hole = vertexB − 0.3·u` przy `u = (1,1)/√2 ≈ (0.70711, 0.70711)`,
czyli `vertexA = (−0.75, −0.75)` → `ball = (−0.53787, −0.53787)`. Wpisz tę dokładność,
jeśli zaokrąglenie do trzech miejsc okaże się za grube (chybienie rzędu 0.002 to ten objaw).

Run: `npx vite-node scripts/sprawdz-poziom.ts teleskop`
Expected: `rozwiązanie: 8/8`. Jeśli `start` wygrywa (0 pudeł), odsuń starty: oba ogniska
startowe muszą być dalej niż 0.1414 od swoich celów.

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

**Ryzyko odkryte w zadaniu 9 — dotyczy WSZYSTKICH poziomów parabolicznych 17–20.**
Gdy piłka, dołek i oś paraboli są współliniowe, piłki lecące blisko osi wpadają do dołka
po JEDNYM odbiciu, nie dotykając drugiego lustra: promień pod kątem δ od osi odbija się
na wysokość `y = 2p·tan(δ/2)`, a przy małym δ to mniej niż promień dołka. Zmierzone dla
`p = 0.3`, wachlarza 2 i ośmiu piłek: dwie środkowe lecą na `y = 0.0375` wobec promienia
`0.0566`. Poziom nadal WYGRYWA — ale te dwie piłki niczego nie dowodzą, a co gorsza mogą
wpadać także przy źle ustawionej paraboli, **osłabiając kryterium 5%**. Jeśli kryterium
odpadnie na poziomach 17–20, to jest pierwszy podejrzany; lekarstwem jest obniżenie
`holeRadius` tego poziomu (spec §9 i tak każe schodzić z promieniem, nie z kryterium).
Żeby żadna piłka nie skracała, najbliższy promień musi mieć `δ > 2·arctan(r/2p)`.

Znany punkt ryzyka: na `teleskop` kryterium 5% liczy się **per element**, a dwa elementy
mogą się nawzajem ratować (przesunięcie ogniska A o 5% psuje wiązkę, ale lustro B jest
szerokie i część piłek i tak wpada). Jeśli tak wyjdzie, **zwęź** `span` obu KAWALKÓW
na tym poziomie do `{ mid: 0, span: 0.9 }` — węższe lustro odbierające jest surowsze —
zamiast ruszać tolerancją dołka.

- [ ] **Krok 5: Przejdź oba palcem**

`npm run dev`, menu → 19 i 20. Sprawdź, że na 19 uchwyt ogniska jest nieaktywny,
a parabola obraca się wokół niego przy ciągnięciu wierzchołka.

- [ ] **Krok 6: Commit**

```bash
git add src/levels/stage3.ts tests/levels.test.ts
git commit -m "feat(levels): poziomy 19 Obrot osi i 20 Teleskop"
```

---

## Zadanie 14: Poziomy 21 „Wspólne ognisko" i 22 „Druga strona"

Pierwsze poziomy hiperboliczne. Obowiązuje **zasada układu pozaosiowego** z nagłówka planu.

Konstrukcja: piłka w ognisku F₀ elipsy, drugie ognisko elipsy w punkcie M. Hiperbola ma
ogniska M i dołek, z czynną gałęzią po stronie M. Piłki zbiegają ku M, trafiają w gałąź
od zewnątrz i odbijają się w dołek. Droga wynosi `2aₑ + 2aₕ` — stała, więc wygrana daje
wspólny błysk (ale **nie jest** to warunek wygranej).

**Pliki:**
- Zmiana: `src/levels/stage3.ts`, `tests/levels.test.ts`

- [ ] **Krok 1: Test**

W `tests/levels.test.ts` zamień `toHaveLength(20)` na `toHaveLength(22)` i dopisz:

```ts
  it("poziomy hiperboliczne są POZAOSIOWE — inaczej wiązka wraca w lustro", () => {
    for (const l of LEVELS.filter((x) => x.obstacles.some((o) => o.kind === "hiperbola"))) {
      const hip = l.obstacles.find((o) => o.kind === "hiperbola")!;
      if (hip.kind !== "hiperbola") throw new Error("zły rodzaj");
      // piłka, wspólne ognisko (dalsze od dołka) i dołek nie mogą być współliniowe
      const M = dist(hip.f1, l.hole) > dist(hip.f2, l.hole) ? hip.f1 : hip.f2;
      const a = sub(M, l.ball);
      const b = sub(l.hole, M);
      const krzyz = Math.abs(a.x * b.y - a.y * b.x) / (len(a) * len(b));
      expect(krzyz).toBeGreaterThan(0.2);
    }
  });
```

Run: `npx vitest run tests/levels.test.ts` → FAIL (20 zamiast 22).

- [ ] **Krok 2: Dane**

W `src/levels/stage3.ts` rozszerz import o `arcEllipse, ellipse, hyperbola` z `./shape`
i dopisz na końcu `STAGE_3`:

```ts
  {
    // Układ pozaosiowy, trzy warunki naraz — i wszystkie trzy są konieczne:
    //
    // 1. WACHLARZ + ŁUK. Elipsa NIE może być pełna. Pełna elipsa zbiera piłki do M
    //    ze WSZYSTKICH stron, a gałąź hiperboli jest wklęsła tylko w jedną — piłki
    //    nadlatujące z przeciwnej strony trafiłyby ją od wewnątrz i odbiły się w złą
    //    stronę. Wachlarz w dół-lewo i łuk po tej samej stronie dają stożek nadlatujący
    //    do M z jednego kierunku.
    // 2. DOŁEK WEWNĄTRZ ELIPSY. Wiązka odbita od hiperboli leci do dołka; gdyby dołek
    //    leżał poza elipsą, musiałaby przebić lustro od środka. Dołek (−0.2, 0.3) leży
    //    wewnątrz elipsy o ogniskach (−0.6, −0.45) i (0.35, 0.55) przy a = 0.78.
    // 3. POZAOSIOWOŚĆ. piłka→M to (0.95, 1.0), M→dołek to (−0.55, −0.25); sinus kąta
    //    między nimi ≈ 0.375, czyli dobrze poza zerem (test pilnuje > 0.2).
    //
    // c hiperboli = |M dołek| / 2 ≈ 0.302, a = 0.18 → wierzchołek ≈ (0.239, 0.500),
    // czyli między środkiem a M — na drodze zbiegających piłek.
    id: "wspolne-ognisko", title: "Wspólne ognisko",
    hint: "Hiperbola przejmuje zbiegający pęk. Daj jej to ognisko, na które czeka.",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
    pieces: [{
      start: arcEllipse(vec(-0.42, -0.18), vec(0.15, 0.3), 0.78, deg(150), deg(260)),
      solution: arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260)),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 })],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
  {
    // Ta sama geometria od drugiej strony: elipsa stała, gracz rusza HIPERBOLĄ.
    // Uczy, że wspólne ognisko jest wspólne — można je dosunąć z każdej strony.
    // Zablokowane `ognisko1` (dołek) i `rozmiar`: zostaje jeden uchwyt, jedna lekcja.
    id: "druga-strona", title: "Druga strona",
    hint: "Tym razem lustro stoi. Przesuń hiperbolę tak, żeby jej dalsze ognisko usiadło w ognisku elipsy.",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
    pieces: [{
      start: hyperbola(vec(-0.2, 0.3), vec(0.1, 0.2), 0.18, 1, { mid: 0, span: 1.6 }),
      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 }),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260))],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
```

Dopisz nad `STAGE_3` pomocnik stopni, taki sam jak w `stage2.ts`:

```ts
const deg = (x: number): number => (x * Math.PI) / 180;
```

**Uwaga o `shapeAxisAngle` na poziomie 22.** Element gracza jest tam hiperbolą, więc
kierunek bazowy dowodu bierze się z jej osi — ale oba poziomy mają `sector`, więc
kierunek bazowy i tak nie jest używany (`launchAngles` idzie gałęzią wachlarza).
Nie ma tu nic do ustawiania.

- [ ] **Krok 3: Kalibracja — to jest zadanie o największym ryzyku w planie**

Run: `npx vite-node scripts/sprawdz-poziom.ts wspolne-ognisko`

Oczekiwane: `rozwiązanie: 8/8`, po dwa odbicia. Prawdopodobne objawy i reakcje,
w tej kolejności:

1. **Część piłek ma tylko jedno odbicie (trafia w elipsę i leci prosto do M).**
   Kawałek hiperboli jest za wąski — zbiegający stożek go mija. Zwiększaj `span`
   hiperboli: `1.6` → `2.2` → `2.8`. Sprawdzaj po każdym kroku.
2. **Część piłek ma trzy odbicia.** Kawałek hiperboli jest za szeroki i łapie piłki
   jeszcze przed elipsą albo po drodze do dołka. Zmniejszaj `span` i/lub przesuń `mid`
   o ±0.3, żeby kawałek objął tylko okolicę wierzchołka.
3. **Wszystkie odbijają się dwa razy, ale chybiają o podobną, niewielką odległość.**
   Dołek nie leży dokładnie w ognisku hiperboli. Dołek MUSI być równy `f1` hiperboli
   co do cyfry — sprawdź, czy obie liczby są identyczne w danych.
4. **Piłki lecą w nieczynną gałąź.** Sprawdź `branch`. Konwencja: `shapeFrame` ustawia
   oś jako `norm(f2 − f1)`, a `branch: 1` kładzie wierzchołek po stronie `f2`. Skoro
   `f2 = M`, to `branch: 1` wybiera gałąź przy M — tę, w którą piłki lecą. Jeśli
   diagnostyka pokazuje odbicia po przeciwnej stronie planszy, zamień na `-1`.
5. **Część piłek odbija się od hiperboli i leci W BOK, nie w dołek.** Stożek nadlatuje
   do M z dwóch stron i część piłek trafia gałąź od wewnątrz. Zwęź `sector` (1.4 → 1.0)
   i skróć łuk elipsy (np. `deg(165), deg(245)`), aż wszystkie nadlatują z jednej strony.
6. **Wszystkie odbijają się trzy razy, a trzecie odbicie jest od elipsy.** Dołek wypadł
   poza łukiem elipsy i wiązka odbita przebija lustro. Przesuń dołek bliżej środka
   elipsy — musi leżeć wewnątrz niej — i pamiętaj, że dołek jest zarazem `f1` hiperboli,
   więc zmieniasz obie liczby naraz.
7. **Nic nie pomaga.** Rozsuń układ: przesuń M dalej od dołka (np. na `(0.45, 0.65)`),
   co daje hiperboli większe `c` i płytszą gałąź, łatwiejszą do trafienia.

Powtórz dla `druga-strona`. Ten poziom ma **tę samą** geometrię rozwiązania, więc jeśli
poprzedni się domknął, ten domknie się tymi samymi liczbami — przepisz je.

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test`
Expected: PASS, w tym nowy test pozaosiowości.

- [ ] **Krok 5: Przejdź oba palcem**

`npm run dev`, menu → 21 i 22. Sprawdź: widać tylko JEDNĄ gałąź hiperboli; po włączeniu
podpowiedzi widać asymptoty; uchwyt rozmiaru na 22 jest nieaktywny i hiperbola nie
wywraca się przy ciągnięciu ogniska.

- [ ] **Krok 6: Commit**

```bash
git add src/levels/stage3.ts tests/levels.test.ts
git commit -m "feat(levels): poziomy 21 Wspolne ognisko i 22 Druga strona - uklad pozaosiowy"
```

---

## Zadanie 15: Poziomy 23 „Która gałąź" i 24 „Zwieńczenie"

**Pliki:**
- Zmiana: `src/levels/stage3.ts`, `tests/levels.test.ts`, `tests/ui/game.test.ts`

- [ ] **Krok 1: Testy**

W `tests/levels.test.ts` zamień `toHaveLength(22)` na `toHaveLength(24)` i dopisz:

```ts
  it("poziom 23 ma na planszy obie gałęzie, ale odbija tylko jedna", () => {
    const l = LEVELS.find((x) => x.id === "ktora-galaz")!;
    const gracz = l.pieces[0].solution;
    if (gracz.kind !== "hiperbola") throw new Error("zły rodzaj");
    const bliznjak = { ...gracz, branch: (gracz.branch === 1 ? -1 : 1) as 1 | -1 };
    // nieczynna gałąź leży na planszy...
    const p = shapeToPiece(bliznjak);
    const pts = piecePolyline(p, 32);
    expect(pts.some((q) => Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1)).toBe(true);
    // ...ale żadne odbicie rozwiązania nie wypada na niej
    const czynna = shapeToPiece(gracz);
    for (const b of proofFor(l, [gracz]).balls) {
      for (const odbicie of b.path.slice(1, -1)) {
        if (onPiece(p, odbicie)) expect(onPiece(czynna, odbicie)).toBe(true);
      }
    }
  });

  it("poziom 24 składa wszystkie trzy stożkowe", () => {
    const l = LEVELS.find((x) => x.id === "zwienczenie-3")!;
    const rodzaje = new Set([
      ...l.pieces.map((p) => p.solution.kind),
      ...l.obstacles.map((o) => o.kind),
    ]);
    expect(rodzaje).toContain("elipsa");
    expect(rodzaje).toContain("parabola");
    expect(rodzaje).toContain("hiperbola");
  });
```

W `tests/ui/game.test.ts` istniejący blok `it.each(LEVELS.slice(8) …)` obejmie nowe
poziomy bez zmian — sprawdź, że tak jest, i jeśli slice jest sztywny, zostaw go.

Run: `npx vitest run tests/levels.test.ts` → FAIL (22 zamiast 24).

- [ ] **Krok 2: Dane**

Dopisz na końcu `STAGE_3`:

```ts
  {
    // Jedyny poziom, na którym OBIE gałęzie są widoczne. Czynna jest ta wskazana przez
    // `branch`; druga jest narysowana i NIE odbija. Wygląda to jak usterka, więc mówi
    // o tym podpowiedź — a gracz uczy się, że gałąź należy do swojego ogniska.
    // `c` jest tu duże (ogniska daleko), więc obie gałęzie mieszczą się na planszy.
    id: "ktora-galaz", title: "Która gałąź",
    hint: "Odbija tylko ta gałąź, która obejmuje swoje ognisko. Druga jest tylko rysunkiem.",
    ball: vec(-0.55, -0.55), hole: vec(-0.25, 0.25),
    pieces: [{
      start: hyperbola(vec(-0.25, 0.25), vec(0.2, 0.35), 0.2, 1, { mid: 0, span: 1.8 }),
      solution: hyperbola(vec(-0.25, 0.25), vec(0.4, 0.6), 0.2, 1, { mid: 0, span: 1.8 }),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.55, -0.55), vec(0.4, 0.6), 0.8, deg(150), deg(260))],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
  {
    // Kaskada z trzech stożkowych: parabola robi z pęku wiązkę równoległą, elipsa
    // zbiera ją w swoje drugie ognisko M, hiperbola przenosi M w dołek.
    // Gracz rusza paraboli i elipsy; hiperbola stoi.
    id: "zwienczenie-3", title: "Zwieńczenie",
    hint: "Trzy krzywe, trzy zadania. Każda podaje następnej.",
    ball: vec(-0.6, -0.5), hole: vec(-0.15, 0.2),
    pieces: [
      {
        start: parabola(vec(-0.5, -0.3), vec(-0.85, -0.6), { mid: 0, span: 1.0 }),
        solution: parabola(vec(-0.6, -0.5), vec(-0.85, -0.5), { mid: 0, span: 1.0 }),
        locked: ["wierzcholek"],
      },
      {
        start: arcEllipse(vec(-0.3, -0.1), vec(0.2, 0.4), 0.8, deg(150), deg(260)),
        solution: arcEllipse(vec(-0.6, -0.5), vec(0.4, 0.55), 0.8, deg(150), deg(260)),
        locked: ["rozmiar", "poczatek", "koniec"],
      },
    ],
    obstacles: [hyperbola(vec(-0.15, 0.2), vec(0.4, 0.55), 0.2, 1, { mid: 0, span: 1.6 })],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
```

- [ ] **Krok 3: Kalibracja**

Run: `npx vite-node scripts/sprawdz-poziom.ts ktora-galaz`

Ten poziom ma **sprzeczne wymagania**, które trzeba wyważyć: obie gałęzie mają się
zmieścić na planszy (duże `c`, czyli ogniska daleko od siebie), ale nieczynna gałąź
nie może wchodzić w drogę piłkom. Jeśli piłki odbijają się od nieczynnej gałęzi —
a diagnostyka pokaże to jako odbicie po przeciwnej stronie planszy — **to jest błąd
implementacji zadania 3, nie danych**: `onPiece` ma taki przypadek odrzucać. Wróć do
`tests/core/piece.test.ts` i sprawdź test „punkt na nieczynnej gałęzi nie należy".

Jeśli nieczynna gałąź w ogóle nie mieści się na planszy (test to wykryje), zmniejsz
`a` do `0.15` — mniejsze `a` przy tym samym `c` rozsuwa gałęzie ku asymptotom
i przybliża je do środka planszy.

Run: `npx vite-node scripts/sprawdz-poziom.ts zwienczenie-3`

Poziom 24 to trzy odbicia na piłkę, więc `maxBounces: 4` jest ciasne — jeśli
diagnostyka pokaże piłki kończące na czwartym odbiciu bez trafienia, podnieś
`maxBounces` tego poziomu do `5`. Jest to dopuszczalne: `maxBounces` należy do danych
poziomu (`level.test`), a nie do reguł gry.

Kolejność domykania: najpierw wyłącz hiperbolę (zakomentuj ją w `obstacles`) i doprowadź
do tego, żeby parabola z elipsą trafiały ósemką w M; potem włącz hiperbolę i dostrój
jej `span`. Dwa etapy naraz są nie do zdiagnozowania.

- [ ] **Krok 4: Uruchom testy**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: PASS, budżet poniżej 100 KB gzip.

- [ ] **Krok 5: Przejdź oba palcem**

`npm run dev`, menu → 23 i 24. Na 23 sprawdź, że piłka **przelatuje przez** nieczynną
gałąź bez odbicia — to jest sedno poziomu i jedyny sposób, żeby zobaczyć, czy `onPiece`
działa w prawdziwej grze.

- [ ] **Krok 6: Commit**

```bash
git add src/levels/stage3.ts tests/levels.test.ts tests/ui/game.test.ts
git commit -m "feat(levels): poziomy 23 Ktora galaz i 24 Zwienczenie"
```

---

## Zadanie 16: Weryfikacja końcowa

Nic nowego nie powstaje; zadanie potwierdza, że etap jest skończony, i spisuje decyzje.

**Pliki:**
- Nowy: `docs/superpowers/decyzje-etap-3.md`
- Zmiana: `docs/superpowers/specs/2026-09-09-golf-geometryczny-design.md` (mapa etapów)

- [ ] **Krok 1: Pełna siatka**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: wszystko zielone. Zanotuj rozmiar paczki gzip z wyjścia `vite build`.

- [ ] **Krok 2: Kryterium 5% dla każdego nowego poziomu osobno**

Run: `npx vitest run tests/levels.test.ts -t "5%"`
Expected: PASS dla wszystkich 24 poziomów.

Jeśli któryś nowy poziom odpada, kolejność reakcji jest wiążąca (spec §9):
1. zwęź kawałek krzywej odbierającej (`span`) — surowsze lustro,
2. obniż `holeRadius` **tego poziomu**,
3. zmień geometrię poziomu.
**Nigdy** nie rozluźniaj samego kryterium i nigdy nie schodź z `SNAP_RADIUS`
poniżej `0.05 · DIAGONAL` — niezmiennik z §8 etapu 1 musi zostać spełniony z zapasem.

- [ ] **Krok 3: Przejazd wszystkich ośmiu poziomów palcem**

`npm run dev`. Przejdź 17–24 **od stanu startowego, wyłącznie przeciągając odblokowane
uchwyty** — nie wolno edytować danych. Po każdej wygranej sprawdź w konsoli
przeglądarki, że poziom zapisał się w postępie:

```js
JSON.parse(localStorage.getItem("golf-geometryczny/postep")).solved
```

Zrzut ekranu nie wystarcza — liczy się wpis w `localStorage`, tak jak przy etapie 2.

Jeśli poziom przechodzi test, ale jest niewykonalny palcem (uchwyt nie do trafienia,
rozwiązanie na grubości piksela), to jest **usterka poziomu**, nie gracza — wróć do
odpowiedniego zadania i przesuń geometrię.

- [ ] **Krok 4: Spis decyzji**

Napisz `docs/superpowers/decyzje-etap-3.md` w formacie `decyzje-etap-2.md`: każda decyzja
podjęta bez pytania w trakcie realizacji, z uzasadnieniem i z „kosztem, jeśli źle".
Obowiązkowo opisz: wynik kalibracji poziomów 21–24 (które `span`, które `sector`, jakie
`holeRadius`), czy `maxBounces` gdzieś wzrosło, oraz obie decyzje planu odbiegające
od specyfikacji z nagłówka tego dokumentu.

- [ ] **Krok 5: Aktualizacja mapy etapów**

W `docs/superpowers/specs/2026-09-09-golf-geometryczny-design.md`, w tabeli §10, zmień
wiersz etapu 3 z „mały — same dane i warunki zwycięstwa" na rzeczywistą wycenę i dopisz
odsyłacz do specyfikacji etapu 3. Z sekcji „Poza zakresem v1" usuń „Parabola i hiperbola
(etap 3)". Wycena była błędna z powodu geometrycznego opisanego w §1 specyfikacji etapu 3
i ten błąd ma zostać zapisany, a nie zamieciony.

- [ ] **Krok 6: Commit**

```bash
git add docs
git commit -m "docs: rozstrzygniecia etapu 3 i poprawiona wycena w mapie etapow"
```

---

## Mapa plików

| Plik | Odpowiedzialność | Zadanie |
|---|---|---|
| `src/core/conic.ts` | postacie kwadratowe wszystkich stożkowych | 1 |
| `src/core/frame.ts` | **nowy** — punkt ↔ parametr dla krzywych nieograniczonych | 2 |
| `src/core/piece.ts` | kawałek krzywej: cięciwa albo zakres parametru | 3 |
| `src/core/verify.ts` | dowód ósemką; przestaje znać geometrię | 4 |
| `src/levels/types.ts` | typy kształtów i uchwytów | 5, 7, 10 |
| `src/levels/span.ts` | **nowy** — długość wzdłuż krzywej nieograniczonej | 6 |
| `src/levels/shape.ts` | kształt poziomu → `Piece`, `Conic`, `CurveFrame` | 7 |
| `src/levels/stage3.ts` | **nowy** — dane poziomów 17–24 | 12–15 |
| `src/render/shapes.ts` | łamane krzywych i linie pomocnicze | 8, 11 |
| `src/render/draw.ts` | rysowanie kawałka, paleta | 11 |
| `src/ui/handles.ts` | uchwyty i niezmienniki przeciągania | 10 |
| `src/ui/game.ts`, `src/ui/screens.ts` | stan gry i ekran na `MovableShape` | 9, 11 |
| `tests/core/dwustopniowe.test.ts` | **nowy** — własność stałej drogi, odpowiednik testu `2a` | 7b |
| `scripts/sprawdz-poziom.ts` | **nowy** — diagnostyka przy kalibracji | 12 |
