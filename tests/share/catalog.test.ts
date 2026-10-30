import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { COMMUNITY } from "../../src/levels/community";
import { encodeLevel } from "../../src/share/codec";
import { loadCatalog } from "../../src/share/catalog";
import { openCode } from "../../src/share/verify";
import { SAMPLES } from "./samples";

// Strażnik wydania: każdy wpis katalogu dopisany przez twórcę musi się otworzyć — odkodować
// i przejść dowód. Pusty katalog przechodzi, ale testy niżej sprawdzają samą procedurę na
// przykładowych poziomach, więc strażnik nie jest pusty, gdy katalog wreszcie się zapełni.
describe("katalog społeczności", () => {
  it.each(COMMUNITY.map((e, i) => [i, e] as const))("wpis %i otwiera się i przechodzi dowód", (_i, e) => {
    const o = openCode(e.link);
    expect(o.ok ? "ok" : o.reason).toBe("ok");
    expect(e.author.trim().length).toBeGreaterThan(0);
    expect([...e.author].length).toBeLessThanOrEqual(40);
  });

  it("identyfikatory katalogu są unikalne i rozłączne z poziomami twórców", () => {
    const ids = loadCatalog().map((c) => c.level.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tworcy = new Set(LEVELS.map((l) => l.id));
    for (const id of ids) expect(tworcy.has(id), id).toBe(false);
    expect(loadCatalog()).toHaveLength(COMMUNITY.length);
  });

  it("procedura na przykładach: wpisy odkodowane w tej samej kolejności, z autorem", () => {
    const entries = SAMPLES.map((s, i) => ({ link: encodeLevel(s), author: `Autor ${i}` }));
    const cat = loadCatalog(entries);
    expect(cat.map((c) => c.author)).toEqual(entries.map((e) => e.author));
    expect(cat.map((c) => c.level.title)).toEqual(SAMPLES.map((s) => s.title));
    expect(cat.every((c) => c.level.id.startsWith("spol-"))).toBe(true);
  });

  it("wpis, który się nie otwiera, nie trafia do gry", () => {
    expect(loadCatalog([{ link: "!!!", author: "x" }, { link: encodeLevel(SAMPLES[0]), author: "y" }]).map((c) => c.author))
      .toEqual(["y"]);
  });
});
