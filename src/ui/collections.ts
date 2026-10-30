import { Store } from "./progress";
import { decodeLevel } from "../share/codec";
import { levelId, openCode } from "../share/verify";

/** Poziomy zapamiętane w przeglądarce: projekty autora i poziomy otwarte z linków. Ta sama
 *  odporność co postęp — brak pamięci, wyjątki i uszkodzony zapis dają pustą listę, a każdy
 *  wpis przy odczycie przechodzi tę samą walidację co link (zapis mógł zmienić ktokolwiek). */

const LINKS_KEY = "golf-geometryczny/z-linkow";
const PROJECTS_KEY = "golf-geometryczny/moje";
export const MAX_LINKS = 30;
export const MAX_PROJECTS = 20;

function readJson(store: Store | null, key: string): unknown {
  try {
    const raw = store?.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(store: Store | null, key: string, value: unknown): void {
  try { store?.setItem(key, JSON.stringify(value)); } catch { /* bez pamięci też się gra */ }
}

// ── z linków ─────────────────────────────────────────────────────────────────────────

/** Kody poziomów otwartych z linków, od najnowszego. Zostają tylko te, które dalej
 *  przechodzą dowód — kod kanoniczny, więc ten sam poziom nie pojawi się dwa razy. */
export function loadLinks(store: Store | null): string[] {
  const raw = readJson(store, LINKS_KEY);
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const o = openCode(c);
    if (o.ok) out.push(o.code);
  }
  return dedupe(out).slice(0, MAX_LINKS);
}

const dedupe = (codes: string[]): string[] => {
  const seen = new Set<string>();
  return codes.filter((c) => {
    const id = levelId(c);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/** Dopisuje kod na początek (najnowszy pierwszy); ten sam poziom przesuwa się na początek
 *  zamiast się dublować; najstarsze wypadają za limitem. */
export const addLink = (codes: string[], code: string): string[] => dedupe([code, ...codes]).slice(0, MAX_LINKS);

export const saveLinks = (store: Store | null, codes: string[]): void => writeJson(store, LINKS_KEY, codes);

// ── projekty ─────────────────────────────────────────────────────────────────────────

/** Projekt z edytora. `code` to zapis poziomu w formacie linku (dla szkicu — z dopuszczonym
 *  brakiem elementów); `ready` — przeszedł dowód, więc `code` jest gotowym kodem do linku. */
export interface Project { key: string; code: string; ready: boolean }

/** Projekty autora. Szkic musi się odczytać jako szkic; „gotowy", który nie przechodzi już
 *  dowodu (np. ręcznie zmieniony zapis), wraca do szkicu zamiast zniknąć. */
export function loadProjects(store: Store | null): Project[] {
  const raw = readJson(store, PROJECTS_KEY);
  if (!Array.isArray(raw)) return [];
  const out: Project[] = [];
  const keys = new Set<string>();
  for (const p of raw) {
    if (typeof p !== "object" || p === null) continue;
    const key = "key" in p ? p.key : undefined;
    const code = "code" in p ? p.code : undefined;
    const ready = "ready" in p ? p.ready : undefined;
    if (typeof key !== "string" || typeof code !== "string" || keys.has(key)) continue;
    if (!decodeLevel(code, { draft: true }).ok) continue;
    keys.add(key);
    out.push({ key, code, ready: ready === true && openCode(code).ok });
  }
  return out.slice(0, MAX_PROJECTS);
}

/** Zapisuje projekt: istniejący (ten sam `key`) podmienia w miejscu, nowy dopisuje na początek.
 *  Nowy ponad limit — `null` (edytor nie pozwala wtedy założyć kolejnego). */
export function upsertProject(list: Project[], p: Project): Project[] | null {
  if (list.some((q) => q.key === p.key)) return list.map((q) => (q.key === p.key ? p : q));
  return list.length >= MAX_PROJECTS ? null : [p, ...list];
}

export const removeProject = (list: Project[], key: string): Project[] => list.filter((p) => p.key !== key);

export const saveProjects = (store: Store | null, list: Project[]): void => writeJson(store, PROJECTS_KEY, list);
