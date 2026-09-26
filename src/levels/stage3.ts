import { vec } from "../core/vec";
import { HOLE_RADIUS, Level } from "./types";
import { parabola } from "./shape";

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
        start: parabola(vec(-0.45, 0.35), vec(-0.85, 0.1), KAWALEK),
        solution: parabola(vec(-0.55, 0), vec(-0.85, 0), KAWALEK),
        locked: [],
      },
      {
        start: parabola(vec(0.5, -0.3), vec(0.88, -0.15), KAWALEK),
        solution: parabola(vec(0.55, 0), vec(0.85, 0), KAWALEK),
        locked: [],
      },
    ],
    obstacles: [],
    sector: WACHLARZ_W_LEWO,
    test: t,
  },
];
