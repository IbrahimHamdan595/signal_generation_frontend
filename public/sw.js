// Signal PWA Service Worker
const CACHE_NAME = "signal-v1";
const STATIC_ASSETS = ["/", "/signals", "/market", "/model", "/watchlist"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
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
  // Network-first for API calls; cache-first for static assets
  if (event.request.url.includes("/api/")) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
