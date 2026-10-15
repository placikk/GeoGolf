import { Vec2, fromAngle, vec } from "../core/vec";
import { TraceResult, trace } from "../core/trace";
import { HOLE_RADIUS, Shape } from "./types";
import { BOARD_WALLS, arcEllipse, ellipse, hyperbola, parabola, segment, shapeToPiece } from "./shape";

/** Jeden strzał miniscenki: skąd i pod jakim kątem. Zwykle wszystkie z jednej piłki
 *  (wachlarz), ale scena hiperboli strzela z kilku miejsc naraz w jeden punkt. */
export interface Shot { from: Vec2; angle: number }

/** Rysunek na planszy z zasadą — liczony prawdziwym silnikiem (`sceneTraces`), więc nie
 *  może pokazać czegoś, czego gra nie robi. Współrzędne jak na planszy gry, [-1, 1]². */
export interface CardScene {
  shots: Shot[];
  shapes: Shape[];
  /** brak — scena nie ma dołka (np. płaskie lustro, które niczego nie zbiera) */
  hole?: Vec2;
  /** ile odbić rysujemy; tor kończy się na następnym trafieniu (zwykle ścianie) */
  bounces: number;
}

/** Plansza z zasadą nowej mechaniki. Pokazuje się sama przed poziomem `before`, dopóki ten
 *  nie jest zaliczony; „?" otwiera ją na każdym późniejszym poziomie tej mechaniki. */
export interface Card { id: string; before: string; title: string; text: string; scenes: CardScene[] }

const deg = (x: number): number => (x * Math.PI) / 180;
/** `n` kątów równo wewnątrz wachlarza — ta sama reguła (i + ½) co `launchAngles`. */
const fan = (center: number, width: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => center - width / 2 + ((i + 0.5) * width) / n);
const from = (p: Vec2, angles: number[]): Shot[] => angles.map((angle) => ({ from: p, angle }));

/** Strzały z kilku miejsc, każdy wycelowany w `target`. */
const aimedAt = (target: Vec2, starts: Vec2[]): Shot[] =>
  starts.map((p) => ({ from: p, angle: Math.atan2(target.y - p.y, target.x - p.x) }));

export const CARDS: Card[] = [
  {
    id: "odbicie", before: "odbicie", title: "Odbicie",
    text: "Piłka odbija się od lustra pod tym samym kątem, pod jakim w nie uderzyła.",
    scenes: [{ shots: from(vec(-0.6, -0.7), [deg(65)]), shapes: [segment(vec(-0.6, 0.4), vec(0.6, 0.4))], bounces: 1 }],
  },
  {
    id: "elipsa", before: "ogniska", title: "Elipsa",
    text: "Płaskie lustro rozsyła wachlarz w różne strony. Elipsa zbiera w drugim ognisku wszystko, co wyleci z pierwszego.",
    scenes: [
      { shots: from(vec(0, -0.6), fan(Math.PI / 2, deg(60), 7)), shapes: [segment(vec(-0.8, 0.3), vec(0.8, 0.3))], bounces: 1 },
      {
        shots: from(vec(-0.55, -0.1), fan(0, 2 * Math.PI, 8)), shapes: [ellipse(vec(-0.55, -0.1), vec(0.45, 0.15), 0.75)],
        hole: vec(0.45, 0.15), bounces: 1,
      },
    ],
  },
  {
    id: "luk", before: "polelipsa", title: "Łuk",
    text: "Lustro nie musi być całe — wystarczy kawałek tam, dokąd lecą piłki. Jego końce też da się przesuwać.",
    scenes: [{
      shots: from(vec(-0.55, -0.4), fan(Math.PI / 2, Math.PI, 8)),
      shapes: [arcEllipse(vec(-0.55, -0.4), vec(0.45, -0.4), 0.7, 0, Math.PI)],
      hole: vec(0.45, -0.4), bounces: 1,
    }],
  },
  {
    id: "kaskada", before: "kaskada", title: "Kaskada",
    text: "Piłki zebrane w ognisku lecą dalej, jakby wyleciały z nowej piłki. Ognisko jednego lustra może być ogniskiem następnego.",
    // ten sam pomysł co poziom „kaskada", ale inne ogniska i rozmiary — plansza pokazuje
    // zasadę, nie rozwiązanie poziomu, przed którym stoi
    scenes: [{
      shots: from(vec(-0.7, -0.3), fan(deg(45), deg(60), 8)),
      shapes: [
        arcEllipse(vec(-0.7, -0.3), vec(-0.1, -0.3), 0.45, deg(20), deg(120)),
        arcEllipse(vec(-0.1, -0.3), vec(0.6, -0.3), 0.5, deg(-175), deg(-40)),
      ],
      hole: vec(0.6, -0.3), bounces: 2,
    }],
  },
  {
    id: "parabola", before: "ognisko-paraboli", title: "Parabola",
    text: "Piłka z ogniska paraboli odbija się równolegle do osi. Wiązka równoległa do osi zbiega się z powrotem w ognisku.",
    scenes: [
      {
        shots: from(vec(-0.3, 0), fan(Math.PI, 2, 8)),
        shapes: [parabola(vec(-0.3, 0), vec(-0.6, 0), { mid: 0, span: 1.6 })],
        bounces: 1,
      },
      {
        // odwrotnie: wiązka równoległa do osi wpada do ogniska; |y| ≥ 0.2, żeby żaden tor nie
        // przeleciał przez dołek w ognisku przed odbiciem
        shots: [-0.6, -0.4, -0.2, 0.2, 0.4, 0.6].map((y) => ({ from: vec(0.9, y), angle: Math.PI })),
        shapes: [parabola(vec(-0.3, 0), vec(-0.6, 0), { mid: 0, span: 1.6 })],
        hole: vec(-0.3, 0), bounces: 1,
      },
    ],
  },
  {
    // strzały spoza gałęzi, wycelowane w jej ognisko M = (0.4, 0); dołek w drugim ognisku
    id: "hiperbola", before: "druga-strona", title: "Hiperbola",
    text: "Piłka lecąca w stronę jednego ogniska hiperboli odbija się prosto do drugiego.",
    scenes: [{
      shots: aimedAt(vec(0.4, 0), [
        vec(-0.7, 0.8), vec(-0.2, 0.9), vec(0.2, 0.9), vec(-0.7, -0.8), vec(-0.2, -0.9), vec(0.2, -0.9),
      ]),
      shapes: [hyperbola(vec(-0.4, 0), vec(0.4, 0), 0.2, 1, { mid: 0, span: 2.4 })],
      hole: vec(-0.4, 0), bounces: 1,
    }],
  },
];

/** Punkt daleko za planszą: scena bez dołka i tak potrzebuje go dla `trace`. Każdy odcinek
 *  toru zostaje w [-2, 2]² (granica `trace`), więc jego najmniejsza odległość od (99, 99)
 *  jest o wiele większa niż promień dołka. */
const NO_HOLE = vec(99, 99);

/** Tory miniscenki — ten sam `trace` co w dowodzie, ze ścianami planszy. */
export function sceneTraces(scene: CardScene): TraceResult[] {
  const curves = [...scene.shapes.map(shapeToPiece), ...BOARD_WALLS.map(shapeToPiece)];
  return scene.shots.map((s) =>
    trace(s.from, fromAngle(s.angle), {
      curves, hole: scene.hole ?? NO_HOLE, holeRadius: HOLE_RADIUS, maxBounces: scene.bounces, maxLength: 10,
    }));
}

/** Plansza, która stoi przed poziomem `id` (albo żadna). */
export const introCard = (id: string): Card | undefined => CARDS.find((c) => c.before === id);

/** Plansza, którą gra pokazuje sama przy wejściu na poziom `id`: jego plansza, dopóki poziom
 *  nie jest zaliczony. Zaliczony — gracz zna zasadę, plansza została pod „?". */
export const autoCard = (id: string, solved: readonly string[]): Card | undefined =>
  solved.includes(id) ? undefined : introCard(id);

/** Plansza mechaniki, do której należy poziom o indeksie `index`: ostatnia plansza, której
 *  `before` stoi w `ids` nie dalej niż on. Tak „?" na poziomie „obrot-osi" przypomina parabolę, choć
 *  sama plansza paraboli stoi przed „ognisko-paraboli". */
export function cardFor(ids: readonly string[], index: number): Card | undefined {
  let found: Card | undefined;
  let foundAt = -1;
  for (const c of CARDS) {
    const at = ids.indexOf(c.before);
    if (at >= 0 && at <= index && at > foundAt) {
      found = c;
      foundAt = at;
    }
  }
  return found;
}
