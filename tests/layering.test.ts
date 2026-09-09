import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("warstwy", () => {
  it("src/core nie importuje niczego spoza src/core", () => {
    for (const file of readdirSync("src/core")) {
      const src = readFileSync(join("src/core", file), "utf8");
      const imports = [
        ...src.matchAll(/from\s*["']([^"']+)["']/g),        // import x from "…", export … from "…"
        ...src.matchAll(/import\s*\(\s*["']([^"']+)["']/g), // import("…")
        ...src.matchAll(/import\s+["']([^"']+)["']/g),      // import "…"  (efekt uboczny)
        ...src.matchAll(/require\s*\(\s*["']([^"']+)["']/g),// require("…")
      ].map((m) => m[1]);
      for (const spec of imports) {
        expect(spec.startsWith("./"), `${file} importuje "${spec}"`).toBe(true);
      }
    }
  });
});
