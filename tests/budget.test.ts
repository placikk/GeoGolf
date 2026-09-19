import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const LIMIT = 100 * 1024;

// Vitest ustawia NODE_ENV=test, a proces potomny by je odziedziczył: Vite zbudowałby wtedy
// paczkę z `import.meta.env.PROD === false` — bez service workera. Mierzylibyśmy nie tę
// paczkę, którą dostaje gracz, i zostawiali w `dist` wersję niezdolną do pracy offline.
const build = () => execSync("npm run build", { stdio: "pipe", env: { ...process.env, NODE_ENV: "production" } });

describe("budżet paczki", () => {
  it("zbudowana paczka mieści się poniżej 100 KB po gzipie", () => {
    build();
    const dir = "dist/assets";
    const total = readdirSync(dir)
      .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
      .reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(LIMIT);
  }, 120_000);

  it("zbudowana paczka rejestruje service workera (PWA działa offline)", () => {
    build();
    const js = readdirSync("dist/assets").filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(join("dist/assets", f), "utf8")).join("");
    expect(js).toContain("serviceWorker");
    expect(js).toContain("sw.js");
  }, 120_000);
});
