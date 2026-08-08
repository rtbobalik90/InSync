/* Cache-first for the shell, network-first for everything else. */
var CACHE = 'insync-v5-1';
var SHELL = [
  './', 'index.html', 'styles.css', 'store.js', 'ui.js', 'screens.js', 'app.js',
  'manifest.webmanifest',
  'assets/art/camp-dawn.jpg', 'assets/art/camp-day.jpg',
  'assets/art/camp-sunset.jpg', 'assets/art/camp-night.jpg',
  'assets/art/meal-example.jpg', 'assets/art/train-banner.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(u).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return hit; });
    })
  );
});
