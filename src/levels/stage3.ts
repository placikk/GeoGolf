import { vec } from "../core/vec";
import { EllipseShape, HOLE_RADIUS, Level } from "./types";
import { arcEllipse, ellipse, hyperbola, parabola } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

// Numery poziomów w komentarzach tego pliku to numeracja z czasów etapu 3 (17–24).
// W grze są o 3 większe (etap 0 dodał trzy poziomy na początku), a „druga-strona" stoi
// teraz PRZED „wspolne-ognisko" — stary 21 to „wspolne-ognisko", stary 22 to „druga-strona".
// Szukaj po identyfikatorze, nie po numerze.

/** Poziom 17 ma mniejszy dołek, żeby żadna piłka nie skracała drogi przy osi. Promień
 *  wystrzelony pod kątem δ od osi odbija się na wysokość y = 2p·tan(δ/2); przy p = 0.3,
 *  wachlarzu szerokości 2 i ośmiu piłkach dwie środkowe mają δ = 0.125, czyli y ≈ 0.0375 —
 *  mniej niż standardowy HOLE_RADIUS ≈ 0.0566, więc wpadałyby po jednym odbiciu i docierały
 *  wcześniej niż reszta. Przy HOLE_RADIUS / 3 ≈ 0.0189 wszystkie osiem odbija się dwa razy
 *  i dociera w jednym błysku. Tutaj to nic nie kosztuje: jedynym wolnym uchwytem jest
 *  ognisko, a ono przyskakuje dokładnie do piłki. Poziomy 18–20 zostają przy standardowym
 *  dołku, bo tam wierzchołek przeciąga się palcem bez przyskakiwania, a dołek bez skracania
 *  zawęziłby tolerancję celowania osią z ok. 11° do ok. 3,6°. Dołek rysuje się zawsze
 *  jako 9 px, więc gracz nie widzi żadnej różnicy. */
const t17 = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS / 3 };

/** Poziom 24 ma dołek HOLE_RADIUS / 5 i najwyżej 3 odbicia, bo przy standardowym dołku
 *  istniała SZARA STREFA: ognisko paraboli A postawione dalej niż promień przyskakiwania
 *  (0.1414) od piłki — więc bez przyskoczenia — nadal wygrywało. Zmierzone gęstym
 *  przeglądem (krok ≤ 0.0025, do 0.35–0.5 od piłki): spójna plama wzdłuż osi do ok. 0.19,
 *  osobny pasek przy (−0.27, −0.14) (piłka 0 wpada po JEDNYM odbiciu, z pominięciem B)
 *  i cienki pasek tuż przy wierzchołku A (ok. 0.29 od piłki). Ten ostatni to przypadkowe
 *  tory przez ścianę, z czterema odbiciami — nie znika przy ŻADNYM rozmiarze dołka (jest
 *  jeszcze przy HOLE_RADIUS / 5), znika dopiero przy limicie 3 odbić. Rozwiązanie
 *  potrzebuje dokładnie 2 odbić każdej piłki, więc 3 zostawia zapas jednego.
 *  Przy limicie 3 granica bezpieczeństwa dołka leży między 0.36 a 0.38 × HOLE_RADIUS;
 *  1/5 (≈ 0.0113) jest daleko w środku bezpiecznego zakresu. Wtedy najdalsza wygrana
 *  pozycja ogniska A leży ≈ 0.061 od piłki, a dalszego ogniska hiperboli ≈ 0.019 od M.
 *  To nic gracza nie kosztuje: oba wolne uchwyty to ogniska, które przyskakują dokładnie
 *  (do piłki i do M), a wierzchołek A jest przybity. Dołek rysuje się zawsze jako 9 px. */
const t24 = { balls: 8, maxBounces: 3, holeRadius: HOLE_RADIUS / 5 };

/** Poziomy 21–23 mają dołek HOLE_RADIUS / 1000 i najwyżej 3 odbicia z tego samego powodu
 *  co poziom 24: przy standardowym dołku istniała SZARA STREFA. Optyka hiperboli zmniejsza
 *  błąd ustawienia M, więc ognisko postawione daleko poza promieniem przyskakiwania
 *  (0.1414) nadal wygrywało — gęsty przegląd (krok 0.002, pierścień do 0.6 wokół celu
 *  każdego wolnego ogniska, położenia przeliczone przez `applyDrag` jak w grze) znalazł
 *  wygrane aż po brzeg pierścienia na wszystkich trzech poziomach.
 *
 *  Dlaczego aż /1000, a nie /5: na poziomie 21 gracz rusza elipsą o zablokowanym rozmiarze,
 *  a gra przy rozsuniętych ogniskach podnosi `a` do c + MIN_GAP. M odciągnięte dalej wzdłuż
 *  prostej piłka–M (od ok. 0.18 za M) albo na prostą piłka–dołek (ok. 0.43 od M) robi
 *  z elipsy „igłę" z wierzchołkiem 0.001 za piłką: cały wachlarz odbija się tuż przy piłce i leci wzdłuż osi igły — przez
 *  M (a hiperbola kieruje go do dołka) albo wprost przez dołek. Taki tor chybia środka
 *  dołka tylko o ułamek MIN_GAP; najmniejsze chybienie w pierścieniu, znalezione metodą
 *  Neldera–Meada z każdego lokalnego minimum siatki, to ≈ 0.0049 × HOLE_RADIUS, więc /1000
 *  zostawia zapas prawie pięciokrotny. Na poziomach 22 i 23 najgroźniejsze są tory z trzecim
 *  odbiciem od górnej ściany: ≈ 0.033 i ≈ 0.012 × HOLE_RADIUS, zapas 33× i 12×.
 *
 *  Limit 3 odbić: rozwiązanie potrzebuje dokładnie dwóch (elipsa, hiperbola), trzy
 *  zostawiają zapas jednego, jak na poziomie 24. Przy czterech poziom 21 ma tor igła →
 *  hiperbola → dwie ściany, chybiający o ≈ 0.00002 × HOLE_RADIUS — żaden dołek go nie usuwa.
 *
 *  To nic gracza nie kosztuje: każdy wolny uchwyt tych poziomów to ognisko, które
 *  przyskakuje DOKŁADNIE (do M, a drugie ognisko elipsy poziomu 21 do piłki), więc
 *  rozwiązanie trafia w środek dołka z dokładnością błędu zaokrąglenia. Dołek rysuje się
 *  zawsze jako 9 px. Poza pierścieniem, poza planszą (ok. 1.27 od M) poziom 21 ma jeszcze
 *  DOKŁADNE rozwiązania „igła + ściana" (drugie ognisko w lustrzanym odbiciu dołka) —
 *  tych żaden dołek nie usuwa; to osobne zadanie, razem z samą igłą. */
const t21_23 = { balls: 8, maxBounces: 3, holeRadius: HOLE_RADIUS / 1000 };

/** Wachlarz poziomów parabolicznych. Piłka stoi w ognisku i strzela w lustro; kierunki
 *  poza wachlarzem nie mają w co trafić. Szerokość 2 rad, a nie π: przy pełnym π skrajne
 *  piłki lecą wzdłuż latus rectum i każde POWIĘKSZENIE paraboli sprawia, że wychodzą
 *  poza jej kawałek — a poziom 18 uczy właśnie, że rozmiar nie ma znaczenia. */
const WACHLARZ_W_LEWO = { center: Math.PI, width: 2 };

/** Kawałek paraboli: parametr to wprost odsunięcie prostopadłe od osi, więc zakres
 *  ±0.6 znaczy „wiązka szerokości 1.2" NIEZALEŻNIE od rozmiaru paraboli. Na tym stoi
 *  poziom 18: wiązka zawsze mieści się w luster odbierającym, choćby gracz urósł. */
const KAWALEK = { mid: 0, span: 1.2 };

/** Wachlarz poziomu 19: oś obrócona o 45° (piłka i dołek na przekątnej), więc
 *  wachlarz musi celować tam, gdzie teraz jest lustro — wzdłuż tej samej przekątnej. */
const UKOS = { center: (5 * Math.PI) / 4, width: 2 };

/** Stopnie → radiany, jak w `stage2.ts` — dane poziomów 21–22 opisują łuki w stopniach. */
const deg = (x: number): number => (x * Math.PI) / 180;

/** Start i rozwiązanie elementu gracza z łukiem: długość łuku liczona na rozwiązaniu,
 *  start dostaje TEN SAM łuk (ten sam środek i długość) — jak w `stage2.ts`. Bez tego,
 *  gdy ogniska startu i rozwiązania różnią się (tylko `rozmiar` zablokowany), te same
 *  kąty parametru dają RÓŻNE {mid, length} na dwóch elipsach o różnym `b` — a zablokowane
 *  `poczatek`/`koniec` wymagają identycznego `arc` między startem i rozwiązaniem. */
const withSolutionArc = (start: EllipseShape, solution: EllipseShape) =>
  ({ start: { ...start, arc: solution.arc }, solution });

export const STAGE_3: Level[] = [
  {
    // Dwie parabole naprzeciw siebie na osi x. Wierzchołek przybity w (−0.8, 0),
    // piłka w (−0.5, 0): gdy gracz trafi ogniskiem w piłkę, oś SAMA celuje w drugą
    // parabolę, bo wierzchołek, piłka i dołek są współliniowe. Jedna decyzja, jedna lekcja.
    id: "ognisko-paraboli", title: "Ognisko paraboli",
    hint: "Parabola wysyła z ogniska wszystko równolegle. Posadź ognisko na piłce.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: parabola(vec(-0.42, 0.34), vec(-0.8, 0), KAWALEK),
      solution: parabola(vec(-0.5, 0), vec(-0.8, 0), KAWALEK),
      locked: ["wierzcholek"],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), KAWALEK)],
    sector: WACHLARZ_W_LEWO,
    test: t17,
  },
  {
    // To samo, ale wierzchołek zwolniony, a rozwiązanie ma INNĄ ogniskową (0.22 zamiast
    // 0.3) — dowód wprost w danych, że rozmiar nie ma znaczenia. Echo poziomu 2 z etapu 1;
    // gra tego nie wypowiada.
    id: "parabola-rozmiar", title: "Rozmiar bez znaczenia",
    hint: "Teraz możesz ruszać też wierzchołkiem. Sprawdź, czy rozmiar cokolwiek psuje.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: parabola(vec(-0.35, 0.25), vec(-0.7, -0.15), KAWALEK),
      solution: parabola(vec(-0.5, 0), vec(-0.72, 0), KAWALEK),
      locked: [],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), KAWALEK)],
    sector: WACHLARZ_W_LEWO,
    test: t,
  },
  {
    // Ta sama konstrukcja obrócona o 45°. Ognisko PRZYBITE w piłce, wolny wierzchołek:
    // gracz nie może rozwiązać tego przesuwaniem ogniska, tylko celowaniem osi.
    // Oś u = (1,1)/√2, ogniskowa 0.3, więc wierzchołek leży 0.3·u za piłką. Piłka i dołek
    // muszą leżeć DOKŁADNIE w ogniskach — zaokrąglenie do trzech miejsc (±0.538) chybia
    // o rząd 0.002, więc tu ±0.53787 (= 0.75 − 0.3/√2, dokładniej 0.75 − 0.3·√2/2).
    id: "obrot-osi", title: "Obrót osi",
    hint: "Ognisko już siedzi na piłce. Zostaje wycelować oś.",
    ball: vec(-0.53787, -0.53787), hole: vec(0.53787, 0.53787),
    pieces: [{
      start: parabola(vec(-0.53787, -0.53787), vec(-0.55, -0.85), KAWALEK),
      solution: parabola(vec(-0.53787, -0.53787), vec(-0.75, -0.75), KAWALEK),
      locked: ["ognisko"],
    }],
    obstacles: [parabola(vec(0.53787, 0.53787), vec(0.75, 0.75), KAWALEK)],
    sector: UKOS,
    test: t,
  },
  {
    // Oba lustra należą do gracza. Cztery uchwyty, trzy warunki: ognisko na piłce,
    // ognisko na dołku, osie równoległe. To jest zwieńczenie części parabolicznej.
    id: "teleskop", title: "Teleskop",
    hint: "Dwa lustra, dwa ogniska. Osie muszą patrzeć na siebie.",
    ball: vec(-0.55, 0), hole: vec(0.55, 0),
    pieces: [
      {
        start: parabola(vec(-0.45, 0.35), vec(-0.75, -0.2), KAWALEK),
        solution: parabola(vec(-0.55, 0), vec(-0.85, 0), KAWALEK),
        locked: [],
      },
      {
        start: parabola(vec(0.5, -0.3), vec(0.75, 0.3), KAWALEK),
        solution: parabola(vec(0.55, 0), vec(0.85, 0), KAWALEK),
        locked: [],
      },
    ],
    obstacles: [],
    sector: WACHLARZ_W_LEWO,
    test: t,
  },
  {
    // Wstęp do hiperboli: elipsa stała (ogniska: piłka i M), gracz rusza HIPERBOLĄ.
    // Zablokowane `ognisko1` (dołek) i `rozmiar`: zostaje jeden uchwyt — drugie ognisko
    // hiperboli na M — więc to najprostszy poziom z hiperbolą i dlatego stoi przed
    // „wspolne-ognisko", które tę samą geometrię odwraca. Dlaczego geometria wygląda
    // właśnie tak — patrz komentarz przy „wspolne-ognisko" niżej.
    id: "druga-strona", title: "Druga strona",
    hint: "Elipsa zbiera piłki w swoim drugim ognisku. Postaw tam dalsze ognisko hiperboli.",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
    pieces: [{
      start: hyperbola(vec(-0.2, 0.3), vec(0.19, 0.17), 0.18, 1, { mid: 0, span: 1.6 }),
      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 }),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260))],
    sector: { center: deg(215), width: 1.4 },
    // mniejszy dołek i krótszy limit odbić — patrz `t21_23` na górze pliku
    test: t21_23,
  },
  {
    // Ta sama geometria co „druga-strona", od drugiej strony: hiperbola stała, gracz rusza
    // ELIPSĄ. Uczy, że wspólne ognisko jest wspólne — można je dosunąć z każdej strony.
    // Układ pozaosiowy, trzy warunki naraz — i wszystkie trzy są konieczne:
    //
    // 1. WACHLARZ + ŁUK. Elipsa NIE może być pełna. Pełna elipsa zbiera piłki do M
    //    ze WSZYSTKICH stron, a gałąź hiperboli jest wklęsła tylko w jedną — piłki
    //    nadlatujące z przeciwnej strony trafiłyby ją od wewnątrz i odbiły się w złą
    //    stronę. Wachlarz w dół-lewo i łuk po tej samej stronie dają stożek nadlatujący
    //    do M z jednego kierunku.
    // 2. DOŁEK WEWNĄTRZ ELIPSY. Wiązka odbita od hiperboli leci do dołka; gdyby dołek
    //    leżał poza elipsą, musiałaby przebić lustro od środka. Dołek (−0.2, 0.3) leży
    //    wewnątrz elipsy o ogniskach (−0.6, −0.45) i (0.35, 0.55) przy a = 0.78.
    // 3. POZAOSIOWOŚĆ. piłka→M to (0.95, 1.0), M→dołek to (−0.55, −0.25); sinus kąta
    //    między nimi ≈ 0.375, czyli dobrze poza zerem (test pilnuje > 0.2).
    //
    // c hiperboli = |M dołek| / 2 ≈ 0.302, a = 0.18 → wierzchołek ≈ (0.239, 0.500),
    // czyli między środkiem a M — na drodze zbiegających piłek.
    id: "wspolne-ognisko", title: "Wspólne ognisko",
    hint: "Teraz stoi hiperbola. Drugie ognisko elipsy postaw w dalszym ognisku hiperboli.",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(-0.42, -0.18), vec(0.15, 0.3), 0.78),
        arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260)),
      ),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 })],
    sector: { center: deg(215), width: 1.4 },
    // mniejszy dołek i krótszy limit odbić — patrz `t21_23` na górze pliku
    test: t21_23,
  },
  {
    // Jedyny poziom, na którym OBIE gałęzie są widoczne: flaga `twin` (decyzja właściciela
    // z 2026-09-26). Nie z powodu geometrii — druga gałąź zmieściłaby się na planszy także
    // na 21, 22 i 24 — tylko dlatego, że tu jest lekcją. Czynna jest ta wskazana przez
    // `branch`; druga jest tylko rysunkiem (blado, bez względu na podpowiedzi) i NIE odbija.
    // Wygląda to jak usterka, więc mówi o tym podpowiedź — a gracz uczy się, że gałąź
    // należy do swojego ogniska.
    // Start f2=(0.2, 0.35) z planu wygrywał 3/8 (za blisko rozwiązania) — przesunięty
    // na (0.3, 0.2), dalej od M=(0.4, 0.6), wygrywa 0/8 (sprawdzone `sprawdz-poziom.ts`).
    id: "ktora-galaz", title: "Która gałąź",
    hint: "Odbija tylko ta gałąź, która obejmuje swoje ognisko. Druga jest tylko rysunkiem.",
    ball: vec(-0.55, -0.55), hole: vec(-0.25, 0.25),
    pieces: [{
      start: { ...hyperbola(vec(-0.25, 0.25), vec(0.3, 0.2), 0.2, 1, { mid: 0, span: 1.8 }), twin: true },
      solution: { ...hyperbola(vec(-0.25, 0.25), vec(0.4, 0.6), 0.2, 1, { mid: 0, span: 1.8 }), twin: true },
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.55, -0.55), vec(0.4, 0.6), 0.8, deg(150), deg(260))],
    sector: { center: deg(215), width: 1.4 },
    // mniejszy dołek i krótszy limit odbić — patrz `t21_23` na górze pliku
    test: t21_23,
  },
  {
    // DWIE DROGI DO JEDNEGO DOŁKA. Łańcuch parabola → elipsa → hiperbola jest niewykonalny:
    // parabola wysyła z ogniska wiązkę ŚCIŚLE równoległą, a wiązkę równoległą skupia w punkt
    // tylko druga parabola na tej samej osi — elipsa ani hiperbola tego nie umieją (to
    // twierdzenie, nie kwestia kalibracji). Dlatego zwieńczenie składa OBIE konstrukcje
    // etapu równolegle, z jednej piłki do jednego dołka:
    //
    // • piłki 0–3 (kąty 195°–240°): parabola A (ognisko = piłka, wierzchołek (−0.8, −0.2))
    //   → wiązka wzdłuż osi y = −0.2 w prawo → parabola B (ognisko = dołek, oś odwrotna)
    //   → dołek. Osie współliniowe, bo piłka, dołek i oba wierzchołki leżą na y = −0.2;
    // • piłki 4–7 (kąty 255°–300°): łuk elipsy (ogniska: piłka i M = (−0.05, 0.3))
    //   → ku M → hiperbola (ogniska: dołek i M, gałąź przy M) → dołek.
    //
    // Rozdział wachlarza robi SAM kawałek paraboli A: promień z ogniska pod kątem δ od osi
    // trafia na odsunięciu t = 2p·tan(δ/2), przy p = 0.3 piłki 0–3 mają t ≈ 0.08–0.35,
    // a piłka 4 ma 0.46 — kawałek |t| ∈ [0.04, 0.38] łapie pierwsze cztery i przepuszcza
    // resztę do elipsy, która zaczyna się tuż za jego końcem. Wiązka biegnie PO DRUGIEJ
    // stronie osi niż M, więc hiperbola (wysoko, przy M) jej nie przecina, a zbiegające
    // do M promienie elipsy mijają oba kawałki parabol (A stoi za piłką, B za dołkiem).
    // Dołek leży wewnątrz elipsy (|dołek piłka| + |dołek M| ≈ 1.49 < 2a = 1.6), więc
    // stożek odbity od hiperboli nie wraca w łuk; układ pozaosiowy (sinus ≈ 0.99).
    //
    // Gracz rusza DWOMA elementami, po jednym z każdej lekcji etapu:
    // • parabolą A — tylko ogniskiem (wierzchołek przybity). Wolny wierzchołek dawałby
    //   wolne p, a od p zależy, gdzie wachlarz się dzieli: przy innym rozmiarze kawałek A
    //   gubi skrajne piłki albo zabiera piłki elipsie. Po poziomie 18 („rozmiar bez
    //   znaczenia") byłby to ukryty, nieuczciwy warunek. Przybity wierzchołek na osi
    //   piłka–dołek sprawia, że ognisko przyskakujące do piłki SAMO celuje osią w B;
    // • hiperbolą — tylko dalszym ogniskiem, jak w poziomie 22 (bliższe przybite w dołku,
    //   rozmiar zablokowany): ma usiąść w drugim ognisku elipsy.
    // Elipsa i parabola B są przeszkodami. Elipsa NIE jest elementem gracza celowo: gdyby
    // była, gracz mógłby postawić jej ogniska na piłce i dołku i posłać połowę wachlarza
    // prosto do dołka, z pominięciem hiperboli.
    //
    // Mniejszy dołek i krótszy limit odbić — patrz `t24` na górze pliku.
    id: "zwienczenie-3", title: "Zwieńczenie",
    hint: "Wachlarz dzieli się na dwie drogi do jednego dołka: część piłek leci przez dwie parabole, reszta przez elipsę i hiperbolę. Ognisko paraboli posadź na piłce, a dalsze ognisko hiperboli w drugim ognisku elipsy.",
    ball: vec(-0.5, -0.2), hole: vec(0.35, -0.2),
    pieces: [
      {
        start: parabola(vec(-0.55, 0.2), vec(-0.8, -0.2), { mid: -0.21, span: 0.34 }),
        solution: parabola(vec(-0.5, -0.2), vec(-0.8, -0.2), { mid: -0.21, span: 0.34 }),
        locked: ["wierzcholek"],
      },
      {
        start: hyperbola(vec(0.35, -0.2), vec(0.2, 0.45), 0.18, 1, { mid: 0.6, span: 0.8 }),
        solution: hyperbola(vec(0.35, -0.2), vec(-0.05, 0.3), 0.18, 1, { mid: 0.6, span: 0.8 }),
        locked: ["ognisko1", "rozmiar"],
      },
    ],
    obstacles: [
      // B: wierzchołek za dołkiem, oś w lewo — jej parametr t ma przeciwny znak niż A,
      // więc ten sam pas wiązki to tu mid = +0.21
      parabola(vec(0.35, -0.2), vec(0.65, -0.2), { mid: 0.21, span: 0.34 }),
      arcEllipse(vec(-0.5, -0.2), vec(-0.05, 0.3), 0.8, deg(193.5), deg(242)),
    ],
    // osiem piłek co 15°, od 195° do 300°
    sector: { center: deg(247.5), width: deg(120) },
    test: t24,
  },
];
