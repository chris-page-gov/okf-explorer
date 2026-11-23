import { assembleContext, canonicalJson, contextSha256, MAX_CONTEXT_INDEX_BYTES, normaliseContextBudget, validateContextIndex } from '../context/index';
import type { BoundContextIndex, ContextBudget, ContextPackage } from '../context/types';
import { readResponseBytes } from './fetch';
import { safeRelativeResourcePath, sha256Hex } from './releaseDataPlane';

/** The local Reader can admit restricted context only when the same loopback
 * server explicitly authorises it. File loads and remote origins cannot opt in. */
export function localContextLoader(
  bundle: Record<string, unknown>, bundleUrl: string, pageOrigin: string
): (() => Promise<BoundContextIndex>) | undefined {
  const source = new URL(bundleUrl);
  if (source.protocol !== 'http:' || source.hostname !== '127.0.0.1' || source.origin !== pageOrigin) return;
  const entrypoints = bundle.entrypoints as Record<string, unknown> | undefined;
  const reference = entrypoints?.context_assembly as Record<string, unknown> | undefined;
  if (!reference) return;
  let pending: Promise<BoundContextIndex> | undefined;
  return () => {
    pending ??= (async (): Promise<BoundContextIndex> => {
      const { bytes, sha256, compression } = reference;
      if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_CONTEXT_INDEX_BYTES
        || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256) || compression !== 'identity'
        || typeof bundle.snapshot !== 'string' || !bundle.snapshot) {
        throw new Error('Local context requires an uncompressed, digest-bound index and bundle snapshot.');
      }
      const path = safeRelativeResourcePath(reference.path, 'Local context index path');
      const url = new URL(path, source).toString();
      const response = await fetch(url, {
        mode: 'same-origin', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000)
      });
      if (!response.ok || response.headers.get('X-OKF-Context-Audience') !== 'loopback') {
        throw new Error('The loopback server has not authorised this context index.');
      }
      const raw = await readResponseBytes(response, url, bytes);
      if (raw.byteLength !== bytes || await sha256Hex(raw) !== sha256) {
        throw new Error('Local context index failed its byte length or SHA-256 check.');
      }
      const index = validateContextIndex(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)), bundle.snapshot);
      return { index, binding: { index_url: url, index_sha256: sha256 } };
    })().catch((error) => { pending = undefined; throw error; });
    return pending;
  };
}


/** Apply the browser's separately verified audience only to a transient copy.
 * The released resolver and source records keep their public access semantics. */
export async function assembleLoopbackContext(bound: BoundContextIndex, question: string,
  requested?: Partial<ContextBudget>): Promise<ContextPackage> {
  const limit = normaliseContextBudget(requested);
  const records = new Map(bound.index.records.map(record => [record.id, record]));
  const projected = {
    ...bound.index,
    records: bound.index.records.map(record => ({ ...record, access: 'public' as const }))
  };
  const encoder = new TextEncoder();
  async function build(maxBytes: number) {
    const result = await assembleContext(projected, question, { ...limit, max_bytes: maxBytes }, bound.binding);
    for (const selection of result.selected) selection.record = records.get(selection.record.id)!;
    result.budget.max_bytes = limit.max_bytes;
    result.context_id = 'urn:sha256:' + await contextSha256(canonicalJson({
      ...result, context_id: undefined, budget: { ...result.budget, used_bytes: undefined }
    }));
    for (let pass = 0; pass < 4; pass++) result.budget.used_bytes = encoder.encode(JSON.stringify(result)).length;
    return result;
  }
  const result = await build(limit.max_bytes);
  if (result.budget.used_bytes <= limit.max_bytes) return result;
  // Restoring each access label adds at most four UTF-8 bytes. Leave room
  // for the byte-counter digits as well and let the resolver omit whole rows.
  const reserve = Math.max(8192, limit.max_bytes - limit.max_nodes * 4 - 16);
  const bounded = await build(reserve);
  if (bounded.budget.used_bytes > limit.max_bytes) throw new Error('Local context exceeds the requested byte budget.');
  return bounded;
}
