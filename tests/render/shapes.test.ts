import { describe, it, expect } from "vitest";
import { Vec2, dist, fromAngle, vec } from "../../src/core/vec";
import { ellipseFromFoci, evalConic, hyperbolaFromFoci, lineThrough, parabolaFromFocusVertex } from "../../src/core/conic";
import { makeCamera, rectCamera } from "../../src/render/camera";
import { conicPolyline, parabolaAxis, piecePolyline, shotArrow, twinPolyline } from "../../src/render/shapes";
import { Piece, onPiece, whole } from "../../src/core/piece";
import {
  LEVELS, ParabolaShape, arcEllipse, ellipse, ellipsePoint, hyperbola, parabola, segment, shapeFrame, shapeToPiece,
} from "../../src/levels";
import { CurveFrame, frameParam, framePoint } from "../../src/core/frame";

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
    const pts = piecePolyline(piece, 32);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      expect(evalConic(piece.conic, p)).toBeCloseTo(0, 9);
      expect(p.x).toBeGreaterThan(0); // prawa gałąź
      // parametr każdego punktu musi leżeć w zakresie
      const { t } = frameParam(frame, p);
      expect(t).toBeGreaterThanOrEqual(piece.range!.from - 1e-9);
      expect(t).toBeLessThanOrEqual(piece.range!.to + 1e-9);
      // parametry są monotoniczne rosnące
      if (i > 0) {
        const { t: prevT } = frameParam(frame, pts[i - 1]);
        expect(t).toBeGreaterThan(prevT - 1e-9);
      }
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
    // końce DOKŁADNIE
    expect(pts[0].x).toBeCloseTo(framePoint(pf, -0.6).x, 12);
    expect(pts[0].y).toBeCloseTo(framePoint(pf, -0.6).y, 12);
    expect(pts[16].x).toBeCloseTo(framePoint(pf, 0.6).x, 12);
    expect(pts[16].y).toBeCloseTo(framePoint(pf, 0.6).y, 12);
    // wszystkie punkty
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      expect(evalConic(pp.conic, p)).toBeCloseTo(0, 9);
      // parametr każdego punktu musi leżeć w zakresie
      const { t } = frameParam(pf, p);
      expect(t).toBeGreaterThanOrEqual(-0.6 - 1e-9);
      expect(t).toBeLessThanOrEqual(0.6 + 1e-9);
      // parametry są monotoniczne rosnące
      if (i > 0) {
        const { t: prevT } = frameParam(pf, pts[i - 1]);
        expect(t).toBeGreaterThan(prevT - 1e-9);
      }
    }
  });
});

describe("druga gałąź hiperboli (tylko rysunek)", () => {
  // span opisany DŁUGOŚCIĄ i z mid ≠ 0 — gdyby druga gałąź liczyła zakres po swojemu
  // albo gubiła `mid`, różnica by wyszła
  const hyp = hyperbola(vec(-0.5, 0.1), vec(0.6, -0.2), 0.3, 1, { mid: 0.2, length: 0.9 });

  it("bez flagi `twin` nie ma czego rysować; parabola i elipsa też nie", () => {
    expect(twinPolyline(hyp)).toBeUndefined();
    expect(twinPolyline(parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 }))).toBeUndefined();
    expect(twinPolyline(ellipse(vec(-0.5, 0), vec(0.5, 0), 0.8))).toBeUndefined();
  });

  it("z flagą: ta sama rama z przeciwną gałęzią i TEN SAM zakres parametru co czynny kawałek", () => {
    const s = { ...hyp, twin: true as const };
    const pts = twinPolyline(s, 16);
    if (pts === undefined) throw new Error("brak drugiej gałęzi");
    expect(pts).toHaveLength(17);
    const range = shapeToPiece(s).range;
    if (range === undefined) throw new Error("hiperbola ma zawsze zakres");
    const druga = { ...shapeFrame(s), branch: -1 as const };
    expect(pts[0].x).toBeCloseTo(framePoint(druga, range.from).x, 12);
    expect(pts[0].y).toBeCloseTo(framePoint(druga, range.from).y, 12);
    expect(pts[16].x).toBeCloseTo(framePoint(druga, range.to).x, 12);
    expect(pts[16].y).toBeCloseTo(framePoint(druga, range.to).y, 12);
    for (const p of pts) {
      expect(evalConic(shapeToPiece(s).conic, p)).toBeCloseTo(0, 9);
      expect(frameParam(shapeFrame(s), p).branch).toBe(-1);
    }
  });
});

describe("oś paraboli", () => {
  const naBrzegu = (p: Vec2) => Math.max(Math.abs(p.x), Math.abs(p.y));
  /** Ognisko leży na odcinku osi, między wierzchołkiem a końcem: suma odległości = długość. */
  const przezOgnisko = (s: ParabolaShape, [a, b]: [Vec2, Vec2]) =>
    dist(a, s.focus) + dist(s.focus, b) - dist(a, b);

  it("od wierzchołka przez ognisko do brzegu planszy — oś pozioma", () => {
    const s = parabola(vec(-0.5, 0), vec(-0.8, 0), { mid: 0, span: 1.2 });
    const os = parabolaAxis(s);
    expect(os[0]).toEqual(s.vertex);
    expect(os[1].x).toBeCloseTo(1, 12);
    expect(os[1].y).toBeCloseTo(0, 12);
  });

  it("oś ukośna kończy się na brzegu, nie za nim i nie przed nim", () => {
    const s = parabola(vec(-0.53787, -0.53787), vec(-0.75, -0.75), { mid: 0, span: 1.2 });
    const os = parabolaAxis(s);
    expect(naBrzegu(os[1])).toBeCloseTo(1, 12);
    expect(przezOgnisko(s, os)).toBeCloseTo(0, 12);
  });

  it("każda parabola każdego poziomu: wierzchołek w planszy, oś przez ognisko do brzegu", () => {
    for (const l of LEVELS) {
      const parabole = [...l.pieces.flatMap((p) => [p.start, p.solution]), ...l.obstacles]
        .filter((x): x is ParabolaShape => x.kind === "parabola");
      for (const s of parabole) {
        expect(naBrzegu(s.vertex), l.id).toBeLessThanOrEqual(1);
        const os = parabolaAxis(s);
        expect(naBrzegu(os[1]), l.id).toBeCloseTo(1, 12);
        expect(przezOgnisko(s, os), l.id).toBeCloseTo(0, 12);
      }
    }
  });
});

describe("strzałka strzału", () => {
  it("trzon od piłki w kierunku strzału, grot symetryczny w czubku", () => {
    const apex = vec(-0.5, -0.5);
    const [trzon, grot] = shotArrow(apex, Math.PI / 2, 0.4);
    expect(trzon[0]).toEqual(apex);
    expect(trzon[1].x).toBeCloseTo(-0.5, 12);
    expect(trzon[1].y).toBeCloseTo(-0.1, 12);
    expect(grot[1]).toEqual(trzon[1]);
    // ramiona po obu stronach trzonu, w tej samej odległości od czubka i cofnięte w dół
    expect(dist(grot[0], grot[1])).toBeCloseTo(0.1, 12);
    expect(dist(grot[2], grot[1])).toBeCloseTo(0.1, 12);
    expect(grot[0].x + grot[2].x).toBeCloseTo(2 * -0.5, 12);
    expect(grot[0].y).toBeLessThan(trzon[1].y);
  });

  it("kierunek idzie za kątem", () => {
    const [trzon] = shotArrow(vec(0, 0), 0.3, 1);
    const d = fromAngle(0.3);
    expect(trzon[1].x).toBeCloseTo(d.x, 12);
    expect(trzon[1].y).toBeCloseTo(d.y, 12);
  });
});

describe("kamera prostokąta (miniscenki)", () => {
  it("plansza [-1, 1]² wpasowana w prostokąt i wyśrodkowana w nim", () => {
    const r = { x: 40, y: 200, w: 300, h: 200 };
    const c = rectCamera(r, 0);
    expect(c.toScreen(vec(0, 0))).toEqual(vec(190, 300));
    // krótszy bok wyznacza skalę: wysokość 200 → 100 px na jednostkę
    expect(c.scale).toBeCloseTo(100, 9);
    const g = c.toScreen(vec(-1, 1));
    expect(g.x).toBeCloseTo(90, 9);
    expect(g.y).toBeCloseTo(200, 9);
    const back = c.toWorld(c.toScreen(vec(0.3, -0.7)));
    expect(back.x).toBeCloseTo(0.3, 12);
    expect(back.y).toBeCloseTo(-0.7, 12);
  });
});
