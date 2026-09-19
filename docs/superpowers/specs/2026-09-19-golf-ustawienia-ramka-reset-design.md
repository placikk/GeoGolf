# Golf geometryczny — ustawienia, ładna ramka, reset poziomu

Data: 2026-09-19
Status: zaakceptowany projekt (rozmowa z właścicielem 2026-09-19), gotowy do planu
Poprzednie dokumenty: specy etapów 1–2, `2026-09-19-golf-etap-2-poprawki-design.md`,
`2026-09-19-golf-luk-dlugoscia-i-uklad-design.md`. Obowiązuje wszystko, czego ten
dokument nie zmienia.

---

## 1. Zakres

Cztery zmiany zgłoszone przez właściciela:

1. **Menu ustawień** z przełącznikami „Tory podglądu” i „Podpowiedzi”, oba domyślnie
   wyłączone.
2. **Bez napisu „Osiem torów, jedno miejsce…”** na ekranie wygranej.
3. **Ładna ramka planszy** i **mniejszy wachlarz**, mieszczący się w ramce.
4. **Przycisk resetu poziomu.**

Poza zakresem: inne ustawienia (dźwięk, język, motyw), potwierdzanie resetu.

---

## 2. Menu ustawień

- **Wejście:** ikona ⚙ w prawym górnym rogu, prostokąt 44 × 44 px CSS, symetrycznie do
  przycisku ☰ (`MENU_BUTTON`) po lewej: `SETTINGS_BUTTON = { x: w − 6 − 44, y: 6, w: 44, h: 44 }`
  (zależy od szerokości ekranu).
- **Ekran:** półprzezroczysta nakładka jak menu poziomów, nagłówek „Ustawienia”, dwa
  wiersze-przełączniki (każdy cel dotykowy ≥ 44 px wysokości), z etykietą i stanem
  (np. „Tory podglądu — wył.” / „wł.”, z wizualnym wyróżnieniem włączonego):
  - **Tory podglądu** (`previewPaths`): blade tory dwóch piłek w trybie edycji;
  - **Podpowiedzi** (`hints`): tekst podpowiedzi pod tytułem poziomu.
- **Domyślnie oba wyłączone** (decyzja właściciela).
- Dotknięcie wiersza przełącza ustawienie i od razu je zapisuje. ⚙ albo dotknięcie tła
  poza wierszami zamyka ekran. Otwarcie ekranu ustawień przerywa trwający dowód (jak
  menu poziomów); menu poziomów i ustawień nie są otwarte naraz.
- **Zapis:** w pamięci przeglądarki pod osobnym kluczem (`golf-geometryczny/ustawienia`),
  z tą samą odpornością co postęp: brak pamięci, wyjątki i uszkodzony zapis dają
  ustawienia domyślne i nie wywracają gry.
- **Podział odpowiedzialności:** czysta logika (typ ustawień, domyślne, wczytanie,
  zapis, przełączenie) w nowym `src/ui/settings.ts`, układ ekranu (prostokąty wierszy,
  trafianie) jako czyste funkcje testowalne bez przeglądarki; rysowanie i obsługa
  dotyku w `src/ui/screens.ts`.
- Gdy podpowiedzi są wyłączone, baner pokazuje tylko numer poziomu i tytuł. Pas banera
  (`TOP_BAND`) i położenie planszy się nie zmieniają — plansza nie „skacze” po
  przełączeniu.

---

## 3. Ekran wygranej

- Znika zdanie „Osiem torów, jedno miejsce[, ta sama chwila].”.
- Zostaje tytuł „Wpadły wszystkie”. Na ostatnim poziomie pod tytułem zostaje dopisek
  z `winLabels` („To był ostatni poziom.” / „Wszystkie poziomy ukończone.”); na
  pozostałych poziomach pod tytułem nic.
- Ekran porażki bez zmian („Chybiło X z 8. Zobacz, którędy.”).

---

## 4. Ramka i wachlarz

- **Ramka:** cienka linia w kolorze drugiego planu (szaroniebieska, jak `PALETTE.muted`)
  z łagodną poświatą przez podwójny obrys (zakaz `shadowBlur` obowiązuje), z lekko
  zaokrąglonymi rogami (promień ok. 6 px CSS). Wnętrze planszy ma tło o odcień
  jaśniejsze niż reszta ekranu.
- **Fizyka bez zmian:** ściany to nadal cztery odcinki na brzegu kwadratu `[-1, 1]²`
  z ostrymi narożnikami. Zaokrąglenie jest tylko rysunkiem; różnica w narożniku (6 px)
  jest niewidoczna dla gry.
- **Wachlarz:** klin ma promień `0.4` jednostki świata (zamiast `3`) i jest przycięty do
  planszy (rysowany z przycięciem do kwadratu `[-1, 1]²`), więc nigdy nie wychodzi za
  ramkę. Kolor i przezroczystość bez zmian.

---

## 5. Reset poziomu

- W trybie edycji dolny pas (`y > ACTION_BAND · h`) dzieli się na dwie połowy:
  **„Reset”** (lewa) i **„Sprawdź”** (prawa) — ten sam układ co „Jeszcze raz | Następny”
  na ekranie wygranej, z pionową kreską pośrodku.
- „Reset” przywraca stan startowy poziomu: wszystkie elementy gracza jak w `newGame`.
  Postęp i ustawienia bez zmian. Bez potwierdzenia.
- „Sprawdź” działa jak dotąd (dotknięcie prawej połowy pasa).
- Rozstrzyga czysta funkcja zależna od punktu i rozmiaru ekranu (w duchu `winAction`),
  testowalna bez przeglądarki. Zachowane dotychczasowe zabezpieczenie: puszczenie
  uchwytu w dolnym pasie po przeciąganiu nie uruchamia ani resetu, ani dowodu.

---

## 6. Testy

- ustawienia: domyślne (oba wył.), zapis → odczyt, przełączenie jednego nie zmienia
  drugiego, brak pamięci i wyjątki nie wywracają, uszkodzony zapis → domyślne;
- układ ekranu ustawień: wiersze mieszczą się na ekranie, są celami ≥ 44 px, nie
  nachodzą na siebie ani na ⚙/☰; trafienie w wiersz zwraca jego ustawienie, tło nic;
- ⚙: w prawym górnym rogu, ≥ 44 px, nie nachodzi na ☰ ani na planszę (z `playArea`)
  na ekranach `375×667`, `390×664`, `664×390`, `1280×720`;
- dolny pas w edycji: lewa połowa „reset”, prawa „sprawdź”, powyżej pasa nic;
- tekst ekranu wygranej: brak zdania o ośmiu torach; dopisek tylko na ostatnim poziomie;
- klin wachlarza: promień `0.4 · scale` px; rysowanie z przycięciem do planszy
  (nagrywający kontekst: wywołanie przycięcia przed wypełnieniem);
- zakaz `shadowBlur` i budżet paczki — bez zmian.

---

## 7. Kolejność prac

1. Ustawienia: logika i zapis (`settings.ts`), testy.
2. Ekran ustawień, ⚙, przełączniki w rysowaniu (tory podglądu, podpowiedzi).
3. Ekran wygranej bez zdania o ośmiu torach; reset w dolnym pasku.
4. Ramka, tło planszy, mniejszy i przycięty wachlarz.
5. Sprawdzenie w przeglądarce (Playwright) i dopisanie rozstrzygnięć do `decyzje-etap-2.md`.

Praca na gałęzi `poprawki-etap-2`.
