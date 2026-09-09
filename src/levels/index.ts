import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";

export * from "./types";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

export const LEVELS: Level[] = [
  {
    id: "ogniska",
    title: "Dwa ogniska",
    hint: "Przesuń oba ogniska tak, żeby jedno usiadło na piłce, a drugie w dołku.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    locked: ["rozmiar"], obstacles: [],
    start: { f1: vec(-0.15, 0.35), f2: vec(0.35, -0.2), a: 0.8 },
    solution: { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.8 },
    test: t,
  },
  {
    id: "rozmiar",
    title: "Rozmiar bez znaczenia",
    hint: "Teraz możesz zmieniać też rozmiar. Sprawdź, czy to cokolwiek psuje.",
    ball: vec(-0.4, 0), hole: vec(0.4, 0),
    locked: [], obstacles: [],
    start: { f1: vec(-0.1, 0.3), f2: vec(0.3, 0.1), a: 0.6 },
    solution: { f1: vec(-0.4, 0), f2: vec(0.4, 0), a: 0.75 },
    test: t,
  },
  {
    id: "skos",
    title: "Na ukos",
    hint: "Oś elipsy nie musi być pozioma.",
    ball: vec(-0.45, -0.45), hole: vec(0.45, 0.45),
    locked: [], obstacles: [],
    start: { f1: vec(-0.4, 0.4), f2: vec(0.4, -0.4), a: 0.9 },
    solution: { f1: vec(-0.45, -0.45), f2: vec(0.45, 0.45), a: 0.9 },
    test: t,
  },
  {
    id: "blisko",
    title: "Prawie okrąg",
    hint: "Gdy ogniska się zbliżają, elipsa staje się okręgiem.",
    ball: vec(-0.12, 0.1), hole: vec(0.12, -0.1),
    locked: [], obstacles: [],
    start: { f1: vec(-0.6, 0.2), f2: vec(0.5, -0.3), a: 0.8 },
    solution: { f1: vec(-0.12, 0.1), f2: vec(0.12, -0.1), a: 0.55 },
    test: t,
  },
  {
    id: "ciasna",
    title: "Wąska jak igła",
    hint: "Ogniska daleko od siebie zostawiają mało miejsca na elipsę.",
    ball: vec(-0.75, 0), hole: vec(0.75, 0),
    locked: [], obstacles: [],
    start: { f1: vec(-0.3, 0.2), f2: vec(0.3, -0.2), a: 0.9 },
    solution: { f1: vec(-0.75, 0), f2: vec(0.75, 0), a: 0.85 },
    test: t,
  },
  {
    id: "przeszkoda",
    title: "Teraz rozmiar ma znaczenie",
    hint: "Ogniska to nie wszystko — elipsa musi zmieścić się obok przeszkody.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    locked: [], obstacles: [{ center: vec(0, 0.45), radius: 0.12 }],
    start: { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.85 },
    solution: { f1: vec(-0.5, 0), f2: vec(0.5, 0), a: 0.58 },   // pasmo a ∈ (0.50, 0.60)
    test: t,
  },
  {
    id: "dwie-przeszkody",
    title: "Z dwóch stron",
    hint: "Pasmo dopuszczalnych rozmiarów właśnie się zwęziło.",
    ball: vec(-0.45, 0), hole: vec(0.45, 0),
    locked: [],
    obstacles: [
      { center: vec(0, 0.42), radius: 0.12 },
      { center: vec(0, -0.42), radius: 0.12 },
    ],
    start: { f1: vec(-0.45, 0), f2: vec(0.45, 0), a: 0.8 },
    solution: { f1: vec(-0.45, 0), f2: vec(0.45, 0), a: 0.50 },  // pasmo a ∈ (0.45, 0.54)
    test: t,
  },
  {
    id: "zwienczenie",
    title: "Zwieńczenie",
    hint: "Wszystko naraz: skos, rozmiar i przeszkoda.",
    ball: vec(-0.6, -0.55), hole: vec(0.55, 0.6),
    locked: [], obstacles: [{ center: vec(0.42, -0.42), radius: 0.2 }],
    start: { f1: vec(-0.2, 0.2), f2: vec(0.2, -0.2), a: 0.7 },
    solution: { f1: vec(-0.6, -0.55), f2: vec(0.55, 0.6), a: 0.86 },  // pasmo a ∈ (0.82, 0.92)
    test: t,
  },
];
