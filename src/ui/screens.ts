import { Vec2, vec } from "../core/vec";
import { Card, LEVELS, Level, SNAP_RADIUS, Shape, sceneTraces, shapeFoci, shapeToPiece } from "../levels";
import { makeCamera, rectCamera } from "../render/camera";
import {
  PALETTE, SECTOR_REACH, boardFrame, dashedPolyline, drawPiece, glowDot, glowPolyline, handleShape, holeMark,
  sectorWedge,
} from "../render/draw";
import { curveHints, parabolaAxis, shotArrow, twinPolyline } from "../render/shapes";
import { handleMark, shapeStyle } from "../render/style";
import { positionAt, trailSegment } from "../render/trails";
import { HandleRef, applyDrag, handlePositions, lockedSize, pickHandle, snapTargets, snapTo } from "./handles";
import { BALL_SPEED, GameState, advance, newGame, preview, retry, startProof } from "./game";
import {
  MENU_BUTTON, MenuTab, SECTION_HEADER_H, cardLayout, clampScroll, communityLayout, editAction, helpButton, hitCommunity,
  hitRect, hitTile, inActionBand, isTap, menuLayout, playArea, resultBanner, settingsButton, settingsLayout, tabRects,
  TILE_LINE_H, TILE_NUMBER_Y, TILE_TITLE_Y, tileTitle, titleLineCount, winAction, winLabels, wrapByWords,
} from "./menu";
import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";
import { Playlist, autoCardIn, bannerLabel, current, helpCard, isLastIn, nextIn } from "./playlist";
import { addLink, loadLinks, saveLinks } from "./collections";
import { loadCatalog } from "../share/catalog";
import { codeFromHash, openCode } from "../share/verify";

const TRAIL = 0.35;
const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy
const TOAST_S = 2.5;    // jak długo wisi komunikat na dole ekranu

/** Sekcje zakładki „Społeczność" w kolejności rysowania. */
const COMMUNITY_SECTIONS = ["katalog", "linki"] as const;

export function mount(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  const store = browserStore();
  let progress = loadProgress(store, LEVELS.map((l) => l.id));
  // brak zapisu (albo poziom, którego już nie ma) → -1 → pierwszy poziom
  let playlist: Playlist = {
    section: "tworcy", levels: LEVELS, index: Math.max(0, LEVELS.findIndex((l) => l.id === progress.lastId)),
  };
  let game: GameState = newGame(current(playlist));
  let menuOpen = false;
  let menuTab: MenuTab = "tworcy";
  let communityScroll = 0;
  /** palec położony na liście społeczności — przewijanie albo stuknięcie rozstrzyga `pointerup` */
  let listPointer: { down: Vec2; scroll0: number } | null = null;
  const catalog = loadCatalog();
  let links = loadLinks(store);
  /** komunikat na dole ekranu (np. o złym linku) i czas, do którego wisi */
  let toast: { text: string; until: number } | null = null;
  let settings = loadSettings(store);
  let settingsOpen = false;
  /** otwarta plansza z zasadą; `null` — żadna */
  let card: Card | null = autoCardIn(playlist, progress.solved) ?? null;
  let dragging: HandleRef | null = null;
  let pointer: Vec2 | null = null;
  let consumedReset = false;
  let last = performance.now();
  let time = 0;

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  // plansza między banerem a przyciskami: ramka nie przecina napisów (także w poziomie)
  const cam = () => makeCamera(
    canvas.width / dpr(), canvas.height / dpr(), 0.06, playArea(canvas.height / dpr()),
  );

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

  /** Poziomy z linków, odkodowane RAZ (odkodowanie to pełny dowód) — odświeżane tylko przy
   *  dopisaniu linku, nie w każdej klatce rysowania. */
  const decodeLinks = (): Level[] => links.flatMap((c) => { const o = openCode(c); return o.ok ? [o.level] : []; });
  let linkLevels = decodeLinks();
  const catalogLevels = catalog.map((c) => c.level);
  const sectionLevels = (section: (typeof COMMUNITY_SECTIONS)[number]): Level[] =>
    section === "katalog" ? catalogLevels : linkLevels;

  function play(next: Playlist): void {
    playlist = next;
    game = newGame(current(next));
    // „ostatnio grany" dotyczy tylko listy twórców — poziomy społeczności nie mają numeru
    if (next.section === "tworcy") {
      progress = { ...progress, lastId: current(next).id };
      saveProgress(store, progress);
    }
    // pierwszy poziom nowej mechaniki, jeszcze niezaliczony: najpierw zasada
    card = autoCardIn(next, progress.solved) ?? null;
  }

  // zegar `performance.now`, nie `time` z klatki — `openFromHash` woła to przed pierwszą klatką
  const say = (text: string): void => { toast = { text, until: performance.now() / 1000 + TOAST_S }; };

  /** Link `…#poziom=<kod>`: poziom trafia do „Z linków" i od razu się otwiera (poziom
   *  z katalogu otwiera się w katalogu); zły link — komunikat i zwykła gra. Końcówka adresu
   *  znika, żeby odświeżenie strony nie otwierało poziomu drugi raz. */
  function openFromHash(): void {
    const code = codeFromHash(window.location.hash);
    if (code === null) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    // link wklejony w otwartej już karcie (`hashchange`) — menu i ustawienia nie mogą go zasłonić
    menuOpen = false;
    settingsOpen = false;
    if (game.phase === "dowod") game = retry(game);
    const o = openCode(code);
    if (!o.ok) {
      say("Ten link nie zawiera działającego poziomu");
      return;
    }
    const inCatalog = catalog.findIndex((c) => c.level.id === o.level.id);
    if (inCatalog >= 0) {
      play({ section: "katalog", levels: catalogLevels, index: inCatalog });
      return;
    }
    links = addLink(links, o.code);
    saveLinks(store, links);
    linkLevels = decodeLinks();
    play({ section: "linki", levels: linkLevels, index: 0 });
  }

  /** Otwiera menu na zakładce bieżącego poziomu — po wygranej i z przycisku ☰. */
  function openMenu(): void {
    menuOpen = true;
    settingsOpen = false;
    menuTab = playlist.section === "tworcy" ? "tworcy" : "spolecznosc";
  }

  function toggleMenu(): void {
    if (menuOpen) {
      menuOpen = false;
      settingsOpen = false;
    } else openMenu();
    // Menu przerywa trwający dowód: po zamknięciu gracz wraca do edycji swoich elementów.
    if (menuOpen && game.phase === "dowod") game = retry(game);
  }

  /** „?" jest rysowane i dotykalne tylko poza menu, ustawieniami i dowodem (wtedy napis
   *  „Poziom N / M" obok niego też nie jest rysowany). */
  const helpVisible = (): boolean => !menuOpen && !settingsOpen && game.phase !== "dowod";

  /** „?" — plansza mechaniki bieżącego poziomu. Dowód nie może trwać, gdy „?" jest
   *  dotykalne (patrz `helpVisible`), więc nie ma czego przerywać. */
  function openHelp(): void {
    card = helpCard(playlist) ?? null;
  }

  function toggleSettings(): void {
    settingsOpen = !settingsOpen;
    menuOpen = false;
    // jak menu poziomów: ustawienia przerywają trwający dowód
    if (settingsOpen && game.phase === "dowod") game = retry(game);
  }

  /** Szerokość napisu w bieżącej czcionce — wymaga ustawionego wcześniej `ctx.font`. */
  const measure = (t: string): number => ctx.measureText(t).width;

  canvas.addEventListener("pointerdown", (e) => {
    const p = toScreenPoint(e);
    if (card !== null) {
      // plansza z zasadą zamyka się tylko przyciskiem „Gram" (dolny pas) — przypadkowe
      // dotknięcie tekstu czy rysunku nie zabiera jej sprzed oczu
      if (inActionBand(p, viewH())) card = null;
      consumedReset = true;
      return;
    }
    if (helpVisible() && hitRect(helpButton(viewW()), p)) {
      openHelp();
      consumedReset = true;
      return;
    }
    if (hitRect(MENU_BUTTON, p)) {
      toggleMenu();
      consumedReset = true;
      return;
    }
    if (hitRect(settingsButton(viewW()), p)) {
      toggleSettings();
      consumedReset = true;
      return;
    }
    if (settingsOpen) {
      // wiersz przełącza ustawienie (ekran zostaje otwarty), tło zamyka ustawienia
      const i = hitTile(settingsLayout(viewW(), viewH(), SETTING_ROWS.length), p);
      if (i === null) settingsOpen = false;
      else {
        settings = toggleSetting(settings, SETTING_ROWS[i].key);
        saveSettings(store, settings);
      }
      consumedReset = true;
      return;
    }
    if (menuOpen) {
      consumedReset = true;
      const tab = tabRects(viewW()).findIndex((r) => hitRect(r, p));
      if (tab >= 0) {
        menuTab = tab === 0 ? "tworcy" : "spolecznosc";
        communityScroll = 0;
        return;
      }
      if (menuTab === "spolecznosc") {
        // przewinięcie czy stuknięcie — rozstrzyga `pointerup`
        listPointer = { down: p, scroll0: communityScroll };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      // kafelek wybiera poziom (także ten sam — od nowa), tło po prostu zamyka menu
      const i = hitTile(menuLayout(viewW(), viewH(), LEVELS.length), p);
      if (i !== null) play({ section: "tworcy", levels: LEVELS, index: i });
      menuOpen = false;
      return;
    }
    if (game.phase === "wygrana") {
      const action = winAction(p, viewW(), viewH(), isLastIn(playlist));
      if (action === "nastepny") play(nextIn(playlist));
      if (action === "menu") openMenu();
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
    if (inActionBand(p, viewH())) {
      // dotknięcie w pasie akcji: nie łapiemy uchwytu — `pointerup` rozpozna to
      // jako Reset / Sprawdź (patrz komentarz przy tamtym listenerze)
      dragging = null;
      pointer = null;
      return;
    }
    const w = toWorld(e);
    dragging = pickHandle(
      w, game.pieces, game.level.pieces.map((p) => p.locked), (HANDLE_PX * 1.5) / cam().scale,
    );
    pointer = w;
    canvas.setPointerCapture(e.pointerId);
  });

  const communityCounts = (): number[] => COMMUNITY_SECTIONS.map((sec) => sectionLevels(sec).length);

  canvas.addEventListener("pointermove", (e) => {
    if (listPointer !== null) {
      const dy = toScreenPoint(e).y - listPointer.down.y;
      const { maxScroll } = communityLayout(viewW(), viewH(), communityCounts(), 0);
      communityScroll = clampScroll(listPointer.scroll0 - dy, maxScroll);
      return;
    }
    if (dragging === null) return;
    const w = toWorld(e);
    pointer = w;
    const { piece, id } = dragging;
    // przyskakują tylko ogniska (elipsy, hiperboli i paraboli); rozmiar, wierzchołek
    // i końce łuku idą za palcem
    const snapped = id === "ognisko1" || id === "ognisko2" || id === "ognisko"
      ? snapTo(w, snapTargets(game.level, game.pieces, piece), SNAP_RADIUS)
      : w;
    // przy zablokowanym uchwycie rozmiaru rozmiar wraca do wartości poziomu — patrz `lockedSize`
    const lockedA = lockedSize(game.level.pieces[piece]);
    const pieces = game.pieces.map((s, i) => (i === piece ? applyDrag(s, id, snapped, lockedA) : s));
    game = { ...game, pieces };
  });

  const endDrag = (): void => { dragging = null; pointer = null; listPointer = null; };
  canvas.addEventListener("pointercancel", endDrag);

  /** Stuknięcie w listę społeczności: kafelek otwiera poziom swojej sekcji, tło zamyka menu. */
  function tapCommunity(p: Vec2): void {
    const hit = hitCommunity(communityLayout(viewW(), viewH(), communityCounts(), communityScroll), p);
    menuOpen = false;
    if (hit === null) return;
    const section = COMMUNITY_SECTIONS[hit.section];
    play({ section, levels: sectionLevels(section), index: hit.index });
  }

  // JEDEN listener, nie dwa. Osobny `endDrag` zarejestrowany wcześniej wyzerowałby
  // `dragging`, ZANIM drugi listener zdążyłby sprawdzić, czy właśnie trwało przeciąganie
  // — więc puszczenie uchwytu w dolnym pasie ekranu uruchamiałoby dowód wbrew graczowi
  // i kasowało jego niedokończoną edycję. W pionie geometria kamery przypadkiem chroni
  // przed tym (plansza nie sięga pasa przycisku), ale nic nie wymusza pionu.
  canvas.addEventListener("pointerup", (e) => {
    if (listPointer !== null) {
      const up = toScreenPoint(e);
      if (isTap(listPointer.down, up)) tapCommunity(up);
      listPointer = null;
      consumedReset = false;
      return;
    }
    const wasDragging = dragging !== null;
    const afterReset = consumedReset;
    consumedReset = false;
    endDrag();
    if (wasDragging || afterReset || game.phase !== "edycja") return;
    // dolny pas: „Reset" (stan startowy poziomu) po lewej, „Sprawdź" po prawej
    const action = editAction(toScreenPoint(e), viewW(), viewH());
    if (action === "reset") game = newGame(game.level);
    if (action === "sprawdz") game = startProof(game);
  });

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time = now / 1000;
    if (!menuOpen && !settingsOpen && card === null) {
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

    // brzeg planszy jest ścianą: jaśniejsze tło planszy i stonowana ramka
    boardFrame(ctx, c, PALETTE.board, PALETTE.frame, PALETTE.frameGlow, 1);

    // wachlarz tylko w edycji i tylko gdy poziom go ma — bez niego łuk „nie tam,
    // gdzie lecą piłki" wyglądałby na błąd gry; klin jest mały i przycięty do planszy,
    // strzałka nie jest przycinana, ale się mieści: piłki etapu 0 leżą co najmniej 0.4
    // pod górną ścianą (patrz test w `tests/levels.test.ts`)
    if (game.phase === "edycja" && level.sector !== undefined) {
      // jedna piłka (wachlarz zerowej szerokości) — klin byłby pusty, więc strzałka kierunku
      if (level.sector.width === 0) {
        for (const linia of shotArrow(level.ball, level.sector.center, SECTOR_REACH)) {
          glowPolyline(ctx, c, linia, PALETTE.shot, "rgba(0,0,0,0)", 1.5);
        }
      } else {
        sectorWedge(ctx, c, level.ball, level.sector, SECTOR_REACH, PALETTE.sector);
      }
    }

    /** Linie pomocnicze krzywej (kierownica, asymptoty) — tylko przy włączonych
     *  podpowiedziach; tak samo dla przeszkód i elementów gracza. */
    const drawHints = (s: Shape): void => {
      if (settings.hints && (s.kind === "parabola" || s.kind === "hiperbola")) {
        for (const linia of curveHints(s)) {
          glowPolyline(ctx, c, linia, PALETTE.hint, "rgba(0,0,0,0)", 1);
        }
      }
    };

    /** Druga gałąź hiperboli z flagą `twin` (dziś tylko „ktora-galaz"): blado, tak jak linie
     *  pomocnicze, ale NIEZALEŻNIE od podpowiedzi — tam jest częścią poziomu, nie pomocą.
     *  Rysowana przed samą krzywą, żeby krzywa leżała na wierzchu. */
    const drawTwin = (s: Shape): void => {
      const druga = twinPolyline(s);
      if (druga !== undefined) glowPolyline(ctx, c, druga, PALETTE.hint, "rgba(0,0,0,0)", 1);
    };

    for (const o of level.obstacles) {
      drawHints(o);
      drawTwin(o);
      const st = shapeStyle(o, "staly");
      // oś paraboli zawsze (nie tylko przy podpowiedziach) — pod krzywą, żeby jej nie przecinać
      if (o.kind === "parabola") dashedPolyline(ctx, c, parabolaAxis(o), st.line, 1);
      drawPiece(ctx, c, shapeToPiece(o), st.line, st.glow, 2);
      // ogniska stałych elips/paraboli/hiperboli blado — lekcje kaskad to „trafić
      // ogniskiem w to ognisko"; przeszkody (okręgi, odcinki) ich nie mają (`focus: null`)
      if (st.focus !== null) {
        for (const f of shapeFoci(o)) glowDot(ctx, c, f, st.focus, "rgba(0,0,0,0)", 2.5);
      }
    }

    for (const s of game.pieces) {
      drawHints(s);
      drawTwin(s);
      const st = shapeStyle(s, "gracz");
      if (s.kind === "parabola") dashedPolyline(ctx, c, parabolaAxis(s), st.line, 1);
      drawPiece(ctx, c, shapeToPiece(s), st.line, st.glow, 2);
    }

    // Stałe punkty są pełne (piłka) albo wyglądają jak otwór (dołek); wszystko, co da się
    // przeciągnąć, to pulsujący pusty znak w kolorze swojej krzywej — pierścień (ognisko),
    // romb (wierzchołek) albo kwadrat (reszta), patrz `handleMark`. Uchwyty rysujemy
    // na końcu, żeby ognisko postawione na piłce otaczało ją, a nie znikało pod nią.
    holeMark(ctx, c, level.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 9);
    glowDot(ctx, c, level.ball, PALETTE.ball, PALETTE.ballGlow, 6);

    if (game.phase === "edycja") {
      game.pieces.forEach((s, piece) => {
        for (const h of handlePositions(s)) {
          if (level.pieces[piece].locked.includes(h.id)) continue;
          const active = dragging !== null && dragging.piece === piece && dragging.id === h.id;
          const r = active ? 15 : 12 + 1.5 * Math.sin(time * 3.2);
          const st = shapeStyle(s, "gracz");
          handleShape(ctx, c, h.pos, handleMark(h.id), st.line, st.glow, r);
        }
      });
      // podgląd na żywo: dwie piłki, blade tory — tylko gdy gracz włączył to w ustawieniach
      if (settings.previewPaths) {
        for (const b of preview(game).balls) {
          glowPolyline(ctx, c, b.path, "rgba(226,232,240,0.28)", "rgba(226,232,240,0.06)", 1);
        }
      }
      if (dragging !== null && pointer !== null) {
        // znacznik odsunięty od palca, żeby nie zasłaniał tego, co przesuwasz
        const s = c.toScreen(pointer);
        ctx.fillStyle = PALETTE.text;
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(`${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)}`, s.x + 26, s.y - 26);
      }
      banner(level.title, settings.hints ? level.hint : "", ["Reset", "Sprawdź"]);
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
        // pod tytułem tylko dopisek ostatniego poziomu; na pozostałych — nic
        // „wszystkie ukończone" dotyczy tylko listy twórców — lista społeczności nie ma kompletu
        const allSolved = playlist.section === "tworcy" && playlist.levels.every((l) => progress.solved.includes(l.id));
        const { right, note } = winLabels(isLastIn(playlist), allSolved);
        banner(resultBanner(game.proof.balls.length, 0).title, note ?? "", ["Jeszcze raz", right]);
      } else if (game.phase === "porazka") {
        const missed = game.proof.balls.filter((b) => !b.holed).length;
        const { title, note } = resultBanner(game.proof.balls.length, missed);
        banner(title, note, "Jeszcze raz");
      }
    }

    if (menuOpen) drawMenu();
    if (settingsOpen) drawSettings();
    if (card !== null) {
      drawCard(card);
      return;
    }
    drawMenuButton();
    drawSettingsButton();
    if (helpVisible()) drawHelpButton();
    if (toast !== null && time < toast.until) drawToast(toast.text);

    /** Komunikat w pigułce nad dolnym pasem — znika sam po `TOAST_S` sekund. */
    function drawToast(text: string): void {
      const w = viewW();
      const y = viewH() * 0.82;
      ctx.font = "14px system-ui, sans-serif";
      const tw = Math.min(w - 32, measure(text) + 32);
      ctx.fillStyle = PALETTE.overlay;
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, y - 22, tw, 32, 16);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(text, w / 2, y - 1);
      ctx.textAlign = "left";
    }

    function banner(title: string, hint: string, action: string | [string, string]): void {
      const w = viewW();
      const h = viewH();
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.muted;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(bannerLabel(playlist), w / 2, 22);
      ctx.fillStyle = PALETTE.text;
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText(title, w / 2, 46);
      // Podpowiedź ZAWIJAMY. Bez tego instrukcja poziomu urywa się na szerokości
      // telefonu, a telefon jest celem podstawowym — gracz traci dokładnie to zdanie,
      // które mówi mu, co ma zrobić. Dotyczy większości z ośmiu poziomów, nie tylko
      // pierwszego: podpowiedzi mają 61-79 znaków przy 14 px na 390 px szerokości.
      ctx.font = "14px system-ui, sans-serif";
      wrapByWords(hint, w - 32, measure).forEach((line, i) => {
        ctx.fillText(line, w / 2, 70 + i * 18);
      });
      ctx.font = "600 16px system-ui, sans-serif";
      if (typeof action === "string") {
        // po stronie „Sprawdź" (nie na środku) — środek to granica Reset | Sprawdź
        // w trybie edycji, więc drugie dotknięcie tego samego miejsca (np. przy
        // podwójnym stuknięciu) trafiłoby czasem w Reset i skasowało układ gracza
        ctx.fillStyle = PALETTE.curve;
        ctx.fillText(action, (3 * w) / 4, h * 0.93);
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

    /** „?" w kółku tuż za napisem „Poziom N / M" (ten sam wiersz, `helpButton` obejmuje oba).
     *  Kółko liniami i „?" znakiem ASCII — nie polegamy na glifie ⓘ w czcionce telefonu. */
    function drawHelpButton(): void {
      ctx.font = "12px system-ui, sans-serif";
      const tw = ctx.measureText(bannerLabel(playlist)).width;
      const cx = viewW() / 2 + tw / 2 + 14;
      ctx.strokeStyle = PALETTE.muted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, 18, 8, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText("?", cx, 22);
      ctx.textAlign = "left";
    }

    /** Plansza z zasadą: tytuł, zdanie, miniscenki liczone silnikiem i „Gram" w dolnym pasie.
     *  Rysunek tymi samymi funkcjami co gra — te same kolory rodzajów, tory i dołek. */
    function drawCard(k: Card): void {
      const w = viewW();
      const h = viewH();
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.text;
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText(k.title, w / 2, 34);
      ctx.font = "15px system-ui, sans-serif";
      wrapByWords(k.text, w - 32, measure).slice(0, 4).forEach((line, i) => ctx.fillText(line, w / 2, 70 + i * 20));
      cardLayout(w, h, k.scenes.length).forEach((r, i) => {
        const scene = k.scenes[i];
        const rc = rectCamera(r);
        boardFrame(ctx, rc, PALETTE.board, PALETTE.frame, PALETTE.frameGlow, 1);
        for (const s of scene.shapes) {
          const st = shapeStyle(s, "gracz");
          if (s.kind === "parabola") dashedPolyline(ctx, rc, parabolaAxis(s), st.line, 1);
          drawPiece(ctx, rc, shapeToPiece(s), st.line, st.glow, 2);
        }
        for (const t of sceneTraces(scene)) glowPolyline(ctx, rc, t.path, PALETTE.trail, PALETTE.trailGlow, 1.5);
        if (scene.hole !== undefined) holeMark(ctx, rc, scene.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 6);
        for (const shot of scene.shots) glowDot(ctx, rc, shot.from, PALETTE.ball, PALETTE.ballGlow, 4);
      });
      ctx.font = "600 16px system-ui, sans-serif";
      ctx.fillStyle = PALETTE.curve;
      ctx.fillText("Gram", w / 2, h * 0.93);
      ctx.textAlign = "left";
    }

    /** Zębatka rysowana liniami — nie polegamy na glifie ⚙ w czcionce telefonu. */
    function drawSettingsButton(): void {
      const b = settingsButton(viewW());
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.strokeStyle = settingsOpen ? PALETTE.curve : PALETTE.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const t = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + 8 * Math.cos(t), cy + 8 * Math.sin(t));
        ctx.lineTo(cx + 11 * Math.cos(t), cy + 11 * Math.sin(t));
        ctx.stroke();
      }
    }

    function drawSettings(): void {
      const w = viewW();
      const h = viewH();
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.fillStyle = PALETTE.text;
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText("Ustawienia", w / 2, 34);
      settingsLayout(w, h, SETTING_ROWS.length).forEach((r, i) => {
        const on = settings[SETTING_ROWS[i].key];
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = PALETTE.tile;
        ctx.fill();
        ctx.lineWidth = on ? 2 : 1;
        ctx.strokeStyle = on ? PALETTE.curve : PALETTE.tileEdge;
        ctx.stroke();
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(SETTING_ROWS[i].label, r.x + 16, r.y + r.h / 2 + 6);
        ctx.textAlign = "right";
        ctx.fillStyle = on ? PALETTE.curve : PALETTE.muted;
        ctx.fillText(on ? "wł." : "wył.", r.x + r.w - 16, r.y + r.h / 2 + 6);
      });
      ctx.textAlign = "left";
    }

    function drawMenu(): void {
      const w = viewW();
      const h = viewH();
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, w, h);
      drawTabs();
      if (menuTab === "spolecznosc") {
        drawCommunity();
        return;
      }
      const levelIndex = playlist.section === "tworcy" ? playlist.index : -1;
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
        ctx.fillText(String(i + 1), t.x + 12, t.y + TILE_NUMBER_Y);
        if (progress.solved.includes(lvl.id)) {
          ctx.textAlign = "right";
          ctx.fillStyle = PALETTE.curve;
          ctx.fillText("✓", t.x + t.w - 12, t.y + TILE_NUMBER_Y);
          ctx.textAlign = "left";
        }
        ctx.fillStyle = PALETTE.muted;
        const title = tileTitle(lvl.title, t.w - 24, (size) => {
          ctx.font = `${size}px system-ui, sans-serif`;
          return measure;
        }, titleLineCount(t.h));
        ctx.font = `${title.size}px system-ui, sans-serif`;
        title.lines.forEach((line, j) => {
          ctx.fillText(line, t.x + 12, t.y + TILE_TITLE_Y + j * TILE_LINE_H);
        });
      });
      ctx.textAlign = "left";
    }

    /** Zakładki „Od twórców | Społeczność": wybrana jaśniejsza i podkreślona. */
    function drawTabs(): void {
      const labels = ["Od twórców", "Społeczność"];
      tabRects(viewW()).forEach((r, i) => {
        const on = (i === 0) === (menuTab === "tworcy");
        ctx.textAlign = "center";
        // wąskie telefony: przy szerokości 320 px zakładka ma 104 px, więc napis zmniejszamy, aż się zmieści
        const size = [16, 15, 14, 13].find((sz) => {
          ctx.font = `600 ${sz}px system-ui, sans-serif`;
          return measure(labels[i]) <= r.w - 16;
        }) ?? 13;
        ctx.font = `600 ${size}px system-ui, sans-serif`;
        ctx.fillStyle = on ? PALETTE.text : PALETTE.muted;
        ctx.fillText(labels[i], r.x + r.w / 2, r.y + r.h / 2 + 6);
        if (on) {
          ctx.fillStyle = PALETTE.curve;
          ctx.fillRect(r.x + 12, r.y + r.h - 3, r.w - 24, 2);
        }
      });
      ctx.textAlign = "left";
    }

    /** Zakładka „Społeczność": sekcje z nagłówkami, przewijane, przycięte do pasa listy. */
    function drawCommunity(): void {
      const layout = communityLayout(viewW(), viewH(), communityCounts(), communityScroll);
      const v = layout.viewport;
      ctx.save();
      ctx.beginPath();
      ctx.rect(v.x, v.y, v.w, v.h);
      ctx.clip();
      const titles = { katalog: "Katalog", linki: "Z linków" };
      const empty = {
        katalog: "Na razie pusto — przyślij twórcy link do swojego poziomu.",
        linki: "Tu trafią poziomy otwarte z linków.",
      };
      for (const head of layout.headers) {
        const section = COMMUNITY_SECTIONS[head.section];
        ctx.textAlign = "left";
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(titles[section], 16, head.y + 22);
        if (sectionLevels(section).length === 0) {
          ctx.font = "13px system-ui, sans-serif";
          ctx.fillStyle = PALETTE.muted;
          wrapByWords(empty[section], viewW() - 32, measure)
            .forEach((line, j) => ctx.fillText(line, 16, head.y + SECTION_HEADER_H + 24 + j * 16));
        }
      }
      for (const t of layout.tiles) {
        const section = COMMUNITY_SECTIONS[t.section];
        const lvl = sectionLevels(section)[t.index];
        const r = t.rect;
        const here = playlist.section === section && playlist.index === t.index;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 10);
        ctx.fillStyle = PALETTE.tile;
        ctx.fill();
        ctx.lineWidth = here ? 2 : 1;
        ctx.strokeStyle = here ? PALETTE.curve : PALETTE.tileEdge;
        ctx.stroke();
        if (progress.solved.includes(lvl.id)) {
          ctx.textAlign = "right";
          ctx.font = "600 18px system-ui, sans-serif";
          ctx.fillStyle = PALETTE.curve;
          ctx.fillText("✓", r.x + r.w - 10, r.y + 24);
        }
        ctx.textAlign = "left";
        ctx.fillStyle = PALETTE.text;
        const title = tileTitle(lvl.title, r.w - 40, (size) => {
          ctx.font = `600 ${size + 1}px system-ui, sans-serif`;
          return measure;
        }, 2);
        ctx.font = `600 ${title.size + 1}px system-ui, sans-serif`;
        title.lines.forEach((line, j) => ctx.fillText(line, r.x + 12, r.y + 24 + j * 17));
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillStyle = PALETTE.muted;
        const note = section === "katalog" ? (catalog[t.index]?.author ?? "") : "z linku";
        ctx.fillText(note, r.x + 12, r.y + r.h - 12);
      }
      ctx.restore();
    }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("hashchange", openFromHash);
  resize();
  openFromHash();
  requestAnimationFrame(frame);
}
