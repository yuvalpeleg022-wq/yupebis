// Offline shell: app files are cached; AI requests and links always go to the network.
const CACHE = 'jarvis-v2';
const SHELL = ['./', 'index.html', 'css/mobile.css', 'js/app.js', 'js/brain.js', 'js/orb.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'vendor/anthropic-sdk.min.js', 'vendor/three/build/three.module.min.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // network first so updates show up immediately, cache as the offline fallback
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.openWindow('./')); });
