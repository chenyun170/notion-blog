// Cleanup Service Worker - 清除旧缓存并自注销
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
     .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', (event) => {
  // 不拦截任何请求，全部走网络
  event.respondWith(fetch(event.request));
});
