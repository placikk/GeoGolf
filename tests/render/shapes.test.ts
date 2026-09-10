import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci, evalConic, lineThrough } from "../../src/core/conic";
import { makeCamera } from "../../src/render/camera";
import { conicPolyline } from "../../src/render/shapes";

describe("kamera", () => {
  it("środek świata trafia w środek ekranu", () => {
    const cam = makeCamera(400, 800);
    const s = cam.toScreen(vec(0, 0));
    expect(s.x).toBeCloseTo(200, 9);
    expect(s.y).toBeCloseTo(400, 9);
  });

  it("odwraca oś Y", () => {
    const cam = makeCamera(400, 800);
    expect(cam.toScreen(vec(0, 1)).y).toBeLessThan(cam.toScreen(vec(0, -1)).y);
  });

  it("obchód w obie strony jest tożsamością", () => {
    const cam = makeCamera(375, 812);
    const p = vec(0.37, -0.62);
    const back = cam.toWorld(cam.toScreen(p));
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
  });

  it("plansza mieści się w krótszym boku", () => {
    const cam = makeCamera(400, 800, 0.06);
    expect(cam.toScreen(vec(1, 0)).x).toBeLessThanOrEqual(400);
    expect(cam.toScreen(vec(-1, 0)).x).toBeGreaterThanOrEqual(0);
  });
});

describe("polilinia stożkowej", () => {
  it("każdy punkt polilinii elipsy leży na elipsie", () => {
    const k = ellipseFromFoci(vec(-0.3, 0.2), vec(0.4, -0.1), 0.75);
    const pts = conicPolyline(k, 64);
    expect(pts).toHaveLength(64);
    for (const p of pts) expect(evalConic(k, p)).toBeCloseTo(0, 9);
  });

  it("prosta daje odcinek o dwóch końcach poza planszą", () => {
    const pts = conicPolyline(lineThrough(vec(0, 0.3), vec(1, 0)));
    expect(pts).toHaveLength(2);
    expect(pts[0].y).toBeCloseTo(0.3, 9);
    expect(pts[1].y).toBeCloseTo(0.3, 9);
    expect(Math.abs(pts[0].x)).toBeGreaterThan(1);
  });
});
