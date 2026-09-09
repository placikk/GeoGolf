import { Vec2, dot, norm, scale, sub } from "./vec";
import { Conic } from "./conic";

export const normalAt = (k: Conic, p: Vec2): Vec2 =>
  norm({ x: 2 * k.A * p.x + k.B * p.y + k.D, y: k.B * p.x + 2 * k.C * p.y + k.E });

export const reflectDir = (d: Vec2, n: Vec2): Vec2 =>
  norm(sub(d, scale(n, 2 * dot(d, n))));
