// const CACHE_NAME = 'solumati-v1'; // Unused

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Simple Network-First Strategy
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    // Return a fallback response so we don't return undefined (which causes TypeError)
                    // We can return a 503 or a generic JSON error
                    return new Response(JSON.stringify({ error: "Network unavailable" }), {
                        status: 503,
                        headers: { "Content-Type": "application/json" }
                    });
                });
            })
    );
});

self.addEventListener('push', function (event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/logo.svg', // Assuming logo.svg exists in public/ or static/
        badge: '/logo.svg',
        data: {
            url: data.url || '/'
        }
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data.url)
    );
});
