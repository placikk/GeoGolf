import { SharedLevel, encodeLevel } from "../../src/share/codec";

/** Pomocnicze dla testów: zapis poziomu jako obiekt JSON i z powrotem do kodu — żeby psuć
 *  pojedyncze pola, a nie tylko bajty. */
export const toWire = (l: SharedLevel): Record<string, unknown> => {
  const code = encodeLevel(l).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(code), (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

export const fromWire = (w: unknown): string => {
  let bin = "";
  for (const byte of new TextEncoder().encode(JSON.stringify(w))) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Kod z surowym tekstem JSON — dla liczb, których `JSON.stringify` nie zapisze (1e999). */
export const fromJsonText = (text: string): string => {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Deterministyczny generator liczb losowych (mulberry32) — ten sam przebieg przy każdym uruchomieniu. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
