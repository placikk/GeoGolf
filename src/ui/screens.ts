import { Vec2, vec } from "../core/vec";
import { Card, LEVELS, Level, SNAP_RADIUS, Shape, mechanicCard, sceneTraces, shapeFoci, shapeToPiece } from "../levels";
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
  ACTION_BAND, EDITOR_ACTIONS, MENU_BUTTON, MenuTab, SECTION_HEADER_H, addSheetLayout, cardLayout, editorBar, editorBarHit, clampScroll, communityLayout, editAction, helpButton, hitCommunity,
  hitRect, hitTile, inActionBand, isTap, menuLayout, playArea, resultBanner, settingsButton, settingsLayout, tabRects,
  TILE_LINE_H, TILE_NUMBER_Y, TILE_TITLE_Y, tileTitle, titleLineCount, winAction, winLabels, wrapByWords,
} from "./menu";
import { SETTING_ROWS, loadSettings, saveSettings, toggleSetting } from "./settings";
import { browserStore, loadProgress, markSolved, saveProgress } from "./progress";
import { Playlist, autoCardIn, bannerLabel, current, helpCard, isLastIn, nextIn } from "./playlist";
import {
  MAX_PROJECTS, Project, addLink, loadLinks, loadProjects, removeProject, saveLinks, saveProjects, upsertProject,
} from "./collections";
import { loadCatalog } from "../share/catalog";
import { MAX_TITLE, SharedLevel, cleanTitle, decodeLevel, encodeLevel } from "../share/codec";
import { codeFromHash, linkFor, openCode } from "../share/verify";
import {
  EditorState, ObstacleKind, PieceKind, acceptWin, addObstacle, addPiece, canAddObstacle, canAddPiece, canToggleArc,
  cycleShot, draftCode, fromShared, newEditor, prepareTest, removeSelected, toggleArc, toggleLock,
} from "../editor/model";
import { EditorHandleRef, applyEditorDrag, editorHandles, pickEditorHandle, selectAt } from "../editor/interaction";

const TRAIL = 0.35;
const HANDLE_PX = 22;   // 44 px CSS średnicy — minimalny cel dotykowy
const TOAST_S = 2.5;    // jak długo wisi komunikat na dole ekranu

/** Sekcje zakładki „Społeczność" w kolejności rysowania. */
const COMMUNITY_SECTIONS = ["katalog", "moje", "linki"] as const;
type CommunitySection = (typeof COMMUNITY_SECTIONS)[number];

/** Kafelki okna „Dodaj" — w tej samej kolejności co `addSheetLayout`. */
const PIECE_KINDS: { kind: PieceKind; label: string }[] = [
  { kind: "elipsa", label: "Elipsa" }, { kind: "parabola", label: "Parabola" },
  { kind: "hiperbola", label: "Hiperbola" }, { kind: "odcinek", label: "Lustro" },
];
const OBSTACLE_KINDS: { kind: ObstacleKind; label: string }[] = [
  { kind: "okrag", label: "Okrąg" }, { kind: "banda", label: "Banda" }, { kind: "elipsa", label: "Elipsa" },
  { kind: "parabola", label: "Parabola" }, { kind: "hiperbola", label: "Hiperbola" },
];

/** Projekt otwarty w edytorze. `code` — zapis do pamięci (szkic albo, gdy `ready`, gotowy kod
 *  linku z rozwiązaniem autora); `testing` — poziom, który autor właśnie przechodzi. */
interface EditorSession {
  key: string;
  state: EditorState;
  ready: boolean;
  code: string;
  testing: SharedLevel | null;
  addOpen: boolean;
}

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
  let projects: Project[] = loadProjects(store);
  let editor: EditorSession | null = null;
  /** uchwyt przeciągany w edytorze; `moved` — palec ruszył się dalej niż stuknięcie */
  let editorDrag: { ref: EditorHandleRef; down: Vec2; moved: boolean } | null = null;
  const inEditor = (): boolean => editor !== null && editor.testing === null;
  const inTest = (): boolean => editor !== null && editor.testing !== null;
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
  const sectionLevels = (section: "katalog" | "linki"): Level[] => (section === "katalog" ? catalogLevels : linkLevels);

  function play(next: Playlist): void {
    // zwykła gra zamyka edytor — projekt jest już zapisany (każda zmiana zapisuje się sama)
    editor = null;
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

  /** Zapis projektu w pamięci przeglądarki — po każdej zmianie (bez przycisku „Zapisz"). */
  function saveProject(e: EditorSession): void {
    const list = upsertProject(projects, { key: e.key, code: e.code, ready: e.ready });
    if (list === null) return;
    projects = list;
    saveProjects(store, projects);
  }

  /** Zmiana treści projektu: wraca do szkicu (trzeba go przejść jeszcze raz). `save: false`
   *  w trakcie przeciągania — zapis dopiero po puszczeniu palca. Obrona w głąb: szkic, którego
   *  odczyt by nie przyjął, zmienia tylko bieżącą sesję — zapis zostaje przy poprzednim kodzie,
   *  bo `loadProjects` pominąłby zepsuty i projekt zniknąłby po odświeżeniu. */
  function editorChanged(next: EditorState, save = true): void {
    if (editor === null) return;
    const code = draftCode(next);
    if (!decodeLevel(code, { draft: true }).ok) {
      editor = { ...editor, state: next, ready: false };
      say("Tego układu nie da się zapisać");
      return;
    }
    editor = { ...editor, state: next, ready: false, code };
    if (save) saveProject(editor);
  }

  /** Samo zaznaczenie nie zmienia treści — gotowy projekt zostaje gotowy. */
  function editorSelect(next: EditorState["selected"]): void {
    if (editor !== null) editor = { ...editor, state: { ...editor.state, selected: next } };
  }

  function newProject(): void {
    menuOpen = false;
    if (projects.length >= MAX_PROJECTS) {
      say(`Najwyżej ${MAX_PROJECTS} projektów — usuń któryś`);
      return;
    }
    const state = newEditor(`Mój poziom ${projects.length + 1}`);
    editor = { key: `moj-${Date.now().toString(36)}`, state, ready: false, code: draftCode(state), testing: null, addOpen: false };
    saveProject(editor);
  }

  function openProject(p: Project): void {
    menuOpen = false;
    const d = decodeLevel(p.code, { draft: true });
    if (!d.ok) return;
    editor = { key: p.key, state: fromShared(d.level), ready: p.ready, code: p.code, testing: null, addOpen: false };
  }

  /** „Zagraj": autor przechodzi swój poziom zwykłą grą. */
  function startTest(): void {
    if (editor === null) return;
    const t = prepareTest(editor.state);
    if (!t.ok) {
      say(t.reason === "brak elementów" ? "Dodaj co najmniej jeden element gracza" : "Start już wygrywa — przestaw coś");
      return;
    }
    editor = { ...editor, testing: t.shared };
    game = newGame(t.level);
    card = null;
  }

  /** „‹" i „Edytuj": powrót do edytora. Trwający dowód gry testowej zostaje przerwany — inaczej
   *  dokończyłby się później jako zwykła gra i zaliczył poziom „edytor" w postępie. */
  const backToEditor = (): void => {
    if (editor === null) return;
    editor = { ...editor, testing: null };
    if (game.phase === "dowod") game = retry(game);
  };

  /** Autor wygrał: zaokrąglone ustawienie przechodzi dowód jeszcze raz i staje się rozwiązaniem. */
  function acceptAuthorWin(): void {
    if (editor === null || editor.testing === null) return;
    const r = acceptWin(editor.testing, game.pieces);
    if (!r.ok) {
      say(r.reason === "nie wygrywa"
        ? "Za blisko krawędzi — spróbuj jeszcze raz"
        : "Tego ustawienia nie da się zapisać — przestaw coś i spróbuj jeszcze raz");
      game = retry(game);
      return;
    }
    editor = { ...editor, ready: true, code: r.code };
    saveProject(editor);
    say("Przeszedłeś swój poziom — możesz go udostępnić");
  }

  /** Akcje dolnego pasa edytora (`EDITOR_ACTIONS`). */
  function editorAction(i: number): void {
    if (editor === null) return;
    const st = editor.state;
    if (i === 0) {
      editor = { ...editor, addOpen: true };
    } else if (i === 1) {
      if (st.selected !== null) editorChanged(removeSelected(st));
      else if (window.confirm(`Usunąć cały projekt „${st.title}"?`)) {
        projects = removeProject(projects, editor.key);
        saveProjects(store, projects);
        editor = null;
        // pod edytorem mógł zostać poziom gry testowej usuniętego projektu — po zamknięciu menu
        // gracz zobaczyłby go jako zwykły poziom; wracamy do bieżącej listy
        game = newGame(current(playlist));
        menuOpen = true;
        menuTab = "spolecznosc";
      }
    } else if (i === 2) {
      if (canToggleArc(st)) editorChanged(toggleArc(st));
    } else if (i === 3) {
      editorChanged(cycleShot(st));
    } else if (editor.ready) {
      share();
    } else {
      startTest();
    }
  }

  // ── „Udostępnij": okienko z tytułem (HTML nad płótnem — działa klawiatura telefonu) ──────
  const shareDialog = document.getElementById("udostepnij");
  const titleInput = document.getElementById("tytul");

  function share(): void {
    if (editor === null || !editor.ready) return;
    if (!(shareDialog instanceof HTMLDialogElement) || !(titleInput instanceof HTMLInputElement)) return;
    titleInput.value = editor.state.title;
    shareDialog.returnValue = "";
    shareDialog.showModal();
  }

  /** Okienko zamknięte: przy „Udostępnij" — nowy tytuł do kodu (dowodu to nie zmienia), zapis
   *  projektu i link do systemowego udostępniania albo do schowka. */
  function finishShare(): void {
    if (editor === null || !(shareDialog instanceof HTMLDialogElement) || !(titleInput instanceof HTMLInputElement)) return;
    if (shareDialog.returnValue !== "ok") return;
    const typed = [...cleanTitle(titleInput.value)].slice(0, MAX_TITLE).join("");
    const title = typed.length > 0 ? typed : editor.state.title;
    const d = decodeLevel(editor.code);
    if (!d.ok) return;
    const code = encodeLevel({ ...d.level, title });
    editor = { ...editor, code, state: { ...editor.state, title } };
    saveProject(editor);
    const link = linkFor(window.location.origin + window.location.pathname, code);
    if (typeof navigator.share === "function") {
      navigator.share({ title, url: link }).catch((e: unknown) => {
        // „AbortError" — gracz zamknął okno udostępniania; inny błąd (np. przeglądarka odmówiła)
        // — link i tak musi do niego trafić, więc schowek albo okienko z linkiem
        if (typeof e === "object" && e !== null && "name" in e && e.name === "AbortError") return;
        copyLink(link);
      });
    } else {
      copyLink(link);
    }
  }

  /** Link do schowka, a gdy schowka nie ma albo odmówi — okienko z linkiem do skopiowania. */
  function copyLink(link: string): void {
    if (navigator.clipboard !== undefined) {
      navigator.clipboard.writeText(link).then(() => say("Skopiowano link"), () => window.prompt("Skopiuj link:", link));
    } else {
      window.prompt("Skopiuj link:", link);
    }
  }
  if (shareDialog instanceof HTMLDialogElement) shareDialog.addEventListener("close", finishShare);

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

  /** „?" jest rysowane i dotykalne tylko poza menu, ustawieniami, dowodem (wtedy napis
   *  „Poziom N / M" obok niego też nie jest rysowany) i ekranem edytora — edytor ma napis
   *  „Edytor", ale nie ma planszy z zasadą. W grze testowej autora „?" jest. */
  const helpVisible = (): boolean => !menuOpen && !settingsOpen && game.phase !== "dowod" && !inEditor();

  /** „?" — plansza mechaniki bieżącego poziomu. Dowód nie może trwać, gdy „?" jest
   *  dotykalne (patrz `helpVisible`), więc nie ma czego przerywać. */
  function openHelp(): void {
    // w grze testowej autora — plansza według mechaniki, jak dla poziomów społeczności
    card = (inTest() ? mechanicCard(game.level) : helpCard(playlist)) ?? null;
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
    if (hitRect(MENU_BUTTON, p) && inTest() && !menuOpen && !settingsOpen) {
      // w grze testowej przycisk w lewym górnym rogu to „‹" — powrót do edytora
      backToEditor();
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
    if (editor !== null && editor.testing === null) {
      editorDown(e, p);
      consumedReset = true;
      return;
    }
    if (game.phase === "wygrana" && inTest()) {
      // wygrana autora: „Edytuj" wraca do edytora, prawa połowa udostępnia
      const action = winAction(p, viewW(), viewH(), true);
      if (action === "powtorz") backToEditor();
      else if (action !== null) share();
      consumedReset = true;
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

  const countOf = (sec: CommunitySection): number => (sec === "moje" ? projects.length + 1 : sectionLevels(sec).length);
  const communityCounts = (): number[] => COMMUNITY_SECTIONS.map(countOf);

  /** Dotknięcie w edytorze: okno „Dodaj", dolny pas, uchwyt (przeciąganie albo stuknięcie —
   *  rozstrzyga `pointerup`) albo zaznaczenie krzywej. */
  function editorDown(e: PointerEvent, p: Vec2): void {
    if (editor === null) return;
    const w = viewW();
    const h = viewH();
    if (editor.addOpen) {
      const sheet = addSheetLayout(w, h);
      const i = sheet.players.findIndex((r) => hitRect(r, p));
      const j = sheet.fixed.findIndex((r) => hitRect(r, p));
      const st = editor.state;
      editor = { ...editor, addOpen: false };
      if (i >= 0 && canAddPiece(st)) editorChanged(addPiece(st, PIECE_KINDS[i].kind));
      if (j >= 0 && canAddObstacle(st)) editorChanged(addObstacle(st, OBSTACLE_KINDS[j].kind));
      return;
    }
    const bar = editorBarHit(p, w, h);
    if (bar !== null) {
      editorAction(bar);
      return;
    }
    const world = toWorld(e);
    const radius = (HANDLE_PX * 1.5) / cam().scale;
    const ref = pickEditorHandle(editor.state, world, radius);
    if (ref !== null) {
      editorDrag = { ref, down: p, moved: false };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    editorSelect(selectAt(editor.state, world, radius));
  }

  /** Puszczenie uchwytu: po przeciągnięciu — zapis; po stuknięciu — zaznaczenie właściciela
   *  uchwytu, a stuknięcie w uchwyt JUŻ zaznaczonego elementu gracza przełącza jego blokadę. */
  function editorUp(): void {
    const drag = editorDrag;
    // zerowane przed każdym wyjściem: link otwarty w trakcie przeciągania (`hashchange`) zamyka
    // edytor, a pozostawione `editorDrag` przechwytywałoby potem każde puszczenie palca
    editorDrag = null;
    if (editor === null || drag === null) return;
    const { ref, moved } = drag;
    if (moved) {
      saveProject(editor);
      return;
    }
    const sel = editor.state.selected;
    if (ref.target === "element") {
      if (sel !== null && sel.kind === "element" && sel.index === ref.index) {
        editorChanged(toggleLock(editor.state, ref.index, ref.id));
      } else {
        editorSelect({ kind: "element", index: ref.index });
      }
    } else if (ref.target === "przeszkoda") {
      editorSelect({ kind: "przeszkoda", index: ref.index });
    }
  }

  canvas.addEventListener("pointermove", (e) => {
    if (editorDrag !== null && editor !== null) {
      const sp = toScreenPoint(e);
      if (!editorDrag.moved && isTap(editorDrag.down, sp)) return;
      editorDrag = { ...editorDrag, moved: true };
      editorChanged(applyEditorDrag(editor.state, editorDrag.ref, toWorld(e), SNAP_RADIUS), false);
      return;
    }
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

  const endDrag = (): void => { dragging = null; pointer = null; listPointer = null; editorDrag = null; };
  canvas.addEventListener("pointercancel", () => {
    // przerwane przeciąganie w edytorze: sesja trzyma już przesunięty stan, więc zapisujemy go
    if (editorDrag !== null && editorDrag.moved && editor !== null) saveProject(editor);
    endDrag();
  });

  /** Stuknięcie w listę społeczności: kafelek otwiera poziom swojej sekcji (w „Twoich
   *  poziomach" — edytor albo nowy projekt), tło zamyka menu. */
  function tapCommunity(p: Vec2): void {
    const hit = hitCommunity(communityLayout(viewW(), viewH(), communityCounts(), communityScroll), p);
    menuOpen = false;
    if (hit === null) return;
    const section = COMMUNITY_SECTIONS[hit.section];
    if (section === "moje") {
      if (hit.index === 0) newProject();
      else openProject(projects[hit.index - 1]);
      return;
    }
    play({ section, levels: sectionLevels(section), index: hit.index });
  }

  // JEDEN listener, nie dwa. Osobny `endDrag` zarejestrowany wcześniej wyzerowałby
  // `dragging`, ZANIM drugi listener zdążyłby sprawdzić, czy właśnie trwało przeciąganie
  // — więc puszczenie uchwytu w dolnym pasie ekranu uruchamiałoby dowód wbrew graczowi
  // i kasowało jego niedokończoną edycję. W pionie geometria kamery przypadkiem chroni
  // przed tym (plansza nie sięga pasa przycisku), ale nic nie wymusza pionu.
  canvas.addEventListener("pointerup", (e) => {
    if (editorDrag !== null) {
      editorUp();
      consumedReset = false;
      return;
    }
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
    // pod ekranem edytora gra stoi — `game` to tam najwyżej porzucony poziom testowy
    if (!menuOpen && !settingsOpen && card === null && !inEditor()) {
      const before = game.phase;
      game = advance(game, dt);
      if (before === "dowod" && game.phase === "wygrana") {
        if (inTest()) acceptAuthorWin();
        else {
          progress = markSolved(progress, game.level.id);
          saveProgress(store, progress);
        }
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

    if (editor !== null && editor.testing === null) {
      drawEditor(editor);
      if (menuOpen) drawMenu();
      if (settingsOpen) drawSettings();
      drawMenuButton();
      drawSettingsButton();
      if (toast !== null && time < toast.until) drawToast(toast.text);
      return;
    }

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
      if (game.phase === "wygrana" && inTest()) {
        for (const b of game.proof.balls) {
          glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
        }
        banner(resultBanner(game.proof.balls.length, 0).title, "", ["Edytuj", "Udostępnij"]);
      } else if (game.phase === "wygrana") {
        for (const b of game.proof.balls) {
          glowPolyline(ctx, c, b.path, "rgba(253,230,138,0.35)", PALETTE.trailGlow, 1);
        }
        // pod tytułem tylko dopisek ostatniego poziomu; na pozostałych — nic
        // „wszystkie ukończone" tylko dla listy twórców — to ona jest kompletem gry; listy społeczności rosną
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
      // komunikat nad planszą — np. o złym linku u kogoś, kto wchodzi pierwszy raz i widzi zasadę
      if (toast !== null && time < toast.until) drawToast(toast.text);
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
      ctx.fillText(topLabel(), w / 2, 22);
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

    /** Pierwsza linia banera: numer albo „Społeczność", w edytorze „Edytor", w grze autora „Test". */
    function topLabel(): string {
      if (editor === null) return bannerLabel(playlist);
      return editor.testing === null ? "Edytor" : "Test";
    }

    function drawMenuButton(): void {
      const b = MENU_BUTTON;
      if (inTest() && !menuOpen && !settingsOpen) {
        // „‹" — w grze testowej ten przycisk wraca do edytora
        ctx.strokeStyle = PALETTE.text;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2 + 5, b.y + b.h / 2 - 10);
        ctx.lineTo(b.x + b.w / 2 - 5, b.y + b.h / 2);
        ctx.lineTo(b.x + b.w / 2 + 5, b.y + b.h / 2 + 10);
        ctx.stroke();
        return;
      }
      ctx.fillStyle = menuOpen ? PALETTE.curve : PALETTE.text;
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 + i * 6 - 1, 20, 2);
      }
    }

    /** „?" w kółku tuż za napisem „Poziom N / M" (ten sam wiersz, `helpButton` obejmuje oba).
     *  Kółko liniami i „?" znakiem ASCII — nie polegamy na glifie ⓘ w czcionce telefonu. */
    function drawHelpButton(): void {
      ctx.font = "12px system-ui, sans-serif";
      const tw = ctx.measureText(topLabel()).width;
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

    /** Edytor: strzał, przeszkody, elementy gracza (zaznaczony z szerszą poświatą), piłka, dołek,
     *  wszystkie uchwyty (zablokowany uchwyt elementu ma pełną kropkę w środku), baner
     *  z podpowiedzią, dolny pas i okno „Dodaj". */
    function drawEditor(ed: EditorSession): void {
      const st = ed.state;
      const w = viewW();
      const h = viewH();
      if (st.shot.kind === "wachlarz") {
        sectorWedge(ctx, c, st.ball, { center: st.shot.center, width: st.shot.width }, SECTOR_REACH, PALETTE.sector);
      } else if (st.shot.kind === "jedna") {
        for (const linia of shotArrow(st.ball, st.shot.center, SECTOR_REACH)) {
          glowPolyline(ctx, c, linia, PALETTE.shot, "rgba(0,0,0,0)", 1.5);
        }
      }
      const sel = st.selected;
      const drawShape = (shape: Shape, owner: "gracz" | "staly", selected: boolean) => {
        const style = shapeStyle(shape, owner);
        if (shape.kind === "parabola") dashedPolyline(ctx, c, parabolaAxis(shape), style.line, 1);
        drawPiece(ctx, c, shapeToPiece(shape), style.line, selected ? "rgba(248,250,252,0.22)" : style.glow, selected ? 3 : 2);
      };
      st.obstacles.forEach((o, i) => drawShape(o, "staly", sel !== null && sel.kind === "przeszkoda" && sel.index === i));
      st.pieces.forEach((q, i) => drawShape(q.shape, "gracz", sel !== null && sel.kind === "element" && sel.index === i));
      holeMark(ctx, c, st.hole, PALETTE.hole, PALETTE.holeGlow, PALETTE.holeInside, 9);
      glowDot(ctx, c, st.ball, PALETTE.ball, PALETTE.ballGlow, 6);
      for (const hnd of editorHandles(st)) {
        const ref = hnd.ref;
        if (ref.target === "element") {
          const piece = st.pieces[ref.index];
          const style = shapeStyle(piece.shape, "gracz");
          handleShape(ctx, c, hnd.pos, handleMark(ref.id), style.line, style.glow, 11);
          if (piece.locked.includes(ref.id)) glowDot(ctx, c, hnd.pos, style.line, "rgba(0,0,0,0)", 4);
        } else if (ref.target === "przeszkoda") {
          const style = shapeStyle(st.obstacles[ref.index], "staly");
          handleShape(ctx, c, hnd.pos, handleMark(ref.id), style.line, "rgba(0,0,0,0)", 9);
        } else {
          handleShape(ctx, c, hnd.pos, "kwadrat", PALETTE.muted, "rgba(0,0,0,0)", 9);
        }
      }
      const hint = sel === null ? "Stuknij krzywą, żeby ją zaznaczyć. Uchwyty przeciągaj."
        : sel.kind === "element" ? "Stuknij uchwyt zaznaczonego elementu, żeby go zablokować graczowi."
        : "Zaznaczona przeszkoda: przeciągaj jej uchwyty albo ją usuń.";
      banner(st.title, hint, ["", ""]);
      // dolny pas: pięć przycisków; nieaktywne przygaszone
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, h * ACTION_BAND, w, h * (1 - ACTION_BAND));
      const enabled = [canAddPiece(st) || canAddObstacle(st), true, canToggleArc(st), true, true];
      editorBar(w, h).forEach((r, i) => {
        const label = i === EDITOR_ACTIONS.length - 1 && ed.ready ? "Udostępnij" : EDITOR_ACTIONS[i];
        ctx.textAlign = "center";
        // „Udostępnij" przy 14 px nie mieści się w polu 64 px (320 px szerokości) — zmniejszamy czcionkę
        const size = [14, 13, 12, 11].find((sz) => {
          ctx.font = `600 ${sz}px system-ui, sans-serif`;
          return measure(label) <= r.w - 6;
        }) ?? 11;
        ctx.font = `600 ${size}px system-ui, sans-serif`;
        ctx.fillStyle = !enabled[i] ? PALETTE.muted : i === EDITOR_ACTIONS.length - 1 ? PALETTE.curve : PALETTE.text;
        ctx.fillText(label, r.x + r.w / 2, h * 0.93);
      });
      ctx.textAlign = "left";
      if (ed.addOpen) drawAddSheet(st);
    }

    function drawAddSheet(st: EditorState): void {
      const w = viewW();
      const h = viewH();
      ctx.fillStyle = PALETTE.overlay;
      ctx.fillRect(0, 0, w, h);
      const { players, fixed } = addSheetLayout(w, h);
      const rows = [
        { title: "Twoje — tym rusza gracz", rects: players, labels: PIECE_KINDS.map((k) => k.label), on: canAddPiece(st) },
        { title: "Stałe", rects: fixed, labels: OBSTACLE_KINDS.map((k) => k.label), on: canAddObstacle(st) },
      ];
      for (const row of rows) {
        ctx.textAlign = "left";
        ctx.font = "600 14px system-ui, sans-serif";
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(row.title, row.rects[0].x, row.rects[0].y - 10);
        row.rects.forEach((r, i) => {
          ctx.beginPath();
          ctx.roundRect(r.x, r.y, r.w, r.h, 10);
          ctx.fillStyle = PALETTE.tile;
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = PALETTE.tileEdge;
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.font = "11px system-ui, sans-serif";
          ctx.fillStyle = row.on ? PALETTE.text : PALETTE.muted;
          ctx.fillText(row.labels[i], r.x + r.w / 2, r.y + r.h / 2 + 4);
        });
      }
      ctx.textAlign = "center";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText("Stuknij obok, żeby zamknąć.", w / 2, fixed[0].y + fixed[0].h + 32);
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
      const titles = { katalog: "Katalog", moje: "Twoje poziomy", linki: "Z linków" };
      const empty = {
        katalog: "Na razie pusto — przyślij twórcy link do swojego poziomu.",
        moje: "",
        linki: "Tu trafią poziomy otwarte z linków.",
      };
      for (const head of layout.headers) {
        const section = COMMUNITY_SECTIONS[head.section];
        ctx.textAlign = "left";
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.fillStyle = PALETTE.text;
        ctx.fillText(titles[section], 16, head.y + 22);
        if (countOf(section) === 0) {
          ctx.font = "13px system-ui, sans-serif";
          ctx.fillStyle = PALETTE.muted;
          wrapByWords(empty[section], viewW() - 32, measure)
            .forEach((line, j) => ctx.fillText(line, 16, head.y + SECTION_HEADER_H + 24 + j * 16));
        }
      }
      for (const t of layout.tiles) {
        const section = COMMUNITY_SECTIONS[t.section];
        const r = t.rect;
        if (section === "moje") {
          drawProjectTile(r, t.index);
          continue;
        }
        const lvl = sectionLevels(section)[t.index];
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

    /** Kafelek „Twoich poziomów": pierwszy to „+ Nowy poziom", reszta — projekty ze stanem. */
    function drawProjectTile(r: { x: number; y: number; w: number; h: number }, index: number): void {
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 10);
      ctx.fillStyle = PALETTE.tile;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = PALETTE.tileEdge;
      ctx.stroke();
      ctx.textAlign = "left";
      if (index === 0) {
        ctx.font = "600 15px system-ui, sans-serif";
        ctx.fillStyle = PALETTE.curve;
        ctx.fillText("+ Nowy poziom", r.x + 12, r.y + r.h / 2 + 5);
        return;
      }
      const p = projects[index - 1];
      const d = decodeLevel(p.code, { draft: true });
      ctx.fillStyle = PALETTE.text;
      const title = tileTitle(d.ok ? d.level.title : "?", r.w - 24, (size) => {
        ctx.font = `600 ${size + 1}px system-ui, sans-serif`;
        return measure;
      }, 2);
      ctx.font = `600 ${title.size + 1}px system-ui, sans-serif`;
      title.lines.forEach((line, j) => ctx.fillText(line, r.x + 12, r.y + 24 + j * 17));
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = p.ready ? PALETTE.curve : PALETTE.muted;
      ctx.fillText(p.ready ? "gotowy" : "szkic", r.x + 12, r.y + r.h - 12);
    }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("hashchange", openFromHash);
  resize();
  openFromHash();
  requestAnimationFrame(frame);
}
