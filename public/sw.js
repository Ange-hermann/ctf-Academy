/* Service worker CTF ACADEMY — stratégie simple :
   - précache de la page hors-ligne et des assets de marque ;
   - navigations : réseau d'abord, repli sur /hors-ligne ;
   - assets statiques : cache d'abord, réseau en secours. */
const CACHE = "ctf-academy-v1";
const OFFLINE = "/hors-ligne";
const PRECACHE = [OFFLINE, "/brand/emblem.png", "/brand/logo-full.png", "/icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE))),
    );
    return;
  }

  const url = new URL(request.url);
  if (url.origin === location.origin && (url.pathname.startsWith("/brand/") || url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.png")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
  }
});
