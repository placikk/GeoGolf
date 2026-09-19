import { Vec2 } from "../core/vec";
import { PlayArea } from "../render/camera";

export interface Rect { x: number; y: number; w: number; h: number }

/** Przycisk ☰ w lewym górnym rogu — 44 px, minimalny cel dotykowy. */
export const MENU_BUTTON: Rect = { x: 6, y: 6, w: 44, h: 44 };

/** Dolny pas ekranu, w którym leżą przyciski akcji (ten sam próg co „Sprawdź”). */
export const ACTION_BAND = 0.86;

/** Górny pas ekranu na baner: numer poziomu, tytuł, podpowiedź do trzech linii
 *  (linie na 70, 88, 106 px) i przycisk menu. */
export const TOP_BAND = 112;

/** Pas ekranu na planszę — między banerem a przyciskami, żeby ramka planszy nie
 *  przecinała napisów (w poziomie i na komputerze plansza zajęłaby całą wysokość). */
export const playArea = (height: number): PlayArea => ({ top: TOP_BAND, bottom: height * ACTION_BAND });

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

export type WinAction = "powtorz" | "nastepny" | "menu";

/** Na ekranie wygranej dolny pas dzieli się na „Jeszcze raz" (lewo) i „Następny" (prawo);
 *  na ostatnim poziomie prawa połowa to „Menu". Dotknięcie wyżej niczego nie robi,
 *  żeby nie przeskoczyć poziomu przypadkiem. */
export function winAction(p: Vec2, width: number, height: number, isLast = false): WinAction | null {
  if (p.y < height * ACTION_BAND) return null;
  if (p.x < width / 2) return "powtorz";
  return isLast ? "menu" : "nastepny";
}

/** Prawy przycisk ekranu wygranej i dopisek do banera. Na ostatnim poziomie nie ma
 *  „Następnego" — jest „Menu" i podsumowanie. */
export function winLabels(isLast: boolean, allSolved: boolean): { right: string; note: string | null } {
  if (!isLast) return { right: "Następny", note: null };
  return { right: "Menu", note: allSolved ? "Wszystkie poziomy ukończone." : "To był ostatni poziom." };
}


export function hitTile(tiles: Rect[], p: Vec2): number | null {
  const i = tiles.findIndex((t) => hitRect(t, p));
  return i < 0 ? null : i;
}

