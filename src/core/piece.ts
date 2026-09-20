import { Vec2, add, dot, len, scale, sub } from "./vec";
import { Conic, classify } from "./conic";
import { rayConicAll } from "./intersect";
import { CurveFrame, frameParam } from "./frame";

/** `via` to dowolny punkt na ZACHOWANEJ części krzywej — wskazuje stronę cięciwy
 *  zamiast flagi, której znak łatwo pomylić. Dla prostej `via` nie jest używany. */
export interface Arc { from: Vec2; via: Vec2; to: Vec2 }

/** Zakres parametru we własnym układzie krzywej — dla krzywych NIEOGRANICZONYCH.
 *  Rozwiązuje naraz trzy rzeczy, których cięciwa nie umie: skończoność ramion, wybór
 *  gałęzi hiperboli i odporność na gracza (gdziekolwiek przeciągnie uchwyt, kawałek
 *  zostaje tym samym kawałkiem tej samej gałęzi). */
export interface ParamRange { from: number; to: number; frame: CurveFrame }

/** Kawałek krzywej. Brak `arc` i `range` oznacza całą krzywą. Kawałek ma CO NAJWYŻEJ
 *  JEDEN tryb ograniczenia — `range` wygrywa, gdy ktoś poda oba (patrz test w
 *  `tests/core/piece.test.ts`, który tego pilnuje w danych poziomów). */
export interface Piece { conic: Conic; arc?: Arc; range?: ParamRange }

/** Tolerancja przynależności do łuku, w jednostkach świata. Końce liczą się włącznie. */
export const ARC_EPS = 1e-9;

export const whole = (conic: Conic): Piece => ({ conic });

const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;

/** Czy punkt P LEŻĄCY NA krzywej należy do zachowanej części. Prosta przecina stożkową
 *  w co najwyżej dwóch punktach, więc cięciwa from→to dzieli KAŻDĄ stożkową na dwie
 *  części po przeciwnych stronach — wystarczy porównać stronę P ze stroną `via`. */
export function onPiece(piece: Piece, p: Vec2): boolean {
  const range = piece.range;
  if (range !== undefined) {
    const { t, branch } = frameParam(range.frame, p);
    if (range.frame.kind === "hiperbola" && branch !== range.frame.branch) return false;
    return t >= range.from - ARC_EPS && t <= range.to + ARC_EPS;
  }
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
