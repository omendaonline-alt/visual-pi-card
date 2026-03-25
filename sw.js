// Visual Pi Card - Service Worker v1.0
// pivisualcard.online - Offline support & caching

var CACHE_NAME = 'pivisualcard-v1';
var URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json'
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

// Fetch: network first, fallback to cache
self.addEventListener('fetch', function(event) {
    event.respondWith(
        fetch(event.request).then(function(response) {
            // Cache successful responses
            if (response && response.status === 200) {
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
