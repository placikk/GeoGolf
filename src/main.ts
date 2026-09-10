import { mount } from "./ui/screens";

const canvas = document.getElementById("plansza") as HTMLCanvasElement;
mount(canvas);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
