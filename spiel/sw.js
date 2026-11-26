// Service Worker für die installierbare App (PWA). Wird von server.js unter /sw.js ausgeliefert, nur online (nicht im Artifact).
// Spielseite: immer zuerst vom Netz (neuster Stand, gleiche Version wie der Server); ohne Netz die zuletzt geladene Kopie (Bot-Partien gehen dann offline).
// Symbole/Manifest: aus dem Speicher, im Hintergrund aufgefrischt. /api und WebSocket laufen nie über den Speicher.
'use strict';
var SPEICHER = 'stronghold-v1';
var SEITE = '/';
var DATEIEN = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SPEICHER).then(function (c) { return c.addAll(DATEIEN); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (namen) {
    return Promise.all(namen.filter(function (n) { return n !== SPEICHER; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var url = new URL(r.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf('/api/') === 0) return;
  if (r.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(fetch(r).then(function (antwort) {
      if (antwort.ok) { var kopie = antwort.clone(); caches.open(SPEICHER).then(function (c) { c.put(SEITE, kopie); }); }
      return antwort;
    }).catch(function () { return caches.match(SEITE); }));
    return;
  }
  if (DATEIEN.indexOf(url.pathname) >= 0) {
    e.respondWith(caches.match(url.pathname).then(function (gespeichert) {
      var neu = fetch(r).then(function (antwort) {
        if (antwort.ok) { var kopie = antwort.clone(); caches.open(SPEICHER).then(function (c) { c.put(url.pathname, kopie); }); }
        return antwort;
      });
      if (gespeichert) { e.waitUntil(neu.catch(function () {})); return gespeichert; }
      return neu;
    }));
  }
});
