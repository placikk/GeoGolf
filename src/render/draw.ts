import { Vec2 } from "../core/vec";
import { Conic } from "../core/conic";
import { Camera } from "./camera";
import { conicPolyline } from "./shapes";

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
  handle: "#5eead4",
  handleGlow: "rgba(94, 234, 212, 0.22)",
  miss: "#f87171",
  text: "#cbd5e1",
  muted: "#64748b",
  overlay: "rgba(11, 15, 20, 0.94)",
  tile: "rgba(94, 234, 212, 0.05)",
  tileEdge: "rgba(203, 213, 225, 0.22)",
};

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
