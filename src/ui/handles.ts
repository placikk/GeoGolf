import { Vec2, add, dist, dot, norm, scale, sub, vec } from "../core/vec";
import {
  ArcRange, EllipseShape, Handle, HyperbolaShape, Level, MIN_ARC_LENGTH, MovableShape, ParabolaShape, PlayerPiece,
  SegmentShape,
} from "../levels/types";
import { ellipseAxis, ellipseCenter, ellipseParam, ellipsePoint, shapeFoci } from "../levels/shape";
import { arcFromParams, arcLengthBetween, arcParams, paramAtLength, perimeter } from "../levels/arc";

const MIN_GAP = 1e-3;
const TAU = 2 * Math.PI;

/** Który uchwyt którego elementu gracza. */
export interface HandleRef { piece: number; id: Handle }

/** Wierzchołek czynnej gałęzi hiperboli — tam siedzi uchwyt rozmiaru, bo tam gracz
 *  widzi krzywą. Wierzchołek drugiej gałęzi nie jest uchwytem niczego. */
const hyperbolaVertex = (s: HyperbolaShape): Vec2 =>
  add(scale(add(s.f1, s.f2), 0.5), scale(norm(sub(s.f2, s.f1)), s.branch * s.a));

export function handlePositions(state: MovableShape): { id: Handle; pos: Vec2 }[] {
  if (state.kind === "odcinek") {
    return [
      { id: "koniec1", pos: state.from },
      { id: "koniec2", pos: state.to },
      { id: "srodek", pos: scale(add(state.from, state.to), 0.5) },
    ];
  }
  if (state.kind === "parabola") {
    return [{ id: "ognisko", pos: state.focus }, { id: "wierzcholek", pos: state.vertex }];
  }
  if (state.kind === "hiperbola") {
    return [
      { id: "ognisko1", pos: state.f1 },
      { id: "ognisko2", pos: state.f2 },
      { id: "rozmiar", pos: hyperbolaVertex(state) },
    ];
  }
  const out: { id: Handle; pos: Vec2 }[] = [
    { id: "ognisko1", pos: state.f1 },
    { id: "ognisko2", pos: state.f2 },
  ];
  if (state.arc === undefined) {
    out.push({ id: "rozmiar", pos: add(ellipseCenter(state), scale(ellipseAxis(state), state.a)) });
    return out;
  }
  // Na łuku wierzchołek osi wielkiej może leżeć w przerwie, więc uchwyt rozmiaru
  // siedzi w środku łuku — zawsze na tym, co gracz widzi.
  const { start, end } = arcParams(state, state.arc);
  out.push(
    { id: "rozmiar", pos: ellipsePoint(state, state.arc.mid) },
    { id: "poczatek", pos: ellipsePoint(state, start) },
    { id: "koniec", pos: ellipsePoint(state, end) },
  );
  return out;
}

export function snapTo(p: Vec2, targets: Vec2[], radius: number): Vec2 {
  let best: Vec2 | null = null;
  let bestD = radius;
  for (const t of targets) {
    const d = dist(p, t);
    if (d <= bestD) { bestD = d; best = t; }
  }
  return best ?? p;
}

/** Cele przyskakiwania ogniska elementu `dragged`: piłka, dołek, ogniska stałych elips
 *  (bez okręgów — ich „ognisko" to środek przeszkody, nigdy nie jest celem) i ogniska
 *  POZOSTAŁYCH elementów gracza. Bez ostatnich kaskada z dwóch elementów gracza byłaby
 *  palcem niewykonalna. */
export function snapTargets(level: Level, pieces: MovableShape[], dragged: number): Vec2[] {
  const fixedFoci = level.obstacles.flatMap((o) => (o.kind === "odcinek" ? [] : shapeFoci(o)));
  const otherFoci = pieces.flatMap((p, i) => (i === dragged ? [] : shapeFoci(p)));
  return [level.ball, level.hole, ...fixedFoci, ...otherFoci];
}

/** Najbliższy odblokowany uchwyt ze WSZYSTKICH elementów gracza. `locks[i]` to blokady
 *  elementu `pieces[i]`. */
export function pickHandle(
  world: Vec2, pieces: MovableShape[], locks: Handle[][], radius: number,
): HandleRef | null {
  let best: HandleRef | null = null;
  let bestD = radius;
  pieces.forEach((state, piece) => {
    for (const h of handlePositions(state)) {
      if (locks[piece].includes(h.id)) continue;
      const d = dist(world, h.pos);
      if (d <= bestD) { bestD = d; best = { piece, id: h.id }; }
    }
  });
  return best;
}

/** Sprowadza kąt do przedziału [−π, π]. */
const wrap = (x: number): number => x - TAU * Math.round(x / TAU);
const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);

/** Plansza to domknięty kwadrat [-1, 1]². */
const BOARD_MIN = -1;
const BOARD_MAX = 1;

/** DLACZEGO tu: `applyDrag` jest jedynym miejscem, przez które przechodzi i gra
 *  (`screens.ts` woła go po `toWorld`/`snapTo`), i testy, które chcą modelować grę
 *  (np. szara strefa poziomów 21–24 w `tests/levels.test.ts`) — wołają `applyDrag`
 *  PROSTO, z pominięciem `screens.ts`. Przycięcie w samym `screens.ts` byłoby
 *  obejściem: testy sterujące `applyDrag` nadal eksplorowałyby pozycje poza planszą,
 *  których gra już nie umie wytworzyć (patrz zadanie 15b — dokładne rozwiązanie
 *  poziomu 21 z ogniskiem w (−0.2, 1.7)). Jeden punkt obsługuje obu wywołujących. */
const clampToBoard = (p: Vec2): Vec2 => {
  const x = clamp(p.x, BOARD_MIN, BOARD_MAX);
  const y = clamp(p.y, BOARD_MIN, BOARD_MAX);
  // ta sama referencja, gdy już w planszy — nie tworzymy śmieci i nie łamiemy
  // testów porównujących TOŻSAMOŚĆ obiektu (`toBe`) dla punktów, które i tak są w planszy
  return x === p.x && y === p.y ? p : { x, y };
};

const inBoard = (p: Vec2): boolean =>
  p.x >= BOARD_MIN && p.x <= BOARD_MAX && p.y >= BOARD_MIN && p.y <= BOARD_MAX;

/** Prawdziwa pozycja uchwytu „rozmiar” dla danego `a` — WOŁA `handlePositions`, bo to jej
 *  formuła (bez łuku: `środek + oś·a`; z łukiem: `ellipsePoint(s, arc.mid)`, zależne od `a`
 *  przez `b = √(a²−c²)`, więc INNE) rysuje uchwyt na ekranie. Granica planszy i rysowany
 *  uchwyt liczone z tej samej funkcji nie mogą się rozjechać. */
const sizeHandlePos = (s: EllipseShape, a: number): Vec2 => {
  const found = handlePositions({ ...s, a }).find((h) => h.id === "rozmiar");
  if (found === undefined) throw new Error("elipsa ma zawsze uchwyt rozmiaru");
  return found.pos;
};

/** Największe `a` w [lo, hi], dla którego uchwyt rozmiaru (wzięty z `handlePositions`,
 *  z łukiem albo bez) jeszcze leży w planszy. Z łukiem `sizeHandlePos` nie jest funkcją
 *  liniową `a` (przez `b = √(a²−c²)`), więc nie ma zamkniętego wzoru jak dla samej osi —
 *  bisekcja zamiast tego: 40 kroków daje błąd < (hi−lo)/2⁴⁰, więc w praktyce dokładne.
 *  Zakładamy, że `inBoard(sizeHandlePos(s, lo))` — `lo` to najmniejsze poprawne `a`, blisko
 *  ognisk, a audyt kontrolera potwierdza, że żaden poziom nie ma ogniska poza planszą.
 *  Gdyby TO nie trzymało (ogniska tuż przy przeciwległych rogach), istnienie elipsy
 *  (`a > c`) ma pierwszeństwo — zwracamy `lo`, choć jego uchwyt wystaje o promil. */
const maxSizeHandleA = (s: EllipseShape, lo: number, hi: number): number => {
  if (hi <= lo || !inBoard(sizeHandlePos(s, lo))) return lo;
  if (inBoard(sizeHandlePos(s, hi))) return hi;
  let l = lo;
  let h = hi;
  for (let i = 0; i < 40; i++) {
    const mid = (l + h) / 2;
    if (inBoard(sizeHandlePos(s, mid))) l = mid; else h = mid;
  }
  return l;
};

/** Przesuwa jeden koniec łuku elipsy `s` do parametru `t`; drugi koniec stoi w miejscu.
 *  Nowy koniec wybieramy najbliżej starego (bez skoku o 2π), a długość łuku zaciskamy do
 *  [MIN_ARC_LENGTH, obwód − MIN_ARC_LENGTH], więc końce się nie mijają. Wynik: nowy
 *  środek i nowa długość łuku.
 *
 *  Znane zachowanie: gdy koniec już stoi na zacisku i palec jedzie dalej o więcej niż π
 *  (w parametrze) za jego starą pozycję, `wrap` wybiera drugi reprezentant kąta i koniec
 *  przeskakuje od razu pod palec. Akceptujemy to — koniec zawsze zostaje na krzywej,
 *  a długość łuku zawsze mieści się w zakresie. */
export function moveArcEnd(s: EllipseShape & { arc: ArcRange }, which: "poczatek" | "koniec", t: number): ArcRange {
  const { start, end } = arcParams(s, s.arc);
  const max = perimeter(s) - MIN_ARC_LENGTH;
  if (which === "poczatek") {
    const moved = start + wrap(t - start);
    const len = clamp(arcLengthBetween(s, moved, end), MIN_ARC_LENGTH, max);
    return arcFromParams(s, paramAtLength(s, end, -len), end);
  }
  const moved = end + wrap(t - end);
  const len = clamp(arcLengthBetween(s, start, moved), MIN_ARC_LENGTH, max);
  return arcFromParams(s, start, paramAtLength(s, start, len));
}

/** Parabola przestaje istnieć, gdy ognisko usiądzie w wierzchołku, więc odsuwamy je
 *  o MIN_GAP wzdłuż dotychczasowej osi — tak jak elipsa broni się przed a ≤ c. */
function dragParabola(s: ParabolaShape, handle: Handle, to: Vec2): ParabolaShape {
  const os = norm(sub(s.focus, s.vertex));
  if (handle === "ognisko") {
    const focus = dist(to, s.vertex) < MIN_GAP ? add(s.vertex, scale(os, MIN_GAP)) : to;
    return { ...s, focus };
  }
  if (handle !== "wierzcholek") return s;
  const vertex = dist(s.focus, to) < MIN_GAP ? add(s.focus, scale(os, -MIN_GAP)) : to;
  return { ...s, vertex };
}

/** Najkrótsze lustro-odcinek. Nie MIN_GAP: przy krótszym trzy uchwyty odcinka leżą bliżej
 *  siebie niż promień łapania palcem, więc gracz nie umie złapać końca osobno od środka. */
export const MIN_SEGMENT_LENGTH = 0.2;

/** Koniec odcinka odsunięty od drugiego końca na co najmniej MIN_SEGMENT_LENGTH. Najpierw
 *  próbujemy dalej wzdłuż kierunku palca, potem w przeciwną stronę — odcinek zostaje na
 *  swojej prostej. W rogu planszy po skosie obie strony mogą wypaść (np. drugi koniec w
 *  (0.95, -0.95)), więc ostatnia próba idzie od drugiego końca ku środkowi planszy: każda
 *  współrzędna maleje wtedy co do modułu (albo, gdy drugi koniec leży bliżej środka niż
 *  MIN_SEGMENT_LENGTH, wynik ląduje w tej odległości od środka), więc zawsze się mieści. */
const keepLength = (moved: Vec2, other: Vec2, fallback: Vec2): Vec2 => {
  const d = dist(moved, other);
  if (d >= MIN_SEGMENT_LENGTH) return moved;
  // odcinek zdegenerowany (oba końce w jednym punkcie) nie ma kierunku do normalizacji
  const dir = d < 1e-12 ? (dist(fallback, vec(0, 0)) < 1e-12 ? vec(1, 0) : norm(fallback)) : norm(sub(moved, other));
  const there = add(other, scale(dir, MIN_SEGMENT_LENGTH));
  if (inBoard(there)) return there;
  const back = add(other, scale(dir, -MIN_SEGMENT_LENGTH));
  if (inBoard(back)) return back;
  const toCentre = dist(other, vec(0, 0)) < 1e-12 ? vec(1, 0) : norm(sub(vec(0, 0), other));
  return add(other, scale(toCentre, MIN_SEGMENT_LENGTH));
};

/** Odcinek: końce idą za palcem (z minimalną długością), środek przesuwa cały odcinek bez
 *  obrotu — o tyle, o ile oba końce zostają w planszy. */
function dragSegment(s: SegmentShape, handle: Handle, to: Vec2): SegmentShape {
  if (handle === "koniec1") return { ...s, from: keepLength(to, s.to, sub(s.from, s.to)) };
  if (handle === "koniec2") return { ...s, to: keepLength(to, s.from, sub(s.to, s.from)) };
  if (handle !== "srodek") return s;
  const d = sub(to, scale(add(s.from, s.to), 0.5));
  const dx = clamp(d.x, BOARD_MIN - Math.min(s.from.x, s.to.x), BOARD_MAX - Math.max(s.from.x, s.to.x));
  const dy = clamp(d.y, BOARD_MIN - Math.min(s.from.y, s.to.y), BOARD_MAX - Math.max(s.from.y, s.to.y));
  const delta = { x: dx, y: dy };
  return { ...s, from: add(s.from, delta), to: add(s.to, delta) };
}

/** Gdy przeciągane ognisko usiądzie na drugim, c → 0 i żadne a nie mieści się w (0, c) —
 *  `fit` poniżej wtedy nie ma z czego wybrać. Tak jak parabola broni się przed ogniskiem
 *  w wierzchołku, odsuwamy przeciągane ognisko o MIN_FOCUS_GAP od drugiego, zamiast
 *  pozwolić im się zlać w jeden punkt. */
const MIN_FOCUS_GAP = 10 * MIN_GAP;
const keepApart = (moved: Vec2, other: Vec2, fallbackAxis: Vec2): Vec2 => {
  const d = dist(moved, other);
  if (d >= MIN_FOCUS_GAP) return moved;
  const dir = d < 1e-12 ? fallbackAxis : norm(sub(moved, other));
  return add(other, scale(dir, MIN_FOCUS_GAP));
};

/** Hiperbola istnieje tylko przy 0 < a < c, więc KAŻDE przeciągnięcie kończy się
 *  zaciśnięciem `a` do tego przedziału. Gałąź jest daną poziomu — uchwyt rozmiaru
 *  bierze z palca tylko ODLEGŁOŚĆ od środka wzdłuż osi, nigdy stronę.
 *
 *  Oba brzegi zacisku muszą kurczyć się razem z `c`, nie tylko górny: STAŁA dolna
 *  (czy górna) granica prędzej czy później staje się większa niż samo `c`, gdy
 *  ogniska są blisko siebie — to dokładnie stąd wziął się pierwotny defekt (stała
 *  `MIN_GAP * 2` jako sufit przy `c → 0`). Zamiast stałej używamy ułamka `c`: górny
 *  brzeg to `c` pomniejszone o mniejsze z (MIN_GAP, c/2), więc zawsze zostaje
 *  ściśle mniejszy od `c` i nie mniejszy niż `c/2`; dolny brzeg to mniejsze z
 *  (MIN_GAP, górny brzeg), więc nigdy go nie przekracza. Dla każdego c > 0 daje to
 *  0 < lo ≤ hi < c.
 *
 *  `lockedA`: `a` ze startu poziomu, gdy uchwyt „rozmiar” tego elementu jest zablokowany —
 *  patrz komentarz przy `applyDrag`. Przy przeciąganiu ogniska podstawiamy ją PRZED
 *  zaciskiem `fit`, więc `a` wraca do wartości poziomu, gdy ogniska się rozejdą z powrotem;
 *  gdy są blisko, `fit` i tak przytnie ją do (0, c) — zacisk ma pierwszeństwo, bo hiperbola
 *  bez niego przestałaby istnieć. Bez `lockedA` zachowanie jest jak dawniej: `a` startu
 *  bieżącego stanu, tylko przycięte. */
function dragHyperbola(s: HyperbolaShape, handle: Handle, to: Vec2, lockedA?: number): HyperbolaShape {
  const fit = (x: HyperbolaShape): HyperbolaShape => {
    const c = dist(x.f1, x.f2) / 2;
    const hi = c - Math.min(MIN_GAP, c / 2);
    const lo = Math.min(MIN_GAP, hi);
    return { ...x, a: clamp(x.a, lo, hi) };
  };
  if (handle === "ognisko1") {
    return fit({ ...s, f1: keepApart(to, s.f2, norm(sub(s.f1, s.f2))), a: lockedA ?? s.a });
  }
  if (handle === "ognisko2") {
    return fit({ ...s, f2: keepApart(to, s.f1, norm(sub(s.f2, s.f1))), a: lockedA ?? s.a });
  }
  if (handle !== "rozmiar") return s;
  const center = scale(add(s.f1, s.f2), 0.5);
  return fit({ ...s, a: Math.abs(dot(sub(to, center), norm(sub(s.f2, s.f1)))) });
}

/** Wartość `lockedA` dla `applyDrag`: `a` ze startu poziomu, gdy uchwyt „rozmiar”
 *  elementu jest zablokowany, inaczej `undefined`. Przy zablokowanym uchwycie rozmiar wraca
 *  do wartości poziomu, gdy ogniska znów się zejdą — patrz komentarz w `applyDrag` i
 *  `dragHyperbola`. Dotyczy elipsy i hiperboli (obie mają pole `a`); parabola nie ma uchwytu
 *  rozmiaru, więc nie ma go czym zablokować. Jedna funkcja dla gry (`screens.ts`) i testu
 *  szarej strefy, żeby nie mogły się rozjechać. */
export function lockedSize(def: PlayerPiece): number | undefined {
  return def.locked.includes("rozmiar") && (def.start.kind === "elipsa" || def.start.kind === "hiperbola")
    ? def.start.a : undefined;
}

/** `lockedA`: wartość `a` ze startu poziomu, gdy uchwyt „rozmiar” tego elementu jest
 *  zablokowany (patrz `PlayerPiece.locked` i `lockedSize`); w przeciwnym razie `undefined`.
 *
 *  Przeciążenie na `EllipseShape` istnieje, bo zwykły `MovableShape → MovableShape`
 *  gubi dla wywołującego wiedzę, że wynik przeciągnięcia elipsy jest dalej elipsą —
 *  TypeScript nie wnioskuje tego sam z unii bez przeciążenia, a etapy 1–2 mają kod,
 *  który po `applyDrag` od razu czyta pola elipsy (`.a`, `.f1`, `.arc`) bez zawężania. */
export function applyDrag(state: EllipseShape, handle: Handle, to: Vec2, lockedA?: number): EllipseShape;
export function applyDrag(state: MovableShape, handle: Handle, to: Vec2, lockedA?: number): MovableShape;
export function applyDrag(
  state: MovableShape, handle: Handle, to: Vec2, lockedA?: number,
): MovableShape {
  // Przycięcie NAJPIERW, cała reszta funkcji dostaje już punkt z planszy — patrz
  // komentarz przy `clampToBoard`. Przyskakiwanie (`snapTo`) dzieje się WCZEŚNIEJ,
  // w `screens.ts`, na surowej pozycji palca — jeśli przycięlibyśmy przed przyskokiem,
  // ognisko upuszczone tuż za brzegiem obok celu leżącego NA brzegu przestałoby łapać
  // (odległość do celu liczona od przyciętego punktu, nie od palca, bywałaby większa
  // niż promień). Cele przyskakiwania (ogniska poziomu) same leżą w planszy, więc
  // wynik przyskoku i tak przechodzi przez przycięcie bez zmiany.
  const clamped = clampToBoard(to);
  if (state.kind === "odcinek") return dragSegment(state, handle, clamped);
  if (state.kind === "parabola") return dragParabola(state, handle, clamped);
  if (state.kind === "hiperbola") return dragHyperbola(state, handle, clamped, lockedA);
  if (handle === "poczatek" || handle === "koniec") {
    // kąt palca w układzie elipsy → parametr: uchwyt ślizga się po krzywej, nie schodzi z niej.
    // Przycięcie zmienia coś tylko, gdy palec jest poza planszą — inaczej parametr wychodzi
    // z tego samego punktu jak dawniej.
    if (state.arc === undefined) return state;
    return { ...state, arc: moveArcEnd({ ...state, arc: state.arc }, handle, ellipseParam(state, clamped)) };
  }
  if (handle === "rozmiar") {
    const aMin = dist(state.f1, state.f2) / 2 + MIN_GAP;
    const aRaw = (dist(clamped, state.f1) + dist(clamped, state.f2)) / 2;
    // Uchwyt rozmiaru NIE stoi pod palcem — bez łuku renderuje się w ustalonym kierunku
    // osi (`środek + oś·a`), z łukiem w środku łuku (`ellipsePoint(s, arc.mid)`, zależne
    // od `a` inaczej, przez półoś małą `b = √(a²−c²)`). Samo przycięcie palca do planszy
    // nie wystarcza w obu przypadkach: przy ogniskach blisko środka odległość od palca
    // w rogu planszy do obu ognisk daje `a`, którego uchwyt (w KTÓRYMKOLWIEK z tych dwóch
    // wzorów) ląduje daleko poza planszą. Więc ścinamy `a` do największej wartości, przy
    // której PRAWDZIWA pozycja uchwytu (patrz `sizeHandlePos` — ta sama formuła, co
    // rysowanie) jeszcze leży w planszy; istnienie elipsy (a > c) ma pierwszeństwo,
    // gdyby te granice się pogryzły (patrz komentarz przy `maxSizeHandleA`).
    const a = maxSizeHandleA(state, aMin, Math.max(aMin, aRaw));
    return { ...state, a };
  }
  // Ognisk nic nie ogranicza; gdy się rozjadą, rozmiar rośnie, żeby elipsa istniała.
  // Bez `lockedA` rozmiar nigdy sam nie maleje — nawet przy zablokowanym uchwycie
  // rozmiaru — bo inaczej dużą elipsą dałoby się zastąpić całą kaskadę (łuk ma stałą
  // DŁUGOŚĆ, patrz ArcRange). Z `lockedA` (start poziomu, gdy uchwyt rozmiaru jest
  // zablokowany) rozmiar WRACA do tej wartości, gdy ogniska znów się zejdą — inaczej
  // gracz, który przeciągnął ognisko za daleko (choćby po drodze do celu), utknąłby
  // z elipsą za dużą, żeby wygrać, a zablokowany uchwyt nie pozwoliłby mu tego cofnąć.
  const next = handle === "ognisko1" ? { ...state, f1: clamped } : { ...state, f2: clamped };
  return { ...next, a: Math.max(lockedA ?? next.a, dist(next.f1, next.f2) / 2 + MIN_GAP) };
}
