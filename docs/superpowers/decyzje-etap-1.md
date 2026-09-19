# Decyzje podjęte bez pytania — etap 1

Ten dokument spisuje wszystkie rozstrzygnięcia, które kontroler podjął samodzielnie
w trakcie realizacji etapu 1, zamiast zatrzymywać pracę i pytać. Każde ma uzasadnienie
i — tam, gdzie to miało sens — koszt na wypadek, gdyby było błędne.

Powstał, bo te decyzje zapadły w katalogu roboczym, który jest tymczasowy. Bez tego
pliku zniknęłyby razem z nim, a są to jedyne miejsca, w których ktoś inny niż kontroler
mógł mieć inne zdanie.

Dwa z nich zostały **odwołane** — jedno przez pomiar implementera, jedno przez recenzenta.
Oba zostawiam w wykazie razem z tym, co je obaliło.

---

## 1. praca na gałęzi `etap-1-rdzen` w katalogu projektu zamiast w worktree —

```
Ruling: praca na gałęzi `etap-1-rdzen` w katalogu projektu zamiast w worktree —
  repozytorium jest nowe, nie ma równoległych prac, a katalog użytkownika JEST
  miejscem docelowym produktu. Koszt, jeśli źle: brak izolacji od `master`, cofalny
  przez `git checkout master`.
```

## 2. `ellipseGeometry` na elipsie prawie kołowej (poziom 4: a=0.55, b=0.527) ma

```
Ruling: `ellipseGeometry` na elipsie prawie kołowej (poziom 4: a=0.55, b=0.527) ma
  źle uwarunkowany wektor własny, więc `angle` bywa niestabilny. NIE jest to defekt:
  `angle` służy wyłącznie za bazę kierunków startu w `launchAngles`, a własność
  refleksyjna działa dla każdego kierunku. Koszt, jeśli źle: kierunki startu na
  poziomie 4 mogą się nieznacznie obracać między klatkami — kosmetyka, nie poprawność.
```

## 3. `applyDrag` podnosi `a`, gdy ognisko odjedzie za daleko, także na poziomie 1,

```
Ruling: `applyDrag` podnosi `a`, gdy ognisko odjedzie za daleko, także na poziomie 1,
  gdzie uchwyt „rozmiar” jest zablokowany i gracz nie cofnie zmiany. NIE jest to
  defekt: własność refleksyjna nie zależy od rozmiaru, więc poziom pozostaje
  rozwiązywalny przy każdym `a`. Koszt, jeśli źle: gracz zobaczy większą elipsę,
  niż zaczynał — bez wpływu na rozwiązanie.
```

**ODWOŁANE** — patrz `decyzje-etap-2.md`, sekcja „Poprawki po etapie 2”, pkt 5:
zablokowany rozmiar stoi.

## 4. `scripts/task-brief` ze skilla wymaga nagłówków "Task N", a plan ma

```
Ruling: `scripts/task-brief` ze skilla wymaga nagłówków "Task N", a plan ma
  "Zadanie N". Zamiast przepisywać plan na angielski, workspace dostał równoważny
  `task-brief` o tym samym kontrakcie (wypisuje ścieżkę pliku z pełnym tekstem
  zadania). `review-package` działa bez zmian, bo operuje na gicie, nie na planie.
  Koszt, jeśli źle: brief mógłby urwać sekcję zadania — sprawdzane przy każdym
  dispatchu przez `wc -l` na wyjściu.
```

## 5. `npm audit` zgłasza 5 podatności (w tym jedną krytyczną) w narzędziach

```
Ruling: `npm audit` zgłasza 5 podatności (w tym jedną krytyczną) w narzędziach
  wyłącznie deweloperskich — serwer dev Vite/esbuild oraz @vitest/mocker. NIE
  podbijamy wersji. Powody: (1) `dependencies` jest puste, więc nic z tego nie
  trafia do paczki, którą dostaje gracz; (2) podatności serwera dev są osiągalne
  tylko dla kogoś, kto już jest w sieci maszyny dewelopera; (3) skok na vite 8 /
  vitest 5 to zmiany łamiące, których plan nie przewiduje, a które ruszyłyby
  fundament pod dwunastoma pozostałymi zadaniami. Koszt, jeśli źle: ryzyko
  lokalne dla maszyny deweloperskiej podczas `npm run dev`; produkt dla gracza
  nietknięty. Do ponownego rozważenia przy końcowej recenzji gałęzi.
```

## 6. POKRYWAMY, nie odkładamy. Wbrew temu, że parabola i hiperbola to etap 3,

```
Ruling: POKRYWAMY, nie odkładamy. Wbrew temu, że parabola i hiperbola to etap 3,
  `classify` jest funkcją żywą już w v1 — `launchAngles` pyta ją o "elipsa",
  a `conicPolyline` o "prosta". Odwrócony znak w `B²-4AC` przeszedłby dziś cicho
  i wybuchł dopiero w etapie 3, gdzie nikt nie szukałby przyczyny w kodzie z v1.
  Koszt pokrycia: dwie asercje na gotowych stałych (x²-y²=1 oraz x²-y=0).
  Koszt, jeśli źle: ~2 minuty pracy implementera. Odrzucenie znaleziska tylko
  dlatego, że sam je wpisałem do planu, byłoby ocenianiem własnej pracy.
```

## 7. NAPRAWIAMY. Recenzent wykazał, że we WSZYSTKICH siedmiu testach `D === 0`:

```
Ruling: NAPRAWIAMY. Recenzent wykazał, że we WSZYSTKICH siedmiu testach `D === 0`:
  okrąg jednostkowy ma D=0, `lineThrough` z kierunkiem poziomym daje D=0, a elipsa
  testowa ma ogniska symetryczne względem środka układu, więc D=E=0 z samego wzoru
  w conic.ts. Człon `k.D * d.x` nigdy nie wnosi niczego niezerowego. To jest dokładnie
  ta usterka, przed którą sam ostrzegałem w zleceniu recenzji: trafienia w miejscach
  wiarygodnych, ale złych — gra wyglądałaby prawie dobrze. Test przechodzący nie dowodzi,
  że cokolwiek pilnuje. Koszt naprawy: dwa testy. Koszt, jeśli źle: zero, testy tylko
  zawężają dopuszczalne implementacje.
```

## 8. NAPRAWIAMY, mimo że test twierdzenia `2a` z zadania 5 byłby siatką. Powód to

```
Ruling: NAPRAWIAMY, mimo że test twierdzenia `2a` z zadania 5 byłby siatką. Powód to
  lokalność: gdy ktoś kiedyś ruszy `reflect.ts`, czerwień ma zapalić się w `reflect.test.ts`,
  a nie w cudzym pliku obok — inaczej diagnostyka prowadzi w złe miejsce. Dodatkowo istnieje
  test tani i bardzo mocny: różnica centralna jest DOKŁADNA dla wielomianu kwadratowego
  (trzecia pochodna znika), więc porównanie `normalAt` z numerycznym gradientem `evalConic`
  przypina wszystkie sześć członów naraz, z ciasną tolerancją i bez ręcznie liczonych liczb.
  Koszt, jeśli źle: zero — test tylko zawęża dopuszczalne implementacje.
```

## 9. NAPRAWIAMY. Wyrażenie `/from\s+["']([^"']+)["']/` łapie importy nazwane i reeksporty,

```
Ruling: NAPRAWIAMY. Wyrażenie `/from\s+["']([^"']+)["']/` łapie importy nazwane i reeksporty,
  ale NIE łapie `import("../foo")` dynamicznego ani `import "../foo"` czysto efektowego —
  w obu nie ma słowa `from`. To strażnik ograniczenia globalnego, który ma trzymać przez całe
  życie projektu, a etapy 5-6 (czarne dziury, torus) będą rdzeń rozszerzać. Strażnik z dziurą
  jest gorszy niż brak strażnika, bo kupuje fałszywy spokój. Koszt: trzy wyrażenia zamiast
  jednego. Koszt, jeśli źle: zero.
```

## 10. dokładam do TEJ SAMEJ rundy jedną uwagę drobną — licznik przebiegów w teście

```
Ruling: dokładam do TEJ SAMEJ rundy jedną uwagę drobną — licznik przebiegów w teście
  twierdzenia. Zasadniczo drobne nie wchodzą do pętli napraw, ale runda i tak się odbywa,
  więc dołożenie jednej linii jej nie przedłuża. Powód merytoryczny: recenzent musiał
  symulować generator na zewnątrz, żeby udowodnić, że test nie przechodzi pusto. Licznik
  czyni ten dowód częścią testu. Tego samego wymagałem w zadaniach 3 i 4 — spójność.
```

## 11. nie zamawiam osobnej rundy tylko po tę liczbę. Znam już jej rząd wielkości z dowodów

```
Ruling: nie zamawiam osobnej rundy tylko po tę liczbę. Znam już jej rząd wielkości z dowodów
  zadania 5: test twierdzenia asertuje długość toru równą 2a z dokładnością do 9 miejsc
  po przecinku na 297 losowych elipsach. `spread` to różnica max-min po ośmiu takich
  długościach, więc jest ograniczony przez ~2e-9 — trzy rzędy wielkości pod progiem 1e-6.
  Pytanie było zasadne, ale odpowiedź już istnieje w zebranych dowodach. Zgłoszone recenzentowi
  jako punkt do oceny jakości raportu, nie jako brak do naprawy.
  Koszt, jeśli źle: gdyby `spread` był w rzeczywistości bliski progu, animacja z zadania 12
  pokazałaby rozjazd przybycia — wykrywalne przy ręcznym sprawdzeniu w zadaniu 13.
```

## 12. (1): NAPRAWIAMY `simultaneous`. Gdy wpadnie jedna piłka, `lengths` ma jeden element,

```
Ruling (1): NAPRAWIAMY `simultaneous`. Gdy wpadnie jedna piłka, `lengths` ma jeden element,
  więc spread === 0 i `simultaneous: true` przy `solved: false` — pole kłamie o poziomie
  nierozwiązanym. Poprawka: `simultaneous: solved && spread < 1e-6`. Koszt: jedna linia.
```

## 13. (2): ZMIENIAM PÓŁ KROKU NA ĆWIERĆ — i to jest zmiana projektowa, nie kosmetyka

```
Ruling (2): ZMIENIAM PÓŁ KROKU NA ĆWIERĆ — i to jest zmiana projektowa, nie kosmetyka.
  Recenzent wykazał, że pół kroku chroni przed osią tylko dla parzystej liczby piłek.
  Sprawdziłem konsekwencję, której nie widziałem projektując: przy count=2 odbicie względem
  osi wielkiej odwzorowuje kąt θ na 2·base−θ, więc base+0.5π przechodzi w base+1.5π —
  DOKŁADNIE drugi kierunek podglądu. Oba tory podglądu są więc swoimi lustrzanymi odbiciami,
  a gracz przy przeciąganiu widzi połowę informacji, za którą płaci. Ćwierć kroku łamie tę
  symetrię (base+0.25π ↦ base+1.75π ≠ base+1.25π) i przy okazji usuwa problem nieparzystych.
  Spec zaktualizowany. Koszt, jeśli źle: kierunki startu obracają się o 1/8 kroku — bez
  wpływu na poprawność, bo własność refleksyjna działa dla KAŻDEGO kierunku.
```

## 14. (3,4): NAPRAWIAMY brak testów na kolejność strażnika w `launchAngles` (nie-elipsa

```
Ruling (3,4): NAPRAWIAMY brak testów na kolejność strażnika w `launchAngles` (nie-elipsa
  jako aimCurve) i na przekazywanie `count`. Oba to ścieżki, których zadanie 12 używa wprost.
```

## 15. (5): przy okazji tej rundy żądam zmierzonej wartości `spread` — runda i tak się odbywa

```
Ruling (5): przy okazji tej rundy żądam zmierzonej wartości `spread` — runda i tak się odbywa.
```

## 16. PLAN zaktualizowany za specyfikacją. Recenzent zauważył, że zmieniłem spec, ale nie

```
Ruling: PLAN zaktualizowany za specyfikacją. Recenzent zauważył, że zmieniłem spec, ale nie
  plan — a briefy wyciąga się z planu, więc plan mówiący `(i + 0.5)` przy kodzie mówiącym
  `0.25` cofnąłby tę poprawkę, gdyby ktoś kiedyś odtwarzał zadanie 6 z planu. Poprawione
  trzy miejsca: proza, kod `launchAngles`, kod `runProof` plus opis interfejsu.
  Koszt, jeśli źle: zero — dokument dogania kod, który już przeszedł recenzję.
```

## 17. ZMIENIAM TEST, przywracam oryginalne `a`. Test ma przechwycić wyjątek z konstruktora

```
Ruling: ZMIENIAM TEST, przywracam oryginalne `a`. Test ma przechwycić wyjątek z konstruktora
  i potraktować go jako `solved: false`, bo elipsa niemożliwa do skonstruowania tym bardziej
  nie rozwiązuje poziomu. Wtedy `a` wraca do 0.50 i 0.86, zapas do przeszkody w dwie-przeszkody
  wraca z 0.020 do 0.082 (czterokrotnie), a w zwienczenie z 0.067 do 0.149.
  Uzasadnienie merytoryczne: poziom `dwie-przeszkody` istnieje po to, żeby UCZYĆ, że za duża
  elipsa zahacza o przeszkodę. Zapas 2% czyni tę lekcję nieczytelną, bo gracz przesuwający
  uchwyt rozmiaru nie zobaczy pasma, tylko krawędź. Płaciłem pedagogiką za ułomność testu.
  Przechwycenie jest wąskie — obejmuje JEDNO wywołanie, a `ellipseFromFoci` ma dokładnie
  jeden udokumentowany tryb awarii (a <= c), więc nie schowa niczego innego.
  Koszt, jeśli źle: gdyby konstruktor kiedyś zaczął rzucać z innego powodu, ten test
  potraktowałby to jako sukces — ograniczone do jednego wywołania i opisane komentarzem.
  Plan zaktualizowany, żeby brief nie cofnął tej poprawki przy ewentualnym odtwarzaniu.
```

## 18. NAPRAWIAMY duplikat. Wizualnie jest nieszkodliwy, ale zadanie 12 trafi na niego

```
Ruling: NAPRAWIAMY duplikat. Wizualnie jest nieszkodliwy, ale zadanie 12 trafi na niego
  W KAŻDEJ KLATCE po zakończeniu animacji, a to jest stan, w którym gra spędza najwięcej
  czasu — ekran wygranej z zastygłymi smugami. Usterka w kodzie, po którym przechodzi się
  najczęściej, nie zasługuje na etykietę "kosmetyczna". Poprawka: przyciąć `s` do długości
  toru przed pętlą. Koszt: jeden dodatkowy przebieg po torze 5-6 punktowym, nieistotny.
```

## 19. dokładam do tej samej rundy dwa braki testowe, bo runda i tak się odbywa. Recenzent

```
Ruling: dokładam do tej samej rundy dwa braki testowe, bo runda i tak się odbywa. Recenzent
  wykazał, że test smugi asertuje TYLKO oba końce — implementacja ścinająca zakręt w linii
  prostej przeszłaby go bez zmian. To znowu test, który wygląda na pilnujący, a nie pilnuje.
  Drugi brak: nic nie sprawdza przypadku s > długość toru, czyli dokładnie tego, co naprawiamy.
```

## 20. NAPRAWIAMY pięcioma testami granicznymi (2 × Important + 2 × Minor + 1 z ostrożności)

```
Ruling: NAPRAWIAMY pięcioma testami granicznymi (2 × Important + 2 × Minor + 1 z ostrożności).
  Powtarza się to piąty raz, więc nazywam wzorzec: moje testy w planach sprawdzają punkty
  wygodnie w środku zakresu albo wygodnie poza nim — tam, gdzie łatwo policzyć wartość
  oczekiwaną — a granicę, której test broni, zostawiają nieobjętą. Konkretnie tutaj:
  - zacisk na `a` jest ćwiczony tylko punktem, gdzie NIE jest wiążący (a≈0.78 przy c=0.5);
  - próg przyskakiwania tylko przy 0.5× i 2× promienia, nigdy przy 1×;
  - `pickHandle` nigdy z dwoma uchwytami naraz w zasięgu;
  - tożsamość ogniska sprawdzana `toEqual`, które przeszłoby też dla głębokiej kopii;
  - fixture symetryczny wokół zera maskuje zgubione dzielenie przez 2 w środku elipsy.
  Koszt: pięć testów. Koszt, jeśli źle: zero, testy tylko zawężają dopuszczalne implementacje.
```

## 21. BŁĄD W MOIM TEŚCIE, nie w implementacji. Zdiagnozowane liczbowo:

```
Ruling: BŁĄD W MOIM TEŚCIE, nie w implementacji. Zdiagnozowane liczbowo:
  SNAP_RADIUS      = 0.14142135623730953120
  0.5 + SNAP       = 0.64142135623730955896
  odjęte z powrotem= 0.14142135623730955896  → WIĘKSZE o 2.776e-17
  Dodanie 0.5 przesuwa liczbę w grubszy zakres wykładnika, zaokrąglenie idzie w górę,
  więc punkt naprawdę leży poza promieniem. `snapTo` zachowało się poprawnie.
  Poprawka: budować granicę na wartościach dokładnie reprezentowalnych — punkt (0.25, 0),
  cel (0, 0), promień 0.25. Potęga dwójki, hypot(0.25, 0) = 0.25 bit w bit, więc `<=`
  jest ćwiczone naprawdę. Sprawdzone w node przed wysłaniem poprawki, nie po.
  Koszt, jeśli źle: test nie ćwiczyłby granicy — czyli dokładnie to, co naprawiamy.
  Plan zaktualizowany wraz z komentarzem tłumaczącym, czego tu NIE wolno napisać.
```

## 22. NAPRAWIAMY dwoma testami

```
Ruling: NAPRAWIAMY dwoma testami.
  (1) Liniowość mierzona na DWÓCH różnych długościach toru. Poziom "rozmiar" rozwiązuje
  każde `a`, więc a=0.75 daje tor 1.5, a a=1.0 daje 2.0. Jeśli faza zmienia się dokładnie
  po `długość / BALL_SPEED` w obu przypadkach, to stała prędkości jest ta sama na obu
  dystansach — czyli odwzorowanie jest wprost proporcjonalne. Krzywa wygładzająca dopasowana
  do jednego dystansu rozjedzie się na drugim.
  (2) Bezczynność `advance` poza fazą dowodu, asertowana przez `toBe` (tożsamość, nie wartość).
```

## 23. ODWOŁANY: kazałem poprawić "780×1328" na 1688, twierdząc, że dla iPhone 12 przy

```
Ruling ODWOŁANY: kazałem poprawić "780×1328" na 1688, twierdząc, że dla iPhone 12 przy
  dpr 2 wysokość musi wynosić 1688. Implementer zmierzył bezpośrednio przez page.evaluate
  i wykazał, że 1328 JEST poprawne: preset Playwrighta ma viewport.height = 664 (nie 844,
  bo 844 to wysokość EKRANU urządzenia, a viewport odejmuje paski przeglądarki), a `resize()`
  czyta window.innerHeight. 664 × 2 = 1328. Mój błąd: wziąłem wysokość ekranu za wysokość
  viewportu. Liczba zostaje bez zmian, uzasadnienie dopisane do raportu.
```

## 24. NAPRAWIAMY JEDNĄ FALĄ (12 pozycji) — patrz fix-brief.md w tym katalogu

```
Ruling: NAPRAWIAMY JEDNĄ FALĄ (12 pozycji) — patrz fix-brief.md w tym katalogu.
```

## 25. ŁUKI — nie dodajemy, poprawiamy SPECYFIKACJĘ. Spec twierdził, że łuki są "w

```
Ruling: ŁUKI — nie dodajemy, poprawiamy SPECYFIKACJĘ. Spec twierdził, że łuki są "w
  architekturze od początku" i że etap 2 jest przez to "mały". Obie rzeczy nieprawdziwe:
  `Conic` nie ma zakresu, `rayConic` zwraca trafienie na całej krzywej, ściany są
  nieskończone. Dodawanie łuków w fali naprawczej, bez własnego przebiegu projektowego,
  byłoby dokładnie tym, przed czym ten proces ma chronić — a YAGNI mówi, że v1 nie ma
  dla nich konsumenta. Poprawiam więc twierdzenie, nie kod: łuki przechodzą do etapu 2,
  wycena z "mały" na "średni". Koszt, jeśli źle: etap 2 zacznie się od 15 linii w rdzeniu
  zamiast od danych — widoczne i tanie.
```

## 26. DWA TAKTY ANIMACJI (błysk odbicia z normalną, rozbłysk dołka) — zapisane w specu

```
Ruling: DWA TAKTY ANIMACJI (błysk odbicia z normalną, rozbłysk dołka) — zapisane w specu
  jako dług, nie wciśnięte do fali. Spec nazywa normalną przy odbiciu elementem uczącym,
  więc nie wolno ich po cichu porzucić; ale wciskanie funkcji wizualnych do fali naprawczej,
  bez projektu i bez oceny okiem, dałoby zły wynik. Koszt, jeśli źle: gra jest o dwa efekty
  uboższa, niż obiecuje spec — wypisane wprost, nie ukryte.
```

## 27. npm audit — recenzent ZGADZA SIĘ z odroczeniem na ten merge (zero zależności

```
Ruling: npm audit — recenzent ZGADZA SIĘ z odroczeniem na ten merge (zero zależności
  produkcyjnych, wszystkie pięć dotyczy serwera dev), ale NIE ZGADZA SIĘ z dryfem:
  radzi zrobić skok jako pierwszy commit PO merge'u, bo `vite.config.ts` używa trzech opcji,
  a 92 testy są siatką — taniej już nie będzie. Przyjmuję.
```

## 28. ODRZUCONY PRZEZ RECENZENTA I POTWIERDZONY: niestabilność kąta osi przy elipsie

```
Ruling ODRZUCONY PRZEZ RECENZENTA I POTWIERDZONY: niestabilność kąta osi przy elipsie
  prawie kołowej. Recenzent próbował obalić mój ruling i nie zdołał — przemiótł `f1` po
  poziomie `blisko` krokiem 1e-4 i kąt startu zmienia się najwyżej o 0.01° na krok, gładko.
  `ellipseFromFoci` buduje B wprost z kierunku ognisk, więc wektor własny jest lepiej
  uwarunkowany, niż zakładałem. Ruling był słuszny i raczej niedoszacowany.
```

## 29. PARKUJĘ, NIE NAPRAWIAM SAM — decyzja należy do człowieka

```
Ruling: PARKUJĘ, NIE NAPRAWIAM SAM — decyzja należy do człowieka.
  Dlaczego nie naprawiam: to zmiana CENTRALNEJ REGUŁY gry, nie usterka implementacji.
  Specyfikacja §1 definiuje wygraną jako "wszystkie wpadną", a jednoczesność WYPROWADZA
  w §7 jako konsekwencję — konsekwencję prawdziwą tylko wtedy, gdy dołek jest w drugim
  ognisku, a nie gdy leży na cięciwie. Litera warunku jest spełniona, przesłanka wyprowadzenia
  nie. Zmiana warunku zwycięstwa na `solved && simultaneous` jest jednolinijkowa i recenzent
  zweryfikował, że nie psuje żadnego z ośmiu poziomów (wszystkie mają spread ≤ 8.9e-16),
  ale to moja rekomendacja, nie moja decyzja: gra ma wtedy inny warunek zwycięstwa,
  niż napisano w zaakceptowanej specyfikacji.
  Koszt, jeśli źle: gra wypisuje "ta sama chwila" nad piłkami rozjeżdżającymi się o 3.4 s
  i uczy nieprawdy — dokładnie tego, co §6 nazywa jedynym miejscem, gdzie gra może skłamać.
```

## 30. POZOSTAŁE TRZY RESZTKI PARKUJĘ jako drobne, z uzasadnieniem recenzenta

```
Ruling: POZOSTAŁE TRZY RESZTKI PARKUJĘ jako drobne, z uzasadnieniem recenzenta.
  (a) krawędź a > 2.02 z ograniczenia toru — samoograniczająca się, bo przy tym rozmiarze
      elipsa jest całkowicie poza ekranem i gracz nie ma czego oglądać; zamiana 33-sekundowej
      zamrażarki na niewidoczną elipsę jest właściwym handlem;
  (b) wyścig `consumedReset` przy dotyku dwoma palcami — klasa problemu istniejąca wcześniej,
      niezabezpieczona również przed falą;
  (c) `advance` nadal czeka na najdłuższy tor, więc przegrany dowód może trwać ~10 s
      na wiarygodnych stanach — poprawa z 33 s, ale nie domknięcie tematu.
```

---

## Rozstrzygnięcia właściciela po etapie 1 (2026-09-19)

- **Punkt 29 — warunek zwycięstwa zostaje bez zmian.** Wygrana to „wszystkie wpadną",
  piłki NIE muszą przybyć jednocześnie. Rozwiązania z dołkiem na cięciwie zamiast
  w ognisku są dozwolone; baner nie chwali się jednoczesnością, gdy jej nie było
  (commit a385026), więc gra nie kłamie.
- **Punkt 26 — dwóch taktów animacji nie robimy.** Specyfikacja §2 zaktualizowana.
- **Punkt 27 — aktualizacja wykonana.** vite 5.4 → 8.3, vitest 2.1 → 5.0; `npm audit`
  zgłasza 0 podatności. Przy okazji test budżetu buduje z `NODE_ENV=production` — pod
  vitestem dziedziczył `NODE_ENV=test` i budował paczkę bez service workera.
