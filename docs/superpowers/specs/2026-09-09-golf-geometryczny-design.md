# Golf geometryczny — specyfikacja projektowa

Data: 2026-09-09
Status: zaakceptowana, gotowa do planu implementacji
Etap: 1 (v1)

---

## 1. Istota

Gra logiczna, w której gracz nie celuje — gracz **konstruuje geometrię**.

Na planszy leży piłka i dołek. Gracz dokłada krzywą stożkową tak, żeby spełniała
konkretną własność geometryczną (np. żeby jej ogniska pokryły się z piłką
i dołkiem). Następnie uruchamia sprawdzenie: **osiem piłek wystrzelonych
jednocześnie w różnych kierunkach**. Jeśli wszystkie wpadną do dołka, poziom jest
zaliczony.

To jest gra konstrukcyjna w duchu Euclidei, nie zręcznościowy minigolf.

### Dlaczego osiem piłek, a nie jedna

Osiem piłek to nie strzał — to **dowód**. Pojedyncze trafienie da się ustrzelić
przypadkiem; ośmiu trafień z rozbieżnych kierunków nie da się. Warunek
zwycięstwa jest więc niepodrabialny szczęściem i wymusza zrozumienie własności,
a nie wyczucie ręki.

### Rdzeń doświadczenia

Gracz odkrywa własność refleksyjną elipsy: **z jednego ogniska każdy kierunek
strzału po jednym odbiciu trafia w drugie ognisko.** "Zawsze się wygrywa" nie
jest błędem projektu — jest puentą.

---

## 2. Zakres

### W zakresie v1

- Silnik geometryczny na ogólnej formie kwadratowej (obsługuje wszystkie stożkowe
  i proste)
- Krzywe: elipsa, okrąg, odcinki prostych (ściany)
- Wiele krzywych na scenie jednocześnie
- Około 8 poziomów
- Mechanika dowodu ósemką z pełną warstwą animacji
- Podgląd dwóch piłek na żywo podczas manipulacji
- Sterowanie dotykiem (bezpośrednia manipulacja)
- PWA: działa w przeglądarce i instaluje się na telefonie

### Poza zakresem v1 (kolejne etapy)

- **Łuki** (zakres parametru na krzywej). Pierwotnie zapisane jako „w architekturze
  od początku", ale v1 ich nie ma: `Conic` to sześć liczb bez zakresu, `rayConic` zwraca
  najbliższe trafienie na CAŁEJ krzywej, a ściany proste są nieskończone. Wycena etapu 2
  poprawiona z „mały" na „średni", bo dodanie zakresu dotyka czterech z sześciu modułów
  rdzenia i renderu. Lepiej mieć uczciwą wycenę niż miłą.
- **Dwa z czterech taktów animacji** z sekcji 7: błysk w punkcie odbicia z chwilowo
  widoczną normalną, oraz rozbłysk dołka w chwili wspólnego przybycia. Zaimplementowane
  są takty „ciągnięcie" i „start". **Decyzja właściciela (2026-09-19): tych dwóch
  taktów nie robimy** — obecna animacja wystarcza. Nie są już długiem, tylko świadomie
  wyciętym zakresem.
- **Nakładka diagnostyczna** z sekcji 9 (normalne, punkty odbicia, wartości parametrów),
  która miała zastępować automatyczne testy warstwy wizualnej.

- Edytor plansz i dzielenie poziomami przez link (etap 4)
- Czarne dziury (etap 5)
- Plansze nieeuklidesowe, torus (etap 6)
- Zoom i przewijanie kamery
- Konta, chmura, tabele wyników
- Dźwięk

---

## 3. Platforma i ograniczenia

| | Decyzja |
|---|---|
| Cel | przeglądarka **i** telefon |
| Stos | TypeScript, Canvas 2D, Vite |
| Zależności produkcyjne | **zero** |
| Dystrybucja mobilna | PWA (instalowalna, offline); Capacitor dopiero jeśli zajdzie potrzeba sklepów |
| Budżet paczki | **< 100 KB gzip**, pilnowany testem |
| Silnik gier | **żaden** — wbudowana fizyka jest tu przeszkodą, nie pomocą |

Powód odrzucenia Godota: gra potrzebuje *dokładnego* przecięcia prostej z krzywą,
a nie symulacji ciał sztywnych z tolerancjami. Praca polegałaby na obchodzeniu
silnika. Powód odrzucenia Pythona: nie wjeżdża na telefon.

Budżet rozmiaru jest wymaganiem, nie aspiracją — test go egzekwuje.

---

## 4. Architektura: rdzeń geometryczny

### Jedna reprezentacja dla wszystkiego

Każda krzywa na planszy to sześć liczb w ogólnej formie kwadratowej:

```
A·x² + B·xy + C·y² + D·x + E·y + F = 0
```

Elipsa, okrąg, parabola, hiperbola — dowolnie obrócone i przesunięte — to ten sam
obiekt o różnych wartościach. **Prosta też**: przy `A = B = C = 0` równanie
redukuje się do `Dx + Ey + F = 0`. Ściany są więc darmowe, bez osobnego kodu.

**Typ krzywej nie jest polem, tylko wnioskiem.** Wyróżnik `B² − 4AC` klasyfikuje:

| Wyróżnik | Krzywa |
|---|---|
| `< 0` | elipsa (okrąg gdy `A = C`, `B = 0`) |
| `= 0` | parabola |
| `> 0` | hiperbola |

Dzięki temu gracz kręcący parametrami może płynnie przejść elipsą przez parabolę
w hiperbolę, a kod się nie dowie, że coś się stało. To bezpośrednio umożliwia
etap 3 bez zmian w silniku.

### Trzy operacje

**Przecięcie półprostej z krzywą.** Dla promienia `P(t) = P₀ + t·d` podstawienie
daje równanie kwadratowe `at² + bt + c = 0`:

```
a = A·dx² + B·dx·dy + C·dy²
b = 2A·x₀·dx + B·(x₀·dy + y₀·dx) + 2C·y₀·dy + D·dx + E·dy
c = A·x₀² + B·x₀·y₀ + C·y₀² + D·x₀ + E·y₀ + F
```

Bierzemy najmniejsze `t > ε`. **Przypadek `a ≈ 0` musi mieć własną gałąź** —
wtedy równanie jest liniowe (krzywa zdegenerowała do prostej albo promień biegnie
wzdłuż asymptoty).

**Normalna** w punkcie trafienia to gradient formy:

```
n = (2A·x + B·y + D,  B·x + 2C·y + E)
```

**Odbicie** kierunku względem znormalizowanej normalnej:

```
d′ = d − 2·(d·n̂)·n̂
```

To jest cały silnik. Trzy funkcje, każda kilkanaście linii, bez stanu i bez
zależności.

### Zasada warstw

```
core/     conic, ray, reflect, trace     ← nie importuje NICZEGO
levels/   dane poziomów
render/   canvas, smugi, animacje
ui/       dotyk, ekrany, nawigacja
```

Rdzeń nie wie o Canvasie, przeglądarce ani o grze. Konsekwencje: testy rdzenia
odpalają się w Node w ułamku sekundy, a etapy 5–6 (czarne dziury, torus) będą
mogły go **rozszerzyć zamiast obchodzić**. Zasady pilnuje test — jakikolwiek
import z `core/` na zewnątrz jest błędem.

### Układ współrzędnych

Świat w jednostkach abstrakcyjnych, plansza wpisana w kwadrat `[-1, 1] × [-1, 1]`,
oś Y skierowana w górę. Warstwa `render/` mapuje świat na piksele, dopasowując
planszę do ekranu z zachowaniem proporcji. Rdzeń nigdy nie widzi pikseli.

---

## 5. Model poziomu

**Poziom to dane, nie kod.** Dodanie poziomu nigdy nie oznacza pisania programu.
Ta sama struktura obsłuży późniejszy edytor plansz — edytor to drugi interfejs do
tego samego modelu, dlatego etap 4 jest tani.

```
{
  id: "elipsa-podstawowa",
  tytuł: "Dwa ogniska",
  piłka: [x, y],
  dołek: [x, y],
  narzędzia: ["elipsa"],           // co gracz może postawić
  zablokowane: ["rozmiar"],         // uchwyty wyłączone na tym poziomie
                                    // dozwolone: "ognisko1", "ognisko2", "rozmiar"
  przeszkody: [],                   // krzywe stałe, nieedytowalne
  test: {
    piłek: 8,
    maxOdbić: 4,
    promieńDołka: 0.02              // ułamek przekątnej planszy
  }
}
```

### Program nauczania v1

Kolejność podana niżej jest projektem wyjściowym; dokładne parametry poziomów
kalibruje się w trakcie implementacji, ale liczba i tematyka są ustalone.

| # | Temat | Czego uczy |
|---|---|---|
| 1 | Elipsa, ogniska na piłce i dołku | czym jest ognisko |
| 2 | To samo, rozmiar dowolny | rozmiar nie ma znaczenia — działa **każda** elipsa |
| 3 | Piłka i dołek po skosie | oś elipsy nie musi być pozioma |
| 4 | Piłka i dołek bardzo blisko siebie | mimośród dąży do zera, elipsa dąży do okręgu |
| 5 | Dołek blisko piłki | duża mimośrodowość, wąska elipsa |
| 6 | Przeszkoda w środku planszy | rozmiar **zaczyna** mieć znaczenie |
| 7 | Dwie przeszkody, góra i dół | pasmo dopuszczalnych rozmiarów zwęża się |
| 8 | Zwieńczenie: narożniki, przeszkoda, wszystko odblokowane | złożenie obrotu, rozmiaru i omijania |

Poziom 2 jest celowo "tym samym co 1" — gracz ma odkryć niezmienniczość rozmiaru
samodzielnie, ciągnąc za uchwyt i widząc, że ósemka dalej wpada. Gra tego nie
wypowiada.

---

## 6. Weryfikacja: kontrakt dowodu

### Przebieg

Osiem piłek startuje **jednocześnie, z tą samą prędkością**, w kierunkach równo
rozłożonych co `2π/n`. Pierwszy kierunek jest przesunięty o **ćwierć kroku**
względem osi wielkiej krzywej, żeby żadna piłka nie biegła dokładnie wzdłuż osi —
taki tor wraca po własnym śladzie i jest wizualnie mylący.

Ćwierć, a nie pół, z dwóch powodów. Po pierwsze, przesunięcie o pół kroku chroni
przed osią tylko dla parzystej liczby piłek: przy nieparzystej zawsze istnieje
piłka lądująca dokładnie na osi, a przy jednej piłce jest nią ta jedyna. Po drugie
i ważniejsze — przy podglądzie dwupiłkowym pół kroku daje dwa kierunki będące
swoimi lustrzanymi odbiciami względem osi wielkiej, więc oba tory są identyczne
z dokładnością do odbicia i gracz widzi połowę informacji, za którą płaci. Ćwierć
kroku łamie tę symetrię i daje dwa naprawdę różne tory.

Sprawdzenie jest **deterministyczne**: ten sam układ zawsze daje ten sam wynik.
To dowód, nie symulacja. Żadnej losowości, żadnej zależności od liczby klatek.

Piłka „wpada", jeśli jej tor przejdzie bliżej środka dołka niż `promieńDołka`.
Śledzenie kończy się po `maxOdbić` odbiciach (domyślnie 4).

### Tolerancja — miejsce, w którym gra może skłamać

`promieńDołka` decyduje o uczciwości gry:

- **za duży** → prawie poprawna elipsa przechodzi, gracz uczy się nieprawdy
- **za mały** → błąd zaokrągleń zabija poprawne rozwiązanie

Dlatego promień jest wyrażony jako **ułamek przekątnej planszy**, nigdy
w pikselach — inaczej zmiana rozmiaru ekranu zmieniałaby trudność.

Wartość wyjściowa: `0.02`. Kryterium akceptacji, które ją kalibruje i które musi
przejść jako test: **przesunięcie ogniska o 5% przekątnej planszy musi spowodować,
że co najmniej jedna z ośmiu piłek chybi.** Jeśli przy `0.02` tak nie jest,
promień schodzi w dół aż do spełnienia warunku.

### Sprzężenie zwrotne

Podczas manipulacji: **dwie piłki na żywo**, blade tory aktualizowane w czasie
rzeczywistym. Dwie wystarczają, żeby czuć, co się robi; nie wystarczają, żeby
zgadnąć rozwiązanie metodą podchodzenia pod górkę. Pełna ósemka wyłącznie na
żądanie, jako dowód.

Przy porażce gra **nie mówi „nie udało się"**. Pokazuje, które piłki chybiły
i którędy poleciały. Pudła bliskie kontra dalekie same mówią, w którą stronę
gracz się pomylił — porażka niesie więcej informacji niż sukces.

---

## 7. Wygląd i animacja

Wygląd jest **wymaganiem, nie polerką**.

### Fakt, na którym stoi cała warstwa wizualna

Suma odległości `ognisko → krzywa → drugie ognisko` wynosi `2a` dla **każdego**
kierunku — to jest wprost definicja elipsy. Zatem osiem piłek wystrzelonych
jednocześnie z tą samą prędkością wpada do dołka **w tej samej chwili**. Nie
w przybliżeniu — dokładnie, bo matematyka nie daje im wyboru.

Osiem świateł rozbiega się na wszystkie strony, odbija w ośmiu różnych miejscach
i w jednym błysku zbiega w jeden punkt. To kulminacja gry, dana za darmo przez
geometrię.

**Wynika z tego twarda reguła: prędkość piłki jest dosłowna.** Żadnego wyginania
tempa dla efektu, żadnych krzywych czasu na ruchu piłek — to zniszczyłoby jedyny
efekt, który tu naprawdę jest. Krzywe czasu wolno stosować wyłącznie do
przekształceń interfejsu i krzywej podczas manipulacji.

Własność uogólnia się na etap 3: parabola ma jednoczesne przybycie z tego samego
powodu (droga optyczna z ogniska do prostej prostopadłej do osi jest stała).

### Język wizualny

Przyrząd matematyczny, nie kreskówka. Bliżej oscyloskopu i rysunku technicznego
niż kolorowego minigolfa: ciemne tło, świecące krzywe, cienkie linie. Krzywa jest
bohaterem ekranu; piłki są światłem, które po niej biegnie.

### Smugi są mechaniką, nie ozdobą

Piłka ciągnie gasnącą smugę. Bez niej zbieżność jest **niewidoczna** — oko nie
nadąża za ośmioma punktami. Ze smugą widać kształt rozwiązania.

Po wygranej smugi zostają na ekranie i tworzą statyczny rysunek: osiem torów,
osiem punktów odbicia, dwa ogniska. **Wygrana dosłownie rysuje ilustrację
geometryczną** — to naturalna nagroda do zachowania w galerii rozwiązanych
poziomów.

### Cztery takty

| Takt | Zachowanie |
|---|---|
| Ciągnięcie | krzywa przekształca się płynnie, bez skoków |
| Start | wszystkie osiem rusza jednocześnie |
| Odbicie | błysk w punkcie trafienia, normalna widoczna przez moment (to uczy) |
| Zbieżność | rozbłysk dołka w chwili wspólnego przybycia |

### Wydajność

`shadowBlur` na Canvasie zabija wydajność na telefonach i jest **zakazany**.
Poświatę uzyskujemy rysując każdą linię dwukrotnie: szeroką półprzezroczystą pod
spodem i cienką jasną na wierzchu. Wygląda jak świecenie, kosztuje tyle co zwykła
kreska.

Cel: 60 klatek na sekundę na średnim telefonie. Smugi jako listy punktów
o ograniczonej długości, bez alokacji pamięci w pętli klatki.

---

## 8. Sterowanie

Manipulacja **bezpośrednia**: gracz ciągnie ognisko palcem, nie kręci suwakiem.
Suwaki są ostatecznością dla parametrów, których nie da się chwycić.

Elipsa ma dokładnie **trzy uchwyty**: dwa ogniska i jeden punkt na krzywej
ustalający rozmiar. To komplet — obrót, mimośród i położenie wynikają z pozycji
ognisk, więc nie są osobnymi stopniami swobody i nie da się ich blokować
niezależnie. Pole `zablokowane` w modelu poziomu wyłącza **uchwyty**: poziom 1
przybija rozmiar, żeby gracz skupił się na ogniskach, a poziom 2 go zwalnia,
odsłaniając niezmienniczość rozmiaru.

Trzy problemy dotyku i ich rozwiązania:

**Palec zasłania to, co przesuwasz.** Ciągnięty punkt dostaje odsunięty znacznik
i podgląd wartości poza obszarem palca.

**Precyzja jest palcem nieosiągalna.** Ognisko *przyskakuje* do piłki i dołka,
gdy znajdzie się bliżej niż 5% przekątnej planszy. To nie jest ułatwienie:
zagadką jest wiedzieć **gdzie** przyskoczyć, a nie trafić w piksel. Bez
przyskakiwania poprawne rozwiązania przepadałyby na grubości palca — przy
tolerancji z sekcji 6 byłoby to wręcz niemożliwe do wykonania.

**Niezmiennik wiążący przyskakiwanie z tolerancją:** promień przyskakiwania musi
być **nie mniejszy** niż pas, w którym niedokładne ustawienie jeszcze przechodzi
test. Inaczej powstaje szara strefa — ustawienie zbyt dalekie, żeby przyskoczyć,
ale wciąż mieszczące się w tolerancji — i gracz wygrywa rozwiązaniem
niedokładnym. Przy progu porażki 5% z sekcji 6 promień przyskakiwania wynosi
również 5%. Gdy kalibracja obniży tolerancję, promień przyskakiwania **nie**
schodzi za nią w dół; nierówność ma pozostać spełniona z zapasem. Dzięki temu
każda wygrana jest wygraną dokładną.

**Kamera.** Brak zoomu i przewijania w v1 — plansza zawsze mieści się w ekranie.
Lżej, prościej, mniej rzeczy do zepsucia.

Minimalny obszar dotykowy uchwytu: 44 px CSS. Układ pionowy: plansza zajmuje
większość ekranu, pasek dolny mieści akcje (Sprawdź, Cofnij, Reset).

---

## 9. Testowanie

### Rdzeń testujemy twierdzeniami, nie przykładami

Zwykły test sprawdza jeden przypadek. Tutaj da się sprawdzić samą własność:
losujemy setki elips i setki kierunków i żądamy, żeby droga
`ognisko → ściana → ognisko` wynosiła `2a` z dokładnością do epsilona. Ten jeden
test znajdzie każdy błąd w przecięciu, normalnej i odbiciu — bo testuje
matematykę, a nie implementację.

### Cztery warstwy siatki

| Test | Co łapie |
|---|---|
| Własność `2a` na losowych danych | błędy przecięcia, normalnej, odbicia |
| Klasyfikacja z wyróżnika | pomyłki elipsa/parabola/hiperbola przy zmianie parametrów |
| Rozwiązanie przesunięte o 5% przekątnej musi odpaść | zbyt hojną tolerancję dołka |
| Każdy wydany poziom ma zapisane rozwiązanie | poziom niemożliwy lub popsuty zmianą silnika |

Czwarty test jest cichym bohaterem: po każdej zmianie w silniku przechodzi
wszystkie poziomy i mówi, czy nadal są rozwiązywalne. Bez niego zmiana
w geometrii może po cichu zepsuć poziom szósty i nikt się nie dowie.

Dodatkowo: test zakazu importów z `core/` na zewnątrz oraz test budżetu paczki
(> 100 KB gzip = czerwone). Budżet, który nie jest sprawdzany, nie jest budżetem.

Warstwa wizualna nie jest testowana automatycznie w v1 — zamiast tego nakładka
diagnostyczna rysująca normalne, punkty odbicia i wartości parametrów.

### Błąd, który zdarzy się na pewno

Po odbiciu piłka stoi **dokładnie** na krzywej, więc kolejne szukanie przecięcia
znajduje `t ≈ 0` i piłka zakleszcza się w ścianie. Klasyk tego rodzaju kodu.
Lekarstwo jest banalne — odrzucamy trafienia poniżej progu `ε` — ale działa tylko
wtedy, gdy się o nim pamięta zawczasu. Zapisane tutaj, żeby nie kosztowało godzin
debugowania.

---

## 10. Mapa etapów

Każdy etap to osobna specyfikacja i osobny plan implementacji.

| Etap | Zawartość | Koszt |
|---|---|---|
| **1 — v1** | silnik kwadratowy, elipsa i okrąg, ~8 poziomów, dowód ósemką, pełna warstwa wizualna | rdzeń projektu |
| **2** | łuki i odcinki + poziomy je wykorzystujące: kaskady, krzywe współogniskowe — spec: `2026-09-19-golf-etap-2-luki-design.md` | **średni** — nowy typ `Piece` (krzywa + łuk), `rayConicAll`, `trace`, wachlarz dowodu, model poziomu z listą elementów |
| **3** | parabola i hiperbola — spec: `2026-09-20-golf-etap-3-parabola-hiperbola-design.md` | **średni-duży** — żadna z dwóch krzywych nie zbiega z jednego ogniska w drugie samodzielnie (parabola rozsyła równolegle, hiperbola rozbiega); wymagał konstrukcji dwustopniowych, nowego trybu ograniczania kawałka (zakres parametru, obok cięciwy) i nowej tabeli długości łuku — nie tylko nowych danych poziomów i warunku zwycięstwa. Wycena „mały" była błędna z przyczyn geometrycznych, nie implementacyjnych — patrz `2026-09-20-golf-etap-3-parabola-hiperbola-design.md` §1 i `decyzje-etap-3.md` |
| **4** | edytor plansz, dzielenie linkiem | średni — nowy interfejs, ten sam model |
| **5** | czarne dziury | **duży — nowy silnik**, tory krzywe, całkowanie numeryczne |
| **6** | torus, plansze nieeuklidesowe | **duży — nowa przestrzeń**, zawijanie topologii |

Etapy 1–4 to jedna gra, która rośnie. Etapy 5 i 6 łamią dwa założenia rdzenia —
„tor jest odcinkiem" oraz „przestrzeń jest płaska" — dlatego stoją na końcu.

### Warunki zwycięstwa dla kolejnych krzywych (etap 3)

| Krzywa | Konstrukcja | Co dowodzi ósemka |
|---|---|---|
| Elipsa | ogniska na piłce i dołku | zbieżność po jednym odbiciu |
| Okrąg | przypadek graniczny elipsy o zlanych ogniskach | nie jest osobnym typem poziomu |
| Parabola | piłka w ognisku, meta to prosta | tory wychodzą równoległe |
| Hiperbola | piłka celuje w dalekie ognisko | wszystkie skręcają do bliskiego |

Silnik nie wymaga zmian — zmienia się wyłącznie warunek zwycięstwa i dane
poziomu.

---

## 11. Ryzyka

**Kalibracja tolerancji.** Wartość `promieńDołka = 0.02` jest punktem wyjścia,
nie wynikiem pomiaru. Kryterium akceptacji z sekcji 6 jest wiążące: jeśli przy
tej wartości przesunięcie o 5% nie powoduje pudła, wartość schodzi w dół.

**Stabilność numeryczna przy krzywych smukłych.** Bardzo duża mimośrodowość
(poziom 5) zbliża rozwiązania równania kwadratowego do siebie i pogarsza
uwarunkowanie. Jeśli test własności `2a` zacznie zawodzić dla skrajnych elips,
przechodzimy na stabilniejszą postać wzoru na pierwiastki, zamiast rozluźniać
epsilon.

**Budżet 100 KB.** Warstwa wizualna jest wymaganiem wysokiej jakości, a to
kosztuje kod. Jeśli budżet zacznie uwierać, cięcia idą w kolejności: galeria
rozwiązań, potem animacje przejść interfejsu — nigdy smugi i nigdy jednoczesność
przybycia, bo to jest rdzeń doświadczenia.
