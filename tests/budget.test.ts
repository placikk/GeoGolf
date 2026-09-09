import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const LIMIT = 100 * 1024;

describe("budżet paczki", () => {
  it("zbudowana paczka mieści się poniżej 100 KB po gzipie", () => {
    execSync("npm run build", { stdio: "pipe" });
    const dir = "dist/assets";
    const total = readdirSync(dir)
      .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
      .reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(LIMIT);
  }, 120_000);
});
