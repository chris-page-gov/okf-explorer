type BoundMapFile = { url: string; bytes: number; sha256: string };

async function publicDocument(url: URL, maxBytes: number) {
  const response = await fetch(url, {
    credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000)
  });
  if (!response.ok || !response.body) throw new Error('The published map information is unavailable.');
  const reader = response.body.getReader();
  const bytes = new Uint8Array(maxBytes);
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      if (length + part.value.length > maxBytes) throw new Error('The map information exceeds its size limit.');
      bytes.set(part.value, length);
      length += part.value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return bytes.slice(0, length);
}

function dataDocument(bytes: Uint8Array) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function activatedWorker(registration: ServiceWorkerRegistration): Promise<ServiceWorker> {
  if (registration.active?.state === 'activated') return registration.active;
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error('The offline map service could not start.');
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => done(new Error('The offline map service did not start.')), 8000);
    function done(error?: Error) {
      window.clearTimeout(timer);
      worker?.removeEventListener('statechange', changed);
      if (error) reject(error);
      else if (worker) resolve(worker);
    }
    function changed() {
      if (worker?.state === 'activated') done();
      if (worker?.state === 'redundant') done(new Error('The offline map service could not start.'));
    }
    worker.addEventListener('statechange', changed);
    changed();
  });
}

export async function saveBoundaryMap(descriptor: URL, files: BoundMapFile[]) {
  const scope = new URL('.', window.location.href);
  const root = new URL('../', scope);
  if (!navigator.serviceWorker || descriptor.origin !== root.origin
      || !descriptor.pathname.startsWith(root.pathname) || descriptor.search || descriptor.hash) {
    throw new Error('Only published maps on this site can be saved offline.');
  }
  const [descriptorBytes, appBytes] = await Promise.all([
    publicDocument(descriptor, 65_536),
    publicDocument(new URL('okf-explorer-build-manifest.json', root), 65_536)
  ]);
  const data = dataDocument(descriptorBytes);
  const manifest = dataDocument(appBytes);
  const binding = data?.entrypoints?.boundary_pack;
  if (!binding || typeof binding.path !== 'string'
      || !files.some(file => file.url === new URL(binding.path, descriptor).href && file.sha256 === binding.sha256
        && file.bytes === binding.bytes)) {
    throw new Error('The boundary pack changed. Reload the map and try again.');
  }
  if (manifest?.schema !== 'okf-explorer-app-build-manifest.v1' || !Array.isArray(manifest.materials)) {
    throw new Error('The Explorer build manifest could not be verified.');
  }
  const appFiles: BoundMapFile[] = manifest.materials
    .filter((row: { path?: unknown }) => typeof row?.path === 'string'
      && (row.path === 'explore/index.html' || row.path.startsWith('_app/')))
    .map((row: { path: string, bytes: number, sha256: string }) => ({
      url: new URL(row.path, root).href, bytes: row.bytes, sha256: row.sha256
    }));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', descriptorBytes as Uint8Array<ArrayBuffer>)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  const registration = await navigator.serviceWorker.register(new URL('boundary-offline.js', scope), { scope: scope.href });
  const worker = await activatedWorker(registration);
  const { port1, port2 } = new MessageChannel();
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('The offline map could not be saved in time.')), 30000);
    function finish(error?: Error) {
      window.clearTimeout(timeout);
      port1.close();
      if (error) reject(error);
      else resolve();
    }
    port1.onmessage = (event: MessageEvent<{ saved?: boolean, error?: string }>) => {
      finish(event.data?.saved ? undefined : new Error(event.data?.error || 'The map could not be saved.'));
    };
    worker.postMessage({ type: 'save-boundary-map', descriptor: descriptor.href,
      files: [...appFiles, ...files, { url: descriptor.href, bytes: descriptorBytes.byteLength, sha256: digest }]
    }, [port2]);
  });
}
