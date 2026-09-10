import { describe, it, expect } from "vitest";
import { LEVELS } from "../../src/levels";
import { pathLength } from "../../src/render/trails";
import { advance, newGame, preview, startProof, BALL_SPEED } from "../../src/ui/game";

const level = LEVELS[0];

describe("stan gry", () => {
  it("nowa gra startuje w edycji, ze stanem początkowym poziomu", () => {
    const g = newGame(level);
    expect(g.phase).toBe("edycja");
    expect(g.ellipse).toEqual(level.start);
    expect(g.proof).toBeNull();
  });

  it("podgląd używa dwóch piłek, nie ośmiu", () => {
    expect(preview(newGame(level)).balls).toHaveLength(2);
  });

  it("uruchomienie dowodu daje osiem piłek i fazę dowodu", () => {
    const g = startProof({ ...newGame(level), ellipse: level.solution });
    expect(g.phase).toBe("dowod");
    expect(g.proof?.balls).toHaveLength(8);
    expect(g.elapsed).toBe(0);
  });

  it("poprawne rozwiązanie kończy się wygraną po przebiegu animacji", () => {
    let g = startProof({ ...newGame(level), ellipse: level.solution });
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("wygrana");
  });

  it("złe rozwiązanie kończy się porażką", () => {
    let g = startProof(newGame(level));
    for (let i = 0; i < 600 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    expect(g.phase).toBe("porazka");
  });

  it("prędkość jest dosłowna: faza zmienia się dokładnie po długość / prędkość", () => {
    let g = startProof({ ...newGame(level), ellipse: level.solution });
    const longest = Math.max(...g.proof!.balls.map((b) => pathLength(b.path)));
    g = advance(g, longest / BALL_SPEED - 1e-6);
    expect(g.phase).toBe("dowod");
    g = advance(g, 2e-6);
    expect(g.phase).toBe("wygrana");
  });
});
