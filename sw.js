self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // No interceptar peticiones externas (APIs IA con streaming SSE, Firebase, Google Fit)
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return;
    }
    event.respondWith(fetch(event.request));
});
