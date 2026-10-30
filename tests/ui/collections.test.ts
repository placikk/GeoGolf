import { describe, it, expect } from "vitest";
import { Store } from "../../src/ui/progress";
import {
  MAX_LINKS, MAX_PROJECTS, Project, addLink, loadLinks, loadProjects, removeProject, saveLinks, saveProjects, upsertProject,
} from "../../src/ui/collections";
import { encodeLevel } from "../../src/share/codec";
import { levelId } from "../../src/share/verify";
import { SAMPLES } from "../share/samples";
import { fromWire, toWire } from "../share/wire";

const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};
const broken: Store = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

const codes = SAMPLES.map(encodeLevel);
/** Poprawny szkic bez elementów i kod, który nie przechodzi dowodu (start = rozwiązanie). */
const emptyDraft = fromWire({ ...toWire(SAMPLES[0]), p: [] });
const startWins = encodeLevel({ ...SAMPLES[0], pieces: [{ ...SAMPLES[0].pieces[0], start: SAMPLES[0].pieces[0].solution }] });

describe("poziomy z linków", () => {
  it("zapis i odczyt, od najnowszego", () => {
    const s = memory();
    let list: string[] = [];
    for (const c of codes) list = addLink(list, c);
    saveLinks(s, list);
    expect(loadLinks(s)).toEqual([...codes].reverse());
  });

  it("ten sam poziom drugi raz nie dubluje się, tylko wraca na początek", () => {
    const list = addLink(addLink(addLink([], codes[0]), codes[1]), codes[0]);
    expect(list).toEqual([codes[0], codes[1]]);
  });

  it(`najwyżej ${MAX_LINKS} — najstarsze wypadają`, () => {
    let list: string[] = [];
    // różne poziomy: ten sam układ z innym tytułem ma inny kod i inny identyfikator
    for (let i = 0; i < MAX_LINKS + 5; i++) list = addLink(list, encodeLevel({ ...SAMPLES[0], title: `Poziom ${i}` }));
    expect(list).toHaveLength(MAX_LINKS);
    expect(levelId(list[0])).toBe(levelId(encodeLevel({ ...SAMPLES[0], title: `Poziom ${MAX_LINKS + 4}` })));
  });

  it("przy odczycie wypadają kody uszkodzone i nieprzechodzące dowodu", () => {
    const s = memory({ "golf-geometryczny/z-linkow": JSON.stringify([codes[0], "!!!", 42, startWins, emptyDraft, codes[1]]) });
    expect(loadLinks(s)).toEqual([codes[0], codes[1]]);
  });

  it("brak pamięci, wyjątki i śmieci dają pustą listę", () => {
    expect(loadLinks(null)).toEqual([]);
    expect(loadLinks(broken)).toEqual([]);
    expect(() => saveLinks(broken, codes)).not.toThrow();
    for (const raw of ["{", "null", "42", "{\"a\":1}"]) {
      expect(loadLinks(memory({ "golf-geometryczny/z-linkow": raw })), raw).toEqual([]);
    }
  });
});

describe("projekty autora", () => {
  const p = (key: string, code: string, ready = false): Project => ({ key, code, ready });

  it("zapis i odczyt, gotowy zostaje gotowy", () => {
    const s = memory();
    saveProjects(s, [p("a", codes[0], true), p("b", emptyDraft)]);
    expect(loadProjects(s)).toEqual([p("a", codes[0], true), p("b", emptyDraft)]);
  });

  it("„gotowy”, który nie przechodzi dowodu, wraca do szkicu", () => {
    const s = memory();
    saveProjects(s, [p("a", startWins, true)]);
    expect(loadProjects(s)).toEqual([p("a", startWins, false)]);
  });

  it("przy odczycie wypadają wpisy uszkodzone i powtórzone klucze", () => {
    const s = memory({
      "golf-geometryczny/moje": JSON.stringify([p("a", codes[0]), { key: "b" }, p("c", "!!!"), p("a", codes[1]), null, 7]),
    });
    expect(loadProjects(s)).toEqual([p("a", codes[0])]);
  });

  it("upsert: istniejący w miejscu, nowy na początek, ponad limit — null", () => {
    const list = [p("a", codes[0]), p("b", codes[1])];
    expect(upsertProject(list, p("b", codes[2]))).toEqual([p("a", codes[0]), p("b", codes[2])]);
    expect(upsertProject(list, p("c", codes[3]))).toEqual([p("c", codes[3]), ...list]);
    const full = Array.from({ length: MAX_PROJECTS }, (_, i) => p(`k${i}`, codes[0]));
    expect(upsertProject(full, p("nowy", codes[0]))).toBeNull();
    expect(upsertProject(full, p("k3", codes[1]))?.[3]).toEqual(p("k3", codes[1]));
  });

  it("usuwanie po kluczu", () => {
    expect(removeProject([p("a", codes[0]), p("b", codes[1])], "a")).toEqual([p("b", codes[1])]);
  });

  it("brak pamięci i wyjątki", () => {
    expect(loadProjects(null)).toEqual([]);
    expect(loadProjects(broken)).toEqual([]);
    expect(() => saveProjects(broken, [])).not.toThrow();
  });
});
