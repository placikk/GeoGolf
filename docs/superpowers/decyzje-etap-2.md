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

---

## Poprawki po etapie 2 (spec `2026-09-19-golf-etap-2-poprawki-design.md`)

Pięć poprawek zgłoszonych przez właściciela po przejściu etapu 2 (zadania 1–4 planu
`2026-09-19-golf-etap-2-poprawki`), sprawdzone ręcznie w zadaniu 5 tą samą metodą co
zadanie 12 wyżej: Playwright (Chromium, emulacja `devices["iPhone 12"]`, dotyk włączony)
na `npm run build` + `vite preview`, bez zmian w kodzie gry. Skrypty i zrzuty leżą w
`.superpowers/sdd/2026-09-19-golf-etap-2-poprawki/e2e/` (katalog ignorowany przez git,
poza repozytorium — ten dokument jest ich pisemnym podsumowaniem). Nowość względem
zadania 12: dowód uruchamiany jest przez `page.clock` (fastForward w krokach ~1000 ms,
każdy odpowiada jednej klatce `requestAnimationFrame` z `dt` przyciętym w `screens.ts`
do 0,05 s) zamiast czekania w czasie rzeczywistym — 900 takich kroków daje 45 s
symulowanego czasu w ułamku sekundy realnego, z zapasem ponad bezpiecznik
`maxLength=40` z `core/trace.ts`.

### Rozstrzygnięcia

1. **Ściana stoi na brzegu planszy `[-1,1]²`, nie na brzegu ekranu** (decyzja
   właściciela, §2 specu). Pomiar w zadaniu 5: wszystkich 16 poziomów nadal daje się
   wygrać uchwytami od stanu startowego po dodaniu ścian — bez zmian względem stanu
   sprzed poprawki. Koszt, jeśli źle: fizyka poziomu przestaje zależeć od urządzenia
   (dobrze), ale gdyby jakiś przyszły poziom miał celowo polegać na tym, że piłka
   opuszcza planszę i przepada (`boundsExit`), taki poziom przestałby działać zgodnie
   z zamysłem — trzeba by go przeprojektować pod ścianę zamiast pod ucieczkę piłki.
2. **„Jeszcze raz" zachowuje ustawienie elementów** po wygranej, po porażce i przy
   dotknięciu ekranu w trakcie animacji dowodu — wraca do fazy edycji z `pieces` bez
   zmian, nie do stanu startowego. Pełny reset zostaje tam, gdzie był: pod kafelkiem
   tego samego poziomu w menu (`goTo` → `newGame`). Koszt, jeśli źle: gracz, który
   chciał świadomie zacząć od zera po nieudanej próbie, musi pamiętać, że jedyna
   droga to menu i ten sam kafelek — dotknięcie ekranu go tam NIE zaprowadzi; jeśli to
   zaskoczenie okaże się częste, brakuje osobnego, oczywistego przycisku „reset".
3. **Ostatni poziom (16): prawy przycisk to „Menu" z podsumowaniem**, nie „Następny".
   Zawijanie „Następny" z poziomu 16 z powrotem na poziom 1 zniknęło — na ostatnim
   poziomie nie ma już żadnego przycisku, który cichcem zaczynałby od nowa. Koszt,
   jeśli źle: gracz, który wcześniej przyzwyczaił się, że „Następny" na poziomie 16
   zapętla się na poziom 1, traci ten skrót i musi przejść przez menu — dodatkowe
   dotknięcie, nie utrata funkcji (poziom 1 nadal jest pierwszym kafelkiem).
4. **Poziom 12: okrąg `(0, −0.5)`, promień `0.25`**, rozwiązanie `a = 0.52` (pasmo
   zmierzone ze ścianami z §2: `a ∈ [0.455, 0.59]`, nic powyżej aż do `a = 3`). Stary
   okrąg (`r = 0.1`) przepuszczał osiem piłek obok siebie i nie wymuszał rozmiaru.
   Koszt, jeśli źle: gdyby nowy okrąg okazał się za duży (zbyt wąskie albo puste
   pasmo zwycięskie), poziom stałby się nierozwiązywalny albo frustrująco precyzyjny
   na telefonie — wymagałoby to ponownego pomiaru pasma i kolejnej korekty promienia
   albo pozycji okręgu, tak jak poprzednio z `r = 0.1`.
5. **Zablokowany rozmiar naprawdę stoi — odwołuje rozstrzygnięcie 3 z
   `decyzje-etap-1.md`.** Tamto rozstrzygnięcie pozwalało `applyDrag` podnosić `a`
   zawsze, gdy ogniska rozjadą się dalej niż `2a` (żeby elipsa dała się skonstruować).
   Efekt uboczny: na poziomach z zablokowanym rozmiarem (13, 15) gracz mógł rozsunąć
   ogniska szeroko, zsunąć je z powrotem na piłkę i dołek i zostać z dużą, w pełni
   działającą elipsą — rozmiar był zablokowany tylko na pokaz. Teraz, gdy uchwyt
   `rozmiar` jest zablokowany, `a` tego elementu nigdy się nie zmienia; przeciągane
   ognisko zatrzymuje się na granicy `2a − 2·MIN_GAP` od drugiego ogniska. Poziomy 13
   i 15 (piłka–dołek dalej niż `2a`) stają się przez to geometrycznie niemożliwe do
   przejścia jedną elipsą, bez żadnych nowych przeszkód w danych. Koszt, jeśli źle:
   na poziomach 13 i 15 jedno ognisko nie da się dociągnąć do celu w jednym geście,
   gdy drugie ognisko tej samej pary stoi jeszcze daleko. Zmierzone przy końcowym
   przeglądzie: na poziomach 13, 14 i elemencie 1 poziomu 15 rozwiązanie wychodzi
   w 2 przeciągnięciach przy właściwej kolejności ognisk (3 przy odwrotnej), element
   2 poziomu 15 potrzebuje 3 — NIGDY małych kroków; wynik zależy wyłącznie od
   końcowej pozycji palca, nie od drogi, którą do niej doszedł. Końcowy przegląd
   zaleca zostawić twardy zacisk bez zmian — ciągnięcie drugiego ogniska razem z
   pierwszym po cichu przesuwałoby ognisko, które gracz już wcześniej trafił
   przyskokiem. Jeśli poziom 15 na prawdziwym telefonie i tak wyda się sztywny,
   najtańszą poprawką jest przesunięcie stanu startowego elementu 2 tego poziomu,
   nie zmiana zacisku.

### Wynik ręcznego sprawdzenia — zadanie 5 (Playwright, poprawki po etapie 2)

1. **Ramka planszy.** Widoczna na poziomie 1 i na poziomie 16 w stanie startowym —
   cienki czerwony obrys kwadratu `[-1,1]²` wokół elementów gracza, spójny z kolorem
   stałych kształtów. Na poziomie 8 podgląd (dwie blade piłki, faza edycji) pokazuje
   tor odbity od dolnej krawędzi ramki (piłka startuje w `(-0.6, -0.55)`, zygzak w
   zrzucie to odbicie o ścianę, nie usterka renderowania).
   Zrzuty: `e2e/shots/check1-level01-start-frame.png`,
   `e2e/shots/check1-level16-start-frame.png`, `e2e/shots/check1-level08-start-preview.png`.
2. **Poziom 13 „Kaskada": zablokowany rozmiar rzeczywiście ogranicza ognisko.**
   Próba rozciągnięcia ogniska 2 w róg ekranu (dystans żądany ≈ 1,8 jednostki) kończy
   się na granicy `2a − 2·MIN_GAP = 0,798` od ogniska 1 — łuk zostaje cienkim,
   mocno wydłużonym sierpem zamiast urosnąć (zmierzone i potwierdzone wizualnie:
   ognisko zatrzymuje się w punkcie `(0.264, 1.014)` zamiast w celu `(1.068, 1.819)`).
   Osobno: nawet po ustawieniu ogniska 1 dokładnie na piłce, ognisko 2 ciągnięte w
   stronę dołka (odległość piłka–dołek `1,1` > zasięg `0,798`) zatrzymuje się w
   `(0.198, 0.1)`, wyraźnie przed dołkiem `(0.5, 0.1)` — próba kończy się porażką
   (`localStorage` bez `"kaskada"` w `solved`).
   Zrzuty: `e2e/shots/check2a-kaskada-before-stretch.png`,
   `e2e/shots/check2a-kaskada-after-stretch.png`, `e2e/shots/check2b-2-f1-at-ball.png`,
   `e2e/shots/check2b-3-f2-stopped-short-of-hole.png`,
   `e2e/shots/check2b-4-result.png` (stan po „Sprawdź" — porażka).
3. **Poziom 12: `a ≈ 0.9` przegrywa, `a = 0.52` wygrywa.** Stan startowy poziomu
   (`a = 0.9`, uchwyty nietknięte) uruchomiony wprost przez „Sprawdź" daje porażkę
   („Chybiło 2 z 8"). Po przeciągnięciu uchwytu rozmiaru do `a = 0.52` (rozwiązanie)
   ten sam poziom wygrywa („Wpadły wszystkie"), potwierdzone przez `localStorage`.
   Zrzuty: `e2e/shots/check3-a09-result.png`, `e2e/shots/check3-a052-result.png`.
4. **„Jeszcze raz" zachowuje ustawienie — po wygranej i po porażce.** Poziom 2
   „Rozmiar bez znaczenia" rozwiązany uchwytami, wygrany, potem „Jeszcze raz": ekran
   edycji po powrocie jest pikselowo taki sam jak tuż przed „Sprawdź" (ta sama elipsa,
   ten sam rozmiar) — nie stan startowy. Poziom 12 z celowo złym, rozpoznawalnym
   rozmiarem (`a = 1.5`, różnym od startowego `a = 0.9`) przegrany, potem dotknięcie
   ekranu (nie osobny przycisk — w fazie porażki każde dotknięcie poza przyciskiem
   menu wraca do edycji): ten sam zły rozmiar `a = 1.5` zostaje, nie wraca do `a = 0.9`.
   Zrzuty: `e2e/shots/check4a-win-before-edit.png` / `check4a-win-after-retry.png`,
   `e2e/shots/check4b-lose-before-edit.png` / `check4b-lose-after-retry.png`.
5. **Poziom 16 (ostatni): „Menu" i podsumowanie.** Ze świeżym postępem (tylko poziom
   16 zaliczony po tej wygranej) baner ma dopisek „To był ostatni poziom.", prawy
   przycisk „Menu"; dotknięcie „Menu" otwiera siatkę 16 kafelków z poziomem 16
   podświetlonym i zaznaczonym „✓". Z postępem ustawionym tak, że pozostałych 15
   poziomów jest już zaliczonych (`localStorage` przed wczytaniem), ta sama wygrana
   daje dopisek „Wszystkie poziomy ukończone.".
   Zrzuty: `e2e/shots/check5a-last-level-not-all-solved.png`,
   `e2e/shots/check5a-menu-opened.png`, `e2e/shots/check5b-all-solved-banner.png`.
6. **Wszystkie 16 poziomów nadal daje się wygrać uchwytami od stanu startowego**, ze
   ścianami i z naprawioną blokadą rozmiaru — potwierdzone przez `localStorage`
   (`golf-geometryczny/postep`), nie tylko wizualnie. Jedna usterka techniczna po
   drodze (bez znaczenia dla gry): naiwny skrypt, który przeciąga oba ogniska
   zablokowanego rozmiaru w jednym geście na sztywno wyliczone współrzędne
   rozwiązania, może dla poziomu „Dwie elipsy" trafić w granicę `2a − 2·MIN_GAP`
   opisaną w punkcie 5 wyżej (bo drugie ognisko tej samej pary jeszcze stoi w
   pozycji startowej) i wylądować blisko, ale nie dokładnie na rozwiązaniu — poziom
   ma wyjątkowo wąskie pasmo zwycięskie (~17 z 1296 pozycji siatki, patrz „Poprawki z
   końcowego przeglądu" wyżej), więc „blisko" nie wystarcza. Naprawione w skrypcie
   (naprzemienne rundy ognisko1/ognisko2, zbiega do dokładnego rozwiązania w 3
   krokach) — to niedokładność narzędzia testowego, nie błąd gry; potwierdza to
   test `tests/levels.test.ts` („poziom %s: zapisane rozwiązanie faktycznie
   rozwiązuje"), który dla tego poziomu jest zielony przy pełnej precyzji silnika.
   Wynik końcowy: 16/16 wygranych.

   | # | id | tytuł | wygrana wg `localStorage` |
   |---|---|---|---|
   | 1 | ogniska | Dwa ogniska | tak |
   | 2 | rozmiar | Rozmiar bez znaczenia | tak |
   | 3 | skos | Na ukos | tak |
   | 4 | blisko | Prawie okrąg | tak |
   | 5 | ciasna | Wąska jak igła | tak |
   | 6 | przeszkoda | Teraz rozmiar ma znaczenie | tak |
   | 7 | dwie-przeszkody | Z dwóch stron | tak |
   | 8 | zwienczenie | Zwieńczenie | tak |
   | 9 | polelipsa | Półelipsa | tak |
   | 10 | bandy | Bandy | tak |
   | 11 | przycinanie | Przycinanie | tak |
   | 12 | wspologniskowe | Współogniskowe | tak |
   | 13 | kaskada | Kaskada | tak |
   | 14 | kaskada-od-konca | Kaskada od końca | tak |
   | 15 | dwie-elipsy | Dwie elipsy | tak |
   | 16 | zwienczenie-2 | Zwieńczenie kaskad | tak |

   Zrzuty stanu edycji tuż przed „Sprawdź" dla poziomów brzegowych (1 i 16):
   `e2e/shots/check6-level-01-ogniska-edit-solved.png`,
   `e2e/shots/check6-level-16-zwienczenie-2-edit-solved.png`. Surowy wynik:
   `e2e/check6-results.json`.

### Czego nie dało się sprawdzić emulacją (checklista właściciela)

Te same ograniczenia co w zadaniu 12 wyżej (Playwright na desktopowym Chromium,
gesty myszy zamiast wieloetapowego dotyku, serwer tylko na `localhost`) dotyczą też
tego sprawdzenia — patrz sekcja „Czego NIE dało się sprawdzić emulacją" wyżej. Dodatkowo
tutaj: usunięcie zawijania „Następny" na ostatnim poziomie i tekst podsumowania są
mechaniczne i bez ryzyka dotykowego; przycięcie ogniska przy zablokowanym rozmiarze
(punkt 2 checklisty) opiera się na tej samej matematyce co przyskok — rzeczywiste
starcie palca z granicą `2a − 2·MIN_GAP` (a nie z samym uchwytem) zostaje do oceny na
prawdziwym telefonie.

---

## Łuk opisany długością i miejsce na napisy (spec `2026-09-19-golf-luk-dlugoscia-i-uklad-design.md`)

Plan `2026-09-19-golf-luk-dlugoscia-i-uklad` (branch `poprawki-etap-2`, start `197ec9c`),
zadania 1–4: model łuku opisanego długością zamiast kątem (`ArcRange {mid, length}` w
`src/levels/types.ts`, przeliczanie w `src/levels/arc.ts`), uchwyty końców łuku na
długości (`src/ui/handles.ts`), kamera z pasem na napisy (`playArea` w `src/ui/menu.ts`,
`makeCamera` w `src/render/camera.ts`) i to sprawdzenie w przeglądarce. Ten spec
**zastępuje §6 specu poprawek etapu 2** — patrz rozstrzygnięcie 5 sekcji „Poprawki po
etapie 2" wyżej („zablokowany rozmiar naprawdę stoi"): tamto rozstrzygnięcie już nie
obowiązuje w tej formie, zobacz punkt 1 niżej.

### Rozstrzygnięcia planu

1. **Łuk opisany długością zamiast zakresem kąta — decyzja właściciela.** Pomiar przed
   decyzją: z łukiem o stałej DŁUGOŚCI jedna elipsa przez piłkę i dołek nie wygrywa na
   żadnym z poziomów 13–16 dla `a ∈ [0.56, 3]` (krok 0,04); z łukiem opisanym KĄTEM (stary
   model) ta sama próba wygrywała na poziomach 13 i 15 dla `a ≈ 0,8–1,04`. To **zastępuje
   punkt 5 sekcji „Poprawki po etapie 2"** („zablokowany rozmiar naprawdę stoi" — twardy
   zacisk odległości ognisk `2a − 2·MIN_GAP`): ognisk znowu **nic nie ogranicza**
   (`applyDrag` bez `sizeLocked`), rozmiar rośnie, gdy ogniska się rozjadą, także przy
   zablokowanym uchwycie „rozmiar" — dokładnie jak w etapie 1 (rozstrzygnięcie 3
   `decyzje-etap-1.md`, oznaczone tam jako **PRZYWRÓCONE**). Kaskad nie da się przejść
   jedną dużą elipsą nie dlatego, że ogniska nie mogą się rozjechać, tylko dlatego, że
   łuk o stałej długości obejmuje coraz mniejszy kawałek rosnącej elipsy. Koszt, jeśli
   źle: gdyby jednak jakiś przyszły poziom kaskadowy dało się przejść jedną elipsą mimo
   stałej długości łuku (np. przy bardzo dużym `a`, poza zmierzonym zakresem `[0,56; 3]`),
   trzeba by albo skrócić łuk gracza, albo dodać osobne ograniczenie — zmierzone pasmo
   pokrywa z dużym zapasem sensowne rozmiary elipsy na planszy `[-1,1]²` (przekątna
   `2√2 ≈ 2,83`).
2. **`mid` w `ArcRange` to parametr POŁOWY DŁUGOŚCI łuku**, licznony numerycznie (tablica
   skumulowanej długości, 512 próbek na obwód — `src/levels/arc.ts`). Łuk dłuższy niż
   `obwód − MIN_ARC_LENGTH` jest przy przeliczaniu przycinany, `MIN_ARC_LENGTH = 0,05`
   jednostki świata (zastępuje dawne `MIN_ARC = 10°`) — dzięki temu zawsze zostaje
   przerwa i końce łuku się nie zlewają, niezależnie od rozmiaru elipsy. Koszt, jeśli
   źle: przy bardzo małej elipsie (mały obwód) przycięcie mogłoby być widoczne jako
   nagła zmiana długości łuku przy skrajnym przeciąganiu rozmiaru — żaden obecny poziom
   tego nie robi (sprawdzają to testy poziomów).
3. **Poziom 12 „Współogniskowe": łuk gracza dostał 5° zakładki przy obu wierzchołkach**
   (`Math.PI − deg(5)` do `2π + deg(5)`, zamiast dokładnie połowy elipsy) — bez zakładki
   rozwiązanie nie znosiło testu odporności (skrócenie łuku o `0,02` z każdej strony).
   Zmierzone pasmo rozmiaru (ze ścianami z planu poprawek etapu 2, krok `0,005`):
   `a ∈ [0,455; 0,59]`, z wąską **dziurą przy `0,53–0,54`** — tam piłka odbita od
   górnego stałego łuku przecina koniec łuku gracza; to prawdziwa geometria tej
   wielkości elipsy, nie błąd pomiaru czy błąd gry. Nic nie wygrywa powyżej dziury aż do
   `a = 3`. **Poziom 16 „Zwieńczenie kaskad"**: pasmo `a ∈ [0,375; 0,44]` z **pojedynczą
   dziurą przy `0,385`** (ta sama przyczyna: kolizja z inną stałą krzywą przy tej
   konkretnej wielkości), rozwiązanie `a = 0,41` daleko od dziury po obu stronach. Koszt,
   jeśli źle: gracz trafiający uchwytem rozmiaru dokładnie w dziurę dostanie porażkę mimo
   pozornie dobrego ustawienia — dziury są wąskie (setne części `a`) względem promienia
   chwytu uchwytu (33 px), więc trafienie w nie przypadkiem jest mało prawdopodobne.
4. **Test odporności na krawędź łuku skraca łuk o `0,02` jednostki DŁUGOŚCI z każdej
   strony** (zamiast dawnego 1° parametru kąta — na elipsie `a ≈ 1` to było ok. 0,017
   jednostki, więc nowa miara jest w tej samej skali, tylko teraz spójna z modelem
   długości). Wszystkie 16 poziomów znosi to skrócenie. Koszt, jeśli źle: `0,02`
   jednostki to inna wartość liczbowa niż stary 1° na różnych rozmiarach elipsy (na
   bardzo małej elipsie względnie większy kawałek, na bardzo dużej względnie mniejszy)
   — ale to i tak jest bardziej spójna miara „ile gracz może się pomylić", bo dotyczy
   tego samego, co gracz faktycznie kontroluje (długość łuku), nie parametru
   matematycznego, którego gracz nie widzi.
5. **Plansza między banerem i przyciskami** (`makeCamera`/`playArea`): pas banera
   `TOP_BAND = 112` px CSS (numer poziomu, tytuł, podpowiedź do trzech linii — 70, 88,
   106 px — i przycisk menu), pas przycisków od `ACTION_BAND · h = 0,86 · h` (ten sam
   próg co dotknięcie „Sprawdź"). Kwadrat planszy `[-1,1]²` jest dopasowany i
   wyśrodkowany w pasie MIĘDZY nimi, z tym samym marginesem `0,06` co dotąd. W pionie na
   telefonie plansza prawie się nie zmienia (pas i tak jest wąski względem szerokości);
   w poziomie i na komputerze robi się mniejsza, ale nic jej nie przecina. Dotyk używa
   TEJ SAMEJ kamery (`toWorld`), więc trafianie w uchwyty nie rozjeżdża się z tym, co
   widać. Koszt, jeśli źle: przy bardzo niskim oknie (`area.bottom ≤ area.top`) kamera
   nie ma ochrony i policzy ujemną/zerową skalę — zostaje jako `minor (deferred)` w
   `progress.md`, żaden realny telefon/przeglądarka nie ma tak niskiego okna.

### Wpis z ledgera kontrolera (`progress.md`) dotyczący tego sprawdzenia

```
Task 3: Ruling: ⚠️ „czy baner mieści się w TOP_BAND = 112 w prawdziwej przeglądarce” —
  przenoszę do zadania 4 (Playwright) ze wskazaniem poziomu 15 (najdłuższa podpowiedź, do
  3 linii na 375 px) — vitest działa w node bez metryk fontów — koszt, jeśli źle: trzecia
  linia podpowiedzi styka się z ramką na wąskich telefonach
```

**Domknięte w zadaniu 4** (patrz pomiar niżej): przy pomiarze zadania 3 poziom 11 miał
najdłuższą podpowiedź; w międzyczasie (przegląd poziomu 15 przy innym zadaniu) treść
podpowiedzi poziomu 15 „Dwie elipsy" wydłużyła się do 94 znaków i to ONA jest teraz
najdłuższa (poziom 11: 83 znaki) — kontroler zlecający zadanie 4 wskazał wprost poziom 15
zamiast 11. Zmierzone (patrz niżej): podpowiedź poziomu 15 zawija się do **najwyżej 2
linii** na wszystkich czterech sprawdzonych szerokościach (nigdy do 3), z odstępem od
ramki co najmniej ok. 28 px nawet na najciaśniejszym z testowanych ekranów — obawa z
zadania 3 się nie potwierdziła.

### Wynik ręcznego sprawdzenia — zadanie 4 (Playwright)

**Metoda:** `npm run build` (23,05 kB / 9,19 kB gzip — budżet < 100 kB, margines duży),
`npx vite preview --port 4173 --strictPort`. Playwright 1.63 (Chromium z lokalnego
cache'u `~/.cache/ms-playwright`), zainstalowany lokalnie w
`.superpowers/sdd/2026-09-19-golf-luk-dlugoscia-i-uklad/e2e/` (katalog poza
repozytorium, ignorowany przez `.superpowers/sdd/.gitignore`), bez zmian w
`package.json` głównego projektu. Geometria uchwytów (dokąd i skąd przeciągać) jest
liczona NIEZALEŻNIE od działającej gry — `e2e/gen-plan.ts` importuje wprost
`src/levels` i `src/ui/handles` (te same funkcje co gra: `handlePositions`, `applyDrag`,
`arcParams`…) i symuluje każde przeciągnięcie tymi samymi wzorami, sprawdzając, że
symulacja trafia dokładnie w zapisane `solution`, zanim jakikolwiek krok trafi do
przeglądarki. Kolejność przeciągania ognisk (albo — dla poziomu „Dwie elipsy" — 40
naprzemiennych mikrokroków na ognisko) jest dobierana automatycznie tak, żeby po drodze
nie napompować `a` ponad wartość rozwiązania (bo `a` już nigdy się samo nie kurczy — patrz
rozstrzygnięcie 1 wyżej); bez tego naiwne przeciąganie „na wprost" psuje poziomy
kaskadowe (13, 14, obie części 15), co potwierdziła pierwsza, odrzucona wersja skryptu.
Serwer podglądu tylko na `localhost` (bez `--host`) — bez prawdziwego telefonu nie ma
czego wpinać do sieci lokalnej.

#### 1. Ramka planszy vs baner i napisy przycisków

Sprawdzone na `375×667`, `390×664`, `664×390`, `1280×720`, poziom 15 „Dwie elipsy"
(podpowiedź 94 znaki — dłuższa niż poziom 11, patrz wyżej) w edycji, plus ekran wygranej
(poziom 1) na `390×664`, `664×390`, `1280×720`. Odstępy liczone DWIE niezależne drogi: (a)
analitycznie z tych samych wzorów co gra (`TOP_BAND=112`, `ACTION_BAND=0,86`,
`margin=0,06`) — górna krawędź ramki to `cy − scale`, dolna `cy + scale`; (b) empirycznie
przez `ctx.measureText` NA PRAWDZIWYM `CanvasRenderingContext2D` strony (nie zgadywane) —
ten sam algorytm zawijania co `wrapByWords` w `src/ui/screens.ts`, wywołany z prawdziwym
`ctx.font` przeglądarki, żeby zmierzyć rzeczywisty dół ostatniej linii podpowiedzi
(`actualBoundingBoxDescent`) i górę/dół tekstu przycisku.

| ekran | linii podpowiedzi | dół podpowiedzi (px) | góra ramki (px) | odstęp góra (px) | góra przycisku (px) | dół ramki (px) | odstęp dół (px) |
|---|---|---|---|---|---|---|---|
| 375×667 | 2 | 92,0 | 177,8 | **85,8** | 607,3 | 507,8 | **99,5** |
| 390×664 | 2 | 92,0 | 169,9 | **77,9** | 604,5 | 513,1 | **91,4** |
| 664×390 | 2 | 92,0 | 125,4 | **33,4** | 349,7 | 322,0 | **27,7** |
| 1280×720 | 1 | 74,0 | 142,4 | **68,4** | 656,6 | 588,8 | **67,8** |

Wszystkie odstępy dodatnie (tekst nigdzie nie dotyka ramki), najciaśniej na `664×390`
(pozioma orientacja telefonu — ekran niski, więc `ACTION_BAND · h` i `TOP_BAND` biorą
proporcjonalnie większy kęs wysokości), ale wciąż z ok. 28–33 px zapasu. Podpowiedź
zawija się najwyżej do 2 linii (na `1280×720` mieści się w 1 linii). Zrzuty pełne i
przybliżone (kadr wokół górnej/dolnej krawędzi ramki, `deviceScaleFactor: 2` dla
ostrości): `e2e/shots/frame-check-{375x667,390x664,664x390,1280x720}-{full,zoom-top,
zoom-bottom}.png`. Ekran wygranej (baner „Wpadły wszystkie" + przyciski „Jeszcze
raz"/„Następny"): `e2e/shots/win-check-{390x664,664x390,1280x720}-{full,zoom-top,
zoom-bottom}.png` — wizualnie ramka wyraźnie oddzielona od obu pasów napisów na
wszystkich trzech rozmiarach.

#### 2. Poziom 13 „Kaskada": rozsunięcie ognisk i próba jednej elipsy

Rozciągnięcie ogniska2 (start `(0,15; 0,55)`) w róg planszy `(0,95; 0,95)`: ognisko jedzie
dokładnie za palcem, elipsa wyraźnie rośnie (widać na zrzucie „po" — oś przeciągnięta z
widoku), a łuk gracza (widoczny teal) zostaje tej samej DŁUGOŚCI — obejmuje wizualnie
mniejszy kawałek dużej elipsy, dokładnie jak przewiduje model. Zrzuty:
`e2e/shots/level13-before-stretch.png`, `e2e/shots/level13-after-stretch.png`.

Ustawienie obu ognisk wprost na piłce `(-0,6; 0,1)` i w dołku `(0,5; 0,1)` (przez
przyskok, bez celowania co do piksela): **NIE wygrywa** — wynik dowodu „Nie wszystkie.
Chybiło 7 z 8.”, `localStorage` bez `"kaskada"` w `solved`. Zrzuty:
`e2e/shots/level13-foci-on-ball-hole-edit.png`,
`e2e/shots/level13-foci-on-ball-hole-result.png`.

#### 3. Poziom 11 „Przycinanie": koniec łuku ślizga się po okręgu, nie znika

Niezależna symulacja (`e2e/debug4.ts`, też z prawdziwych `arcParams`/`applyDrag`) pokazuje
zacisk: dociąganie „koniec” (start w parametrze 300°) wstecz w stronę „poczatek” (60°) w
krokach `260° → 220° → 180° → 140° → 100° → 61° → 60° → 60°` skraca długość łuku
`0,754 → 0,628 → 0,503 → 0,377 → 0,251 → 0,126 → 0,050 → 0,050 → 0,050` jednostki —
zatrzymuje się DOKŁADNIE na `MIN_ARC_LENGTH = 0,05` i tam zostaje nawet gdy cel (`60°`,
czyli pozycja drugiego końca) jest powtórzony. To samo przeciągnięcie wykonane w
przeglądarce (nie tylko policzone): oba uchwyty końców łuku widać cały czas jako dwa
osobne pierścienie, nigdy się nie zlewają w jeden ani nie znikają — na przybliżeniu
(`e2e/shots/level11-clamp-zoom.png`) widać maleńki, ale WYRAŹNIE obecny łuk między nimi.
Zrzuty pośrednich kroków ślizgu: `e2e/shots/level11-slide-step{1..8}.png`, stan startowy:
`e2e/shots/level11-start.png`. (Osobno zmierzono też przeciwny kierunek — dociąganie
„koniec” w stronę WYDŁUŻENIA łuku — i ten zaciska się analogicznie na górnej granicy
`obwód − MIN_ARC_LENGTH = 1,081`, `e2e/debug3.ts` — nie jest to część checklisty, ale
potwierdza, że oba zaciski z rozstrzygnięcia 2 wyżej rzeczywiście działają.)

#### 4. Wszystkie 16 poziomów wygrane uchwytami od stanu startowego

Jedna sesja przeglądarki, `390×664`, poziomy w kolejności 1→16, `localStorage` czytany
PRZED i PO każdej próbie (sprawdzane, że dany identyfikator poziomu przybywa do
`solved` dopiero teraz, nie wcześniej):

| # | id | tytuł | uchwyty przeciągnięte | wygrana wg `localStorage` |
|---|---|---|---|---|
| 1 | ogniska | Dwa ogniska | ognisko1, ognisko2 | tak |
| 2 | rozmiar | Rozmiar bez znaczenia | ognisko1, ognisko2, rozmiar | tak |
| 3 | skos | Na ukos | ognisko1, ognisko2, rozmiar | tak |
| 4 | blisko | Prawie okrąg | ognisko1, ognisko2, rozmiar | tak |
| 5 | ciasna | Wąska jak igła | ognisko1, ognisko2, rozmiar | tak |
| 6 | przeszkoda | Teraz rozmiar ma znaczenie | ognisko1, ognisko2, rozmiar | tak |
| 7 | dwie-przeszkody | Z dwóch stron | ognisko1, ognisko2, rozmiar | tak |
| 8 | zwienczenie | Zwieńczenie | ognisko1, ognisko2, rozmiar | tak |
| 9 | polelipsa | Półelipsa | ognisko1, ognisko2 | tak |
| 10 | bandy | Bandy | ognisko1, ognisko2, rozmiar | tak |
| 11 | przycinanie | Przycinanie | koniec, poczatek | tak |
| 12 | wspologniskowe | Współogniskowe | rozmiar | tak |
| 13 | kaskada | Kaskada | ognisko2, ognisko1 | tak |
| 14 | kaskada-od-konca | Kaskada od końca | ognisko1, ognisko2 | tak |
| 15 | dwie-elipsy | Dwie elipsy | p0: ognisko2, ognisko1; p1: ognisko1↔ognisko2 (40 mikrokroków naprzemiennie) | tak |
| 16 | zwienczenie-2 | Zwieńczenie kaskad | ognisko1, ognisko2, rozmiar | tak |

**16/16.** Zrzuty stanu edycji i wyniku dla poziomów brzegowych/niestandardowych (1, 11,
13, 15, 16): `e2e/shots/level-{01,11,13,15,16}-*-{edit-start,edit-solved,result}.png`.
Surowe dane: `e2e/results.json`.

### Emulacja kontra prawdziwy telefon

**Sprawdzone emulacją (powyżej), z pewnością geometryczną** (bo droga przeciągnięcia jest
niezależnie symulowana tymi samymi wzorami co gra, nie zgadywana z piksela): wszystkie 16
poziomów rozwiązywalnych uchwytami; poziom 13 — rozciąganie ogniska i porażka przy
ogniskach wprost na piłce/dołku; poziom 11 — zacisk długości łuku w obu kierunkach;
ramka planszy nigdzie nie dotyka tekstu banera ani przycisków, na czterech rozmiarach
ekranu i w obu fazach (edycja z najdłuższą podpowiedzią, wygrana).

**Zostaje właścicielowi na prawdziwym telefonie** (te same ograniczenia co w zadaniach 12
i 5 wyżej — Playwright na desktopowym Chromium, gesty myszy zamiast wieloetapowego
dotyku `touchstart`/`touchmove`, serwer tylko na `localhost`, brak realnego GPU/SoC
telefonu):
- **Realna trudność poziomów dla żywego gracza bez podglądu `solution`** — zwłaszcza
  poziomu 15 „Dwie elipsy" (wąskie pole manewru, ~17 z 1296 pozycji siatki, patrz
  „Poprawki z końcowego przeglądu" wyżej) i przeciąganie zbieżnych ognisk dwóch
  elementów jedną warstwą (element 1 pod spodem) na poziomie 15 — obie te sprawy są
  już odnotowane wyżej jako czekające na ocenę właściciela.
- **Rzeczywisty rozmiar opuszki palca** przy uchwytach blisko siebie — dotyczy zwłaszcza
  poziomu 11 tuż po zaciśnięciu łuku na `MIN_ARC_LENGTH` (dwa uchwyty bardzo blisko
  siebie, patrz zrzut `level11-clamp-zoom.png`) i poziomu 15 (zbieżne ogniska).
- **Odstęp tekstu od ramki `27,7–99,5 px` w przeliczeniu CSS** — teoretycznie
  wystarczający zapas, ale rzeczywista czcionka systemowa telefonu (`system-ui`) może
  się nieznacznie różnić renderowaniem od czcionki Chromium na tej maszynie; różnica
  rzędu pojedynczych pikseli nie zagraża najciaśniejszemu zmierzonemu odstępowi
  (`27,7 px` na `664×390`), ale nie była mierzona na prawdziwym silniku renderowania
  tekstu telefonu.
- **Wydajność/płynność** na prawdziwym SoC telefonu (nie sprawdzana tu w ogóle — ten sam
  zastrzeżenie co w zadaniach 12 i 5).

## Poprawki po przeglądzie końcowym — łuk opisany długością

Recenzja planu `2026-09-19-golf-luk-dlugoscia-i-uklad` znalazła pułapkę w zachowaniu
z rozstrzygnięcia 1 wyżej („ognisk nic nie ogranicza”, PRZYWRÓCONE w `decyzje-etap-1.md`).

1. **Pułapka: zablokowany rozmiar, który tylko rośnie, może uwięzić gracza.** Na
   poziomach z zablokowanym uchwytem „rozmiar” (1, 9, 13, 14, 15) `a` rośnie, gdy gracz
   odciąga ognisko, i nigdy nie maleje samo z siebie — więc gracz, który po drodze do
   celu odciągnął ognisko dalej niż trzeba, zostaje z elipsą za dużą, żeby wygrać, a
   „Jeszcze raz” zostawia to ustawienie (nie cofa go). Zmierzone: poziom 15, element 0,
   nawet PROSTĄ drogą (ognisko1 od razu na cel) `a` wychodzi `0,5307` i przegrywa;
   OBJAZD przez róg planszy (typowy przy przeciąganiu palcem) więzi też poziomy 9, 13 i
   14. Maksymalne `a`, które jeszcze wygrywa (element z zablokowanym rozmiarem, reszta
   na rozwiązaniu): poziom 13 `0,4925`, poziom 14 `0,565`, poziom 15 element 0 `0,4925`,
   poziom 15 element 1 `0,565`, poziom 9 `0,8375`, poziom 1 `1,005` (powyżej — ściana
   planszy). Koszt, jeśli źle: gracz na tych pięciu poziomach mógłby utknąć bez żadnego
   sposobu na powrót poza „Menu” i wybranie poziomu od nowa.
2. **Naprawa: `a = max(a_start, c + MIN_GAP)` z blokadą.** `applyDrag` (`src/ui/handles.ts`)
   dostał opcjonalny parametr `lockedA` — wartość `a` ze startu poziomu, przekazywaną z
   `src/ui/screens.ts` tylko gdy `piece.locked.includes("rozmiar")`. Przy przeciąganiu
   ogniska nowe `a` to `Math.max(lockedA ?? next.a, c + MIN_GAP)` (`c` — połowa odległości
   ognisk): bez blokady zachowanie jest identyczne jak dotąd (nigdy nie maleje samo z
   siebie), z blokadą `a` WRACA do wartości poziomu, gdy ogniska znów się zejdą. To
   NIE otwiera z powrotem obejścia kaskad opisanego w rozstrzygnięciu 1 sekcji „Łuk
   opisany długością” wyżej: przy ogniskach dokładnie na piłce i dołku `a` i tak nie
   może zejść poniżej `c + MIN_GAP` (tu `0,551` dla geometrii poziomów 13–16) — a przy
   tym `a` żaden z poziomów 13–16 nie wygrywa jedną elipsą (sprawdzone testem kaskad,
   patrz punkt 3 niżej). Koszt, jeśli źle: gdyby jakiś przyszły poziom miał zablokowany
   rozmiar ORAZ start z `a` większym niż potrzeba, `lockedA` przywracałoby zbyt małą
   wartość — pilnuje tego test niezmiennika (`piece.start.a === piece.solution.a` dla
   zablokowanego rozmiaru, `tests/levels.test.ts`).
3. Zmienia zdanie z rozstrzygnięcia 1 sekcji „Łuk opisany długością”: „rozmiar rośnie
   także przy zablokowanym uchwycie” — teraz przy blokadzie rozmiar także WRACA, gdy
   ogniska się zejdą, nie tylko rośnie, gdy się rozjadą.
4. Test kaskad (`tests/levels.test.ts`) zaczyna sweep `a` od prawdziwej granicy
   konstruowalności (`dist(ball, hole)/2 + 1e-3`), nie od `0,56` — obejmuje też wąski,
   wcześniej nieprzetestowany zakres tuż nad granicą.
5. `cumulative` (`src/levels/arc.ts`) liczy `b` jako `Math.sqrt(Math.max(0, a*a - c*c))`
   — zacisk pod pierwiastkiem, żeby `a < c` w trakcie przeciągania dawało `0`, nie `NaN`.
6. Komentarz `TOP_BAND` (`src/ui/menu.ts`) mówi teraz, że podpowiedź na telefonach zajmuje
   do dwóch linii (zmierzone maksimum to 2), z zapasem na trzecią — bez zmiany wartości.

---

## Ustawienia, ramka i reset (spec `2026-09-19-golf-ustawienia-ramka-reset-design.md`)

Plan `2026-09-19-golf-ustawienia-ramka-reset` (branch `poprawki-etap-2`, start `6b4be10`),
zadania 1–4: menu ustawień z dwoma przełącznikami, zniknięcie zdania o ośmiu torach z
ekranu wygranej, stonowana ramka planszy z jaśniejszym tłem i mały przycięty wachlarz,
przycisk „Reset” w dolnym pasku. Zadanie 5 (ten wpis) to sprawdzenie w przeglądarce
(Playwright, tak jak w zadaniach 12 i 5 wyżej) i zapis rozstrzygnięć.

### Rozstrzygnięcia

1. **Menu ustawień z dwoma przełącznikami, oba domyślnie wyłączone** (decyzja
   właściciela) — „Tory podglądu” (`previewPaths`, blade tory dwóch piłek w edycji) i
   „Podpowiedzi” (`hints`, tekst podpowiedzi pod tytułem). Zapis pod osobnym kluczem
   `golf-geometryczny/ustawienia`, z tą samą odpornością co postęp (`src/ui/settings.ts`:
   brak pamięci, wyjątek przy odczycie/zapisie i uszkodzony JSON dają wartości domyślne,
   tylko jawne `true` włącza pole — więc częściowy albo zaśmiecony zapis nie włącza
   niczego przypadkiem). Pas banera (`TOP_BAND`) i pozycja planszy nie zależą od tego,
   czy podpowiedź jest widoczna, więc plansza nie „skacze” po przełączeniu. Koszt, jeśli
   źle: gdyby walidacja odczytu była luźniejsza (np. każde `truthy` zamiast `=== true`
   włączało ustawienie), uszkodzony zapis (np. `{"previewPaths":"tak"}` po ręcznej
   edycji `localStorage` albo błędzie serializacji) mógłby włączyć coś, czego gracz nie
   wybrał — obecna reguła to wyklucza.
2. **Zniknięcie zdania „Osiem torów, jedno miejsce…” z ekranu wygranej** (decyzja
   właściciela) — zostaje sam tytuł „Wpadły wszystkie”; dopisek pod tytułem istnieje
   TYLKO na ostatnim poziomie (`winLabels`, `src/ui/menu.ts`): „To był ostatni poziom.”
   albo, gdy wszystkie 16 poziomów ma już `solved`, „Wszystkie poziomy ukończone.” Na
   pozostałych poziomach pod tytułem nic. Ekran porażki bez zmian. Koszt, jeśli źle:
   gracz traci jedyne zdanie, które explicite tłumaczyło regułę „ta sama chwila” — jeśli
   się to okaże mylące, naprawą byłoby dopisanie krótszej wersji reguły do samych
   podpowiedzi poziomów, nie przywracanie starego zdania na banerze wygranej (ono
   dotyczyło geometrii ośmiu torów, a nie samej reguły synchronizacji).
3. **Ramka: stonowana linia (`PALETTE.frame`, ten sam odcień co `PALETTE.muted`) +
   jaśniejsze tło planszy (`PALETTE.board`), rogi zaokrąglone TYLKO w rysunku**
   (`FRAME_RADIUS = 6` px CSS, `boardFrame()` w `src/render/draw.ts`, poświata przez
   podwójny obrys — zakaz `shadowBlur` zachowany). Fizyka ścian bez zmian: cztery
   odcinki na brzegu kwadratu `[-1,1]²` z ostrymi narożnikami — 6 px różnicy w rogu jest
   niewidoczne dla gry (żaden tor piłki nie przechodzi tak blisko rogu, żeby to
   wykryć). Koszt, jeśli źle: gdyby jednak jakiś przyszły poziom miał tor odbijający się
   dokładnie w rogu planszy, zaokrąglenie tylko rysunkowe mogłoby wizualnie nie zgadzać
   się z punktem odbicia o te same kilka pikseli — żaden z obecnych 16 poziomów tego nie
   robi.
4. **Wachlarz: promień `0.4` jednostki świata (zamiast `3`) i przycięcie do planszy**
   (`SECTOR_REACH`, `sectorWedge()` woła `ctx.clip()` do prostokąta planszy PRZED
   wypełnieniem klina) — klin nigdy nie wychodzi za ramkę, niezależnie od rozmiaru
   elipsy na poziomie. Sprawdzone na poziomie 13 „Kaskada” (jedynym z zestawu 12–16,
   gdzie klin startuje blisko rogu piłki): `e2e/shots/04b-level13-kaskada-board-zoom.png`
   pokazuje mały, w całości wewnątrz ramki klin, nieprzecinający ani ramki, ani żadnej
   krzywej. Koszt, jeśli źle: mniejszy klin mniej sugeruje kierunek ośmiu torów niż
   stary promień `3` (który sam wychodził poza planszę) — to świadomy kompromis
   właściciela (mniejszy wachlarz w zamian za estetykę), nie usterka.
5. **Reset poziomu w dolnym pasku (lewa połowa), bez potwierdzenia** — dolny pas w
   edycji dzieli się na „Reset” (lewo, `newGame(game.level)` — pełny stan startowy,
   postęp i ustawienia bez zmian) i „Sprawdź” (prawo, bez zmian), ten sam układ co
   „Jeszcze raz | Następny” na ekranie wygranej (`editAction`, `src/ui/menu.ts`).
   Zachowany dotychczasowy bezpiecznik: `pointerup` sprawdza `wasDragging` PRZED
   `editAction`, więc puszczenie przeciąganego uchwytu w dolnym pasie nie uruchamia ani
   resetu, ani dowodu — element zostaje tam, gdzie spadł. Sprawdzone w zadaniu 5 (patrz
   niżej): zrzuty przed/po przeciągnięciu/po resecie są bitowo identyczne w obszarze
   krzywej gracza (ten sam ograniczający prostokąt tealowych pikseli, `count=398` w obu
   przypadkach), a puszczenie uchwytu wewnątrz pasa zostawia element dokładnie tam, gdzie
   spadł (bez skoku do startu, bez animacji dowodu). Koszt, jeśli źle: brak potwierdzenia
   oznacza, że przypadkowe dotknięcie „Reset” kasuje bieżącą pracę gracza nad
   ustawieniem elementów bez możliwości cofnięcia — świadomy wybór właściciela (poziom
   i tak zapamiętuje tylko `solved`, nie stan edycji, więc „strata” to co najwyżej kilka
   przeciągnięć do powtórzenia).

### Wyniki sprawdzenia — zadanie 5 (Playwright)

**Metoda:** `npm run build` (25,32 kB / 9,88 kB gzip — budżet < 100 kB, margines duży),
`npx vite preview --port 4173 --strictPort`. Playwright 1.63 (Chromium z lokalnego
cache'u `~/.cache/ms-playwright`), zainstalowany lokalnie w
`.superpowers/sdd/2026-09-19-golf-ustawienia-ramka-reset/e2e/` (poza repozytorium,
katalog ignorowany przez `.superpowers/sdd/.gitignore`; `package.json` główny projektu
nietknięty). Konteksty `390×664` i `664×390`, `hasTouch: true`, `isMobile: true` — Chromium
desktopowe generuje `PointerEvent` z gestów myszy, a canvas gry nie filtruje po
`pointerType` (to samo zastrzeżenie co w zadaniach 12 i 5 wyżej).

Współrzędne przycisków i uchwytów **liczone niezależnie, tymi samymi wzorami co gra**:
`cameraFor()`/`menuTileCenter()`/`settingsRowCenter()` w `e2e/run.mjs` replikują
`makeCamera`+`playArea` (`src/render/camera.ts`, `src/ui/menu.ts`) i `menuLayout`/
`settingsLayout`; plany przeciągnięć dla poziomów „Dwa ogniska” i „Zwieńczenie kaskad”
(`e2e/gen-plan.ts`) importują WPROST `src/levels`, `src/ui/handles`, żeby wyliczyć
dokładne cele (przyskok ogniska do piłki/dołka/ogniska stałej przeszkody, punkt na osi
wielkiej dający zadane `a`) i z góry sprawdziły w Node, że wynikowy stan jest bitowo
równy zapisanemu `solution` obu poziomów — dowód wygrywalności geometryczny, nie
"strzał w piksel". Dowód uruchamiany przez „Sprawdź” domykany przez `page.clock`
(`install()` + `fastForward(1500)` w pętli), nie przez czekanie w czasie rzeczywistym.

1. **Pierwsze uruchomienie: brak torów i brak podpowiedzi.** Świeży `localStorage`
   (bez ustawień): baner pokazuje tylko numer i tytuł poziomu, bez linii podpowiedzi;
   elipsa gracza bez bladych torów. Zrzuty: `e2e/shots/01-fresh-390x664.png`,
   `e2e/shots/01-fresh-664x390.png`.
2. **⚙ otwiera ustawienia; przełączanie i trwałość.** Otwarcie: oba wiersze „wył.”, bez
   obwódki (`02a`). Dotknięcie „Tory podglądu”: „wł.” + teal obwódka (`02b`). Dotknięcie
   „Podpowiedzi”: też „wł.” (`02c`), `localStorage["golf-geometryczny/ustawienia"]` =
   `{"previewPaths":true,"hints":true}`. Zamknięcie (⚙ ponownie): pod tytułem widoczna
   podpowiedź, na elipsie blade tory dwóch piłek (`02d`). Po `page.reload()`: identyczny
   widok — tory i podpowiedź zostają (`02e`), `localStorage` niezmieniony; otwarcie
   ustawień po przeładowaniu pokazuje oba wiersze dalej „wł.” (`02f`). Zrzuty:
   `e2e/shots/02{a,b,c,d,e,f}-*.png`.
3. **Ramka: stonowana linia, jaśniejsze tło, nic nie przecina napisów.** Zbliżenia na
   oba rogi ramki (górny lewy, dolny prawy), `390×664` i `664×390`: cienka
   szaroniebieska linia z łagodną poświatą, zaokrąglony róg, tło planszy wyraźnie
   jaśniejsze od tła ekranu; żaden zrzut (pełny ani zbliżenie) nie pokazuje ramki
   nachodzącej na tekst banera ani przycisków. Zrzuty:
   `e2e/shots/03-frame-{topleft,bottomright}-{390x664,664x390}.png`.
4. **Wachlarz (poziom 13 „Kaskada”):** klin widoczny od piłki w edycji, mały, w
   całości wewnątrz ramki, nieprzecinający żadnej krzywej ani brzegu planszy. Zrzuty:
   `e2e/shots/04a-level13-kaskada-edit.png`, `e2e/shots/04b-level13-kaskada-board-zoom.png`.
5. **Reset i bezpiecznik dolnego pasa.** Zrzut startowy `05a`; po przeciągnięciu
   ogniska w róg ekranu elipsa wyraźnie zdeformowana i wychodzi poza ramkę (`05b`); po
   dotknięciu „Reset” — piksel w piksel jak `05a` (`05c`) — potwierdzone też liczbowo:
   ograniczający prostokąt tealowych pikseli (krzywa + uchwyty) identyczny przed
   przeciągnięciem i po resecie (`{minX:84,minY:198,maxX:340,maxY:620,count:398}` w obu
   przypadkach), wyraźnie inny zaraz po przeciągnięciu (`count:329`, przesunięty
   prostokąt). „Sprawdź” dalej działa: rozwiązanie poziomu 1 przeciągnięciem obu ognisk
   (`05d`) kończy się banerem „Wpadły wszystkie” bez zdania o ośmiu torach (`05e`),
   `localStorage["golf-geometryczny/postep"]` zawiera `"ogniska"`. Bezpiecznik:
   przeciągnięcie ogniska w dół, w głąb dolnego paska, i puszczenie tam — element
   zostaje dokładnie w miejscu puszczenia (prostokąt tealowych pikseli sięga do
   `maxY≈630`, w okolicy paska), ekran dalej pokazuje „Reset | Sprawdź” (czyli edycję, a
   nie animację dowodu), i nic się dalej nie rusza w kolejne 400 ms
   (`bboxAfter`≈`bboxAfterWait`) — więc puszczenie w pasku NIE uruchomiło ani resetu
   (element nie wrócił na start), ani dowodu. Zrzuty:
   `e2e/shots/05{a,b,c,d,e,f}-*.png`.
6. **Ekran wygranej bez zdania o ośmiu torach.** Poziom 1: tylko „Wpadły wszystkie”,
   przyciski „Jeszcze raz | Następny” (`05e` wyżej). Poziom 16, rozwiązany
   przeciągnięciem ognisk do punktu M (przyskok) i dołka (przyskok) oraz uchwytu
   rozmiaru na wyliczony punkt osi wielkiej (dokładnie odtwarzający zapisane
   `solution` — sprawdzone w Node przed uruchomieniem przeglądarki): z resztą poziomów
   NIE zaliczoną dopisek „To był ostatni poziom.” i przycisk „Menu”
   (`06-not-all-level16-win-banner.png`); z resztą poziomów zaliczoną wcześniej (ustawione
   w `localStorage` przed wczytaniem) dopisek „Wszystkie poziomy ukończone.”
   (`06-all-solved-level16-win-banner.png`). Żaden z trzech banerów nie zawiera zdania
   „Osiem torów…”. Zrzuty solved-edit przed „Sprawdź”:
   `e2e/shots/06-{not-all,all-solved}-level16-solved-edit.png`.

### Emulacja kontra prawdziwy telefon

Te same ograniczenia co w zadaniach 12 i 5 wyżej (Chromium desktopowe, gesty myszy
zamiast wieloetapowego dotyku, serwer tylko na `localhost`, brak realnego GPU/SoC).
Dodatkowo dla tego zadania:
- **Rozmiar celu dotykowego wierszy ustawień i przycisku ⚙ w praktyce** — 44 px CSS to
  teoria z kodu (`settingsLayout`, `settingsButton`); czy palec dorosłego trafia w
  wiersz bez pudła obok sąsiedniego, i czy ⚙ nie myli się z ☰ na małym ekranie, zostaje
  do oceny na prawdziwym telefonie.
- **Czytelność ramki i mniejszego wachlarza na prawdziwym ekranie** — subiektywna ocena
  „stonowania” koloru i tego, czy klin `0.4` jednostki nadal czytelnie sugeruje kierunek
  ośmiu torów, zależy od jasności/kontrastu prawdziwego wyświetlacza, nie tylko od
  wartości RGB zmierzonych tu.
- **Przypadkowe trafienie w „Reset” zamiast „Sprawdź”** (i odwrotnie) kciukiem — dolna
  połowa/połowa paska to 50/50 szerokości ekranu, więc teoretycznie trudno pomylić, ale
  rzeczywista precyzja kciuka przy krawędzi środkowej kreski jest nieoceniana tutaj.
- **Emulacja dotyku a `pointerType`.** Playwright generuje zdarzenia myszy (Chromium
  tłumaczy je na `PointerEvent`), nie prawdziwe `touchstart`/`touchmove`; canvas gry nie
  rozróżnia `pointerType`, więc ryzyko ogranicza się do tego, czego emulacja z zasady
  nie widzi (nacisk, wielkość stykowa, poślizg palca po szkle) — to samo zastrzeżenie co
  w zadaniach 12 i 5.

### Pliki z dowodami

Skrypty (`gen-plan.ts`, `run.mjs`), wygenerowany plan (`plan.json`), surowy wynik
(`results.json`) i wszystkie zrzuty leżą w
`.superpowers/sdd/2026-09-19-golf-ustawienia-ramka-reset/e2e/` — katalog ignorowany przez
`.superpowers/sdd/.gitignore` (nie trafia do repozytorium), więc dowody zostają na tej
maszynie; ten dokument jest ich pisemnym podsumowaniem.
