import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci, ellipseGeometry } from "../../src/core/conic";
import { BALL_COUNT, launchAngles, runProof } from "../../src/core/verify";
import { whole } from "../../src/core/piece";

const R = 0.02 * 2 * Math.SQRT2;

describe("dowód ósemką", () => {
  it("daje osiem różnych kierunków, żaden wzdłuż osi wielkiej", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const angles = launchAngles(ellipseGeometry(k).angle);
    expect(angles).toHaveLength(BALL_COUNT);
    for (const t of angles) {
      const rel = ((t % Math.PI) + Math.PI) % Math.PI;
      expect(Math.min(rel, Math.PI - rel)).toBeGreaterThan(0.1);
    }
  });

  it("poprawna elipsa: wszystkie osiem wpada i wpada RAZEM", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(ball, hole, 0.8);
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], baseAngle: ellipseGeometry(k).angle });
    expect(p.balls).toHaveLength(BALL_COUNT);
    expect(p.solved).toBe(true);
    expect(p.simultaneous).toBe(true);
    expect(p.spread).toBeLessThan(1e-6);
  });

  it("kierunki są zakotwiczone w osi wielkiej także dla elipsy obróconej", () => {
    // Elipsa testowa wcześniej miała ogniska na osi x, więc `ellipseGeometry(k).angle === 0`
    // i składnik `base` w `launchAngles` nic nie wnosił — zamiana `base` na stałe 0
    // przechodziła 91/91. Ta elipsa jest obrócona, więc `base` faktycznie coś sprawdza.
    //
    // UWAGA na dobór osi: sam fakt "elipsa jest obrócona" NIE wystarcza. Osiem kątów
    // (i+0.25)*45° leży zawsze 11.25° od najbliższej wielokrotności 45° — bezpieczna
    // odległość względem progu 0.1 rad (~5.73°). Zerowanie `base` przesuwa je WSZYSTKIE
    // o tę samą stałą (-oś), więc pozostają bezpieczne dla DOWOLNEJ osi, chyba że oś
    // (mod 45°) sama wypada blisko 11.25° — dopiero wtedy przesunięcie ląduje w strefie
    // zakazanej. Sprawdzone mutacyjnie w tymczasowym worktree: oś 45° (sugerowana
    // w brifie) i oś ~32° (moja pierwsza poprawka) OBIE przechodzą 8/8 nawet z `base=0`;
    // oś ~11° poniżej faktycznie czerwienieje pod tę mutację.
    const k = ellipseFromFoci(vec(-0.3, -0.4), vec(0.4, -0.264), 0.8);
    const base = ellipseGeometry(k).angle;
    for (const t of launchAngles(base)) {
      const rel = (((t - base) % Math.PI) + Math.PI) % Math.PI;
      expect(Math.min(rel, Math.PI - rel)).toBeGreaterThan(0.1);
    }
  });

  it("działa tak samo dla elipsy obróconej", () => {
    const ball = vec(-0.35, -0.4), hole = vec(0.4, 0.3);
    const k = ellipseFromFoci(ball, hole, 0.9);
    expect(runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], baseAngle: ellipseGeometry(k).angle }).solved).toBe(true);
  });

  it("przesunięte ognisko: co najmniej jedna piłka chybia", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(vec(-0.5 + 0.141, 0), hole, 0.8);
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], baseAngle: ellipseGeometry(k).angle });
    expect(p.solved).toBe(false);
    expect(p.balls.some((b) => !b.holed)).toBe(true);
  });

  it("kierunek bazowy jest podawany wprost, nie odczytywany z krzywej", () => {
    const angles = launchAngles(0.4, 8);
    expect(angles[0]).toBeCloseTo(0.4 + 0.25 * (Math.PI / 4), 12);
    expect(angles).toHaveLength(8);
  });

  it("baseAngle=0 z domyślnym count odtwarza wzór z etapu 1", () => {
    const angles = launchAngles(0);
    expect(angles).toHaveLength(BALL_COUNT);
    const firstAngle = angles[0];
    expect(firstAngle).toBeCloseTo(0.25 * (2 * Math.PI / BALL_COUNT));
  });

  it("count=2: dwie piłki do podglądu", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    expect(launchAngles(ellipseGeometry(k).angle, 2)).toHaveLength(2);
    const p = runProof({ ball: vec(-0.5, 0), hole: vec(0.5, 0), holeRadius: R, maxBounces: 4, curves: [whole(k)], baseAngle: ellipseGeometry(k).angle, count: 2 });
    expect(p.balls).toHaveLength(2);
  });

  it("count=3: nieparzysta liczba, żaden kierunek wzdłuż osi", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const angles = launchAngles(ellipseGeometry(k).angle, 3);
    expect(angles).toHaveLength(3);
    for (const t of angles) {
      const rel = ((t % Math.PI) + Math.PI) % Math.PI;
      expect(Math.min(rel, Math.PI - rel)).toBeGreaterThan(0.01);
    }
  });

  it("wachlarz: kąty równo rozłożone i ściśle wewnątrz sektora", () => {
    // środek 1 rad, nie 0: błąd znaku przy środku zerowym by się schował
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const sector = { center: 1, width: 0.5 };
    const angles = launchAngles(ellipseGeometry(k).angle, 8, sector);
    expect(angles).toHaveLength(8);
    expect(angles[0]).toBeCloseTo(1 - 0.25 + 0.5 / 16, 12);
    expect(angles[7]).toBeCloseTo(1 + 0.25 - 0.5 / 16, 12);
    for (let i = 1; i < 8; i++) expect(angles[i] - angles[i - 1]).toBeCloseTo(0.5 / 8, 12);
    for (const t of angles) {
      expect(t).toBeGreaterThan(0.75);
      expect(t).toBeLessThan(1.25);
    }
  });

  it("wachlarz, podgląd dwupiłkowy: ten sam wzór z n = 2", () => {
    const k = ellipseFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.8);
    const [a, b] = launchAngles(ellipseGeometry(k).angle, 2, { center: 1, width: 0.5 });
    expect(a).toBeCloseTo(0.875, 12);
    expect(b).toBeCloseTo(1.125, 12);
  });

  it("brak wachlarza → dokładnie kąty etapu 1", () => {
    const k = ellipseFromFoci(vec(-0.3, -0.4), vec(0.4, -0.264), 0.8);
    const base = ellipseGeometry(k).angle;
    expect(launchAngles(base, 8, undefined)).toEqual(launchAngles(base, 8));
    const ball = vec(-0.3, -0.4), hole = vec(0.4, -0.264);
    const input = { ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], baseAngle: base };
    expect(runProof({ ...input, sector: undefined })).toEqual(runProof(input));
  });

  it("runProof strzela w kierunkach wachlarza", () => {
    const ball = vec(-0.5, 0), hole = vec(0.5, 0);
    const k = ellipseFromFoci(ball, hole, 0.8);
    const sector = { center: 2, width: 1 };
    const p = runProof({ ball, hole, holeRadius: R, maxBounces: 4, curves: [whole(k)], baseAngle: ellipseGeometry(k).angle, sector });
    const angles = launchAngles(ellipseGeometry(k).angle, 8, sector);
    p.balls.forEach((b, i) => {
      const d = { x: b.path[1].x - b.path[0].x, y: b.path[1].y - b.path[0].y };
      expect(Math.atan2(d.y, d.x)).toBeCloseTo(angles[i], 9);
    });
  });
});
