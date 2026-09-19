# Golf geometryczny — etap 2: łuki i odcinki

Data: 2026-09-19
Status: zaakceptowana w rozmowie, czeka na przegląd pliku
Etap: 2
Poprzedni dokument: `2026-09-09-golf-geometryczny-design.md` (etap 1) — wszystko,
czego ten dokument nie zmienia, obowiązuje nadal.

---

## 1. Istota

Etap 1 dał graczowi jedną pełną elipsę. Etap 2 pozwala **ciąć krzywe**: lustro nie musi
być całą elipsą, wystarczy jej łuk — i dopiero wtedy piłka może przez przerwę w łuku
polecieć dalej, do następnej krzywej. Z tego wyrastają dwa nowe tematy:

- **kaskady** — ognisko jednej krzywej jest wejściem drugiej: piłka odbija się od
  pierwszego łuku do wspólnego ogniska M, przelatuje przez nie i drugi łuk kieruje ją
  do dołka;
- **krzywe współogniskowe** — lustro złożone z kawałków *różnych* elips o tych samych
  ogniskach nadal skupia wszystko w drugim ognisku.

Do tego dochodzą **odcinki prostych** jako ściany — spec etapu 1 je obiecywał, ale
ściany były tam nieskończone. Łuk i odcinek to ta sama zmiana w rdzeniu: zakres na
krzywej.

### Zasada nadrzędna: czym rusza gracz, decyduje twórca poziomu

Na każdym poziomie ma być niewiele ruchomych elementów, ale gra niczego nie zakłada
z góry. Poziom deklaruje listę elementów gracza (jeden, dwa — elipsa albo łuk) i dla
każdego z osobna, które uchwyty są zablokowane. Ta sama zasada dotyczy wachlarza
strzału (§4).

---

## 2. Zakres

### W zakresie etapu 2

- Łuki stożkowych i odcinki prostych w rdzeniu (`Piece`)
- Dowód w wachlarzu ustalanym przez twórcę poziomu; domyślnie 360° jak w etapie 1
- Model poziomu z listą elementów gracza i uchwytami blokowanymi per element
- Uchwyty końców łuku
- Przyskakiwanie ognisk także do ognisk przeszkód i innych elementów gracza
- Rysowanie łuków, odcinków, wachlarza i ognisk stałych elips
- Migracja ośmiu poziomów etapu 1 bez zmiany ich zachowania
- Osiem nowych poziomów (9–16)

### Poza zakresem

- Ruchome odcinki (gracz rusza tylko elipsami i łukami elips; model pozwoli je dodać
  bez przebudowy)
- Parabola i hiperbola — etap 3; rdzeń etapu 2 jest na nie gotowy bez zmian (§3)
- Edytor poziomów — etap 4
- Dwa wycięte takty animacji (błysk odbicia, rozbłysk dołka) — decyzja właściciela
  z 2026-09-19, bez zmian
- Jednoczesność przybycia jako warunek wygranej — wygrana to nadal „wszystkie wpadną”
  (decyzja właściciela, punkt 29 w `decyzje-etap-1.md`). Na łukach współogniskowych
  różnych rozmiarów drogi się różnią; baner po prostu się jednoczesnością nie chwali.

### Dlaczego nie „łuki z elipsy” zamiast prostych i parabol

Bardzo duża elipsa jest *lokalnie prawie* prostą, ale to „prawie” trafia prosto
w tolerancję dołka: normalna jest odrobinę przekrzywiona, a na dalszym torze błąd
rośnie. Elipsa spłaszczona do zera (b → 0) degeneruje w podwójny odcinek i psuje
uwarunkowanie równania kwadratowego. Prosta zostaje prostą (A = B = C = 0, darmowa
w silniku), parabola zostaje parabolą. Zamiast tego rdzeń przycina krzywe **w sposób,
który nie zależy od typu krzywej** — to jest właściwa inwestycja w etap 3.

---

## 3. Rdzeń

### Reprezentacja łuku

Nowy plik `core/piece.ts`:

```ts
interface Arc { from: Vec2; via: Vec2; to: Vec2 }   // via: dowolny punkt na zachowanej części
interface Piece { conic: Conic; arc?: Arc }          // brak arc = cała krzywa
```

Łuk nie zapisuje flagi „która strona cięciwy”, tylko **punkt `via` leżący na
zachowanej części**. Jest to jednoznaczne, czytelne w danych („od A przez B do C”)
i nie da się pomylić znaku.

### Test przynależności trafienia do łuku

**Fakt, na którym stoi cała konstrukcja:** prosta przecina stożkową w co najwyżej dwóch
punktach, więc cięciwa przez końce łuku dzieli **każdą** stożkową na dokładnie dwie
części leżące po przeciwnych stronach cięciwy. Dla elipsy są to dwa łuki (także gdy
zachowany jest większy niż połowa); dla paraboli — odcinek między końcami i dwa
ramiona po drugiej stronie; dla hiperboli analogicznie.

- **Stożkowa niebędąca prostą:** trafienie P należy do łuku, gdy leży po tej samej
  stronie cięciwy `from→to` co `via` (znak iloczynu wektorowego). Końce łuku liczą się
  włącznie, z tolerancją rzędu `1e-9`.
- **Prosta:** P należy do odcinka, gdy jego rzut na `from→to` mieści się między końcami
  (włącznie, ta sama tolerancja). `via` nie jest używany.

Rdzeń rozróżnia wyłącznie „prosta / nie prosta”, co już dziś wynika z `classify`.
Parabola i hiperbola przejdą tą samą gałęzią co elipsa.

Odrzucone alternatywy:
- *zakres parametru na krzywej* — rdzeń musiałby znać typ krzywej, żeby ją
  sparametryzować; łamie zasadę „typ krzywej to wniosek, nie pole” (§4 etapu 1);
- *łuk jako łamana* — normalne skaczą na łączeniach, twierdzenie `2a` traci sens.

### Przecięcia

- `rayConicAll(p, d, k): number[]` — wszystkie pierwiastki `t > EPS_T`, posortowane
  rosnąco (ta sama stabilna postać wzoru i ta sama gałąź liniowa co dziś).
- `rayConic(p, d, k)` — pierwszy element `rayConicAll` albo `null`. Zachowanie i testy
  etapu 1 bez zmian.
- `rayPiece(p, d, piece): number | null` — pierwsze `t`, którego punkt należy do łuku.
  Gdy bliższe trafienie wypada w przerwie łuku, piłka leci do dalszego.

### Śledzenie toru

`trace` przyjmuje `curves: Piece[]` zamiast `Conic[]`. Normalna i odbicie bez zmian —
łuk nie zmienia krzywej, tylko to, gdzie da się w nią trafić.

### Dowód w wachlarzu

`ProofInput` dostaje opcjonalne `sector?: { center: number; width: number }` (kąty
w radianach, w układzie świata).

- **Brak `sector`:** zachowanie identyczne z etapem 1 — 360°, baza na osi wielkiej
  `aimCurve`, przesunięcie o ćwierć kroku.
- **Z `sector`:** kierunki `center − width/2 + (i + ½)·width/n` dla `i = 0..n−1` —
  równo wewnątrz wachlarza, żadna piłka nie leci po samej krawędzi.

Podgląd dwupiłkowy używa tego samego wzoru z `n = 2`.

### Dlaczego wachlarz jest konieczny

Kaskada przy strzale na 360° jest **niemożliwa**, a nie tylko trudna. Promień, który
po odbiciu w P przeleci przez wspólne ognisko M, trafia w pierwszą elipsę w punkcie Q.
Ale strzał z piłki wprost w Q też odbiłby się do M — więc łuk musi mieć przerwę w Q,
żeby piłka mogła wylecieć, a wtedy piłka strzelona w stronę Q nie ma od czego się
odbić. Wachlarz rozwiązuje to uczciwie: ósemka dalej jest dowodem, tylko na węższym
zakresie kierunków. Łuki współogniskowe tego problemu nie mają i mogą działać na 360°.

### Zasada warstw

Bez zmian. `piece.ts` importuje wyłącznie z `core/`. Test warstw obejmuje nowy plik
automatycznie.

### Testy rdzenia

| Test | Co łapie |
|---|---|
| Twierdzenie `2a` na łukach: losowe łuki elips, wachlarz skierowany w łuk | błędy przycinania, które psują trafienia wewnątrz łuku |
| Bliższy pierwiastek w przerwie → trafienie w dalszy | `rayPiece` zwracające pierwsze trafienie bez sprawdzenia łuku |
| Trafienie tuż za końcem odcinka nie jest trafieniem | test rzutu z odwróconą nierównością lub bez tolerancji |
| Łuk większy niż pół elipsy, `via` po „dużej” stronie | test strony cięciwy z zakodowanym na sztywno znakiem |
| Końce łuku włącznie | test ostry zamiast nieostrego |
| `rayConicAll` zwraca oba pierwiastki posortowane, `rayConic` = pierwszy | rozjazd starej i nowej funkcji |
| Kąty wachlarza mieszczą się w sektorze i są równo rozłożone | zły wzór na kierunki |
| Brak `sector` → wynik identyczny z etapem 1 | regresję dowodu 360° |

Zgodnie z wnioskiem z etapu 1 (punkt 20 w `decyzje-etap-1.md`): testy graniczne mają
ćwiczyć **samą granicę**, na wartościach dokładnie reprezentowalnych, a fixture'y nie
mogą być symetryczne wokół zera tam, gdzie symetria maskowałaby błąd.

---

## 4. Model poziomu

```ts
type Handle = "ognisko1" | "ognisko2" | "rozmiar" | "poczatek" | "koniec";

interface EllipseShape {
  kind: "elipsa";
  f1: Vec2; f2: Vec2; a: number;
  /** parametr elipsy (x = a·cos t, y = b·sin t w układzie własnym, oś od f1 do f2),
   *  łuk biegnie przeciwnie do ruchu wskazówek zegara od start do end */
  arc?: { start: number; end: number };
}
interface SegmentShape { kind: "odcinek"; from: Vec2; to: Vec2 }
type Shape = EllipseShape | SegmentShape;

interface PlayerPiece { start: EllipseShape; solution: EllipseShape; locked: Handle[] }

interface Level {
  id: string; title: string; hint: string;
  ball: Vec2; hole: Vec2;
  pieces: PlayerPiece[];          // czym rusza gracz — jeden lub więcej elementów
  obstacles: Shape[];             // stałe: łuki, okręgi, odcinki
  sector?: { center: number; width: number };
  test: { balls: number; maxBounces: number; holeRadius: number };
}
```

### Ustalenia

- **Końce łuku to parametr elipsy w jej układzie własnym**, nie kąt biegunowy.
  Przeliczenie na punkt jest wtedy dokładne i nie zależy od mimośrodu, a łuk jedzie
  razem z elipsą, gdy gracz przesuwa ogniska.
- **`shapeToPiece(shape): Piece`** w `levels/` przelicza kształt dla rdzenia: `from`
  i `to` z parametrów końców, `via` z parametru środkowego. Odcinek → prosta przez
  końce z `arc = { from, via: środek, to }`.
- **Okrąg to elipsa z `f1 = f2`** (`a` = promień). Osobny typ okręgu znika.
- **Uchwyty blokowane są per element**, nie per poziom. Twórca poziomu składa z nich
  dowolny zakres ruchu, np.:
  - „przesuwasz ogniska, łuk ma stały zakres” — zablokowane `poczatek`, `koniec`, `rozmiar`;
  - „elipsa stoi, przycinasz ją” — zablokowane `ognisko1`, `ognisko2`, `rozmiar`;
  - „wszystko wolno” — nic nie zablokowane.
- **Kierunek bazowy dowodu 360°** to oś pierwszego elementu gracza — jak w etapie 1.
- `levelCurves(level, pieces)` zwraca `Piece[]`: elementy gracza, potem przeszkody.

### Migracja poziomów etapu 1

Mechaniczna: `start`/`solution`/`locked` przechodzą do `pieces[0]`, przeszkody
`{center, radius}` na elipsy z `f1 = f2 = center`, `a = radius`. **Identyfikatory
poziomów zostają**, więc zapisany postęp gracza przetrwa aktualizację. Wszystkie
testy etapu 1 muszą przejść bez zmiany oczekiwań — to jest dowód, że migracja
niczego nie zmieniła.

### Testy poziomów

- każde zapisane rozwiązanie przechodzi dowód w wachlarzu danego poziomu;
- każdy start jest nierozwiązany;
- **kryterium 5% z §6 etapu 1, per element:** przesunięcie każdego odblokowanego
  ogniska o 5% przekątnej planszy powoduje pudło co najmniej jednej piłki;
- **odporność na krawędź łuku:** rozwiązanie przechodzi także po skróceniu każdego
  łuku (gracza i przeszkód) o 1° parametru z obu stron — żadne rozwiązanie nie może
  opierać się na piłce muskającej koniec łuku;
- każdy kształt daje się skonstruować (`a > c`).

---

## 5. Rysowanie

- **`piecePolyline(piece)`** obok `conicPolyline`: dla łuku elipsy wyznacza parametry
  punktów `from` i `to` na elipsie i próbkuje między nimi w tym kierunku, który
  przechodzi przez `via`. Końce łuku leżą w łamanej dokładnie. Odcinek to dwa punkty.
  Pełna krzywa — jak dziś.
- Poświata nadal przez podwójny obrys; zakaz `shadowBlur` obowiązuje.
- **Wachlarz widoczny w trybie edycji:** blady klin od piłki, rysowany tylko wtedy,
  gdy poziom ma `sector`. Bez niego łuk „nie tam, gdzie lecą piłki” wyglądałby na błąd
  gry.
- **Ogniska stałych elips rysowane blado** (dwie małe kropki). Lekcje poziomów 12 i 13
  brzmią „trafić ogniskiem w *to* ognisko” — bez widocznych ognisk byłyby zgadywanką. Punkt M
  poziomu 15 nie jest ogniskiem przeszkody, więc tam naturalnie nie jest pokazany.

---

## 6. Sterowanie

- Stan gry trzyma `pieces: EllipseShape[]` zamiast jednej elipsy. Cofnij i Reset
  działają na całej liście.
- `pickHandle` przeszukuje odblokowane uchwyty wszystkich elementów i wybiera
  najbliższy.
- **Uchwyty końców łuku** leżą na krzywej. Przy przeciąganiu kąt palca w układzie
  elipsy przelicza się na parametr — uchwyt ślizga się po krzywej i nie może z niej
  zejść.
- **Minimalna długość łuku** ok. 10° parametru; końce nie mogą się minąć.
- **Przyskakiwanie ognisk** do: piłki, dołka, ognisk przeszkód, ognisk pozostałych
  elementów gracza. Bez tego kaskada z dwóch elementów gracza (dwa ogniska w tym samym
  M) byłaby palcem niewykonalna, z tego samego powodu co w §8 etapu 1. Niezmiennik
  „promień przyskakiwania ≥ pas tolerancji” pozostaje nietknięty — przybywa tylko celów.
- Pasek dolny (Sprawdź, Cofnij, Reset), ekrany wygranej i porażki — bez zmian.

### Testy sterowania

- wybór uchwytu przy dwóch elementach, gdy uchwyty obu są w zasięgu — wygrywa bliższy;
- uchwyt końca łuku po przeciągnięciu leży na krzywej;
- minimalna długość łuku — test na samej granicy;
- przyskakiwanie ogniska do ogniska przeszkody i do ogniska drugiego elementu gracza.

---

## 7. Program poziomów etapu 2

Poziomy dopisane po ośmiu z etapu 1 (w menu: 9–16). Liczba i tematyka są ustalone;
dokładne parametry kalibruje się w trakcie implementacji.

| # | Temat | Czym rusza gracz | Wachlarz | Czego uczy |
|---|---|---|---|---|
| 9 | Półelipsa | ogniska łuku | 180° w stronę łuku | lustro potrzebne jest tylko tam, dokąd lecą piłki |
| 10 | Bandy | elipsa | 360° | ściany-odcinki jako przeszkody; elipsa musi się zmieścić |
| 11 | Przycinanie | końce łuku (elipsa stoi) | 360° | przyciąć łuk, żeby ominąć przeszkodę albo odsłonić drogę |
| 12 | Współogniskowe | rozmiar łuku | 360° | plansza ma łuk jednej elipsy, gracz domyka resztę łukiem **innej** elipsy o tych samych ogniskach — lustro nie musi być jedną krzywą |
| 13 | Kaskada | ogniska pierwszego łuku | wąski | drugi łuk stoi i prowadzi z M do dołka; trafić ogniskiem w M — ognisko jednej krzywej jest wejściem drugiej |
| 14 | Kaskada od końca | drugi łuk | wąski | pierwszy łuk stoi, gracz buduje wyjście |
| 15 | Dwie elipsy | oba łuki | wąski | cała kaskada w rękach gracza, M nie jest pokazane |
| 16 | Zwieńczenie | wg twórcy poziomu | wąski | kaskada, bandy i przeszkoda razem |

Dwa ruchome elementy pojawiają się dopiero na poziomie 15 — zgodnie z zasadą „nie za
dużo ruchomych elementów”.

---

## 8. Ryzyka

**Trafienie dokładnie w koniec łuku.** Piłka muskająca krawędź może się odbić albo
przelecieć zależnie od ostatniego bitu. Końce włącznie z tolerancją, a test odporności
na krawędź (§4) gwarantuje, że żadne wydane rozwiązanie na tym nie polega.

**Poziom 15 za trudny.** Dwie wolne elipsy to dużo stopni swobody na telefonie.
Kalibrujemy w trakcie; w razie potrzeby blokujemy jeden uchwyt — mieści się to
w zasadzie „twórca poziomu decyduje”.

**Migracja modelu poziomu.** Dotyka każdego pliku `ui/` i `levels/`. Dlatego idzie
przed jakimkolwiek nowym poziomem i jest weryfikowana na ośmiu znanych poziomach
niezmienionymi testami.

**Budżet paczki.** Dziś 6,5 KB gzip z limitu 100 KB — niezagrożony.

---

## 9. Kolejność prac

1. Rdzeń: `rayConicAll`, `Piece` i test przynależności, `rayPiece`, `trace` na `Piece[]`,
   wachlarz w `runProof`, twierdzenia.
2. Migracja modelu poziomu i ośmiu poziomów etapu 1 — stare testy bez zmiany oczekiwań.
3. Rysowanie: łuki, odcinki, wachlarz, ogniska przeszkód.
4. Stan gry z listą elementów, uchwyty końców łuku, rozszerzone przyskakiwanie.
5. Osiem nowych poziomów z kalibracją i testami poziomów.
6. Ręczne sprawdzenie na telefonie.

Praca na gałęzi `etap-2-luki`, założonej od `master` po scaleniu aktualizacji Vite.
