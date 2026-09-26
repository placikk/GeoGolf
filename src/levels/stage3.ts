import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { parabola } from "./shape";

const t = { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };

/** Poziom 17 ma mniejszy dołek, żeby piłki lecące blisko osi nie skróciły się do jednego
 *  odbicia. Promień wiązki około 0.2 rad daje y ≈ 0.0375 (przy p=0.3, wzór 2p·tan(δ/2)),
 *  co mieści się w standardowym HOLE_RADIUS ≈ 0.0566. Dołek zmniejszony do HOLE_RADIUS / 3
 *  ≈ 0.0189 zapewnia, że wszystkie osiem pilek odbija się dwa razy i ląduje jednocześnie.
 *  To jest bezpieczne tutaj, bo jedynym wolnym uchwytem jest ognisko, które przylegnie
 *  dokładnie do piłki. Poziomy 18–20 mają dołek standardowy, bo tam wierzchołek jest
 *  uruchamiany ręcznie. Dołek jest rysowany zawsze 9 px, więc gracz widzi różnicę
 *  (ani jedną stronę). */
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
];
