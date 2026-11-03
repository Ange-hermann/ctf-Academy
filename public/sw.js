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

/* ── Notifications push ────────────────────────────────────────────────
   Reçoit les payloads du serveur ({ title, body, href }) et affiche une
   notification système — reçue même application fermée, sur téléphone
   comme sur ordinateur, selon les souscriptions enregistrées. Le son et la
   vibration dépendent des réglages du navigateur / de l'appareil. */
self.addEventListener("push", (event) => {
  let data = { title: "CTF ACADEMY", body: "", href: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload illisible : valeurs par défaut */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [80, 40, 80],
      data: { href: data.href || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";
  const url = new URL(href, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then((c) => (c && "navigate" in c ? c.navigate(url) : c));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
