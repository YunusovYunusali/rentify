const CACHE_NAME = 'rentify-v3';
const ASSETS = [
  './',
  './index.html',
  './customer.html',
  './customer.js',
  './app.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// O'rnatish — fayllarni cache ga saqlash
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function(err) { console.warn('Cache: ' + url, err); });
      }));
    })
  );
  self.skipWaiting();
});

// Faollashtirish — eski cache ni tozalash
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// So'rovlarni ushlash — avval cache, keyin network
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).catch(function() {
        return caches.match('/index.html');
      });
    })
  );
});
