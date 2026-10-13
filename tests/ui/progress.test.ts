import { describe, it, expect } from "vitest";
import { LEGACY_ORDER, loadProgress, markSolved, saveProgress, Store } from "../../src/ui/progress";
import { LEVELS } from "../../src/levels";

const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
};

const broken: Store = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

const KEY = "golf-geometryczny/postep";
const IDS = LEVELS.map((l) => l.id);

describe("postęp", () => {
  it("bez zapisu zaczyna od pierwszego poziomu i niczego zaliczonego", () => {
    expect(loadProgress(memory(), IDS)).toEqual({ solved: [], lastId: null });
  });

  it("zapisany postęp wraca po ponownym wczytaniu", () => {
    const s = memory();
    saveProgress(s, { solved: ["ogniska", "skos"], lastId: "skos" });
    expect(loadProgress(s, IDS)).toEqual({ solved: ["ogniska", "skos"], lastId: "skos" });
  });

  it("brak pamięci przeglądarki nie wywraca gry", () => {
    expect(loadProgress(null, IDS)).toEqual({ solved: [], lastId: null });
    expect(() => saveProgress(null, { solved: [], lastId: null })).not.toThrow();
  });

  it("pamięć rzucająca wyjątkami nie wywraca gry", () => {
    expect(loadProgress(broken, IDS)).toEqual({ solved: [], lastId: null });
    expect(() => saveProgress(broken, { solved: ["x"], lastId: "x" })).not.toThrow();
  });

  it("uszkodzony zapis daje stan domyślny", () => {
    for (const raw of ["{", "null", "42", '"x"', '{"solved":"x","lastId":7}', '{"solved":[1,2],"last":"y"}']) {
      const p = loadProgress(memory({ [KEY]: raw }), IDS);
      expect(p.solved.every((s) => typeof s === "string"), raw).toBe(true);
      expect(p.lastId === null || IDS.includes(p.lastId), raw).toBe(true);
    }
  });

  it("ostatni poziom, którego już nie ma, daje brak zapisu ostatniego poziomu", () => {
    expect(loadProgress(memory({ [KEY]: '{"solved":[],"lastId":"usuniety"}' }), IDS).lastId).toBeNull();
  });

  // Stary zapis (przed etapem 0) trzymał INDEKS w kolejności 24 poziomów. Indeks 20 to był
  // poziom 21 „wspolne-ognisko" — po dodaniu etapu 0 i zamianie z „druga-strona" stoi on
  // pod innym numerem, a gracz ma wrócić dokładnie do niego, nie do poziomu 21 nowej listy.
  it("stary zapis z indeksem przelicza się na ten sam poziom, nie na ten sam numer", () => {
    const p = loadProgress(memory({ [KEY]: '{"solved":["ogniska"],"last":20}' }), IDS);
    expect(p).toEqual({ solved: ["ogniska"], lastId: "wspolne-ognisko" });
  });

  it("stary indeks spoza starej listy daje brak zapisu ostatniego poziomu", () => {
    for (const last of [-1, 24, 2.5]) {
      expect(loadProgress(memory({ [KEY]: JSON.stringify({ solved: [], last }) }), IDS).lastId, String(last)).toBeNull();
    }
  });

  it("stara kolejność to 24 różne identyfikatory, wszystkie wciąż w grze", () => {
    expect(LEGACY_ORDER).toHaveLength(24);
    expect(new Set(LEGACY_ORDER).size).toBe(24);
    for (const id of LEGACY_ORDER) expect(IDS, id).toContain(id);
  });

  it("zaliczenie dopisuje poziom raz, bez duplikatów", () => {
    const p = markSolved(markSolved({ solved: [], lastId: null }, "skos"), "skos");
    expect(p.solved).toEqual(["skos"]);
  });
});
