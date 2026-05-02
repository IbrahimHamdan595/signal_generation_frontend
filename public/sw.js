// Signal PWA Service Worker
// Bump CACHE_NAME whenever shipping changes that touch routing/UI shell, so
// returning users discard the old cache on activate.
const CACHE_NAME = "signal-v2";

self.addEventListener("install", () => {
  // No precache list — pre-caching specific routes locks the user to whatever
  // the nav looked like at install time (this is what hid Portfolio/Trading/
  // Pipeline from the sidebar after they were added). Let the runtime cache
  // populate naturally instead.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API: always network, no caching.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Navigations + JS/CSS: network-first so updated bundles ship immediately;
  // fall back to cache when offline.
  const isAsset = /\.(js|css|mjs)$/.test(url.pathname);
  if (req.mode === "navigate" || isAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Other static assets (images/fonts/etc.): cache-first.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
    )
  );
});
