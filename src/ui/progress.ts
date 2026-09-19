/** Minimum z `Storage`, którego potrzebujemy — pozwala testować bez przeglądarki. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Progress {
  /** identyfikatory zaliczonych poziomów */
  solved: string[];
  /** indeks ostatnio granego poziomu */
  last: number;
}

const KEY = "golf-geometryczny/postep";
const EMPTY: Progress = { solved: [], last: 0 };

/** Pamięć przeglądarki bywa niedostępna (tryb prywatny, zablokowane dane witryny)
 *  i wtedy sam dostęp do `localStorage` rzuca wyjątek. Gra ma działać dalej, tylko bez pamięci. */
export function browserStore(): Store | null {
  try { return window.localStorage; } catch { return null; }
}

export function loadProgress(store: Store | null, levelCount: number): Progress {
  try {
    const raw = store?.getItem(KEY);
    if (raw == null) return EMPTY;
    const p = JSON.parse(raw) as Partial<Progress> | null;
    const solved = Array.isArray(p?.solved) ? p.solved.filter((s) => typeof s === "string") : [];
    const last = Number.isInteger(p?.last) && p!.last! >= 0 && p!.last! < levelCount ? p!.last! : 0;
    return { solved, last };
  } catch {
    return EMPTY;
  }
}

export function saveProgress(store: Store | null, p: Progress): void {
  try { store?.setItem(KEY, JSON.stringify(p)); } catch { /* bez pamięci też się gra */ }
}

export const markSolved = (p: Progress, id: string): Progress =>
  p.solved.includes(id) ? p : { ...p, solved: [...p.solved, id] };
