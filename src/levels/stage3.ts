import { vec } from "../core/vec";
import { EllipseShape, HOLE_RADIUS, Level } from "./types";
import { arcEllipse, ellipse, hyperbola, parabola } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

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
    hint: "Hiperbola przejmuje zbiegający pęk. Daj jej to ognisko, na które czeka.",
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
    test: t,
  },
  {
    // Ta sama geometria od drugiej strony: elipsa stała, gracz rusza HIPERBOLĄ.
    // Uczy, że wspólne ognisko jest wspólne — można je dosunąć z każdej strony.
    // Zablokowane `ognisko1` (dołek) i `rozmiar`: zostaje jeden uchwyt, jedna lekcja.
    id: "druga-strona", title: "Druga strona",
    hint: "Tym razem lustro stoi. Przesuń hiperbolę tak, żeby jej dalsze ognisko usiadło w ognisku elipsy.",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3),
    pieces: [{
      start: hyperbola(vec(-0.2, 0.3), vec(0.19, 0.17), 0.18, 1, { mid: 0, span: 1.6 }),
      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, { mid: 0, span: 1.6 }),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, deg(150), deg(260))],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
  {
    // Jedyny poziom, na którym OBIE gałęzie są widoczne. Czynna jest ta wskazana przez
    // `branch`; druga jest narysowana i NIE odbija. Wygląda to jak usterka, więc mówi
    // o tym podpowiedź — a gracz uczy się, że gałąź należy do swojego ogniska.
    // `c` jest tu duże (ogniska daleko), więc obie gałęzie mieszczą się na planszy.
    // Start f2=(0.2, 0.35) z planu wygrywał 3/8 (za blisko rozwiązania) — przesunięty
    // na (0.3, 0.2), dalej od M=(0.4, 0.6), wygrywa 0/8 (sprawdzone `sprawdz-poziom.ts`).
    id: "ktora-galaz", title: "Która gałąź",
    hint: "Odbija tylko ta gałąź, która obejmuje swoje ognisko. Druga jest tylko rysunkiem.",
    ball: vec(-0.55, -0.55), hole: vec(-0.25, 0.25),
    pieces: [{
      start: hyperbola(vec(-0.25, 0.25), vec(0.3, 0.2), 0.2, 1, { mid: 0, span: 1.8 }),
      solution: hyperbola(vec(-0.25, 0.25), vec(0.4, 0.6), 0.2, 1, { mid: 0, span: 1.8 }),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.55, -0.55), vec(0.4, 0.6), 0.8, deg(150), deg(260))],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
  {
    // Kaskada z trzech stożkowych — ale NIE w łańcuchu, bo optycznie nie da się go
    // zbudować: paraboliczne odbicie z ogniska daje wiązkę ŚCIŚLE równoległą, a taka
    // wiązka trafiająca w elipsę (albo hiperbolę) NIE zbiega się z powrotem w jeden
    // punkt — to nie przybliżenie, to twierdzenie (dokładna zbieżność elipsy/hiperboli
    // działa tylko dla promieni PRZEZ ognisko, nigdy dla wiązki równoległej; odwrotna
    // sztuczka paraboli, „równoległa → ognisko”, wymaga DRUGIEJ paraboli po tej samej
    // osi, jak w „Teleskopie” — tu jej nie ma). Sprawdzone empirycznie: wymuszenie
    // zderzenia z parabolą przed elipsą (mały parametr p) daje chybienia rzędu 0.5–1.3,
    // więc to nie jest kwestia kalibracji. Dlatego poziom łączy naraz DWA wcześniejsze
    // zadania (21 i 22): gracz rusza i elipsą (piłka→M), i hiperbolą (M→dołek) w jednym
    // poziomie — a parabola stoi w tle jako nieruchoma przeszkoda (ognisko wciąż na
    // piłce, z ciekawości), nie mając własnego uchwytu do testowania kryterium 5%.
    id: "zwienczenie-3", title: "Zwieńczenie",
    hint: "Dwa wspólne ogniska naraz: jedno elipsy na piłce i M, drugie hiperboli na M i dołku.",
    ball: vec(-0.6, -0.5), hole: vec(-0.15, 0.2),
    pieces: [
      {
        ...withSolutionArc(
          ellipse(vec(-0.3, -0.1), vec(0.2, 0.4), 0.8),
          arcEllipse(vec(-0.6, -0.5), vec(0.4, 0.55), 0.8, deg(150), deg(260)),
        ),
        locked: ["rozmiar", "poczatek", "koniec"],
      },
      {
        start: hyperbola(vec(-0.15, 0.2), vec(0.35, -0.15), 0.2, 1, { mid: 0, span: 1.6 }),
        solution: hyperbola(vec(-0.15, 0.2), vec(0.4, 0.55), 0.2, 1, { mid: 0, span: 1.6 }),
        locked: ["ognisko1", "rozmiar"],
      },
    ],
    obstacles: [parabola(vec(-0.6, -0.5), vec(-0.85, -0.5), { mid: 0, span: 1.0 })],
    sector: { center: deg(215), width: 1.4 },
    test: t,
  },
];
