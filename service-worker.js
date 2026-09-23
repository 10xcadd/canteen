/* service-worker.js — caches the app shell so Canteen Tracker works offline.
   LocalStorage (user data) is never touched here — only static files. */

const CACHE_NAME = 'canteen-tracker-v2';

// Paths are resolved relative to the service worker's own scope, so this
// works whether the app is hosted at the domain root or under a repo path
// like https://username.github.io/repo-name/.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/utils.js',
  './js/storage.js',
  './js/state.js',
  './js/calculations.js',
  './js/ui.js',
  './js/router.js',
  './js/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((p) => new URL(p, self.registration.scope).toString())))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin requests

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached — fall back to the app shell for navigations.
          if (event.request.mode === 'navigate') {
            return caches.match(new URL('./index.html', self.registration.scope).toString());
          }
          return undefined;
        });
    })
  );
});
