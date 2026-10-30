# Decyzje podjęte bez pytania — etap 4 (edytor, link i poziomy społeczności)

Ten dokument spisuje: co zrobiono, decyzje właściciela z brainstormingu, odstępstwa planu od
specyfikacji i rozstrzygnięcia podjęte w trakcie realizacji (ledger
`.superpowers/sdd/2026-10-30-golf-etap-4-edytor-spolecznosc/progress.md`, każde `Ruling:` z kosztem,
jeśli było złe), pomiary końcowe, instrukcję katalogu, listę kontrolną dla właściciela i prace
odłożone. Format jak `decyzje-etap-3.md`. Zadanie 10 nie miało przejazdu w przeglądarce na telefonie —
lista z sekcji 6 zostaje dla właściciela.

---

## 1. Co zostało zrobione

Druga część `do poprawy.txt` (dwie zakładki: poziomy twórców i społeczności; weryfikacja, żeby
ludzie wrzucali tylko działające poziomy) oraz pozycja 4 mapy etapów (edytor, dzielenie linkiem).

| Co | Gdzie w kodzie |
|---|---|
| Format poziomu gracza, kod w linku, odczyt bez rzucania, dowód (rozwiązanie wygrywa, start nie) | `src/share/codec.ts`, `src/share/verify.ts` |
| Katalog społeczności i jego strażnik | `src/levels/community.ts`, `src/share/catalog.ts`, `tests/share/catalog.test.ts` |
| Linki i projekty autora w `localStorage` (limity 30 linków, 20 projektów) | `src/ui/collections.ts` |
| Model edytora (kształty, blokady, łuk, strzał, wyrównanie rozwiązań) | `src/editor/model.ts` |
| Interakcja edytora (zaznaczanie, przeciąganie, przyciąganie) | `src/editor/interaction.ts` |
| Zakładki menu „Twórcy" / „Społeczność", przewijana lista | `src/ui/menu.ts`, `src/ui/playlist.ts` |
| Ekran edytora, gra testowa autora, „Udostępnij", otwarcie linku, granie poziomu społeczności | `src/ui/screens.ts` |
| Próbki do testów procedury | `tests/share/samples.ts` |

## 2. Decyzje właściciela z brainstormingu (2026-10-30)

1. **Link + katalog od twórcy.** Poziom jedzie w adresie, bez serwera; zakładka „Społeczność"
   pokazuje katalog dokładany do repozytorium. Odrzucone: same linki bez wspólnej listy; serwer
   z wysyłaniem (hosting, spam, moderacja, prywatność).
2. **Weryfikacja: autor musi przejść swój poziom.** „Udostępnij" pojawia się dopiero po wygranej;
   zwycięskie ustawienie jedzie w linku jako dowód i jest sprawdzane przy otwarciu. Do katalogu ten
   sam próg (bez kryterium 5% i szarych stref).
3. **Edytor: wszystkie kształty, proste ustawienia** — bez ręcznego wpisywania liczb.
4. **Podejście A** — poziom w końcówce adresu (`#poziom=…`), katalog jako plik w kodzie sprawdzany
   przez testy. Odrzucone: katalog z sieci (nie działa offline, weryfikacja tylko w przeglądarce);
   katalog z GitHub Issues (konto, limity API).

## 3. Odstępstwa planu od specyfikacji i rozstrzygnięcia w trakcie realizacji

### 3.1 Dziewięć odstępstw z nagłówka planu

1. **Szkic w formacie linku.** Jeden zapis i jedna walidacja zamiast dwóch formatów;
   `decodeLevel(code, { draft: true })` dopuszcza 0 elementów gracza.
2. **`src/editor/interaction.ts` importuje `piecePolyline` z `src/render/shapes.ts`.** To czysta
   geometria bez DOM; drugie liczenie łamanej byłoby duplikatem.
3. **„Usuń" bez zaznaczenia usuwa cały projekt** (po potwierdzeniu), zamiast być nieaktywne — inaczej
   przy limicie 20 projektów nie dałoby się zwolnić miejsca.
4. **Zablokowany uchwyt to pełna kropka**, nie kłódka — glif kłódki bywa różny albo nieobecny
   w czcionkach telefonów (ta sama zasada co rysowane liniami „⚙" i „?").
5. **„Łuk" to przycisk dolnego pasa**, a **„Udostępnij" zajmuje miejsce „Zagraj"**, gdy projekt jest
   gotowy — pięć pól ≥ 44 px mieści się na 320 px.
6. **Gra testowa autora:** lewy górny przycisk to „‹" i wraca do edytora; po wygranej pas to
   „Edytuj | Udostępnij".
7. **`screens.ts` nie jest dzielony.** Logika edytora siedzi w czystych modułach `src/editor/`;
   wydzielenie ekranu wymagałoby przebudowy całego ekranu (menu, plansza z zasadą, komunikat dzielą stan).
8. **Link do poziomu z katalogu otwiera go w katalogu** (nie dubluje w „Z linków"); własnych projektów
   nie porównujemy — projekt nie ma identyfikatora, dopóki nie zostanie udostępniony.
9. **Katalog startuje pusty** — dokłada go właściciel; testy procedury działają na próbkach.

### 3.2 Rozstrzygnięcia podjęte w trakcie realizacji (każde `Ruling:` z ledgera)

- **Przegląd planu — diffy przepisywane dosłownie.** Konteksty kolejnych zadań zależą od tekstu
  poprzednich. Koszt, jeśli źle: ręczne dopasowanie kontekstu przez wykonawcę.
- **Modele: wykonawcy i recenzenci sonnet, przegląd końcowy opus; recenzent zadań 8–9 może zbudować
  i przeklikać grę.** Koszt, jeśli źle: więcej tokenów.
- **Zadanie 1, runda 1 — liczby w kodzie najwyżej 4 miejsca po przecinku i skończone współczynniki
  stożkowej każdego zbudowanego kształtu.** Obcy link z hiperbolą `a = 1e-300` przechodził walidację
  i dawał nieskończone współczynniki (329 razy na 400 tys. prób); test popsutych kodów nie mógł paść.
  Zapis i tak zaokrągla, więc nasze linki są nietknięte; dodano obronę w głąb i test losowy
  (accepted > 0, budowa przyjętych kształtów, psucie liczb w JSON). Koszt, jeśli źle: link z ręcznie
  wpisanymi liczbami o więcej niż 4 miejscach jest odrzucany — nasz zapis takich nie robi.
- **Zadanie 1, runda 2 — fałszywy komentarz przy `num` (twierdził, że kod jest w całości
  kanoniczny) podniesiony do ważnej i poprawiony.** Przegląd powtórny rundy 2 pominięty (diff to
  wyłącznie komentarz, tekst podany co do znaku; tsc czysty, codec 25/25). Koszt, jeśli źle: zero.
- **Zadanie 6, runda 1 — piłka i dołek w edytorze tylko w [−0,9; 0,9]² (`EDITOR_POINT_LIMIT`).**
  Piłka na ścianie ze strzałem na zewnątrz sprawiała, że uchwyty kierunku i szerokości stawały
  dokładnie na piłce i nie dało się ich złapać. Przy limicie promień do brzegu ≥ 0,1. Koszt, jeśli
  źle: autor nie postawi piłki tuż przy ścianie (0,1 od brzegu); gra nie ma takich poziomów.
- **Zadanie 7 → 8 — napisy zakładek zmniejszają czcionkę 16 → 13 px, by zmieścić się na 320 px**
  (zakładka 104 px, „Społeczność" 600 16 px była na granicy). Rozstrzygnięte w zadaniu 8, gdzie
  zakładki są rysowane. Koszt, jeśli źle: drobne odstępstwo od kodu planu.
- **Zadanie 8, runda 1 — cztery poprawki:** komentarz „JEDEN listener" na właściwym bloku;
  wspólne `openMenu()` wybierające zakładkę według listy, więc „Menu" po wygranej poziomu
  społeczności otwiera zakładkę Społeczność; notka „Wszystkie poziomy ukończone." tylko dla listy
  twórców (społeczność: „To był ostatni poziom."); napis pustej sekcji zawijany. Koszt, jeśli źle:
  ręczne dopasowanie kontekstu diffu w zadaniu 9.
- **Poprawka komentarza przy `allSolved` zrobiona w zadaniu 9**, zamiast osobnej rundy za jedno zdanie
  (ten sam plik, recenzja zadania 9 ją sprawdziła). Koszt, jeśli źle: zero.
- **Zadanie 9, runda 1 — Enter w oknie „Udostępnij" udostępnia, a nie anuluje** (przycisk „ok" pierwszy
  w HTML, `flex-direction: row-reverse` zachowuje wygląd); **napisy pasa edytora zmniejszają czcionkę
  14 → 11 px do szerokości pola** (przy 320 px „Udostępnij" ma ok. 11 px); **przerwane przeciąganie
  (`pointercancel`) zapisuje projekt**; pas rysowany od `ACTION_BAND` zamiast liczby 0,86. Koszt,
  jeśli źle: kilka linii więcej.

### 3.3 Poprawki po przeglądzie końcowym

Przegląd całej gałęzi (opus) dał werdykt „z poprawkami": jedna krytyczna, trzy ważne i kilka
tanich drobnych. Wszystkie zrobione w jednej fali (raport:
`.superpowers/sdd/2026-10-30-golf-etap-4-edytor-spolecznosc/fala-koncowa-report.md`).

- **C1 — edytor dawał kody, których własny odczyt nie przyjmował** (zablokowany rozmiar → wygrana
  → „Udostępnij" nic nie robił, a projekt znikał po odświeżeniu). Trzy przyczyny:
  - **(a) Odczyt nie porównuje wartości zablokowanych uchwytów, tylko ich identyfikatory**
    (istniejący uchwyt, bez powtórzeń); `lockedValues` usunięte. W grze blokada zabrania tylko
    łapania uchwytu — rozsunięte ogniska podnoszą zablokowany rozmiar, koniec odcinka przesuwa
    zablokowany środek. Rozwiązanie autora pochodzi z prawdziwej gry pod tymi blokadami, a ręcznie
    spreparowany link z nieosiągalnym rozwiązaniem da najwyżej poziom nie do wygrania.
    **Odstępstwo od specyfikacji §1.3** („zablokowane uchwyty takie same w starcie i rozwiązaniu").
  - **(b) Zaokrąglenie zaciska długość łuku** do [MIN_ARC_LENGTH, obwód − MIN_ARC_LENGTH] obwodu
    zaokrąglonej elipsy (górna granica w dół, dolna w górę) — dokładnie to, co gra rysuje po
    zmniejszeniu elipsy (`arcParams`).
  - **(c) Próg ogniskowej paraboli w odczycie 5e-4** zamiast 1e-3 — zapas na zaokrąglenie do
    4 miejsc ognisko w odległości MIN_GAP od wierzchołka; stożkowa zostaje skończona.
  - **Obrona w głąb:** `acceptWin` wymaga też, by kod przeszedł odczyt (powody „nie wygrywa" /
    „nie da się zapisać", osobne komunikaty); zmiana szkicu, którego odczyt by nie przyjął,
    zmienia tylko sesję i nie nadpisuje zapisu.
  - **Dodatkowo (znalezione przy tej poprawce): łuk w edytorze nie maleje poniżej rozmiaru, na
    którym da się go zapisać** (`arcFits`: obwód ≥ 2·MIN_ARC_LENGTH + 1e-3), a „Łuk" nie włącza się
    na za małej elipsie. Inaczej elipsa z łukiem ze zlanymi ogniskami, zmniejszona uchwytem
    rozmiaru, dawała szkic odrzucany przez odczyt (pusty zakres długości). W grze testowej takie
    ustawienie kończy się komunikatem „nie da się zapisać". Koszt, jeśli źle: autor nie zrobi łuku
    o obwodzie poniżej ok. 0,1.
  - **Test właściwości** `tests/editor/roundtrip.test.ts`: 3000 losowych kroków edytora; po każdym
    szkic przechodzi odczyt, a co 50 kroków rozwiązanie zagrane pod blokadami (jak w grze) też.
- **I1 — „Okrąg" dawał się tylko rozciągnąć w elipsę.** Ognisko okrągłej PRZESZKODY przesuwa cały
  okrąg (środek w punkcie palca po przyskoczeniu, w planszy; ta sama wielkość, łuk zachowany).
  Tylko przeszkoda: elipsa gracza ze zlanymi ogniskami musi dać się rozsunąć jak w grze.
- **I2 — gra testowa wyciekała do zwykłej gry.** Usunięcie projektu wraca do bieżącego poziomu
  listy (wcześniej po zamknięciu menu był grywalny usunięty projekt); „‹" przerywa trwający dowód,
  a pod edytorem gra nie jest posuwana — poziom „edytor" nie trafia już do postępu.
- **I3 — fałszywe komentarze:** komentarz o zegarze `performance.now` nad `say`; `levelId` służy też
  deduplikacji linków i rozpoznaniu katalogu; `helpVisible` opisuje edytor; README: warstwy
  `share/` i `editor/` opisane zgodnie z importami.
- **Drobne:** komunikat rysowany też nad planszą z zasadą (pierwsze wejście ze złym linkiem
  pokazywało samą zasadę); błąd `navigator.share` inny niż anulowanie → schowek albo okienko;
  `editorUp` zeruje przeciąganie przed każdym wyjściem (dobry link otwarty w trakcie przeciągania
  blokował potem przyciski gry); limity elementów i przeszkód przed odczytem kształtów;
  `codeFromHash` bierze najdłuższy przedrostek base64url (link z kropką czy nawiasem z końca zdania
  działa); `tabRects` z `MENU_BUTTON`; prawdziwy komentarz `cleanTitle` (długość sprawdza odczyt);
  README z polskimi nazwami przycisków.

## 4. Pomiary (stan końcowy, po poprawkach przeglądu końcowego)

```
npx tsc --noEmit        -> bez błędów
npx vitest run          -> Test Files 34 passed (34); Tests 808 passed (808)
npm run build           -> dist/assets/index-DmRx5o91.js 69.92 kB, gzip 24.23 kB (budżet < 100 KB)
ls docs/superpowers/...  -> 8 specyfikacji, 8 planów, 5 dokumentów decyzji (z tym)
```

Długości linków (`encodeLevel(SAMPLES[i]).length`, znaki kodu po `#poziom=`):

| # | Próbka | Znaków |
|---|---|---|
| 0 | Elipsa na 360° | 188 |
| 1 | Łuk w wachlarzu | 290 |
| 2 | Dwie parabole | 212 |
| 3 | Hiperbola przy elipsie | 304 |
| 4 | Lustro | 179 |
| 5 | Przeszkody każdego rodzaju | 316 |

Wszystkie poniżej ok. 320 znaków — mieszczą się w komunikatorach bez skracania.

## 5. Instrukcja katalogu

1. Ktoś przysyła link `…/#poziom=<kod>`.
2. Otwórz `src/levels/community.ts` i dopisz na końcu listy `COMMUNITY`
   `{ link: "<kod>", author: "<imię>" }` — sam kod, bez `#poziom=`.
3. Uruchom `npm test`. `tests/share/catalog.test.ts` odkodowuje każdy wpis i puszcza dowód
   (rozwiązanie autora wygrywa, start nie). Zły wpis zatrzymuje testy.
4. Commit i wypchnięcie na `master`. CI (`.github/workflows/deploy.yml`) uruchamia testy przed
   publikacją, więc zepsuty wpis nie trafi do sieci. Po wydaniu poziom jest w zakładce „Społeczność".

Uwaga: strażnik milczy, dopóki katalog jest pusty (patrz sekcja 7).

## 6. Lista kontrolna przejścia w przeglądarce (spec §7)

Na telefonie i na komputerze:

- [ ] Zbudować i przejść poziom każdego rodzaju: elipsa, parabola, hiperbola, lustro z jedną piłką;
      po wygranej „Udostępnij".
- [ ] Zablokować rozmiar elipsy, w grze testowej rozsunąć ogniska na piłkę i dołek, wygrać —
      „Udostępnij" daje link, projekt zostaje po odświeżeniu.
- [ ] Otworzyć udostępniony link w innej przeglądarce — poziom się otwiera i da się go przejść.
- [ ] Zepsuć link ręcznie (usunąć/zmienić znaki) — pojawia się komunikat, gra nie pada.
- [ ] Wkleić link w już otwartej karcie z otwartym menu — menu się zamyka, poziom się otwiera.
- [ ] Dopisać wpis do katalogu, wydać i zobaczyć go w zakładce „Społeczność".
- [ ] Przewijanie zakładki „Społeczność" przy wielu projektach i linkach.
- [ ] „Usuń" bez zaznaczenia usuwa projekt po potwierdzeniu.
- [ ] Limit 20 projektów — pojawia się komunikat.
- [ ] Przy 320 px napisy zakładek i pasa edytora (zwł. „Udostępnij", ok. 11 px) są czytelne.

## 7. Odłożone

Z ledgera (`minor (deferred)`), pogrupowane:

- **Format i odczyt linku (zad. 1–3):** `cleanTitle` nie usuwa znaków bidi/zero-width (nieszkodliwe
  dla `fillText`); `codeFromHash` nie dekoduje `%XX` (link zepsuty przez komunikator jest
  odrzucany, nie naprawiany); `openCode` bez testu powodu innego niż „zły zapis";
  kolizja FNV (32 bity) między katalogiem a linkiem niewykrywana; limity 30/20 i deduplikacja przy
  odczycie nietestowane; `loadLinks` liczy dowód dla każdego wpisu przed obcięciem; gotowy projekt
  odkodowywany dwa razy.
- **Katalog (zad. 4):** strażnik milczy przy pustym katalogu; okrąg z łukiem nie liczy się jako „łuk"
  w `mechanicCard` (zgodnie z zasadą „okrąg to przeszkoda").
- **Model edytora (zad. 5):** brak testów: szkic bez hiperboli/łuku/blokad, łuk poza „początkiem",
  wyrównanie po usunięciu, zbyt krótka lista rozwiązań w `acceptWin`.
- **Interakcja edytora (zad. 6, 9):** górna granica 2π szerokości nieosiągalna (half ≤ π); druga gałąź
  hiperboli nie daje się zaznaczyć; zawinięcie kąta szerokości testowane w jednym punkcie; przy
  wachlarzu 0,2 i piłce w rogu uchwyty kierunku i szerokości ok. 0,01 od siebie; poziom wczytany
  z piłką poza ±0,9 nie jest przycinany; linia 150 znaków w `interaction.ts:24`; przeciągnięcie
  uchwytu nie zaznacza jego elementu.
- **Menu i zakładki (zad. 7):** zakładki bez przerwy; lista testowana tylko w pionie 390; brak testu osiągalności ostatniego rzędu; kwadratowy
  ekran → 4 kolumny; `isTap` bez testu granicy 8 px.
- **Ekrany (zad. 8, 9):** `pointercancel` nie zeruje
  `consumedReset`; nakładka menu prześwituje tytułem (sprzed zmiany); pigułka komunikatu słabo
  widoczna; koniec listy społeczności nie pokazuje „Wszystkie poziomy ukończone." (świadomie);
  `decodeLevel` kafelka projektu w każdej klatce; `h * 0.93` jako liczba w kodzie; „Udostępnij"
  przy 320 px ma ok. 11 px.

Wcześniejsze odłożone tematy (z `decyzje-etap-3.md` i `decyzje-wprowadzenia.md`), bez zmian w etapie 4:

- **Szare strefy starych poziomów:** wolne cele wygrywają bez przyskoczenia (m.in. poziomy 18 i 20
  oraz wydane 1–16); test 5% nie egzekwuje niezmiennika. Osobne zadanie ze specyfikacją.
- **„Igła"** — mechanika zablokowanego rozmiaru elipsy (`a = c + MIN_GAP`).
- **Uchwyt rozmiaru elipsy poza planszą** po przeciągnięciu ogniska na 9 poziomach etapów 1–2.
- **Kryterium ±3° etapu 0** (obrót lustra) — jego poluzowanie to decyzja właściciela.
