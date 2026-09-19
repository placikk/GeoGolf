import { describe, it, expect } from "vitest";
import { loadProgress, markSolved, saveProgress, Store } from "../../src/ui/progress";

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

describe("postęp", () => {
  it("bez zapisu zaczyna od pierwszego poziomu i niczego zaliczonego", () => {
    expect(loadProgress(memory(), 8)).toEqual({ solved: [], last: 0 });
  });

  it("zapisany postęp wraca po ponownym wczytaniu", () => {
    const s = memory();
    saveProgress(s, { solved: ["ogniska", "skos"], last: 3 });
    expect(loadProgress(s, 8)).toEqual({ solved: ["ogniska", "skos"], last: 3 });
  });

  it("brak pamięci przeglądarki nie wywraca gry", () => {
    expect(loadProgress(null, 8)).toEqual({ solved: [], last: 0 });
    expect(() => saveProgress(null, { solved: [], last: 0 })).not.toThrow();
  });

  it("pamięć rzucająca wyjątkami nie wywraca gry", () => {
    expect(loadProgress(broken, 8)).toEqual({ solved: [], last: 0 });
    expect(() => saveProgress(broken, { solved: ["x"], last: 1 })).not.toThrow();
  });

  it("uszkodzony zapis daje stan domyślny", () => {
    for (const raw of ["{", "null", "42", '{"solved":"x","last":"y"}', '{"solved":[1,2],"last":1}']) {
      const p = loadProgress(memory({ "golf-geometryczny/postep": raw }), 8);
      expect(p.solved.every((s) => typeof s === "string"), raw).toBe(true);
      expect(Number.isInteger(p.last) && p.last >= 0 && p.last < 8, raw).toBe(true);
    }
  });

  it("ostatni poziom spoza zakresu (np. po usunięciu poziomów) wraca do pierwszego", () => {
    const s = memory();
    saveProgress(s, { solved: [], last: 11 });
    expect(loadProgress(s, 8).last).toBe(0);
  });

  it("zaliczenie dopisuje poziom raz, bez duplikatów", () => {
    const p = markSolved(markSolved({ solved: [], last: 0 }, "skos"), "skos");
    expect(p.solved).toEqual(["skos"]);
  });
});
