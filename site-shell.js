(function () {
    'use strict';

    var scriptUrl = document.currentScript && document.currentScript.src;
    var assetBase = scriptUrl ? new URL('.', scriptUrl) : new URL('.', window.location.href);

    function assetHref(path) {
        return new URL(path, assetBase).href;
    }

    function ensureHeadMetadata() {
        if (!document.querySelector('link[href="styles.css"]')) {
            var stylesheet = document.createElement('link');
            stylesheet.rel = 'stylesheet';
            stylesheet.href = assetHref('styles.css');
            document.head.appendChild(stylesheet);
        }

        if (!document.querySelector('link[rel="manifest"]')) {
            var manifest = document.createElement('link');
            manifest.rel = 'manifest';
            manifest.href = assetHref('manifest.json');
            document.head.appendChild(manifest);
        }

        if (!document.querySelector('meta[name="theme-color"]')) {
            var theme = document.createElement('meta');
            theme.name = 'theme-color';
            theme.content = '#17233b';
            document.head.appendChild(theme);
        }
    }

    function ensureMainTarget() {
        var main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('.app-content');
        if (main && !document.getElementById('main-content')) main.id = 'main-content';
    }

    function buildFooter() {
        var footer = document.querySelector('footer');
        if (!footer) {
            footer = document.createElement('footer');
            footer.className = 'omenda-site-footer';
            footer.innerHTML = '<span>&copy; 2026 Omenda Pi Pays Global</span>';
            document.body.appendChild(footer);
        }

        if (!footer.querySelector('.omenda-site-footer-links')) {
            var links = document.createElement('nav');
            links.className = 'omenda-site-footer-links';
            links.setAttribute('aria-label', 'Footer navigation');
            links.innerHTML = '<a href="' + assetHref('about.html') + '">Account</a><a href="' + assetHref('whitepaper.html') + '">Whitepaper</a><a href="' + assetHref('map.html') + '">Map</a><a href="' + assetHref('setup.html') + '">Status</a>';
            footer.appendChild(links);
        }
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register(assetHref('sw.js')).catch(function (error) {
                    console.warn('Offline support could not start:', error);
                });
            });
        }
    }

    function initialize() {
        ensureHeadMetadata();
        ensureMainTarget();
        buildFooter();
        registerServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}());
