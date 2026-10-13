import { describe, it, expect } from "vitest";
import { Vec2, dot, norm, sub } from "../../src/core/vec";
import { CARDS, LEVELS, cardFor, introCard, sceneTraces } from "../../src/levels";

const IDS = LEVELS.map((l) => l.id);
/** Kierunek ostatniego odcinka toru — dokąd piłka leci po ostatnim odbiciu. */
const lastDir = (path: Vec2[]): Vec2 => norm(sub(path[path.length - 1], path[path.length - 2]));
const card = (id: string) => {
  const c = CARDS.find((x) => x.id === id);
  if (c === undefined) throw new Error(`brak planszy ${id}`);
  return c;
};

describe("plansze z zasadą — dane", () => {
  it("każda plansza stoi przed istniejącym poziomem, każda przed innym", () => {
    for (const c of CARDS) expect(IDS, c.id).toContain(c.before);
    expect(new Set(CARDS.map((c) => c.before)).size).toBe(CARDS.length);
  });

  it("kolejność plansz to kolejność ich poziomów", () => {
    const at = CARDS.map((c) => IDS.indexOf(c.before));
    for (let i = 1; i < at.length; i++) expect(at[i], CARDS[i].id).toBeGreaterThan(at[i - 1]);
  });

  it("pierwsza plansza stoi przed pierwszym poziomem — „?\" ma zawsze co otworzyć", () => {
    expect(CARDS[0].before).toBe(IDS[0]);
    for (let i = 0; i < IDS.length; i++) expect(cardFor(IDS, i), IDS[i]).toBeDefined();
  });

  it("sześć mechanik: odbicie, elipsa, łuk, kaskada, parabola, hiperbola", () => {
    expect(CARDS.map((c) => [c.id, c.before])).toEqual([
      ["odbicie", "odbicie"], ["elipsa", "ogniska"], ["luk", "polelipsa"],
      ["kaskada", "kaskada"], ["parabola", "ognisko-paraboli"], ["hiperbola", "druga-strona"],
    ]);
  });
});

describe("która plansza dla którego poziomu", () => {
  it("na poziomie, przed którym stoi plansza — ta plansza", () => {
    for (const c of CARDS) expect(cardFor(IDS, IDS.indexOf(c.before))?.id).toBe(c.id);
  });

  it("tuż przed następną planszą — wciąż poprzednia", () => {
    for (let i = 1; i < CARDS.length; i++) {
      expect(cardFor(IDS, IDS.indexOf(CARDS[i].before) - 1)?.id).toBe(CARDS[i - 1].id);
    }
  });

  it("ostatni poziom gry należy do ostatniej planszy", () => {
    expect(cardFor(IDS, IDS.length - 1)?.id).toBe(CARDS[CARDS.length - 1].id);
  });

  it("plansza pokazuje się sama tylko na swoim poziomie", () => {
    expect(introCard("ogniska")?.id).toBe("elipsa");
    expect(introCard("rozmiar")).toBeUndefined();
  });
});

describe("sceny plansz pokazują to, co mówi zdanie", () => {
  it("każda scena się liczy, a scena z dołkiem trafia wszystkimi strzałami", () => {
    for (const c of CARDS) {
      c.scenes.forEach((s, i) => {
        const tory = sceneTraces(s);
        expect(tory, `${c.id} scena ${i}`).toHaveLength(s.shots.length);
        if (s.hole !== undefined) expect(tory.every((t) => t.holed), `${c.id} scena ${i}`).toBe(true);
      });
    }
  });

  it("odbicie: kąt padania równy kątowi odbicia", () => {
    const s = card("odbicie").scenes[0];
    const lustro = s.shapes[0];
    if (lustro.kind !== "odcinek") throw new Error("zły rodzaj");
    const [tor] = sceneTraces(s);
    const przed = norm(sub(tor.path[1], tor.path[0]));
    const po = norm(sub(tor.path[2], tor.path[1]));
    const wzdluz = norm(sub(lustro.to, lustro.from));
    // składowa wzdłuż lustra bez zmian, składowa w poprzek — ta sama co do wartości, odwrócona
    expect(dot(po, wzdluz)).toBeCloseTo(dot(przed, wzdluz), 12);
    expect(Math.abs(1 - dot(po, wzdluz) ** 2 - (1 - dot(przed, wzdluz) ** 2))).toBeLessThan(1e-12);
    expect(tor.path[1].y).toBeCloseTo(0.4, 12);
  });

  it("elipsa: płaskie lustro rozsyła wachlarz — po odbiciu każda piłka leci gdzie indziej", () => {
    const tory = sceneTraces(card("elipsa").scenes[0]);
    const katy = tory.map((t) => Math.atan2(lastDir(t.path).y, lastDir(t.path).x)).sort((a, b) => a - b);
    for (let i = 1; i < katy.length; i++) expect(katy[i] - katy[i - 1]).toBeGreaterThan(0.05);
  });

  it("parabola: z ogniska — po odbiciu wszystkie równolegle do osi", () => {
    for (const t of sceneTraces(card("parabola").scenes[0])) {
      expect(t.path.length - 2, "jedno odbicie od paraboli").toBeGreaterThanOrEqual(1);
      expect(Math.abs(norm(sub(t.path[2], t.path[1])).y)).toBeLessThan(1e-9);
    }
  });

  it("hiperbola: strzały w jedno ognisko trafiają w drugie po JEDNYM odbiciu", () => {
    for (const t of sceneTraces(card("hiperbola").scenes[0])) {
      expect(t.holed).toBe(true);
      expect(t.path.length - 2).toBe(1);
    }
  });
});
