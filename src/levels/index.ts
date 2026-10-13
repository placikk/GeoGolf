import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { circle, ellipse } from "./shape";
import { STAGE_0 } from "./stage0";
import { STAGE_2 } from "./stage2";
import { STAGE_3 } from "./stage3";

export * from "./types";
export * from "./shape";
export * from "./arc";
export * from "./span";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

const STAGE_1: Level[] = [
  {
    id: "ogniska",
    title: "Dwa ogniska",
    hint: "Przesuń oba ogniska tak, żeby jedno usiadło na piłce, a drugie w dołku.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: ellipse(vec(-0.15, 0.35), vec(0.35, -0.2), 0.8),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8),
      locked: ["rozmiar"],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "rozmiar",
    title: "Rozmiar bez znaczenia",
    hint: "Teraz możesz zmieniać też rozmiar. Sprawdź, czy to cokolwiek psuje.",
    ball: vec(-0.4, 0), hole: vec(0.4, 0),
    pieces: [{
      start: ellipse(vec(-0.1, 0.3), vec(0.3, 0.1), 0.6),
      solution: ellipse(vec(-0.4, 0), vec(0.4, 0), 0.75),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "skos",
    title: "Na ukos",
    hint: "Oś elipsy nie musi być pozioma.",
    ball: vec(-0.45, -0.45), hole: vec(0.45, 0.45),
    pieces: [{
      start: ellipse(vec(-0.4, 0.4), vec(0.4, -0.4), 0.9),
      solution: ellipse(vec(-0.45, -0.45), vec(0.45, 0.45), 0.9),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "blisko",
    title: "Prawie okrąg",
    hint: "Gdy ogniska się zbliżają, elipsa staje się okręgiem.",
    ball: vec(-0.12, 0.1), hole: vec(0.12, -0.1),
    pieces: [{
      start: ellipse(vec(-0.6, 0.2), vec(0.5, -0.3), 0.8),
      solution: ellipse(vec(-0.12, 0.1), vec(0.12, -0.1), 0.55),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "ciasna",
    title: "Wąska jak igła",
    hint: "Ogniska daleko od siebie zostawiają mało miejsca na elipsę.",
    ball: vec(-0.75, 0), hole: vec(0.75, 0),
    pieces: [{
      start: ellipse(vec(-0.3, 0.2), vec(0.3, -0.2), 0.9),
      solution: ellipse(vec(-0.75, 0), vec(0.75, 0), 0.85),
      locked: [],
    }],
    obstacles: [],
    test: t,
  },
  {
    id: "przeszkoda",
    title: "Teraz rozmiar ma znaczenie",
    hint: "Ogniska to nie wszystko — elipsa musi zmieścić się obok przeszkody.",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.85),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.58),   // pasmo a ∈ (0.50, 0.60)
      locked: [],
    }],
    obstacles: [circle(vec(0, 0.45), 0.12)],
    test: t,
  },
  {
    id: "dwie-przeszkody",
    title: "Z dwóch stron",
    hint: "Pasmo dopuszczalnych rozmiarów właśnie się zwęziło.",
    ball: vec(-0.45, 0), hole: vec(0.45, 0),
    pieces: [{
      start: ellipse(vec(-0.45, 0), vec(0.45, 0), 0.8),
      solution: ellipse(vec(-0.45, 0), vec(0.45, 0), 0.50),  // pasmo a ∈ (0.45, 0.54)
      locked: [],
    }],
    obstacles: [circle(vec(0, 0.42), 0.12), circle(vec(0, -0.42), 0.12)],
    test: t,
  },
  {
    id: "zwienczenie",
    title: "Zwieńczenie",
    hint: "Wszystko naraz: skos, rozmiar i przeszkoda.",
    ball: vec(-0.6, -0.55), hole: vec(0.55, 0.6),
    pieces: [{
      start: ellipse(vec(-0.2, 0.2), vec(0.2, -0.2), 0.7),
      solution: ellipse(vec(-0.6, -0.55), vec(0.55, 0.6), 0.86),  // pasmo a ∈ (0.82, 0.92)
      locked: [],
    }],
    obstacles: [circle(vec(0.42, -0.42), 0.2)],
    test: t,
  },
];

export const LEVELS: Level[] = [...STAGE_0, ...STAGE_1, ...STAGE_2, ...STAGE_3];
