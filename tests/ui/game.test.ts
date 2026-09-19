import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { pathLength } from "../../src/render/trails";
import { advance, newGame, preview, startProof, BALL_SPEED } from "../../src/ui/game";

const level = LEVELS[0];

describe("stan gry", () => {
  it("nowa gra startuje w edycji, ze stanem początkowym poziomu", () => {
    const g = newGame(level);
    expect(g.phase).toBe("edycja");
    expect(g.pieces).toEqual([level.pieces[0].start]);
    expect(g.proof).toBeNull();
  });

  it("podgląd używa dwóch piłek, nie ośmiu", () => {
    expect(preview(newGame(level)).balls).toHaveLength(2);
  });

  it("uruchomienie dowodu daje osiem piłek i fazę dowodu", () => {
    const g = startProof({ ...newGame(level), pieces: [level.pieces[0].solution] });
    expect(g.phase).toBe("dowod");
    expect(g.proof?.balls).toHaveLength(8);
    expect(g.elapsed).toBe(0);
  });

  it("poprawne rozwiązanie kończy się wygraną po przebiegu animacji", () => {
    let g = startProof({ ...newGame(level), pieces: [level.pieces[0].solution] });
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("wygrana");
  });

  it("złe rozwiązanie kończy się porażką", () => {
    let g = startProof(newGame(level));
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("porazka");
  });

  it("prędkość jest dosłowna: ta sama stała przy dwóch różnych długościach toru", () => {
    // Otoczenie jednego punktu przejścia z obu stron NIE dowodzi liniowości — dowolna
    // rosnąca krzywa wygładzająca o tym samym czasie całkowitym przechodzi taki test.
    // Dlatego mierzymy przy DWÓCH różnych długościach toru: poziom "rozmiar" rozwiązuje
    // każde `a`, więc a=0.75 daje tor 1.5, a a=1.0 daje 2.0. Jeśli faza zmienia się
    // dokładnie po `długość / BALL_SPEED` w obu przypadkach, stała prędkości jest ta sama
    // na obu dystansach — czyli odwzorowanie jest wprost proporcjonalne, a nie wygładzone.
    const free = LEVELS[1];
    for (const a of [0.75, 1.0]) {
      let g = startProof({ ...newGame(free), pieces: [{ ...free.pieces[0].solution, a }] });
      expect(g.proof!.solved, `a=${a}`).toBe(true);
      const longest = Math.max(...g.proof!.balls.map((b) => pathLength(b.path)));
      g = advance(g, longest / BALL_SPEED - 1e-6);
      expect(g.phase, `a=${a}`).toBe("dowod");
      g = advance(g, 2e-6);
      expect(g.phase, `a=${a}`).toBe("wygrana");
    }
  });

  it("advance jest bezczynne poza fazą dowodu i zwraca TEN SAM obiekt", () => {
    // Zadanie 13 woła `advance` co klatkę niezależnie od fazy — także na ekranie wygranej
    // i podczas edycji, czyli przez większość czasu życia gry. Świeży obiekt co klatkę
    // to śmiecenie w pętli renderu.
    const editing = newGame(level);
    expect(advance(editing, 1 / 60)).toBe(editing);

    let g = startProof({ ...newGame(level), pieces: [level.pieces[0].solution] });
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("wygrana");
    expect(advance(g, 1 / 60)).toBe(g);
  });

  describe("stan gry etapu 2", () => {
    it("podgląd na poziomie z wachlarzem strzela w wachlarz", () => {
      const fan = LEVELS.find((l) => l.sector !== undefined)!;
      const { center, width } = fan.sector!;
      for (const b of preview(newGame(fan)).balls) {
        const t = Math.atan2(b.path[1].y - b.path[0].y, b.path[1].x - b.path[0].x);
        const off = Math.atan2(Math.sin(t - center), Math.cos(t - center));
        expect(Math.abs(off)).toBeLessThan(width / 2);
      }
    });

    it.each(LEVELS.slice(8).map((l) => [l.id, l] as const))(
      "poziom %s: rozwiązanie kończy się wygraną w pętli gry",
      (_id, lvl) => {
        let g = startProof({ ...newGame(lvl), pieces: lvl.pieces.map((p) => p.solution) });
        for (let i = 0; i < 1200 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
        expect(g.phase).toBe("wygrana");
      },
    );
  });
});
