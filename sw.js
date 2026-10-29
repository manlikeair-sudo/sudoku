/* 오프라인용 서비스 워커: 앱 파일을 캐시해 두고 네트워크 없이도 열리게 합니다. */
var CACHE = 'sudoku-v1';
var FILES = [
  './', './index.html', './style.css', './engine.js', './game.js', './app.js',
  './manifest.json', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 캐시 우선 + 백그라운드 갱신 (다음 실행 때 새 버전 반영)
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net.then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});
