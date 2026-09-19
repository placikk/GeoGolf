import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { circle, ellipse, segment } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

const deg = (x: number): number => (x * Math.PI) / 180;

export const STAGE_2: Level[] = [
  {
    // Wachlarz 180° w górę: dolna połowa elipsy nie ma czego odbijać, więc jej nie ma.
    id: "polelipsa", title: "Półelipsa",
    hint: "Piłki lecą tylko w górę — lustro potrzebne jest tylko tam, dokąd lecą.",
    ball: vec(-0.5, -0.3), hole: vec(0.5, -0.3),
    pieces: [{
      start: ellipse(vec(-0.25, 0.05), vec(0.35, -0.25), 0.8, { start: 0, end: Math.PI }),
      solution: ellipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, { start: 0, end: Math.PI }),
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
      start: ellipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, { start: deg(20), end: deg(340) }),
      solution: ellipse(vec(-0.35, -0.4), vec(-0.35, -0.4), 0.18, { start: deg(150), end: deg(310) }),
      locked: ["ognisko1", "ognisko2", "rozmiar"],
    }],
    obstacles: [ellipse(vec(-0.35, -0.4), vec(0.35, 0.4), 0.8, { start: deg(-150), end: deg(150) })],
    test: t,
  },
  {
    // Górny łuk stoi (a = 0.75), gracz domyka dół łukiem współogniskowym. Okrąg pod spodem
    // wymusza mały rozmiar: b < 0.45, czyli a ∈ (0.45, 0.636).
    id: "wspologniskowe", title: "Współogniskowe",
    hint: "Dokończ lustro łukiem innej elipsy o tych samych ogniskach.",
    ball: vec(-0.45, 0.1), hole: vec(0.45, 0.1),
    pieces: [{
      start: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.9, { start: Math.PI, end: 2 * Math.PI }),
      solution: ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.56, { start: Math.PI, end: 2 * Math.PI }),
      locked: ["ognisko1", "ognisko2", "poczatek", "koniec"],
    }],
    obstacles: [
      ellipse(vec(-0.45, 0.1), vec(0.45, 0.1), 0.75, { start: deg(-20), end: deg(200) }),
      circle(vec(0, -0.45), 0.1),
    ],
    test: t,
  },
];
