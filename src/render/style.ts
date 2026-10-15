import { Handle, Shape } from "../levels/types";
import { isCircle } from "../levels/shape";
import { HandleMark, PALETTE } from "./draw";

/** Barwy jednego rodzaju kształtu: pełna (gracz), poświata, przygaszona (stały kształt
 *  tego rodzaju) i blada (ogniska stałego kształtu). */
interface KindColors { line: string; glow: string; dim: string; focus: string }

/** Każdy rodzaj krzywej ma własny kolor — elipsa i parabola wyglądają podobnie, a działają
 *  inaczej (uwaga 3 właściciela). Żaden nie jest czerwony (przeszkody), złoty (dołek) ani
 *  żółty (tory piłek). */
export const KIND_COLORS: Record<Shape["kind"], KindColors> = {
  elipsa: {
    line: "#5eead4", glow: "rgba(94, 234, 212, 0.16)",
    dim: "rgba(94, 234, 212, 0.55)", focus: "rgba(94, 234, 212, 0.45)",
  },
  parabola: {
    line: "#a78bfa", glow: "rgba(167, 139, 250, 0.16)",
    dim: "rgba(167, 139, 250, 0.55)", focus: "rgba(167, 139, 250, 0.45)",
  },
  hiperbola: {
    line: "#f0abfc", glow: "rgba(240, 171, 252, 0.16)",
    dim: "rgba(240, 171, 252, 0.55)", focus: "rgba(240, 171, 252, 0.45)",
  },
  odcinek: {
    line: "#7dd3fc", glow: "rgba(125, 211, 252, 0.16)",
    dim: "rgba(125, 211, 252, 0.55)", focus: "rgba(125, 211, 252, 0.45)",
  },
};

const NO_GLOW = "rgba(0,0,0,0)";

export interface ShapeStyle {
  line: string;
  glow: string;
  /** kolor kropek ognisk; `null` — nie rysować (przeszkoda albo kształt gracza, którego
   *  ogniska są uchwytami) */
  focus: string | null;
}

/** Przeszkoda w sensie wyglądu: rzecz, która tylko zawadza albo odbija jak banda — okrąg
 *  (elipsa o zlanych ogniskach) i stały odcinek. Zostaje czerwona jak w etapach 1–2. */
const isObstacle = (s: Shape): boolean => s.kind === "odcinek" || (s.kind === "elipsa" && isCircle(s));

/** Jak narysować kształt. Gracz: pełny kolor rodzaju z poświatą. Stały: przeszkoda na
 *  czerwono, a stała elipsa/parabola/hiperbola — część konstrukcji, nie przeszkoda — w kolorze
 *  swojego rodzaju, przygaszona, bez poświaty, z bladymi ogniskami (np. stała parabola przy
 *  dołku na „ognisko-paraboli" jest wtedy widocznie parabolą, nie czerwoną zawadą). */
export function shapeStyle(s: Shape, owner: "gracz" | "staly"): ShapeStyle {
  const k = KIND_COLORS[s.kind];
  if (owner === "gracz") return { line: k.line, glow: k.glow, focus: null };
  if (isObstacle(s)) return { line: PALETTE.obstacle, glow: PALETTE.obstacleGlow, focus: null };
  return { line: k.dim, glow: NO_GLOW, focus: k.focus };
}

/** Kształt uchwytu mówi, czym jest: pierścień — ognisko (to, co stawia się na piłce albo
 *  w dołku), romb — wierzchołek paraboli, kwadrat — cała reszta. */
export function handleMark(id: Handle): HandleMark {
  if (id === "ognisko" || id === "ognisko1" || id === "ognisko2") return "pierscien";
  if (id === "wierzcholek") return "romb";
  return "kwadrat";
}
