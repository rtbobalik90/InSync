/* InSync service worker. Code is network-first so fixes land promptly. Artwork
   is stale-while-revalidate: the cached image opens instantly, while the same
   request quietly refreshes it for the next view. */
var CACHE = 'insync-v10-11';
var SHELL = [
  './', 'index.html', 'styles.css',
  'store.js', 'cloud.js', 'ui.js', 'media.js', 'exercises.js', 'insights.js', 'foods.js',
  'badges.js', 'screens.js', 'onboarding.js', 'log.js', 'app.js',
  'manifest.webmanifest',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png',
  'assets/insync-icon.webp'
];

var CODE = /\.(html|js|css|webmanifest)$|\/$/;

self.addEventListener('install', function (e) {
  /* Core shell caching is all-or-nothing. If a deployment is incomplete, the
     new worker must fail installation so the previously working worker stays
     in control instead of activating with a broken offline shell. */
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL);
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
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { return c.put(e.request, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(function (hit) {
    var fresh = fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(e.request, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () { return hit; });
    if (hit) {
      e.waitUntil(fresh.then(function () {}));
      return hit;
    }
    return fresh;
  }));
});
