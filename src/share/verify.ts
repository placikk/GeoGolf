import { runProof } from "../core/verify";
import { HOLE_RADIUS, Level, MovableShape } from "../levels/types";
import { levelCurves, shapeAxisAngle } from "../levels/shape";
import { SharedLevel, SharedShot, decodeLevel, encodeLevel } from "./codec";

/** Parametry dowodu wynikające z rodzaju strzału — te same co w poziomach twórców:
 *  wachlarz i 360° jak etapy 1–3, jedna piłka jak etap 0 (większy dołek, mniej odbić). */
export function sharedTest(shot: SharedShot): Level["test"] {
  return shot.kind === "jedna"
    ? { balls: 1, maxBounces: 3, holeRadius: 1.5 * HOLE_RADIUS }
    : { balls: 8, maxBounces: 4, holeRadius: HOLE_RADIUS };
}

const sharedSector = (shot: SharedShot): Level["sector"] =>
  shot.kind === "360" ? undefined
  : shot.kind === "jedna" ? { center: shot.center, width: 0 }
  : { center: shot.center, width: shot.width };

/** Poziom gracza jako zwykły `Level` — gra, menu i postęp nie odróżniają go od poziomów twórców. */
export function sharedToLevel(l: SharedLevel, id: string): Level {
  return {
    id, title: l.title, hint: "", ball: l.ball, hole: l.hole,
    pieces: l.pieces, obstacles: l.obstacles,
    sector: sharedSector(l.shot), test: sharedTest(l.shot),
  };
}

/** Ten sam dowód co w grze (`src/ui/game.ts`): oś pierwszego elementu jako baza strzału 360°.
 *  Kształt, którego nie da się zbudować, nie rozwiązuje niczego (zamiast rzucać). */
export function solvesLevel(level: Level, pieces: MovableShape[]): boolean {
  try {
    return runProof({
      ball: level.ball, hole: level.hole,
      holeRadius: level.test.holeRadius, maxBounces: level.test.maxBounces,
      curves: levelCurves(level, pieces),
      baseAngle: shapeAxisAngle(pieces[0]),
      sector: level.sector, count: level.test.balls,
    }).solved;
  } catch {
    return false;
  }
}

export type Verdict = { ok: true } | { ok: false; reason: string };

/** „Działający poziom": rozwiązanie autora wygrywa, a stan startowy nie. Ta sama funkcja dla
 *  edytora (przed „Udostępnij"), dla otwieranego linku i dla katalogu w testach. */
export function verifyShared(l: SharedLevel): Verdict {
  const level = sharedToLevel(l, "sprawdzany");
  if (!solvesLevel(level, l.pieces.map((p) => p.solution))) return { ok: false, reason: "rozwiązanie nie wygrywa" };
  if (solvesLevel(level, l.pieces.map((p) => p.start))) return { ok: false, reason: "start już wygrywa" };
  return { ok: true };
}

/** FNV-1a 32 bity: krótki, deterministyczny skrót kodu. Identyfikator trzyma postęp (`solved`),
 *  usuwa powtórzone linki (`src/ui/collections.ts`) i rozpoznaje link do poziomu z katalogu
 *  (`openFromHash`). Kolizja przy kilkudziesięciu poziomach jest bardzo mało prawdopodobna,
 *  a w najgorszym razie połączy postęp dwóch poziomów, odrzuci jeden z linków jako duplikat
 *  albo zamiast poziomu z linku otworzy poziom z katalogu — widoczny błąd, ale niczego nie psuje. */
export function levelId(code: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `spol-${h.toString(16).padStart(8, "0")}`;
}

const HASH_KEY = "#poziom=";

/** Link do poziomu pod podanym adresem gry (bez końcówki `#…`). */
export const linkFor = (base: string, code: string): string => `${base}${HASH_KEY}${code}`;

/** Kod poziomu z końcówki adresu (`location.hash`) albo `null`. Kod to najdłuższy przedrostek
 *  ze znaków base64url po `#poziom=` — link wklejony razem z kropką czy nawiasem z końca zdania
 *  dalej działa. Pusty przedrostek — `null`. */
export function codeFromHash(hash: string): string | null {
  if (!hash.startsWith(HASH_KEY)) return null;
  const m = /^[A-Za-z0-9_-]*/.exec(hash.slice(HASH_KEY.length));
  const code = m === null ? "" : m[0];
  return code.length > 0 ? code : null;
}

export type Opened =
  | { ok: true; code: string; shared: SharedLevel; level: Level }
  | { ok: false; reason: string };

/** Kod z linku albo z katalogu → grywalny poziom. Odkodowanie, walidacja, dowód; identyfikator
 *  z kodu PO ponownym zakodowaniu, więc ten sam poziom ma zawsze ten sam identyfikator. */
export function openCode(code: string): Opened {
  const d = decodeLevel(code);
  if (!d.ok) return d;
  const v = verifyShared(d.level);
  if (!v.ok) return v;
  const canonical = encodeLevel(d.level);
  return { ok: true, code: canonical, shared: d.level, level: sharedToLevel(d.level, levelId(canonical)) };
}
