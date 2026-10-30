import { Card, Level, autoCard, cardFor, mechanicCard } from "../levels";

/** Skąd gra bierze bieżący poziom: lista twórców albo jedna z sekcji zakładki „Społeczność".
 *  „Następny", baner i „?" zależą od listy, nie od tego, jak poziom powstał. */
export type Section = "tworcy" | "katalog" | "linki";

export interface Playlist { section: Section; levels: Level[]; index: number }

export const current = (p: Playlist): Level => p.levels[p.index];
export const isLastIn = (p: Playlist): boolean => p.index >= p.levels.length - 1;
export const nextIn = (p: Playlist): Playlist => ({ ...p, index: Math.min(p.index + 1, p.levels.length - 1) });

/** Pierwsza linia banera: numer na liście twórców, „Społeczność" dla reszty. */
export const bannerLabel = (p: Playlist): string =>
  p.section === "tworcy" ? `Poziom ${p.index + 1} / ${p.levels.length}` : "Społeczność";

/** Plansza pod „?": u twórców — ostatnia plansza przed poziomem; w społeczności — według
 *  mechaniki, bo poziomy społeczności nie mają swojej kolejności. */
export const helpCard = (p: Playlist): Card | undefined =>
  p.section === "tworcy" ? cardFor(p.levels.map((l) => l.id), p.index) : mechanicCard(current(p));

/** Plansza pokazywana sama przy wejściu na poziom — tylko u twórców (tam wprowadza mechanikę). */
export const autoCardIn = (p: Playlist, solved: readonly string[]): Card | undefined =>
  p.section === "tworcy" ? autoCard(current(p).id, solved) : undefined;
