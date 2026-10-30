import { describe, it, expect } from "vitest";
import { Vec2, vec } from "../../src/core/vec";
import { MovableShape, SNAP_RADIUS } from "../../src/levels";
import { decodeLevel, encodeLevel } from "../../src/share/codec";
import { sharedToLevel } from "../../src/share/verify";
import { applyDrag, handlePositions, lockedSize, snapTargets, snapTo } from "../../src/ui/handles";
import {
  EditorState, ObstacleKind, PieceKind, acceptWin, addObstacle, addPiece, arcFits, cycleShot, draftCode, newEditor,
  removeSelected, toShared, toggleArc, toggleLock,
} from "../../src/editor/model";
import { applyEditorDrag, editorHandles } from "../../src/editor/interaction";
import { rng } from "../share/wire";

const PIECES: PieceKind[] = ["elipsa", "parabola", "hiperbola", "odcinek"];
const OBSTACLES: ObstacleKind[] = ["okrag", "banda", "elipsa", "parabola", "hiperbola"];
const isFocus = (id: string): boolean => id === "ognisko" || id === "ognisko1" || id === "ognisko2";

// Losowy spacer po operacjach edytora: po KAŻDYM kroku szkic musi dać się zapisać i odczytać,
// a co kilkadziesiąt kroków rozwiązanie zagrane „jak w grze" (te same blokady, to samo
// przyskakiwanie i ten sam `lockedSize`) musi dać kod, który przyjmuje odczyt linku.
// Jedyny wyjątek: gra (w odróżnieniu od edytora) pozwala zmniejszyć łuk gracza poniżej
// rozmiaru, na którym łuk da się zapisać (`arcFits`) — takie ustawienie `acceptWin` odrzuca
// z powodem „nie da się zapisać", zamiast dać kod, którego odczyt by nie przyjął.
describe("edytor → kod → odczyt: losowy spacer", () => {
  it("3000 kroków: każdy szkic i każde rozwiązanie zagrane pod blokadami przechodzą odczyt", () => {
    const next = rng(20261031);
    const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)];
    const uniform = (lo: number, hi: number): number => lo + (hi - lo) * next();

    /** Cel palca: losowo w planszy i trochę za nią, blisko obecnej pozycji albo na innym uchwycie. */
    const fingerTarget = (from: Vec2, others: Vec2[]): Vec2 => {
      const r = next();
      if (r < 0.4) return vec(uniform(-1.2, 1.2), uniform(-1.2, 1.2));
      if (r < 0.75) return vec(from.x + uniform(-0.1, 0.1), from.y + uniform(-0.1, 0.1));
      const o = pick(others);
      return vec(o.x + uniform(-0.01, 0.01), o.y + uniform(-0.01, 0.01));
    };

    /** Rozwiązanie zagrane w grze testowej: start po zaokrągleniu (jak w `prepareTest`),
     *  1–5 przeciągnięć każdego elementu, tylko odblokowanymi uchwytami. */
    const playSolution = (s: EditorState): MovableShape[] => {
      const shared = toShared(s);
      const level = sharedToLevel(shared, "edytor");
      const pieces: MovableShape[] = shared.pieces.map((p) => p.start);
      shared.pieces.forEach((def, i) => {
        const drags = 1 + Math.floor(next() * 5);
        for (let k = 0; k < drags; k++) {
          const free = handlePositions(pieces[i]).filter((h) => !def.locked.includes(h.id));
          if (free.length === 0) break;
          const h = pick(free);
          const targets = snapTargets(level, pieces, i);
          const raw = fingerTarget(h.pos, targets);
          const to = isFocus(h.id) ? snapTo(raw, targets, SNAP_RADIUS) : raw;
          pieces[i] = applyDrag(pieces[i], h.id, to, lockedSize(def));
        }
      });
      return pieces;
    };

    let s = newEditor("Spacer");
    let solutions = 0;
    let tooSmall = 0;
    for (let step = 0; step < 3000; step++) {
      const op = Math.floor(next() * 8);
      if (op === 0) s = addPiece(s, pick(PIECES));
      else if (op === 1) s = addObstacle(s, pick(OBSTACLES));
      else if (op === 2) {
        const all = [
          ...s.pieces.map((_, index) => ({ kind: "element" as const, index })),
          ...s.obstacles.map((_, index) => ({ kind: "przeszkoda" as const, index })),
        ];
        if (all.length > 0) s = toggleArc({ ...s, selected: pick(all) });
      } else if (op === 3) s = cycleShot(s);
      else if (op === 4) {
        if (s.pieces.length > 0) {
          const index = Math.floor(next() * s.pieces.length);
          s = toggleLock(s, index, pick(handlePositions(s.pieces[index].shape)).id);
        }
      } else if (op === 5 && next() < 0.3) {
        s = removeSelected(s);
      } else {
        const handles = editorHandles(s);
        const h = pick(handles);
        s = applyEditorDrag(s, h.ref, fingerTarget(h.pos, handles.map((x) => x.pos)), SNAP_RADIUS);
      }

      const draft = decodeLevel(draftCode(s), { draft: true });
      expect(draft.ok, `krok ${step}: szkic odrzucony (${draft.ok ? "" : draft.reason})`).toBe(true);

      if (step % 50 === 49 && s.pieces.length > 0) {
        const solution = playSolution(s);
        const d = decodeLevel(encodeLevel(toShared(s, solution)));
        solutions++;
        if (!d.ok && solution.some((p) => p.kind === "elipsa" && p.arc !== undefined && !arcFits(p))) {
          tooSmall++;
          expect(acceptWin(toShared(s), solution).ok, `krok ${step}`).toBe(false);
          continue;
        }
        expect(d.ok, `krok ${step}: rozwiązanie odrzucone (${d.ok ? "" : d.reason})`).toBe(true);
      }
    }
    expect(solutions).toBeGreaterThan(30);
    expect(tooSmall).toBeLessThan(solutions / 10);
  });
});
