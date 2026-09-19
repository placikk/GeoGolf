import { Vec2, add, dist, scale, sub } from "../core/vec";
import { ArcRange, EllipseShape, Handle, Level, MIN_ARC } from "../levels/types";
import { ellipseAxis, ellipseCenter, ellipseParam, ellipsePoint, isCircle } from "../levels/shape";

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
 *  (bez okręgów — ich „ognisko" to środek przeszkody, nigdy nie jest celem) i ogniska
 *  POZOSTAŁYCH elementów gracza. Bez ostatnich kaskada z dwóch elementów gracza byłaby
 *  palcem niewykonalna. */
export function snapTargets(level: Level, pieces: EllipseShape[], dragged: number): Vec2[] {
  const fixedFoci = level.obstacles.flatMap((o) =>
    o.kind === "elipsa" && !isCircle(o) ? [o.f1, o.f2] : []);
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
 *  i końce się nie minęły.
 *
 *  Znane zachowanie: gdy koniec już stoi na zacisku i palec jedzie dalej o więcej niż π
 *  za jego starą pozycję, `wrap` wybiera drugi reprezentant kąta i koniec przeskakuje
 *  od razu pod palec (łuk może się skrócić skokiem, a nie płynnie). Akceptujemy to —
 *  koniec zawsze zostaje na krzywej, a łuk zawsze mieści się w [MIN_ARC, 2π − MIN_ARC]. */
export function moveArcEnd(arc: ArcRange, which: "poczatek" | "koniec", t: number): ArcRange {
  if (which === "poczatek") {
    const start = arc.start + wrap(t - arc.start);
    return { start: clamp(start, arc.end - TAU + MIN_ARC, arc.end - MIN_ARC), end: arc.end };
  }
  const end = arc.end + wrap(t - arc.end);
  return { start: arc.start, end: clamp(end, arc.start + MIN_ARC, arc.start + TAU - MIN_ARC) };
}

/** `sizeLocked`: uchwyt rozmiaru tego elementu jest zablokowany. Wtedy `a` NIGDY się nie
 *  zmienia, a przeciągane ognisko zatrzymuje się na odległości 2a − 2·MIN_GAP od drugiego
 *  ogniska (na prostej od drugiego ogniska w stronę palca). Bez tego rozsunięcie ognisk
 *  podnosiło `a` na stałe i zablokowany rozmiar dało się obejść. */
export function applyDrag(state: EllipseShape, handle: Handle, to: Vec2, sizeLocked = false): EllipseShape {
  if (handle === "poczatek" || handle === "koniec") {
    // kąt palca w układzie elipsy → parametr: uchwyt ślizga się po krzywej, nie schodzi z niej
    if (state.arc === undefined) return state;
    return { ...state, arc: moveArcEnd(state.arc, handle, ellipseParam(state, to)) };
  }
  if (handle === "rozmiar") {
    const a = (dist(to, state.f1) + dist(to, state.f2)) / 2;
    return { ...state, a: Math.max(a, dist(state.f1, state.f2) / 2 + MIN_GAP) };
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
