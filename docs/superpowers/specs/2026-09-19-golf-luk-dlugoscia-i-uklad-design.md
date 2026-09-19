# Golf geometryczny — łuk opisany długością i miejsce na napisy

Data: 2026-09-19
Status: zaakceptowany projekt (rozmowa z właścicielem 2026-09-19), gotowy do planu
Poprzednie dokumenty: specy etapu 1, etapu 2 i `2026-09-19-golf-etap-2-poprawki-design.md`.
Ten dokument **zastępuje §6 specu poprawek** („zablokowany rozmiar naprawdę stoi”);
reszta tamtego specu obowiązuje.

---

## 1. Zakres

Dwie poprawki zgłoszone przez właściciela po wdrożeniu poprawek etapu 2:

1. **Nie ograniczać odległości ognisk.** Zamiast tego łuk ma być opisany swoją
   **długością**, nie zakresem kąta. To zamyka przechodzenie kaskad jedną elipsą
   bez ograniczania ruchu ognisk.
2. **Ramka planszy przechodzi przez napisy.** W układzie poziomym (i na komputerze)
   plansza zajmuje całą wysokość ekranu, więc ramka przecina baner u góry i przyciski
   na dole.

---

## 2. Łuk opisany długością

### Model

`ArcRange` przestaje być `{ start, end }` w parametrze elipsy. Staje się:

```ts
interface ArcRange {
  mid: number;     // parametr środka łuku w układzie własnym elipsy (x = a·cos t, y = b·sin t, oś f1→f2)
  length: number;  // długość łuku mierzona wzdłuż krzywej, w jednostkach świata
}
```

- Łuk rozciąga się o `length / 2` w obie strony od punktu `mid`, mierząc wzdłuż
  krzywej. Łuk nadal jedzie razem z elipsą, bo `mid` jest w jej układzie własnym.
- Gdy elipsa rośnie, łuk zachowuje długość i obejmuje mniejszy kawałek elipsy.
  Gdy maleje — większy, aż do pełnej elipsy bez minimalnej przerwy.
- `shapeToPiece` przelicza `{mid, length}` na końce łuku w parametrze (a potem na
  `from`, `via`, `to` dla rdzenia jak dotąd). **Rdzeń (`src/core/`) się nie zmienia.**

### Przeliczanie długości na parametr

Długość łuku elipsy nie ma postaci zamkniętej. Liczymy ją numerycznie:
tablica skumulowanej długości wzdłuż parametru (gęsto próbkowana, np. 512 punktów na
obwód) i odwracanie przez interpolację liniową. Wymagania:

- ta sama funkcja dla dowodu, podglądu, rysowania i uchwytów (jedno źródło prawdy);
- deterministyczna — ten sam kształt daje zawsze te same końce;
- końce łuku leżą dokładnie na elipsie (liczone przez `ellipsePoint` z parametru);
- błąd długości znacznie poniżej tolerancji dołka (`0.02 · DIAGONAL`).

### Dane poziomów

Poziomy dalej opisują łuki w stopniach, przez pomocnika, który liczy długość **na
elipsie z rozwiązania** tego elementu: łuk zapisany jako „od 20° do 120°” na
rozwiązaniu dostaje `mid = 70°` i długość tego kawałka. Start i rozwiązanie elementu
dzielą ten sam `ArcRange`. W rozwiązaniu każdy poziom wygląda więc jak dotąd;
zmienia się tylko to, co dzieje się przy innym rozmiarze.

### Uchwyty

- **Ogniska:** bez ograniczenia odległości. Rozmiar rośnie, gdy ogniska się rozjadą,
  jak w etapie 2 (`a ≥ c + MIN_GAP`) — także przy zablokowanym uchwycie rozmiaru.
  Wycofujemy parametr `sizeLocked` z `applyDrag` i dopisek „ODWOŁANE” przy
  rozstrzygnięciu 3 w `decyzje-etap-1.md` (to rozstrzygnięcie znów obowiązuje).
- **Rozmiar:** bez zmian (uchwyt w środku łuku).
- **Końce łuku:** przeciągany koniec ślizga się po krzywej, drugi koniec stoi w miejscu.
  Nowy łuk to kawałek od palca do nieruchomego końca, w kierunku, w którym łuk biegł:
  z niego liczymy nowe `mid` i `length`.
- **Minimalna długość łuku:** `MIN_ARC_LENGTH = 0.05` jednostki świata (zastępuje
  `MIN_ARC = 10°`). Maksymalna: obwód elipsy minus `MIN_ARC_LENGTH`. Końce nie mogą
  się minąć.

### Testy

- przeliczenie długość → parametr → długość wraca do tej samej długości (tolerancja
  rzędu `1e-4`), na elipsie niesymetrycznej wokół zera;
- łuk pomocnika „od α do β” na elipsie rozwiązania ma końce w α i β (tolerancja);
- przy dwukrotnie większym `a` łuk ma tę samą długość i obejmuje mniejszy zakres parametru;
- uchwyt końca łuku: po przeciągnięciu koniec leży na krzywej, drugi koniec się nie
  ruszył, minimalna długość na samej granicy;
- **test regresyjny kaskad (zastępuje test „jedna elipsa jest za mała”):** na
  poziomach kaskadowych (13–16) elipsa z ogniskami na piłce i w dołku, z łukiem
  danego elementu (ten sam `ArcRange`), nie wygrywa dla żadnego `a` od `0.56` do `3`
  (krok `0.04`), osobno dla każdego elementu gracza, przy pozostałych elementach
  w stanie startowym;
- test niezmiennika zostaje dla zablokowanych ognisk i końców łuku; część
  „`start.a === solution.a` i zasięg `2a`” znika (ogniska nie są ograniczane);
- wszystkie testy poziomów (rozwiązanie, start, 5%, odporność na krawędź łuku)
  przechodzą na nowym modelu. Test odporności skraca łuk o `0.02` jednostki długości
  z każdej strony (w miejsce dawnego 1° parametru; 1° na elipsie `a ≈ 1` to ok. `0.017`).

**Pomiar przed decyzją:** z łukiem o stałej długości jedna elipsa przez piłkę
i dołek nie wygrywa na żadnym z poziomów 13–16 dla `a` od `0.56` do `3` (krok 0.04).
Dla porównania, z łukiem opisanym kątem wygrywa na 13 i 15 dla `a ≈ 0.8–1.04`.

Pasma rozmiaru poziomów 12 i 16 oraz wszystkie testy poziomów trzeba zmierzyć
ponownie na nowym modelu (w planie, na prototypie).

---

## 3. Miejsce na napisy

- Kamera (`makeCamera`) dopasowuje kwadrat planszy do **obszaru gry**: ekran bez pasa
  banera u góry i bez pasa przycisków u dołu, z marginesem. Plansza jest wyśrodkowana
  w tym obszarze.
  - pas banera: od góry do `TOP_BAND = 112` px CSS (numer poziomu, tytuł, podpowiedź
    do dwóch linii, przycisk menu);
  - pas przycisków: od `ACTION_BAND · h` do dołu (ten sam próg co dotknięcie
    „Sprawdź”, `0.86`).
- Dotyk korzysta z tej samej kamery (`toWorld`), więc trafianie w uchwyty się nie
  rozjeżdża.
- Na telefonie w pionie plansza prawie się nie zmienia; w poziomie i na komputerze
  jest mniejsza, ale nic nie przecina tekstu.

**Testy:** dla ekranów `390×664`, `664×390`, `1280×720` i `375×667`: prostokąt
planszy na ekranie (obraz `[-1,1]²`) leży w całości między `TOP_BAND` a
`ACTION_BAND · h` i w poziomie w ekranie; plansza jest wyśrodkowana w obszarze gry;
`toWorld(toScreen(p)) = p`.

---

## 4. Kolejność prac

1. Model łuku z długością: `levels/types.ts`, `levels/shape.ts` (przeliczanie, pomocnik
   z kątów), dane poziomów, testy kształtów i poziomów.
2. Uchwyty: końce łuku na długości, `MIN_ARC_LENGTH`, wycofanie `sizeLocked`, testy.
3. Kamera z obszarem gry i testy układu.
4. Sprawdzenie w przeglądarce (Playwright) i dopisanie rozstrzygnięć do
   `decyzje-etap-2.md`; w `decyzje-etap-1.md` usunięcie dopisku „ODWOŁANE” przy
   rozstrzygnięciu 3 (z adnotacją, że wraca w mocy).

Praca na gałęzi `poprawki-etap-2`.
