// Minimal Service Worker for PWA and Push
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    self.registration.showNotification(data.title || 'Solumati', {
        body: data.body || 'New Notification',
        icon: '/logo/android-chrome-192x192.png'
    });
});