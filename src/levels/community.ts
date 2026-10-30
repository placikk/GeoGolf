/** Katalog poziomów społeczności — dokłada go twórca gry. Jak dodać poziom:
 *
 *  1. Ktoś przysyła link `…/#poziom=<kod>`.
 *  2. Dopisz `{ link: "<kod>", author: "<imię>" }` na końcu listy (sam kod, bez `#poziom=`).
 *  3. `npm test` — `tests/share/catalog.test.ts` odkodowuje każdy wpis i puszcza dowód
 *     (rozwiązanie autora wygrywa, start nie); zły wpis zatrzymuje testy, a więc i wydanie
 *     (CI uruchamia testy przed publikacją na GitHub Pages).
 *  4. Commit i wypchnięcie.
 *
 *  Same dane, bez importów — odkodowuje je `src/share/catalog.ts`. */
export interface CommunityEntry { link: string; author: string }

export const COMMUNITY: CommunityEntry[] = [];
