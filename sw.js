/* SIKAD App Shell Service Worker — Offline caching for core PWA assets */
const CACHE_NAME = 'sikad-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/time.js',
  './js/data.js',
  './js/parser.js',
  './js/engine.js',
  './js/store.js',
  './js/focus.js',
  './js/assistant.js',
  './js/motion.js',
  './js/app.js',
  './fonts/Inter-Variable.woff2',
  './manifest.webmanifest',
  './icons/sikad.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Do not intercept or cache external/non-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
