import { defineConfig } from "vitest/config";

export default defineConfig({
  // Względne adresy zasobów: ta sama paczka działa pod `/` (dev, preview) i pod
  // `/GeoGolf/` (GitHub Pages) bez osobnej konfiguracji. Manifest i sw.js też są względne.
  base: "./",
  build: { target: "es2022" },
  test: { globals: true, environment: "node" },
});
