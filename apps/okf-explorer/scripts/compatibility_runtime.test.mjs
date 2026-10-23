import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const legacy = new URL('../../../explorer/', import.meta.url);
const app = await readFile(new URL('app.js', legacy), 'utf8');
const worker = await readFile(new URL('service-worker.js', legacy), 'utf8');

test('compatibility startup tolerates malformed, wrong-shaped and unavailable saved pins', () => {
  for (const saved of ['{broken', '{}', 'null', '4', '"route"', '[null,3,"corpus\\u0001record"]']) {
    const context = vm.createContext({ location: { pathname: '/legacy/' }, localStorage: { getItem: () => saved } });
    vm.runInContext(app.slice(0, app.indexOf('let bundleHistory')), context);
    assert.equal(vm.runInContext('JSON.stringify([...pins])', context), saved.startsWith('[') ? '["corpus\\u0001record"]' : '[]');
  }
  const context = vm.createContext({ location: { pathname: '/legacy/' }, localStorage: { getItem() { throw new Error('Storage disabled'); } } });
  vm.runInContext(app.slice(0, app.indexOf('let bundleHistory')), context);
  assert.equal(vm.runInContext('pins.size', context), 0);
});

function workerHarness(caches, fetch = async () => { throw new Error('Offline'); }) {
  const listeners = new Map();
  vm.runInNewContext(worker, {
    self: { registration: { scope: 'https://example.test/legacy/' }, addEventListener: (name, handler) => listeners.set(name, handler), clients: { claim: async () => {} } },
    location: { origin: 'https://example.test' }, caches, fetch, URL, Response
  });
  return listeners;
}

test('service worker removes only obsolete caches belonging to its registration scope', async () => {
  const deleted = [];
  const own = 'okf-explorer:https://example.test/legacy/:';
  const listeners = workerHarness({ keys: async () => [`${own}v2`, `${own}v3`, 'another-app-v1', 'okf-explorer:https://example.test/other/:v2', 'okf-explorer-v2'], delete: async key => deleted.push(key) });
  let complete;
  listeners.get('activate')({ waitUntil: promise => { complete = promise; } });
  await complete;
  assert.deepEqual(deleted, [`${own}v2`]);
});

test('offline fallback reads only its own cache and returns a network error on a miss', async () => {
  let cached = new Response('Own cached page');
  const opened = [];
  const listeners = workerHarness({ open: async name => { opened.push(name); return { match: async () => cached }; } });
  let response;
  const event = { request: new Request('https://example.test/legacy/'), respondWith: promise => { response = promise; }, waitUntil() {} };
  listeners.get('fetch')(event);
  assert.equal(await (await response).text(), 'Own cached page');
  cached = undefined;
  listeners.get('fetch')(event);
  assert.equal((await response).type, 'error');
  assert.ok(opened.every(name => name === 'okf-explorer:https://example.test/legacy/:v3'));
});

test('a cache-write failure does not reject an otherwise successful network response', async () => {
  const listeners = workerHarness({ open: async () => ({ put: async () => { throw new Error('Quota'); } }) }, async () => new Response('Online page'));
  let response, write, dispatching = true;
  listeners.get('fetch')({ request: new Request('https://example.test/legacy/'), respondWith: promise => { response = promise; }, waitUntil: promise => { assert.ok(dispatching, 'register the lifetime promise during dispatch'); write = promise; } });
  dispatching = false;
  assert.ok(write, 'register the cache-write lifetime before dispatch returns');
  assert.equal(await (await response).text(), 'Online page');
  await write;
});
