import type {
  LargeReleaseDataPlaneIndex,
  LargeResourceReference,
  LargeSearchManifest,
  LargeSearchRequest,
  LargeSearchResponse,
  SearchSuggestion
} from '$lib/types';

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
    this.#worker.onmessage = (event: MessageEvent<{ type: string; id: number; error?: string; manifest?: LargeSearchManifest; response?: LargeSearchResponse; suggestions?: SearchSuggestion[] }>) => {
      const pending = this.#pending.get(event.data.id);
      if (!pending) return;
      this.#pending.delete(event.data.id);
      if (event.data.type === 'error') pending.reject(new Error(event.data.error || 'Search worker failed'));
      else if (event.data.type === 'ready') {
        this.manifest = event.data.manifest || null;
        pending.resolve(event.data.manifest);
      } else if (event.data.type === 'results') pending.resolve(event.data.response);
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

  init(
    baseUrl: string,
    manifestReference: LargeResourceReference,
    releaseDataPlane?: LargeReleaseDataPlaneIndex,
    snapshot = ''
  ): Promise<LargeSearchManifest> {
    return this.#request<LargeSearchManifest>({
      type: 'init',
      baseUrl,
      manifestReference,
      releaseDataPlane,
      snapshot
    });
  }

  query(request: LargeSearchRequest): Promise<LargeSearchResponse> {
    const serializableRequest: LargeSearchRequest = {
      query: String(request.query || ''),
      filters: Object.fromEntries(
        Object.entries(request.filters || {}).map(([key, values]) => [key, [...values].map(String)])
      ),
      sort: request.sort,
      ranking: request.ranking,
      facet_keys: request.facet_keys ? [...request.facet_keys] : undefined
    };
    return this.#request<LargeSearchResponse>({ type: 'query', request: serializableRequest });
  }

  suggest(prefix: string): Promise<SearchSuggestion[]> {
    return this.#request<SearchSuggestion[]>({ type: 'suggest', prefix });
  }

  destroy() {
    this.#worker.terminate();
  }
}
