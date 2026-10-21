/* R3D Daily Review — service worker (offline shell) */
var CACHE = 'r3d-daily-v1';
var ASSETS = [
  './index.html', './review.html',
  './daily.js', './daily.css', './daily-data.js',
  './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
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
  e.respondWith(
    caches.match(e.request).then(function (c) {
      if (c) return c;
      return fetch(e.request).then(function (r) {
        if (r.status === 200 && e.request.headers.get('accept').indexOf('text/html') === -1
            && e.request.url.indexOf('.mp3') === -1) {
          var clone = r.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return r;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
