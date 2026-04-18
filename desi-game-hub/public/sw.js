// ── Desi Game Hub — Service Worker (cache-first PWA) ─────────────────────────
// Strategy: cache-first for all same-origin requests.
// On install: pre-cache all known assets.
// On fetch: serve from cache first; fall back to network and update cache.
// Cache is trimmed to MAX_CACHE_ENTRIES to avoid excessive storage usage.

const CACHE_NAME = "dgh-cache-v2";
const MAX_CACHE_ENTRIES = 60;

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

// ── Trim cache to MAX_CACHE_ENTRIES (evict oldest first) ─────────────────────
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (keys are ordered by insertion time)
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// ── Fetch: cache-first strategy ───────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip non-http(s) schemes (chrome-extension, etc.)
  if (!url.protocol.startsWith("http")) return;

  // Skip cross-origin requests to external CDNs/APIs that we don't control
  // (fonts, analytics, etc.) — let the browser handle those directly
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache the response
      return fetch(event.request)
        .then((response) => {
          // Only cache valid same-origin responses
          if (response.ok && response.type === "basic") {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, toCache);
              // Trim cache size after adding new entry
              trimCache(CACHE_NAME, MAX_CACHE_ENTRIES);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed and nothing in cache — return offline fallback for
          // navigate requests (HTML pages).
          if (event.request.mode === "navigate") {
            return caches.match("/") || caches.match("/index.html");
          }
          // For other resources, fail gracefully.
          return new Response("", { status: 503, statusText: "Offline" });
        });
    }),
  );
});
