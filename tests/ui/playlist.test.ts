import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { encodeLevel } from "../../src/share/codec";
import { openCode } from "../../src/share/verify";
import { autoCardIn, bannerLabel, current, helpCard, isLastIn, nextIn } from "../../src/ui/playlist";
import { SAMPLES } from "../share/samples";

const community = SAMPLES.map((s) => {
  const o = openCode(encodeLevel(s));
  if (!o.ok) throw new Error(o.reason);
  return o.level;
});

describe("lista poziomów w grze", () => {
  it("twórcy: numer w banerze, plansza pod „?” i plansza przy wejściu jak dotąd", () => {
    const p = { section: "tworcy" as const, levels: LEVELS, index: 3 };
    expect(bannerLabel(p)).toBe(`Poziom 4 / ${LEVELS.length}`);
    expect(current(p).id).toBe("ogniska");
    expect(helpCard(p)?.id).toBe("elipsa");
    expect(autoCardIn(p, [])?.id).toBe("elipsa");
    expect(autoCardIn(p, ["ogniska"])).toBeUndefined();
  });

  it("społeczność: „Społeczność” w banerze, plansza według mechaniki, bez planszy przy wejściu", () => {
    const p = { section: "katalog" as const, levels: community, index: 2 }; // „Dwie parabole"
    expect(bannerLabel(p)).toBe("Społeczność");
    expect(helpCard(p)?.id).toBe("parabola");
    expect(autoCardIn(p, [])).toBeUndefined();
    expect(helpCard({ ...p, index: 4 })?.id).toBe("odbicie"); // „Lustro"
  });

  it("następny i ostatni na liście", () => {
    const p = { section: "linki" as const, levels: community, index: 0 };
    expect(nextIn(p).index).toBe(1);
    expect(isLastIn(p)).toBe(false);
    const last = { ...p, index: community.length - 1 };
    expect(isLastIn(last)).toBe(true);
    expect(nextIn(last).index).toBe(community.length - 1);
  });
});
