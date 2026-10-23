const CACHE_PREFIX = `okf-explorer:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}v3`;
const ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const response = fetch(event.request);
  event.waitUntil(
    response.then(response => {
      if (response && response.ok && new URL(event.request.url).origin === location.origin) {
        const copy = response.clone();
        return caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
    }).catch(() => {})
  );
  event.respondWith(
    response.catch(async () => (await (await caches.open(CACHE)).match(event.request)) || Response.error())
  );
});
