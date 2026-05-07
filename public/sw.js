/* StrainSpotter service worker — May 2026 */
/* eslint-disable no-restricted-globals */

const SW_VERSION = "ss-v1.0.0-beta";
const STATIC_CACHE = `${SW_VERSION}-static`;

// Pre-cache the bare-minimum shell. Everything else is cached on-demand
// the first time it loads (network-first for navigations).
const PRECACHE_URLS = [
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icons/app/icon-180.png",
  "/icons/app/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // Drop any old caches from prior versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(SW_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* Strategy:
 *
 *   - API requests (/api/*) → network only. Never cache; these are
 *     authenticated and time-sensitive.
 *   - Same-origin GET navigations / static assets → network-first with
 *     cache fallback. So a user with a poor connection still gets the
 *     last-good page rather than a Chrome dino.
 *   - Cross-origin → pass through, no caching.
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses.
  if (url.pathname.startsWith("/api/")) return;

  // Don't cache server-action and Next data manifests.
  if (url.pathname.startsWith("/_next/data/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Only cache successful basic responses.
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          // Offline + nothing cached: fail silently with a generic 503.
          return new Response("Offline", { status: 503, statusText: "Offline" });
        })
      )
  );
});
