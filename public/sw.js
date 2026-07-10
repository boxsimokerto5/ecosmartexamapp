const CACHE_NAME = 'eco-smart-exam-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/pwa_icon.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.error(`Failed to cache asset ${asset}:`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass service worker cache for external APIs / databases (e.g. Firestore, Firebase Auth, Google APIs)
  if (
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('firebaseapp.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firebase')
  ) {
    return;
  }

  const isHtmlRequest = event.request.mode === 'navigate' || 
                        event.request.headers.get('accept')?.includes('text/html') ||
                        url.pathname === '/' ||
                        url.pathname === '/index.html';

  if (isHtmlRequest) {
    // Network First strategy for HTML to prevent 404/stale hashed asset references
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/', responseToCache).catch((err) => console.warn('Failed to cache root:', err));
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match('/').then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stale-While-Revalidate for other assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request.url, responseToCache).catch((err) => console.warn('Failed to bg cache:', err));
            });
          }
        }).catch(() => {/* Ignore network error */});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request.url, responseToCache).catch((err) => console.warn('Failed to cache:', err));
        });

        return networkResponse;
      });
    })
  );
});
