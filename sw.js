/* R3D Daily Review — service worker (offline shell) */
var CACHE = 'r3d-daily-v7';
var ASSETS = [
  './index.html', './review.html',
  './daily.js', './daily.css', './daily-data.js', './config.js', './scenes.js',
  './audio-manifest.js', './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
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

  var bare = url.split('?')[0];
  e.respondWith(
    caches.match(bare).then(function (c) {
      if (c) return c;
      return fetch(e.request).then(function (r) {
        var acceptHeader = e.request.headers.get('accept') || '';
        if (r.status === 200 && acceptHeader.indexOf('text/html') === -1) {
          var clone = r.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return r;
      }).catch(function () {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
