import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { LEVELS, Level, parabola, HOLE_RADIUS } from "../../src/levels";
import { pathLength } from "../../src/render/trails";
import { advance, newGame, preview, retry, startProof, BALL_SPEED } from "../../src/ui/game";

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
      const resized = { ...free.pieces[0].solution, a };
      let g = startProof({ ...newGame(free), pieces: [resized] });
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
    it("poziom z dwoma elementami startuje z oboma", () => {
      const two = LEVELS.find((l) => l.pieces.length === 2)!;
      expect(newGame(two).pieces).toEqual(two.pieces.map((p) => p.start));
    });

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

describe("jeszcze raz", () => {
  const lvl = LEVELS[1];
  // ustawienie gracza inne niż start i inne niż zapisane rozwiązanie
  const mine = { ...lvl.pieces[0].solution, a: 0.9 };

  const finish = (g: ReturnType<typeof newGame>) => {
    for (let i = 0; i < 1200 && g.phase === "dowod"; i++) g = advance(g, 1 / 60);
    return g;
  };

  it("po wygranej wraca do edycji z TYM SAMYM ustawieniem (tożsamość obiektów)", () => {
    const won = finish(startProof({ ...newGame(lvl), pieces: [mine] }));
    expect(won.phase).toBe("wygrana");
    const again = retry(won);
    expect(again.phase).toBe("edycja");
    expect(again.proof).toBeNull();
    expect(again.elapsed).toBe(0);
    expect(again.pieces).toBe(won.pieces);
    expect(again.pieces[0]).toBe(mine);
  });

  it("po porażce też: ustawienie zostaje, nie wraca stan startowy", () => {
    const bad = { ...mine, f1: { x: -0.1, y: 0.3 } };
    const lost = finish(startProof({ ...newGame(lvl), pieces: [bad] }));
    expect(lost.phase).toBe("porazka");
    expect(retry(lost).pieces[0]).toBe(bad);
  });

  it("w trakcie dowodu: przerwanie wraca do edycji z tym samym ustawieniem", () => {
    const running = advance(startProof({ ...newGame(lvl), pieces: [mine] }), 0.1);
    expect(running.phase).toBe("dowod");
    expect(retry(running).pieces[0]).toBe(mine);
  });

  it("nowa gra nadal daje stan startowy", () => {
    expect(newGame(lvl).pieces).toEqual([lvl.pieces[0].start]);
  });
});

describe("gra z krzywą nieograniczoną", () => {
  // dwie parabole naprzeciw siebie: ognisko → wiązka równoległa → drugie ognisko
  const poziom: Level = {
    id: "test-parabola", title: "test", hint: "",
    ball: vec(-0.5, 0), hole: vec(0.5, 0),
    pieces: [{
      start: parabola(vec(-0.45, 0.3), vec(-0.8, 0), { mid: 0, span: 1.2 }),
      solution: parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 }),
      locked: ["wierzcholek"],
    }],
    obstacles: [parabola(vec(0.5, 0), vec(0.8, 0), { mid: 0, span: 1.2 })],
    sector: { center: Math.PI, width: 2 },
    // Dołek MUSI być mniejszy niż na prawdziwych poziomach. Piłka, dołek i oba wierzchołki
    // leżą na jednej osi, a wachlarz mierzy dokładnie wokół tej osi — promień odbity od
    // pierwszej paraboli pod kątem δ od ogniska trafia w nią w parametrze t = 2p·tan(δ/2)
    // (p = odległość ognisko-wierzchołek = 0.3) i leci dalej równolegle do osi na wysokości
    // y = t. Dla dwóch najbliższych osi promieni (δ = width/(2·balls) = 0.125) wychodzi
    // y = 2·0.3·tan(0.0625) ≈ 0.0375 — MNIEJ niż HOLE_RADIUS ≈ 0.0566. `trace` sprawdza
    // dołek PRZED każdym odbiciem (zamierzone, nie błąd — patrz `src/core/trace.ts`), więc
    // przy zwykłym HOLE_RADIUS te dwie piłki wpadałyby do dołka w locie, zanim dotrą do
    // drugiej paraboli — test dowodziłby czegoś innego, niż deklaruje. HOLE_RADIUS / 3
    // (≈0.0189) zostawia margines ~2× (0.0375 / 0.0189), więc jedyna droga do dołka to
    // naprawdę dwa odbicia — dokładnie to, co ten test ma udowodnić.
    test: { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS / 3 },
  };

  it("rozwiązanie wygrywa, stan startowy nie", () => {
    const rozw = { ...newGame(poziom), pieces: poziom.pieces.map((p) => p.solution) };
    expect(startProof(rozw).proof!.solved).toBe(true);
    expect(startProof(newGame(poziom)).proof!.solved).toBe(false);
  });

  it("wszystkie osiem odbija się dwa razy — to jest konstrukcja dwustopniowa", () => {
    const rozw = { ...newGame(poziom), pieces: poziom.pieces.map((p) => p.solution) };
    for (const b of startProof(rozw).proof!.balls) {
      expect(b.path).toHaveLength(4); // start, odbicie, odbicie, dołek
    }
  });
});
