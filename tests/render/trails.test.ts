import { describe, it, expect } from "vitest";
import { dist, vec } from "../../src/core/vec";
import { pathLength, positionAt, trailSegment } from "../../src/render/trails";

// Fixture NIEosiowa: oba odcinki mają długość 5 (trójkąty 3-4-5), więc metryka
// odległości jest faktycznie przypięta. Dowód: podmiana `dist` w `render/trails.ts`
// na metrykę Manhattan przechodziła 91/91 na starym, osiowym torze (0,0)→(1,0)→(1,1) —
// tam każdy odcinek był poziomy albo pionowy, gdzie odległość euklidesowa i Manhattan
// się pokrywają. Tu się rozjeżdżają: Manhattan dałby dist((0,0),(3,4))=7, nie 5.
const path = [vec(0, 0), vec(3, 4), vec(-1, 7)];

describe("ruch po torze", () => {
  it("mierzy długość łamanej", () => {
    // dist((0,0),(3,4)) = sqrt(9+16) = 5; dist((3,4),(-1,7)) = sqrt(16+9) = 5; razem 10
    expect(pathLength(path)).toBeCloseTo(10, 12);
  });

  it("pozycja rośnie liniowo z przebytą drogą", () => {
    expect(positionAt(path, 0)).toEqual(vec(0, 0));
    // 2.5 to połowa pierwszego odcinka (długość 5): t=0.5 -> (1.5, 2.0)
    expect(positionAt(path, 2.5).x).toBeCloseTo(1.5, 12);
    expect(positionAt(path, 2.5).y).toBeCloseTo(2.0, 12);
    // 7.5 = 5 + 2.5, czyli połowa drugiego odcinka: t=0.5 -> (3-4*0.5, 4+3*0.5) = (1.0, 5.5)
    expect(positionAt(path, 7.5).x).toBeCloseTo(1.0, 12);
    expect(positionAt(path, 7.5).y).toBeCloseTo(5.5, 12);
  });

  it("poza końcem toru zatrzymuje się na końcu", () => {
    const p = positionAt(path, 99);
    expect(p.x).toBeCloseTo(-1, 12);
    expect(p.y).toBeCloseTo(7, 12);
  });

  it("smuga zaczyna się o zadaną długość wcześniej", () => {
    // s=7.5, trailLength=5.0 -> from=2.5 -> positionAt(2.5)=(1.5,2.0)
    const seg = trailSegment(path, 7.5, 5.0);
    expect(seg[0].x).toBeCloseTo(1.5, 12);
    expect(seg[0].y).toBeCloseTo(2.0, 12);
    // koniec: positionAt(7.5)=(1.0,5.5)
    expect(seg[seg.length - 1].x).toBeCloseTo(1.0, 12);
    expect(seg[seg.length - 1].y).toBeCloseTo(5.5, 12);
  });

  it("smuga na starcie nie sięga przed początek toru", () => {
    // s=1.5, trailLength=5.0 -> from=max(0,1.5-5)=0 -> positionAt(0)=(0,0)
    const seg = trailSegment(path, 1.5, 5.0);
    expect(seg[0].x).toBeCloseTo(0, 12);
    expect(seg[0].y).toBeCloseTo(0, 12);
  });

  it("smuga zawiera wierzchołek pośredni, nie ścina zakrętu", () => {
    // s=7.5, trailLength=5.0: from=2.5, end=7.5 -> wierzchołek (3,4) leży przy acc=5,
    // czyli między from i end, więc musi się pojawić w środku smugi
    const seg = trailSegment(path, 7.5, 5.0);
    expect(seg).toHaveLength(3);
    expect(seg[1].x).toBeCloseTo(3, 12);
    expect(seg[1].y).toBeCloseTo(4, 12);
  });

  it("po dobiegnięciu do końca nie duplikuje ostatniego punktu", () => {
    // s=12.5 > pathLength(10), trailLength=5.0 -> end=10, from=7.5
    const seg = trailSegment(path, 12.5, 5.0);
    for (let i = 1; i < seg.length; i++) {
      expect(dist(seg[i - 1], seg[i])).toBeGreaterThan(0);
    }
  });
});
