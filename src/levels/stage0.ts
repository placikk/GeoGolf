import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { segment } from "./shape";

/** Etap 0 — bilard. Płaskie lustro nie skupia wachlarza (odbity wachlarz rozchodzi się
 *  dalej, jakby wylatywał z odbicia piłki w lustrze), więc tu leci JEDNA piłka w jednym,
 *  znanym kierunku: `balls: 1` i wachlarz o szerokości 0. Dołek jest półtora raza większy
 *  niż w reszcie gry (w „Za rogiem" 2.5 raza) — to wstęp. Kryterium dokładności dla
 *  odcinka: obrót lustra o ±3° wokół środka daje pudło (patrz `tests/levels.test.ts`;
 *  spec wprowadzeń §1.4). Obrót o 3° obraca odbitą piłkę o 6°; przy drodze do dołka ≥ 1
 *  to ponad 0.1 bokiem, więcej niż promień dołka 1.5·HR ≈ 0.085 (dwa pierwsze poziomy).
 *  W „Za rogiem" dołek jest większy (2.5·HR ≈ 0.141), ale droga od lustra do dołka to
 *  ≈ 1.84, więc 6° bokiem daje ≈ 0.19 — nadal więcej niż promień.
 *  Lustra startowe mają długość 1.0 z powodu precyzji kątowej palcem: gracz obraca lustro,
 *  przeciągając jeden koniec wokół drugiego, więc ramię dźwigni to długość lustra. Przy
 *  1.0 okno wygrywającego obrotu to ok. ±2.2–2.4° (na telefonie 390 px ±6–7 px na końcu),
 *  a przy dawnych 0.4 było to ±1.3–2.2° (±1.6–2.9 px). */
const t0 = (maxBounces: number, hole = 1.5) => ({ balls: 1, maxBounces, holeRadius: hole * HOLE_RADIUS });
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
      start: segment(vec(0, 0.5), vec(1, 0.5)),
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
      start: segment(vec(-0.9, -0.1), vec(0.1, -0.1)),
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
      start: segment(vec(-0.4, 0.1), vec(0.6, 0.1)),
      solution: segment(vec(-0.78758, 0.73061), vec(-0.41242, 0.86939)),
      locked: [],
    }],
    obstacles: [segment(vec(0, -1), vec(0, -0.1))],
    sector: W_GORE,
    test: t0(2, 2.5),
  },
];
