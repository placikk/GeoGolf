import { Vec2 } from "../core/vec";
import { Conic } from "../core/conic";
import { Camera } from "./camera";
import { conicPolyline } from "./shapes";

export const PALETTE = {
  bg: "#0b0f14",
  curve: "#5eead4",
  curveGlow: "rgba(94, 234, 212, 0.16)",
  ball: "#fde68a",
  ballGlow: "rgba(253, 230, 138, 0.18)",
  trail: "rgba(253, 230, 138, 0.5)",
  trailGlow: "rgba(253, 230, 138, 0.10)",
  hole: "#fbbf24",
  holeGlow: "rgba(251, 191, 36, 0.20)",
  obstacle: "#f87171",
  obstacleGlow: "rgba(248, 113, 113, 0.16)",
  handle: "#e2e8f0",
  miss: "#f87171",
  text: "#cbd5e1",
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

export function drawConic(
  ctx: Ctx, cam: Camera, k: Conic, color: string, glow: string, width: number,
): void {
  const pts = conicPolyline(k);
  glowPolyline(ctx, cam, pts, color, glow, width, pts.length > 2);
}
