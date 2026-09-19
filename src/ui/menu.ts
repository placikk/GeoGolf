import { Vec2 } from "../core/vec";

export interface Rect { x: number; y: number; w: number; h: number }

/** Przycisk ☰ w lewym górnym rogu — 44 px, minimalny cel dotykowy. */
export const MENU_BUTTON: Rect = { x: 6, y: 6, w: 44, h: 44 };

/** Dolny pas ekranu, w którym leżą przyciski akcji (ten sam próg co „Sprawdź”). */
export const ACTION_BAND = 0.86;

const SIDE = 16;
const TOP = 72;       // miejsce na przycisk menu i nagłówek „Poziomy”
const GAP = 12;
const MAX_TILE_H = 120;

export const hitRect = (r: Rect, p: Vec2): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Siatka kafelków: w pionie 2 kolumny, w poziomie 4. Wyśrodkowana w pionie. */
export function menuLayout(width: number, height: number, count: number): Rect[] {
  const cols = width >= height ? 4 : 2;
  const rows = Math.ceil(count / cols);
  const w = (width - 2 * SIDE - (cols - 1) * GAP) / cols;
  const h = Math.min(MAX_TILE_H, (height - TOP - SIDE - (rows - 1) * GAP) / rows);
  const top = TOP + Math.max(0, (height - TOP - SIDE - rows * h - (rows - 1) * GAP) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: SIDE + (i % cols) * (w + GAP),
    y: top + Math.floor(i / cols) * (h + GAP),
    w, h,
  }));
}

export function hitTile(tiles: Rect[], p: Vec2): number | null {
  const i = tiles.findIndex((t) => hitRect(t, p));
  return i < 0 ? null : i;
}

/** Na ekranie wygranej dolny pas dzieli się na „Jeszcze raz” (lewo) i „Następny” (prawo).
 *  Dotknięcie wyżej niczego nie robi, żeby nie przeskoczyć poziomu przypadkiem. */
export function winAction(p: Vec2, width: number, height: number): "powtorz" | "nastepny" | null {
  if (p.y < height * ACTION_BAND) return null;
  return p.x < width / 2 ? "powtorz" : "nastepny";
}
