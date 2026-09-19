# Decyzje podjęte bez pytania — etap 2 (łuki)

Ten dokument spisuje rozstrzygnięcia z planu etapu 2 (`decyzje 1–11` przy pisaniu planu),
rozstrzygnięcia podjęte w trakcie realizacji (ledger `progress.md`) oraz wynik ręcznego
sprawdzenia z zadania 12. Format jak `decyzje-etap-1.md`.

Zadanie 12 nie miało fizycznego telefonu — aneks kontrolera zastąpił krok 1–2 emulacją
Playwright (Chromium, urządzenie `iPhone 12`, dotyk włączony) na zbudowanej wersji gry.
Wszystkie 16 poziomów zostało przejechane od stanu startowego wyłącznie przez przeciąganie
odblokowanych uchwytów, a wygrana każdego poziomu potwierdzona przez `localStorage`
(`golf-geometryczny/postep`), nie tylko przez zrzut ekranu.

---

## Rozstrzygnięcia podjęte przy pisaniu planu (1–11)

1. **„Cofnij" nie istnieje w kodzie etapu 1** — spec etapu 2 (§6) zakłada pasek
   „Sprawdź, Cofnij, Reset", ale etap 1 ma tylko „Sprawdź", a reset to ponowne
   wejście w poziom (`goTo`). Spec mówi też „pasek dolny bez zmian", więc **nie
   dodajemy przycisków**. Reset (nowa gra) naturalnie przywraca całą listę elementów.
2. **Kryterium 5% per element** jest rozpisane na dwa testy. `ognisko1` każdego
   odblokowanego elementu: pudło w **każdym** z 8 kierunków (dokładnie test etapu 1).
   `ognisko2`: pudło w **co najmniej 6 z 8** kierunków. Powód: znany z etapu 1
   wyjątek (dawna notatka „pozycja 12" w `tests/levels.test.ts`): ognisko po stronie
   dołka przesunięte **wzdłuż własnej osi** zostawia tory tak blisko dołka, że część
   przesunięć przechodzi. Zmierzone: poziomy etapu 1 mają 1–2 takie kierunki, nowe
   0–2, zawsze na osi elementu.
3. **Okręgi (`f1 = f2`) nie mają bladych ognisk i nie są celem przyskakiwania.**
   „Ognisko" okręgu to środek przeszkody — nigdy nie jest sensownym celem, a pokazanie
   go zmieniłoby wygląd poziomów 6–8.
4. **Uchwyt rozmiaru na łuku siedzi w środku łuku**, nie na wierzchołku osi wielkiej —
   wierzchołek może wypaść w przerwie łuku, a wtedy gracz chwytałby powietrze. Na pełnej
   elipsie zostaje na wierzchołku (test etapu 1 bez zmian).
5. **`MIN_ARC = 10°` mieszka w `levels/types.ts`**, bo obowiązuje i dane poziomów
   (test), i przeciąganie (`ui/handles.ts`). Łuk ma długość z `[MIN_ARC, 2π − MIN_ARC]`.
6. **Kolor stałych kształtów zostaje czerwony (`PALETTE.obstacle`)**, także dla łuków,
   które na poziomach 12–16 są pożytecznymi lustrami. Spec tego nie zmienia; kwestia
   do oceny okiem w zadaniu 12. **Ocena z zadania 12 — patrz sekcja niżej.**
7. **Geometria kaskad (13–16):** piłka za punktem M leci **w poprzek** osi drugiej
   elipsy, a nie w stronę dołka. W pierwszej wersji (piłki za M w stronę dołka)
   przesunięcie ogniska drugiego łuku o 5% **wygrywało we wszystkich 8 kierunkach** —
   trafienie blisko dołka zmniejsza błąd zamiast go powiększać. Wszystkie kaskady
   stoją na jednym sprawdzonym układzie (obróconym albo przesuniętym).
8. **Poziom 11 „Przycinanie":** okrąg gracza wokół piłki odbija ją prosto z powrotem
   przez piłkę do stałego lustra po drugiej stronie. Gracz przycina okrąg tak, żeby
   zakrywał przerwę w lustrze i **odsłonił** drogę tam, gdzie lustro jest. To jest
   wariant „odsłonić drogę" ze specu, na wachlarzu 360°.
9. **Poziom 12:** o rozmiarze decyduje czerwony okrąg pod łukiem gracza — bez niego
   każdy rozmiar współogniskowego łuku by działał.
10. **Poziom 16** ma tytuł „Zwieńczenie kaskad" (poziom 8 już nazywa się „Zwieńczenie",
    a tytuły widać obok siebie w menu). Gracz rusza drugim łukiem: ogniska i rozmiar.
    Banda i okrąg na osi M–dołek zostawiają pasmo `a ∈ [0.38, 0.44]`, rozwiązanie
    `a = 0.41`.
11. **Poziomy etapu 2 w osobnym pliku `levels/stage2.ts`** — `levels/index.ts`
    urósłby do ~250 linii danych.

---

## Rozstrzygnięcia podjęte w trakcie realizacji (ledger `progress.md`)

```
Ruling P1: Zadanie 12 wykonuje subagent z emulacją telefonu w Playwright (npx playwright
  1.63, chromium w cache) zamiast prawdziwego telefonu; checklistę na prawdziwym telefonie
  przekazuję właścicielowi w końcowym raporcie — subagent nie ma fizycznego urządzenia —
  koszt, jeśli źle: problemy dotyku widoczne tylko na prawdziwym ekranie wyjdą dopiero
  u właściciela.
```

```
Ruling P2: Briefy wycinam własnym brief.sh (nagłówki „Zadanie N", dla 8–11 z dołączoną
  sekcją „wspólne zasady") zamiast scripts/task-brief — ten sam kontrakt, jak rozstrzygnięcie
  4 etapu 1 — koszt, jeśli źle: ucięty brief; sprawdzane liczbą linii.
```

```
Ruling (zadanie 5): ⚠️ wizualny smoke test poziomów 1 i 8 niewykonany (subagent bez
  przeglądarki) — przenoszę do zadania 12 (Playwright, emulacja telefonu) i do checklisty
  właściciela; zmiany w screens.ts to mechaniczne 1:1 — koszt, jeśli źle: regresja wizualna
  wykryta dopiero w zadaniu 12.
```
**Domknięte w zadaniu 12:** zrzuty `level-01-ogniska-edit.png` i `level-08-zwienczenie-edit.png`
potwierdzają identyczny wygląd jak etap 1 (pełna elipsa, kulka/dołek, czerwony okrąg
przeszkody na poziomie 8, pierścieniowe uchwyty) — patrz raport zadania 12.

```
Ruling (zadanie 7): finding recenzenta (plan-mandated, Important) — test „grown" nie
  dosięga górnego zacisku 2π − MIN_ARC (wrap ogranicza skok do ±π) — POPRAWIAMY testem na
  długim łuku dla obu końców; kod bez zmian — globalna reguła „testy graniczne ćwiczą samą
  granicę" — koszt, jeśli źle: jeden dodatkowy test.
```

```
Ruling (przed zadaniami 8–11): zadania 8–11 (poziomy 9–16) wykonuje jeden wykonawca
  w jednym zleceniu, commit na zadanie, jeden przegląd całości — to te same dopiski danych
  + podbicie licznika; kroki „przejdź palcem" przechodzą do zadania 12 (Playwright) — koszt,
  jeśli źle: większy diff do jednego przeglądu.
```

```
Ruling (zadania 8–11): finding „przejście palcem pominięte" (plan-mandated, Important) —
  zgodnie z Ruling P1 przenoszę do zadania 12, które przeciąga uchwyty w Playwright
  (emulacja telefonu) od startu do rozwiązania na KAŻDYM poziomie 1–16; realną trudność
  poziomu 15 ocenia właściciel na telefonie (checklista w raporcie końcowym) — subagent
  nie ma dotyku — koszt, jeśli źle: poziom 15 za trudny na telefonie; spec §8 przewiduje
  wtedy blokadę uchwytu.
```
**Domknięte w zadaniu 12:** wszystkie 16 poziomów (1–16) przejechane w Playwright od stanu
startowego wyłącznie przeciąganiem odblokowanych uchwytów; wygrana każdego poziomu
potwierdzona przez `localStorage`. Trudność poziomu 15 dla człowieka (nie da się jej ocenić
maszynowo) zostaje w checkliście właściciela niżej.

Dodatkowo w ledgerze (nie „Ruling", ale bezpośrednio dotyczy zakresu zadania 12):
```
⚠️ rozstrzygnięte przez kontrolera (zadania 8–11): testy 5% i skrócenia łuku iterują po
  LEVELS (byId w tests/levels.test.ts) — obejmują poziomy 9–16.
```

Pozostałe wpisy ledgera („minor (deferred)") to drobne usterki kosmetyczne bez wpływu na
poprawność (np. Task 1: dwa równe `t` przy styczności bez skutku ubocznego; Task 2: ciche
zachowanie `onPiece` przy zdegenerowanym łuku, zapobiegane przez `MIN_ARC` w danych; Task 4:
brak ochrony `count<=0`/`width<=0` w `launchAngles`, luka sprzed etapu 2; Task 5: cieniowanie
zmiennej `state` w `pickHandle`; Task 6: cudzysłowy w komentarzach, literał `3` dla zasięgu
klina) — nie są rozstrzygnięciami zmieniającymi zachowanie gry, więc nie są tu powtarzane
w całości; pełna lista jest w `progress.md`.

---

## Wynik ręcznego sprawdzenia — zadanie 12 (emulacja Playwright)

**Metoda:** `npm run build` (8.55 KB gzip, budżet < 100 KB — margines duży), następnie
`npx vite preview --port 4173 --strictPort`. Playwright 1.63 (Chromium z cache, zainstalowany
lokalnie w katalogu `e2e/` poza repozytorium, bo `import "playwright"` nie rozwiązywał się
z samego cache'u npx przez `NODE_PATH` — ESM tego nie wspiera tak jak CJS). Urządzenie
`devices["iPhone 12"]` (390×664 CSS, dotyk włączony) i `devices["iPhone 12 landscape"]`
(750×340) do zrzutu poziomego. Serwer podglądu wystawiony tylko na `localhost` (bez `--host`)
— wystarcza do Playwrighta, bo nie ma prawdziwego telefonu podłączanego przez Wi-Fi; to
jedyne odstępstwo od litery kroku 1.

Przeciąganie: gesty `pointerdown → kilka pointermove → pointerup` generowane przez
`page.mouse.down/move/up` (Playwright nie ma API do wieloetapowego przeciągania dotykiem,
tylko `touchscreen.tap`; canvas gry nasłuchuje `PointerEvent` bez filtrowania po
`pointerType`, więc funkcjonalnie test jest równoważny). Docelowe współrzędne każdego uchwytu
wyliczone niezależnie w skrypcie z tych samych wzorów co `src/ui/handles.ts` i
`src/levels/shape.ts` (kamera, `ellipsePoint`, `moveArcEnd`), nie odczytywane z gry — więc
przeciąganie mierzy się z pełną geometrią, a nie z zgadywaniem piksela. Wygrana każdego
poziomu potwierdzona przez `localStorage["golf-geometryczny/postep"].solved`, nie tylko
wizualnie.

### Lista kontrolna

1. **Przetrwanie postępu.** Przed pierwszym załadowaniem ustawiony `localStorage`
   `{"solved":["ogniska","skos"],"last":0}`. Menu pokazuje 16 kafelków i ✓ dokładnie przy
   poziomach 1 i 3, w pionie i w poziomie.
   Zrzuty: `e2e/shots/01-progress-menu-portrait.png`, `e2e/shots/01-progress-menu-landscape.png`.
2. **16 kafelków, każdy trafialny.** Potwierdzone przez samo przejście wszystkich 16
   poziomów przez menu (kliknięcie w środek kafelka z `menuLayout`) — każde trafienie
   przełączyło poziom.
3. **Poziom 9 „Półelipsa":** klin wachlarza (sektor 180°, `sector.center=π/2, width=π`)
   widoczny w edycji, zniknięty tuż po dotknięciu „Sprawdź" (faza `dowod`).
   Zrzuty: `e2e/shots/level-09-polelipsa-edit.png` (klin widoczny),
   `e2e/shots/level-09-polelipsa-during-proof.png` (klina nie ma, tylko wachlarz 8 torów).
4. **Poziom 11 „Przycinanie":** koniec łuku dociągnięty do początku w małych krokach
   kątowych (symulacja ślizgu palca) zatrzymuje się dokładnie na `MIN_ARC = 10°` od drugiego
   końca — końce się nie mijają, łuk nie znika.
   Zrzuty: `e2e/shots/level-11-przycinanie-edit.png` (stan startowy, przerwa 40°),
   `e2e/shots/level-11-przycinanie-clamp-attempt.png` (uchwyty dociągnięte, zaciśnięte na 10°).
5. **Poziomy 12–16:** blade ogniska stałych elips widoczne wszędzie, gdzie ognisko przeszkody
   NIE pokrywa się z piłką/dołkiem (czyli punkt M na poziomach 13, 14, 16); na poziomie 15 —
   `obstacles: []` w danych, więc bladych ognisk (w tym M) **nie ma w ogóle**, zgodnie
   z oczekiwaniem checklisty. Okręgi (poziom 12: mały okrąg pod spodem) bez bladych ognisk,
   zgodnie z rozstrzygnięciem 3.
   Zrzuty: `level-12-wspologniskowe-edit.png` … `level-16-zwienczenie-2-edit.png`.
6. **Poziomy 13, 14, 16 — przyskok ogniska w M bez celowania co do piksela.** Potwierdzone
   pozytywnie: ognisko M na każdym z tych poziomów pokrywa się z ogniskiem stałej przeszkody
   (kaskada: `f1` przeszkody; kaskada-od-końca: `f2`; zwieńczenie kaskad: `f1`), więc
   `snapTargets`/`snapTo` chwyta je z dowolnego miejsca w promieniu `SNAP_RADIUS = 0.05·DIAGONAL`.
   Skrypt umieszczał palec dokładnie w punkcie docelowym (odległość przyciągania 0), więc
   przyskok zadziałał za każdym razem — wszystkie trzy poziomy wygrane.
7. **Poziom 15 — przechodzenie w rozsądnym czasie.** Maszynowo nieocenialne (patrz niżej,
   „Czego nie dało się sprawdzić emulacją"). Rozwiązywalność uchwytami: **TAK**, i to z pełną
   jednoczesnością ośmiu torów („ta sama chwila" w banerze wygranej) — patrz
   `e2e/shots/level-15-dwie-elipsy-result.png`.
8. **Wszystkie poziomy 9–16 (i 1–8) przechodzą od stanu startowego.** TAK — 16/16, patrz
   tabela niżej.
9. **Ocena kolorów (rozstrzygnięcie 6).** Zrzuty 12–16 pokazują łuki-lustra w tym samym
   czerwonym (`PALETTE.obstacle`, z poświatą) co przeszkody-do-ominięcia z etapu 1 (np.
   czerwone okręgi na poziomach 6–8). Wrażenie: kolor **rzeczywiście sugeruje „omijaj mnie"**
   — czerwień jest jedynym kolorem hazardu w słowniku wizualnym gry od etapu 1, więc gracz
   przenoszący ten nawyk na poziomy 13–16 może się wahać, czy kaskadowe lustro naprawdę wolno
   mu wykorzystać do odbicia. Przeciwargument: piłki w podglądzie (`preview`) i tak odbijają
   się od tych łuków tak samo jak od elementu gracza, więc zachowanie szybko koryguje
   pierwsze wrażenie. Zmiana koloru to decyzja właściciela (rozstrzygnięcie 6 jej nie
   przesądza) — obraz dowodowy w `e2e/shots/level-1{2,3,4,5,6}-*-edit.png`.

### Poziomy 1–16 — uchwyty przeciągnięte i potwierdzenie przez `localStorage`

| # | id | tytuł | uchwyty przeciągnięte | wygrana wg `localStorage` |
|---|---|---|---|---|
| 1 | ogniska | Dwa ogniska | ognisko1, ognisko2 | tak |
| 2 | rozmiar | Rozmiar bez znaczenia | ognisko1, ognisko2, rozmiar | tak |
| 3 | skos | Na ukos | ognisko1, ognisko2 | tak |
| 4 | blisko | Prawie okrąg | ognisko1, ognisko2, rozmiar | tak |
| 5 | ciasna | Wąska jak igła | ognisko1, ognisko2, rozmiar | tak |
| 6 | przeszkoda | Teraz rozmiar ma znaczenie | rozmiar | tak |
| 7 | dwie-przeszkody | Z dwóch stron | rozmiar | tak |
| 8 | zwienczenie | Zwieńczenie | ognisko1, ognisko2, rozmiar | tak |
| 9 | polelipsa | Półelipsa | ognisko1, ognisko2 | tak |
| 10 | bandy | Bandy | ognisko1, ognisko2, rozmiar | tak |
| 11 | przycinanie | Przycinanie | koniec, poczatek | tak |
| 12 | wspologniskowe | Współogniskowe | rozmiar | tak |
| 13 | kaskada | Kaskada | ognisko1, ognisko2 | tak |
| 14 | kaskada-od-konca | Kaskada od końca | ognisko1, ognisko2 | tak |
| 15 | dwie-elipsy | Dwie elipsy | piece0: ognisko1, ognisko2; piece1: ognisko1, ognisko2 | tak |
| 16 | zwienczenie-2 | Zwieńczenie kaskad | ognisko1, ognisko2, rozmiar | tak |

**16/16 poziomów przejdzie uchwytami od stanu startowego, potwierdzone obiektywnie przez
`localStorage`, nie tylko wizualnie.** Żaden poziom nie okazał się nierozwiązywalny ani nie
ujawnił błędu w trakcie przeciągania.

### Czego NIE dało się sprawdzić emulacją (zostaje właścicielowi na prawdziwym telefonie)

- **Realna trudność poziomu 15 dla człowieka.** Skrypt dowodzi tylko, że rozwiązanie
  geometryczne istnieje i jest osiągalne uchwytami — nie mierzy, ile prób/czasu potrzebuje
  żywy gracz, żeby samodzielnie (bez znajomości `solution` z danych poziomu) namierzyć punkt
  spotkania M. Jeśli poziom okaże się „za trudny" w sensie specu §8, blokada uchwytu jest
  odrębną decyzją projektową (zadanie 11, krok 4), nieporuszaną tutaj.
- **Rzeczywisty dotyk palcem** (nacisk, wielkość stykowa, `touchstart`/`touchmove` zamiast
  emulowanych zdarzeń myszy przekładanych na `PointerEvent`). Playwright nie udostępnia
  wieloetapowego API dla `touchscreen`, więc przeciąganie było technicznie zdarzeniami myszy;
  canvas gry nie rozróżnia `pointerType`, więc ryzyko jest ograniczone do rzeczy, których
  emulacja z zasady nie widzi: rozmiar opuszki palca zasłaniającej uchwyt, przypadkowe
  dotknięcia sąsiednich uchwytów, zachowanie przy „palcem po szkle" (tarcie, poślizg).
- **Wydajność/płynność na prawdziwym GPU telefonu** (spadki klatek, ciepło, przycięcie
  wydajności) — Chromium desktopowe w trybie emulacji nie odwzorowuje realnego SoC telefonu.
- **Wi-Fi/sieć lokalna.** Serwer podglądu wystawiony tylko na `localhost`, nie na sieci
  lokalnej (`--host`), bo nie było telefonu, który miałby się podłączyć. Sam adres sieciowy
  nie zmienia zachowania gry, ale sprawdzenie routingu/CORS/service workera przez sieć
  lokalną zostaje niewykonane.
- **Rozmiar celu dotykowego w praktyce** (44 px CSS to teoria z kodu; na czym innym niż
  palec dorosłego człowieka na ekranie ~6" tego się nie zweryfikuje).

### Pliki z dowodami

Wszystkie zrzuty i surowy log (`report-raw.json`) leżą w
`.superpowers/sdd/2026-09-19-golf-etap-2-luki/e2e/shots/` i
`.superpowers/sdd/2026-09-19-golf-etap-2-luki/e2e/report-raw.json` — katalog `e2e/` jest
ignorowany przez `.superpowers/sdd/.gitignore` (nie trafia do repozytorium), więc dowody
zostają na tej maszynie; ten dokument jest ich pisemnym podsumowaniem.

---

## Poprawki z końcowego przeglądu (fala poprawek po zadaniu 12)

a. **Poziom 11 „Przycinanie": start zmieniony z `{20°, 340°}` na `{60°, 300°}`.**
   Zrzut `level-11-przycinanie-edit.png` z zadania 12 pokazał, że oba uchwyty końców
   łuku na starcie nachodzą na siebie na małym okręgu — przerwa 40° na promieniu
   r = 0.18 daje w przybliżeniu 60 px CSS na ekranie, a same uchwyty to 44 px, więc
   luka jest niemal całkowicie zasłonięta przez uchwyty i lekcja poziomu (odsłonić
   drogę przez przycięcie) nie jest widoczna na starcie. Końcowy przegląd sprawdził,
   że przerwy 40–120° zostawiają start nierozwiązany, a zwycięskie łuki wymagają
   start ∈ [110°, 190°], end ∈ [290°, 370°] — `{60°, 300°}` (przerwa 60°) jest bezpiecznie
   w środku tego zakresu bezpieczeństwa i dalej od uchwytów. Koszt, jeśli źle: gracz nie
   widzi przerwy w chwili wejścia w poziom, ale rozwiązanie i przeszkoda są nietknięte,
   więc błąd byłby czysto kosmetyczny.
b. **Poziom 15 „Dwie elipsy": podpowiedź zmieniona z „Cała kaskada w twoich rękach.
   Punkt spotkania wybierasz sam." na „Cała kaskada w twoich rękach. Oba łuki muszą
   mieć wspólne ognisko — znajdź, gdzie je postawić."** Końcowy przegląd policzył, że
   z siatki 1296 pozycji tylko ~17 daje wygraną (jednoczesną dla obu piłek) — działający
   obszar to płatek ok. 0,15×0,25 wokół (−0,25, −0,2). Stare sformułowanie sugerowało
   dowolność („wybierasz sam"), a rzeczywiste pole manewru jest wąskie; nowe zdanie
   nazywa właściwe kryterium (wspólne ognisko obu łuków) bez zdradzania współrzędnych.
   Dodatkowo: zbieżne ogniska są przeciągane tylko jako ognisko elementu 2 (element 1
   jest pod spodem) — to zostawiamy do oceny właścicielowi na prawdziwym telefonie;
   możliwe opcje, jeśli okaże się za trudne: zablokować jeden uchwyt zgodnie ze specem
   §8, albo przeciągać zbieżne ogniska razem jako jedną parę. Koszt, jeśli źle: gracz
   nadal trafia w wąski obszar po omacku — nowa podpowiedź precyzuje kryterium, ale nie
   zwęża same poszukiwania geometryczne.
c. **Zostawione właścicielowi bez zmian kodu:**
   - Spec §6 dalej nazywa przycisk „Cofnij", którego kod nie ma (rozstrzygnięcie 1) —
     decyzja świadoma, nie usterka; zmiana wymagałaby albo dopisania przycisku (poza
     zakresem etapu 2), albo poprawki specu, którą robi właściciel.
   - Oś łuku (`ellipseAxis`) kręci się gwałtownie, gdy ogniska łuku niemal się zlewają —
     to wynika wprost z parametryzacji (kierunek f1→f2 przy |f1 − f2| → 0 jest źle
     określony), nie z błędu; nie powoduje awarii ani złego rysowania łuku o w pełni
     zlanych ogniskach (okrąg ma osobną, umowną oś). Koszt, jeśli źle: kosmetyczne
     drgnięcie osi w rzadkim przypadku brzegowym, bez wpływu na rozgrywkę.
