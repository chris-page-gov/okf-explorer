import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LargeReleaseDataPlaneIndex } from '$lib/types';
import { LargeSearchClient } from './largeSearchClient';

type WorkerMessage = Record<string, unknown> & { id: number; type: string };

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
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

  fail(message: string) {
    this.onerror?.({ message } as ErrorEvent);
  }

  failMessage() {
    this.onmessageerror?.({} as MessageEvent);
  }
}

describe('LargeSearchClient', () => {
  afterEach(() => {
    vi.useRealTimers();
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
      manifestReference: 'https://example.test/search/manifest.json'
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

  it('passes integrity references, release metadata and snapshot binding to the worker', () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];
    const manifestReference = { path: 'data/search/manifest.json', sha256: 'a'.repeat(64) };
    const releaseDataPlane = {
      schema: 'govuk-okf-github-release-pack-index.v1'
    } as LargeReleaseDataPlaneIndex;

    void client.init('https://example.test/bundle/', manifestReference, releaseDataPlane, 'snapshot-1').catch(() => undefined);

    expect(worker.posted[0]).toMatchObject({
      type: 'init',
      baseUrl: 'https://example.test/bundle/',
      manifestReference,
      releaseDataPlane,
      snapshot: 'snapshot-1'
    });
    client.destroy();
  });

  it('copies reactive request state into structured-clone-safe worker data', () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];
    const sourceValues = ['local government'];
    const reactiveFilters = new Proxy({ publisher_family: sourceValues }, {});

    void client.query({
      query: 'planning',
      filters: reactiveFilters,
      sort: 'metadata-quality',
      ranking: 'idf',
      facet_keys: ['publisher_family'],
      include_results: false
    }).catch(() => undefined);

    const postedRequest = worker.posted[0].request as Record<string, unknown>;
    expect(postedRequest).toEqual({
      query: 'planning',
      filters: { publisher_family: ['local government'] },
      sort: 'metadata-quality',
      ranking: 'idf',
      facet_keys: ['publisher_family'],
      include_results: false
    });
    expect(postedRequest.filters).not.toBe(reactiveFilters);
    expect((postedRequest.filters as Record<string, string[]>).publisher_family).not.toBe(sourceValues);
    client.destroy();
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

  it('rejects all pending requests when the worker fails', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const worker = MockWorker.instances[0];
    const queryPromise = client.query({ query: 'pending', filters: {}, sort: 'relevance' });
    const suggestionsPromise = client.suggest('pen');

    worker.fail('worker crashed');

    await expect(queryPromise).rejects.toThrow('worker crashed');
    await expect(suggestionsPromise).rejects.toThrow('worker crashed');
    await expect(client.suggest('late')).rejects.toThrow('Search worker has been destroyed');
    expect(worker.terminated).toBe(true);
  });

  it('rejects pending and future requests after destroy', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const pending = client.query({ query: 'pending', filters: {}, sort: 'relevance' });

    client.destroy();

    await expect(pending).rejects.toThrow('Search worker was destroyed');
    await expect(client.suggest('late')).rejects.toThrow('Search worker has been destroyed');
    expect(MockWorker.instances[0].terminated).toBe(true);
  });

  it('rejects pending requests when a worker message cannot be decoded', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const pending = client.query({ query: 'pending', filters: {}, sort: 'relevance' });

    MockWorker.instances[0].failMessage();

    await expect(pending).rejects.toThrow('Search worker returned an unreadable response');
  });

  it('terminates a silent worker and rejects pending and future requests after the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', MockWorker);
    const client = new LargeSearchClient();
    const pending = client.query({ query: 'pending', filters: {}, sort: 'relevance' });
    const rejected = expect(pending).rejects.toThrow('Search worker did not respond within 30 seconds');

    await vi.advanceTimersByTimeAsync(30_000);

    await rejected;
    await expect(client.suggest('late')).rejects.toThrow('Search worker has been destroyed');
    expect(client.destroyed).toBe(true);
    expect(MockWorker.instances[0].terminated).toBe(true);
  });
});
