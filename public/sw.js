const CACHE_NAME = 'yt-transcripter-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.png',
  '/fonts/Mukta-Regular.ttf',
  '/fonts/Mukta-Bold.ttf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Try caching all assets, catching errors for missing assets during development
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => 
          cache.add(asset).catch(err => console.warn(`Failed to pre-cache asset: ${asset}`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip third-party, API, sw.js, or manifest.webmanifest requests from interception
  const url = new URL(event.request.url);
  if (
    !url.origin.startsWith(self.location.origin) || 
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('/sw.js') ||
    url.pathname.endsWith('/manifest.webmanifest')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached immediately, fetch fresh copy in background to update cache (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* Ignore network failures when offline */});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          // Serve cached index page if offline navigation is requested
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
