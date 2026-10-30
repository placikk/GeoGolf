import { Vec2, add, dist, scale } from "../core/vec";
import {
  ArcRange, EllipseShape, HyperbolaShape, Handle, MIN_ARC_LENGTH, MovableShape, ParabolaShape, PlayerPiece, SegmentShape,
  Shape, Span,
} from "../levels/types";
import { perimeter } from "../levels/arc";
import { shapeConic } from "../levels/shape";
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

/** Każda liczba w kodzie musi być już zaokrąglona do 4 miejsc (`round4(x) === x`) — nasz zapis
 *  zawsze taki jest. Obcy kod z `1e-300` albo `0.123456789` odpada, a odczytany poziom jest już
 *  zaokrąglony: `roundShared` niczego w nim nie zmienia. */
const num = (x: unknown): number => {
  if (typeof x !== "number" || !Number.isFinite(x)) return fail("liczba");
  return round4(x) === x ? x : fail("liczba ma więcej niż 4 miejsca po przecinku");
};
const inBoard = (p: Vec2): Vec2 => (Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 ? p : fail("punkt poza planszą"));
const point = (xs: unknown[], i: number): Vec2 => inBoard({ x: num(xs[i]), y: num(xs[i + 1]) });
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : fail("tablica"));

/** Długość odcinka w danych: tolerancja 1e-3 na zaokrąglenie do 4 miejsc — z zapasem;
 *  krótszy odcinek i tak nie powstanie w edytorze. */
const MIN_SEGMENT_IN_DATA = MIN_SEGMENT_LENGTH - 1e-3;

/** Obrona w głąb: kształt, z którego rdzeń nie policzyłby skończonej krzywej, odpada. */
function checkConic(s: Shape): Shape {
  let ok: boolean;
  try {
    ok = Object.values(shapeConic(s)).every(Number.isFinite);
  } catch {
    ok = false;
  }
  return ok ? s : fail("kształt bez skończonych współczynników");
}

const wireToShape = (x: unknown): Shape => checkConic(wireToShapeRaw(x));

function wireToShapeRaw(x: unknown): Shape {
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
