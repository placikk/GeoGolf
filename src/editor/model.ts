import { Vec2, vec } from "../core/vec";
import { EllipseShape, Handle, Level, MIN_ARC_LENGTH, MovableShape, Shape } from "../levels/types";
import { perimeter } from "../levels/arc";
import { arcEllipse, circle, ellipse, hyperbola, isCircle, parabola, segment } from "../levels/shape";
import { handlePositions } from "../ui/handles";
import {
  HYPERBOLA_SPAN, MAX_OBSTACLES, MAX_PIECES, PARABOLA_SPAN, SharedLevel, SharedShot, decodeLevel, encodeLevel, roundShared,
} from "../share/codec";
import { sharedToLevel, solvesLevel, verifyShared } from "../share/verify";

/** Element gracza w edytorze: kształt to stan STARTOWY (rozwiązanie powstaje dopiero, gdy
 *  autor przejdzie poziom) i blokady uchwytów. */
export interface EditorPiece { shape: MovableShape; locked: Handle[] }

export type Selection = { kind: "element" | "przeszkoda"; index: number };

export interface EditorState {
  title: string;
  ball: Vec2;
  hole: Vec2;
  shot: SharedShot;
  pieces: EditorPiece[];
  obstacles: Shape[];
  selected: Selection | null;
}

export type PieceKind = "elipsa" | "parabola" | "hiperbola" | "odcinek";
export type ObstacleKind = "okrag" | "banda" | "elipsa" | "parabola" | "hiperbola";

/** Nowy poziom: piłka i dołek na osi, bez elementów, strzał na 360°. */
export const newEditor = (title: string): EditorState => ({
  title, ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" }, pieces: [], obstacles: [], selected: null,
});

/** Domyślny kształt na środku planszy — mały, żeby nie zasłaniał piłki i dołka. */
function defaultShape(kind: PieceKind | ObstacleKind): Shape {
  if (kind === "elipsa") return ellipse(vec(-0.3, 0), vec(0.3, 0), 0.45);
  if (kind === "parabola") return parabola(vec(0, 0), vec(-0.3, 0), PARABOLA_SPAN);
  if (kind === "hiperbola") return hyperbola(vec(-0.3, 0), vec(0.3, 0), 0.15, 1, HYPERBOLA_SPAN);
  if (kind === "okrag") return circle(vec(0, 0), 0.15);
  return segment(vec(-0.3, 0), vec(0.3, 0));
}

export const canAddPiece = (s: EditorState): boolean => s.pieces.length < MAX_PIECES;
export const canAddObstacle = (s: EditorState): boolean => s.obstacles.length < MAX_OBSTACLES;

/** Dodaje element gracza i go zaznacza; ponad limit — stan bez zmian. */
export function addPiece(s: EditorState, kind: PieceKind): EditorState {
  if (!canAddPiece(s)) return s;
  const pieces = [...s.pieces, { shape: defaultShape(kind), locked: [] }];
  return { ...s, pieces, selected: { kind: "element", index: pieces.length - 1 } };
}

export function addObstacle(s: EditorState, kind: ObstacleKind): EditorState {
  if (!canAddObstacle(s)) return s;
  const obstacles = [...s.obstacles, defaultShape(kind)];
  return { ...s, obstacles, selected: { kind: "przeszkoda", index: obstacles.length - 1 } };
}

export function removeSelected(s: EditorState): EditorState {
  const sel = s.selected;
  if (sel === null) return s;
  return sel.kind === "element"
    ? { ...s, pieces: s.pieces.filter((_, i) => i !== sel.index), selected: null }
    : { ...s, obstacles: s.obstacles.filter((_, i) => i !== sel.index), selected: null };
}

/** Przełącza blokadę uchwytu elementu gracza — tylko uchwytu, który ten element ma. */
export function toggleLock(s: EditorState, index: number, id: Handle): EditorState {
  const piece = s.pieces[index];
  if (piece === undefined || !handlePositions(piece.shape).some((h) => h.id === id)) return s;
  const locked = piece.locked.includes(id) ? piece.locked.filter((h) => h !== id) : [...piece.locked, id];
  return { ...s, pieces: s.pieces.map((p, i) => (i === index ? { ...p, locked } : p)) };
}

/** Kształt po zmianie: blokady uchwytów, których już nie ma (np. końców łuku po powrocie
 *  do pełnej elipsy), znikają. */
const keepLocks = (shape: MovableShape, locked: Handle[]): Handle[] => {
  const ids = handlePositions(shape).map((h) => h.id);
  return locked.filter((h) => ids.includes(h));
};

/** Czy na elipsie mieści się łuk, który da się zapisać: odczyt linku wymaga długości łuku
 *  w [MIN_ARC_LENGTH, obwód − MIN_ARC_LENGTH], więc obwód musi przekraczać 2·MIN_ARC_LENGTH —
 *  z zapasem 1e-3 na zaokrąglenie ognisk i `a` do 4 miejsc (zmienia obwód o mniej niż 1e-3). */
export const arcFits = (e: EllipseShape): boolean => perimeter(e) >= 2 * MIN_ARC_LENGTH + 1e-3;

/** Czy „Łuk" ma co zrobić: zaznaczona jest elipsa, która nie jest okręgiem — przy włączaniu
 *  także dość duża na łuk (`arcFits`). */
export function canToggleArc(s: EditorState): boolean {
  const sel = s.selected;
  if (sel === null) return false;
  const shape = sel.kind === "element" ? s.pieces[sel.index]?.shape : s.obstacles[sel.index];
  return shape !== undefined && shape.kind === "elipsa" && !isCircle(shape) && (shape.arc !== undefined || arcFits(shape));
}

/** Zaznaczona elipsa (nie okrąg): pełna ↔ półelipsa od parametru 0 do π. */
export function toggleArc(s: EditorState): EditorState {
  const sel = s.selected;
  if (sel === null) return s;
  const shape = sel.kind === "element" ? s.pieces[sel.index]?.shape : s.obstacles[sel.index];
  if (shape === undefined || shape.kind !== "elipsa" || isCircle(shape)) return s;
  if (shape.arc === undefined && !arcFits(shape)) return s;
  const next: Shape = shape.arc === undefined ? arcEllipse(shape.f1, shape.f2, shape.a, 0, Math.PI) : ellipse(shape.f1, shape.f2, shape.a);
  return replaceShape(s, sel, next);
}

/** Podmienia kształt elementu albo przeszkody (blokady dopasowane do nowego kształtu). */
export function replaceShape(s: EditorState, sel: Selection, shape: Shape): EditorState {
  if (sel.kind === "przeszkoda") return { ...s, obstacles: s.obstacles.map((o, i) => (i === sel.index ? shape : o)) };
  return {
    ...s,
    pieces: s.pieces.map((p, i) => (i === sel.index ? { shape, locked: keepLocks(shape, p.locked) } : p)),
  };
}

/** Kierunek strzału po kolei: 360° → wachlarz → jedna piłka → 360°. Wachlarz startuje w górę,
 *  ćwierć obrotu szeroki; jedna piłka dziedziczy jego kierunek. */
export function cycleShot(s: EditorState): EditorState {
  const shot: SharedShot = s.shot.kind === "360" ? { kind: "wachlarz", center: Math.PI / 2, width: Math.PI / 2 }
    : s.shot.kind === "wachlarz" ? { kind: "jedna", center: s.shot.center }
    : { kind: "360" };
  return { ...s, shot };
}

/** Projekt edytora jako poziom gracza; bez rozwiązania — rozwiązanie = start (szkic). */
export function toShared(s: EditorState, solution?: MovableShape[]): SharedLevel {
  return roundShared({
    title: s.title, ball: s.ball, hole: s.hole, shot: s.shot,
    pieces: s.pieces.map((p, i) => ({ start: p.shape, solution: solution?.[i] ?? p.shape, locked: p.locked })),
    obstacles: s.obstacles,
  });
}

/** Projekt z zapisu z powrotem do edytora: kształty startowe, bez zaznaczenia. */
export const fromShared = (l: SharedLevel): EditorState => ({
  title: l.title, ball: l.ball, hole: l.hole, shot: l.shot,
  pieces: l.pieces.map((p) => ({ shape: p.start, locked: p.locked })), obstacles: l.obstacles, selected: null,
});

/** Zapis szkicu (format linku z dopuszczonym brakiem elementów). */
export const draftCode = (s: EditorState): string => encodeLevel(toShared(s));

export type TestStart =
  | { ok: true; shared: SharedLevel; level: Level }
  | { ok: false; reason: "brak elementów" | "start już wygrywa" };

/** „Zagraj": zaokrąglony poziom do zagrania przez autora — chyba że nie ma czym grać albo
 *  start już wygrywa (wtedy nie ma czego udowadniać). */
export function prepareTest(s: EditorState): TestStart {
  if (s.pieces.length === 0) return { ok: false, reason: "brak elementów" };
  const shared = toShared(s);
  const level = sharedToLevel(shared, "edytor");
  return solvesLevel(level, shared.pieces.map((p) => p.start))
    ? { ok: false, reason: "start już wygrywa" }
    : { ok: true, shared, level };
}

export type WinResult = { ok: true; code: string } | { ok: false; reason: "nie wygrywa" | "nie da się zapisać" };

/** Autor wygrał: jego ustawienie, ZAOKRĄGLONE, musi przejść dowód jeszcze raz — zaokrąglenie
 *  mogło zepsuć wygraną na krawędzi. Obrona w głąb: kod musi też przejść odczyt linku, inaczej
 *  „Udostępnij" nie miałby czego wysłać, a projekt nie wczytałby się po odświeżeniu. Wynik to
 *  gotowy kod do linku. */
export function acceptWin(shared: SharedLevel, solution: MovableShape[]): WinResult {
  const withSolution = roundShared({
    ...shared, pieces: shared.pieces.map((p, i) => ({ ...p, solution: solution[i] ?? p.solution })),
  });
  if (!verifyShared(withSolution).ok) return { ok: false, reason: "nie wygrywa" };
  const code = encodeLevel(withSolution);
  return decodeLevel(code).ok ? { ok: true, code } : { ok: false, reason: "nie da się zapisać" };
}
