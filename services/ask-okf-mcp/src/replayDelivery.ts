import type { EvidenceRead } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';
import type { EvidenceResult } from './deliveryContracts.ts';
import type { ReplayIdentity } from './replay.ts';

/** Account for the implementation envelope without weakening the existing
 * 8 KiB public minimum or changing the underlying complete-value digest. */
export function bindEvidenceRead(part: EvidenceRead, identity: ReplayIdentity, limit: number): EvidenceResult {
  const result: EvidenceResult = { ...part, delivery: { ...part.delivery, max_bytes: limit }, replay_identity: identity };
  const text = part.data;
  const size = () => new TextEncoder().encode(JSON.stringify(result)).length;
  const end = (count: number) => {
    if (count > 0 && count < text.length && /[\uD800-\uDBFF]/.test(text[count - 1]) && /[\uDC00-\uDFFF]/.test(text[count])) count--;
    result.data = text.slice(0, count); result.end_offset = part.offset + count;
    result.next_offset = result.end_offset < result.total_characters ? result.end_offset : null;
    result.delivery.partial = part.offset > 0 || result.end_offset < result.total_characters;
    for (let i = 0; i < 4; i++) result.delivery.used_bytes = size();
  };
  let low = 0, high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2); end(middle);
    if (size() <= limit) low = middle; else high = middle - 1;
  }
  end(low);
  if (size() > limit || (!result.data.length && part.offset !== part.total_characters)) throw new Error('Delivery budget exceeded.');
  return result;
}
