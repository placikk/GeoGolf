# Decyzje podjęte bez pytania — etap 3 (parabola i hiperbola)

Ten dokument spisuje rozstrzygnięcia z planu `2026-09-20-golf-etap-3-parabola-hiperbola`
(nagłówek planu, decyzje 1–2), rozstrzygnięcia podjęte w trakcie realizacji (ledger
`.superpowers/sdd/2026-09-20-golf-etap-3-parabola-hiperbola/progress.md`), decyzje
właściciela podjęte po drodze, oraz wynik weryfikacji końcowej (zadanie 16). Format jak
`decyzje-etap-2.md`.

Zadanie 16 nie miało przejazdu na telefonie/w przeglądarce — krok 3 planu (przejście
poziomów 17–24 palcem, potwierdzenie w `localStorage`) zostaje **checklistą dla
właściciela**, patrz sekcja „Co zostaje do sprawdzenia przez właściciela" na końcu.

---

## 1. Dwie decyzje planu odbiegające od litery specyfikacji

Zapisane w nagłówku planu, obowiązujące przez cały etap:

1. **Spec §4 zapowiada `conicParam(k, p)` odtwarzający parametr z samej postaci
   kwadratowej.** Plan przenosi układ własny krzywej do `ParamRange.frame` — warstwa
   poziomów, która i tak zna ognisko i wierzchołek, podaje go wprost. Powód: odtwarzanie
   geometrii paraboli z sześciu liczb wymaga rozkładu własnego macierzy części kwadratowej
   i domykania kwadratu — kilkadziesiąt linii kodu wrażliwego na przypadki brzegowe, gdy
   odwrotność parametryzacji przy danym układzie to jedna linia. Precedens w repozytorium:
   `Arc` niesie `from`/`via`/`to`, informacja jest zdublowana świadomie już tam. Koszt,
   jeśli źle: obietnica specu (§4) o płynnym przejściu elipsa→parabola→hiperbola pod palcem
   gracza spełnia się tylko w rdzeniu, nie w warstwie poziomów — udokumentowane też w spec
   etapu 3 §2 „Poza zakresem".
2. **Spec §5 zapowiada dla paraboli postać zamkniętą długości łuku, a dla hiperboli
   Gaussa–Legendre'a.** Plan liczy obie tą samą skumulowaną tablicą próbek, jak
   `src/levels/arc.ts` dla elipsy — bo tablica kawałkami liniowa ma dokładną odwrotność,
   a postać zamknięta plus Newton już nie, i bo „wszędzie liczymy TĄ SAMĄ funkcją" (cytat
   z komentarza `arc.ts`). Koszt, jeśli źle: gęstość próbkowania (512 próbek) jest wspólnym
   kompromisem dla obu krzywych, nie dobraną osobno dla każdej — zmierzone przy zadaniu 6:
   tablica jest o 25% rzadsza niż dla elipsy (0,0195 wobec 0,0156 na próbkę), ale promień
   dołka jest ~57× większy od tolerancji testu odniesienia, więc bez ryzyka praktycznego.

Dodatkowo, jako zasada projektowa nagłówka planu: **układ poziomów hiperbolicznych (21–24)
musi być pozaosiowy** — piłka, wspólne ognisko M i dołek na jednej prostej dawałyby stożek
odbity wracający dokładnie w lustro pierwotne, którego model poziomu nie umie opisać jako
jednego elementu gracza (elipsa z przerwą). Zweryfikowane w danych: `sinus` kąta piłka→M
i M→dołek wynosi ~0,375 (poziom 21/22), ~0,99 (poziom 24) — daleko od zera na obu.

---

## 2. Zadania dodane w trakcie realizacji

Plan zakładał 16 zadań; wykonanie dodało cztery, wszystkie udokumentowane w ledgerze jako
`Ruling` kontrolera:

- **11b** — pięć testów `tests/levels.test.ts` zakładały niejawnie elipsę: kryterium 5%
  dla ognisk nie sprawdzało paraboli (rozwiązanie dalej wygrywało po przesunięciu o promień
  przyskakiwania), zgodności zablokowanych uchwytów nie sprawdzały nowych krzywych, a sweep
  „jedna elipsa przez piłkę i dołek" (obrona przed obejściem hiperboli) budował dla hiperboli
  hiperbolę. Spec §8 wymaga kryterium 5% dla **każdego** elementu ruchomego — plan tego nie
  zrealizował. Koszt, jeśli źle: zadania 12–15 wywaliłyby suitę albo — gorzej — przeszły
  testy, które nowych poziomów w ogóle nie sprawdzają.
- **11c** — `dragHyperbola` nie dostawał `lockedA`; screens.ts liczyło `lockedA` tylko dla
  elipsy. Potwierdzone pomiarem na geometrii poziomu 22: objazd ogniskiem M blisko dołka
  obniżał `a` z 0,18 do 0,024 i nie wracał — poziom z zablokowanym rozmiarem byłby
  nie do wygrania, bez sygnału dla gracza. Dotyczy poziomów 22 i 23. Koszt, jeśli źle: jedno
  małe zadanie więcej.
- **15b** — gęsty skan szarych stref (krok 0,005, pierścień `SNAP_RADIUS…0,35`) na
  poziomach 21–23 znalazł setki punktów wygranych bez przyskoczenia, poza promieniem
  przyskakiwania — łamie niezmiennik §8 etapu 1 („każda wygrana jest wygraną dokładną").
  Zadanie skalibrowało `holeRadius` tych trzech poziomów na `HOLE_RADIUS/1000` i dodało
  gęsty test szarej strefy przez prawdziwe `applyDrag`.
- **15c** — audyt kontrolera potwierdził, że `screens.ts` niczego nie przycina (uchwyt idzie
  za palcem poza planszę `[-1,1]²`), a żaden z 24 poziomów nie ma elementu poza planszą
  w starcie/rozwiązaniu/przeszkodach — więc przycięcie zamyka całą klasę dokładnych obejść
  poza planszą (np. ognisko elipsy poziomu 21 w `(-0.2, 1.7)`, lustrzane odbicie dołka
  względem górnej ściany, dokładne 8/8 bez przycięcia). Koszt, jeśli źle: zmiana mechaniki
  widoczna dla gracza (uchwyt zatrzymuje się na brzegu planszy) — do zawetowania przez
  właściciela, jeśli komuś się nie spodoba.

---

## 3. Rozstrzygnięcia kontrolera podjęte w trakcie realizacji (ledger)

37 rulingów w ledgerze (35 zapisanych dosłownie jako `Ruling:`, plus dwa zapisane jako
`Ruling (2026-09-24): NOWE ZADANIE 11b`/`11c`, które nie łapią się na wyszukiwanie po samym
`Ruling:` — te dwa są opisane w sekcji 2, „Zadania dodane w trakcie realizacji", nie
powtarzam ich tutaj). Poniżej — po temacie, z uzasadnieniem i kosztem, jeśli źle; pełny
tekst każdego jest w `progress.md`.

**Zadanie 1 — kod z przerwanej sesji.** Subagent padł na limicie sesji po napisaniu kodu
i testów `conic.ts`, przed commitem. Ruling: nie resetuję drzewa — kod jest transkrypcją
briefu co do znaku, jedynie dowód RED przepadł, a jest odtwarzalny w minutę. Koszt, jeśli
źle: przegląd i tak dostaje pełny diff i by to wyłapał.
Drugi ruling tego zadania: uwaga recenzenta o „337/339 z dwoma pudłami" sprawdzona
osobiście jako 339/339 — wpadka raportowania wykonawcy, nie kod; zero kosztu.
Trzeci: sklejony nagłówek commita z trailerem (potwierdzone `git log`) wchodzi w rundę
naprawczą jako kosmetyka historii, bo gałąź nie była wypchnięta — amend bezpieczny.
Czwarty: przegląd powtórny tej rundy pominięty, bo poprawka to sam amend wiadomości
(hash drzewa identyczny przed/po) — nie ma diffu kodu do przejrzenia.

**Zadanie 3 — nieaktualny komentarz `onPiece`.** Komentarz twierdził, że cięciwa dzieli
KAŻDĄ stożkową na dwie części — dokładnie zdanie, które spec §4 cytuje jako fałszywe
założenie i powód istnienia trybu `range`. Poprawiony wbrew literze briefu („reszta bez
zmian"): spec jest wiążąca, plan jest jej argumentem. Do tej samej rundy wciągnięta uwaga
drobna (docstring obiecujący nieistniejący test pierwszeństwa `range` nad `arc`) — ta sama
klasa usterki w tym samym bloku, osobna runda kosztowałaby cały cykl za jedną linijkę.
Koszt obu, jeśli źle: sam komentarz/test, zero wpływu na zachowanie.

**Zadanie 4 — zmiana kąta startowego `shapeAxisAngle`.** Nowy kąt różni się o π od
starego `ellipseGeometry(...).angle` dla 8 z 34 kształtów, ale zbiór kierunków startu
(nie ich kolejność) jest identyczny we wszystkich 68 kombinacjach zbadanych niezależnym
skryptem. Ruling: przyjmuję zmianę — jedyny sens „zachowania" to zbiór kierunków dowodu,
nie ich numeracja; UI iteruje bez zależności od indeksu. Koszt, jeśli źle: gdyby gdzieś
liczyła się kolejność piłek (np. kolor i-tej), numeracja by się zmieniła — sprawdzone, że
nie liczy się.
Drugi ruling: nie dodaję wyjątku dla nieparzystej liczby piłek, mimo propozycji recenzenta
— spec etapu 1 §6 wprost rozważa nieparzystą liczbę jako przemyślany przypadek, nie błąd;
test pilnuje za to danych poziomów (muszą być parzyste, by argument o π się trzymał).
Trzeci: dwie uwagi drobne (test przypinający zwrot osi; nazwa testu kłamiąca po refaktorze)
wciągnięte do tej samej rundy, bo bez pierwszej uwaga ważna była zamknięta tylko w połowie.

**Zadanie 5 — brak rundy dla uwag drobnych.** Dwie uwagi (przypadek negatywny `Span`,
autoprzegląd wykonawcy zbyt pewny siebie) nie otwierają rundy — obie czysto poszerzają
pokrycie, a pełny cykl za jedną linijkę jest marnotrawstwem, przed którym ostrzega skill.
Koszt, jeśli źle: kontrakt typu `Span` sprawdzony tylko od strony pozytywnej do przeglądu
końcowego (zamknięte tutaj: negatyw nie był potrzebny, `spanRange` jest dyskryminowany
poprawnie w kodzie produkcyjnym).

**Zadanie 6 — `REACH` za małe.** Potwierdzone własnym pomiarem: przy osi po skosie
parabola (`p=1000`, wierzchołek `(-1,-1)`) i hiperbola mają w `t=4` punkty wewnątrz
`[-2,2]²`, ale próg powinien być `3√2 ≈ 4,243` (wierzchołek w `[-1,1]²`, skos daje
`max(|dx|,|dy|) = |d|/√2`). Naprawa: `REACH 4 → 5`, dowiedzione niezależnie przez recenzenta
jako wystarczające dla KAŻDEGO `b` i `p`, nie tylko dwóch zmierzonych przypadków. Koszt,
jeśli źle: kawałek opisany długością byłby po cichu ucinany tam, gdzie piłka jeszcze
powinna trafiać — usterka niewidoczna w testach etapu 3 (żaden poziom jeszcze tego nie
używał), ujawniłaby się w zadaniach 14–15 jako „piłki przelatują".
Drugi ruling: ekstrakcja wspólnego prymitywu wyszukiwania binarnego z `arc.ts`, mimo zakazu
ruszania tego pliku — rubryka nazywa dosłowną duplikację logiki uwagą ważną. Warunek:
bez zmiany logiki, potwierdzone pełną suitą i testem rozwiązywalności 16 wydanych poziomów.

**Zadanie 7 — test jednostkowości osi hiperboli nie dyskryminował.** Fikstura miała
ogniska w odległości dokładnie 1 — `norm()` był identycznością, usunięcie normalizacji
zostawiłoby suitę zieloną. Podniesione z drobnej do ważnej i naprawione (odstępstwo od
własnego precedensu zadania 5, uzasadnione: tu chodzi o obronę, którą sam kazałem postawić,
a która nie działa).

**Zadanie 7b — test parabol bez niezależnego oracle'a.** Test sprawdzał tylko rozrzut
długości (samospójność), nie wartość niezależną — nie wykryłby błędu skalującego obie
parabole jednakowo. Otworzone wbrew precedensowi zadania 5, bo to jedyny test chroniący
przesłankę całego etapu. Dowód realności luki: perturbacja jednostajna dała rozrzut
2,21e-8 (przechodzący pod starym progiem 1e-6), nowa asercja złapała różnicę 2,229e-8 przy
progu 5e-10 — stosunek 44,6×.

**Zadanie 8 — fałszywy komentarz o równomierności paraboli.** Własny błąd kontrolera:
napisane „punkty wychodzą równomiernie" jest nieprawdą (prędkość parametryzacji rośnie
o 41% na zmierzonym zakresie), a zbudowany na tym kontrast z hiperbolą też był fałszywy —
obie gęstnieją przy wierzchołku, różnym tempem. Naprawione wraz z dwiema brakującymi
klasami asercji (końce próbek, uporządkowanie i zawieranie punktów wewnętrznych) — bez
nich test paraboli nie miał ani jednej asercji odróżniającej poprawne próbkowanie od
przestawionego.
Osobny ruling: literówka/konwencja — commit `a708f29` po angielsku wbrew konwencji
repozytorium — odłożona (amend zmieniłby SHA już zweryfikowane przez przegląd powtórny;
koszt zmiany kosmetycznej większy niż korzyść).

**Zadanie 9 — błędny test blokady.** Brief żądał „wszystkie osiem odbija się dwa razy",
ale dwie piłki wpadały po jednym odbiciu — potwierdzone rachunkiem (`t = 2p·tan(δ/2)`,
przy δ=0,125 daje y=0,0375 < HOLE_RADIUS=0,0566). To błąd testu, nie kodu. Naprawa:
syntetyczny poziom testowy z `holeRadius: HOLE_RADIUS/3` (zapas 2×) wymusza prawdziwą drogę
dwustopniową. Znalezisko przeniesione do zadań 12–15 i do planu: ta sama współliniowa
geometria dotyczy prawdziwych poziomów 17–20 i osłabia kryterium 5% (zmaterializowało się
później na poziomie 17, patrz decyzja właściciela w sekcji 5).

**Zadanie 10 — błąd poprawnościowy `fit()`.** Wykonawca udowodnił błąd z briefu przed
naprawą: górna granica z podłogą `MIN_GAP*2` niezależną od `c` wypychała `a` powyżej `c`
przy bliskich ogniskach (`c=0,001 → a=0,002`), `hyperbolaFromFoci` rzucało w środku gestu
gracza. Ruling: przyjmuję diagnozę, ale WŁASNA propozycja poprawki recenzenta miała tę
samą wadę (zawodziła dla `c < 0,001`) — poprawny wzór musi zjeżdżać również dolną granicą
(`hi = c − min(MIN_GAP, c/2)`, `lo = min(MIN_GAP, hi)`), sprawdzone dla `c` od 0,5 do 1e-9.
Koszt, jeśli źle: gałąź `rozmiar` mogłaby rzucić przy hiperboli o ogniskach bliższych niż
0,2% szerokości planszy — nieosiągalne wtedy, ale poziomy 21–24 dopiero powstawały.

**Zadanie 12 — pierwotny komentarz przy `t17`.** Recenzent nazwał komentarz „niezręcznym",
kontroler podniósł do ważnej: komentarz był nieprawdziwy (twierdził, że gracz widzi
różnicę dołka — nie widzi, rysuje się zawsze 9 px; i „ok. 0,2 rad" — jest 0,125). Ta sama
klasa co zadanie 3 i 8: fałszywe komentarze traktowane jako ważne, konsekwentnie. Poprawka
z gotowym tekstem, przegląd powtórny pominięty (diff dowodliwie tylko w liniach komentarza).

**Zadanie 13 — start teleskopu dawał 5/8 przed dotknięciem.** Litera testu („start nie
wygrywa w całości") była spełniona, ale start ujawniał niemal całe rozwiązanie torami
z 2–4 odbić od ścian. Naprawa: te same ogniska, wierzchołki przechylone w drugą stronę —
zmierzone 0/8. Czternasta usterka planu: sprawdzał tylko „start nie wygrywa", nie odsetek
częściowy. Przegląd powtórny pominięty — poprawka była w całości określona znaleziskiem,
każda linia zweryfikowana pomiarem.

**Zadanie 14 — obejście „jedna elipsa przez piłkę i dołek" na poziomie 21.** Test
z osiągalnym przez gracza zakresem rozmiaru (nie z pełnym przeglądem `a`): przy
zablokowanym rozmiarze `a` jest czystą funkcją bieżących ognisk, niezależną od ścieżki —
sweep sprawdza wartość, którą gra faktycznie odda graczowi (`max(start.a, c+1e-3)`), nie
wartości niedostępne. Dowód żywotności wymagany i dostarczony: po chwilowym odblokowaniu
rozmiaru test musi oblać (padło przy `a=0,43`). Piętnasta usterka planu: test
pozaosiowości szukał hiperboli tylko wśród przeszkód, a na poziomie 22 hiperbola jest
elementem gracza — pętla się nie wykonywała.
Incydent tego zadania: patrz sekcja 9.

**Zadanie 15 — poziom 24 z planu jest niewykonalny.** Potwierdzone przez kontrolera:
parabola daje wiązkę ściśle równoległą, elipsa jej nie skupia — to twierdzenie, nie
kwestia kalibracji, błąd na poziomie specyfikacji §6. Przebudowa wykonawcy (elipsa
i hiperbola jako elementy gracza, parabola jako przeszkoda dekoracyjna — zmierzone: bez
niej nadal 8/8) NIE przyjęta jako zwieńczenie, bo test „trzy stożkowe" przechodził tylko
dzięki obecności elementu, który niczego nie robił. Przekazane właścicielowi — decyzja
w sekcji 5.
Drugi ruling: gęsty skan szarych stref wszystkich poziomów (kontroler, krok 0,005) — wynik
w sekcji 6.

**Zadanie 15b — przyjęcie `HOLE_RADIUS/1000`.** Dla gracza znaczy to dokładnie obietnicę
§8: przyskoczył → wygrywa (dokładność do 1e-15), nie przyskoczył → nie. Kruchość (zależność
od `MIN_GAP`) pilnuje test przesuwający ogniska przez prawdziwe `applyDrag`, nie przez
wartości teoretyczne.
Trzeci ruling tego zadania (nowe zadanie 15c) w sekcji 2.

Pozostałe rulingi (odstąpienia od procedury przeglądu powtórnego przy czysto kosmetycznych
poprawkach — zadania 1, 8, 12, 13 — oraz decyzje „nie otwieram rundy" dla uwag drobnych —
zadania 5, 9) są opisane wyżej przy właściwych zadaniach; pełny, dosłowny tekst każdego
jest w `progress.md`.

---

## 4. Decyzje właściciela podjęte w trakcie etapu

1. **Wygrana to „wszystkie wpadną" — bez wyjątków.** Piłki nie muszą wpaść w tej samej
   chwili; zakaz dodawania testu lub warunku żądającego `proof.simultaneous` obowiązywał
   przez cały etap (ograniczenie globalne planu, potwierdzone w spec etapu 3 §1 jako fakt
   geometryczny, nigdy jako bramka).
2. **Mniejszy dołek TYLKO na poziomie 17** (`HOLE_RADIUS/3`). Skracanie drogi przy osi
   (znalezisko zadania 9) łamie wspólny błysk ośmiu piłek na poziomach 17–20 (dwie piłki
   docierają ~0,5 s wcześniej). Promień, przy którym nic nie skraca, zawęża tolerancję
   celowania osią z ~11° do ~3,6° — dopuszczalne na 17 (jedynym wolnym uchwytem jest
   ognisko, przyskakujące dokładnie), niedopuszczalne na 18–20 (wierzchołek przeciągany
   palcem bez przyskakiwania, dołek bez skracania zawęziłby tolerancję celowania). Dołek
   rysuje się zawsze jako 9 px, więc zmiana jest dla gracza niewidoczna.
3. **Poziom 24 przeprojektowany na „dwie drogi do jednego dołka".** Łańcuch
   parabola→elipsa→hiperbola z planu jest geometrycznie niemożliwy (patrz sekcja 3,
   zadanie 15). Nowa konstrukcja: pół wachlarza przez parę parabol (parabola A → parabola B
   naprzeciw, osie współliniowe), pół przez elipsę i hiperbolę (do wspólnego ogniska M),
   wspólny dołek. Spec etapu 3 §6 zaktualizowana. Test „poziom 24 składa wszystkie trzy
   stożkowe" wzmocniony: każda krzywa (nie ściana) musi odbić co najmniej jedną piłkę
   rozwiązania — projekt geometrii zlecony świeżemu wykonawcy jako zadanie projektowe,
   nie kalibracyjne.
4. **Szare strefy: naprawić w etapie 3 tam, gdzie nic nie kosztuje — poziomy 21–23.**
   Wolne są tam tylko przyskakujące ogniska, więc mniejszy dołek (`HOLE_RADIUS/1000`) plus
   gęsty test szarej strefy nie kosztuje gracza nic. Poziomy 18 i 20 (wolny wierzchołek,
   pojedyncze wyspy wygranych) oraz wydane poziomy 1–16 (ognisko2 etapów 1–2, znany
   wyjątek „6 z 8") zostają osobnym zadaniem na później, z własną specyfikacją.
5. **Druga gałąź hiperboli rysowana tylko na poziomie 23 (2026-09-26, przegląd końcowy).**
   Specyfikacja, komentarz poziomu, podpowiedź i checklista obiecywały widoczną drugą
   gałąź, a gra rysowała tylko czynną. Rozstrzygnięcie: druga gałąź rysuje się blado
   (kolor i grubość linii podpowiedzi, ale niezależnie od przełącznika podpowiedzi), tylko
   na poziomie 23, pod flagą `twin` w danych poziomu. Jest wyłącznie rysunkiem — do
   `shapeToPiece` i dowodu nie trafia, więc nie odbija. Na 21, 22 i 24 zmieściłaby się na
   planszy tak samo, ale tam jej nie ma — z wyboru, nie z geometrii.
6. **Uchwyt rozmiaru elipsy poza planszą po przeciągnięciu ogniska — odłożony
   (2026-09-26).** Patrz sekcja 7, „Uchwyt rozmiaru elipsy poza planszą". Kod przeciągania
   się nie zmienia; sprawa idzie do osobnego zadania o szarych strefach i uchwytach.

---

## 5. Kalibracja końcowa poziomów 17–24

Dane odczytane wprost z `src/levels/stage3.ts` (stan HEAD `dc00754`).

| # | id | `holeRadius` | `maxBounces` | Kawałek gracza | `sector` | Co gracz rusza |
|---|---|---|---|---|---|---|
| 17 | ognisko-paraboli | `HOLE_RADIUS/3` ≈ 0,01886 | 4 | `KAWALEK {mid:0, span:1.2}` | `{center:π, width:2}` | tylko `ognisko` (`wierzcholek` zablokowany) |
| 18 | parabola-rozmiar | `HOLE_RADIUS` (standard) | 4 | `KAWALEK` | `{center:π, width:2}` | `ognisko` + `wierzcholek` (nic zablokowane) |
| 19 | obrot-osi | `HOLE_RADIUS` | 4 | `KAWALEK` | `UKOS {center:5π/4, width:2}` | tylko `wierzcholek` (`ognisko` zablokowane, przybite na piłce) |
| 20 | teleskop | `HOLE_RADIUS` | 4 | `KAWALEK` (×2 elementy) | `{center:π, width:2}` | oba elementy w pełni wolne (`ognisko`+`wierzcholek` każdy) |
| 21 | wspolne-ognisko | `HOLE_RADIUS/1000` | 3 | elipsa, łuk `deg(150)…deg(260)`, `a=0.78` | `{center:deg(215), width:1.4}` | elipsa cała zablokowana (`rozmiar`,`poczatek`,`koniec`) — de facto nieruchoma, lekcja jest w przeszkodzie hiperboli |
| 22 | druga-strona | `HOLE_RADIUS/1000` | 3 | hiperbola `a=0.18,b=1`, `span:{mid:0,span:1.6}` | `{center:deg(215), width:1.4}` | tylko dalsze `ognisko2` (`ognisko1`+`rozmiar` zablokowane) |
| 23 | ktora-galaz | `HOLE_RADIUS/1000` | 3 | hiperbola `a=0.2,b=1`, `span:{mid:0,span:1.8}` | `{center:deg(215), width:1.4}` | tylko dalsze `ognisko2` (`ognisko1`+`rozmiar` zablokowane) |
| 24 | zwienczenie-3 | `HOLE_RADIUS/5` ≈ 0,01131 | 3 | parabola A (`{mid:-0.21,span:0.34}`) + hiperbola (`a=0.18,b=1,{mid:0.6,span:0.8}`) | `{center:deg(247.5), width:deg(120)}` | `ognisko` paraboli A (`wierzcholek` zablokowany) + dalsze `ognisko2` hiperboli (`ognisko1`+`rozmiar` zablokowane) |

`HOLE_RADIUS` = `0.02 · DIAGONAL` = `0.02 · 2√2` ≈ `0,05657` (stała globalna, niezmieniona).

**Zmiany względem „papierowych" wartości planu:**
- `maxBounces` **wzrosło z domyślnych 4 do 3 tylko przez OBNIŻENIE**, nigdy w drugą stronę
  — poziomy 21–24 dostały **niższy** limit (3, nie 4), żeby odciąć pozorne trasy z trzecim/
  czwartym odbiciem od ściany, które żaden dołek nie usuwał. `maxBounces` nigdzie w etapie
  nie wzrosło ponad domyślne 4.
- `holeRadius` zejściał z domyślnego na czterech z ośmiu poziomów (17, 21, 22, 23 — trzy
  ostatnie identyczne przez `t21_23`; 24 osobno przez `t24`), zawsze w kierunku dół, zgodnie
  ze spec §9 („zwężaj kawałek/`holeRadius`, nigdy kryterium czy `SNAP_RADIUS`"). Żaden
  poziom nie zejściał z `SNAP_RADIUS` — niezmiennik z §8 etapu 1 trzyma się z zapasem od
  ~5× (poziom 24) do ~5000× (poziomy 21–23, patrz komentarz w `stage3.ts`).
- Poziom 21: konstrukcja z planu miała elipsę jako element gracza w bardziej klasycznym
  sensie; w realizacji ELIPSA POZIOMU 21 JEST W PEŁNI ZABLOKOWANA (`rozmiar`, `poczatek`,
  `koniec`) — lekcja poziomu przeniosła się w całości na przeszkodę-hiperbolę, bo sweep
  z zadania 14 wykazał, że przy WOLNYM rozmiarze elipsy gracz obchodzi hiperbolę wprost
  (ogniska elipsy na piłce i dołku). To jest zapisane wyżej (sekcja 3, zadanie 14) jako
  świadoma decyzja kontrolera, nie przeoczenie.
- Poziom 19: piłka i dołek nie są zaokrąglone do trzech miejsc (`±0,538`), tylko do pięciu
  (`±0,53787`) — zaokrąglenie do trzech miejsc chybiało o rząd 0,002 przy tej konstrukcji.

---

## 6. Liczba i charakter usterek znalezionych w planie/briefie

Ledger numeruje wprost co najmniej **15 usterek planu** (`usterka W PLANIE`, numerowane
od piątej do piętnastej przy zadaniach 7–14; pierwsze cztery i kilka pozostałych są opisane
bez numeru — np. przy zadaniach 1, 3, 4, 6, 8, 9 — więc rzeczywista liczba odrębnych
defektów jest **wyższa niż 15**, licząc też trzy usterki znalezione w przeglądzie
wstępnym przed startem, USTERKA A/B/C). Nie minimalizuję tej liczby — to normalny koszt
planu pisanego przed zobaczeniem kodu, złapany przez proces przeglądu, a nie oznaka
niedbałości: żadna z nich nie przeszła do kodu produkcyjnego bez wykrycia.

Nazwane kategorie, z przykładami:

- **Martwe importy.** Plan (zadanie 1) każe zaimportować `norm`, którego żadna funkcja nie
  używa (`tsconfig` ma `noUnusedLocals` — natychmiast złapane przez `tsc`). Test zadania 7b
  ma martwy import `scale`.
- **Fałszywe komentarze wpisane przez kontrolera do planu.** Co najmniej cztery: „cięciwa
  dzieli KAŻDĄ stożkową" (zadanie 3, zdanie, które spec §4 explicite nazywa nieprawdą),
  „nowy kąt jest dokładnie tym, co zwracało `ellipseGeometry`" (zadanie 4, różni się o π dla
  8/34 kształtów), „punkty paraboli wychodzą równomiernie" (zadanie 8, prędkość
  parametryzacji rośnie o 41%), „gracz widzi różnicę dołka" i „ok. 0,2 rad" przy poziomie 17
  (zadanie 12, dołek rysuje się zawsze 9 px, kąt to 0,125 rad).
- **Niepełne/błędne listy plików w zleceniach.** Zadania 7, 9 pominęły pliki testowe, które
  ich własne zmiany łamały (`tests/levels.test.ts`, `tests/ui/handles.test.ts`).
  Zadania 14, 15 (USTERKA C) używały w `tests/levels.test.ts` symboli, których plik nie
  importował.
- **Niedyskryminujące/puste testy.** Fikstura hiperboli zadania 7 miała ogniska w
  odległości dokładnie 1 — `norm()` był identycznością, usunięcie normalizacji przechodziłoby
  suitę bez zmian. Test parabol zadania 7b sprawdzał tylko samospójność, nie wartość
  niezależną. Test blokady zadania 9 żądał asercji nieprawdziwej dla rzeczywistej geometrii
  (**dokładnie „niemożliwa asercja testowa"**: „wszystkie osiem odbija się dwa razy", gdy
  dwie piłki wpadały po jednym). Test poziomu 13 (zadanie 13) sprawdzał tylko „start nie
  wygrywa w całości", nie odsetek — start dawał 5/8 torami przez ściany.
- **Błędne stałe liczbowe.** `REACH = 4` (zadanie 6) było za małe dla parabol/hiperbol
  o osi po skosie — powinno być 5, dowiedzione algebraicznie dla dowolnych `p`, `b`.
- **Błąd poprawnościowy, nie dokumentacyjny.** `fit()` (zadanie 10, z briefu, nie
  wprowadzony przez wykonawcę): górna granica zacisku `a` niezależna od `c` mogła wypychać
  `a` powyżej `c` dla bliskich ognisk hiperboli — `hyperbolaFromFoci` rzucałoby w środku
  gestu gracza. Jedyna usterka tej klasy w całym etapie (pierwsza „poprawnościowa" w słowach
  ledgera).
- **Niewykonalny projekt geometrii — poziom 24.** Największa i jedyna usterka na poziomie
  specyfikacji, nie tylko planu: łańcuch parabola→elipsa→hiperbola ze spec §6 jest
  geometrycznie niemożliwy (parabola daje wiązkę ściśle równoległą, ani elipsa, ani
  hiperbola jej nie skupiają — twierdzenie, nie kwestia kalibracji). Naprawiona decyzją
  właściciela (sekcja 4, punkt 3), nie kalibracją.
- **Nieaktualne ostrzeżenia w briefach.** Ostrzeżenie o `recordingCtx`/`closePath` przy
  zadaniu 11 było już nieaktualne (`pieces.test.ts` ma własny `recordingCtx`).

---

## 7. Prace odłożone

### Szare strefy poza zakresem etapu 3

Skan kontrolera (kopia `fd6b395`, krok 0,005, pierścień `SNAP_RADIUS…0,35` wokół każdego
wolnego celu, przez `applyDrag`):

| Element | Poziomy | Punkty wygrane bez przyskoczenia | Zasięg |
|---|---|---|---|
| `ognisko2` (znany wyjątek „6 z 8") | wszystkie 8 poziomów etapu 1, polelipsa, bandy, dwie-elipsy | 62–1769 | do 0,35 (granica skanu) |
| ognisko M | 21, 22, 23 (przed poprawką 15b) | 267–706 | do 0,35 |
| ogniska z SUROWYM kryterium (miało nie mieć wyjątków) | polelipsa ognisko1 (1 pkt, 0,339), kaskada ognisko1 (13, 0,190), dwie-elipsy ognisko1 (35, 0,237), parabola-rozmiar ognisko (1, 0,170), teleskop el.1 ognisko (6, 0,285), zwienczenie-3 (23, 0,271 — w naprawie przy skanie) | | |

Wniosek zapisany w ledgerze: **test 5% (8 kierunków w jednej odległości) nie egzekwuje
niezmiennika §8 i nigdy go nie egzekwował — to problem całego projektu, nie tylko etapu 3.**
Decyzja właściciela (sekcja 4, punkt 4): naprawione teraz tam, gdzie nic nie kosztuje
(poziomy 21–23, wolne są tylko przyskakujące ogniska). **Odłożone jako osobne zadanie,
z własną specyfikacją:** poziomy 18 i 20 (wolny wierzchołek, pojedyncze wyspy zwycięskie —
mniejszy dołek tam zawęża tolerancję celowania osią z ~11° do ~3,6°, co jest kosztem dla
gracza, nie darmową naprawą) oraz wydane poziomy 1–16 etapów 1–2.

### „Igła" — mechanika zablokowanego rozmiaru elipsy

Znalezisko zadania 15b: przy zablokowanym `rozmiar` i rozsuniętych ogniskach elipsa rośnie
do `a = c + MIN_GAP` — niemal zdegenerowana „igła", której oś przez dołek daje prawie-
trafienia. To mechanika sięgająca etapu 2 (dotyczy też wydanych poziomów eliptycznych),
nie defekt etapu 3. Naprawiona konsekwencja tego zjawiska (dokładne rozwiązania „igła
+ ściana" z ogniskiem poza planszą) — zamknięta zadaniem 15c (przycięcie do planszy); sama
mechanika „igły" jako taka — odłożona do tego samego przyszłego zadania o szarych strefach.

### Uchwyt rozmiaru elipsy poza planszą po przeciągnięciu ogniska (zadanie 15c)

Zadanie 15c przycina do planszy punkt, do którego gracz ciągnie uchwyt, a przy ciągnięciu
SAMEGO uchwytu rozmiaru ścina `a` tak, żeby ten uchwyt został w planszy (o ile istnienie
elipsy, `a > c`, na to pozwala). Nie pilnuje za to
uchwytu rozmiaru, gdy gracz ciągnie OGNISKO elipsy: `a` wtedy nie maleje
(`a = max(lockedA ?? a, c + MIN_GAP)`, koniec `applyDrag` w `src/ui/handles.ts`), a uchwyt
rozmiaru jedzie razem ze środkiem i osią — bez łuku stoi w `środek + oś·a`, z łukiem
w środku łuku. Wcześniejszy zapis tej sekcji („ułamek promila", „nie dotyczy żadnego
z 24 poziomów") był nieprawdziwy.

Pomiar z przeglądu końcowego (jedno przeciągnięcie każdego odblokowanego ogniska ze stanu
startowego, cele na brzegu i na siatce planszy, przez `applyDrag` z `lockedSize`, liczone
tylko odblokowane — czyli rysowane — uchwyty): uchwyt rozmiaru wychodzi poza planszę na
**9 poziomach etapów 1–2**: `rozmiar`, `skos`, `blisko`, `ciasna`, `przeszkoda`,
`dwie-przeszkody`, `bandy`, `zwienczenie`, `zwienczenie-2`. Najdalej do (−1,600; 0) na
`przeszkoda`, gdy `ognisko2` stanie na brzegu w (−1; 0) — 0,6 za brzegiem (tyle samo na
`skos` i `blisko`). Na `zwienczenie-2` (elipsa z łukiem) wystaje uchwyt w środku łuku,
o ok. 0,1. Poziomy 17–24 nie są dotknięte.

**Decyzja właściciela z 2026-09-26: odłożone** do osobnego zadania o szarych strefach
i uchwytach (to samo co „igła" wyżej). Kod przeciągania nie jest w etapie 3 zmieniany —
zachowanie elipsy na wydanych poziomach 1–16 zostaje takie jak dotąd.

### Drobne odłożone (minor, deferred) — zebrane z ledgera

- Zadanie 1: test niezmienniczości hiperboli na obrót bez sprawdzenia przesunięcia; testy
  błędów z gołym `.toThrow()` bez asercji na komunikat (przechodzą pusto w stanie RED).
- Zadanie 2: jednostkowość `axis` udokumentowana, ale nieegzekwowana (nie-jednostkowa oś
  po cichu skaluje parametr i psuje odwrotność); brak strażników przy `p=0`/`b=0`
  w `CurveFrame` (uzasadnione: dostaje wartości od zaufanej warstwy, nie odtwarza ich).
- Zadanie 3: `ARC_EPS` ma niespójne jednostki między parabolą (`t` = długość świata) i
  hiperbolą (`t` bezwymiarowe, tolerancja rośnie wykładniczo) — zmierzony zapas ~6 rzędów
  przy rozpiętościach poziomów, nieblokujące.
- Zadanie 5: brak przypadku negatywnego `@ts-expect-error` dla unii `Span` — zamknięte
  w fali poprawek po przeglądzie końcowym: `Span` jest teraz unią wyłączną (`?: never`),
  a test typów ma przypadki „oba pola" i „żadne".
- Zadanie 8: commit `a708f29` ma wiadomość po angielsku wbrew konwencji repozytorium
  (odłożone celowo, patrz sekcja 3).
- Zadanie 9: dwie bramki `kind === "elipsa"` w `screens.ts` bez lokalnego komentarza —
  zamknięte samo w zadaniu 10, które usunęło całe rusztowanie `ellipsePieces()`.
- Zadanie 11: kierownica testowana tylko dla osi poziomej; drobna duplikacja bloku
  podpowiedzi w dwóch pętlach `screens.ts` (wymuszone treścią briefu) — duplikacja
  zamknięta w fali poprawek po przeglądzie końcowym (lokalne `drawHints`).
- Zadanie 11b: słabsze skracanie `span` dla hiperboli (parametr bezwymiarowy) było
  niezweryfikowane, bo żaden poziom hiperboliczny jeszcze nie istniał — sprawdziło się samo
  przy zadaniach 14–15 (bez problemów).
- Zadanie 11c: objazd „ściśnięty" przesuwa każde wolne ognisko na PIERWOTNE położenie
  drugiego, więc przy hipotetycznej hiperboli z OBOMA ogniskami wolnymi i zablokowanym
  rozmiarem byłby zamianą, nie ściśnięciem — dziś nie ma takiego poziomu (22 i 23 blokują
  ognisko przy dołku, 24 ma hiperbolę jako przeszkodę).
- Zadanie 12: krok „przejście palcem w przeglądarce" niewykonany (patrz sekcja na końcu);
  stan uchwytu wierzchołka (nieaktywny na 17, aktywny na 18) niepokryty żadnym testem
  automatycznym.
- Zadanie 14: `!` w nowych testach — istniejący precedens w całej suicie, nieruszone.
- Przegląd końcowy: uchwyt rozmiaru elipsy wychodzi poza planszę po przeciągnięciu ogniska
  na 9 poziomach etapów 1–2 (do 0,6 za brzegiem) — odłożone decyzją właściciela
  z 2026-09-26 do zadania o szarych strefach i uchwytach; szczegóły w sekcji „Uchwyt
  rozmiaru elipsy poza planszą" wyżej.

---

## 8. Notatka właściciela do etapu 4 (`do poprawy.txt`)

Treść notatki (zmieniona 2026-09-25 08:56, odczytana przy zadaniu 14, ponownie przy
zadaniu 16): „zrobić jakby dwie zakładki, jedna na poziomy od nas (w sensie od twórców)
i druga na poziomy od społeczności; trzeba pewnie zrobić jakiś sposób weryfikacji, żeby
ludzie wrzucali tylko działające poziomy."

To **nie jest poprawka etapu 3** — jest pomysłem na etap 4 (edytor i dzielenie linkiem,
zgodnie z mapą etapów §10). Nie zrealizowane w tym etapie. Obserwacja do przekazania:
**istniejące testy poziomów są gotowym zalążkiem tej weryfikacji** — `tests/levels.test.ts`
już sprawdza dla każdego wydanego poziomu, że zapisane rozwiązanie faktycznie wygrywa,
że stan startowy nie wygrywa, kryterium 5% per element i przegląd obejścia „jedną elipsą
przez piłkę i dołek". Weryfikator poziomów społeczności może być tą samą baterią testów
uruchomioną na danych wgranych przez użytkownika, zamiast na danych z repozytorium.

---

## 9. Incydent: usunięty nieśledzony plik `a.out`

Podczas rundy naprawczej 1 zadania 14 implementator usunął nieśledzony plik `a.out`
(416 B, plik ELF), którego sam nie stworzył — najpewniej artefakt jakiegoś wcześniejszego
subagenta w tej samej rundzie. Plik nie występował w żadnym wcześniejszym sprawdzeniu
stanu repozytorium przez kontrolera. **`do poprawy.txt` (notatki właściciela) nietknięte.**
Zgłoszone właścicielowi w ledgerze w momencie odkrycia; dyspozycje dla kolejnych zleceń
zostały po tym incydencie zaostrzone (wprost: „nigdy nie usuwaj plików, których nie
stworzyłeś" — zasada, którą to zadanie 16 dziedziczy i którą się kieruje).

---

## 10. Weryfikacja końcowa (zadanie 16)

Wykonane na HEAD `dc00754`, drzewo czyste poza `do poprawy.txt` (nieśledzony, nietknięty).

- `npx tsc --noEmit` — czysto.
- `npm test` — **507/507 testów zielonych**, 24 pliki testowe.
- `npm run build` — paczka **33,82 KB / 12,44 KB gzip** (budżet < 100 KB, margines ponad
  8×). Rosła z wyjściowej 9,94 KB (baseline etapu 3) przez osiem nowych poziomów, nowe
  krzywe, uchwyty i podpowiedzi.
- Kryterium 5% dla wszystkich 24 poziomów (`npx vitest run tests/levels.test.ts -t "odpada"`
  — brief podawał filtr `-t "5%"`, ale żaden tytuł testu nie zawiera dosłownie „5%" (tylko
  komentarz nad testem); trzy testy kończą się słowem „odpada" i razem realizują kryterium
  5% z §6 etapu 1 dla `ognisko1`, `ognisko2` i ogniska paraboli. To kolejna, szesnasta
  nieścisłość brief/planu znaleziona w tym zadaniu — nieblokująca, bo testy same się
  wykonują w ramach `npm test`): **72/72 testów zielonych** (24 poziomy × 3 elementy
  kryterium), zero pominięć poza samym filtrem. PASS dla wszystkich 24 poziomów.

Krok 3 planu (przejazd 17–24 palcem w przeglądarce) **nie wykonany** — poza możliwościami
tego zadania (brak przeglądarki/dotyku). Zamiast tego, poniżej: checklista dla właściciela.

### Co zostaje do sprawdzenia przez właściciela (krok 3 planu)

Uruchomić `npm run dev`, przejść poziomy 17–24 **od stanu startowego, wyłącznie
przeciąganiem odblokowanych uchwytów** — bez edycji danych. Po każdej wygranej, w konsoli
przeglądarki:

```js
JSON.parse(localStorage.getItem("golf-geometryczny/postep")).solved
```

powinien zawierać `id` właśnie ukończonego poziomu. Zrzut ekranu nie wystarcza.

Konkretnie do sprawdzenia na każdym poziomie:

- **17 „Ognisko paraboli"** — łuk paraboli otwarty (nie pełna krzywa); uchwyt
  `wierzcholek` **zablokowany** (nie reaguje na dotyk); tylko `ognisko` się przesuwa
  i przyskakuje do piłki.
- **18 „Rozmiar bez znaczenia"** — łuk otwarty; uchwyt `wierzcholek` **wolny** (razem
  z `ognisko`) — sprawdzić, że dowolny rozmiar paraboli (inna ogniskowa) też wygrywa, jak
  w danych (`p` rozwiązania 0,22, inne niż startowe 0,3).
- **19 „Obrót osi"** — łuk otwarty; uchwyt `ognisko` **zablokowany** (przybity na piłce);
  tylko `wierzcholek` się przesuwa, celując osią.
- **20 „Teleskop"** — łuk otwarty na obu parabolach; **wszystkie cztery uchwyty wolne**
  (dwa `ognisko`, dwa `wierzcholek`).
- **21–23** — sprawdzić, że **obie gałęzie hiperboli są rysowane** na poziomie 23
  („Która gałąź"), a odbija tylko jedna (ta obejmująca swoje ognisko) — druga jest tylko
  rysunkiem, dokładnie jak mówi podpowiedź poziomu. Druga gałąź jest blada (jak linie
  podpowiedzi) i widać ją także przy wyłączonych podpowiedziach; na 21 i 22 (oraz 24)
  rysuje się tylko czynna gałąź.
- **Wszystkie poziomy 17–24** — podpowiedzi z krzywymi (kierownica paraboli, asymptoty
  hiperboli) są **za przełącznikiem w ustawieniach**, nie widoczne domyślnie — sprawdzić,
  że przełącznik faktycznie je pokazuje/chowa.
- **24 „Zwieńczenie"** — sprawdzić **dwie odrębne drogi** wachlarza do jednego dołka:
  część piłek (kąty 195°–240°) przez parę parabol, reszta (255°–300°) przez elipsę
  i hiperbolę do wspólnego ogniska M; obie grupy powinny wpadać, mimo że nie w tej samej
  chwili (rozrzut dróg ~0,09 — patrz zadanie 15, przegląd powtórny).
- **Uchwyty zatrzymują się na brzegu planszy** `[-1,1]²` na wszystkich ośmiu poziomach —
  spróbować przeciągnąć każdy wolny uchwyt daleko poza widoczną planszę i sprawdzić, że
  zatrzymuje się na krawędzi, nie ucieka pod pasek napisów/przycisków.
- **Stan startowy** każdego poziomu — potwierdzić, że „Sprawdź" na starcie (bez żadnego
  przeciągnięcia) **nie** daje wygranej. Zmierzone na kodzie finalnym (`npx vite-node
  scripts/sprawdz-poziom.ts <id>`, commit `cca7d2d`, ten sam, na którym zamknięto zadanie
  16 — nie skopiowane z ledgera, bo część liczb w ledgerze jest z etapów PRZED późniejszą
  kalibracją dołka i już nieaktualna, patrz niżej): 17 „ognisko-paraboli" → 1/8; 18
  „parabola-rozmiar" → 1/8; 19 „obrot-osi" → 1/8; 20 „teleskop" → 0/8; 21 „wspolne-ognisko"
  → 0/8; 22 „druga-strona" → 0/8; 23 „ktora-galaz" → 0/8; 24 „zwienczenie-3" → 0/8. Jeśli
  faktyczny wynik na urządzeniu właściciela różni się od tych ośmiu liczb, to regresja.

---

## 11. Aktualizacja mapy etapów

Wykonana w `docs/superpowers/specs/2026-09-09-golf-geometryczny-design.md` §10 razem
z tym dokumentem — wiersz etapu 3 zamieniony z „mały — same dane i warunki zwycięstwa" na
rzeczywistą wycenę wraz z odsyłaczem do specyfikacji etapu 3, a „Parabola i hiperbola
(etap 3)" usunięte z sekcji „Poza zakresem v1". Powód błędnej pierwotnej wyceny: **żadna
z dwóch nowych krzywych nie zbiega z jednego ogniska w drugie samodzielnie** (parabola
rozsyła tory równolegle, hiperbola je rozbiega, nie zbiega) — etap wymagał konstrukcji
dwustopniowych (dwie krzywe w łańcuchu) i nowego trybu ograniczania kawałka krzywej
(zakres parametru, obok istniejącej cięciwy), a nie tylko nowych danych poziomów i nowego
warunku zwycięstwa. Zapisane w spec etapu 3 §1 jako powód geometryczny, nie
implementacyjny.
