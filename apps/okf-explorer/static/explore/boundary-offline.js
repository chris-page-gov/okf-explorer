/* Keep only the explicit public Map snapshot. The normal Explorer stays network-first. */
const scope = new URL(self.registration.scope);
const root = new URL('../', scope);
const cachePrefix = 'okf-boundary-map-v1:' + scope.pathname;
const settingsKey = new URL('boundary-offline-state', scope).href;
const maxBytes = 16 * 1024 * 1024;
let saving = false;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function savedState() {
  const response = await (await caches.open(cachePrefix)).match(settingsKey);
  return response ? response.json() : null;
}

function publicUrl(value) {
  const url = new URL(value, root);
  if (url.origin !== root.origin || url.search || url.hash || url.username || url.password
      || !url.pathname.startsWith(root.pathname) || !/^[a-z0-9/_.-]+$/i.test(url.pathname)) {
    throw new Error('The offline map requires static files on this site.');
  }
  return url;
}

async function verifiedFile(row) {
  const url = publicUrl(row.url);
  const response = await fetch(url, {
    credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000)
  });
  if (!response.ok || !response.body) throw new Error('A public map file is unavailable.');
  const reader = response.body.getReader();
  const bytes = new Uint8Array(row.bytes);
  let offset = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      if (offset + part.value.byteLength > bytes.length) throw new Error('Map file size differs from its publication.');
      bytes.set(part.value, offset);
      offset += part.value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  if (offset !== row.bytes || digest !== row.sha256) throw new Error('A public map file failed its integrity check.');
  const type = response.headers.get('content-type') || 'application/octet-stream';
  return new Response(bytes, { headers: { 'content-type': type } });
}

async function saveSnapshot(input) {
  const descriptor = publicUrl(input.descriptor).href;
  const files = input.files;
  const html = new URL('index.html', scope).href;
  if (!Array.isArray(files) || files.length < 2 || files.length > 128
      || files.some(row => !row || !Number.isSafeInteger(row.bytes) || row.bytes < 1
        || !/^[a-f0-9]{64}$/.test(row.sha256))
      || files.reduce((sum, row) => sum + row.bytes, 0) > maxBytes) {
    throw new Error('The map exceeds the offline snapshot limits.');
  }
  const urls = files.map(row => publicUrl(row.url).href);
  if (urls.length !== new Set(urls).size || !urls.includes(html) || !urls.includes(descriptor)) {
    throw new Error('The offline map is missing part of its publication.');
  }

  const previous = await savedState();
  const name = cachePrefix + ':' + crypto.randomUUID();
  try {
    const cache = await caches.open(name);
    const pending = [...files];
    await Promise.allSettled(Array.from({ length: 4 }, async () => {
      for (let row; (row = pending.shift());) await cache.put(row.url, await verifiedFile(row));
    })).then(results => {
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    });
    await (await caches.open(cachePrefix)).put(settingsKey, new Response(JSON.stringify({ name, descriptor, urls })));
  } catch (error) {
    await caches.delete(name);
    throw error;
  }
  if (previous?.name?.startsWith(cachePrefix + ':')) await caches.delete(previous.name).catch(() => {});
}

self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port || event.data?.type !== 'save-boundary-map' || !event.source?.url?.startsWith(scope.href)) return;
  if (saving) {
    port.postMessage({ error: 'A map is already being saved.' });
    return;
  }
  saving = true;
  event.waitUntil(saveSnapshot(event.data).then(
    () => port.postMessage({ saved: true }),
    error => port.postMessage({ error: error instanceof Error ? error.message : 'The map could not be saved.' })
  ).finally(() => { saving = false; }));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.headers.has('range')) return;
  const url = new URL(event.request.url);
  if (url.origin !== root.origin) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const state = await savedState();
    if (!state) return Response.error();
    let key = url.href;
    if (event.request.mode === 'navigate' && url.pathname === scope.pathname
        && url.searchParams.get('view') === 'map') {
      const requestedBundle = url.searchParams.get('bundle');
      if (requestedBundle && new URL(requestedBundle, scope).href === state.descriptor) {
        key = new URL('index.html', scope).href;
      }
    }
    if (!state.urls.includes(key)) return Response.error();
    return (await (await caches.open(state.name)).match(key)) || Response.error();
  }));
});
