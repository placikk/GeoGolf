import { Vec2 } from "../core/vec";
import { circleConic, ellipseFromFoci } from "../core/conic";
import { LEVELS, SNAP_RADIUS } from "../levels";
import { makeCamera } from "../render/camera";
import { PALETTE, drawConic, glowDot, glowPolyline } from "../render/draw";
import { positionAt, trailSegment } from "../render/trails";
import { applyDrag, handlePositions, pickHandle, snapTo } from "./handles";
import { BALL_SPEED, GameState, advance, newGame, preview, startProof } from "./game";

const TRAIL = 0.35;
const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  let levelIndex = 0;
  let game: GameState = newGame(LEVELS[levelIndex]);
  let dragging: ReturnType<typeof pickHandle> = null;
  let pointer: Vec2 | null = null;
  let consumedReset = false;
  let last = performance.now();

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const cam = () => makeCamera(canvas.width / dpr(), canvas.height / dpr());

  function resize(): void {
    const r = dpr();
    canvas.width = window.innerWidth * r;
    canvas.height = window.innerHeight * r;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  const toWorld = (e: PointerEvent): Vec2 => {
    const r = canvas.getBoundingClientRect();
    return cam().toWorld({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  /** Zawija tekst po słowach. Wymaga ustawionego wcześniej `ctx.font`. */
  const wrapByWords = (text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(" ")) {
      const candidate = line === "" ? word : `${line} ${word}`;
      if (line !== "" && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line !== "") lines.push(line);
    return lines;
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (game.phase !== "edycja") {
      if (game.phase === "wygrana") levelIndex = (levelIndex + 1) % LEVELS.length;
      game = newGame(LEVELS[levelIndex]);
      consumedReset = true;
      return;
    }
    consumedReset = false;
    const w = toWorld(e);
    dragging = pickHandle(w, game.ellipse, game.level.locked, (HANDLE_PX * 1.5) / cam().scale);
    pointer = w;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (dragging === null) return;
    const w = toWorld(e);
    pointer = w;
    const snapped = dragging === "rozmiar"
      ? w
      : snapTo(w, [game.level.ball, game.level.hole], SNAP_RADIUS);
    game = { ...game, ellipse: applyDrag(game.ellipse, dragging, snapped) };
  });

  const endDrag = (): void => { dragging = null; pointer = null; };
  canvas.addEventListener("pointercancel", endDrag);

  // JEDEN listener, nie dwa. Osobny `endDrag` zarejestrowany wcześniej wyzerowałby
  // `dragging`, ZANIM drugi listener zdążyłby sprawdzić, czy właśnie trwało przeciąganie
  // — więc puszczenie uchwytu w dolnym pasie ekranu uruchamiałoby dowód wbrew graczowi
  // i kasowało jego niedokończoną edycję. W pionie geometria kamery przypadkiem chroni
  // przed tym (plansza nie sięga pasa przycisku), ale nic nie wymusza pionu.
  canvas.addEventListener("pointerup", (e) => {
    const wasDragging = dragging !== null;
    const afterReset = consumedReset;
    consumedReset = false;
    endDrag();
    if (wasDragging || afterReset || game.phase !== "edycja") return;
    const r = canvas.getBoundingClientRect();
    if (e.clientY - r.top > r.height * 0.86) game = startProof(game);
  });

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    game = advance(game, dt);
    draw();
    requestAnimationFrame(frame);
  }

  function draw(): void {
    const c = cam();
    const level = game.level;
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width / dpr(), canvas.height / dpr());

    for (const o of level.obstacles) {
      drawConic(ctx, c, circleConic(o.center, o.radius), PALETTE.obstacle, PALETTE.obstacleGlow, 2);
    }

    const k = ellipseFromFoci(game.ellipse.f1, game.ellipse.f2, game.ellipse.a);
    drawConic(ctx, c, k, PALETTE.curve, PALETTE.curveGlow, 2);

    glowDot(ctx, c, level.hole, PALETTE.hole, PALETTE.holeGlow, 9);
    glowDot(ctx, c, level.ball, PALETTE.ball, PALETTE.ballGlow, 6);

    if (game.phase === "edycja") {
      for (const h of handlePositions(game.ellipse)) {
        if (level.locked.includes(h.id)) continue;
        glowDot(ctx, c, h.pos, PALETTE.handle, PALETTE.curveGlow, 7);
      }
      // podgląd na żywo: dwie piłki, blade tory
      for (const b of preview(game).balls) {
        glowPolyline(ctx, c, b.path, "rgba(226,232,240,0.28)", "rgba(226,232,240,0.06)", 1);
      }
      if (dragging !== null && pointer !== null) {
        // znacznik odsunięty od palca, żeby nie zasłaniał tego, co przesuwasz
        const s = c.toScreen(pointer);
        ctx.fillStyle = PALETTE.text;
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(`${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)}`, s.x + 26, s.y - 26);
      }
      banner(level.title, level.hint, "Sprawdź");
    } else if (game.proof !== null) {
      const s = game.elapsed * BALL_SPEED;
      for (const b of game.proof.balls) {
        const color = game.phase === "porazka" && !b.holed ? PALETTE.miss : PALETTE.trail;
        glowPolyline(ctx, c, trailSegment(b.path, s, TRAIL), color, PALETTE.trailGlow, 2);
        glowDot(ctx, c, positionAt(b.path, s), PALETTE.ball, PALETTE.ballGlow, 4);
      }
      if (game.phase === "wygrana") {
        for (const b of game.proof.balls) {
          glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
        }
        banner("Wpadły wszystkie", "Osiem torów, jedno miejsce, ta sama chwila.", "Następny");
      } else if (game.phase === "porazka") {
        const missed = game.proof.balls.filter((b) => !b.holed).length;
        banner("Nie wszystkie", `Chybiło ${missed} z ${game.proof.balls.length}. Zobacz, którędy.`, "Jeszcze raz");
      }
    }

    function banner(title: string, hint: string, action: string): void {
      const w = canvas.width / dpr();
      const h = canvas.height / dpr();
      ctx.fillStyle = PALETTE.text;
      ctx.textAlign = "center";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText(title, w / 2, 46);
      // Podpowiedź ZAWIJAMY. Bez tego instrukcja poziomu urywa się na szerokości
      // telefonu, a telefon jest celem podstawowym — gracz traci dokładnie to zdanie,
      // które mówi mu, co ma zrobić. Dotyczy większości z ośmiu poziomów, nie tylko
      // pierwszego: podpowiedzi mają 61-79 znaków przy 14 px na 390 px szerokości.
      ctx.font = "14px system-ui, sans-serif";
      wrapByWords(hint, w - 32).forEach((line, i) => {
        ctx.fillText(line, w / 2, 70 + i * 18);
      });
      ctx.font = "600 16px system-ui, sans-serif";
      ctx.fillStyle = PALETTE.curve;
      ctx.fillText(action, w / 2, h * 0.93);
      ctx.textAlign = "left";
    }
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}
