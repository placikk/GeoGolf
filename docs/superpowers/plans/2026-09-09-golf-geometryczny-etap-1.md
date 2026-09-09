# Golf geometryczny — plan implementacji (etap 1)

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> `superpowers:subagent-driven-development` (zalecane) albo
> `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu.
> Kroki używają składni checkboxów (`- [ ]`) do śledzenia postępu.

**Cel:** Zbudować grywalną wersję 1 gry logicznej, w której gracz konstruuje
elipsę tak, żeby jej ogniska pokryły się z piłką i dołkiem, a osiem
jednocześnie wystrzelonych piłek stanowi dowód poprawności.

**Architektura:** Czysty rdzeń geometryczny bez zależności (jedna reprezentacja
— ogólna forma kwadratowa — dla wszystkich stożkowych i prostych), otoczony
cienką skorupą rysującą na Canvas 2D. Rdzeń nie wie nic o przeglądarce, dzięki
czemu testuje się go w Node twierdzeniami matematycznymi, a nie przykładami.

**Stos:** TypeScript (strict), Canvas 2D, Vite, Vitest. **Zero zależności
produkcyjnych.**

**Spec:** `docs/superpowers/specs/2026-09-09-golf-geometryczny-design.md`

## Ograniczenia globalne

Obowiązują w **każdym** zadaniu, nawet jeśli zadanie ich nie powtarza:

- **Zero zależności produkcyjnych.** `dependencies` w `package.json` zostaje
  puste. Wszystko poza `devDependencies` jest błędem.
- **Budżet paczki: < 100 KB gzip.** Pilnowany testem z zadania 1.
- **`shadowBlur` na Canvasie jest zakazany.** Poświata wyłącznie przez podwójny
  obrys (szeroki półprzezroczysty + cienki jasny).
- **`src/core/` nie importuje niczego spoza `src/core/`.** Pilnowane testem
  z zadania 5.
- **Prędkość piłki jest dosłowna.** Żadnych krzywych czasu na ruchu piłek.
  Krzywe czasu wolno stosować wyłącznie do interfejsu i do przekształceń krzywej
  podczas przeciągania.
- **Świat to kwadrat `[-1, 1] × [-1, 1]`, oś Y w górę.** Rdzeń nigdy nie widzi
  pikseli. Przekątna planszy `DIAGONAL = 2 * Math.SQRT2`.
- **Tolerancja dołka:** `0.02 * DIAGONAL`. **Promień przyskakiwania:**
  `0.05 * DIAGONAL`, nigdy mniejszy od pasa tolerancji.
- **Język:** nazwy w kodzie po angielsku, teksty widoczne dla gracza po polsku.
- **TypeScript w trybie `strict`.** Żadnego `any`.

---

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `src/core/vec.ts` | wektor 2D i operacje na nim |
| `src/core/conic.ts` | typ `Conic`, konstruktory, klasyfikacja, odzyskiwanie geometrii |
| `src/core/intersect.ts` | przecięcie półprostej ze stożkową |
| `src/core/reflect.ts` | normalna i odbicie kierunku |
| `src/core/trace.ts` | śledzenie toru piłki przez wiele odbić |
| `src/core/verify.ts` | dowód ósemką: kierunki startu i warunek zwycięstwa |
| `src/levels/types.ts` | typ `Level` i typ rozwiązania |
| `src/levels/index.ts` | dane ośmiu poziomów wraz z rozwiązaniami |
| `src/render/camera.ts` | odwzorowanie świata na piksele |
| `src/render/shapes.ts` | zamiana stożkowej na polilinię do narysowania |
| `src/render/draw.ts` | prymitywy rysowania: świecąca linia, punkt, krzywa |
| `src/render/trails.ts` | bufory smug i ich gaśnięcie |
| `src/ui/input.ts` | dotyk, przeciąganie uchwytów, przyskakiwanie |
| `src/ui/game.ts` | stan poziomu, pętla animacji, przebieg dowodu |
| `src/ui/screens.ts` | ekrany: wybór poziomu, plansza, wygrana, galeria |
| `src/main.ts` | punkt wejścia, spina skorupę |

Podział jest według odpowiedzialności, nie według warstwy technicznej. Pliki,
które zmieniają się razem, leżą razem.

---

## Zadanie 1: Szkielet projektu i strażnik budżetu

**Pliki:**
- Utwórz: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`,
  `src/main.ts`
- Test: `tests/budget.test.ts`

**Interfejsy:**
- Konsumuje: nic (pierwsze zadanie)
- Produkuje: działające `npm test`, `npm run build`, `npm run dev`

- [ ] **Krok 1: Utwórz `package.json`**

```json
{
  "name": "golf-geometryczny",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^22.7.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Krok 2: Utwórz `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "lib": ["ES2022", "DOM"],
    "types": ["node", "vitest/globals"],
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Krok 3: Utwórz `vite.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: { target: "es2022" },
  test: { globals: true, environment: "node" },
});
```

- [ ] **Krok 4: Utwórz `index.html` i `src/main.ts`**

`index.html`:
```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Golf geometryczny</title>
    <style>
      html, body { margin: 0; height: 100%; background: #0b0f14; overflow: hidden; }
      canvas { display: block; touch-action: none; }
    </style>
  </head>
  <body>
    <canvas id="plansza"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:
```ts
const canvas = document.getElementById("plansza") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
```

- [ ] **Krok 5: Napisz test budżetu (musi paść, bo nie ma jeszcze `dist/`)**

`tests/budget.test.ts`:
```ts
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const LIMIT = 100 * 1024;

describe("budżet paczki", () => {
  it("zbudowana paczka mieści się poniżej 100 KB po gzipie", () => {
    execSync("npm run build", { stdio: "pipe" });
    const dir = "dist/assets";
    const total = readdirSync(dir)
      .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
      .reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(LIMIT);
  }, 120_000);
});
```

- [ ] **Krok 6: Zainstaluj zależności i uruchom test**

Uruchom: `npm install && npm test`
Oczekiwane: test **przechodzi** (budowa się udaje, paczka jest maleńka).
Jeśli pada na braku `dist/assets` — sprawdź, czy `npm run build` kończy się bez
błędu; `tsc --noEmit` musi przejść na pustym `main.ts`.

- [ ] **Krok 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts tests/budget.test.ts
git commit -m "feat: szkielet projektu, Vite + TypeScript + Vitest, straznik budzetu paczki"
```

---

## Zadanie 2: Wektor i reprezentacja stożkowej

**Pliki:**
- Utwórz: `src/core/vec.ts`, `src/core/conic.ts`
- Test: `tests/core/conic.test.ts`

**Interfejsy:**
- Konsumuje: nic z wcześniejszych zadań
- Produkuje:
  - `interface Vec2 { x: number; y: number }`
  - `vec(x, y): Vec2`, `add(a, b)`, `sub(a, b)`, `scale(a, k)`, `dot(a, b): number`,
    `len(a): number`, `dist(a, b): number`, `norm(a): Vec2`, `perp(a): Vec2`,
    `fromAngle(t: number): Vec2`
  - `interface Conic { A: number; B: number; C: number; D: number; E: number; F: number }`
  - `evalConic(k: Conic, p: Vec2): number`
  - `classify(k: Conic): "elipsa" | "parabola" | "hiperbola" | "prosta"`
  - `ellipseFromFoci(f1: Vec2, f2: Vec2, a: number): Conic`
  - `lineThrough(p: Vec2, dir: Vec2): Conic`
  - `interface EllipseGeometry { center: Vec2; a: number; b: number; angle: number }`
  - `ellipseGeometry(k: Conic): EllipseGeometry`

**Tło matematyczne (przeczytaj przed pisaniem kodu):**

Elipsa o środku `c`, półosiach `a` (wielka) i `b` (mała), obrócona o kąt `θ`,
ma współczynniki: przy `u = cos θ`, `v = sin θ`

```
A = u²/a² + v²/b²
B = 2·u·v·(1/a² − 1/b²)
C = v²/a² + u²/b²
D = −2A·cx − B·cy
E = −2C·cy − B·cx
F = A·cx² + B·cx·cy + C·cy² − 1
```

Odzyskanie geometrii z współczynników: środek to rozwiązanie układu
`2A·cx + B·cy + D = 0`, `B·cx + 2C·cy + E = 0`, czyli przy `det = 4AC − B²`

```
cx = (B·E − 2C·D) / det
cy = (B·D − 2A·E) / det
```

Wartości własne macierzy `[[A, B/2], [B/2, C]]`:
`λ± = ((A + C) ± hypot(A − C, B)) / 2`. Oś **wielka** odpowiada **mniejszej**
wartości własnej. Przy `Fc = evalConic(k, center)` półosie to
`a = √(−Fc / λmin)`, `b = √(−Fc / λmax)`. Wektor własny dla `λmin` to
`(B/2, λmin − A)`, a gdy `B ≈ 0` — oś `x`, jeśli `A ≤ C`, w przeciwnym razie oś `y`.

- [ ] **Krok 1: Napisz `src/core/vec.ts`**

```ts
export interface Vec2 { x: number; y: number }

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });
export const fromAngle = (t: number): Vec2 => ({ x: Math.cos(t), y: Math.sin(t) });

export const norm = (a: Vec2): Vec2 => {
  const l = len(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
```

- [ ] **Krok 2: Napisz test, który musi paść**

`tests/core/conic.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import {
  evalConic, classify, ellipseFromFoci, lineThrough, ellipseGeometry,
} from "../../src/core/conic";

describe("stożkowa", () => {
  it("elipsa z ognisk zawiera punkty o sumie odległości równej 2a", () => {
    const f1 = vec(-0.5, 0), f2 = vec(0.5, 0), a = 0.8;
    const k = ellipseFromFoci(f1, f2, a);
    // wierzchołek osi wielkiej leży na krzywej
    expect(evalConic(k, vec(a, 0))).toBeCloseTo(0, 10);
    // punkt o sumie 2a leży na krzywej
    const b = Math.sqrt(a * a - 0.25);
    const p = vec(0, b);
    expect(dist(p, f1) + dist(p, f2)).toBeCloseTo(2 * a, 10);
    expect(evalConic(k, p)).toBeCloseTo(0, 10);
  });

  it("klasyfikuje elipsę, prostą i wynik obrotu ognisk", () => {
    expect(classify(ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8))).toBe("elipsa");
    expect(classify(ellipseFromFoci(vec(-0.3, -0.3), vec(0.3, 0.3), 0.9))).toBe("elipsa");
    expect(classify(lineThrough(vec(0, 0), vec(1, 0)))).toBe("prosta");
  });

  it("odzyskuje geometrię elipsy ze współczynników", () => {
    const f1 = vec(-0.2, 0.4), f2 = vec(0.6, -0.1), a = 0.9;
    const g = ellipseGeometry(ellipseFromFoci(f1, f2, a));
    expect(g.center.x).toBeCloseTo(0.2, 10);
    expect(g.center.y).toBeCloseTo(0.15, 10);
    expect(g.a).toBeCloseTo(a, 10);
    const c = dist(f1, f2) / 2;
    expect(g.b).toBeCloseTo(Math.sqrt(a * a - c * c), 10);
    expect(Math.tan(g.angle)).toBeCloseTo(Math.tan(Math.atan2(-0.5, 0.8)), 10);
  });

  it("prosta ma zerowy człon kwadratowy i zeruje się na sobie", () => {
    const k = lineThrough(vec(0, 0.3), vec(1, 0));
    expect(k.A).toBe(0);
    expect(k.B).toBe(0);
    expect(k.C).toBe(0);
    expect(evalConic(k, vec(5, 0.3))).toBeCloseTo(0, 12);
    expect(evalConic(k, vec(5, 0.9))).not.toBeCloseTo(0, 6);
  });
});
```

- [ ] **Krok 3: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/core/conic.test.ts`
Oczekiwane: FAIL — `Failed to resolve import "../../src/core/conic"`.

- [ ] **Krok 4: Napisz `src/core/conic.ts`**

```ts
import { Vec2, dist, vec } from "./vec";

export interface Conic { A: number; B: number; C: number; D: number; E: number; F: number }

const EPS = 1e-12;

export const evalConic = (k: Conic, p: Vec2): number =>
  k.A * p.x * p.x + k.B * p.x * p.y + k.C * p.y * p.y + k.D * p.x + k.E * p.y + k.F;

export function classify(k: Conic): "elipsa" | "parabola" | "hiperbola" | "prosta" {
  if (Math.abs(k.A) < EPS && Math.abs(k.B) < EPS && Math.abs(k.C) < EPS) return "prosta";
  const disc = k.B * k.B - 4 * k.A * k.C;
  if (disc < -EPS) return "elipsa";
  if (disc > EPS) return "hiperbola";
  return "parabola";
}

export function ellipseFromFoci(f1: Vec2, f2: Vec2, a: number): Conic {
  const c = dist(f1, f2) / 2;
  if (a <= c) throw new Error("połowa osi wielkiej musi przekraczać połowę odległości ognisk");
  const b = Math.sqrt(a * a - c * c);
  const angle = Math.atan2(f2.y - f1.y, f2.x - f1.x);
  const u = Math.cos(angle), v = Math.sin(angle);
  const ia = 1 / (a * a), ib = 1 / (b * b);
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

export function lineThrough(p: Vec2, dir: Vec2): Conic {
  const n = { x: -dir.y, y: dir.x };
  return { A: 0, B: 0, C: 0, D: n.x, E: n.y, F: -(n.x * p.x + n.y * p.y) };
}

export interface EllipseGeometry { center: Vec2; a: number; b: number; angle: number }

export function ellipseGeometry(k: Conic): EllipseGeometry {
  const det = 4 * k.A * k.C - k.B * k.B;
  if (Math.abs(det) < EPS) throw new Error("krzywa nie ma środka — to nie jest elipsa");
  const center = vec((k.B * k.E - 2 * k.C * k.D) / det, (k.B * k.D - 2 * k.A * k.E) / det);
  const fc = evalConic(k, center);
  const root = Math.hypot(k.A - k.C, k.B);
  const lamMin = (k.A + k.C - root) / 2;
  const lamMax = (k.A + k.C + root) / 2;
  const axis =
    Math.abs(k.B) < EPS
      ? (k.A <= k.C ? vec(1, 0) : vec(0, 1))
      : vec(k.B / 2, lamMin - k.A);
  return {
    center,
    a: Math.sqrt(-fc / lamMin),
    b: Math.sqrt(-fc / lamMax),
    angle: Math.atan2(axis.y, axis.x),
  };
}
```

- [ ] **Krok 5: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/core/conic.test.ts`
Oczekiwane: PASS, cztery testy.

- [ ] **Krok 6: Commit**

```bash
git add src/core/vec.ts src/core/conic.ts tests/core/conic.test.ts
git commit -m "feat(core): wektor 2D i stozkowa w ogolnej formie kwadratowej"
```

---

## Zadanie 3: Przecięcie półprostej ze stożkową

**Pliki:**
- Utwórz: `src/core/intersect.ts`
- Test: `tests/core/intersect.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2` z `vec.ts`, `Conic` z `conic.ts` (zadanie 2)
- Produkuje:
  - `export const EPS_T = 1e-9`
  - `rayConic(p: Vec2, d: Vec2, k: Conic): number | null` — najmniejsze `t > EPS_T`
    takie, że `p + t·d` leży na krzywej; `null`, gdy trafienia nie ma.
    **Wymaga, żeby `d` był znormalizowany.**

**Tło matematyczne:** podstawienie `P(t) = p + t·d` daje `at² + bt + c = 0` przy

```
a = A·dx² + B·dx·dy + C·dy²
b = 2A·px·dx + B·(px·dy + py·dx) + 2C·py·dy + D·dx + E·dy
c = evalConic(k, p)
```

Gdy `|a| < EPS` równanie jest **liniowe** (krzywa jest prostą albo promień biegnie
wzdłuż asymptoty) i rozwiązaniem jest `t = −c / b`. Ta gałąź nie jest ozdobą —
bez niej wszystkie ściany proste przestaną działać.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/core/intersect.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec, norm } from "../../src/core/vec";
import { Conic, lineThrough, ellipseFromFoci } from "../../src/core/conic";
import { rayConic } from "../../src/core/intersect";

const circle: Conic = { A: 1, B: 0, C: 1, D: 0, E: 0, F: -1 };

describe("przecięcie półprostej ze stożkową", () => {
  it("trafia okrąg jednostkowy ze środka", () => {
    expect(rayConic(vec(0, 0), vec(1, 0), circle)).toBeCloseTo(1, 12);
    expect(rayConic(vec(0, 0), norm(vec(1, 1)), circle)).toBeCloseTo(1, 12);
  });

  it("bierze najbliższe trafienie, nie najdalsze", () => {
    expect(rayConic(vec(-2, 0), vec(1, 0), circle)).toBeCloseTo(1, 12);
  });

  it("zwraca null, gdy promień mija krzywą", () => {
    expect(rayConic(vec(-2, 5), vec(1, 0), circle)).toBeNull();
  });

  it("nie zwraca trafień za plecami", () => {
    expect(rayConic(vec(2, 0), vec(1, 0), circle)).toBeNull();
  });

  it("obsługuje prostą, czyli gałąź liniową", () => {
    const wall = lineThrough(vec(0, 0.5), vec(1, 0));
    expect(rayConic(vec(0, 0), vec(0, 1), wall)).toBeCloseTo(0.5, 12);
    expect(rayConic(vec(0, 0), vec(0, -1), wall)).toBeNull();
  });

  it("ignoruje trafienie w punkcie startu (chroni przed zakleszczeniem)", () => {
    // start dokładnie na krzywej, kierunek do wewnątrz
    const t = rayConic(vec(1, 0), vec(-1, 0), circle);
    expect(t).toBeCloseTo(2, 12);
  });

  it("trafia obróconą elipsę", () => {
    const k = ellipseFromFoci(vec(-0.3, -0.3), vec(0.3, 0.3), 0.7);
    const t = rayConic(vec(-0.3, -0.3), norm(vec(0, 1)), k);
    expect(t).not.toBeNull();
    expect(t as number).toBeGreaterThan(0);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/core/intersect.test.ts`
Oczekiwane: FAIL — brak modułu `intersect`.

- [ ] **Krok 3: Napisz `src/core/intersect.ts`**

```ts
import { Vec2 } from "./vec";
import { Conic, evalConic } from "./conic";

/** Trafienia bliższe niż ten próg są odrzucane — piłka stoi dokładnie na krzywej
 *  po odbiciu i bez tego natychmiast „trafiłaby” w nią ponownie w t ≈ 0. */
export const EPS_T = 1e-9;

const EPS_A = 1e-12;

export function rayConic(p: Vec2, d: Vec2, k: Conic): number | null {
  const a = k.A * d.x * d.x + k.B * d.x * d.y + k.C * d.y * d.y;
  const b =
    2 * k.A * p.x * d.x +
    k.B * (p.x * d.y + p.y * d.x) +
    2 * k.C * p.y * d.y +
    k.D * d.x +
    k.E * d.y;
  const c = evalConic(k, p);

  if (Math.abs(a) < EPS_A) {
    if (Math.abs(b) < EPS_A) return null;
    const t = -c / b;
    return t > EPS_T ? t : null;
  }

  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  // postać stabilna numerycznie: unika odejmowania bliskich sobie liczb
  const q = -0.5 * (b + Math.sign(b || 1) * sq);
  const t1 = q / a;
  const t2 = c / q;

  const hits = [t1, t2].filter((t) => Number.isFinite(t) && t > EPS_T).sort((x, y) => x - y);
  return hits.length > 0 ? hits[0] : null;
}
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/core/intersect.test.ts`
Oczekiwane: PASS, siedem testów.

- [ ] **Krok 5: Commit**

```bash
git add src/core/intersect.ts tests/core/intersect.test.ts
git commit -m "feat(core): przeciecie polprostej ze stozkowa z galezia liniowa"
```

---

## Zadanie 4: Normalna i odbicie

**Pliki:**
- Utwórz: `src/core/reflect.ts`
- Test: `tests/core/reflect.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2`, `norm`, `dot`, `sub`, `scale` z `vec.ts`; `Conic` z `conic.ts`
- Produkuje:
  - `normalAt(k: Conic, p: Vec2): Vec2` — znormalizowany gradient formy
  - `reflectDir(d: Vec2, n: Vec2): Vec2` — `d` i `n` znormalizowane, wynik znormalizowany

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/core/reflect.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec, norm, len } from "../../src/core/vec";
import { Conic, lineThrough } from "../../src/core/conic";
import { normalAt, reflectDir } from "../../src/core/reflect";

const circle: Conic = { A: 1, B: 0, C: 1, D: 0, E: 0, F: -1 };

describe("normalna i odbicie", () => {
  it("normalna okręgu jest promieniowa", () => {
    const n = normalAt(circle, vec(1, 0));
    expect(n.x).toBeCloseTo(1, 12);
    expect(n.y).toBeCloseTo(0, 12);
    expect(len(n)).toBeCloseTo(1, 12);
  });

  it("normalna poziomej ściany jest pionowa", () => {
    const n = normalAt(lineThrough(vec(0, 0.5), vec(1, 0)), vec(0.2, 0.5));
    expect(Math.abs(n.y)).toBeCloseTo(1, 12);
    expect(n.x).toBeCloseTo(0, 12);
  });

  it("odbicie prostopadłe zawraca kierunek", () => {
    const d = reflectDir(vec(1, 0), vec(1, 0));
    expect(d.x).toBeCloseTo(-1, 12);
    expect(d.y).toBeCloseTo(0, 12);
  });

  it("odbicie pod kątem zachowuje składową styczną", () => {
    const d = reflectDir(norm(vec(1, -1)), vec(0, 1));
    expect(d.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(d.y).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it("odbicie zachowuje długość jednostkową", () => {
    expect(len(reflectDir(norm(vec(3, 7)), norm(vec(-1, 2))))).toBeCloseTo(1, 12);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/core/reflect.test.ts`
Oczekiwane: FAIL — brak modułu `reflect`.

- [ ] **Krok 3: Napisz `src/core/reflect.ts`**

```ts
import { Vec2, dot, norm, scale, sub } from "./vec";
import { Conic } from "./conic";

export const normalAt = (k: Conic, p: Vec2): Vec2 =>
  norm({ x: 2 * k.A * p.x + k.B * p.y + k.D, y: k.B * p.x + 2 * k.C * p.y + k.E });

export const reflectDir = (d: Vec2, n: Vec2): Vec2 =>
  norm(sub(d, scale(n, 2 * dot(d, n))));
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/core/reflect.test.ts`
Oczekiwane: PASS, pięć testów.

- [ ] **Krok 5: Commit**

```bash
git add src/core/reflect.ts tests/core/reflect.test.ts
git commit -m "feat(core): normalna z gradientu formy i odbicie kierunku"
```

---

## Zadanie 5: Śledzenie toru, twierdzenie `2a` i strażnik warstw

To jest **najważniejsze zadanie w całym planie.** Test twierdzenia sprawdza nie
implementację, tylko matematykę: jeśli przecięcie, normalna albo odbicie mają
błąd, ten jeden test go znajdzie.

**Pliki:**
- Utwórz: `src/core/trace.ts`
- Test: `tests/core/trace.test.ts`, `tests/layering.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2` i operacje z `vec.ts`; `Conic` z `conic.ts`;
  `rayConic`, `EPS_T` z `intersect.ts`; `normalAt`, `reflectDir` z `reflect.ts`
- Produkuje:
  - `interface TraceOptions { curves: Conic[]; hole: Vec2; holeRadius: number; maxBounces: number; maxLength: number }`
  - `interface TraceResult { path: Vec2[]; holed: boolean; length: number }`
  - `trace(start: Vec2, dir: Vec2, opt: TraceOptions): TraceResult`
  - `path` zawiera punkt startu, kolejne punkty odbić i punkt końcowy.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/core/trace.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec, dist, fromAngle } from "../../src/core/vec";
import { Conic, ellipseFromFoci, lineThrough } from "../../src/core/conic";
import { trace, TraceOptions } from "../../src/core/trace";

const base = (curves: Conic[], hole = vec(9, 9), holeRadius = 0): TraceOptions => ({
  curves, hole, holeRadius, maxBounces: 1, maxLength: 100,
});

describe("śledzenie toru", () => {
  it("TWIERDZENIE: droga ognisko → krzywa → ognisko wynosi zawsze 2a", () => {
    // 300 losowych elips i losowych kierunków. Ten test bada geometrię,
    // nie implementację — dlatego znajduje każdy błąd w rdzeniu.
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    for (let i = 0; i < 300; i++) {
      const f1 = vec(rnd() * 1.2 - 0.6, rnd() * 1.2 - 0.6);
      const f2 = vec(rnd() * 1.2 - 0.6, rnd() * 1.2 - 0.6);
      const c = dist(f1, f2) / 2;
      if (c < 0.05) continue;                    // zdegenerowane pomijamy
      const a = c + 0.05 + rnd() * 0.8;          // zawsze a > c
      const k = ellipseFromFoci(f1, f2, a);

      const r = trace(f1, fromAngle(rnd() * 2 * Math.PI), base([k]));
      expect(r.path.length).toBeGreaterThanOrEqual(2);
      const hit = r.path[1];
      expect(dist(f1, hit) + dist(hit, f2)).toBeCloseTo(2 * a, 9);
    }
  });

  it("wpada do dołka, gdy tor przechodzi w promieniu tolerancji", () => {
    const f1 = vec(-0.5, 0), f2 = vec(0.5, 0);
    const k = ellipseFromFoci(f1, f2, 0.8);
    const r = trace(f1, fromAngle(1.1), { ...base([k]), hole: f2, holeRadius: 0.02 });
    expect(r.holed).toBe(true);
    expect(r.length).toBeCloseTo(1.6, 2);       // 2a = 1.6
  });

  it("nie wpada, gdy dołek stoi w złym miejscu", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const r = trace(vec(-0.5, 0), fromAngle(1.1), {
      ...base([k]), hole: vec(0.5, 0.4), holeRadius: 0.02,
    });
    expect(r.holed).toBe(false);
  });

  it("nie zakleszcza się na krzywej po odbiciu", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const r = trace(vec(-0.5, 0), fromAngle(0.7), { ...base([k]), maxBounces: 20 });
    // 20 odbić = 21 odcinków, każdy o niezerowej długości
    expect(r.path.length).toBe(22);
    for (let i = 1; i < r.path.length; i++) {
      expect(dist(r.path[i - 1], r.path[i])).toBeGreaterThan(1e-6);
    }
  });

  it("wybiera najbliższą krzywą, gdy jest ich kilka", () => {
    const far = lineThrough(vec(0, 0.9), vec(1, 0));
    const near = lineThrough(vec(0, 0.3), vec(1, 0));
    const r = trace(vec(0, 0), vec(0, 1), { ...base([far, near]), maxBounces: 0 });
    expect(r.path[1].y).toBeCloseTo(0.3, 9);
  });

  it("kończy tor po wyczerpaniu limitu długości, gdy nic nie trafia", () => {
    const r = trace(vec(0, 0), vec(1, 0), { ...base([]), maxLength: 3 });
    expect(r.holed).toBe(false);
    expect(r.length).toBeCloseTo(3, 9);
  });
});
```

`tests/layering.test.ts`:
```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("warstwy", () => {
  it("src/core nie importuje niczego spoza src/core", () => {
    for (const file of readdirSync("src/core")) {
      const src = readFileSync(join("src/core", file), "utf8");
      const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const spec of imports) {
        expect(spec.startsWith("./"), `${file} importuje "${spec}"`).toBe(true);
      }
    }
  });
});
```

- [ ] **Krok 2: Uruchom testy i potwierdź, że padają**

Uruchom: `npx vitest run tests/core/trace.test.ts tests/layering.test.ts`
Oczekiwane: `trace.test.ts` FAIL (brak modułu). `layering.test.ts` PASS — to jest
strażnik, który ma być zielony od początku i pozostać zielony na zawsze.

- [ ] **Krok 3: Napisz `src/core/trace.ts`**

```ts
import { Vec2, add, dist, dot, norm, scale, sub } from "./vec";
import { Conic } from "./conic";
import { rayConic } from "./intersect";
import { normalAt, reflectDir } from "./reflect";

export interface TraceOptions {
  curves: Conic[];
  hole: Vec2;
  holeRadius: number;
  maxBounces: number;
  /** bezpiecznik: tor, który nic nie trafia, i tak ma skończoną długość */
  maxLength: number;
}

export interface TraceResult {
  /** punkt startu, kolejne punkty odbić, punkt końcowy */
  path: Vec2[];
  holed: boolean;
  length: number;
}

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

export function trace(start: Vec2, dir: Vec2, opt: TraceOptions): TraceResult {
  let p = start;
  let d = norm(dir);
  const path: Vec2[] = [p];
  let length = 0;

  for (let bounce = 0; bounce <= opt.maxBounces; bounce++) {
    let best: number | null = null;
    let bestCurve: Conic | null = null;
    for (const k of opt.curves) {
      const t = rayConic(p, d, k);
      if (t !== null && (best === null || t < best)) { best = t; bestCurve = k; }
    }

    const remaining = opt.maxLength - length;
    const limit = best === null ? remaining : Math.min(best, remaining);

    // dołek sprawdzamy PRZED odbiciem: piłka może wpaść w locie do ściany
    const s = clamp(dot(sub(opt.hole, p), d), 0, limit);
    const closest = add(p, scale(d, s));
    if (dist(closest, opt.hole) <= opt.holeRadius) {
      path.push(closest);
      return { path, holed: true, length: length + s };
    }

    if (best === null || bestCurve === null || best > remaining) {
      path.push(add(p, scale(d, limit)));
      return { path, holed: false, length: length + limit };
    }

    const hit = add(p, scale(d, best));
    path.push(hit);
    length += best;
    d = reflectDir(d, normalAt(bestCurve, hit));
    p = hit;
  }

  return { path, holed: false, length };
}
```

- [ ] **Krok 4: Uruchom testy i potwierdź, że przechodzą**

Uruchom: `npx vitest run tests/core/trace.test.ts tests/layering.test.ts`
Oczekiwane: PASS, siedem testów.

Jeśli twierdzenie `2a` pada dla elips bardzo smukłych, **nie rozluźniaj epsilona** —
sprawdź najpierw stabilną postać pierwiastków w `intersect.ts`. Rozluźnienie
epsilona ukryłoby błąd, który później zepsuje poziom 5.

- [ ] **Krok 5: Commit**

```bash
git add src/core/trace.ts tests/core/trace.test.ts tests/layering.test.ts
git commit -m "feat(core): sledzenie toru przez wiele odbic + test twierdzenia 2a"
```

---

## Zadanie 6: Dowód ósemką

**Pliki:**
- Utwórz: `src/core/verify.ts`
- Test: `tests/core/verify.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2`, `fromAngle` z `vec.ts`; `Conic`, `classify`, `ellipseGeometry`
  z `conic.ts`; `trace`, `TraceResult` z `trace.ts`
- Produkuje:
  - `export const BALL_COUNT = 8`
  - `launchAngles(aimCurve: Conic, count?: number): number[]`
  - `interface ProofInput { ball: Vec2; hole: Vec2; holeRadius: number; maxBounces: number; curves: Conic[]; aimCurve: Conic; count?: number }`
  - `interface Proof { balls: TraceResult[]; solved: boolean; simultaneous: boolean; spread: number }`
  - `runProof(input: ProofInput): Proof`
  - `solved` = wszystkie piłki wpadły. `spread` = różnica między najdłuższą
    a najkrótszą drogą **wśród piłek, które wpadły**. `simultaneous` =
    `solved && spread < 1e-6` — bez warunku na `solved` pole kłamałoby przy
    pojedynczym trafieniu.

Kierunki startu są przesunięte o **ćwierć kroku** względem osi wielkiej, żeby żadna
piłka nie biegła dokładnie wzdłuż osi — taki tor wraca po własnym śladzie i jest
wizualnie mylący. Gdy krzywa celowania nie jest elipsą, bazą jest kąt zero.

Ćwierć, a nie pół, z dwóch powodów. Pół kroku chroni przed osią tylko przy parzystej
liczbie piłek — przy nieparzystej indeks `(count-1)/2` ląduje dokładnie na osi. Ważniejsze:
przy `count = 2` odbicie względem osi wielkiej odwzorowuje `θ` na `2·base − θ`, więc
`base + 0.5·krok` przechodzi w `base + 1.5·krok` — dokładnie drugi kierunek. Oba tory
podglądu byłyby swoimi lustrzanymi odbiciami, a gracz widziałby połowę informacji.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/core/verify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci } from "../../src/core/conic";
import { BALL_COUNT, launchAngles, runProof } from "../../src/core/verify";

const R = 0.02 * 2 * Math.SQRT2;

describe("dowód ósemką", () => {
  it("daje osiem różnych kierunków, żaden wzdłuż osi wielkiej", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const angles = launchAngles(k);
    expect(angles).toHaveLength(BALL_COUNT);
    for (const t of angles) {
      const rel = ((t % Math.PI) + Math.PI) % Math.PI;
      expect(Math.min(rel, Math.PI - rel)).toBeGreaterThan(0.1);
    }
  });

  it("poprawna elipsa: wszystkie osiem wpada i wpada RAZEM", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(ball, hole, 0.8);
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k });
    expect(p.balls).toHaveLength(BALL_COUNT);
    expect(p.solved).toBe(true);
    expect(p.simultaneous).toBe(true);
    expect(p.spread).toBeLessThan(1e-6);
  });

  it("działa tak samo dla elipsy obróconej", () => {
    const ball = vec(-0.35, -0.4), hole = vec(0.4, 0.3);
    const k = ellipseFromFoci(ball, hole, 0.9);
    expect(runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k }).solved).toBe(true);
  });

  it("przesunięte ognisko: co najmniej jedna piłka chybia", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(vec(-0.5 + 0.141, 0), hole, 0.8);
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [k], aimCurve: k });
    expect(p.solved).toBe(false);
    expect(p.balls.some((b) => !b.holed)).toBe(true);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/core/verify.test.ts`
Oczekiwane: FAIL — brak modułu `verify`.

- [ ] **Krok 3: Napisz `src/core/verify.ts`**

```ts
import { Vec2, fromAngle } from "./vec";
import { Conic, classify, ellipseGeometry } from "./conic";
import { trace, TraceResult } from "./trace";

export const BALL_COUNT = 8;

export function launchAngles(aimCurve: Conic, count: number = BALL_COUNT): number[] {
  const base = classify(aimCurve) === "elipsa" ? ellipseGeometry(aimCurve).angle : 0;
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => base + (i + 0.25) * step);
}

export interface ProofInput {
  ball: Vec2;
  hole: Vec2;
  holeRadius: number;
  maxBounces: number;
  curves: Conic[];
  aimCurve: Conic;
  count?: number;
}

export interface Proof {
  balls: TraceResult[];
  solved: boolean;
  /** różnica między najdłuższą a najkrótszą drogą */
  spread: number;
  simultaneous: boolean;
}

export function runProof(input: ProofInput): Proof {
  const angles = launchAngles(input.aimCurve, input.count ?? BALL_COUNT);
  const balls = angles.map((t) =>
    trace(input.ball, fromAngle(t), {
      curves: input.curves,
      hole: input.hole,
      holeRadius: input.holeRadius,
      maxBounces: input.maxBounces,
      maxLength: 40,
    }),
  );
  const solved = balls.every((b) => b.holed);
  const lengths = balls.filter((b) => b.holed).map((b) => b.length);
  const spread = lengths.length > 0 ? Math.max(...lengths) - Math.min(...lengths) : Infinity;
  // `simultaneous` musi zależeć od `solved`: gdy wpadnie jedna piłka, spread wynosi 0,
  // a pole meldowałoby "przybyły razem" o poziomie nierozwiązanym.
  return { balls, solved, spread, simultaneous: solved && spread < 1e-6 };
}
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/core/verify.test.ts`
Oczekiwane: PASS, cztery testy. **Test jednoczesności musi przejść** — jeśli
`spread` nie jest bliskie zera, błąd siedzi w `trace.ts`, nie tutaj.

- [ ] **Krok 5: Commit**

```bash
git add src/core/verify.ts tests/core/verify.test.ts
git commit -m "feat(core): dowod osemka z pomiarem jednoczesnosci przybycia"
```

---

## Zadanie 7: Model poziomu i osiem poziomów

**Pliki:**
- Utwórz: `src/levels/types.ts`, `src/levels/index.ts`
- Zmodyfikuj: `src/core/conic.ts` — dopisz `circleConic`
- Test: `tests/levels.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2`, `vec` z `vec.ts`; `Conic`, `ellipseFromFoci` z `conic.ts`;
  `runProof` z `verify.ts`
- Produkuje:
  - `circleConic(center: Vec2, radius: number): Conic` (w `conic.ts`)
  - `export const DIAGONAL = 2 * Math.SQRT2`
  - `export const HOLE_RADIUS = 0.02 * DIAGONAL`
  - `export const SNAP_RADIUS = 0.05 * DIAGONAL`
  - `type Handle = "ognisko1" | "ognisko2" | "rozmiar"`
  - `interface EllipseState { f1: Vec2; f2: Vec2; a: number }`
  - `interface Obstacle { center: Vec2; radius: number }`
  - `interface Level { ... }` (pełna definicja niżej)
  - `LEVELS: Level[]` — osiem poziomów
  - `levelCurves(level: Level, state: EllipseState): Conic[]`

- [ ] **Krok 1: Dopisz `circleConic` do `src/core/conic.ts`**

```ts
export const circleConic = (center: Vec2, radius: number): Conic => ({
  A: 1, B: 0, C: 1,
  D: -2 * center.x,
  E: -2 * center.y,
  F: center.x * center.x + center.y * center.y - radius * radius,
});
```

- [ ] **Krok 2: Napisz `src/levels/types.ts`**

```ts
import { Vec2 } from "../core/vec";
import { Conic, circleConic, ellipseFromFoci } from "../core/conic";

export const DIAGONAL = 2 * Math.SQRT2;
export const HOLE_RADIUS = 0.02 * DIAGONAL;
/** Niezmiennik ze specyfikacji: promień przyskakiwania nigdy mniejszy
 *  od pasa, w którym niedokładne ustawienie jeszcze przechodzi test. */
export const SNAP_RADIUS = 0.05 * DIAGONAL;

export type Handle = "ognisko1" | "ognisko2" | "rozmiar";

export interface EllipseState { f1: Vec2; f2: Vec2; a: number }
export interface Obstacle { center: Vec2; radius: number }

export interface Level {
  id: string;
  title: string;
  hint: string;
  ball: Vec2;
  hole: Vec2;
  /** uchwyty wyłączone na tym poziomie */
  locked: Handle[];
  obstacles: Obstacle[];
  start: EllipseState;
  solution: EllipseState;
  test: { balls: number; maxBounces: number; holeRadius: number };
}

export const levelCurves = (level: Level, state: EllipseState): Conic[] => [
  ellipseFromFoci(state.f1, state.f2, state.a),
  ...level.obstacles.map((o) => circleConic(o.center, o.radius)),
];
```

- [ ] **Krok 3: Napisz test, który musi paść**

`tests/levels.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { add, scale, fromAngle } from "../src/core/vec";
import { ellipseFromFoci } from "../src/core/conic";
import { runProof } from "../src/core/verify";
import { EllipseState, Level, LEVELS, levelCurves, DIAGONAL, HOLE_RADIUS, SNAP_RADIUS } from "../src/levels";

const proofFor = (level: Level, state: EllipseState) =>
  runProof({
    ball: level.ball,
    hole: level.hole,
    holeRadius: level.test.holeRadius,
    maxBounces: level.test.maxBounces,
    curves: levelCurves(level, state),
    aimCurve: ellipseFromFoci(state.f1, state.f2, state.a),
    count: level.test.balls,
  });

describe("poziomy", () => {
  it("jest ich osiem i każdy ma unikalny identyfikator", () => {
    expect(LEVELS).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(8);
  });

  it("niezmiennik: promień przyskakiwania nie jest mniejszy od tolerancji", () => {
    expect(SNAP_RADIUS).toBeGreaterThanOrEqual(HOLE_RADIUS);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: zapisane rozwiązanie faktycznie rozwiązuje",
    (_id, level) => {
      expect(proofFor(level, level.solution).solved).toBe(true);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: stan początkowy NIE jest rozwiązaniem",
    (_id, level) => {
      expect(proofFor(level, level.start).solved).toBe(false);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: ognisko przesunięte o 5% przekątnej odpada",
    (_id, level) => {
      const d = 0.05 * DIAGONAL;
      for (let i = 0; i < 8; i++) {
        const moved = { ...level.solution, f1: add(level.solution.f1, scale(fromAngle((i * Math.PI) / 4), d)) };
        expect(proofFor(level, moved).solved, `kierunek ${i}`).toBe(false);
      }
    },
  );
});
```

- [ ] **Krok 4: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/levels.test.ts`
Oczekiwane: FAIL — brak modułu `../src/levels`.

- [ ] **Krok 5: Napisz `src/levels/index.ts`**

Współrzędne poniżej są wyliczone ręcznie i mogą wymagać strojenia. **Jeśli test
padnie dla konkretnego poziomu, dostrój `a` w podanym paśmie — nigdy nie zmieniaj
silnika ani nie rozluźniaj tolerancji.** Warunek na `a` to zawsze
`a > dist(f1, f2) / 2`, a przy przeszkodach dodatkowo `b = √(a² − c²)` musi
trzymać tor z dala od przeszkody.

```ts
import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";

export * from "./types";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

export const LEVELS: Level[] = [
  {
    id: "ogniska",
    title: "Dwa ogniska",
    hint: "Przesuń oba ogniska tak, żeby jedno usiadło na piłce, a drugie w dołku.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    locked: ["rozmiar"], obstacles: [],
    start: { f1: vec(-0.15, 0.35), f2: vec(0.35, -0.2), a: 0.8 },
    solution: { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.8 },
    test: t,
  },
  {
    id: "rozmiar",
    title: "Rozmiar bez znaczenia",
    hint: "Teraz możesz zmieniać też rozmiar. Sprawdź, czy to cokolwiek psuje.",
    ball: vec(-0.4, 0), hole: vec(0.4, 0),
    locked: [], obstacles: [],
    start: { f1: vec(-0.1, 0.3), f2: vec(0.3, 0.1), a: 0.6 },
    solution: { f1: vec(-0.4, 0), f2: vec(0.4, 0), a: 0.75 },
    test: t,
  },
  {
    id: "skos",
    title: "Na ukos",
    hint: "Oś elipsy nie musi być pozioma.",
    ball: vec(-0.45, -0.45), hole: vec(0.45, 0.45),
    locked: [], obstacles: [],
    start: { f1: vec(-0.4, 0.4), f2: vec(0.4, -0.4), a: 0.9 },
    solution: { f1: vec(-0.45, -0.45), f2: vec(0.45, 0.45), a: 0.9 },
    test: t,
  },
  {
    id: "blisko",
    title: "Prawie okrąg",
    hint: "Gdy ogniska się zbliżają, elipsa staje się okręgiem.",
    ball: vec(-0.12, 0.1), hole: vec(0.12, -0.1),
    locked: [], obstacles: [],
    start: { f1: vec(-0.6, 0.2), f2: vec(0.5, -0.3), a: 0.8 },
    solution: { f1: vec(-0.12, 0.1), f2: vec(0.12, -0.1), a: 0.55 },
    test: t,
  },
  {
    id: "ciasna",
    title: "Wąska jak igła",
    hint: "Ogniska daleko od siebie zostawiają mało miejsca na elipsę.",
    ball: vec(-0.75, 0), hole: vec(0.75, 0),
    locked: [], obstacles: [],
    start: { f1: vec(-0.3, 0.2), f2: vec(0.3, -0.2), a: 0.9 },
    solution: { f1: vec(-0.75, 0), f2: vec(0.75, 0), a: 0.85 },
    test: t,
  },
  {
    id: "przeszkoda",
    title: "Teraz rozmiar ma znaczenie",
    hint: "Ogniska to nie wszystko — elipsa musi zmieścić się obok przeszkody.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    locked: [], obstacles: [{ center: vec(0, 0.45), radius: 0.12 }],
    start: { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.85 },
    solution: { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.58 },   // pasmo a ∈ (0.50, 0.60)
    test: t,
  },
  {
    id: "dwie-przeszkody",
    title: "Z dwóch stron",
    hint: "Pasmo dopuszczalnych rozmiarów właśnie się zwęziło.",
    ball: vec(-0.45, 0), hole: vec(0.45, 0),
    locked: [],
    obstacles: [
      { center: vec(0, 0.42), radius: 0.12 },
      { center: vec(0, -0.42), radius: 0.12 },
    ],
    start: { f1: vec(-0.45, 0), f2: vec(0.45, 0), a: 0.8 },
    solution: { f1: vec(-0.45, 0), f2: vec(0.45, 0), a: 0.50 },  // pasmo a ∈ (0.45, 0.54)
    test: t,
  },
  {
    id: "zwienczenie",
    title: "Zwieńczenie",
    hint: "Wszystko naraz: skos, rozmiar i przeszkoda.",
    ball: vec(-0.6, -0.55), hole: vec(0.55, 0.6),
    locked: [], obstacles: [{ center: vec(0.42, -0.42), radius: 0.2 }],
    start: { f1: vec(-0.2, 0.2), f2: vec(0.2, -0.2), a: 0.7 },
    solution: { f1: vec(-0.6, -0.55), f2: vec(0.55, 0.6), a: 0.86 },  // pasmo a ∈ (0.82, 0.92)
    test: t,
  },
];
```

- [ ] **Krok 6: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/levels.test.ts`
Oczekiwane: PASS, 26 testów (2 + 8 + 8 + 8).

Jeśli któryś poziom z przeszkodą pada na „rozwiązanie faktycznie rozwiązuje",
zmniejsz `a` w stronę dolnej granicy pasma. Jeśli pada na „stan początkowy NIE
jest rozwiązaniem", przesuń `start` dalej od `solution`.

- [ ] **Krok 7: Commit**

```bash
git add src/core/conic.ts src/levels/types.ts src/levels/index.ts tests/levels.test.ts
git commit -m "feat(levels): model poziomu, osiem poziomow i test rozwiazywalnosci"
```

---

## Zadanie 8: Kamera i zamiana stożkowej na polilinię

**Pliki:**
- Utwórz: `src/render/camera.ts`, `src/render/shapes.ts`
- Test: `tests/render/shapes.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2`, `vec`, `perp`, `norm`, `add`, `scale` z `vec.ts`;
  `Conic`, `classify`, `ellipseGeometry` z `conic.ts`
- Produkuje:
  - `interface Camera { toScreen(p: Vec2): Vec2; toWorld(p: Vec2): Vec2; scale: number }`
  - `makeCamera(width: number, height: number, margin?: number): Camera`
  - `conicPolyline(k: Conic, steps?: number): Vec2[]` — dla elipsy zamknięta
    polilinia, dla prostej odcinek przycięty do planszy

Kamera odwraca oś Y (świat ma Y w górę, Canvas w dół) i wpisuje kwadrat
`[-1, 1]²` w krótszy bok ekranu z marginesem.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/render/shapes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci, evalConic, lineThrough } from "../../src/core/conic";
import { makeCamera } from "../../src/render/camera";
import { conicPolyline } from "../../src/render/shapes";

describe("kamera", () => {
  it("środek świata trafia w środek ekranu", () => {
    const cam = makeCamera(400, 800);
    const s = cam.toScreen(vec(0, 0));
    expect(s.x).toBeCloseTo(200, 9);
    expect(s.y).toBeCloseTo(400, 9);
  });

  it("odwraca oś Y", () => {
    const cam = makeCamera(400, 800);
    expect(cam.toScreen(vec(0, 1)).y).toBeLessThan(cam.toScreen(vec(0, -1)).y);
  });

  it("obchód w obie strony jest tożsamością", () => {
    const cam = makeCamera(375, 812);
    const p = vec(0.37, -0.62);
    const back = cam.toWorld(cam.toScreen(p));
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
  });

  it("plansza mieści się w krótszym boku", () => {
    const cam = makeCamera(400, 800, 0.06);
    expect(cam.toScreen(vec(1, 0)).x).toBeLessThanOrEqual(400);
    expect(cam.toScreen(vec(-1, 0)).x).toBeGreaterThanOrEqual(0);
  });
});

describe("polilinia stożkowej", () => {
  it("każdy punkt polilinii elipsy leży na elipsie", () => {
    const k = ellipseFromFoci(vec(-0.3, 0.2), vec(0.4, -0.1), 0.75);
    const pts = conicPolyline(k, 64);
    expect(pts).toHaveLength(64);
    for (const p of pts) expect(evalConic(k, p)).toBeCloseTo(0, 9);
  });

  it("prosta daje odcinek o dwóch końcach poza planszą", () => {
    const pts = conicPolyline(lineThrough(vec(0, 0.3), vec(1, 0)));
    expect(pts).toHaveLength(2);
    expect(pts[0].y).toBeCloseTo(0.3, 9);
    expect(pts[1].y).toBeCloseTo(0.3, 9);
    expect(Math.abs(pts[0].x)).toBeGreaterThan(1);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/render/shapes.test.ts`
Oczekiwane: FAIL — brak modułów `camera` i `shapes`.

- [ ] **Krok 3: Napisz `src/render/camera.ts`**

```ts
import { Vec2, vec } from "../core/vec";

export interface Camera {
  toScreen(p: Vec2): Vec2;
  toWorld(p: Vec2): Vec2;
  /** pikseli na jednostkę świata */
  scale: number;
}

export function makeCamera(width: number, height: number, margin = 0.06): Camera {
  const scale = (Math.min(width, height) * (1 - 2 * margin)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return {
    scale,
    toScreen: (p) => vec(cx + p.x * scale, cy - p.y * scale),
    toWorld: (p) => vec((p.x - cx) / scale, (cy - p.y) / scale),
  };
}
```

- [ ] **Krok 4: Napisz `src/render/shapes.ts`**

```ts
import { Vec2, add, norm, perp, scale, vec } from "../core/vec";
import { Conic, classify, ellipseGeometry } from "../core/conic";

const SPAN = 3; // wystarczy, żeby przeciąć planszę [-1,1]² na wylot

export function conicPolyline(k: Conic, steps = 128): Vec2[] {
  if (classify(k) === "prosta") {
    const n = norm(vec(k.D, k.E));
    const denom = k.D * k.D + k.E * k.E;
    const p0 = vec((-k.F * k.D) / denom, (-k.F * k.E) / denom);
    const dir = perp(n);
    return [add(p0, scale(dir, -SPAN)), add(p0, scale(dir, SPAN))];
  }

  const g = ellipseGeometry(k);
  const u = vec(Math.cos(g.angle), Math.sin(g.angle));
  const v = perp(u);
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI;
    return add(g.center, add(scale(u, g.a * Math.cos(t)), scale(v, g.b * Math.sin(t))));
  });
}
```

- [ ] **Krok 5: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/render/shapes.test.ts`
Oczekiwane: PASS, sześć testów.

- [ ] **Krok 6: Commit**

```bash
git add src/render/camera.ts src/render/shapes.ts tests/render/shapes.test.ts
git commit -m "feat(render): kamera swiat-ekran i polilinia stozkowej"
```

---

## Zadanie 9: Rysowanie — świecąca linia bez `shadowBlur`

**Pliki:**
- Utwórz: `src/render/draw.ts`
- Test: `tests/render/no-shadow-blur.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2` z `vec.ts`; `Camera` z `camera.ts`; `conicPolyline` z `shapes.ts`
- Produkuje:
  - `PALETTE` — stałe kolorów
  - `glowPolyline(ctx, cam, pts, color, glow, width): void`
  - `glowDot(ctx, cam, p, color, glow, radius): void`
  - `drawConic(ctx, cam, k, color, glow, width): void`

**Dlaczego podwójny obrys:** `shadowBlur` na Canvasie wymusza rozmycie
poza-GPU i na telefonie potrafi zjeść całą klatkę. Ten sam efekt wizualny daje
narysowanie linii dwa razy — raz szeroko i półprzezroczyście, raz cienko i jasno.
Koszt jak przy zwykłej kresce.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/render/no-shadow-blur.test.ts`:
```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("wydajność rysowania", () => {
  it("nigdzie w src nie używamy shadowBlur ani shadowColor", () => {
    for (const file of walk("src")) {
      const src = readFileSync(file, "utf8");
      expect(src.includes("shadowBlur"), `${file} używa shadowBlur`).toBe(false);
      expect(src.includes("shadowColor"), `${file} używa shadowColor`).toBe(false);
    }
  });

  it("moduł rysowania eksportuje paletę i prymitywy", async () => {
    const m = await import("../../src/render/draw");
    expect(typeof m.glowPolyline).toBe("function");
    expect(typeof m.glowDot).toBe("function");
    expect(typeof m.drawConic).toBe("function");
    expect(m.PALETTE.bg).toMatch(/^#/);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/render/no-shadow-blur.test.ts`
Oczekiwane: FAIL na drugim teście — brak modułu `draw`.

- [ ] **Krok 3: Napisz `src/render/draw.ts`**

```ts
import { Vec2 } from "../core/vec";
import { Conic } from "../core/conic";
import { Camera } from "./camera";
import { conicPolyline } from "./shapes";

export const PALETTE = {
  bg: "#0b0f14",
  curve: "#5eead4",
  curveGlow: "rgba(94, 234, 212, 0.16)",
  ball: "#fde68a",
  ballGlow: "rgba(253, 230, 138, 0.18)",
  trail: "rgba(253, 230, 138, 0.5)",
  trailGlow: "rgba(253, 230, 138, 0.10)",
  hole: "#fbbf24",
  holeGlow: "rgba(251, 191, 36, 0.20)",
  obstacle: "#f87171",
  obstacleGlow: "rgba(248, 113, 113, 0.16)",
  handle: "#e2e8f0",
  miss: "#f87171",
  text: "#cbd5e1",
};

type Ctx = CanvasRenderingContext2D;

/** Poświata przez podwójny obrys: szeroki półprzezroczysty pod cienkim jasnym. */
export function glowPolyline(
  ctx: Ctx, cam: Camera, pts: Vec2[], color: string, glow: string, width: number,
  closed = false,
): void {
  if (pts.length < 2) return;
  const trace = () => {
    ctx.beginPath();
    const s0 = cam.toScreen(pts[0]);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < pts.length; i++) {
      const s = cam.toScreen(pts[i]);
      ctx.lineTo(s.x, s.y);
    }
    if (closed) ctx.closePath();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = glow;
  ctx.lineWidth = width * 5;
  trace();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  trace();
  ctx.stroke();
}

export function glowDot(
  ctx: Ctx, cam: Camera, p: Vec2, color: string, glow: string, radius: number,
): void {
  const s = cam.toScreen(p);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius * 3.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

export function drawConic(
  ctx: Ctx, cam: Camera, k: Conic, color: string, glow: string, width: number,
): void {
  const pts = conicPolyline(k);
  glowPolyline(ctx, cam, pts, color, glow, width, pts.length > 2);
}
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/render/no-shadow-blur.test.ts`
Oczekiwane: PASS, dwa testy.

- [ ] **Krok 5: Commit**

```bash
git add src/render/draw.ts tests/render/no-shadow-blur.test.ts
git commit -m "feat(render): prymitywy rysowania ze swiatlem przez podwojny obrys"
```

---

## Zadanie 10: Smugi i ruch po torze ze stałą prędkością

Tu realizuje się reguła „prędkość piłki jest dosłowna": pozycja to `v · t`
liczone po długości toru, bez żadnej krzywej czasu.

**Pliki:**
- Utwórz: `src/render/trails.ts`
- Test: `tests/render/trails.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2`, `add`, `sub`, `scale`, `dist`, `norm` z `vec.ts`
- Produkuje:
  - `pathLength(path: Vec2[]): number`
  - `positionAt(path: Vec2[], s: number): Vec2` — punkt oddalony o `s` wzdłuż toru;
    poza końcem zwraca koniec
  - `trailSegment(path: Vec2[], s: number, trailLength: number): Vec2[]` — kawałek
    toru od `s − trailLength` do `s`, gotowy do narysowania

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/render/trails.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { pathLength, positionAt, trailSegment } from "../../src/render/trails";

const path = [vec(0, 0), vec(1, 0), vec(1, 1)];

describe("ruch po torze", () => {
  it("mierzy długość łamanej", () => {
    expect(pathLength(path)).toBeCloseTo(2, 12);
  });

  it("pozycja rośnie liniowo z przebytą drogą", () => {
    expect(positionAt(path, 0)).toEqual(vec(0, 0));
    expect(positionAt(path, 0.5).x).toBeCloseTo(0.5, 12);
    expect(positionAt(path, 1.5).y).toBeCloseTo(0.5, 12);
  });

  it("poza końcem toru zatrzymuje się na końcu", () => {
    const p = positionAt(path, 99);
    expect(p.x).toBeCloseTo(1, 12);
    expect(p.y).toBeCloseTo(1, 12);
  });

  it("smuga zaczyna się o zadaną długość wcześniej", () => {
    const seg = trailSegment(path, 1.5, 1.0);
    expect(seg[0].x).toBeCloseTo(0.5, 12);
    expect(seg[0].y).toBeCloseTo(0, 12);
    expect(seg[seg.length - 1].y).toBeCloseTo(0.5, 12);
  });

  it("smuga na starcie nie sięga przed początek toru", () => {
    const seg = trailSegment(path, 0.3, 1.0);
    expect(seg[0].x).toBeCloseTo(0, 12);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/render/trails.test.ts`
Oczekiwane: FAIL — brak modułu `trails`.

- [ ] **Krok 3: Napisz `src/render/trails.ts`**

```ts
import { Vec2, add, dist, norm, scale, sub } from "../core/vec";

export function pathLength(path: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
  return total;
}

export function positionAt(path: Vec2[], s: number): Vec2 {
  if (path.length === 0) return { x: 0, y: 0 };
  if (s <= 0) return path[0];
  let left = s;
  for (let i = 1; i < path.length; i++) {
    const seg = dist(path[i - 1], path[i]);
    if (left <= seg) {
      const dir = norm(sub(path[i], path[i - 1]));
      return add(path[i - 1], scale(dir, left));
    }
    left -= seg;
  }
  return path[path.length - 1];
}

export function trailSegment(path: Vec2[], s: number, trailLength: number): Vec2[] {
  const from = Math.max(0, s - trailLength);
  const out: Vec2[] = [positionAt(path, from)];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += dist(path[i - 1], path[i]);
    if (acc > from && acc < s) out.push(path[i]);
  }
  out.push(positionAt(path, s));
  return out;
}
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/render/trails.test.ts`
Oczekiwane: PASS, pięć testów.

- [ ] **Krok 5: Commit**

```bash
git add src/render/trails.ts tests/render/trails.test.ts
git commit -m "feat(render): ruch po torze ze stala predkoscia i smugi"
```

---

## Zadanie 11: Manipulacja uchwytami i przyskakiwanie

**Pliki:**
- Utwórz: `src/ui/handles.ts`
- Test: `tests/ui/handles.test.ts`

**Interfejsy:**
- Konsumuje: `Vec2`, `dist` z `vec.ts`; `Handle`, `EllipseState`, `SNAP_RADIUS`
  z `levels/types.ts`
- Produkuje:
  - `handlePositions(state: EllipseState): { id: Handle; pos: Vec2 }[]` — uchwyt
    `rozmiar` siedzi na końcu osi wielkiej
  - `snapTo(p: Vec2, targets: Vec2[], radius: number): Vec2`
  - `pickHandle(world: Vec2, state: EllipseState, locked: Handle[], radius: number): Handle | null`
  - `applyDrag(state: EllipseState, handle: Handle, to: Vec2): EllipseState`

**Zasada dla `applyDrag`:** elipsa musi pozostać elipsą, czyli zawsze
`a > dist(f1, f2) / 2`. Przy przeciąganiu ogniska `a` jest w razie potrzeby
podnoszone do `c + MIN_GAP`; przy przeciąganiu rozmiaru `a` wyliczamy z sumy
odległości od ognisk i przycinamy od dołu tak samo. Bez tego `ellipseFromFoci`
rzuci wyjątkiem w środku przeciągania.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/ui/handles.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { vec, dist } from "../../src/core/vec";
import { EllipseState, SNAP_RADIUS } from "../../src/levels/types";
import { applyDrag, handlePositions, pickHandle, snapTo } from "../../src/ui/handles";

const state: EllipseState = { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.8 };

describe("uchwyty", () => {
  it("daje trzy uchwyty, rozmiar na końcu osi wielkiej", () => {
    const hs = handlePositions(state);
    expect(hs.map((h) => h.id)).toEqual(["ognisko1", "ognisko2", "rozmiar"]);
    expect(hs[2].pos.x).toBeCloseTo(0.8, 9);
    expect(hs[2].pos.y).toBeCloseTo(0, 9);
  });

  it("przyskakuje do celu w promieniu, a poza nim nie", () => {
    const target = vec(0.5, 0);
    expect(snapTo(vec(0.5 + SNAP_RADIUS * 0.5, 0), [target], SNAP_RADIUS)).toEqual(target);
    const far = vec(0.5 + SNAP_RADIUS * 2, 0);
    expect(snapTo(far, [target], SNAP_RADIUS)).toEqual(far);
  });

  it("nie pozwala chwycić zablokowanego uchwytu", () => {
    expect(pickHandle(vec(0.8, 0), state, [], 0.1)).toBe("rozmiar");
    expect(pickHandle(vec(0.8, 0), state, ["rozmiar"], 0.1)).toBeNull();
  });

  it("przeciągnięcie ogniska zachowuje elipsę mimo małego a", () => {
    const next = applyDrag({ f1: vec(-0.1, 0), f2: vec(0.1, 0), a: 0.15 }, "ognisko1", vec(-0.9, 0));
    expect(next.f1.x).toBeCloseTo(-0.9, 9);
    expect(next.a).toBeGreaterThan(dist(next.f1, next.f2) / 2);
  });

  it("przeciągnięcie rozmiaru ustawia a jako połowę sumy odległości", () => {
    const next = applyDrag(state, "rozmiar", vec(0, 0.6));
    const expected = (dist(vec(0, 0.6), state.f1) + dist(vec(0, 0.6), state.f2)) / 2;
    expect(next.a).toBeCloseTo(expected, 9);
    expect(next.f1).toEqual(state.f1);
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/ui/handles.test.ts`
Oczekiwane: FAIL — brak modułu `handles`.

- [ ] **Krok 3: Napisz `src/ui/handles.ts`**

```ts
import { Vec2, add, dist, norm, scale, sub, vec } from "../core/vec";
import { EllipseState, Handle } from "../levels/types";

const MIN_GAP = 1e-3;

export function handlePositions(state: EllipseState): { id: Handle; pos: Vec2 }[] {
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

export function pickHandle(
  world: Vec2, state: EllipseState, locked: Handle[], radius: number,
): Handle | null {
  let best: Handle | null = null;
  let bestD = radius;
  for (const h of handlePositions(state)) {
    if (locked.includes(h.id)) continue;
    const d = dist(world, h.pos);
    if (d <= bestD) { bestD = d; best = h.id; }
  }
  return best;
}

export function applyDrag(state: EllipseState, handle: Handle, to: Vec2): EllipseState {
  if (handle === "rozmiar") {
    const a = (dist(to, state.f1) + dist(to, state.f2)) / 2;
    return { ...state, a: Math.max(a, dist(state.f1, state.f2) / 2 + MIN_GAP) };
  }
  const next = handle === "ognisko1" ? { ...state, f1: to } : { ...state, f2: to };
  return { ...next, a: Math.max(next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/ui/handles.test.ts`
Oczekiwane: PASS, pięć testów.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/handles.ts tests/ui/handles.test.ts
git commit -m "feat(ui): uchwyty elipsy, przyskakiwanie i blokowanie stopni swobody"
```

---

## Zadanie 12: Stan gry — podgląd dwóch piłek i uruchomienie dowodu

**Pliki:**
- Utwórz: `src/ui/game.ts`
- Test: `tests/ui/game.test.ts`

**Interfejsy:**
- Konsumuje: `Level`, `EllipseState`, `levelCurves`, `HOLE_RADIUS` z `levels`;
  `ellipseFromFoci` z `conic.ts`; `runProof`, `Proof` z `verify.ts`
- Produkuje:
  - `type Phase = "edycja" | "dowod" | "wygrana" | "porazka"`
  - `interface GameState { level: Level; ellipse: EllipseState; phase: Phase; proof: Proof | null; elapsed: number }`
  - `newGame(level: Level): GameState`
  - `preview(state: GameState): Proof` — **dwie** piłki, tanie sprzężenie zwrotne
  - `startProof(state: GameState): GameState` — pełna ósemka, faza `"dowod"`
  - `advance(state: GameState, dt: number): GameState` — posuwa animację, na końcu
    ustawia `"wygrana"` albo `"porazka"`
  - `export const BALL_SPEED = 1.2` (jednostek świata na sekundę)

**Dlaczego dwie piłki, a nie osiem:** dwie wystarczają, żeby gracz czuł, co robi;
nie wystarczają, żeby zgadnąć rozwiązanie metodą podchodzenia pod górkę. Pełna
ósemka jest dowodem i pojawia się wyłącznie na żądanie.

- [ ] **Krok 1: Napisz test, który musi paść**

`tests/ui/game.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { pathLength } from "../../src/render/trails";
import { advance, newGame, preview, startProof, BALL_SPEED } from "../../src/ui/game";

const level = LEVELS[0];

describe("stan gry", () => {
  it("nowa gra startuje w edycji, ze stanem początkowym poziomu", () => {
    const g = newGame(level);
    expect(g.phase).toBe("edycja");
    expect(g.ellipse).toEqual(level.start);
    expect(g.proof).toBeNull();
  });

  it("podgląd używa dwóch piłek, nie ośmiu", () => {
    expect(preview(newGame(level)).balls).toHaveLength(2);
  });

  it("uruchomienie dowodu daje osiem piłek i fazę dowodu", () => {
    const g = startProof({ ...newGame(level), ellipse: level.solution });
    expect(g.phase).toBe("dowod");
    expect(g.proof?.balls).toHaveLength(8);
    expect(g.elapsed).toBe(0);
  });

  it("poprawne rozwiązanie kończy się wygraną po przebiegu animacji", () => {
    let g = startProof({ ...newGame(level), ellipse: level.solution });
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("wygrana");
  });

  it("złe rozwiązanie kończy się porażką", () => {
    let g = startProof(newGame(level));
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("porazka");
  });

  it("prędkość jest dosłowna: faza zmienia się dokładnie po długość / prędkość", () => {
    let g = startProof({ ...newGame(level), ellipse: level.solution });
    const longest = Math.max(...g.proof!.balls.map((b) => pathLength(b.path)));
    g = advance(g, longest / BALL_SPEED - 1e-6);
    expect(g.phase).toBe("dowod");
    g = advance(g, 2e-6);
    expect(g.phase).toBe("wygrana");
  });
});
```

- [ ] **Krok 2: Uruchom test i potwierdź, że pada**

Uruchom: `npx vitest run tests/ui/game.test.ts`
Oczekiwane: FAIL — brak modułu `game`.

- [ ] **Krok 3: Napisz `src/ui/game.ts`**

```ts
import { ellipseFromFoci } from "../core/conic";
import { Proof, runProof } from "../core/verify";
import { EllipseState, Level, levelCurves } from "../levels";
import { pathLength } from "../render/trails";

/** jednostek świata na sekundę — prędkość jest dosłowna, bez krzywych czasu */
export const BALL_SPEED = 1.2;

export type Phase = "edycja" | "dowod" | "wygrana" | "porazka";

export interface GameState {
  level: Level;
  ellipse: EllipseState;
  phase: Phase;
  proof: Proof | null;
  /** sekundy od startu dowodu */
  elapsed: number;
}

export const newGame = (level: Level): GameState => ({
  level, ellipse: level.start, phase: "edycja", proof: null, elapsed: 0,
});

const proofFor = (state: GameState, count: number): Proof =>
  runProof({
    ball: state.level.ball,
    hole: state.level.hole,
    holeRadius: state.level.test.holeRadius,
    maxBounces: state.level.test.maxBounces,
    curves: levelCurves(state.level, state.ellipse),
    aimCurve: ellipseFromFoci(state.ellipse.f1, state.ellipse.f2, state.ellipse.a),
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
  const longest = Math.max(...state.proof.balls.map((b) => pathLength(b.path)));
  if (travelled < longest) return { ...state, elapsed };
  return { ...state, elapsed, phase: state.proof.solved ? "wygrana" : "porazka" };
}
```

- [ ] **Krok 4: Uruchom test i potwierdź, że przechodzi**

Uruchom: `npx vitest run tests/ui/game.test.ts`
Oczekiwane: PASS, sześć testów.

- [ ] **Krok 5: Commit**

```bash
git add src/ui/game.ts tests/ui/game.test.ts
git commit -m "feat(ui): stan gry, podglad dwoch pilek i przebieg dowodu"
```

---

## Zadanie 13: Spięcie całości — ekrany, dotyk, PWA

Ostatnie zadanie łączy rdzeń ze skorupą i daje grywalną aplikację. Kod tutaj jest
w większości nietestowalny jednostkowo (rysowanie i zdarzenia dotyku), więc
weryfikacja jest ręczna, przez listę kontrolną w kroku 6.

**Pliki:**
- Utwórz: `src/ui/screens.ts`, `public/manifest.webmanifest`, `public/sw.js`
- Zmodyfikuj: `src/main.ts` (całkowicie zastępuje zawartość z zadania 1),
  `index.html` (dopisanie odnośnika do manifestu)

**Interfejsy:**
- Konsumuje: wszystko z zadań 8–12
- Produkuje: działającą aplikację; `mount(canvas: HTMLCanvasElement): void`
  w `screens.ts`

- [ ] **Krok 1: Napisz `public/manifest.webmanifest`**

```json
{
  "name": "Golf geometryczny",
  "short_name": "Golf",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#0b0f14",
  "theme_color": "#0b0f14",
  "orientation": "portrait"
}
```

- [ ] **Krok 2: Dopisz odnośnik do manifestu w `index.html`**

W sekcji `<head>`, tuż przed `<title>`:
```html
<link rel="manifest" href="./manifest.webmanifest" />
<meta name="theme-color" content="#0b0f14" />
```

- [ ] **Krok 3: Napisz `public/sw.js` — offline wymagany przez specyfikację**

Manifest sam z siebie nie daje działania bez sieci. Ten service worker jest
minimalny i celowo naiwny (cache-first): gra nie ma żadnych danych zdalnych, więc
nie ma czego unieważniać poza samą paczką.

```js
const CACHE = "golf-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"])));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        }),
    ),
  );
});
```

- [ ] **Krok 4: Napisz `src/ui/screens.ts`**

```ts
import { Vec2 } from "../core/vec";
import { circleConic, ellipseFromFoci } from "../core/conic";
import { LEVELS, SNAP_RADIUS } from "../levels";
import { makeCamera } from "../render/camera";
import { PALETTE, drawConic, glowDot, glowPolyline } from "../render/draw";
import { positionAt, trailSegment } from "../render/trails";
import { applyDrag, handlePositions, pickHandle, snapTo } from "./handles";
import { BALL_SPEED, GameState, advance, newGame, preview, startProof } from "./game";

const TRAIL = 0.35;
const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  let game: GameState = newGame(LEVELS[0]);
  let dragging: ReturnType<typeof pickHandle> = null;
  let pointer: Vec2 | null = null;
  let last = performance.now();

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const cam = () => makeCamera(canvas.width / dpr(), canvas.height / dpr());

  function resize(): void {
    const r = dpr();
    canvas.width = window.innerWidth * r;
    canvas.height = window.innerHeight * r;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  const toWorld = (e: PointerEvent): Vec2 => {
    const r = canvas.getBoundingClientRect();
    return cam().toWorld({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (game.phase !== "edycja") { game = newGame(game.level); return; }
    const w = toWorld(e);
    dragging = pickHandle(w, game.ellipse, game.level.locked, (HANDLE_PX * 1.5) / cam().scale);
    pointer = w;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (dragging === null) return;
    const w = toWorld(e);
    pointer = w;
    const snapped = dragging === "rozmiar"
      ? w
      : snapTo(w, [game.level.ball, game.level.hole], SNAP_RADIUS);
    game = { ...game, ellipse: applyDrag(game.ellipse, dragging, snapped) };
  });

  const endDrag = (): void => { dragging = null; pointer = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Przycisk „Sprawdź”: dolna jedna piąta ekranu, gdy trwa edycja
  canvas.addEventListener("pointerup", (e) => {
    if (game.phase !== "edycja") return;
    const r = canvas.getBoundingClientRect();
    if (e.clientY - r.top > r.height * 0.86) game = startProof(game);
  });

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    game = advance(game, dt);
    draw();
    requestAnimationFrame(frame);
  }

  function draw(): void {
    const c = cam();
    const level = game.level;
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width / dpr(), canvas.height / dpr());

    for (const o of level.obstacles) {
      drawConic(ctx, c, circleConic(o.center, o.radius), PALETTE.obstacle, PALETTE.obstacleGlow, 2);
    }

    const k = ellipseFromFoci(game.ellipse.f1, game.ellipse.f2, game.ellipse.a);
    drawConic(ctx, c, k, PALETTE.curve, PALETTE.curveGlow, 2);

    glowDot(ctx, c, level.hole, PALETTE.hole, PALETTE.holeGlow, 9);
    glowDot(ctx, c, level.ball, PALETTE.ball, PALETTE.ballGlow, 6);

    if (game.phase === "edycja") {
      for (const h of handlePositions(game.ellipse)) {
        if (level.locked.includes(h.id)) continue;
        glowDot(ctx, c, h.pos, PALETTE.handle, PALETTE.curveGlow, 7);
      }
      // podgląd na żywo: dwie piłki, blade tory
      for (const b of preview(game).balls) {
        glowPolyline(ctx, c, b.path, "rgba(226,232,240,0.28)", "rgba(226,232,240,0.06)", 1);
      }
      if (dragging !== null && pointer !== null) {
        // znacznik odsunięty od palca, żeby nie zasłaniał tego, co przesuwasz
        const s = c.toScreen(pointer);
        ctx.fillStyle = PALETTE.text;
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(`${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)}`, s.x + 26, s.y - 26);
      }
      banner(level.title, level.hint, "Sprawdź");
    } else if (game.proof !== null) {
      const s = game.elapsed * BALL_SPEED;
      for (const b of game.proof.balls) {
        const color = game.phase === "porazka" && !b.holed ? PALETTE.miss : PALETTE.trail;
        glowPolyline(ctx, c, trailSegment(b.path, s, TRAIL), color, PALETTE.trailGlow, 2);
        glowDot(ctx, c, positionAt(b.path, s), PALETTE.ball, PALETTE.ballGlow, 4);
      }
      if (game.phase === "wygrana") {
        for (const b of game.proof.balls) {
          glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
        }
        banner("Wpadły wszystkie", "Osiem torów, jedno miejsce, ta sama chwila.", "Jeszcze raz");
      } else if (game.phase === "porazka") {
        const missed = game.proof.balls.filter((b) => !b.holed).length;
        banner("Nie wszystkie", `Chybiło ${missed} z ${game.proof.balls.length}. Zobacz, którędy.`, "Jeszcze raz");
      }
    }

    function banner(title: string, hint: string, action: string): void {
      const w = canvas.width / dpr();
      const h = canvas.height / dpr();
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = "center";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText(title, w / 2, 46);
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(hint, w / 2, 70);
      ctx.font = "600 16px system-ui, sans-serif";
      ctx.fillStyle = PALETTE.curve;
      ctx.fillText(action, w / 2, h * 0.93);
      ctx.textAlign = "left";
    }
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}
```

- [ ] **Krok 5: Zastąp `src/main.ts`**

```ts
import { mount } from "./ui/screens";

const canvas = document.getElementById("plansza") as HTMLCanvasElement;
mount(canvas);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
```

- [ ] **Krok 6: Uruchom pełny zestaw testów**

Uruchom: `npm test`
Oczekiwane: **wszystkie testy zielone**, łącznie z budżetem paczki. Jeśli budżet
pęknie, tnij w kolejności ze specyfikacji: najpierw galeria rozwiązań, potem
animacje przejść interfejsu — **nigdy** smugi i nigdy jednoczesność przybycia.

- [ ] **Krok 7: Sprawdź ręcznie w przeglądarce**

Uruchom: `npm run dev`, otwórz na telefonie albo w trybie urządzenia mobilnego.

Lista kontrolna:
- [ ] Uchwyty da się chwycić palcem, a zablokowany uchwyt „rozmiar" na poziomie 1
      się nie rusza
- [ ] Ognisko przyskakuje do piłki i do dołka
- [ ] Podgląd dwóch piłek aktualizuje się płynnie podczas przeciągania
- [ ] Po „Sprawdź" osiem piłek startuje **jednocześnie**
- [ ] Przy poprawnym rozwiązaniu wszystkie wpadają **w tej samej chwili**
- [ ] Przy błędnym widać, które chybiły i którędy poleciały
- [ ] Nic nie miga i nie przycina przy 60 klatkach
- [ ] Po wyłączeniu sieci odświeżenie strony nadal wczytuje grę

- [ ] **Krok 8: Commit**

```bash
git add src/ui/screens.ts src/main.ts index.html public/manifest.webmanifest public/sw.js
git commit -m "feat: spiecie calosci - ekrany, dotyk, animacja dowodu, PWA"
```

---

## Czego ten plan celowo NIE robi

Zapisane, żeby nikt nie dopisał tego „przy okazji":

- **Parabola i hiperbola** — etap 3. Silnik już je obsłuży, ale poziomy i warunki
  zwycięstwa są poza zakresem.
- **Edytor plansz** — etap 4. Model poziomu jest już na to gotowy.
- **Czarne dziury i torus** — etapy 5–6, wymagają nowego silnika.
- **Galeria rozwiązanych poziomów** — pierwsza rzecz do wycięcia, gdyby budżet
  paczki pękł; w v1 zostaje sam rysunek po wygranej, bez zapisywania.
- **Wybór poziomu z listy** — zadanie 13 montuje `LEVELS[0]`. Przejście między
  poziomami dopisuje się w etapie 2 razem z ekranem wyboru.
