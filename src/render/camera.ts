import { Vec2, vec } from "../core/vec";

export interface Camera {
  toScreen(p: Vec2): Vec2;
  toWorld(p: Vec2): Vec2;
  /** pikseli na jednostkę świata */
  scale: number;
}

/** Pionowy pas ekranu przeznaczony na planszę (piksele CSS od góry). */
export interface PlayArea { top: number; bottom: number }

/** Kwadrat planszy [-1, 1]² wpasowany w pas `area` (domyślnie cały ekran) z marginesem
 *  i wyśrodkowany w nim. Pas zostawia miejsce na napisy u góry i przyciski u dołu. */
export function makeCamera(
  width: number, height: number, margin = 0.06, area: PlayArea = { top: 0, bottom: height },
): Camera {
  const scale = (Math.min(width, area.bottom - area.top) * (1 - 2 * margin)) / 2;
  const cx = width / 2;
  const cy = (area.top + area.bottom) / 2;
  return {
    scale,
    toScreen: (p) => vec(cx + p.x * scale, cy - p.y * scale),
    toWorld: (p) => vec((p.x - cx) / scale, (cy - p.y) / scale),
  };
}

/** Kwadrat planszy [-1, 1]² wpasowany w prostokąt `r` z marginesem i wyśrodkowany w nim —
 *  miniscenka na planszy z zasadą używa tych samych funkcji rysujących co gra. */
export function rectCamera(r: { x: number; y: number; w: number; h: number }, margin = 0.06): Camera {
  const scale = (Math.min(r.w, r.h) * (1 - 2 * margin)) / 2;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return {
    scale,
    toScreen: (p) => vec(cx + p.x * scale, cy - p.y * scale),
    toWorld: (p) => vec((p.x - cx) / scale, (cy - p.y) / scale),
  };
}
