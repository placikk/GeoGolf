# Decyzje — wprowadzenia i wygląd (etap 0, plansze z zasadą, kolory krzywych)

Ten dokument spisuje, co zrobiła gałąź `wprowadzenia-i-wyglad`, jakie decyzje zapadły
(brainstorming, plan, realizacja), pomiary na kodzie końcowym oraz listę kontrolną
przejścia w przeglądarce. Format jak `decyzje-etap-3.md`.

Pomiary wykonano na commicie **f7d62c5** (gałąź `wprowadzenia-i-wyglad`, drzewo robocze czyste
poza nieśledzonym `do poprawy.txt`, którego nie ruszano).

---

## 1. Co zostało zrobione

Cztery uwagi z `do poprawy.txt` (piąta część pliku — zakładki twórców i społeczności —
to etap 4, patrz sekcja 7):

1. **„Najpierw poziomy tylko z odcinkami i prostymi."** Etap 0: trzy nowe poziomy
   bilardowe `odbicie`, `dwa-odbicia`, `za-rogiem` (`src/levels/stage0.ts`). Gracz ma jedną
   piłkę i ruchomy odcinek-lustro (nowy rodzaj elementu w `src/levels/shape.ts`; uchwyty:
   dwa końce i środek, `src/ui/handles.ts`). Poziomy są na początku listy, pozostałe
   przesunęły się o 3. Zapis postępu trzyma teraz identyfikator ostatniego poziomu, a nie
   numer (`src/ui/progress.ts`), więc stary zapis nadal otwiera ten sam poziom.
2. **„Gdy pojawia się nowa mechanika, prosty poziom ją wyjaśnia."** Sześć plansz z zasadą
   i miniscenką rysowaną prawdziwym silnikiem (`src/levels/cards.ts`): Odbicie (przed
   `odbicie`), Elipsa (przed `ogniska`), Łuk (przed `polelipsa`), Kaskada (przed `kaskada`),
   Parabola (przed `ognisko-paraboli`), Hiperbola (przed `druga-strona`). Plansza pokazuje
   się sama przy wejściu na poziom, dopóki ten nie jest zaliczony; przycisk „?" w wierszu
   „Poziom N / M" (`src/ui/screens.ts`) otwiera ją na każdym późniejszym poziomie tej
   mechaniki. Poziom `druga-strona` został wstawiony przed `wspolne-ognisko`, żeby hiperbola
   miała swój prosty poziom wprowadzający.
3. **„Odróżnić elipsę od paraboli."** Kolor według rodzaju krzywej (elipsa turkus, parabola
   fiolet, hiperbola fuksja, lustro-odcinek błękit) i kształt uchwytu według roli (pierścień
   na ognisku, romb na wierzchołku paraboli, kwadrat na końcu i środku odcinka) — `src/render/style.ts`,
   `src/render/draw.ts`. Stałe krzywe są przygaszone w kolorze swojego rodzaju; czerwone
   zostały tylko okręgi i bandy (przeszkody).
4. **„Zaznaczyć oś paraboli."** Oś jest zawsze widoczna, przerywana (`setLineDash`,
   bez `shadowBlur`), na każdym poziomie z parabolą — także stałą (`src/render/shapes.ts`,
   `src/render/draw.ts`). Dodatkowo strzałka strzału jednej piłki w poziomach bilardowych.

Poza tym: `src/core/` nie został zmieniony ani w jednym pliku; zero zależności produkcyjnych.

## 2. Decyzje właściciela z brainstormingu

- **Bilard z jedną piłką i ruchomym odcinkiem** jako etap 0 (zamiast wachlarza ośmiu piłek).
- **Plansza z zasadą przy pierwszym poziomie mechaniki** — pokazuje się sama, potem tylko pod „?".
- **Kolor + kształt uchwytów** (a nie sam kolor) — żeby rodzaj krzywej i rola uchwytu były
  czytelne także bez rozróżniania barw.
- **Oś paraboli zawsze widoczna, przerywana.**
- **Podejście A:** etap 0 plus plansze (a nie samo oznaczenie poziomów albo animacje).
- **Przygaszone kolorowe krzywe stałe zamiast czerwonych** — czerwień zostaje dla przeszkód.

## 3. Odstępstwa planu od specyfikacji

Pięć świadomych, z nagłówka planu:

1. **Minimalna długość lustra to `MIN_SEGMENT_LENGTH = 0.2`, nie `MIN_GAP`** (spec §1.2).
   Przy długości rzędu `MIN_GAP` trzy uchwyty odcinka leżą bliżej siebie niż promień
   łapania palcem (ok. 0.2 jednostki na telefonie) i nie da się złapać końca osobno od środka.
2. **Miniscena ma listę strzałów `shots: { from, angle }[]`, nie `ball` + `angles`** (spec §2.1).
   Scena hiperboli pokazuje piłki lecące w stronę ogniska z kilku miejsc naraz; z jednego
   punktu tego nie narysować. Wachlarz to strzały o wspólnym `from`.
3. **Przycisk „?" leży w wierszu „Poziom N / M" na środku u góry**, nie obok ⚙. Obok ⚙ na
   telefonie 390 px zachodziłby na najdłuższe tytuły („Teraz rozmiar ma znaczenie" ≈ 250 px).
4. **Dodatki wynikające z jednej piłki:** podgląd torów strzela `min(2, balls)` piłkami
   (dwie piłki jednopiłkowego poziomu leciałyby tym samym torem), a baner po dowodzie mówi
   w liczbie pojedynczej („Wpadła" / „Chybiła" zamiast „Chybiło 1 z 1").
5. **Numery poziomów w komentarzach** etapów 2–3 i w testach zostają historyczne (każdy plik
   z takimi numerami ma notkę na górze); **nazwy testów** podają identyfikatory zamiast
   numerów, bo nazwa testu pojawia się w wyniku i nie może kłamać.

### Rozstrzygnięcia w trakcie realizacji

Zadanie 1 — `keepLength` dostał trzeci wariant (w stronę środka planszy). Plan twierdził,
że „jedna z dwóch stron zawsze się mieści", a to fałsz przy rogach planszy (np. drugi koniec
(0.95, −0.95), kierunek (0.62, 0.78): jedna strona daje x ≈ 1.07, druga y ≈ −1.11). Trzeci
kandydat — punkt w odległości `MIN_SEGMENT_LENGTH` od drugiego końca w stronę środka — jest
zawsze w planszy. Przy okazji: bezpieczny kierunek przy zdegenerowanym odcinku (nie NaN), test
dla `koniec1` i poprawiony, prawdziwy komentarz (dwie rundy). Stąd 3 testy więcej niż w planie.

Zadanie 2 — komentarz `LEGACY_ORDER` został napisany „na wyrost" (mówił o przesunięciu i
zamianie poziomów, które robią dopiero zadania 3–4). Zostawiony bez zmian; po zadaniu 4
jest prawdziwy (sprawdzone przy jego zamknięciu).

Zadanie 7 — plansze Kaskada, Elipsa i Łuk w wersji z planu były kopiami **rozwiązań poziomów**
(`kaskada`, `ogniska`, `polelipsa`), więc plansza zdradzałaby rozwiązanie poziomu, przed którym
stoi. Wszystkie trzy sceny zmieniono na układy spoza danych poziomów (policzone i zmierzone
silnikiem: kaskada 8/8 po 2 odbiciach, elipsa 8/8 po 1, łuk 8/8 po 1). Plansza Paraboli
dostała drugą scenę (wiązka równoległa zbiega się w ognisku, 6/6), bo drugie zdanie planszy
nie miało rysunku. Test odbicia sprawdza teraz odwrócenie składowej w poprzek lustra. Nowy test
strażnik zabrania, by jakikolwiek kształt sceny był równy rozwiązaniu lub przeszkodzie
któregokolwiek poziomu (+1 test; razem 663).

### Ruling kontrolera i koszt, jeśli źle

| Rozstrzygnięcie | Koszt, jeśli źle |
|---|---|
| Wykonawcy przepisują diffy planu dosłownie (konteksty kolejnych zadań liczone na tekście poprzednich) | Wykonawca dopasowuje kontekst ręcznie, więcej tur |
| Wykonawcy i recenzenci zadań na sonnet, przegląd końcowy na opus | Wyższy koszt tokenów |
| Zad. 1: przyjęta uwaga o `keepLength`; trzeci kandydat w stronę środka planszy, plus dwie drobne w tym samym miejscu | Koniec lustra przeskakuje w stronę środka w rzadkim przypadku przy rogu — widoczne, ale lepsze niż uchwyt poza ekranem |
| Zad. 1: dwie nowe uwagi o komentarzu `keepLength` podniesione do ważnych (fałszywy komentarz) | Jedna runda poprawek za komentarz |
| Zad. 1: pominięty przegląd powtórny rundy 2 (diff to wyłącznie linie komentarza) | Zero — nie ma diffu kodu |
| Zad. 2: komentarz `LEGACY_ORDER` wyprzedzający kod zostaje bez zmian | Pośrednie commity 2–3 mają komentarz wyprzedzający kod |
| Zad. 7: przyjęte wszystkie trzy ważne uwagi; kaskada przeliczona na układ spoza poziomów | Plansza kaskady pokazuje układ podobny do poziomu, ale nie jego rozwiązanie |
| Zad. 7: zmienione też sceny elipsy i łuku (strażnik wykrył, że to rozwiązania `ogniska` i `polelipsa`) | Rysunek elipsy przekrzywiony względem poziomu 4 |

## 4. Kalibracja

Polecenia i wyniki (commit f7d62c5):

- `npx tsc --noEmit` — bez błędów (kod wyjścia 0).
- `npx vitest run` — 26 plików, **663 testy zielone**.
- `npm run build` — paczka JS 43.27 kB, **15.42 KB gzip** (cały `dist/index.html` + JS ok. 15.8 KB; budżet < 100 KB).
- `npx vite-node scripts/sprawdz-poziom.ts <id>` — poniżej.

| Poziom | Rozwiązanie | Start | Obrót ±3° | Obrót ±2° |
|---|---|---|---|---|
| `odbicie` | 1/1 | 0/1 | 0/1 (odpada) | 1/1 (jeszcze wygrywa) |
| `dwa-odbicia` | 1/1 | 0/1 | 0/1 (odpada) | 1/1 (jeszcze wygrywa) |
| `za-rogiem` | 1/1 | 0/1 | 0/1 (odpada) | 0/1 (odpada) |
| `druga-strona` | 8/8 | 0/8 | — (nie dotyczy) | — |
| `wspolne-ognisko` | 8/8 | 0/8 | — (nie dotyczy) | — |

Uwaga: zapas tolerancji na `odbicie` i `dwa-odbicia` jest cienki — obrót o ±3° odpada, ale
±2° jeszcze wygrywa (to znaczy: gracz musi ustawić lustro z dokładnością ok. 2–3°). Zapisane
jako uwaga odłożona w sekcji 7.

Miniscenki plansz (silnik `sceneTraces`; „odbić" to liczba odbić na torze strzału):

| Plansza / scena | Strzałów | Dołek | Wpadło | Odbić na tor |
|---|---|---|---|---|
| Odbicie / 1 | 1 | brak | — | 1 |
| Elipsa / 1 (płaskie lustro, wachlarz) | 7 | brak | — | 1 |
| Elipsa / 2 (ogniska) | 8 | tak | 8/8 | 1 |
| Łuk / 1 | 8 | tak | 8/8 | 1 |
| Kaskada / 1 | 8 | tak | 8/8 | 2 |
| Parabola / 1 (wachlarz z ogniska) | 8 | brak | — | 1 |
| Parabola / 2 (wiązka do ogniska) | 6 | tak | 6/6 | 1 |
| Hiperbola / 1 | 6 | tak | 6/6 | 1 |

Wszystkie sceny z dołkiem: komplet wpada; sceny bez dołka pokazują tylko kształt odbitej wiązki.

Rozbieżności względem briefu: brief oczekiwał 659 testów i ok. 15.3 KB gzip; zmierzono
**663** (zadanie 1 dodało 3 testy, zadanie 7 jeden) i **15.42 KB** (ostatnie zadanie dodało
plansze z zasadą przy wejściu na poziom).

## 5. Nowa numeracja

Nowy numer to pozycja w `LEVELS` na commicie f7d62c5; stary — pozycja w `LEGACY_ORDER`
(24 poziomy sprzed zmiany). Trzy nowe poziomy nie mają starego numeru. Listy kontrolne
etapów 1–3 przekładaj tą tabelą.

| Nowy | Identyfikator | Tytuł | Stary |
|---|---|---|---|
| 1 | `odbicie` | Odbicie | nowy |
| 2 | `dwa-odbicia` | Dwa odbicia | nowy |
| 3 | `za-rogiem` | Za rogiem | nowy |
| 4 | `ogniska` | Dwa ogniska | 1 |
| 5 | `rozmiar` | Rozmiar bez znaczenia | 2 |
| 6 | `skos` | Na ukos | 3 |
| 7 | `blisko` | Prawie okrąg | 4 |
| 8 | `ciasna` | Wąska jak igła | 5 |
| 9 | `przeszkoda` | Teraz rozmiar ma znaczenie | 6 |
| 10 | `dwie-przeszkody` | Z dwóch stron | 7 |
| 11 | `zwienczenie` | Zwieńczenie | 8 |
| 12 | `polelipsa` | Półelipsa | 9 |
| 13 | `bandy` | Bandy | 10 |
| 14 | `przycinanie` | Przycinanie | 11 |
| 15 | `wspologniskowe` | Współogniskowe | 12 |
| 16 | `kaskada` | Kaskada | 13 |
| 17 | `kaskada-od-konca` | Kaskada od końca | 14 |
| 18 | `dwie-elipsy` | Dwie elipsy | 15 |
| 19 | `zwienczenie-2` | Zwieńczenie kaskad | 16 |
| 20 | `ognisko-paraboli` | Ognisko paraboli | 17 |
| 21 | `parabola-rozmiar` | Rozmiar bez znaczenia | 18 |
| 22 | `obrot-osi` | Obrót osi | 19 |
| 23 | `teleskop` | Teleskop | 20 |
| 24 | `druga-strona` | Druga strona | 22 |
| 25 | `wspolne-ognisko` | Wspólne ognisko | 21 |
| 26 | `ktora-galaz` | Która gałąź | 23 |
| 27 | `zwienczenie-3` | Zwieńczenie | 24 |

Uwaga: „Druga strona" i „Wspólne ognisko" zamieniły się miejscami (stare 22 ↔ 21).

## 6. Lista kontrolna przejścia w przeglądarce

Dla właściciela; na telefonie (ok. 390 px) i na komputerze. Przed pierwszym punktem
wyczyść dane witryny.

**Pierwsze uruchomienie**
- [ ] Od razu otwiera się plansza „Odbicie".
- [ ] Przycisk „Gram" zamyka planszę.
- [ ] Dotknięcie tekstu lub rysunku na planszy jej nie zamyka.

**Trzy poziomy bilardowe (1–3)**
- [ ] Widać strzałkę strzału jednej piłki.
- [ ] Uchwyty odcinka: kwadraty na końcach i kwadrat w środku da się złapać osobno.
- [ ] Przeciąganie środka nie wyprowadza lustra za ramkę planszy.
- [ ] Po sprawdzeniu pojawia się baner „Wpadła" albo „Chybiła".

**Plansze**
- [ ] Plansza pokazuje się sama przed poziomami `ogniska` (4), `polelipsa` (12), `kaskada` (16), `ognisko-paraboli` (20), `druga-strona` (24).
- [ ] Po zaliczeniu danego poziomu plansza przy wejściu już się nie pokazuje.
- [ ] „?" w wierszu „Poziom N / M" na każdym poziomie otwiera właściwą planszę (np. na `obrot-osi` — parabolę).

**Kolory**
- [ ] Elipsa — turkus, parabola — fiolet, hiperbola — fuksja, lustro — błękit.
- [ ] Stałe krzywe są przygaszone; okręgi i bandy są czerwone.
- [ ] Fuksja (hiperbola) nie myli się z czerwienią przeszkód.

**Uchwyty**
- [ ] Pierścienie na ogniskach, romb na wierzchołku paraboli.

**Oś paraboli**
- [ ] Przerywana oś widoczna na każdym poziomie z parabolą, także stałą.

**Powrót ze starym zapisem**
- [ ] Przeglądarka z zapisem sprzed tej zmiany otwiera ten sam poziom co wcześniej (np. „Wspólne ognisko"), nie ten sam numer.

## 7. Odłożone

**Z poprzednich etapów, bez zmian:** szare strefy na poziomach etapów 1–3 (poziomy 1–16, 18,
20 w starej numeracji; patrz tabela w sekcji 5); mechanika „igły"; uchwyt rozmiaru elipsy
poza planszą na 9 poziomach etapów 1–2.

**Etap 4 z `do poprawy.txt`:** edytor poziomów, dwie zakładki (poziomy twórców i społeczności)
oraz weryfikacja, żeby społeczność wrzucała tylko działające poziomy.

**Drobne uwagi z przeglądów zadań (ledger), do segregacji w przeglądzie końcowym całej gałęzi:**

- *Postęp i numeracja (zad. 2, 4):* `LEGACY_ORDER` przypięty testem tylko w jednym indeksie
  (20); brak testu dokładnego wyniku dla `lastId` nie-stringa przy poprawnym `last`; `EMPTY`
  współdzielony (nikt nie mutuje); `tests/ui/handles.test.ts:354` mówi „poziom 21" bez notki
  o numeracji (do sprawdzenia grepem w pozostałych testach); asercja `LEVELS[20] ≠ wspolne-ognisko`
  nie zależy od zamiany; komentarz nad `BEZ_SZAREJ_STREFY` w starych numerach.
- *Poziomy etapu 0 (zad. 3):* zapas ±3° cienki (±2° wygrywa) na `odbicie` i `dwa-odbicia`;
  `resultBanner(n, 0).title` w banerze wygranej bez komentarza; `LEVELS.slice(8)` w
  `tests/ui/game.test.ts` pod nagłówkiem „etap 2" zaczyna się teraz od etapu 1; `W_GORE`
  współdzielony obiekt; test parzystości pomija poziomy z wachlarzem; brak testu, że `screens`
  woła `resultBanner` z liczbą piłek.
- *Styl (zad. 5):* lista `ALL: Handle[]` w teście stylu pisana ręcznie (nowy uchwyt nie
  oblałby testu); `dim`/`focus` nie sprawdzane niezależnie; brak testu łuku okręgu jako
  przeszkody; `shapeStyle` liczone w pętli uchwytów; `KIND_COLORS.elipsa.line` dubluje literał
  `PALETTE.curve`; poświata uchwytów 0.16 zamiast 0.22.
- *Rysowanie (zad. 6):* komentarz w `screens.ts` nad klinem („mały i przycięty do planszy")
  obejmuje też strzałkę, której nikt nie przycina (mieści się, ale komentarz do doprecyzowania);
  oś zdegenerowana (ognisko = wierzchołek) dałaby NaN — wykluczona przez `MIN_GAP`; testy
  strzałki i kreskowania nie przypinają rozchylenia 0.5 rad ani wzoru [6, 6]; strzałka przez
  `glowPolyline` z przezroczystą poświatą.
- *Plansze (zad. 7, 8):* strażnik łapie tylko równość dosłowną (odbicie lub przesunięcie
  rozwiązania przejdzie); tekst planszy przycinany do 4 linii bez testu, że każdy się mieści
  (najdłuższy ok. 125 znaków, na 320 px na granicy); test układu sprawdza ≥ 150 zamiast
  stałej 160; brak przypadku niskiego ekranu poziomego (568×320, kwadrat ok. 103 px); drugi
  palec przy otwartej planszy nie zeruje `dragging` (jak menu, sprzed zmiany); kółko „?" ma
  ok. 16 px (pole dotyku 160×44).
