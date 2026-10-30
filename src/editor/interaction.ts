import { Vec2, add, dist, dot, fromAngle, scale, sub } from "../core/vec";
import { Handle, MovableShape } from "../levels/types";
import { isCircle, shapeFoci, shapeToPiece } from "../levels/shape";
import { piecePolyline } from "../render/shapes";
import { applyDrag, handlePositions, snapTo } from "../ui/handles";
import { EditorState, Selection, arcFits, replaceShape } from "./model";

/** Co przeciąga palec w edytorze. W edytorze ruchome jest wszystko: piłka, dołek, kierunek
 *  i szerokość strzału, uchwyty elementów gracza (także zablokowane — blokada działa w grze,
 *  autor ustawia start) i uchwyty przeszkód. */
export type EditorHandleRef =
  | { target: "pilka" } | { target: "dolek" } | { target: "kierunek" } | { target: "szerokosc" }
  | { target: "element"; index: number; id: Handle }
  | { target: "przeszkoda"; index: number; id: Handle };

/** Odległość uchwytów strzału od piłki — jak klin wachlarza w grze (`SECTOR_REACH`). */
export const SHOT_REACH = 0.4;

/** Piłka i dołek zostają co najmniej 0.1 od brzegu planszy: przy piłce na ścianie uchwyty
 *  strzału lądowałyby dokładnie na piłce i „najbliższy wygrywa" nie pozwalałby złapać każdego z nich. */
export const EDITOR_POINT_LIMIT = 0.9;

const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
const inPointLimit = (p: Vec2): Vec2 => ({ x: clamp(p.x, -EDITOR_POINT_LIMIT, EDITOR_POINT_LIMIT), y: clamp(p.y, -EDITOR_POINT_LIMIT, EDITOR_POINT_LIMIT) });
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

const inBoard = (p: Vec2): Vec2 => ({ x: clamp(p.x, -1, 1), y: clamp(p.y, -1, 1) });

/** Przeciągnięcie uchwytu do punktu świata `to`. Uchwyty kształtów przez `applyDrag` z gry
 *  (te same reguły: plansza, minimalne odległości), ogniska przyskakują w promieniu `snap`.
 *  Dwa wyjątki od gry: okrągła przeszkoda przesuwa się cała, a łuk nie maleje poniżej
 *  rozmiaru, na którym da się go zapisać (`arcFits`) — przeciągnięcie, które by to zrobiło,
 *  zostawia kształt bez zmian. */
export function applyEditorDrag(s: EditorState, ref: EditorHandleRef, to: Vec2, snap: number): EditorState {
  if (ref.target === "pilka") return { ...s, ball: inPointLimit(to) };
  if (ref.target === "dolek") return { ...s, hole: inPointLimit(to) };
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
  if (ref.target === "przeszkoda" && shape.kind === "elipsa" && isCircle(shape) && (ref.id === "ognisko1" || ref.id === "ognisko2")) {
    // Okrąg ma oba ogniska w środku, remis „najbliższego uchwytu" wygrywa `ognisko2`, a gra
    // rozsunęłaby ogniska w cienką elipsę. Okrągła przeszkoda (np. „Okrąg") przesuwa się więc
    // cała: środek w punkcie palca (po przyskoczeniu, w planszy), ta sama wielkość i łuk.
    // Tylko przeszkoda — elipsa gracza ze zlanymi ogniskami musi dać się z powrotem rozsunąć.
    const c = inBoard(target);
    return replaceShape(s, sel, { ...shape, f1: c, f2: c });
  }
  const next = applyDrag(shape, ref.id, target);
  if (next.kind === "elipsa" && next.arc !== undefined && !arcFits(next)) return s;
  return replaceShape(s, sel, next);
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
