# Golf geometryczny — wprowadzenia i wygląd krzywych

Specyfikacja do czterech uwag właściciela z `do poprawy.txt` (2026-10-13):

1. najpierw proste poziomy tylko z odcinkami i prostymi;
2. przy każdej nowej mechanice prosty poziom, który ją wyjaśnia;
3. odróżnić elipsę od paraboli — inne mechaniki, bardzo podobne krzywe;
4. zaznaczyć oś paraboli, bo nie jest oczywista.

Etap 4 z tego samego pliku (edytor, zakładki twórców i społeczności, weryfikacja)
to osobna specyfikacja, późniejsza.

Wybrane podejście (decyzja właściciela): **etap 0 z ruchomym lustrem-odcinkiem na
początku gry plus plansze z zasadą przy pierwszym poziomie każdej mechaniki**.
Odrzucone: osobny „Samouczek” w menu (gracz może go pominąć, a uwaga 1 mówi
„najpierw”) i osobny łatwy poziom przed każdą mechaniką (8–9 poziomów, część
powtarzałaby istniejące; łatwiejszego poziomu paraboli niż 17 nie ma — wiązki
równoległej nie da się wbić w dołek bez drugiego lustra).

---

## 1. Etap 0 — bilard z lustrem-odcinkiem

### 1.1 Dlaczego jedna piłka

Warunek zwycięstwa to „wszystkie piłki dowodu w dołku”. Płaskie lustro nie skupia:
wachlarz odbity od prostej rozchodzi się dalej, jakby wylatywał z odbicia piłki w
lustrze. Poziomy z samymi odcinkami mają więc **jedną piłkę** lecącą w jednym,
znanym kierunku. Gracz nie celuje, tylko stawia lustro na drodze piłki.

Poziom jednopiłkowy: `test.balls === 1` **i** `sector.width === 0`. Oba warunki
występują razem albo wcale (test pilnuje). `launchAngles` przy `count = 1`,
`width = 0` zwraca dokładnie `sector.center` — bez zmian w `src/core/`.

### 1.2 Lustro-odcinek jako element gracza

- `MovableShape` obejmuje `SegmentShape` (`kind: "odcinek"`, `from`, `to`).
- Trzy uchwyty: `koniec1` (`from`), `koniec2` (`to`) i `srodek` (przesuwa cały
  odcinek bez zmiany kierunku i długości). Nowe wartości w unii `Handle`.
- Przeciąganie końca nie może zlać końców: minimalna długość odcinka `MIN_GAP`
  (ta sama stała co dla ognisk), analogicznie do `keepApart`.
- `clampToBoard` obowiązuje jak dla każdego uchwytu. Przy `srodek` przycięcie
  nie może wyprowadzić końców poza planszę — przesunięcie jest ograniczane tak,
  żeby oba końce zostały w `[-1,1]²`.
- `shapeToPiece` dla odcinka już istnieje (przeszkody, ściany planszy) — fizyka
  się nie zmienia.
- `locked` działa jak dla innych kształtów (np. zablokowany `srodek`).

### 1.3 Trzy poziomy

Dokładne współrzędne, rozmiar dołka i limit odbić ustala kalibracja skryptem
`scripts/sprawdz-poziom.ts`, jak w etapie 3. Dołek może być na tych poziomach
większy od `HOLE_RADIUS` — to wstęp.

| # | id | Tytuł | Układ | Lekcja |
|---|---|---|---|---|
| 1 | `odbicie` | Odbicie | piłka strzela w górę, dołek obok niej na dole; lustro trzeba postawić nad piłką | kąt padania = kąt odbicia; rozwiązań jest wiele |
| 2 | `dwa-odbicia` | Dwa odbicia | piłka strzela w stronę od dołka; najpierw stała banda (odcinek), potem lustro gracza | tor składa się z kilku odbić |
| 3 | `za-rogiem` | Za rogiem | prostą drogę zasłania przeszkoda; ściana planszy może pomóc | lustro omija przeszkodę |

### 1.4 Kryteria poziomów jednopiłkowych

Ogólne testy poziomów obowiązują: rozwiązanie wygrywa, start nie wygrywa, zablokowane
uchwyty są w starcie i rozwiązaniu takie same, każda blokada nazywa istniejący uchwyt.

Kryterium „5%” (przesunięcie uchwytu o 5% w 8 kierunkach daje pudło) **nie pasuje do
odcinka**: przesunięcie `srodek` wzdłuż własnej prostej lustra niczego nie zmienia,
dopóki piłka trafia w lustro. Dla odcinka kryterium brzmi: **obrót lustra wokół
środka o ±3° daje pudło**. Wartość 3° jest punktem wyjścia; jeśli kalibracja pokaże,
że przy sensownym dołku nie daje się jej spełnić, schodzi w górę z uzasadnieniem w
dokumencie decyzji.

Test „liczba piłek parzysta” (symetria obrotu przy strzale na 360°) obejmuje tylko
poziomy bez wachlarza. Poziomy jednopiłkowe mają własny test z punktu 1.1.

---

## 2. Plansze z zasadą

### 2.1 Treść

Plansza ma tytuł, jedno–dwa zdania zasady, rysunek i przycisk „Gram”. Rysunek to
**miniscena liczona prawdziwym silnikiem**: kształty, punkt startu, lista kątów,
opcjonalny dołek; tory liczy `trace`, rysuje istniejąca warstwa torów. Rysunek nie
może więc pokazać czegoś, czego gra nie robi, a kosztuje kilka linijek danych.

Dane w nowym pliku `src/levels/cards.ts`:

```ts
interface CardScene { ball: Vec2; hole?: Vec2; shapes: Shape[]; angles: number[] }
interface Card { id: string; before: string /* id poziomu */; title: string; text: string; scenes: CardScene[] }
export const CARDS: Card[];
```

| Przed poziomem | Tytuł | Zasada | Sceny |
|---|---|---|---|
| `odbicie` | Odbicie | Piłka odbija się od lustra pod tym samym kątem, pod jakim w nie uderzyła. | odcinek, jedna piłka |
| `ogniska` | Elipsa | Płaskie lustro rozsyła wachlarz w różne strony. Elipsa zbiera w drugim ognisku wszystko, co wyleci z pierwszego. | dwie: wachlarz od odcinka i wachlarz w elipsie |
| `polelipsa` | Łuk | Lustro nie musi być całe — wystarczy kawałek tam, dokąd lecą piłki. Jego końce też da się przesuwać. | łuk elipsy, wachlarz |
| `kaskada` | Kaskada | Piłki zebrane w ognisku lecą dalej, jakby wyleciały z nowej piłki. Ognisko jednego lustra może być ogniskiem następnego. | dwie elipsy ze wspólnym ogniskiem |
| `ognisko-paraboli` | Parabola | Piłka z ogniska paraboli odbija się równolegle do osi. Wiązka równoległa do osi zbiega się z powrotem w ognisku. | parabola, wachlarz z ogniska |
| `druga-strona` | Hiperbola | Piłka lecąca w stronę jednego ogniska hiperboli odbija się prosto do drugiego. | hiperbola, wiązka zbiegająca do ogniska |

### 2.2 Zachowanie

- Plansza pokazuje się **automatycznie** przy wejściu na poziom `before`, dopóki ten
  poziom nie jest zaliczony. Nie zależy od przełącznika „Podpowiedzi” — to zasada
  gry, nie pomoc.
- Na każdym poziomie w pasku jest przycisk **„?”**. Otwiera planszę mechaniki, do
  której poziom należy: ostatnią planszę, której `before` stoi w kolejności nie
  dalej niż ten poziom. Wyliczane z `CARDS` i `LEVELS`, bez nowego pola w `Level`.
  Plansza `odbicie` stoi przed poziomem 1, więc „?” jest zawsze.
- Przycisk „?” ma pole dotyku co najmniej 44 px, jak kafle menu.
- Plansza zamyka się przyciskiem „Gram”; poziom zaczyna się w stanie startowym.

### 2.3 Testy

- Każde `before` istnieje w `LEVELS`; kolejność `CARDS` zgadza się z kolejnością
  poziomów `before`; żadne dwie plansze nie mają tego samego `before`.
- Funkcja „plansza dla poziomu” zwraca dla każdego poziomu ostatnią planszę nie
  dalej niż on (przypadki brzegowe: sam poziom `before`, poziom tuż przed kolejnym
  `before`, ostatni poziom gry).
- Każda scena się liczy: `trace` nie rzuca, a sceny, które mają dołek, pokazują to,
  co obiecuje zdanie (np. scena elipsy: wszystkie piłki w dołku; scena odcinka
  w planszy „Elipsa”: nie wszystkie).

---

## 3. Kolejność poziomów i zapis postępu

### 3.1 Nowa kolejność (27 poziomów)

| Numery | Zawartość |
|---|---|
| 1–3 | etap 0: `odbicie`, `dwa-odbicia`, `za-rogiem` |
| 4–11 | etap 1 (elipsa), bez zmian |
| 12–19 | etap 2 (łuki, kaskady), bez zmian |
| 20–27 | etap 3; jedyna zmiana: `druga-strona` **przed** `wspolne-ognisko` |

`druga-strona` ma jeden uchwyt (drugie ognisko hiperboli na blady punkt), więc lepiej
wprowadza hiperbolę. Jej podpowiedź i komentarz w `stage3.ts` dziś odwołują się do
`wspolne-ognisko` jako poprzednika („ta sama geometria od drugiej strony”) —
przepisać tak, żeby `druga-strona` była pierwsza, a `wspolne-ognisko` odwoływało się
do niej. Geometria i kalibracja obu poziomów bez zmian.

Dokumenty etapów 1–3 odwołują się do starych numerów poziomów — zostają jako zapis
historyczny; lista kontrolna właściciela w `decyzje-etap-3.md` podaje też
identyfikatory, po których da się poziom znaleźć.

### 3.2 Zapis postępu

- `Progress.last` (indeks) zostaje zastąpione przez `lastId` (identyfikator poziomu).
- Wczytywanie: poprawny `lastId` → jego indeks w `LEVELS`; inaczej stary zapis z
  liczbowym `last` jest przeliczany przez zamrożoną listę 24 identyfikatorów w
  **starej** kolejności (`LEGACY_ORDER` w `progress.ts`) na identyfikator, a potem
  na nowy indeks; wszystko inne → poziom 1.
- `solved` (identyfikatory) bez zmian — postęp się nie gubi.
- Testy: stary zapis `last = 20` (stary 21, `wspolne-ognisko`) wczytuje się jako
  `wspolne-ognisko`; nowy zapis wczytuje się sam w sobie; uszkodzone dane → poziom 1.

---

## 4. Wygląd

### 4.1 Kolor według rodzaju

| Element | Kolor |
|---|---|
| elipsa (też okrąg i łuk) | turkus `#5eead4` (jak dziś) |
| parabola | fiolet `#a78bfa` |
| hiperbola | fuksja `#f0abfc` |
| lustro-odcinek gracza | błękit `#7dd3fc` |

Żaden nie jest czerwony (przeszkody), złoty (dołek) ani żółty (tory). Plansze z
zasadą używają tych samych kolorów. Kolor wybiera czysta funkcja według rodzaju
kształtu, z wariantem „stały” (przygaszony).

### 4.2 Stałe krzywe

- Stałe elipsy, parabole i hiperbole: kolor rodzaju, przygaszony, bez poświaty i bez
  uchwytów; ich ogniska to blade kropki w tym samym kolorze.
- Czerwone zostają tylko **przeszkody**: okręgi (elipsa, której oba ogniska są tym samym punktem — tak buduje je
  `circle()`) i odcinki stałe (bandy). Ogniska okręgów dalej nie są rysowane.

Zmiana wobec stanu obecnego (wszystko stałe na czerwono) — decyzja właściciela.

### 4.3 Kształt uchwytu

| Kształt | Uchwyty |
|---|---|
| pierścień | ogniska: `ognisko1`, `ognisko2`, `ognisko` |
| romb | `wierzcholek` |
| mały kwadrat | wszystko inne: `rozmiar`, `poczatek`, `koniec`, `koniec1`, `koniec2`, `srodek` |

Wszystkie pulsują jak dziś. Kształt wybiera czysta funkcja `Handle → kształt`.

### 4.4 Oś paraboli

- Zawsze widoczna, niezależnie od podpowiedzi: cienka przerywana linia
  (`setLineDash`) w kolorze paraboli, od wierzchołka przez ognisko do brzegu planszy.
- Stała parabola też ma oś, przygaszoną.
- Kierownica i asymptoty dalej tylko przy podpowiedziach.
- Odcinek osi liczy czysta funkcja: zaczyna się w wierzchołku, przechodzi przez
  ognisko, kończy na brzegu `[-1,1]²`.

### 4.5 Strzał jednopiłkowy

W trybie edycji poziom jednopiłkowy rysuje zamiast klina wachlarza strzałkę od
piłki w kierunku strzału, długości `SECTOR_REACH`.

---

## 5. Ograniczenia (bez zmian względem etapów 1–3)

- Brak rzutowań `as` i `!` w kodzie produkcyjnym; zero zależności produkcyjnych.
- `shadowBlur` zakazany; paczka < 100 KB gzip.
- `src/core/` nie importuje niczego spoza `src/core/` — ta specyfikacja nie wymaga
  zmian w rdzeniu.
- Żaden test ani warunek zwycięstwa nie zależy od jednoczesnego dotarcia ani od
  liczby odbić.
- Uchwyty zostają w planszy `[-1,1]²`.

## 6. Poza zakresem

- Etap 4 (edytor, zakładki, weryfikacja poziomów społeczności).
- Szare strefy na poziomach etapów 1–3, mechanika „igły”, uchwyt rozmiaru elipsy
  poza planszą na 9 poziomach etapów 1–2 — osobne zadanie.
- Animowane demonstracje na planszy.

## 7. Weryfikacja ręczna (właściciel)

Przejście w przeglądarce: trzy nowe poziomy, sześć plansz (automatycznie i przez
„?”), czytelność kolorów i kształtów uchwytów, oś paraboli na każdym poziomie z parabolą (stałą i ruchomą), strzałka
strzału, powrót do gry ze starym zapisem postępu.
