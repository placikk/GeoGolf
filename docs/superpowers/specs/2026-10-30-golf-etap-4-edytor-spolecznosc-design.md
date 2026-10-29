# Golf geometryczny — etap 4: edytor, link i poziomy społeczności

Specyfikacja do drugiej części `do poprawy.txt`: „dwie zakładki — poziomy od nas (twórców)
i od społeczności; sposób weryfikacji, żeby ludzie wrzucali tylko działające poziomy" —
oraz do pozycji 4 mapy etapów (`2026-09-09-golf-geometryczny-design.md` §10: „edytor plansz,
dzielenie linkiem").

Decyzje właściciela z brainstormingu (2026-10-30):

1. **Link + katalog od twórcy** — poziom jedzie w adresie, bez serwera; zakładka
   „Społeczność" pokazuje katalog dokładany przez właściciela do repozytorium. Odrzucone:
   same linki bez wspólnej listy; prawdziwy serwer z wysyłaniem (osobny duży projekt:
   hosting, spam, moderacja, prywatność).
2. **Weryfikacja: autor musi przejść swój poziom** — „Udostępnij" pojawia się dopiero po
   wygranej autora; jego zwycięskie ustawienie jedzie w linku jako dowód i jest sprawdzane
   przy otwarciu. Do katalogu wystarcza ten sam próg (bez kryterium 5% i szarych stref).
3. **Edytor: wszystkie kształty, proste ustawienia** — bez ręcznego wpisywania liczb.
4. **Podejście A** — poziom w końcówce adresu (`#poziom=…`), katalog jako plik w kodzie gry
   sprawdzany przez testy. Odrzucone: katalog pobierany z sieci (nie działa offline,
   weryfikacja tylko w przeglądarce); katalog z GitHub Issues (konto GitHub, limity API).

Gra jest wydawana na GitHub Pages (`https://placikk.github.io/GeoGolf/`) przez
`.github/workflows/deploy.yml`, który uruchamia testy przy każdym wypchnięciu na `master` —
więc wpis katalogu, który nie przechodzi dowodu, nie trafi do sieci.

---

## 1. Format poziomu i link

### 1.1 Treść

Poziom gracza (`SharedLevel`) to podzbiór modelu `Level`:

- `ball`, `hole`;
- `pieces`: 1–3 elementy gracza, każdy `{ start, solution, locked }` — kształty tych samych
  rodzajów co w grze (elipsa z opcjonalnym łukiem, parabola, hiperbola, odcinek);
- `obstacles`: 0–8 stałych kształtów (te same rodzaje, okrąg to elipsa o zlanych ogniskach);
- `shot`: `"360"` | `{ center, width }` (wachlarz, `0 < width ≤ 2π`) | `{ center }` (jedna piłka);
- `title`: 1–40 znaków.

Parametry testu NIE są w linku — wynikają z rodzaju strzału:

| Strzał | `balls` | `holeRadius` | `maxBounces` | `sector` |
|---|---|---|---|---|
| 360° | 8 | `HOLE_RADIUS` | 4 | brak |
| wachlarz | 8 | `HOLE_RADIUS` | 4 | `{ center, width }` |
| jedna piłka | 1 | `1.5 · HOLE_RADIUS` | 3 | `{ center, width: 0 }` |

Kawałki paraboli i hiperboli mają stałe zakresy: parabola `{ mid: 0, span: 1.2 }`,
hiperbola `{ mid: 0, span: 1.6 }`, gałąź `1`. Nie są w linku (YAGNI — edytor ich nie zmienia).

### 1.2 Zapis

- Krótki JSON z polem wersji `v: 1` i jednoliterowymi kluczami (`b`, `h`, `p`, `o`, `s`, `t`),
  liczby zaokrąglone do 4 miejsc po przecinku.
- Kodowanie: UTF-8 → base64url (bez `=`). Bez kompresji — największy poziom gry mieści się
  w kilkuset znakach; test pilnuje, że żaden poprawny poziom nie daje linku dłuższego niż
  2000 znaków.
- Link: `<adres gry>#poziom=<kod>`. Adres gry to bieżące `location.origin + location.pathname`
  — nie wpisany na sztywno, więc działa i lokalnie, i na Pages. Końcówka po `#` nie trafia
  do serwera.

### 1.3 Odczyt i weryfikacja

`decodeLevel(kod)` zwraca poziom albo błąd z powodem; nigdy nie rzuca. Kolejno:

1. base64url → JSON; brak, nieznana wersja, zły typ → błąd.
2. Walidacja schematu: każda liczba skończona; punkty w `[-1, 1]²`; liczba elementów
   w granicach; `locked` tylko uchwytami, które ten kształt ma (`handlePositions`);
   kształty dające się zbudować (elipsa `a > c`, hiperbola `0 < a < c`, parabola ognisko ≠
   wierzchołek, odcinek długości ≥ `MIN_SEGMENT_LENGTH`); rodzaj startu = rodzaj rozwiązania;
   zablokowane uchwyty takie same w starcie i rozwiązaniu; tytuł 1–40 znaków po usunięciu
   znaków sterujących.
3. Dowód: `runProof` na rozwiązaniu → musi wygrać; na starcie → nie może wygrać.

Dopiero poprawny poziom staje się `Level` z identyfikatorem `spol-<8 znaków hex>` — skrót
FNV-1a 32-bitowy z kodu. Ten sam kod daje ten sam identyfikator, więc zaliczenie trzyma się
w istniejącym zapisie postępu (`solved`).

### 1.4 Bezpieczeństwo

Tytuł rysuje się na płótnie (`fillText`), nigdy jako HTML. Walidacja nie wykonuje niczego
z treści linku; długość i liczby są ograniczone, więc złośliwy link nie zablokuje gry
dowodem (najwyżej 3 elementy + 8 przeszkód + ściany, 8 piłek, 4 odbicia).

### 1.5 Kod

Nowy moduł `src/share/`: `codec.ts` (kodowanie, dekodowanie, walidacja), `verify.ts`
(dowód poziomu — ta sama funkcja dla linku, edytora i katalogu), `id.ts` (FNV-1a). Czyste
funkcje, testowane bez przeglądarki. `src/share/` importuje z `src/core/`, `src/levels/`
i z czystego `src/ui/handles.ts` (`handlePositions`, `MIN_SEGMENT_LENGTH` — plik bez DOM);
nigdy z `src/ui/screens.ts` ani niczego, co dotyka DOM. Ta sama reguła dla `src/editor/`.

---

## 2. Edytor

### 2.1 Wejście i zapis

W zakładce „Społeczność", sekcja „Twoje poziomy": kafelek **„+ Nowy poziom"** i projekty
autora. Projekty w `localStorage` (`golf-geometryczny/moje`), do 20 sztuk, z tą samą
odpornością co postęp (brak pamięci, wyjątki, uszkodzony zapis → pusta lista). Projekt ma
stan `"szkic"` albo `"gotowy"` (przeszedł weryfikację; ma kod linku).

Nowy poziom startuje z piłką w (−0.5, 0), dołkiem w (0.5, 0), bez elementów, strzałem 360°.

### 2.2 Ekran

Ta sama plansza co w grze. Dolny pas: **Dodaj · Usuń · Kierunek · Zagraj** (cztery pola
dotyku, każde ≥ 44 px).

- **Dodaj** — nakładka z kafelkami w dwóch rzędach: *Twoje* (elipsa, parabola, hiperbola,
  lustro) i *Stałe* (okrąg, banda, elipsa, parabola, hiperbola). Element pojawia się na
  środku planszy w domyślnym rozmiarze; limit 3 + 8 (kafelek nieaktywny po osiągnięciu).
- **Uchwyty** — te same co w grze (`handlePositions` / `applyDrag`, kształty, kolory,
  przyskakiwanie ognisk do piłki, dołka i innych ognisk). W edytorze ruchome są też piłka,
  dołek i elementy stałe.
- **Zaznaczanie** — stuknięcie w krzywą (nie w uchwyt) ją zaznacza. Przy zaznaczonej:
  **Usuń** ją kasuje; stuknięcie w uchwyt *elementu gracza* (bez przeciągania) przełącza
  jego blokadę — zablokowany uchwyt rysuje się z kłódką; elipsa ma przełącznik **„Łuk"**
  (pełna ↔ półelipsa `arcEllipse(f1, f2, a, 0, π)` z uchwytami końców).
- **Usuń** bez zaznaczenia jest nieaktywne.
- **Kierunek** — przełącza strzał: 360° → wachlarz (uchwyty: kierunek środka i szerokość)
  → jedna piłka (uchwyt kierunku strzałki) → 360°.

### 2.3 Zagraj i weryfikacja

1. Edytor zaokrągla wszystkie liczby do 4 miejsc i buduje `Level` (rozwiązanie = start).
2. Jeśli start już wygrywa — komunikat „Start już wygrywa — przestaw coś", powrót do edycji.
3. Inaczej zwykła gra na tym poziomie. Gdy autor wygra: jego ustawienie, zaokrąglone,
   przechodzi dowód jeszcze raz (zaokrąglenie mogło je zepsuć — wtedy „Za blisko — spróbuj
   jeszcze raz" i gra dalej). Udany dowód → projekt `"gotowy"`, pojawia się **„Udostępnij"**.
4. Każda zmiana w edytorze cofa projekt do `"szkic"`.

### 2.4 Udostępnij

Okienko HTML (`<dialog>` z polem tekstowym nad płótnem — działa klawiatura telefonu) na
tytuł. Potem `navigator.share` (systemowe okno udostępniania), a gdy go nie ma — schowek
(`navigator.clipboard.writeText`) i komunikat „Skopiowano link". Brak obu — link pokazany
w okienku do ręcznego skopiowania.

### 2.5 Kod

`src/editor/`: stan edytora (lista elementów, zaznaczenie, strzał), operacje (dodaj, usuń,
przełącz blokadę, przełącz łuk, zmień strzał, przeciągnij), zaokrąglanie i budowa
`SharedLevel`. Czyste funkcje. `src/ui/screens.ts` tylko je woła i rysuje; jeśli
`screens.ts` urośnie ponad czytelność, ekran edytora idzie do osobnego `src/ui/editorScreen.ts`.

---

## 3. Zakładki, katalog, linki

### 3.1 Menu

U góry menu dwie zakładki: **„Od twórców" | „Społeczność"** (pola ≥ 44 px).

- „Od twórców" — jak dziś (27 kafelków).
- „Społeczność" — trzy sekcje z nagłówkami: **Katalog** (tytuł, autor, ✓), **Twoje
  poziomy** („+ Nowy poziom" i projekty ze stanem; stuknięcie otwiera edytor; gotowy można
  też zagrać i udostępnić), **Z linków** (do 30, w `localStorage`,
  `golf-geometryczny/z-linkow`). Przewijana przeciąganiem, gdy nie mieści się na ekranie.

### 3.2 Katalog

`src/levels/community.ts`: `export const COMMUNITY: { link: string; author: string }[]`
(`link` to sam kod po `#poziom=`). Instrukcja dla właściciela (także w README):

1. Ktoś przysyła link.
2. Dopisz `{ link: "<kod>", author: "<imię>" }` do `COMMUNITY`.
3. `npm test` — testy odkodowują każdy wpis i sprawdzają dowód.
4. Commit i wypchnięcie — CI uruchamia testy jeszcze raz przed wydaniem.

### 3.3 Otwarcie linku

Przy starcie gry: jeśli adres ma `#poziom=…`, odkodowanie i weryfikacja. Dobry poziom →
zapis w „Z linków" (chyba że ten identyfikator jest już w katalogu, w projektach albo
w „Z linków") i od razu gra na nim. Zły → komunikat „Ten link nie zawiera działającego
poziomu" i zwykła gra. W obu przypadkach `history.replaceState` czyści końcówkę adresu.

### 3.4 Granie poziomu społeczności

Jak zwykła gra, z różnicami:

- baner: „Społeczność" i tytuł zamiast „Poziom N / 27";
- po wygranej „Następny" prowadzi do następnego poziomu tej samej sekcji, a na ostatnim —
  do menu;
- „?" otwiera planszę najtrudniejszej mechaniki obecnej w poziomie (elementy gracza
  i przeszkody razem), pierwszej pasującej z listy: jest hiperbola → „hiperbola"; jest
  parabola → „parabola"; są co najmniej dwie elipsy, które nie są okręgami → „kaskada";
  jest elipsa z łukiem → „łuk"; jest elipsa → „elipsa"; inaczej → „odbicie";
- zaliczenie trafia do tego samego `solved`; `lastId` dotyczy tylko poziomów twórców.

---

## 4. Testy

- **Kodek:** zestaw przykładowych poprawnych poziomów — po jednym na każdy rodzaj elementu
  gracza i każdy rodzaj strzału, plus poziom z łukiem, blokadami i przeszkodami każdego
  rodzaju — po `encode → decode` daje ten sam poziom (z dokładnością zaokrąglenia)
  i przechodzi dowód. (Poziomów twórców nie da się tak przepuścić: mają własne rozmiary
  dołków i limity odbić, których format linku celowo nie przenosi.) Losowo psute kody (≥ 2000 prób: obcięte,
  zamienione znaki, zmienione liczby, brakujące pola, złe typy) są odrzucane bez wyjątku;
  rozwiązanie nie wygrywające i start wygrywający → odrzucone; limit 2000 znaków.
- **Identyfikator:** deterministyczny, różny dla różnych poziomów z przykładowego zbioru.
- **Edytor:** operacje (dodaj z limitami, usuń, blokada tylko istniejących uchwytów, łuk,
  cykl strzału), zaokrąglanie, „każda zmiana cofa do szkicu", budowa `SharedLevel` zgodna
  z walidacją.
- **Projekty i „Z linków":** zapis/odczyt, odporność jak postęp, limity 20 i 30, bez
  duplikatów.
- **Katalog:** każdy wpis się odkodowuje, przechodzi dowód, identyfikatory unikalne
  i rozłączne z poziomami twórców.
- **Menu:** układ obu zakładek, pola dotyku, sekcje, przewijanie (czyste funkcje układu).
- **„?":** dobór planszy według mechaniki dla przykładowych poziomów.

## 5. Ograniczenia

- Zero zależności produkcyjnych; paczka < 100 KB gzip.
- Bez `as` i `!` w nowym kodzie produkcyjnym; `shadowBlur` zakazany.
- `src/core/` nie importuje niczego spoza siebie; `src/share/` i `src/editor/` nie dotykają DOM
  (importują tylko z `core`, `levels` i czystego `ui/handles.ts`).
- Żaden test ani warunek wygranej nie zależy od jednoczesnego dotarcia ani liczby odbić.
- Uchwyty w edytorze też zostają w `[-1, 1]²`.
- Komentarze po polsku i prawdziwe.

## 6. Poza zakresem

- Serwer, konta, wysyłanie z gry, oceny i komentarze.
- Kryterium 5% i szare strefy dla poziomów społeczności.
- Ręczne wpisywanie liczb, zmiana kawałka paraboli/hiperboli i gałęzi, podpowiedzi autora.
- Edycja poziomów twórców w edytorze.

## 7. Weryfikacja ręczna (właściciel)

Na telefonie i komputerze: zbudować poziom każdego rodzaju, przejść go, udostępnić; otworzyć
link w innej przeglądarce; zepsuć link ręcznie i sprawdzić komunikat; dodać wpis do katalogu
i zobaczyć go po wydaniu; przewijanie zakładki „Społeczność".
