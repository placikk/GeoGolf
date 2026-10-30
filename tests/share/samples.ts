import { vec } from "../../src/core/vec";
import { arcEllipse, circle, ellipse, hyperbola, parabola, segment } from "../../src/levels";
import { HYPERBOLA_SPAN, PARABOLA_SPAN, SharedLevel } from "../../src/share/codec";

/** Przykładowe poprawne poziomy gracza — po jednym na każdy rodzaj elementu i strzału, plus
 *  łuk, blokady i przeszkody każdego rodzaju. Wszystkie przechodzą dowód (`verifyShared`):
 *  rozwiązanie wygrywa, start nie. Geometrie wzięte z poziomów twórców o tych samych
 *  parametrach dowodu i sprawdzone przy pisaniu planu. */
const luk = arcEllipse(vec(-0.5, -0.3), vec(0.5, -0.3), 0.8, 0, Math.PI);

export const SAMPLES: SharedLevel[] = [
  {
    title: "Elipsa na 360°",
    ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" },
    pieces: [{
      start: ellipse(vec(-0.15, 0.35), vec(0.35, -0.2), 0.8),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8),
      locked: ["rozmiar"],
    }],
    obstacles: [],
  },
  {
    title: "Łuk w wachlarzu",
    ball: vec(-0.5, -0.3), hole: vec(0.5, -0.3), shot: { kind: "wachlarz", center: Math.PI / 2, width: Math.PI },
    pieces: [{
      start: { ...ellipse(vec(-0.25, 0.05), vec(0.35, -0.25), 0.8), arc: luk.arc },
      solution: luk,
      locked: ["rozmiar", "poczatek", "koniec"],
    }],
    obstacles: [],
  },
  {
    title: "Dwie parabole",
    ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "wachlarz", center: Math.PI, width: 2 },
    pieces: [{
      start: parabola(vec(-0.42, 0.34), vec(-0.8, 0), PARABOLA_SPAN),
      solution: parabola(vec(-0.5, 0), vec(-0.8, 0), PARABOLA_SPAN),
      locked: ["wierzcholek"],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), PARABOLA_SPAN)],
  },
  {
    title: "Hiperbola przy elipsie",
    ball: vec(-0.6, -0.45), hole: vec(-0.2, 0.3), shot: { kind: "wachlarz", center: (215 * Math.PI) / 180, width: 1.4 },
    pieces: [{
      start: hyperbola(vec(-0.2, 0.3), vec(0.19, 0.17), 0.18, 1, HYPERBOLA_SPAN),
      solution: hyperbola(vec(-0.2, 0.3), vec(0.35, 0.55), 0.18, 1, HYPERBOLA_SPAN),
      locked: ["ognisko1", "rozmiar"],
    }],
    obstacles: [arcEllipse(vec(-0.6, -0.45), vec(0.35, 0.55), 0.78, (150 * Math.PI) / 180, (260 * Math.PI) / 180)],
  },
  {
    title: "Lustro",
    ball: vec(-0.5, -0.5), hole: vec(0.3, -0.5), shot: { kind: "jedna", center: Math.PI / 2 },
    pieces: [{
      start: segment(vec(0, 0.5), vec(1, 0.5)),
      solution: segment(vec(-0.73097, 0.20433), vec(-0.26903, 0.39567)),
      locked: [],
    }],
    obstacles: [],
  },
  {
    title: "Przeszkody każdego rodzaju",
    ball: vec(-0.5, 0), hole: vec(0.5, 0), shot: { kind: "360" },
    pieces: [{
      start: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.85),
      solution: ellipse(vec(-0.5, 0), vec(0.5, 0), 0.58),
      locked: ["ognisko1", "ognisko2"],
    }],
    obstacles: [
      circle(vec(0, 0.45), 0.12),
      segment(vec(-0.9, -0.9), vec(-0.6, -0.9)),
      hyperbola(vec(0.6, 0.85), vec(0.9, 0.85), 0.1, 1, HYPERBOLA_SPAN),
    ],
  },
];
