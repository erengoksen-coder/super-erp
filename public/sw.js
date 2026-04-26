/**
 * Agi-OS Zenith Service Worker (Offline Resilience v1.0)
 * 
 * Optimized for:
 * - Ultra-fast dashboard shell loading.
 * - Offline-readiness for Workstation and Inventory.
 * - Intelligent asset caching (Stale-While-Revalidate).
 */

const CACHE_NAME = 'agi-os-zenith-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/LOGO-2.png',
  '/favicon.ico',
  '/workers/vortex-worker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Agi-OS SW] Pre-caching Zenith shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  console.log('[Agi-OS SW] Zenith activated (Offline Resilience Active)');
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Static Assets (Cache First)
  if (ASSETS_TO_CACHE.includes(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          return response;
        });
      })
    );
    return;
  }

  // 2. Navigation Requests (Network First with Cache Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // 3. API Requests (Always Network, no cache for security & real-time)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
});
