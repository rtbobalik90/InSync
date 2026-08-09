/* Network-first for the app's own code so updates land; cache-first for artwork. */
var CACHE = 'insync-v7-1';
var SHELL = [
  './', 'index.html', 'styles.css',
  /* Every script index.html loads — a missing one here is a screen that cannot
     open on a phone with no signal. */
  'store.js', 'cloud.js', 'ui.js', 'media.js', 'exercises.js', 'foods.js',
  'badges.js', 'screens.js', 'onboarding.js', 'log.js', 'app.js',
  'manifest.webmanifest',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png',
  'assets/insync-icon.png',
  'assets/art/camp-dawn.jpg', 'assets/art/camp-day.jpg',
  'assets/art/camp-sunset.jpg', 'assets/art/camp-night.jpg',
  'assets/art/onboarding-welcome.png', 'assets/art/expedition-none.png',
  'assets/art/expedition-overlook.png', 'assets/art/campfire.png',
  'assets/art/dispatch-day.png', 'assets/art/provisions.png',
  'assets/art/coach-desk.jpg', 'assets/art/meal-example.jpg', 'assets/art/train-banner.png'
];

// Anything that is code gets revalidated; artwork never changes, so it is cached hard.
var CODE = /\.(html|js|css|webmanifest)$|\/$/;

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
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (CODE.test(url.pathname)) {
    // Network first: the newest code wins, the cache is the offline fallback.
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
