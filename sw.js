// Visual Pi Card - Service Worker v1.0
// omendapipaysglobel.online - Offline support & caching

var CACHE_NAME = 'pivisualcard-v6';
var URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/shop.html',
    '/styles.css',
    '/pi-sdk-helper.js',
    '/manifest.json',
    '/card-visa.html',
    '/card-mastercard.html',
    '/card-gold.html',
    '/card-platinum.html',
    '/card-black.html',
    '/card-amex.html'
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

// Fetch: serve static assets immediately, then refresh them in the background.
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    var requestUrl = new URL(event.request.url);
    var isSameOrigin = requestUrl.origin === self.location.origin;
    var isStaticAsset = isSameOrigin && ['style', 'script', 'image', 'font'].indexOf(event.request.destination) !== -1;

    if (isStaticAsset) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                var refresh = fetch(event.request).then(function(response) {
                    if (response && response.ok) {
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, response.clone());
                        });
                    }
                    return response;
                });
                return cached || refresh;
            })
        );
        return;
    }

    // Keep navigations and data requests fresh, with an offline fallback.
    event.respondWith(
        fetch(event.request).then(function(response) {
            if (isSameOrigin && response && response.ok && requestUrl.pathname.indexOf('/api/') !== 0) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(function() {
            return caches.match(event.request);
        })
    );
});
