// Visual Pi Card - Service Worker v1.1
// omendapipaysglobel.online - Offline support & caching

var CACHE_NAME = 'pivisualcard-v6';
var URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles.css',
    '/site-shell.js',
    '/icon-192.svg',
    '/shop.html',
    '/cards.html',
    '/insurance.html',
    '/ride.html',
    '/delivery.html',
    '/contracts.html',
    '/social.html'
];

// Install: cache core files
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                     .map(function(n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

// Fetch: fresh navigation with offline fallback; fast static assets with refresh
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    var requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then(function(response) {
                if (response.ok) {
                    var copy = response.clone();
                    event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
                        return cache.put(event.request, copy);
                    }));
                }
                return response;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    return cached || caches.match('/index.html');
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(cached) {
            var refresh = fetch(event.request).then(function(response) {
                if (response.ok) {
                    var copy = response.clone();
                    event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
                        return cache.put(event.request, copy);
                    }));
                }
                return response;
            });
            return cached || refresh;
        })
    );
});
