// service worker для офлайн-режима
const CACHE_NAME = 'notes-app-v1';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/storage-indexeddb.js',
  './js/storage-file.js',
  './js/ui.js',
  './manifest.json',
  './icons/app-icon-192.svg',
  './icons/app-icon-512.svg'
];

// при установке кешируем все нужные файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Кеш открыт');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  // сразу активируемся, не ждём
  self.skipWaiting();
});

// при активации чистим старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Удаляем старый кеш:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  // забираем контроль над всеми вкладками
  self.clients.claim();
});

// стратегия: сначала кеш, потом сеть
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        // если в кеше нет — идём в сеть
        return fetch(event.request).then((networkResponse) => {
          // кешируем новые запросы (только GET)
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // если совсем ничего не доступно
        return new Response('Офлайн — данные недоступны', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
