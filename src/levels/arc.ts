import { dist } from "../core/vec";
import { ArcRange, EllipseShape, MIN_ARC_LENGTH } from "./types";

const TAU = 2 * Math.PI;
/** Próbek na obwód. Łamana przez 512 punktów zaniża długość elipsy o ~1e-5 względnie —
 *  dużo poniżej tolerancji dołka; ważniejsze, że wszędzie liczymy TĄ SAMĄ funkcją. */
const SAMPLES = 512;

/** Skumulowana długość elipsy o półosiach a, b: cum[i] = długość od t = 0 do t = 2π·i/N.
 *  Nie zależy od położenia ani obrotu elipsy, tylko od a i b. */
function cumulative(s: EllipseShape): Float64Array {
  const c = dist(s.f1, s.f2) / 2;
  const a = s.a;
  // zacisk pod pierwiastkiem: przy a < c (elipsa jeszcze nieskonstruowalna, np. w trakcie
  // przeciągania) `a*a - c*c` bywa ujemne i dałoby NaN zamiast czytelnego błędu gdzie indziej
  const b = Math.sqrt(Math.max(0, a * a - c * c));
  const cum = new Float64Array(SAMPLES + 1);
  let px = a, py = 0;
  for (let i = 1; i <= SAMPLES; i++) {
    const t = (TAU * i) / SAMPLES;
    const x = a * Math.cos(t), y = b * Math.sin(t);
    cum[i] = cum[i - 1] + Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return cum;
}

/** L(t): długość od parametru 0 do t, dla dowolnego rzeczywistego t (rosnąca). */
function lengthAt(cum: Float64Array, t: number): number {
  const k = Math.floor(t / TAU);
  const x = ((t - k * TAU) / TAU) * SAMPLES;
  const i = Math.min(Math.floor(x), SAMPLES - 1);
  return k * cum[SAMPLES] + cum[i] + (cum[i + 1] - cum[i]) * (x - i);
}

/** Odwrotność L: parametr t, dla którego L(t) = v. Kawałkami liniowa jak L, więc
 *  obie funkcje są swoimi dokładnymi odwrotnościami (z dokładnością do zaokrągleń). */
function paramAt(cum: Float64Array, v: number): number {
  const P = cum[SAMPLES];
  const k = Math.floor(v / P);
  const r = v - k * P;
  let lo = 0, hi = SAMPLES;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= r) lo = m; else hi = m;
  }
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 0 ? (r - cum[lo]) / seg : 0;
  return k * TAU + (TAU * (lo + f)) / SAMPLES;
}

export const perimeter = (s: EllipseShape): number => cumulative(s)[SAMPLES];

/** Długość wzdłuż elipsy od parametru t0 do t1 (ujemna, gdy t1 < t0). */
export function arcLengthBetween(s: EllipseShape, t0: number, t1: number): number {
  const cum = cumulative(s);
  return lengthAt(cum, t1) - lengthAt(cum, t0);
}

/** Parametr punktu leżącego `len` dalej wzdłuż elipsy od parametru t0 (wstecz, gdy len < 0). */
export function paramAtLength(s: EllipseShape, t0: number, len: number): number {
  const cum = cumulative(s);
  return paramAt(cum, lengthAt(cum, t0) + len);
}

/** Końce łuku w parametrze elipsy: po length/2 w obie strony od `mid`, mierząc wzdłuż
 *  krzywej. Łuk dłuższy niż obwód minus MIN_ARC_LENGTH jest przycinany, żeby zawsze
 *  została przerwa i końce się nie zlały. */
export function arcParams(s: EllipseShape, arc: ArcRange): { start: number; end: number } {
  const cum = cumulative(s);
  const len = Math.min(arc.length, cum[SAMPLES] - MIN_ARC_LENGTH);
  const m = lengthAt(cum, arc.mid);
  return { start: paramAt(cum, m - len / 2), end: paramAt(cum, m + len / 2) };
}

/** Łuk od parametru `start` do `end` (start < end < start + 2π) na TEJ elipsie, zapisany
 *  długością: `mid` to parametr połowy długości, nie połowa parametru. */
export function arcFromParams(s: EllipseShape, start: number, end: number): ArcRange {
  const cum = cumulative(s);
  const l0 = lengthAt(cum, start);
  const l1 = lengthAt(cum, end);
  return { mid: paramAt(cum, (l0 + l1) / 2), length: l1 - l0 };
}
