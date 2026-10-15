/** Minimum z `Storage`, którego potrzebujemy — pozwala testować bez przeglądarki. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Progress {
  /** identyfikatory zaliczonych poziomów */
  solved: string[];
  /** identyfikator ostatnio granego poziomu; `null` — brak zapisu albo poziom, którego już nie ma */
  lastId: string | null;
}

const KEY = "golf-geometryczny/postep";
const EMPTY: Progress = { solved: [], lastId: null };

/** Kolejność 24 poziomów sprzed etapu 0. Stary zapis trzymał w polu `last` INDEKS w tej
 *  kolejności, a etap 0 przesunął wszystkie poziomy (i zamienił miejscami „druga-strona"
 *  z „wspolne-ognisko"), więc stary indeks przeliczamy przez tę listę na identyfikator.
 *  To zapis historii, nie bieżąca kolejność — nie zmieniać razem z `LEVELS`. */
export const LEGACY_ORDER: readonly string[] = [
  "ogniska", "rozmiar", "skos", "blisko", "ciasna", "przeszkoda", "dwie-przeszkody", "zwienczenie",
  "polelipsa", "bandy", "przycinanie", "wspologniskowe", "kaskada", "kaskada-od-konca", "dwie-elipsy", "zwienczenie-2",
  "ognisko-paraboli", "parabola-rozmiar", "obrot-osi", "teleskop", "wspolne-ognisko", "druga-strona", "ktora-galaz",
  "zwienczenie-3",
];

/** Pamięć przeglądarki bywa niedostępna (tryb prywatny, zablokowane dane witryny)
 *  i wtedy sam dostęp do `localStorage` rzuca wyjątek. Gra ma działać dalej, tylko bez pamięci. */
export function browserStore(): Store | null {
  try { return window.localStorage; } catch { return null; }
}

/** Ostatni poziom z zapisu: nowy zapis ma `lastId`, stary — indeks `last` w `LEGACY_ORDER`.
 *  Identyfikator, którego nie ma w `ids` (poziom usunięty), daje `null`. */
function lastIdFrom(p: object, ids: readonly string[]): string | null {
  const lastId = "lastId" in p ? p.lastId : undefined;
  if (typeof lastId === "string") return ids.includes(lastId) ? lastId : null;
  const last = "last" in p ? p.last : undefined;
  if (typeof last !== "number" || !Number.isInteger(last) || last < 0 || last >= LEGACY_ORDER.length) return null;
  const id = LEGACY_ORDER[last];
  return ids.includes(id) ? id : null;
}

/** `ids` — identyfikatory poziomów w grze; zapis wskazujący poziom spoza nich jest pomijany. */
export function loadProgress(store: Store | null, ids: readonly string[]): Progress {
  try {
    const raw = store?.getItem(KEY);
    if (raw == null) return EMPTY;
    const p: unknown = JSON.parse(raw);
    if (typeof p !== "object" || p === null) return EMPTY;
    const solvedRaw = "solved" in p ? p.solved : undefined;
    const solved = Array.isArray(solvedRaw) ? solvedRaw.filter((s): s is string => typeof s === "string") : [];
    return { solved, lastId: lastIdFrom(p, ids) };
  } catch {
    return EMPTY;
  }
}

export function saveProgress(store: Store | null, p: Progress): void {
  try { store?.setItem(KEY, JSON.stringify(p)); } catch { /* bez pamięci też się gra */ }
}

export const markSolved = (p: Progress, id: string): Progress =>
  p.solved.includes(id) ? p : { ...p, solved: [...p.solved, id] };
