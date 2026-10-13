import { Vec2 } from "../core/vec";
import { Conic } from "../core/conic";
import { Piece } from "../core/piece";
import { Sector } from "../core/verify";
import { Camera } from "./camera";
import { conicPolyline, piecePolyline } from "./shapes";

const MUTED = "#64748b";

export const PALETTE = {
  bg: "#0b0f14",
  curve: "#5eead4",
  curveGlow: "rgba(94, 234, 212, 0.16)",
  ball: "#f8fafc",
  ballGlow: "rgba(248, 250, 252, 0.16)",
  trail: "rgba(253, 230, 138, 0.5)",
  trailGlow: "rgba(253, 230, 138, 0.10)",
  hole: "#fbbf24",
  holeGlow: "rgba(251, 191, 36, 0.20)",
  holeInside: "#05070a",
  obstacle: "#f87171",
  obstacleGlow: "rgba(248, 113, 113, 0.16)",
  miss: "#f87171",
  text: "#cbd5e1",
  muted: MUTED,
  overlay: "rgba(11, 15, 20, 0.94)",
  tile: "rgba(94, 234, 212, 0.05)",
  tileEdge: "rgba(203, 213, 225, 0.22)",
  hint: "rgba(203, 213, 225, 0.30)",
  sector: "rgba(248, 250, 252, 0.05)",
  board: "#10161e",
  frame: MUTED,
  // ta sama barwa co `frame`/`muted`, tylko przy niskiej krycia — poświata ramki
  frameGlow: "rgba(100, 116, 139, 0.18)",
};

/** Promień klina wachlarza w jednostkach świata — mały, żeby mieścił się w ramce. */
export const SECTOR_REACH = 0.4;

/** Promień zaokrąglenia rogów ramki w pikselach CSS. Tylko rysunek: ściany (fizyka)
 *  mają ostre narożniki, a 6 px różnicy w rogu jest niewidoczne dla gry. */
export const FRAME_RADIUS = 6;

/** Prostokąt planszy [-1, 1]² na ekranie. */
function boardRect(cam: Camera): { x: number; y: number; w: number; h: number } {
  const tl = cam.toScreen({ x: -1, y: 1 });
  const br = cam.toScreen({ x: 1, y: -1 });
  return { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
}

type Ctx = CanvasRenderingContext2D;

/** Poświata przez podwójny obrys: szeroki półprzezroczysty pod cienkim jasnym. */
export function glowPolyline(
  ctx: Ctx, cam: Camera, pts: Vec2[], color: string, glow: string, width: number,
  closed = false,
): void {
  if (pts.length < 2) return;
  const trace = () => {
    ctx.beginPath();
    const s0 = cam.toScreen(pts[0]);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < pts.length; i++) {
      const s = cam.toScreen(pts[i]);
      ctx.lineTo(s.x, s.y);
    }
    if (closed) ctx.closePath();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = glow;
  ctx.lineWidth = width * 5;
  trace();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  trace();
  ctx.stroke();
}

export function glowDot(
  ctx: Ctx, cam: Camera, p: Vec2, color: string, glow: string, radius: number,
): void {
  const s = cam.toScreen(p);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius * 3.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

/** Uchwyt do przeciągania: pusty pierścień z poświatą. Pusty, żeby ognisko
 *  postawione na piłce albo w dołku otaczało je, a nie zakrywało. */
export function ringHandle(
  ctx: Ctx, cam: Camera, p: Vec2, color: string, glow: string, radius: number,
): void {
  const s = cam.toScreen(p);
  const ring = () => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
  };
  ctx.strokeStyle = glow;
  ctx.lineWidth = 10;
  ring();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ring();
  ctx.stroke();
}

/** Kształty uchwytów — patrz `handleMark` w `style.ts`. */
export type HandleMark = "pierscien" | "romb" | "kwadrat";

/** Pusty wielokąt z poświatą — ten sam podwójny obrys co pierścień, inne obrysy. */
function polygonHandle(ctx: Ctx, pts: Vec2[], color: string, glow: string): void {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  };
  ctx.lineJoin = "round";
  ctx.strokeStyle = glow;
  ctx.lineWidth = 10;
  path();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  path();
  ctx.stroke();
}

/** Uchwyt w kształcie `mark`. `radius` jak w `ringHandle`: romb ma wierzchołki w tej
 *  odległości od środka, kwadrat — pół boku równe 0.8 promienia (podobna powierzchnia). */
export function handleShape(
  ctx: Ctx, cam: Camera, p: Vec2, mark: HandleMark, color: string, glow: string, radius: number,
): void {
  if (mark === "pierscien") {
    ringHandle(ctx, cam, p, color, glow, radius);
    return;
  }
  const s = cam.toScreen(p);
  const r = mark === "romb" ? radius : 0.8 * radius;
  const pts = mark === "romb"
    ? [{ x: s.x, y: s.y - r }, { x: s.x + r, y: s.y }, { x: s.x, y: s.y + r }, { x: s.x - r, y: s.y }]
    : [{ x: s.x - r, y: s.y - r }, { x: s.x + r, y: s.y - r }, { x: s.x + r, y: s.y + r }, { x: s.x - r, y: s.y + r }];
  polygonHandle(ctx, pts, color, glow);
}

/** Dołek: ciemny środek z jasną obwódką — wygląda jak otwór, nie jak kolejna kropka. */
export function holeMark(
  ctx: Ctx, cam: Camera, p: Vec2, rim: string, glow: string, inside: string, radius: number,
): void {
  const s = cam.toScreen(p);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius * 2.6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = inside;
  ctx.beginPath();
  ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

export function drawConic(
  ctx: Ctx, cam: Camera, k: Conic, color: string, glow: string, width: number,
): void {
  const pts = conicPolyline(k);
  glowPolyline(ctx, cam, pts, color, glow, width, pts.length > 2);
}

/** Kawałek krzywej. Zamknięty obrys tylko dla całej elipsy — łuk ma końce. */
export function drawPiece(
  ctx: Ctx, cam: Camera, piece: Piece, color: string, glow: string, width: number,
): void {
  const pts = piecePolyline(piece);
  // Zamknięty obrys TYLKO dla całej elipsy. Kawałek z zakresem parametru też nie ma
  // cięciwy, a domknięcie połączyłoby mu ramiona pętlą przez pół planszy.
  const zamkniety = piece.arc === undefined && piece.range === undefined && pts.length > 2;
  glowPolyline(ctx, cam, pts, color, glow, width, zamkniety);
}

/** Blady klin wachlarza od piłki. Samo wypełnienie, bez obrysu i bez poświaty,
 *  przycięte do planszy — klin nigdy nie wychodzi za ramkę. */
export function sectorWedge(
  ctx: Ctx, cam: Camera, apex: Vec2, sector: Sector, reach: number, fill: string,
): void {
  const s = cam.toScreen(apex);
  const r = reach * cam.scale;
  // oś Y ekranu jest odwrócona, więc kąty świata zmieniają znak
  const from = -(sector.center + sector.width / 2);
  const to = -(sector.center - sector.width / 2);
  const b = boardRect(cam);
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.arc(s.x, s.y, r, from, to);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Plansza: tło o odcień jaśniejsze od ekranu i cienka stonowana ramka z poświatą przez
 *  podwójny obrys (bez rozmycia cienia), z lekko zaokrąglonymi rogami. */
export function boardFrame(
  ctx: Ctx, cam: Camera, fill: string, color: string, glow: string, width: number,
): void {
  const b = boardRect(cam);
  const outline = () => {
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, FRAME_RADIUS);
  };
  ctx.fillStyle = fill;
  outline();
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = width * 5;
  outline();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  outline();
  ctx.stroke();
}
