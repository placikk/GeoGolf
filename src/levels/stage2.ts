import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { ellipse, segment } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

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
];
