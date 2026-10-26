const CACHE = "golf-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"])));
});

// Wszystkie adresy są względne (`./`), więc gra działa i pod `/`, i pod `/GeoGolf/`
// na GitHub Pages; zasięg workera to katalog, z którego go zarejestrowano.
// Na github.io wszystkie projekty jednego konta dzielą pochodzenie, a więc i `caches` —
// kasujemy tylko własne, starsze wersje (`golf-…`), nigdy pamięci cudzych stron.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("golf-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Dokument nawigacji: najpierw sieć, cache jako zapas. Dzięki temu nowa wersja
  // dociera do gracza przy pierwszym wejściu online, zamiast czekać w nieskończoność.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((hit) => hit ?? caches.match("./index.html")).then((hit) => hit ?? Response.error())));
    return;
  }

  // Zasoby mają nazwy z haszem, więc cache-first jest bezpieczny.
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ?? fetch(e.request).then((res) => {
        if (!res.ok) return res;
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }),
    ),
  );
});
