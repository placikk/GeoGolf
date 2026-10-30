import { Level } from "../levels/types";
import { COMMUNITY, CommunityEntry } from "../levels/community";
import { openCode } from "./verify";

export interface CatalogLevel { level: Level; code: string; author: string }

/** Katalog jako grywalne poziomy. Wpis, który się nie otwiera, w grze po prostu się nie
 *  pokazuje — ale testy katalogu go nie przepuszczą, więc do wydania nie dochodzi. */
export function loadCatalog(entries: readonly CommunityEntry[] = COMMUNITY): CatalogLevel[] {
  const out: CatalogLevel[] = [];
  for (const e of entries) {
    const o = openCode(e.link);
    if (o.ok) out.push({ level: o.level, code: o.code, author: e.author });
  }
  return out;
}
