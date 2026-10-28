/* R3D Daily Review — service worker (offline shell) */
var CACHE = 'r3d-daily-v6';
var ASSETS = [
  './index.html', './review.html',
  './daily.js', './daily.css', './daily-data.js', './config.js', './scenes.js',
  './audio-manifest.js', './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* a missing asset must not block activation */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.indexOf(self.location.origin) !== 0) return;

  // The pages request their assets with a ?v= cache-bust query, so a plain
  // caches.match() never hits the precache. Strip the query and match on the
  // bare path instead; fall back to the network for anything else.
  var bare = url.split('?')[0];
  e.respondWith(
    caches.match(bare).then(function (c) {
      if (c) return c;
      return fetch(e.request).then(function (r) {
        // Cache the app shell and the media files; never cache navigations.
        if (r.status === 200 && e.request.headers.get('accept').indexOf('text/html') === -1) {
          var clone = r.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return r;
      }).catch(function () {
        // offline fallback: serve the app shell for navigations
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
