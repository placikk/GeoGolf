import { Vec2, add, dot, perp, scale, sub } from "./vec";

/** Układ własny krzywej nieograniczonej: tyle, ile trzeba, żeby policzyć punkt
 *  z parametru i parametr z punktu. Świadomie NIE odtwarzamy tego z postaci kwadratowej —
 *  warstwa poziomów zna ognisko i wierzchołek, więc podaje układ wprost, a my unikamy
 *  rozkładu własnego macierzy. Ta sama zasada co przy `Arc`: informacja jest zdublowana,
 *  bo tańsza do podania niż do odzyskania. `axis` musi być wektorem jednostkowym. */
export type CurveFrame =
  | { kind: "parabola"; vertex: Vec2; axis: Vec2; p: number }
  | { kind: "hiperbola"; center: Vec2; axis: Vec2; a: number; b: number; branch: 1 | -1 };

/** Punkt krzywej o parametrze `t`. Dla paraboli `t` to wprost odsunięcie prostopadłe
 *  od osi — dlatego wiązka odbita od paraboli ma szerokość równą zakresowi `t`,
 *  niezależnie od `p`. */
export function framePoint(f: CurveFrame, t: number): Vec2 {
  const n = perp(f.axis);
  if (f.kind === "parabola") {
    return add(f.vertex, add(scale(f.axis, (t * t) / (4 * f.p)), scale(n, t)));
  }
  return add(
    f.center,
    add(scale(f.axis, f.branch * f.a * Math.cosh(t)), scale(n, f.b * Math.sinh(t))),
  );
}

/** Parametr punktu LEŻĄCEGO na krzywej wraz z gałęzią, na której leży. Gałąź jest
 *  jedynym powodem, dla którego hiperbola nie mieści się w mechanizmie cięciwy z etapu 2:
 *  cięciwa dzieli płaszczyznę, a nie krzywą, więc druga gałąź wpada po tej samej stronie. */
export function frameParam(f: CurveFrame, p: Vec2): { t: number; branch: 1 | -1 } {
  const n = perp(f.axis);
  if (f.kind === "parabola") return { t: dot(sub(p, f.vertex), n), branch: 1 };
  const q = sub(p, f.center);
  return { t: Math.asinh(dot(q, n) / f.b), branch: dot(q, f.axis) >= 0 ? 1 : -1 };
}
