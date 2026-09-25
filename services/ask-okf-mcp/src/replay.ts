import { canonicalJson, contextSha256 } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import type { ContextBudget, ContextPackage } from '../../../apps/okf-explorer/src/lib/context/types.ts';
import type { ApprovedSource, ApprovedCorpus } from './registry.ts';
import { CURRENT_ENGINE_ID, PRIOR_ENGINE_ID, ENGINES, type EngineAdapter } from './engines.ts';
import { BUNDLE_VERSION } from './registry.ts';
import { corpusAssetReferences } from './corpusAssets.ts';
import { ENGINE_CATALOGUE_LIMIT, COMPATIBLE_REPLAY_LIMIT } from './enginePolicy.ts';

export const REPLAY_LIMITS = Object.freeze({ attempts: COMPATIBLE_REPLAY_LIMIT, files: 64, fetched_bytes: 16 * 1024 * 1024,
  decoded_bytes: 32 * 1024 * 1024, timeout_ms: 60000 });
export type ReplayIdentity = {
  engine_id: string;
  mode: 'current-default' | 'explicit-engine' | 'historical-compatible';
  original_engine_id: string | null;
  matching_engine_ids: string[];
  package_sha256: string;
};
export type ReplayInput = { version: string; question: string; budget?: Partial<ContextBudget>; engine_id?: string; context_id?: string };
export class ReplayError extends Error {
  readonly code: 'engine_unavailable' | 'historical_unavailable' | 'historical_ambiguous' | 'context_mismatch' | 'replay_budget';
  constructor(code: ReplayError['code']) { super(code); this.code = code; }
}
export function replayFailure(cause: unknown): string | undefined {
  if (!(cause instanceof ReplayError)) return;
  return ({ engine_unavailable: 'The engine is unknown or is not approved for this source version.',
    historical_unavailable: 'Historical replay is unavailable: no supported engine recreated the expected context. The expected identity was preserved; no replacement evidence was returned.',
    historical_ambiguous: 'Historical replay is ambiguous: matching context IDs have different complete package bytes. No evidence was returned.',
    context_mismatch: 'The pinned engine did not recreate the expected context. No replacement evidence was returned.',
    replay_budget: 'Replay exceeded its shared bounded resource allowance. No evidence was returned.' })[cause.code];
}

/** Per invocation only; cache contains verified public files, never questions.
 * Transfer counts unique files; files/decoded bytes count every decode, including
 * a second engine. Reservations happen before await and share the old ceilings.
 */
export function createReplayFetcher(source: ApprovedCorpus, upstream: typeof fetch) {
  const root = new URL('.', source.binding.index_url);
  const refs = new Map(corpusAssetReferences(source.manifest)
    .map(ref => [new URL(ref.path, root).href, ref]));
  const cached = new Map<string, Promise<Uint8Array>>();
  const usage = { files: 0, fetched_bytes: 0, decoded_bytes: 0 };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REPLAY_LIMITS.timeout_ms);
  const fetcher: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const ref = refs.get(url);
    if (!ref || (init?.method && init.method !== 'GET') || init?.body) throw new Error('Corpus asset is not approved.');
    const transferred = cached.has(url) ? 0 : ref.bytes;
    if (abort.signal.aborted || usage.files + 1 > REPLAY_LIMITS.files
      || usage.fetched_bytes + transferred > REPLAY_LIMITS.fetched_bytes
      || usage.decoded_bytes + (ref.decoded_bytes ?? ref.bytes) > REPLAY_LIMITS.decoded_bytes) throw new ReplayError('replay_budget');
    usage.files++; usage.fetched_bytes += transferred; usage.decoded_bytes += ref.decoded_bytes ?? ref.bytes;
    if (!cached.has(url)) cached.set(url, (async () => {
      const response = await upstream(url, { redirect: 'error', credentials: 'omit',
        signal: init?.signal ? AbortSignal.any([abort.signal, init.signal]) : abort.signal });
      if (!response.ok || (response.url && response.url !== url) || !response.body) throw new Error('Approved corpus asset is unavailable.');
      const reader = response.body.getReader(); const parts: Uint8Array[] = []; let length = 0;
      try {
        while (true) { const part = await reader.read(); if (part.done) break;
          length += part.value.length;
          if (length > ref.bytes) { await reader.cancel(); throw new Error('Corpus asset exceeds its binding.'); }
          parts.push(part.value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.length; }
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (length !== ref.bytes || sha !== ref.sha256) throw new Error('Corpus asset integrity check failed.');
      return bytes;
    })());
    return new Response(await cached.get(url)! as BodyInit);
  };
  return { fetcher, usage, close() { clearTimeout(timer); abort.abort(); cached.clear(); } };
}

/** The service always supplies the static registry. Explicit adapters permit
 * offline policy tests without exposing module selection to an MCP caller. */
export async function resolveReplay(source: ApprovedSource, input: ReplayInput, upstream: typeof fetch,
  adapters: readonly EngineAdapter[] = ENGINES, clock = () => performance.now()): Promise<{ context: ContextPackage; identity: ReplayIdentity }> {
  const started = clock();
  const deadline = () => { if (clock() - started >= REPLAY_LIMITS.timeout_ms) throw new ReplayError('replay_budget'); };
  if (!adapters.length || adapters.length > ENGINE_CATALOGUE_LIMIT || new Set(adapters.map(e => e.engine_id)).size !== adapters.length) throw new ReplayError('engine_unavailable');
  const compatible = adapters.filter(e => e.source_versions.includes(input.version));
  const historical = !input.engine_id && !!input.context_id;
  const defaultEngine = input.version === BUNDLE_VERSION ? CURRENT_ENGINE_ID : PRIOR_ENGINE_ID;
  const candidates = historical ? compatible : compatible.filter(e => e.engine_id === (input.engine_id ?? defaultEngine));
  if (!candidates.length) throw new ReplayError(historical ? 'historical_unavailable' : 'engine_unavailable');
  if (candidates.length > REPLAY_LIMITS.attempts) throw new ReplayError('replay_budget');
  const request = 'manifest' in source ? createReplayFetcher(source, upstream) : null;
  let selected: { context: ContextPackage; canonical: string; engine_id: string } | undefined;
  const matches: string[] = [];
  try {
    for (const engine of candidates) {
      deadline();
      const context = await engine.assemble(source, input.question, input.budget, request?.fetcher ?? upstream);
      deadline();
      if (input.context_id && context.context_id !== input.context_id) continue;
      const canonical = canonicalJson(context);
      deadline();
      if (selected && selected.canonical !== canonical) throw new ReplayError('historical_ambiguous');
      selected ??= { context, canonical, engine_id: engine.engine_id }; matches.push(engine.engine_id);
    }
    if (!selected) throw new ReplayError(historical ? 'historical_unavailable' : 'context_mismatch');
    const package_sha256 = await contextSha256(selected.canonical);
    deadline();
    return { context: selected.context, identity: { engine_id: selected.engine_id,
      mode: historical ? 'historical-compatible' : input.engine_id ? 'explicit-engine' : 'current-default',
      original_engine_id: input.engine_id ?? null, matching_engine_ids: matches,
      package_sha256 } };
  } catch (error) { deadline(); throw error;
  } finally { request?.close(); }
}
