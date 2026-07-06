import type { LargeSearchManifest, SearchResultDoc, SearchSuggestion } from '$lib/types';

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export class LargeSearchClient {
  #worker: Worker;
  #nextId = 1;
  #pending = new Map<number, Pending>();
  manifest: LargeSearchManifest | null = null;

  constructor() {
    this.#worker = new Worker(new URL('../../workers/largeSearch.worker.ts', import.meta.url), { type: 'module' });
    this.#worker.onmessage = (event: MessageEvent<{ type: string; id: number; error?: string; manifest?: LargeSearchManifest; results?: SearchResultDoc[]; suggestions?: SearchSuggestion[] }>) => {
      const pending = this.#pending.get(event.data.id);
      if (!pending) return;
      this.#pending.delete(event.data.id);
      if (event.data.type === 'error') pending.reject(new Error(event.data.error || 'Search worker failed'));
      else if (event.data.type === 'ready') {
        this.manifest = event.data.manifest || null;
        pending.resolve(event.data.manifest);
      } else if (event.data.type === 'results') pending.resolve(event.data.results || []);
      else if (event.data.type === 'suggestions') pending.resolve(event.data.suggestions || []);
      else pending.reject(new Error(`Unknown search worker response: ${event.data.type}`));
    };
  }

  #request<T>(message: Record<string, unknown>): Promise<T> {
    const id = this.#nextId++;
    this.#worker.postMessage({ ...message, id });
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    });
  }

  init(baseUrl: string, manifestUrl: string): Promise<LargeSearchManifest> {
    return this.#request<LargeSearchManifest>({ type: 'init', baseUrl, manifestUrl });
  }

  query(query: string): Promise<SearchResultDoc[]> {
    return this.#request<SearchResultDoc[]>({ type: 'query', query });
  }

  suggest(prefix: string): Promise<SearchSuggestion[]> {
    return this.#request<SearchSuggestion[]>({ type: 'suggest', prefix });
  }

  destroy() {
    this.#worker.terminate();
  }
}
