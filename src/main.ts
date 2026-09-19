import { mount } from "./ui/screens";

const canvas = document.getElementById("plansza") as HTMLCanvasElement;
mount(canvas);

// Tylko w wersji zbudowanej. Service worker podaje zasoby z pamięci podręcznej, zakładając,
// że ich nazwy mają hash — a serwer deweloperski serwuje `/src/…` pod stałymi adresami,
// więc po pierwszym wejściu przeglądarka pokazywałaby stary kod mimo zmian w plikach.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
