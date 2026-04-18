// ── Desi Game Hub — Service Worker (cache-first PWA) ─────────────────────────
// Strategy: cache-first for all requests.
// On install: pre-cache all known assets.
// On fetch: serve from cache first; fall back to network and update cache.

const CACHE_NAME = "dgh-cache-v1";

// Core assets to pre-cache on install
const PRE_CACHE_URLS = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/favicon.png",
  "/manifest.json",
];

// ── Install: pre-cache core assets ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRE_CACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: delete stale caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: cache-first strategy ───────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests; skip cross-origin requests we don't control.
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip chrome-extension and non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache the response
      return fetch(event.request)
        .then((response) => {
          // Only cache valid same-origin or CORS responses
          if (
            response.ok &&
            (response.type === "basic" || response.type === "cors")
          ) {
            const toCache = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, toCache));
          }
          return response;
        })
        .catch(() => {
          // Network failed and nothing in cache — return offline fallback for
          // navigate requests (HTML pages).
          if (event.request.mode === "navigate") {
            return caches.match("/") || caches.match("/index.html");
          }
          // For other resources, just let it fail gracefully.
          return new Response("", { status: 503, statusText: "Offline" });
        });
    }),
  );
});
