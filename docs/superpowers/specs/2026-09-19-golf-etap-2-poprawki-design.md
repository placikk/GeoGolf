# Golf geometryczny — poprawki po etapie 2

Data: 2026-09-19
Status: zaakceptowany projekt (rozmowa z właścicielem 2026-09-19), gotowy do planu
Poprzednie dokumenty: `2026-09-09-golf-geometryczny-design.md` (etap 1),
`2026-09-19-golf-etap-2-luki-design.md` (etap 2). Obowiązuje wszystko, czego ten
dokument nie zmienia.

---

## 1. Zakres

Pięć poprawek zgłoszonych przez właściciela po przejściu etapu 2:

1. Brzeg planszy jest ścianą.
2. „Jeszcze raz” wraca do edycji z ostatnim ustawieniem gracza.
3. Na ostatnim poziomie zamiast „Następny” jest „Menu”.
4. Poziom 12 nie daje się już przejść dużą elipsą.
5. Poziomów 13 i 15 nie da się przejść jedną elipsą.

Poza zakresem: nowe poziomy, przycisk „Cofnij”, zmiana warunku wygranej.

---

## 2. Brzeg planszy jest ścianą

**Decyzja właściciela:** ściana stoi na brzegu planszy, czyli kwadratu
`[-1, 1] × [-1, 1]`, a nie na brzegu ekranu. Fizyka poziomu nie zależy wtedy od
urządzenia, a dowód i testy są jednoznaczne. Na telefonie w pionie nad i pod planszą
zostaje pusty pas.

- Ściany to cztery zwykłe odcinki (`SegmentShape`) przez narożniki `(±1, ±1)`.
  Odbijają piłkę dokładnie jak każdy inny odcinek. W rdzeniu nie powstaje nowy
  mechanizm.
- Dokłada je `levelCurves` na końcu listy krzywych (po elementach gracza
  i przeszkodach), więc dotyczą każdego poziomu, dowodu, podglądu dwupiłkowego
  i testów, bez zmian w danych poziomów.
- Obecne „tor opuszcza `[-2, 2]²` i przepada” (`boundsExit` w `core/trace.ts`)
  zostaje jako bezpiecznik ostatniej szansy, np. na trafienie idealnie w narożnik,
  tak samo jak `maxLength`.
- **Rysowanie:** cienka ramka wokół planszy w kolorze stałych kształtów, z tą samą
  poświatą przez podwójny obrys. Obowiązuje zakaz `shadowBlur`.

**Pomiar przed decyzją:** z czterema ścianami każde z 16 zapisanych rozwiązań nadal
wygrywa, żaden stan startowy nie wygrywa, a liczba przesunięć o 5%, które nadal
wygrywają, jest taka sama jak bez ścian (0–2 na poziom, wyłącznie wyjątek
„ognisko 2 wzdłuż osi” z etapu 2).

**Testy:**
- piłka puszczona prostopadle w ścianę wraca po tym samym torze;
- piłka, która przedtem przepadała poza planszą, teraz odbija się od ramki (tor ma
  punkt odbicia na `|x| = 1` albo `|y| = 1`);
- `levelCurves` kończy się czterema ścianami, a elementy gracza zostają na początku
  listy;
- wszystkie istniejące testy poziomów przechodzą ze ścianami bez zmiany oczekiwań.

---

## 3. „Jeszcze raz” zachowuje ustawienie

**Decyzja właściciela:** po wygranej i po porażce „Jeszcze raz” wraca do edycji
z ustawieniem, które gracz właśnie sprawdził. To samo dzieje się przy dotknięciu
ekranu w trakcie animacji dowodu.

- Stan gry dostaje przejście „wróć do edycji”: faza `edycja`, `proof = null`,
  `elapsed = 0`, **`pieces` bez zmian**.
- Pełny reset do stanu startowego poziomu pozostaje pod kafelkiem tego samego
  poziomu w menu, tak jak dziś.
- „Następny” i wybór innego poziomu z menu zaczynają poziom od stanu startowego,
  jak dziś.

**Testy:** po wygranej i po porażce powrót do edycji zachowuje `pieces` (tożsamość
obiektów, nie tylko wartości) i czyści `proof`; `newGame` nadal daje stan startowy.

---

## 4. Ostatni poziom: „Menu” zamiast „Następny”

**Decyzja właściciela:** „Menu” z podsumowaniem.

- Na ekranie wygranej ostatniego poziomu prawy przycisk to „Menu” i otwiera siatkę
  poziomów. Lewy przycisk „Jeszcze raz” zostaje.
- Tekst banera:
  - „To był ostatni poziom.”, gdy nie wszystkie poziomy są zaliczone;
  - „Wszystkie poziomy ukończone.”, gdy po tej wygranej zaliczone są wszystkie.
- Na pozostałych poziomach bez zmian („Jeszcze raz” / „Następny”). Obecne zawijanie
  „Następny” z ostatniego na pierwszy poziom znika.
- Decyzję o przyciskach podejmuje czysta funkcja zależna od numeru poziomu i liczby
  poziomów, testowalna bez przeglądarki (w duchu `winAction` z `ui/menu.ts`).

**Testy:** na ostatnim poziomie prawa połowa dolnego pasa daje akcję „menu”, na
przedostatnim „następny”; lewa połowa zawsze „powtórz”; tekst podsumowania zależy od
tego, czy zaliczone są wszystkie poziomy.

---

## 5. Poziom 12: większy okrąg

**Problem (zmierzony):** okrąg `(0, −0.45)` o promieniu `0.1` miał wymuszać mały
rozmiar, ale osiem piłek przelatuje obok niego. Wygrywało każde `a` do `0.88`
i każde od `1.24` wzwyż.

**Decyzja:** okrąg o środku `(0, −0.5)` i promieniu `0.25`, rozwiązanie `a = 0.52`
(zamiast `0.56`). Reszta poziomu bez zmian.

**Pomiar (ze ścianami z §2):** wygrywa jedno ciągłe pasmo `a ∈ [0.455, 0.59]`
(krok 0.005), nic powyżej aż do `a = 3`. Stan startowy (`a = 0.9`) przegrywa.
Rozwiązanie wygrywa też po skróceniu łuków o 1°.

**Test regresyjny:** na poziomie 12 każde `a` od `0.62` do `3` (krok `0.02`) przegrywa.

---

## 6. Poziomy 13 i 15: zablokowany rozmiar naprawdę stoi

**Problem (zmierzony):** oba poziomy da się przejść jedną elipsą z ogniskami na
piłce i w dołku, gdy `a ≥ 0.8`. Rozmiar jest tam zablokowany, ale `applyDrag`
podnosi `a`, gdy ogniska rozjadą się dalej niż `2a` (żeby elipsa dała się
skonstruować), i nigdy go nie obniża. Gracz rozsuwa ogniska szeroko, zsuwa je
z powrotem i zostaje z dużą elipsą. To dziura w mechanice, nie w danych poziomu.

**Decyzja (podejście wybrane przez właściciela):** gdy uchwyt `rozmiar` elementu
jest zablokowany, `a` tego elementu **nigdy się nie zmienia**. Przeciągane ognisko
może się odsunąć od drugiego ogniska najwyżej na odległość `2a − 2·MIN_GAP`. Jeśli
palec jest dalej, ognisko zatrzymuje się na tej granicy, na prostej od drugiego
ogniska w stronę palca. Przyskok ogniska do celu leżącego za granicą też zatrzymuje
się na granicy.

- Gdy rozmiar jest odblokowany, zachowanie zostaje jak dziś (`a` rośnie razem
  z ogniskami).
- To zmienia rozstrzygnięcie 3 z `decyzje-etap-1.md` („`applyDrag` podnosi `a` także
  na poziomie 1”). Na poziomie 1 (`a = 0.8`, piłka i dołek w odległości `1.0`)
  rozwiązanie jest nadal osiągalne.
- Na poziomach 13 i 15 łuk ma `a = 0.4`, a piłkę i dołek dzieli `1.1`, więc jedna
  elipsa przez oba punkty staje się geometrycznie niemożliwa, bez nowych przeszkód.

**Rozważone i odrzucone:**
- *przeszkoda zasłaniająca drogę „na skróty”* — leczy objaw na jednym poziomie,
  dziura w mechanice zostaje;
- *reguła „każda piłka odbija się od obu łuków”* — zmienia centralny warunek
  wygranej.

**Testy:**
- przy zablokowanym rozmiarze przeciąganie ogniska nie zmienia `a`, a ognisko
  zatrzymuje się dokładnie na granicy `2a − 2·MIN_GAP` od drugiego ogniska
  (test na samej granicy);
- przy odblokowanym rozmiarze zachowanie jak dotąd (istniejący test etapu 1);
- **test regresyjny poziomów kaskadowych:** kaskada to poziom, w którego zapisanym
  rozwiązaniu jakieś ognisko leży poza piłką i dołkiem (dziś 13, 14, 15, 16). Dla
  każdego elementu gracza z zablokowanym rozmiarem na takim poziomie jedna elipsa
  z ogniskami na piłce i w dołku jest niekonstruowalna (`2a ≤` odległość piłka–dołek).
  Poziom 9 nie jest kaskadą: tam jedna elipsa przez piłkę i dołek jest właśnie
  rozwiązaniem.
- **test poziomu 16** (tam rozmiar drugiego łuku jest odblokowany): elipsa z ogniskami
  na piłce i w dołku nie wygrywa dla żadnego `a` od `0.56` do `3` (krok `0.02`).

---

## 7. Kolejność prac

1. Zablokowany rozmiar stoi (§6): `ui/handles.ts` i przekazanie blokady z `screens.ts`.
2. Ściany na brzegu planszy (§2): `levels/shape.ts` (`levelCurves`), rysowanie ramki.
3. Poziom 12 (§5): dane i test regresyjny.
4. „Jeszcze raz” (§3) i ostatni poziom (§4): `ui/game.ts`, `ui/menu.ts`, `ui/screens.ts`.
5. Sprawdzenie w przeglądarce (Playwright jak w zadaniu 12 etapu 2) i dopisanie
   rozstrzygnięć do `decyzje-etap-2.md`.

Praca na nowej gałęzi od `master`.
