/** Diagnostyka poziomu przy kalibracji. Uruchamiaj (npx sam pobiera vite-node,
 *  które nie jest zależnością projektu — nic nie trafia do package.json):
 *  npx vite-node scripts/sprawdz-poziom.ts <id-poziomu>
 *  Wypisuje dla ZAPISANEGO ROZWIĄZANIA: ile piłek wpadło, ile miało odbić,
 *  jak daleko chybiły te, które chybiły, i jaki jest rozrzut dróg. */
import { dist } from "../src/core/vec";
import { runProof } from "../src/core/verify";
import { LEVELS, levelCurves, shapeAxisAngle } from "../src/levels";

const id = process.argv[2];
const level = LEVELS.find((l) => l.id === id);
if (level === undefined) throw new Error(`nie ma poziomu ${id}; są: ${LEVELS.map((l) => l.id).join(", ")}`);

for (const [nazwa, pieces] of [
  ["rozwiązanie", level.pieces.map((p) => p.solution)],
  ["start", level.pieces.map((p) => p.start)],
] as const) {
  const proof = runProof({
    ball: level.ball, hole: level.hole,
    holeRadius: level.test.holeRadius, maxBounces: level.test.maxBounces,
    curves: levelCurves(level, pieces),
    baseAngle: shapeAxisAngle(pieces[0]),
    sector: level.sector, count: level.test.balls,
  });
  const wpadlo = proof.balls.filter((b) => b.holed).length;
  console.log(`\n== ${level.id} / ${nazwa}: ${wpadlo}/${level.test.balls} wpadło, rozrzut ${proof.spread.toExponential(2)}`);
  proof.balls.forEach((b, i) => {
    const koniec = b.path[b.path.length - 1];
    console.log(
      `  piłka ${i}: odbić ${b.path.length - 2}, ${b.holed ? "WPADŁA" : `chybiła o ${dist(koniec, level.hole).toFixed(4)} (promień ${level.test.holeRadius.toFixed(4)})`}`,
    );
  });
}
