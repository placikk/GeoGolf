import { describe, it, expect } from "vitest";
import { add, scale, fromAngle } from "../src/core/vec";
import { ellipseFromFoci } from "../src/core/conic";
import { runProof } from "../src/core/verify";
import { EllipseState, Level, LEVELS, levelCurves, DIAGONAL, SNAP_RADIUS } from "../src/levels";

const proofFor = (level: Level, state: EllipseState) =>
  runProof({
    ball: level.ball,
    hole: level.hole,
    holeRadius: level.test.holeRadius,
    maxBounces: level.test.maxBounces,
    curves: levelCurves(level, state),
    aimCurve: ellipseFromFoci(state.f1, state.f2, state.a),
    count: level.test.balls,
  });

describe("poziomy", () => {
  it("jest ich osiem i każdy ma unikalny identyfikator", () => {
    expect(LEVELS).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(8);
  });

  it("niezmiennik: promień przyskakiwania nie jest mniejszy od pasa tolerancji", () => {
    expect(SNAP_RADIUS).toBeGreaterThanOrEqual(0.05 * DIAGONAL);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: zapisane rozwiązanie faktycznie rozwiązuje",
    (_id, level) => {
      expect(proofFor(level, level.solution).solved).toBe(true);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: stan początkowy NIE jest rozwiązaniem",
    (_id, level) => {
      expect(proofFor(level, level.start).solved).toBe(false);
    },
  );

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    "poziom %s: ognisko f1 przesunięte o promień przyskakiwania odpada",
    (_id, level) => {
      const d = SNAP_RADIUS;
      for (let i = 0; i < 8; i++) {
        const moved = { ...level.solution, f1: add(level.solution.f1, scale(fromAngle((i * Math.PI) / 4), d)) };
        // Przesunięcie ogniska może uczynić elipsę niemożliwą (a <= c) i wtedy
        // `ellipseFromFoci` rzuca. Krzywa, której nie da się skonstruować, tym bardziej
        // nie rozwiązuje poziomu — to też jest "odpada". Bez tego przechwycenia test
        // zmuszałby geometrię poziomów do ustępstw wobec własnej ułomności: trzeba by
        // podnosić `a`, a to zabiera zapas do przeszkody, którego poziom właśnie uczy.
        let solved: boolean;
        try {
          solved = proofFor(level, moved).solved;
        } catch {
          solved = false;
        }
        expect(solved, `kierunek ${i}`).toBe(false);
      }
    },
  );
});

// UWAGA (pozycja 12 — NIE dokończona, zgłoszona jako BLOCKED, patrz raport fali naprawczej):
// próbowałem dopisać analogiczną pętlę dla f2 (`f2: add(level.solution.f2, scale(fromAngle((i*Math.PI)/4), SNAP_RADIUS))`).
// Dla każdego z ośmiu poziomów DOKŁADNIE JEDEN z ośmiu kierunków — ten pokrywający się z
// osią wielką elipsy, przedłużający ją od f1 w stronę f2 — sprawia, że `solved` wychodzi
// `true` (przy `spread` rzędu 0.002–3.8, czyli daleko od jednoczesności). Przyczyna jest
// geometryczna, nie błąd w teście: f1 zostaje nietknięte, więc piłka nadal startuje
// DOKŁADNIE z ogniska; twierdzenie o odbiciu elipsy nadal gwarantuje, że tor po odbiciu
// przejdzie DOKŁADNIE przez przesunięte f2 — a `trace` sprawdza dołek na całym odcinku,
// nie tylko w punkcie odbicia, więc gdy przesunięte f2 wypadnie wystarczająco blisko
// prawdziwego dołka, część kul trafia przypadkiem. To odsłania, że `Proof.solved`
// (`balls.every(holed)`) nie wymaga `simultaneous` — realna luka, ale naprawa wykracza
// poza dwanaście pozycji tej fali (dotyka `runProof`/`advance`, nie samego testu).
