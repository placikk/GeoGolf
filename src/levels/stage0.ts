import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { segment } from "./shape";

/** Etap 0 — bilard. Płaskie lustro nie skupia wachlarza (odbity wachlarz rozchodzi się
 *  dalej, jakby wylatywał z odbicia piłki w lustrze), więc tu leci JEDNA piłka w jednym,
 *  znanym kierunku: `balls: 1` i wachlarz o szerokości 0. Dołek półtora raza większy niż
 *  w reszcie gry — to wstęp. Kryterium dokładności dla odcinka: obrót lustra o ±3° wokół
 *  środka daje pudło (patrz `tests/levels.test.ts`); 3° obraca odbitą piłkę o 6°, a przy
 *  drodze do dołka ≥ 1 to ponad 0.1 bokiem, więcej niż promień dołka (≈ 0.085). */
const t0 = (maxBounces: number) => ({ balls: 1, maxBounces, holeRadius: 1.5 * HOLE_RADIUS });
const W_GORE = { center: Math.PI / 2, width: 0 };

export const STAGE_0: Level[] = [
  {
    // Piłka leci pionowo w górę, dołek leży obok niej. Lustro nad piłką, nachylone tak,
    // żeby odbicie szło po skosie w dół — rozwiązań jest cała rodzina (każda wysokość ma
    // swój kąt); zapisane trafia w (−0.5, 0.3) i odsyła piłkę pod 45°.
    id: "odbicie", title: "Odbicie",
    hint: "Postaw lustro nad piłką i obróć je tak, żeby odbiła się prosto do dołka.",
    ball: vec(-0.5, -0.5), hole: vec(0.3, -0.5),
    pieces: [{
      start: segment(vec(0, 0.5), vec(0.4, 0.5)),
      solution: segment(vec(-0.73097, 0.20433), vec(-0.26903, 0.39567)),
      locked: [],
    }],
    obstacles: [],
    sector: W_GORE,
    test: t0(2),
  },
  {
    // Najpierw stała banda (pod 45°, w (0.6, 0.4)) zawraca piłkę w lewo, poziomo po y = 0.4;
    // lustro gracza na tej prostej kieruje ją w dół, do dołka pod spodem.
    id: "dwa-odbicia", title: "Dwa odbicia",
    hint: "Piłka odbije się najpierw od bandy. Złap ją lustrem i skieruj do dołka.",
    ball: vec(0.6, -0.6), hole: vec(-0.5, -0.6),
    pieces: [{
      start: segment(vec(-0.6, -0.1), vec(-0.2, -0.1)),
      solution: segment(vec(-0.65, 0.25), vec(-0.35, 0.55)),
      locked: [],
    }],
    obstacles: [segment(vec(0.45, 0.55), vec(0.75, 0.25))],
    sector: W_GORE,
    test: t0(3),
  },
  {
    // Ściana od dołu planszy do y = −0.1 zasłania prostą drogę. Lustro postawione za nisko
    // posyła piłkę w ścianę; dopiero wyżej (zapisane: trafienie w (−0.6, 0.8), tor przecina
    // x = 0 na y ≈ 0.1) piłka przechodzi nad nią.
    id: "za-rogiem", title: "Za rogiem",
    hint: "Ściana zasłania dołek. Lustro musi posłać piłkę ponad nią.",
    ball: vec(-0.6, -0.6), hole: vec(0.6, -0.6),
    pieces: [{
      start: segment(vec(-0.4, 0.1), vec(0, 0.1)),
      solution: segment(vec(-0.78758, 0.73061), vec(-0.41242, 0.86939)),
      locked: [],
    }],
    obstacles: [segment(vec(0, -1), vec(0, -0.1))],
    sector: W_GORE,
    test: t0(2),
  },
];
