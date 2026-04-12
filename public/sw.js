/**
 * Lamppost Service Worker
 *
 * Caching strategy:
 * - App shell (HTML, JS, CSS): Cache-first with network fallback
 * - API responses: Network-first with cache fallback
 * - Audio files: Cache-first (pre-generated, immutable)
 * - Fonts: Cache-first (rarely change)
 */

const CACHE_VERSION = 'lamppost-v1';
const APP_CACHE = `${CACHE_VERSION}-app`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

/** Static assets to pre-cache on install */
const PRECACHE_URLS = ['/', '/curriculum'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lamppost-') && key !== APP_CACHE && key !== AUDIO_CACHE && key !== FONT_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // Audio files: cache-first (pre-generated, immutable content)
  if (url.pathname.startsWith('/audio/') || url.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Font files: cache-first
  if (
    url.pathname.includes('/fonts/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, APP_CACHE));
    return;
  }

  // Next.js static assets: cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, APP_CACHE));
    return;
  }

  // HTML pages: network-first
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, APP_CACHE));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request, APP_CACHE));
});

/**
 * Cache-first strategy: return cached response, fall back to network.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy: try network, fall back to cache.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}
