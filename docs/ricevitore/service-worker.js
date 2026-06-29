'use strict';

/**
 * Service worker minimale: mette in cache lo "shell" statico della PWA
 * (HTML/CSS/JS/icona) per l'avvio offline.
 *
 * NON mette in cache /api/status: i dati di stato devono essere sempre
 * richiesti in rete (cache: no-store lato app.js). Il service worker NON
 * abilita alcun rilevamento in background: serve solo allo shell statico.
 */

const CACHE = 'pezzalisisma-shell-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon-32x32.png',
  './favicon-16x16.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './maskable-icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Non intercettare le chiamate API: sempre dalla rete.
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
