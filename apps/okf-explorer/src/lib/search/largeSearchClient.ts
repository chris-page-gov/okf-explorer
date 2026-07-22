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
  timeout: ReturnType<typeof setTimeout>;
};

const REQUEST_TIMEOUT_MS = 30_000;
const INIT_TIMEOUT_MS = 60_000;

export class LargeSearchClient {
  #worker: Worker;
  #nextId = 1;
  #pending = new Map<number, Pending>();
  #destroyed = false;
  manifest: LargeSearchManifest | null = null;

  constructor() {
    this.#worker = new Worker(new URL('../../workers/largeSearch.worker.ts', import.meta.url), { type: 'module' });
    this.#worker.onmessage = (event: MessageEvent<{ type: string; id: number; error?: string; manifest?: LargeSearchManifest; response?: LargeSearchResponse; suggestions?: SearchSuggestion[] }>) => {
      const pending = this.#pending.get(event.data.id);
      if (!pending) return;
      this.#pending.delete(event.data.id);
      clearTimeout(pending.timeout);
      if (event.data.type === 'error') pending.reject(new Error(event.data.error || 'Search worker failed'));
      else if (event.data.type === 'ready') {
        this.manifest = event.data.manifest || null;
        pending.resolve(event.data.manifest);
      } else if (event.data.type === 'results') pending.resolve(event.data.response);
      else if (event.data.type === 'suggestions') pending.resolve(event.data.suggestions || []);
      else pending.reject(new Error(`Unknown search worker response: ${event.data.type}`));
    };
    this.#worker.onerror = (event: ErrorEvent) => {
      const message = event.message || 'Search worker failed';
      this.#fail(new Error(message));
    };
    this.#worker.onmessageerror = () => {
      this.#fail(new Error('Search worker returned an unreadable response'));
    };
  }

  #request<T>(message: Record<string, unknown>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
    if (this.#destroyed) return Promise.reject(new Error('Search worker has been destroyed'));
    const id = this.#nextId++;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#fail(new Error(`Search worker did not respond within ${Math.round(timeoutMs / 1000)} seconds`));
      }, timeoutMs);
      this.#pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout });
      try {
        this.#worker.postMessage({ ...message, id });
      } catch (error) {
        const pending = this.#pending.get(id);
        if (pending) clearTimeout(pending.timeout);
        this.#pending.delete(id);
        reject(error);
      }
    });
  }

  #rejectPending(error: Error) {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  #fail(error: Error) {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#rejectPending(error);
    this.#worker.terminate();
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
    }, INIT_TIMEOUT_MS);
  }

  query(request: LargeSearchRequest): Promise<LargeSearchResponse> {
    const serializableRequest: LargeSearchRequest = {
      query: String(request.query || ''),
      filters: Object.fromEntries(
        Object.entries(request.filters || {}).map(([key, values]) => [key, [...values].map(String)])
      ),
      sort: request.sort,
      ranking: request.ranking,
      facet_keys: request.facet_keys ? [...request.facet_keys] : undefined,
      ...(request.include_results !== undefined ? { include_results: request.include_results } : {})
    };
    return this.#request<LargeSearchResponse>({ type: 'query', request: serializableRequest });
  }

  suggest(prefix: string): Promise<SearchSuggestion[]> {
    return this.#request<SearchSuggestion[]>({ type: 'suggest', prefix });
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#rejectPending(new Error('Search worker was destroyed'));
    this.#worker.terminate();
  }
}
