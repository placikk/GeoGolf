import { Vec2, vec } from "../core/vec";
import { BOARD_WALLS, LEVELS, SNAP_RADIUS, isCircle, shapeToPiece } from "../levels";
import { makeCamera } from "../render/camera";
import { PALETTE, drawPiece, glowDot, glowPolyline, holeMark, ringHandle, sectorWedge } from "../render/draw";
import { SPAN } from "../render/shapes";
import { positionAt, trailSegment } from "../render/trails";
import { HandleRef, applyDrag, handlePositions, pickHandle, snapTargets, snapTo } from "./handles";
import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
import { ACTION_BAND, MENU_BUTTON, hitRect, hitTile, menuLayout, winAction, winLabels } from "./menu";
import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";

const TRAIL = 0.35;
const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  const store = browserStore();
  let progress = loadProgress(store, LEVELS.length);
  let levelIndex = progress.last;
  let game: GameState = newGame(LEVELS[levelIndex]);
  let menuOpen = false;
  let dragging: HandleRef | null = null;
  let pointer: Vec2 | null = null;
  let consumedReset = false;
  let last = performance.now();
  let time = 0;

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

  const toScreenPoint = (e: PointerEvent): Vec2 => {
    const r = canvas.getBoundingClientRect();
    return vec(e.clientX - r.left, e.clientY - r.top);
  };
  const toWorld = (e: PointerEvent): Vec2 => cam().toWorld(toScreenPoint(e));
  const viewW = () => canvas.width / dpr();
  const viewH = () => canvas.height / dpr();

  const isLast = (): boolean => levelIndex === LEVELS.length - 1;

  function goTo(index: number): void {
    levelIndex = index;
    game = newGame(LEVELS[index]);
    progress = { ...progress, last: index };
    saveProgress(store, progress);
  }

  function toggleMenu(): void {
    menuOpen = !menuOpen;
    // Menu przerywa trwający dowód: po zamknięciu gracz wraca do edycji swoich elementów.
    if (menuOpen && game.phase === "dowod") game = retry(game);
  }

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
    const p = toScreenPoint(e);
    if (hitRect(MENU_BUTTON, p)) {
      toggleMenu();
      consumedReset = true;
      return;
    }
    if (menuOpen) {
      // kafelek wybiera poziom (także ten sam — od nowa), tło po prostu zamyka menu
      const i = hitTile(menuLayout(viewW(), viewH(), LEVELS.length), p);
      if (i !== null) goTo(i);
      menuOpen = false;
      consumedReset = true;
      return;
    }
    if (game.phase === "wygrana") {
      const action = winAction(p, viewW(), viewH(), isLast());
      if (action === "nastepny") goTo(levelIndex + 1);
      if (action === "menu") menuOpen = true;
      if (action === "powtorz") game = retry(game);
      consumedReset = true;
      return;
    }
    if (game.phase !== "edycja") {
      // dotknięcie w trakcie dowodu albo po porażce: z powrotem do edycji, ustawienie zostaje
      game = retry(game);
      consumedReset = true;
      return;
    }
    consumedReset = false;
    const w = toWorld(e);
    dragging = pickHandle(
      w, game.pieces, game.level.pieces.map((p) => p.locked), (HANDLE_PX * 1.5) / cam().scale,
    );
    pointer = w;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (dragging === null) return;
    const w = toWorld(e);
    pointer = w;
    const { piece, id } = dragging;
    // przyskakują tylko ogniska; rozmiar i końce łuku idą za palcem
    const snapped = id === "ognisko1" || id === "ognisko2"
      ? snapTo(w, snapTargets(game.level, game.pieces, piece), SNAP_RADIUS)
      : w;
    const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped) : s));
    game = { ...game, pieces };
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
    if (e.clientY - r.top > r.height * ACTION_BAND) game = startProof(game);
  });

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time = now / 1000;
    if (!menuOpen) {
      const before = game.phase;
      game = advance(game, dt);
      if (before === "dowod" && game.phase === "wygrana") {
        progress = markSolved(progress, game.level.id);
        saveProgress(store, progress);
      }
    }
    draw();
    requestAnimationFrame(frame);
  }

  function draw(): void {
    const c = cam();
    const level = game.level;
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width / dpr(), canvas.height / dpr());

    // wachlarz tylko w edycji i tylko gdy poziom go ma — bez niego łuk „nie tam,
    // gdzie lecą piłki" wyglądałby na błąd gry
    if (game.phase === "edycja" && level.sector !== undefined) {
      sectorWedge(ctx, c, level.ball, level.sector, SPAN, PALETTE.sector);
    }

    // brzeg planszy jest ścianą — cienka ramka w kolorze stałych kształtów
    for (const w of BOARD_WALLS) {
      drawPiece(ctx, c, shapeToPiece(w), PALETTE.obstacle, PALETTE.obstacleGlow, 1);
    }

    for (const o of level.obstacles) {
      drawPiece(ctx, c, shapeToPiece(o), PALETTE.obstacle, PALETTE.obstacleGlow, 2);
      // ogniska stałych elips blado — lekcje kaskad to „trafić ogniskiem w to ognisko";
      // okręgi pomijamy: ich „ognisko" to środek przeszkody, nie cel
      if (o.kind === "elipsa" && !isCircle(o)) {
        glowDot(ctx, c, o.f1, PALETTE.fixedFocus, PALETTE.obstacleGlow, 2.5);
        glowDot(ctx, c, o.f2, PALETTE.fixedFocus, PALETTE.obstacleGlow, 2.5);
      }
    }

    for (const s of game.pieces) {
      drawPiece(ctx, c, shapeToPiece(s), PALETTE.curve, PALETTE.curveGlow, 2);
    }

    // Stałe punkty są pełne (piłka) albo wyglądają jak otwór (dołek); wszystko, co da się
    // przeciągnąć, to pulsujący pusty pierścień w kolorze elipsy. Pierścienie rysujemy
    // na końcu, żeby ognisko postawione na piłce otaczało ją, a nie znikało pod nią.
    holeMark(ctx, c, level.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 9);
    glowDot(ctx, c, level.ball, PALETTE.ball, PALETTE.ballGlow, 6);

    if (game.phase === "edycja") {
      game.pieces.forEach((s, piece) => {
        for (const h of handlePositions(s)) {
          if (level.pieces[piece].locked.includes(h.id)) continue;
          const active = dragging !== null && dragging.piece === piece && dragging.id === h.id;
          const r = active ? 15 : 12 + 1.5 * Math.sin(time * 3.2);
          ringHandle(ctx, c, h.pos, PALETTE.handle, PALETTE.handleGlow, r);
        }
      });
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
        // Zdanie o jednoczesności wolno wypisać tylko wtedy, gdy faktycznie zaszła.
        // Warunkiem zwycięstwa jest "wszystkie wpadły", nie "wpadły razem" — a istnieją
        // rozwiązania, w których dołek leży na cięciwie zamiast w ognisku i piłki
        // przybywają w odstępie kilku sekund. Chwalenie się wtedy "tą samą chwilą"
        // byłoby kłamstwem gry wobec gracza.
        const allSolved = LEVELS.every((l) => progress.solved.includes(l.id));
        const { right, note } = winLabels(isLast(), allSolved);
        const summary = game.proof.simultaneous
          ? "Osiem torów, jedno miejsce, ta sama chwila."
          : "Osiem torów, jedno miejsce.";
        banner("Wpadły wszystkie", note === null ? summary : `${summary} ${note}`, ["Jeszcze raz", right]);
      } else if (game.phase === "porazka") {
        const missed = game.proof.balls.filter((b) => !b.holed).length;
        banner("Nie wszystkie", `Chybiło ${missed} z ${game.proof.balls.length}. Zobacz, którędy.`, "Jeszcze raz");
      }
    }

    if (menuOpen) drawMenu();
    drawMenuButton();

    function banner(title: string, hint: string, action: string | [string, string]): void {
      const w = viewW();
      const h = viewH();
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.muted;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`Poziom ${levelIndex + 1} / ${LEVELS.length}`, w / 2, 22);
      ctx.fillStyle = PALETTE.text;
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
      if (typeof action === "string") {
        ctx.fillStyle = PALETTE.curve;
        ctx.fillText(action, w / 2, h * 0.93);
      } else {
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(action[0], w / 4, h * 0.93);
        ctx.fillStyle = PALETTE.curve;
        ctx.fillText(action[1], (3 * w) / 4, h * 0.93);
        ctx.fillStyle = PALETTE.muted;
        ctx.fillRect(w / 2 - 0.5, h * 0.9, 1, h * 0.05);
      }
      ctx.textAlign = "left";
    }

    function drawMenuButton(): void {
      const b = MENU_BUTTON;
      ctx.fillStyle = menuOpen ? PALETTE.curve : PALETTE.text;
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 + i * 6 - 1, 20, 2);
      }
    }

    function drawMenu(): void {
      const w = viewW();
      const h = viewH();
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.text;
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText("Poziomy", w / 2, 34);
      menuLayout(w, h, LEVELS.length).forEach((t, i) => {
        const lvl = LEVELS[i];
        ctx.beginPath();
        ctx.roundRect(t.x, t.y, t.w, t.h, 10);
        ctx.fillStyle = PALETTE.tile;
        ctx.fill();
        ctx.lineWidth = i === levelIndex ? 2 : 1;
        ctx.strokeStyle = i === levelIndex ? PALETTE.curve : PALETTE.tileEdge;
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillStyle = PALETTE.text;
        ctx.font = "600 22px system-ui, sans-serif";
        ctx.fillText(String(i + 1), t.x + 12, t.y + 30);
        if (progress.solved.includes(lvl.id)) {
          ctx.textAlign = "right";
          ctx.fillStyle = PALETTE.curve;
          ctx.fillText("✓", t.x + t.w - 12, t.y + 30);
          ctx.textAlign = "left";
        }
        ctx.fillStyle = PALETTE.muted;
        ctx.font = "13px system-ui, sans-serif";
        wrapByWords(lvl.title, t.w - 24).slice(0, 3).forEach((line, j) => {
          ctx.fillText(line, t.x + 12, t.y + 54 + j * 16);
        });
      });
      ctx.textAlign = "left";
    }
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}
