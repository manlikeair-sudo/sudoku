/* 오프라인용 서비스 워커: 앱 파일을 캐시해 두고 네트워크 없이도 열리게 합니다. */
var CACHE = 'sudoku-v2';
var FILES = [
  './', './index.html', './style.css', './engine.js', './game.js', './effects.js', './app.js',
  './manifest.json', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return Promise.all(FILES.map(function (f) { return c.add(new Request(f, { cache: 'reload' })); })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 네트워크 우선 (최대 4초) + 실패하면 캐시: 온라인이면 항상 새 버전, 오프라인이면 저장된 버전으로 열림
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    new Promise(function (resolve) {
      var done = false;
      function fromCache() {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./index.html'); });
      }
      var timer = setTimeout(function () { if (!done) fromCache().then(function (r) { if (r && !done) { done = true; resolve(r); } }); }, 4000);
      fetch(req, { cache: 'no-cache' }).then(function (res) {
        if (done) return;
        clearTimeout(timer);
        if (res && res.ok) {
          done = true;
          var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); });
          resolve(res);
        } else {
          fromCache().then(function (r) { done = true; resolve(r || res); });
        }
      }).catch(function () { clearTimeout(timer); if (!done) fromCache().then(function (r) { done = true; resolve(r || Response.error()); }); });
    })
  );
});
