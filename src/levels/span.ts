import { dist } from "../core/vec";
import { CurveFrame, framePoint } from "../core/frame";
import { Span } from "./types";
import { cumulativeIndexAt } from "./cumulative";

/** Tyle samo co w `arc.ts` — ważniejsze od gęstości jest to, żeby WSZĘDZIE liczyć
 *  tą samą funkcją; wtedy długość i jej odwrotność są swoimi dokładnymi odwrotnościami. */
const SAMPLES = 512;

/** Zasięg planszy to [-2, 2]²; pochodzenie ramy jest w [-1, 1]², trzeba max(|dx|, |dy|) > 3.
 *  Najgorzej przy osi diagonalnej: max(|dx|, |dy|) = |d|/√2. Dla paraboli |d| ≥ |t|,
 *  dla hiperboli |d| ≥ b·sinh t (już obsłużone przez asinh(REACH / b)).
 *  Wymóg to |d| > 3√2 ≈ 4.243, zatem REACH = 5 > 3√2. */
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
  const indexFrac = cumulativeIndexAt(cum, r);
  return -T + (2 * T * indexFrac) / SAMPLES;
}

/** Długość wzdłuż krzywej od parametru t0 do t1 (ujemna, gdy t1 < t0). */
export function frameLengthBetween(f: CurveFrame, t0: number, t1: number): number {
  const { cum, T } = cumulative(f);
  return lengthAt(cum, T, t1) - lengthAt(cum, T, t0);
}

/** Zakres parametru kawałka. Opis długościowy jest TU przeliczany na parametryczny —
 *  dalej w dół (`Piece.range`, render, `onPiece`) istnieje już tylko zakres parametru.
 *  Oba pola naraz wyklucza już typ `Span`, więc wariant rozpoznaje sam brak `length`. */
export function spanRange(f: CurveFrame, span: Span): { from: number; to: number } {
  if (span.length === undefined) {
    return { from: span.mid - span.span / 2, to: span.mid + span.span / 2 };
  }
  const { cum, T } = cumulative(f);
  const m = lengthAt(cum, T, span.mid);
  return {
    from: paramAt(cum, T, m - span.length / 2),
    to: paramAt(cum, T, m + span.length / 2),
  };
}
