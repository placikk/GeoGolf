import { Store } from "./progress";

/** Ustawienia gracza. Oba przełączniki domyślnie wyłączone (decyzja właściciela). */
export interface Settings {
  /** blade tory dwóch piłek w trybie edycji */
  previewPaths: boolean;
  /** tekst podpowiedzi pod tytułem poziomu */
  hints: boolean;
}

export const DEFAULT_SETTINGS: Settings = { previewPaths: false, hints: false };

/** Wiersze ekranu ustawień, w kolejności wyświetlania. */
export const SETTING_ROWS: { key: keyof Settings; label: string }[] = [
  { key: "previewPaths", label: "Tory podglądu" },
  { key: "hints", label: "Podpowiedzi" },
];

const KEY = "golf-geometryczny/ustawienia";

/** Ta sama odporność co postęp: brak pamięci, wyjątki i uszkodzony zapis dają domyślne. */
export function loadSettings(store: Store | null): Settings {
  try {
    const raw = store?.getItem(KEY);
    // kopia, żeby żaden wywołujący nie mógł przez referencję zmutować wartości domyślnej
    if (raw == null) return { ...DEFAULT_SETTINGS };
    const s = JSON.parse(raw) as Partial<Settings> | null;
    // tylko jawne `true` włącza — wszystko inne (brak pola, śmieci) to wartość domyślna
    return { previewPaths: s?.previewPaths === true, hints: s?.hints === true };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(store: Store | null, s: Settings): void {
  try { store?.setItem(KEY, JSON.stringify(s)); } catch { /* bez pamięci też się gra */ }
}

export const toggleSetting = (s: Settings, key: keyof Settings): Settings => ({ ...s, [key]: !s[key] });
