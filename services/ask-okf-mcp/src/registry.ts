import { contextSha256, validateContextIndex } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import type { ContextBinding, ContextIndex } from '../../../apps/okf-explorer/src/lib/context/types.ts';

export const SERVICE_VERSION = '0.1.0';
export const BUNDLE_VERSION = 'efb05c66616a9cd4328a86cf412780fe7bc7cf0b';
export const APPROVED_BUNDLE = {
  id: 'okf-dwp',
  version: BUNDLE_VERSION,
  snapshot: 'dwp-full-dmg-2026-09-16-a26a93daa9f5',
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${BUNDLE_VERSION}/full-dmg/context/assembly-index.json`,
  index_sha256: '38159445a60d4bcabc23cb2cf728e14cbd0a4b55013276c291356e7a1452ff54',
  descriptor_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${BUNDLE_VERSION}/full-dmg/okf-explorer.json`,
  descriptor_sha256: '9881779ab550efe9f73da1e16acd8c8dcb64933c9981bb290b66ff51572853f3',
  index_bytes: 416647
} as const;

export type ApprovedContext = { index: ContextIndex; binding: ContextBinding };

/** The build embeds these exact bytes; callers can never provide a source URL. */
export async function verifyBundledContext(indexText: string, descriptorText: string): Promise<ApprovedContext> {
  if (new TextEncoder().encode(indexText).byteLength !== APPROVED_BUNDLE.index_bytes
    || await contextSha256(indexText) !== APPROVED_BUNDLE.index_sha256
    || await contextSha256(descriptorText) !== APPROVED_BUNDLE.descriptor_sha256) {
    throw new Error('Approved bundle integrity check failed.');
  }
  const index = validateContextIndex(JSON.parse(indexText), APPROVED_BUNDLE.snapshot);
  const descriptor = JSON.parse(descriptorText);
  if (descriptor.snapshot_id !== APPROVED_BUNDLE.snapshot) throw new Error('Approved descriptor snapshot mismatch.');
  return {
    index,
    binding: { index_url: APPROVED_BUNDLE.index_url, index_sha256: APPROVED_BUNDLE.index_sha256 }
  };
}
