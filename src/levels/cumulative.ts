/** Oba rodzaje krzywych (elipsa i krzywe nieograniczone) potrzebują odwrotności
 *  skumulowanej tabeli długości — binarnego wyszukania plus interpolacji liniowej.
 *  Tablica liniowa i to wyszukiwanie są swoimi dokładnymi odwrotnościami. */
export function cumulativeIndexAt(cum: Float64Array, r: number): number {
  const SAMPLES = cum.length - 1;
  let lo = 0, hi = SAMPLES;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= r) lo = m; else hi = m;
  }
  const seg = cum[lo + 1] - cum[lo];
  const f = seg > 0 ? (r - cum[lo]) / seg : 0;
  return lo + f;
}
