/**
 * STRYVON PWA Service Worker
 * Robust offline asset caching, network-first API strategy,
 * network-first JS/CSS bundle strategy, and graceful SPA navigation fallback.
 */

const CACHE_NAME = 'stryvon-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Service Worker Install Event — Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => console.warn('SW Install cache error:', err))
  );
  self.skipWaiting();
});

// Service Worker Activate Event — Purge Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 Purging outdated SW cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Service Worker Fetch Event — Robust Network / Cache strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 1. API Calls: Network-first strategy
  if (url.pathname.startsWith('/api') || url.hostname.includes('onrender.com')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 2. JS & CSS Bundles / Navigation: Network-first strategy to prevent stale JS bundle crashes
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.includes('/assets/')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(async () => {
        const cached = await caches.match(event.request) || await caches.match('/index.html') || await caches.match('/');
        return cached || new Response('', { status: 404 });
      })
    );
    return;
  }

  // 3. Other Static Assets: Cache-first with background revalidation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => new Response('', { status: 404 }));
    })
  );
});
