# Golf geometryczny — etap 3: parabola i hiperbola

Data: 2026-09-20
Status: zaakceptowana (2026-09-20), gotowa do planu implementacji
Etap: 3
Poprzednie dokumenty: `2026-09-09-golf-geometryczny-design.md` (etap 1),
`2026-09-19-golf-etap-2-luki-design.md` (etap 2) wraz z trzema specyfikacjami poprawek.
Wszystko, czego ten dokument nie zmienia, obowiązuje nadal.

---

## 1. Istota

Etap 1 dał elipsę: z jednego ogniska każdy kierunek po jednym odbiciu trafia w drugie.
Etap 2 pozwolił krzywe ciąć i składać w kaskady. Etap 3 dokłada dwie pozostałe stożkowe —
i przy okazji obala wycenę „mały — same dane i warunki zwycięstwa" z mapy etapów
w §10 specyfikacji etapu 1.

Powód jest geometryczny, nie implementacyjny. **Żadna z dwóch nowych krzywych nie zbiega
sama z siebie:**

- **Parabola** z ogniska rozsyła tory **równolegle**. Punktowy dołek nie ma ich jak złapać.
- **Hiperbola** odbija promienie z bliskiego ogniska tak, jakby rozbiegały się z dalekiego —
  **rozbiega je**. Zbieżność działa wyłącznie w drugą stronę: tory *lecące w* dalekie
  ognisko wychodzą w bliskie. Ośmiu piłek wystrzelonych z jednego punktu nie da się tak
  ustawić bez wcześniejszego odbicia.

Dlatego etap 3 nie jest dosypaniem danych. Jest wprowadzeniem **konstrukcji
dwustopniowych** — i to jest jego temat dydaktyczny, a nie skutek uboczny. Gracz przestaje
budować jedno lustro, a zaczyna budować **układ optyczny**: pierwsza krzywa przygotowuje
wiązkę, druga ją zbiera.

Maszyneria pod to już istnieje. Kaskady i wiele elementów gracza na poziomie przyszły
z etapem 2; etap 3 wkłada w nie nowe krzywe.

### Co zostaje nienaruszone

Dołek jest punktem. **Wygrana to „wszystkie osiem wpadnie" — i nic ponadto. Piłki nie
muszą wpaść w tej samej chwili.** `trace` i `runProof` nie zmieniają kontraktu. Odrzucone
zostały oba warianty, które by to ruszyły: meta jako odcinek (osłabia puentę — osiem
piłek na linii zamiast błysku w punkcie) oraz zmiana warunku zwycięstwa na
`solved && simultaneous`.

---

## 2. Zakres

### W zakresie etapu 3

- Parabola i hiperbola w rdzeniu geometrycznym (postać kwadratowa, parametryzacja, parametr punktu)
- Drugi tryb ograniczania kawałka krzywej: **zakres parametru**, obok istniejącej cięciwy
- Długość wzdłuż krzywej dla nowych krzywych — do wyboru przez twórcę poziomu, obok zakresu parametru
- Nowe kształty w warstwie poziomów: `ParabolaShape`, `HyperbolaShape`
- Uchwyty: parabola `ognisko` + `wierzcholek`; hiperbola dziedziczy komplet elipsy
- Rysowanie nowych krzywych, kierownicy i asymptot (jako podpowiedzi)
- Osiem nowych poziomów (17–24)

### Poza zakresem etapu 3

- **Płynne przejście elipsa → parabola → hiperbola pod palcem gracza.** Specyfikacja etapu 1
  §4 obiecuje je na poziomie rdzenia i rdzeń je faktycznie ma (sześć liczb, typ jest
  wnioskiem z wyróżnika). Warstwa poziomów go **nie** dostaje: wymagałaby postaci
  ognisko–kierownica–mimośród zamiast `{f1, f2, a}`, czyli przepisania `EllipseShape`
  i szesnastu działających poziomów. Decyzja właściciela z 2026-09-20: nowe kształty
  dochodzą **addytywnie**, obietnica z §4 zostaje spełniona tylko w rdzeniu.
- Ruchome odcinki — bez zmian względem etapu 2.
- Edytor poziomów — etap 4.
- **Jednoczesność przybycia w jakiejkolwiek roli wiążącej.** Punkt 29
  z `decyzje-etap-1.md` obowiązuje bez osłabień: **wygrana to „wszystkie wpadną", piłki
  nie muszą przybyć w tej samej chwili**. Etap 3 nie czyni z jednoczesności ani warunku
  zwycięstwa dla gracza, ani warunku dopuszczenia poziomu, ani przedmiotu testu (§8).
  Występuje w tym dokumencie wyłącznie jako **fakt geometryczny** o konstrukcjach z §3 —
  nigdy jako bramka.

---

## 3. Kontrakt dowodu: konstrukcje dwustopniowe

### Parabola — dwie parabole naprzeciw siebie

Piłka stoi w ognisku pierwszej paraboli. Osiem torów odbija się od niej i wychodzi
**równolegle do jej osi**. Druga parabola, o osi równoległej i zwrócona naprzeciw,
przechwytuje wiązkę i skupia w swoim ognisku — tam leży dołek.

Droga jest stała po obu stronach: z ogniska do dowolnej prostej prostopadłej do osi
przez parabolę jest tyle samo (to jest definicja paraboli przez kierownicę), i tak samo
w drugą stronę. Suma dwóch stałych jest stała.

### Hiperbola — wspólne ognisko z elipsą

Piłka stoi w ognisku F₀ elipsy. Osiem torów odbija się od elipsy i zbiega ku jej drugiemu
ognisku M. Po drodze przechwytuje je gałąź hiperboli, której **dalsze ognisko leży
dokładnie w M**; odbija je do swojego bliskiego ogniska, gdzie czeka dołek.

Droga do punktu P na hiperboli wynosi `2aₑ − PM`, gdzie `2aₑ` to stała elipsy. Dalej
piłka leci `PF₂`. Razem:

```
2aₑ − PM + PF₂  =  2aₑ − (PM − PF₂)  =  2aₑ ∓ 2aₕ
```

bo `|PM − PF₂| = 2aₕ` jest definicją hiperboli. **Stała.** Znak zależy od gałęzi.

Na tej samej własności stoi lustro wtórne teleskopu Cassegraina — hiperbola dzieląca
ognisko z lustrem głównym przenosi ognisko układu tam, gdzie jest wygodne. I to jest
najmocniejszy argument za tym wariantem:
**obie konstrukcje zachowują jednoczesność przybycia.** Kulminacja z §7 specyfikacji
etapu 1 — osiem świateł zbiegających w jednym błysku — nie ginie w etapie 3.

To jest obserwacja o geometrii, nie reguła gry. **Jednoczesność nigdzie nie jest
warunkiem wygranej** — wygrana to „wszystkie wpadną", tak jak w etapach 1 i 2. Powyższy
rachunek mówi tylko tyle, że gdy gracz zbuduje układ zgodny z zamysłem poziomu, dostanie
wspólny błysk w nagrodę. Rozwiązanie, które trafia ósemką, ale rozjeżdża się w czasie,
jest **pełnoprawną wygraną**.

---

## 4. Rdzeń: ograniczanie krzywych nieograniczonych

### Problem, który trzeba rozwiązać przed czymkolwiek innym

Mechanizm łuku z etapu 2 stoi na jawnie zapisanym założeniu (`core/piece.ts`):

> Prosta przecina stożkową w co najwyżej dwóch punktach, więc cięciwa from→to dzieli
> KAŻDĄ stożkową na dwie części po przeciwnych stronach.

Dla hiperboli to jest **nieprawda**. Dla `x² − y² = 1` i cięciwy `x = √2` po stronie
zawierającej wierzchołek `(1, 0)` leży także **cała lewa gałąź**. `onPiece` przepuści
trafienie w gałąź, w którą piłka trafić nie powinna — a przy hiperbolach to nie jest
przypadek brzegowy, bo dalsza gałąź jest wklęsła dokładnie w stronę dołka.

Dla paraboli test cięciwy działa poprawnie; problemem jest tam tylko nieskończoność ramion.

### Rozwiązanie: zakres parametru

`Piece` dostaje drugi, niezależny tryb ograniczenia:

```ts
export interface Piece {
  conic: Conic
  /** etapy 1–2: cięciwa. Bez zmian. */
  arc?: Arc
  /** etap 3: zakres parametru we własnym układzie krzywej. */
  range?: ParamRange
}

export interface ParamRange {
  from: number
  to: number
  /** hiperbola: która gałąź. Dla pozostałych krzywych nieobecne. */
  branch?: 1 | -1
}
```

Kawałek ma **co najwyżej jeden** tryb ograniczenia. `Piece` z oboma naraz jest błędem
danych i ma go łapać test.

Zakres parametru rozwiązuje naraz trzy rzeczy: skończoność ramion, wybór gałęzi
i **odporność na gracza** — gdziekolwiek gracz przeciągnie uchwyt, kawałek pozostaje tym
samym kawałkiem tej samej gałęzi. To było rozstrzygające przy wyborze spośród wariantów;
przycięcie do planszy jest kruche dokładnie w tym miejscu.

### Parametryzacje

Wszystkie w układzie własnym krzywej, oś `u`, normalna `n = perp(u)`:

| Krzywa | Punkt o parametrze `t` | Uwaga |
|---|---|---|
| Elipsa | `C + u·a·cos t + n·b·sin t` | istniejąca, bez zmian |
| Parabola | `V + u·(t²/4p) + n·t` | `p = \|F − V\|`; `t` to odsunięcie poprzeczne |
| Hiperbola | `C + u·(s·a·cosh t) + n·(b·sinh t)` | `s = branch`; `b² = c² − a²` |

Parametryzacja paraboli jest liniowa w kierunku poprzecznym, co jest wygodne przy
próbkowaniu do rysowania: równe kroki `t` dają równomierne punkty wzdłuż ramienia.

### Nowe funkcje w `core/conic.ts`

- `parabolaFromFocusVertex(F, V) → Conic` — z `q = P − V`, `g(P) = (n·q)² − 4p(u·q)`.
  Wyróżnik wychodzi zero z konstrukcji, więc `classify` sklasyfikuje ją jako parabolę
  bez specjalnego traktowania.
- `hyperbolaFromFoci(f1, f2, a) → Conic` — **dosłownie `ellipseFromFoci` ze znakiem**:
  `ib = −1/b²` przy `b² = c² − a²`, i warunek wejściowy odwrócony na `a < c`.
- `conicParam(k, p) → { t, branch? }` — parametr punktu leżącego na krzywej, odwrotność
  powyższych parametryzacji.
- `conicAxisAngle(k) → number` — kąt osi dla dowolnej stożkowej.

`onPiece` zyskuje gałąź dla `range`: liczy `conicParam` i sprawdza przynależność do
zakresu oraz zgodność gałęzi. `rayConicAll`, `reflect`, `normalAt` i `trace` **nie
zmieniają się w ogóle** — to jest sens reprezentacji przez sześć liczb i potwierdzenie,
że architektura z etapu 1 uniosła to, co obiecała.

Zasada warstw obowiązuje: to nadal czysta geometria, `core/` niczego nie importuje.

---

## 5. Warstwa poziomów: kształty addytywne

```ts
export interface ParabolaShape {
  kind: "parabola"
  focus: Vec2
  vertex: Vec2
  span?: Span
}

export interface HyperbolaShape {
  kind: "hiperbola"
  f1: Vec2
  f2: Vec2
  a: number
  branch: 1 | -1
  span?: Span
}

/** Dwa sposoby opisania kawałka. Twórca poziomu wybiera, który pasuje. */
export type Span =
  | { mid: number; length: number }   // długość wzdłuż krzywej — jak etap 2
  | { mid: number; span: number }     // zakres parametru — nowe w etapie 3

export type MovableShape = EllipseShape | ParabolaShape | HyperbolaShape
export type Shape = MovableShape | SegmentShape
```

### Dlaczego oba sposoby opisu, a nie jeden

Etap 2 rozstrzygnął, że łuk opisuje **długość wzdłuż krzywej, nie kąt**, bo zakres kąta
rośnie razem z krzywą i gracz mógłby rozdmuchaną elipsą zastąpić całą kaskadę. Zakres
parametru zachowuje się jak kąt, więc sam wprowadziłby ten exploit z powrotem.

Decyzja właściciela z 2026-09-20: **implementujemy oba**, a twórca poziomu wybiera
narzędzie do zadania. Zakres parametru tam, gdzie liczy się odporność i wybór gałęzi;
długość tam, gdzie liczy się szczelność kaskady.

Koszt jest świadomy i zaakceptowany: długość wzdłuż krzywej dla hiperboli nie ma postaci
zamkniętej. Parabola ma (logarytm i pierwiastek), hiperbola dostaje **całkowanie
numeryczne** (Gauss–Legendre na stałej liczbie węzłów) z odwrotnością `długość → parametr`
przez bisekcję na monotonicznej funkcji. To jedyny nowy kod numeryczny w rdzeniu.
Przy 9.94 KB gzip z budżetu 100 KB stać nas.

`Span` jest unią rozróżnianą obecnością pola (`"length" in span`), nie znacznikiem —
dzięki temu **dane ośmiu poziomów etapu 2 kompilują się bez ani jednej zmiany**,
a `EllipseShape` dostaje wariant parametryczny za darmo. Istniejące `ArcRange` staje się
aliasem pierwszego wariantu.

### Zmiana, która przejdzie przez kilka plików

`PlayerPiece.start` i `PlayerPiece.solution` są dziś typu `EllipseShape` i rozszerzają się
do `MovableShape`. To dotknie `shape.ts`, `handles.ts`, `game.ts` i `screens.ts` —
ale każde miejsce wskaże kompilator, a `levelCurves` rozszerza się analogicznie.

`shapeConic` i `shapeToPiece` zyskują gałęzie dla dwóch nowych rodzajów. **Dla paraboli
i hiperboli `shapeToPiece` produkuje zawsze `Piece` z `range`, nigdy z `arc`** — także
wtedy, gdy twórca poziomu opisał kawałek długością. Wariant długościowy jest wówczas
przeliczany na zakres parametru przez odwrotność długości łuku. Cięciwa zostaje wyłącznie
dla elips i odcinków, bo dla hiperboli jest po prostu niepoprawna (§4).

---

## 6. Program nauczania: poziomy 17–24

| # | Tytuł | Czym rusza gracz | Czego uczy |
|---|---|---|---|
| 17 | Ognisko paraboli | ognisko (`wierzcholek` zablokowany) | z ogniska wszystko wychodzi równolegle |
| 18 | Rozmiar bez znaczenia | ognisko + wierzchołek | działa **każda** parabola — liczy się kierunek osi, nie rozmiar |
| 19 | Obrót osi | wierzchołek | oś celuje wiązką |
| 20 | Teleskop | dwie parabole | dwa ogniska, jedna wspólna oś |
| 21 | Wspólne ognisko | elipsa (hiperbola stała) | hiperbola przejmuje zbieżny pęk i przenosi go |
| 22 | Druga strona | hiperbola (elipsa stała) | to samo od drugiej strony |
| 23 | Która gałąź | hiperbola, obie gałęzie na planszy | gałąź należy do swojego ogniska |
| 24 | Zwieńczenie | dwie parabole + elipsa + hiperbola | dwie drogi do jednego dołka: pół wachlarza przez parę parabol, pół przez elipsę i hiperbolę |

**Poziom 17 wymaga uwagi przy budowie danych.** Parabola ma tylko dwa uchwyty, a oba
sterują kierunkiem osi: przy przybitym wierzchołku przeciągnięcie ogniska obraca oś
i zmienia rozmiar naraz. Gracz nie ma więc jak rozwiązać celowania osobno — i nie ma.
Poziom ma być zbudowany tak, że **gdy ognisko trafia w piłkę, oś sama celuje w drugą
parabolę**: jedna decyzja gracza, jedna lekcja. Kalibracja poziomu 17 polega właśnie na
ustawieniu wierzchołka tak, żeby ten warunek zachodził, a nie na zwężaniu tolerancji.

Poziom 18 jest celowym echem poziomu 2 z etapu 1: gra **nie wypowiada** niezmienniczości
rozmiaru, gracz ma ją odkryć ciągnąc uchwyt i widząc, że ósemka dalej wpada. Różnica
względem elipsy jest pouczająca — przy elipsie nie znaczył nic rozmiar, przy paraboli
nie znaczy nic rozmiar, ale znaczy wszystko **kierunek osi**.

**Poziom 24 — zmiana z 2026-09-26 (decyzja właściciela).** Pierwotny zapis „kaskada z trzech
krzywych" (parabola → elipsa → hiperbola w jednym łańcuchu) jest geometrycznie niewykonalny:
parabola rozsyła z ogniska wiązkę RÓWNOLEGŁĄ, a elipsa wiązki równoległej w punkcie nie skupia —
robi to wyłącznie druga parabola. Wykazane w trakcie realizacji teoretycznie i pomiarem.
Zwieńczenie łączy więc obie konstrukcje etapu równolegle: wachlarz dzieli się na dwie części,
jedna idzie przez parę parabol, druga przez elipsę i hiperbolę, a obie kończą w tym samym dołku.
Każda krzywa na planszy musi odbić co najmniej jedną piłkę rozwiązania — żadnej dekoracji.

Poziom 23 jest jedynym, na którym obie gałęzie hiperboli są widoczne na planszy. Czynna
jest ta wskazana przez `branch`; druga jest narysowana i **nie odbija**. To jest
zamierzone i ma być wyjaśnione podpowiedzią poziomu, bo inaczej wygląda jak usterka.

Parametry poziomów kalibruje się w trakcie implementacji; liczba i tematyka są ustalone.

---

## 7. Sterowanie i wygląd

### Uchwyty

| Krzywa | Uchwyty | Uwaga |
|---|---|---|
| Hiperbola | `ognisko1`, `ognisko2`, `rozmiar` | **komplet elipsy, bez zmian** |
| Parabola | `ognisko`, `wierzcholek` | wierzchołek niesie naraz obrót i rozmiar |

Typ `Handle` zyskuje `"wierzcholek"`. Zgodnie z zasadą z §8 etapu 1 — „obrót, mimośród
i położenie wynikają z pozycji uchwytów, więc nie są osobnymi stopniami swobody
i nie da się ich blokować niezależnie" — obrotu paraboli **nie** rozdzielamy od jej
rozmiaru. Elipsa tego nie robi i parabola też nie będzie.

Hiperbola trafia się szczęśliwie: dwa ogniska i punkt na krzywej to dokładnie ta sama
trójka uchwytów co elipsa, więc `handles.ts` obsługuje ją niemal istniejącym kodem.

### Dwa nowe niezmienniki blokujące

W duchu poprawek etapu 2 (gdzie zablokowany rozmiar musiał przestać uciekać):

1. **Hiperbola wymusza `a < c`.** Uchwyt rozmiaru nie przejdzie przez ognisko; przy
   ciągnięciu ogniska ku środkowi `a` schodzi razem z nim, zachowując zapas.
2. **`rozmiar` nie przeskakuje między gałęziami.** `branch` należy do danych poziomu,
   nie do palca. Uchwyt rozmiaru jest przycinany do czynnej gałęzi.

### Render

`render/shapes.ts` próbkuje nowe krzywe ich własnymi parametryzacjami, obcięte do zakresu.
Poświata jak dotąd: dwie kreski, `shadowBlur` nadal zakazany.

**Kierownica paraboli i asymptoty hiperboli** rysują się jako **podpowiedzi** — pod
istniejącym przełącznikiem z ekranu ustawień, domyślnie wyłączonym. Żadnej nowej opcji
w ustawieniach. Kierownica jest narzędziem dydaktycznym (definicja paraboli), asymptoty
tłumaczą, dlaczego gałąź ma taki a nie inny kształt; oba są pomocą, nie ozdobą, więc
należą tam, gdzie reszta pomocy.

### Wachlarz

Wachlarz z etapu 2 wchodzi do użytku w poziomach parabolicznych: piłka stoi w ognisku
i strzela w kierunki, z których tylko część trafia w kawałek paraboli. `sector` zawęża pęk
do tych, które trafiają.

`launchAngles` liczy dziś kąt bazowy przez `ellipseGeometry(aimCurve)`, co dla paraboli
**rzuca wyjątkiem** (brak środka, wyznacznik zero). Zastępuje je `conicAxisAngle`,
obsługujące wszystkie trzy stożkowe. Przesunięcie o ćwierć kroku z §6 etapu 1 zostaje.

---

## 8. Testowanie

Do istniejącej siatki dochodzą cztery pozycje:

| Test | Co łapie |
|---|---|
| Stała droga w konstrukcji dwustopniowej, na losowych danych | błędy w nowych postaciach kwadratowych, w normalnej i w odbiciu — odpowiednik testu `2a` z etapu 1 |
| `conicParam` jest odwrotnością parametryzacji, dla wszystkich trzech krzywych | błędy w wyborze zakresu i w rysowaniu |
| Trafienie w nieczynną gałąź hiperboli nie jest zaliczane | regresję do błędu cięciwy opisanego w §4 |
| Kawałek opisany długością i ten sam kawałek opisany zakresem parametru pokrywają się | błędy w całkowaniu długości łuku i w jego odwrotności — najbardziej ryzykownym nowym kodzie |

### Czego testy NIE wymagają: jednoczesności

**Piłki nie muszą wpaść w tej samej chwili, żeby poziom był wygrany.** Warunek zwycięstwa
jest dokładnie ten sam co w etapach 1 i 2 — „wszystkie osiem wpadnie" — i etap 3 go nie
rusza ani dla gracza, ani dla autora poziomu. Punkt 29 z `decyzje-etap-1.md` obowiązuje
bez wyjątku.

Nie ma więc testu żądającego `proof.simultaneous`. Rachunek z §3 pokazuje, że obie
konstrukcje **dają** jednoczesność, gdy gracz zbuduje układ zgodnie z zamysłem poziomu —
i to jest nagroda, a nie wymóg. Rozwiązanie trafiające ósemką rozjechaną w czasie jest
wygraną tak samo dobrą, a baner, tak jak od commitu `a385026`, po prostu nie chwali się
jednoczesnością, gdy jej nie było. Gra nie kłamie i niczego nie zabrania.

Kryterium 5% liczone **per element ruchomy**, jak rozstrzygnięcie 2 z `decyzje-etap-2.md`
(`ognisko1`: pudło w każdym z ośmiu kierunków; `ognisko2`: pudło w co najmniej sześciu).

Bez zmian obowiązują: test zakazu importów z `core/`, test budżetu 100 KB gzip, test
rozwiązywalności wszystkich poziomów i zakaz `shadowBlur`.

---

## 9. Ryzyka

**Kumulacja błędu przez dwa odbicia.** W konstrukcji dwustopniowej błąd ustawienia
przechodzi przez dwa odbicia i może się wzmocnić albo wygasić — nie wiemy z góry, która
możliwość zajdzie dla których poziomów. Jeśli przy `promieńDołka = 0.02` kryterium 5%
nie przejdzie dla poziomów 20–24, **schodzimy z promieniem, nie rozluźniamy kryterium**
— zgodnie z §6 i §11 etapu 1. Gdyby zaś błąd się wzmacniał tak, że poziom staje się
niewykonalny palcem, właściwą reakcją jest zmiana geometrii poziomu, nie tolerancji:
niezmiennik z §8 etapu 1 wiąże promień przyskakiwania z pasem tolerancji i musi pozostać
spełniony z zapasem.

**Uwarunkowanie hiperboli blisko asymptot.** Przy `a → c` hiperbola robi się płaska,
pierwiastki równania kwadratowego zbliżają się do siebie i uwarunkowanie się psuje —
to ten sam mechanizm, co ryzyko smukłych elips z §11 etapu 1. Lekarstwem jest
stabilniejsza postać wzoru na pierwiastki, **nie** większy epsilon. Niezmiennik
z §7 („hiperbola wymusza `a < c`" z zapasem) jest pierwszą linią obrony.

**Całkowanie numeryczne przy ciągnięciu.** Odwrotność `długość → parametr` dla hiperboli
liczy się w każdej klatce ciągnięcia uchwytu. Jeśli okaże się za wolna na telefonie, na
docelowe 60 klatek, reakcją jest spamiętanie wyniku między klatkami przy niezmienionym
kształcie — nie porzucenie wariantu długościowego, bo to on chroni kaskady.

**Budżet 100 KB.** Etap 3 dokłada kod numeryczny, dwie parametryzacje i osiem poziomów.
Zapas jest duży (9.94 KB w użyciu), ale kolejność cięć z §11 etapu 1 obowiązuje bez zmian:
nigdy smugi i nigdy dosłowność prędkości piłki, z której bierze się wspólny błysk. To jest
reguła o **animacji** — o tym, że nie wolno naginać tempa dla efektu — a nie o tym, kiedy
poziom jest wygrany.
