import { contextSha256, validateContextIndex } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import type { ContextBinding, ContextIndex } from '../../../apps/okf-explorer/src/lib/context/types.ts';
import { validateContextCorpusManifest, type ContextCorpusManifest } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';
import corpusRelease from '../vendor/okf-dwp-corpus-release.json' with { type: 'json' };
import evidenceConnectRelease from '../vendor/okf-dwp-evidence-connect-corpus-release.json' with { type: 'json' };
import householdRelease from '../vendor/okf-dwp-household-corpus-release.json' with { type: 'json' };
import staffRelease from '../vendor/okf-dwp-staff-corpus-release.json' with { type: 'json' };
import previousRelease from '../vendor/okf-dwp-previous-corpus-release.json' with { type: 'json' };

export const SERVICE_VERSION = '0.7.0';
export const LEGACY_BUNDLE_VERSION = 'efb05c66616a9cd4328a86cf412780fe7bc7cf0b';
export const LEGACY_APPROVED_BUNDLE = {
  id: 'okf-dwp',
  version: LEGACY_BUNDLE_VERSION,
  snapshot: 'dwp-full-dmg-2026-09-16-a26a93daa9f5',
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${LEGACY_BUNDLE_VERSION}/full-dmg/context/assembly-index.json`,
  index_sha256: '38159445a60d4bcabc23cb2cf728e14cbd0a4b55013276c291356e7a1452ff54',
  descriptor_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${LEGACY_BUNDLE_VERSION}/full-dmg/okf-explorer.json`,
  descriptor_sha256: '9881779ab550efe9f73da1e16acd8c8dcb64933c9981bb290b66ff51572853f3',
  index_bytes: 416647
} as const;
// Publication stays visibly pending until a reviewed immutable DWP revision is
// known. The release build rejects this state; no mutable branch URL is used.
export const PRIOR_BUNDLE_VERSION = corpusRelease.version ?? `unpublished-${corpusRelease.manifest_sha256.slice(0, 16)}`;
export const PRIOR_APPROVED_BUNDLE = {
  id: 'okf-dwp', version: PRIOR_BUNDLE_VERSION, snapshot: corpusRelease.snapshot,
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${PRIOR_BUNDLE_VERSION}/${corpusRelease.manifest_path}`,
  index_sha256: corpusRelease.manifest_sha256, index_bytes: corpusRelease.manifest_bytes
} as const;
export const BUNDLE_VERSION = evidenceConnectRelease.version;
export const APPROVED_BUNDLE = {
  id: 'okf-dwp', version: BUNDLE_VERSION, snapshot: evidenceConnectRelease.snapshot,
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${BUNDLE_VERSION}/${evidenceConnectRelease.manifest_path}`,
  index_sha256: evidenceConnectRelease.manifest_sha256, index_bytes: evidenceConnectRelease.manifest_bytes
} as const;
export const HOUSEHOLD_BUNDLE_VERSION = householdRelease.version;
export const HOUSEHOLD_APPROVED_BUNDLE = {
  id: 'okf-dwp', version: HOUSEHOLD_BUNDLE_VERSION, snapshot: householdRelease.snapshot,
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${HOUSEHOLD_BUNDLE_VERSION}/${householdRelease.manifest_path}`,
  index_sha256: householdRelease.manifest_sha256, index_bytes: householdRelease.manifest_bytes
} as const;
export const STAFF_BUNDLE_VERSION = staffRelease.version;
export const STAFF_APPROVED_BUNDLE = {
  id: 'okf-dwp', version: STAFF_BUNDLE_VERSION, snapshot: staffRelease.snapshot,
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${STAFF_BUNDLE_VERSION}/${staffRelease.manifest_path}`,
  index_sha256: staffRelease.manifest_sha256, index_bytes: staffRelease.manifest_bytes
} as const;
export const PREVIOUS_BUNDLE_VERSION = previousRelease.version;
export const PREVIOUS_APPROVED_BUNDLE = {
  id: 'okf-dwp', version: PREVIOUS_BUNDLE_VERSION, snapshot: previousRelease.snapshot,
  index_url: `https://raw.githubusercontent.com/chris-page-gov/okf-dwp/${PREVIOUS_BUNDLE_VERSION}/${previousRelease.manifest_path}`,
  index_sha256: previousRelease.manifest_sha256, index_bytes: previousRelease.manifest_bytes
} as const;
export const APPROVED_VERSIONS = [BUNDLE_VERSION, PRIOR_BUNDLE_VERSION, HOUSEHOLD_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION] as const;

export type ApprovedContext = { index: ContextIndex; binding: ContextBinding };
export type ApprovedCorpus = { manifest: ContextCorpusManifest; binding: ContextBinding };
export type ApprovedSource = ApprovedContext | ApprovedCorpus;

/** The build embeds these exact bytes; callers can never provide a source URL. */
export async function verifyBundledContext(indexText: string, descriptorText: string): Promise<ApprovedContext> {
  if (new TextEncoder().encode(indexText).byteLength !== LEGACY_APPROVED_BUNDLE.index_bytes
    || await contextSha256(indexText) !== LEGACY_APPROVED_BUNDLE.index_sha256
    || await contextSha256(descriptorText) !== LEGACY_APPROVED_BUNDLE.descriptor_sha256) {
    throw new Error('Approved bundle integrity check failed.');
  }
  const index = validateContextIndex(JSON.parse(indexText), LEGACY_APPROVED_BUNDLE.snapshot);
  const descriptor = JSON.parse(descriptorText);
  if (descriptor.snapshot_id !== LEGACY_APPROVED_BUNDLE.snapshot) throw new Error('Approved descriptor snapshot mismatch.');
  return {
    index,
    binding: { index_url: LEGACY_APPROVED_BUNDLE.index_url, index_sha256: LEGACY_APPROVED_BUNDLE.index_sha256 }
  };
}

/** Verify the approved manifest before its pinned, hash-bound shard retrieval. */
export async function verifyBundledCorpus(manifestText: string, version = BUNDLE_VERSION): Promise<ApprovedCorpus> {
  const approved = version === BUNDLE_VERSION ? APPROVED_BUNDLE : version === PRIOR_BUNDLE_VERSION ? PRIOR_APPROVED_BUNDLE : version === HOUSEHOLD_BUNDLE_VERSION ? HOUSEHOLD_APPROVED_BUNDLE : version === STAFF_BUNDLE_VERSION ? STAFF_APPROVED_BUNDLE : version === PREVIOUS_BUNDLE_VERSION ? PREVIOUS_APPROVED_BUNDLE : undefined;
  if (!approved) throw new Error('Bundle version is not approved.');
  if (new TextEncoder().encode(manifestText).byteLength !== approved.index_bytes
    || await contextSha256(manifestText) !== approved.index_sha256) {
    throw new Error('Approved corpus integrity check failed.');
  }
  const manifest = validateContextCorpusManifest(JSON.parse(manifestText));
  if (manifest.bundle.snapshot !== approved.snapshot) throw new Error('Approved corpus snapshot mismatch.');
  return { manifest, binding: { index_url: approved.index_url, index_sha256: approved.index_sha256 } };
}
