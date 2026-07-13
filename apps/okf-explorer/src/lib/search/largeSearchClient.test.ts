import { afterEach, describe, expect, it, vi } from 'vitest';
import { LargeSearchClient } from './largeSearchClient';

type WorkerMessage = Record<string, unknown> & { id: number; type: string };

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  posted: WorkerMessage[] = [];
  terminated = false;

  constructor() {
    MockWorker.instances.push(this);
  }

  postMessage(message: WorkerMessage) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  respond(data: Record<string, unknown>) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('LargeSearchClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockWorker.instances = [];
  });

  it('sends init, query and suggest requests through the worker', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];

    const initPromise = client.init('https://example.test/', 'https://example.test/search/manifest.json');
    expect(worker.posted[0]).toMatchObject({
      type: 'init',
      id: 1,
      baseUrl: 'https://example.test/',
      manifestUrl: 'https://example.test/search/manifest.json'
    });
    worker.respond({ type: 'ready', id: 1, manifest: { schema: 'search', tokens: 10 } });
    await expect(initPromise).resolves.toEqual({ schema: 'search', tokens: 10 });
    expect(client.manifest).toEqual({ schema: 'search', tokens: 10 });

    const request = { query: 'iapt', filters: {}, sort: 'relevance' as const };
    const queryPromise = client.query(request);
    expect(worker.posted[1]).toMatchObject({ type: 'query', id: 2, request });
    const response = { results: [{ name: 'dataset-one', title: 'Dataset One' }], total: 1, truncated: false };
    worker.respond({ type: 'results', id: 2, response });
    await expect(queryPromise).resolves.toEqual(response);

    const suggestPromise = client.suggest('ia');
    expect(worker.posted[2]).toMatchObject({ type: 'suggest', id: 3, prefix: 'ia' });
    worker.respond({ type: 'suggestions', id: 3, suggestions: [{ token: 'iapt', df: 2 }] });
    await expect(suggestPromise).resolves.toEqual([{ token: 'iapt', df: 2 }]);

    client.destroy();
    expect(worker.terminated).toBe(true);
  });

  it('rejects failed worker responses and ignores unknown ids', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];
    const queryPromise = client.query({ query: 'broken', filters: {}, sort: 'relevance' });

    worker.respond({ type: 'results', id: 999, response: { results: [] } });
    worker.respond({ type: 'error', id: 1, error: 'search shard missing' });
    await expect(queryPromise).rejects.toThrow('search shard missing');
  });

  it('uses safe defaults for incomplete worker responses', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];

    const initPromise = client.init('https://example.test/', 'search/manifest.json');
    worker.respond({ type: 'ready', id: 1 });
    await expect(initPromise).resolves.toBeUndefined();
    expect(client.manifest).toBeNull();

    const queryPromise = client.query({ query: 'empty', filters: {}, sort: 'newest' });
    worker.respond({ type: 'results', id: 2 });
    await expect(queryPromise).resolves.toBeUndefined();

    const suggestPromise = client.suggest('em');
    worker.respond({ type: 'suggestions', id: 3 });
    await expect(suggestPromise).resolves.toEqual([]);

    const errorPromise = client.query({ query: 'broken', filters: {}, sort: 'relevance' });
    worker.respond({ type: 'error', id: 4 });
    await expect(errorPromise).rejects.toThrow('Search worker failed');
  });

  it('rejects unknown worker response types', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];
    const queryPromise = client.query({ query: 'pending', filters: {}, sort: 'relevance' });

    worker.respond({ type: 'unknown', id: 1 });
    await expect(queryPromise).rejects.toThrow('Unknown search worker response: unknown');
  });
});
