import { vec } from "../core/vec";
import { EllipseShape, HOLE_RADIUS, Level } from "./types";
import { arcEllipse, circle, ellipse, segment } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

const deg = (x: number): number => (x * Math.PI) / 180;

/** Start i rozwiązanie elementu gracza z łukiem: długość łuku liczona na rozwiązaniu,
 *  start dostaje TEN SAM łuk (ten sam środek i długość) — tak jak gracz go zastaje. */
const withSolutionArc = (start: EllipseShape, solution: EllipseShape) =>
  ({ start: { ...start, arc: solution.arc }, solution });

export const STAGE_2: Level[] = [
  {
    // Wachlarz 180° w górę: dolna połowa elipsy nie ma czego odbijać, więc jej nie ma.
    id: "polelipsa", title: "Półelipsa",
    hint: "Piłki lecą tylko w górę — lustro potrzebne jest tylko tam, dokąd lecą.",
    ball: vec(-0.5, -0.3), hole: vec(0.5, -0.3),
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(-0.25, 0.05), vec(0.35, -0.25), 0.8),
        arcEllipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, 0, Math.PI),
      ),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [],
    sector: { center: Math.PI / 2, width: Math.PI },
    test: t,
  },
  {
    // Ściany-odcinki nad i pod osią: b < 0.4, czyli a ∈ (0.45, 0.60).
    id: "bandy", title: "Bandy",
    hint: "Ściany są odcinkami. Elipsa musi zmieścić się między nimi.",
    ball: vec(-0.45, 0.1), hole: vec(0.45, 0.1),
    pieces: [{
      start: ellipse(vec(-0.3, 0.3), vec(0.3, -0.1), 0.9),
      solution: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.55),
      locked: [],
    }],
    obstacles: [segment(vec(-0.7, 0.5), vec(0.7, 0.5)), segment(vec(-0.7, -0.3), vec(0.7, -0.3))],
    test: t,
  },
  {
    // Okrąg wokół piłki odbija ją prosto z powrotem, przez piłkę, do stałego lustra
    // po drugiej stronie. Lustro (ogniska: piłka i dołek) ma przerwę od strony lewego
    // dolnego rogu; gracz zostawia z okręgu tylko tę część, która zakrywa przerwę.
    // Pełny okrąg zawraca też piłki lecące do lustra — stąd „odsłonić drogę".
    id: "przycinanie", title: "Przycinanie",
    hint: "Okrąg wokół piłki odbija ją z powrotem. Przytnij go, żeby odsłonić drogę do lustra.",
    ball: vec(-0.35, -0.4), hole: vec(0.35, 0.4),
    pieces: [{
      start: arcEllipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, deg(60), deg(300)),
      solution: arcEllipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, deg(150), deg(310)),
      locked: ["ognisko1", "ognisko2", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.35, -0.4), vec(0.35, 0.4), 0.8, deg(-150), deg(150))],
    test: t,
  },
  {
    // Górny łuk stoi (a = 0.75), gracz domyka dół łukiem współogniskowym. Duży okrąg pod
    // spodem wymusza mały rozmiar. Łuk gracza ma stałą DŁUGOŚĆ (połowa elipsy a = 0.52
    // i po 5° zakładki przy wierzchołkach — bez zakładki rozwiązanie nie znosiło skrócenia
    // łuku). Zmierzone (ze ścianami, krok 0.005): wygrywa a ∈ [0.455, 0.59] poza wąską
    // dziurą przy 0.53–0.54 (tam piłka odbita od górnego łuku przecina koniec łuku gracza
    // — prawdziwe zachowanie tej geometrii), nic powyżej aż do a = 3. Mniejszy okrąg
    // (r = 0.1) przepuszczał duże elipsy — osiem piłek przelatywało obok niego.
    id: "wspologniskowe", title: "Współogniskowe",
    hint: "Dokończ lustro łukiem innej elipsy o tych samych ogniskach.",
    ball: vec(-0.45, 0.1), hole: vec(0.45, 0.1),
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.9),
        arcEllipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.52, Math.PI - deg(5), 2 * Math.PI + deg(5)),
      ),
      locked: ["ognisko1", "ognisko2", "poczatek", "koniec"],
    }],
    obstacles: [
      arcEllipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.75, deg(-20), deg(200)),
      circle(vec(0, -0.5), 0.25),
    ],
    test: t,
  },
  {
    // M = (−0.1, 0.1) to ognisko stałego łuku — widoczne blado i będące celem przyskoku.
    id: "kaskada", title: "Kaskada",
    hint: "Drugi łuk prowadzi piłki z jednego punktu do dołka. Postaw ognisko w tym punkcie.",
    ball: vec(-0.6, 0.1), hole: vec(0.5, 0.1),
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(-0.3, 0.45), vec(0.15, 0.55), 0.4),
        arcEllipse(vec(-0.6, 0.1), vec(-0.1, 0.1), 0.4, deg(20), deg(120)),
      ),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [arcEllipse(vec(-0.1, 0.1), vec(0.5, 0.1), 0.4, deg(-175), deg(-40))],
    sector: { center: deg(45), width: deg(60) },
    test: t,
  },
  {
    // Układ poziomu 13 obrócony o 90°; teraz stoi pierwszy łuk, a gracz buduje drugi.
    id: "kaskada-od-konca", title: "Kaskada od końca",
    hint: "Pierwszy łuk stoi. Zbuduj wyjście: drugi łuk z ogniskiem tam, gdzie zbiega się pierwszy.",
    ball: vec(0.05, -0.6), hole: vec(0.05, 0.5),
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(0.45, -0.3), vec(0.55, 0.25), 0.4),
        arcEllipse(vec(0.05, -0.1), vec(0.05, 0.5), 0.4, deg(-175), deg(-40)),
      ),
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [arcEllipse(vec(0.05, -0.6), vec(0.05, -0.1), 0.4, deg(20), deg(120))],
    sector: { center: deg(135), width: deg(60) },
    test: t,
  },
  {
    // Układ kaskady wzdłuż osi 3-4-5 (kierunek (0.6, 0.8)), żeby liczby zostały dziesiętne.
    // M = (−0.25, −0.2) nie jest ogniskiem żadnej przeszkody, więc nie jest pokazane —
    // gracz stawia oba ogniska, a drugie przyskakuje do pierwszego.
    id: "dwie-elipsy", title: "Dwie elipsy",
    hint: "Cała kaskada w twoich rękach. Oba łuki muszą mieć wspólne ognisko — znajdź, gdzie je postawić.",
    ball: vec(-0.55, -0.6), hole: vec(0.11, 0.28),
    pieces: [
      {
        ...withSolutionArc(
          ellipse(vec(-0.6, 0.1), vec(-0.2, 0.4), 0.4),
          arcEllipse(vec(-0.55, -0.6), vec(-0.25, -0.2), 0.4, deg(20), deg(120)),
        ),
        locked: ["rozmiar", "poczatek", "koniec"],
      },
      {
        ...withSolutionArc(
          ellipse(vec(0.3, -0.55), vec(0.65, -0.2), 0.4),
          arcEllipse(vec(-0.25, -0.2), vec(0.11, 0.28), 0.4, deg(-175), deg(-40)),
        ),
        locked: ["rozmiar", "poczatek", "koniec"],
      },
    ],
    obstacles: [],
    sector: { center: deg(45) + Math.atan2(4, 3), width: deg(60) },
    test: t,
  },
  {
    // Kaskada przy dolnej krawędzi. Gracz rusza drugim łukiem: ogniska i rozmiar.
    // Banda pod spodem ogranicza rozmiar z góry, okrąg na osi M–dołek z dołu:
    // pasmo a ∈ [0.38, 0.44], rozwiązanie w środku.
    id: "zwienczenie-2", title: "Zwieńczenie kaskad",
    hint: "Kaskada, bandy i przeszkoda naraz.",
    ball: vec(-0.6, -0.4), hole: vec(0.5, -0.4),
    pieces: [{
      ...withSolutionArc(
        ellipse(vec(-0.2, 0.3), vec(0.3, 0.2), 0.7),
        arcEllipse(vec(-0.1, -0.4), vec(0.5, -0.4), 0.41, deg(-175), deg(-40)),
      ),
      locked: ["poczatek", "koniec"],
    }],
    obstacles: [
      arcEllipse(vec(-0.6, -0.4), vec(-0.1, -0.4), 0.4, deg(20), deg(120)),
      segment(vec(-0.5, -0.72), vec(0.8, -0.72)),
      circle(vec(0.05, -0.4), 0.08),
    ],
    sector: { center: deg(45), width: deg(60) },
    test: t,
  },
];
