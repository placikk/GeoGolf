import { describe, it, expect } from "vitest";
import { Store } from "../../src/ui/progress";
import { DEFAULT_SETTINGS, SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "../../src/ui/settings";

const memory = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
};

const broken: Store = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
};

describe("ustawienia", () => {
  it("domyślnie oba przełączniki są wyłączone", () => {
    expect(DEFAULT_SETTINGS).toEqual({ previewPaths: false, hints: false });
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
  });

  it("bez pamięci zwraca kopię domyślnych, nie referencję (nikt jej nie zmutuje)", () => {
    expect(loadSettings(null)).not.toBe(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("zapis wraca po ponownym wczytaniu, pod własnym kluczem (nie psuje postępu)", () => {
    const s = memory({ "golf-geometryczny/postep": '{"solved":["skos"],"last":2}' });
    saveSettings(s, { previewPaths: true, hints: false });
    expect(loadSettings(s)).toEqual({ previewPaths: true, hints: false });
    expect(s.data["golf-geometryczny/postep"]).toBe('{"solved":["skos"],"last":2}');
  });

  it("przełączenie jednego ustawienia nie zmienia drugiego", () => {
    const on = toggleSetting(DEFAULT_SETTINGS, "hints");
    expect(on).toEqual({ previewPaths: false, hints: true });
    expect(toggleSetting(on, "hints")).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ previewPaths: false, hints: false });   // bez mutacji
  });

  it("brak pamięci i pamięć rzucająca wyjątkami nie wywracają gry", () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(null, DEFAULT_SETTINGS)).not.toThrow();
    expect(() => saveSettings(broken, DEFAULT_SETTINGS)).not.toThrow();
  });

  it("uszkodzony zapis daje ustawienia domyślne; tylko jawne true włącza", () => {
    for (const raw of ["{", "null", "42", '{"previewPaths":"tak","hints":1}', "[]"]) {
      expect(loadSettings(memory({ "golf-geometryczny/ustawienia": raw })), raw).toEqual(DEFAULT_SETTINGS);
    }
  });

  it("ekran ustawień ma wiersz dla każdego ustawienia, z polską etykietą", () => {
    expect(SETTING_ROWS.map((r) => r.key).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
    expect(SETTING_ROWS.map((r) => r.label)).toEqual(["Tory podglądu", "Podpowiedzi"]);
  });
});
