import { Vec2 } from "../core/vec";
import { PlayArea } from "../render/camera";

export interface Rect { x: number; y: number; w: number; h: number }

/** Przycisk ☰ w lewym górnym rogu — 44 px, minimalny cel dotykowy. */
export const MENU_BUTTON: Rect = { x: 6, y: 6, w: 44, h: 44 };

/** Przycisk ⚙ w prawym górnym rogu — lustrzane odbicie ☰; zależy od szerokości ekranu. */
export const settingsButton = (width: number): Rect => ({ x: width - 6 - 44, y: 6, w: 44, h: 44 });

/** Przycisk „?" (plansza z zasadą): wiersz z numerem poziomu na środku u góry. Nie obok ⚙ —
 *  tam na telefonie zachodziłby na najdłuższe tytuły („Teraz rozmiar ma znaczenie" ma ok.
 *  250 px przy 390 px ekranu). 44 px wysokości jak każdy cel dotykowy; zahacza o górę tytułu,
 *  ale tytuł niczego nie robi po dotknięciu, więc nic nie zasłania. */
export const helpButton = (width: number): Rect => ({ x: width / 2 - 80, y: 0, w: 160, h: 44 });

/** Dolny pas ekranu, w którym leżą przyciski akcji (ten sam próg co „Sprawdź”). */
export const ACTION_BAND = 0.86;

/** Czy punkt leży w dolnym pasie akcji (Reset / Sprawdź / przyciski ekranów). */
export const inActionBand = (p: Vec2, height: number): boolean => p.y >= height * ACTION_BAND;

/** Górny pas ekranu na baner: numer poziomu, tytuł, podpowiedź (na telefonach zajmuje
 *  do dwóch linii — zmierzone maksimum to 2 — z zapasem na trzecią) i przycisk menu
 *  (linie na 70, 88, 106 px). */
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

/** Siatka kafelków: w pionie 2 kolumny, w poziomie 4 — ale nie za cenę celu dotykowego.
 *  Gdy tylu wierszy przy tej bazowej liczbie kolumn zepchnęłoby kafelek pod 44 px
 *  (od ok. 21 poziomów na małych telefonach), siatka dostaje dodatkową kolumnę — dokładnie tyle,
 *  by wiersze zmieściły się w `maxRows`. Przy liczbie poziomów z etapów 1–2 (≤ 16) to
 *  zawsze `base`, więc stare ekrany wyglądają tak jak wcześniej. */
export function menuLayout(width: number, height: number, count: number): Rect[] {
  const base = width >= height ? 4 : 2;
  const maxRows = Math.max(1, Math.floor((height - TOP - SIDE + GAP) / (44 + GAP)));
  const cols = Math.max(base, Math.ceil(count / maxRows));
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

/** Napisy banera po dowodzie. Jedna piłka (bilard etapu 0) mówi w liczbie pojedynczej —
 *  „Wpadły wszystkie" i „Chybiło 1 z 1" brzmiałyby jak błąd gry. */
export function resultBanner(total: number, missed: number): { title: string; note: string } {
  if (missed === 0) return { title: total === 1 ? "Wpadła" : "Wpadły wszystkie", note: "" };
  if (total === 1) return { title: "Chybiła", note: "Zobacz, którędy poleciała." };
  return { title: "Nie wszystkie", note: `Chybiło ${missed} z ${total}. Zobacz, którędy.` };
}

export function hitTile(tiles: Rect[], p: Vec2): number | null {
  const i = tiles.findIndex((t) => hitRect(t, p));
  return i < 0 ? null : i;
}

export type EditAction = "reset" | "sprawdz";

/** W trybie edycji dolny pas dzieli się na „Reset" (lewo) i „Sprawdź" (prawo) — ten sam
 *  układ co „Jeszcze raz | Następny" na ekranie wygranej. Wyżej: nic. */
export function editAction(p: Vec2, width: number, height: number): EditAction | null {
  if (!inActionBand(p, height)) return null;
  return p.x < width / 2 ? "reset" : "sprawdz";
}

const ROW_H = 56;
const ROW_GAP = 12;
const ROW_MAX_W = 360;

/** Wiersze ekranu ustawień: jeden pod drugim, wyśrodkowane, każdy ≥ 44 px wysokości,
 *  poniżej przycisków ☰ / ⚙ i nagłówka. */
export function settingsLayout(width: number, height: number, count: number): Rect[] {
  const w = Math.min(ROW_MAX_W, width - 2 * SIDE);
  const total = count * ROW_H + (count - 1) * ROW_GAP;
  const top = Math.max(TOP, (height - total) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: (width - w) / 2,
    y: top + i * (ROW_H + ROW_GAP),
    w, h: ROW_H,
  }));
}

/** Górna krawędź rysunków planszy z zasadą: pod tytułem (34 px) i zdaniem zasady zawiniętym
 *  w najwyżej cztery linie po 20 px od 70 px. */
const CARD_SCENES_TOP = 160;

/** Kwadratowe pola na `count` miniscenek planszy z zasadą: między tekstem a dolnym pasem
 *  („Gram"), obok siebie, gdy jest szerzej niż wyżej, inaczej jedna pod drugą. */
export function cardLayout(width: number, height: number, count: number): Rect[] {
  const area = { x: SIDE, y: CARD_SCENES_TOP, w: width - 2 * SIDE, h: height * ACTION_BAND - GAP - CARD_SCENES_TOP };
  const side = area.w >= area.h ? "obok" : "pod";
  const along = side === "obok" ? area.w : area.h;
  const across = side === "obok" ? area.h : area.w;
  const size = Math.max(0, Math.min(across, (along - (count - 1) * GAP) / count));
  const total = count * size + (count - 1) * GAP;
  return Array.from({ length: count }, (_, i) => {
    const offset = (along - total) / 2 + i * (size + GAP);
    return side === "obok"
      ? { x: area.x + offset, y: area.y + (area.h - size) / 2, w: size, h: size }
      : { x: area.x + (area.w - size) / 2, y: area.y + offset, w: size, h: size };
  });
}
