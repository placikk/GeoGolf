import { describe, it, expect } from "vitest";
import { vec } from "../../src/core/vec";
import { ellipseFromFoci, evalConic, hyperbolaFromFoci, lineThrough, parabolaFromFocusVertex } from "../../src/core/conic";
import { makeCamera } from "../../src/render/camera";
import { conicPolyline, piecePolyline } from "../../src/render/shapes";
import { Piece, onPiece, whole } from "../../src/core/piece";
import { arcEllipse, ellipse, ellipsePoint, segment, shapeToPiece } from "../../src/levels";
import { CurveFrame, framePoint } from "../../src/core/frame";

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

describe("polilinia kawałka krzywej", () => {
  const base = ellipse(vec(-0.3, 0.2), vec(0.4, -0.1), 0.75);

  for (const [name, start, end] of [["łuk mniejszy niż pół", 0.5, 2.5], ["łuk większy niż pół", 2, 6.5]] as const) {
    it(`${name}: końce dokładnie, każdy punkt na krzywej i po stronie \`via\``, () => {
      const piece = shapeToPiece(arcEllipse(base.f1, base.f2, base.a, start, end));
      const pts = piecePolyline(piece, 64);
      expect(pts[0]).toEqual(piece.arc!.from);
      expect(pts[pts.length - 1]).toEqual(piece.arc!.to);
      for (const p of pts) {
        expect(evalConic(piece.conic, p)).toBeCloseTo(0, 9);
        expect(onPiece(piece, p)).toBe(true);
      }
    });
  }

  it("łuk opisany odwrotnie (from i to zamienione): próbkowanie idzie zgodnie ze wskazówkami", () => {
    // Bez tego testu implementacja „zawsze przeciwnie do wskazówek zegara" przechodziła
    // wszystko — sprawdzone mutacyjnie przy pisaniu planu.
    const forward = shapeToPiece(arcEllipse(base.f1, base.f2, base.a, 0.5, 2.5));
    const piece: Piece = {
      conic: forward.conic,
      arc: { from: forward.arc!.to, via: forward.arc!.via, to: forward.arc!.from },
    };
    const pts = piecePolyline(piece, 64);
    expect(pts[0]).toEqual(piece.arc!.from);
    expect(pts[pts.length - 1]).toEqual(piece.arc!.to);
    for (const p of pts) expect(onPiece(piece, p)).toBe(true);
  });

  it("łuk przechodzi przez `via`: próbkowanie idzie właściwą stroną", () => {
    const shape = arcEllipse(base.f1, base.f2, base.a, 2, 6.5);
    const pts = piecePolyline(shapeToPiece(shape), 256);
    const via = ellipsePoint(shape, 4.25);
    expect(Math.min(...pts.map((p) => Math.hypot(p.x - via.x, p.y - via.y)))).toBeLessThan(0.02);
  });

  it("odcinek to dokładnie dwa końce", () => {
    const piece = shapeToPiece(segment(vec(0.1, 0.3), vec(0.6, -0.2)));
    expect(piecePolyline(piece)).toEqual([vec(0.1, 0.3), vec(0.6, -0.2)]);
  });

  it("cała krzywa jak dotąd", () => {
    const k = ellipseFromFoci(vec(-0.3, 0.2), vec(0.4, -0.1), 0.75);
    const piece: Piece = whole(k);
    expect(piecePolyline(piece, 32)).toEqual(conicPolyline(k, 32));
  });
});

describe("łamana kawałka z zakresem parametru", () => {
  const frame: CurveFrame = {
    kind: "hiperbola", center: vec(0, 0), axis: vec(1, 0), a: 0.3, b: 0.4, branch: 1,
  };
  const piece: Piece = {
    conic: hyperbolaFromFoci(vec(-0.5, 0), vec(0.5, 0), 0.3),
    range: { from: -1.2, to: 0.8, frame },
  };

  it("zaczyna się i kończy DOKŁADNIE na końcach zakresu", () => {
    const pts = piecePolyline(piece, 32);
    expect(pts[0].x).toBeCloseTo(framePoint(frame, -1.2).x, 12);
    expect(pts[0].y).toBeCloseTo(framePoint(frame, -1.2).y, 12);
    expect(pts[pts.length - 1].x).toBeCloseTo(framePoint(frame, 0.8).x, 12);
    expect(pts[pts.length - 1].y).toBeCloseTo(framePoint(frame, 0.8).y, 12);
  });

  it("wszystkie punkty leżą na krzywej i na czynnej gałęzi", () => {
    for (const p of piecePolyline(piece, 32)) {
      expect(evalConic(piece.conic, p)).toBeCloseTo(0, 9);
      expect(p.x).toBeGreaterThan(0); // prawa gałąź
    }
  });

  it("parabola też się rysuje", () => {
    const pf: CurveFrame = { kind: "parabola", vertex: vec(-0.8, 0), axis: vec(1, 0), p: 0.3 };
    const pp: Piece = {
      conic: parabolaFromFocusVertex(vec(-0.5, 0), vec(-0.8, 0)),
      range: { from: -0.6, to: 0.6, frame: pf },
    };
    const pts = piecePolyline(pp, 16);
    expect(pts).toHaveLength(17);
    for (const p of pts) expect(evalConic(pp.conic, p)).toBeCloseTo(0, 9);
  });
});
