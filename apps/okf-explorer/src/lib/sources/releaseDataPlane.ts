import type {
  LargeReleaseDataPlaneEntry,
  LargeReleaseDataPlaneIndex,
  LargeReleasePack,
  LargeResourceReference
} from '$lib/types';

export const RELEASE_DATA_PLANE_SCHEMA = 'govuk-okf-github-release-pack-index.v1';
export const RELEASE_DATA_PLANE_ALGORITHM = 'concatenated-byte-ranges-v1';
export const MAX_RELEASE_PACK_BYTES = 64 * 1024 * 1024;
export const MAX_RELEASE_PACKS = 900;
const RELEASE_ASSET_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export type PreparedReleaseDataPlane = {
  document: LargeReleaseDataPlaneIndex;
  packs: Map<string, LargeReleasePack & { url: string }>;
  entries: Map<string, LargeReleaseDataPlaneEntry>;
  baseUrl: string;
};

export type ReleaseDataRequest = {
  url: string;
  headers: { Range: string };
  expectedHash: string;
  expectedLength: number;
  expectedPackedHash: string;
  expectedPackedLength: number;
  expectedContentRange: string;
  logicalPath: string;
  compression: 'identity' | 'gzip';
  transportCompression: 'identity' | 'gzip';
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function ownedBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  copy.set(bytes);
  return copy;
}

export async function sha256Hex(bytes: Uint8Array | string): Promise<string> {
  const material = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : ownedBytes(bytes);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function resourcePath(reference: LargeResourceReference | null | undefined): string {
  if (typeof reference === 'string') return reference;
  if (!reference || typeof reference !== 'object') return '';
  return String(reference.path || '');
}

export function resourceHash(reference: LargeResourceReference | null | undefined): string {
  if (!reference || typeof reference !== 'object' || typeof reference === 'string') return '';
  const hash = String(reference.sha256 || '').toLowerCase();
  if (hash && !SHA256.test(hash)) throw new Error('Resource SHA-256 is malformed');
  return hash;
}

export function safeRelativeResourcePath(value: unknown, label = 'release data-plane path'): string {
  if (typeof value !== 'string' || !value || value.trim() !== value || value.startsWith('/') || value.includes('\\')) {
    throw new Error(`${label} is unsafe`);
  }
  if (value.includes('?') || value.includes('#') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    throw new Error(`${label} is unsafe`);
  }
  const segments = value.split('/');
  if (segments.some((segment) => !segment)) throw new Error(`${label} is unsafe`);
  for (const segment of segments) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error(`${label} is unsafe`);
    }
    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('\0')
    ) {
      throw new Error(`${label} is unsafe`);
    }
  }
  return value;
}

function expectedAssetUrl(repository: string, tag: string, assetName: string): string {
  return `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetName)}`;
}

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} is malformed`);
  }
  return value;
}

export async function prepareReleaseDataPlane(
  document: LargeReleaseDataPlaneIndex,
  baseUrl: string,
  expectedSnapshot = ''
): Promise<PreparedReleaseDataPlane> {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Release data-plane index is not an object');
  }
  if (
    document.schema !== RELEASE_DATA_PLANE_SCHEMA ||
    document.schema_version !== '1.0' ||
    document.algorithm !== RELEASE_DATA_PLANE_ALGORITHM
  ) {
    throw new Error('Release data-plane index schema or algorithm is unsupported');
  }
  const repository = String(document.repository || '');
  const tag = String(document.tag || '');
  const snapshot = String(document.snapshot || '');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !SAFE_SEGMENT.test(tag) || !snapshot) {
    throw new Error('Release data-plane repository, tag or snapshot is malformed');
  }
  if (expectedSnapshot && snapshot !== expectedSnapshot) {
    throw new Error('Release data-plane snapshot differs from the descriptor');
  }
  if (!Array.isArray(document.packs) || !Array.isArray(document.entries)) {
    throw new Error('Release data-plane packs or entries are malformed');
  }
  const maxPackBytes = integer(document.max_pack_bytes, 'Release data-plane pack ceiling', 1, MAX_RELEASE_PACK_BYTES);
  if (document.packs.length > MAX_RELEASE_PACKS) {
    throw new Error('Release data plane leaves fewer than 100 Release asset slots');
  }

  const pagesBase = new URL(baseUrl);
  const packs = new Map<string, LargeReleasePack & { url: string }>();
  for (const raw of document.packs) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Release data-plane pack row is malformed');
    const id = String(raw.id || '');
    const assetName = String(raw.asset_name || '');
    const bytes = integer(raw.bytes, 'Release data-plane pack size', 1, maxPackBytes);
    const hash = String(raw.sha256 || '').toLowerCase();
    const path = safeRelativeResourcePath(raw.path, 'Release data-plane pack path');
    const releaseUrl = String(raw.release_url || '');
    if (
      !/^pack-[0-9]{5}$/.test(id) ||
      packs.has(id) ||
      !SAFE_SEGMENT.test(assetName) ||
      !assetName.endsWith('.pack.gz')
    ) {
      throw new Error('Release data-plane pack identity is malformed or duplicated');
    }
    if (bytes >= RELEASE_ASSET_MAX_BYTES || !SHA256.test(hash)) {
      throw new Error('Release data-plane pack size or hash is malformed');
    }
    if (path !== `data-packs/${assetName}` || releaseUrl !== expectedAssetUrl(repository, tag, assetName)) {
      throw new Error('Release data-plane pack paths are not bound to their repository, tag and asset');
    }
    const url = new URL(path, pagesBase).toString();
    if (new URL(url).origin !== pagesBase.origin) {
      throw new Error('Browser pack delivery must stay on the bundle origin');
    }
    packs.set(id, { ...raw, id, asset_name: assetName, path, bytes, sha256: hash, release_url: releaseUrl, url });
  }

  const entries = new Map<string, LargeReleaseDataPlaneEntry>();
  const cursors = new Map([...packs.keys()].map((id) => [id, 0]));
  for (const raw of document.entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Release data-plane entry is malformed');
    const path = safeRelativeResourcePath(raw.path, 'Release data-plane entry path');
    const pack = String(raw.pack || '');
    const offset = integer(raw.offset, 'Release data-plane entry offset', 0, Number.MAX_SAFE_INTEGER);
    const bytes = integer(raw.bytes, 'Release data-plane logical size', 1, MAX_RELEASE_PACK_BYTES);
    const packedBytes = integer(raw.packed_bytes, 'Release data-plane packed size', 1, maxPackBytes);
    const hash = String(raw.sha256 || '').toLowerCase();
    const packedHash = String(raw.packed_sha256 || '').toLowerCase();
    const compression = String(raw.compression || 'identity');
    const transportCompression = String(raw.transport_compression || 'identity');
    if (entries.has(path) || !packs.has(pack)) {
      throw new Error('Release data-plane entry is duplicated or names an unknown pack');
    }
    if (offset !== cursors.get(pack) || offset + packedBytes > packs.get(pack)!.bytes) {
      throw new Error('Release data-plane entry range is malformed or non-contiguous');
    }
    if (
      !SHA256.test(hash) ||
      !SHA256.test(packedHash) ||
      !['identity', 'gzip'].includes(compression) ||
      !['identity', 'gzip'].includes(transportCompression)
    ) {
      throw new Error('Release data-plane entry hash or compression is malformed');
    }
    if (transportCompression === 'identity' && compression !== 'gzip') {
      throw new Error('Only an original gzip shard may use identity transport');
    }
    const entry: LargeReleaseDataPlaneEntry = {
      ...raw,
      path,
      pack,
      offset,
      bytes,
      packed_bytes: packedBytes,
      sha256: hash,
      packed_sha256: packedHash,
      compression,
      transport_compression: transportCompression
    };
    cursors.set(pack, offset + packedBytes);
    entries.set(path, entry);
  }
  for (const [id, cursor] of cursors) {
    if (cursor !== packs.get(id)!.bytes) throw new Error('Release data-plane pack contains unindexed bytes');
  }

  const expectedCounts = {
    packs: document.packs.length,
    virtual_shards: document.entries.length,
    packed_bytes: document.packs.reduce((total, row) => total + Number(row.bytes), 0),
    source_bytes: document.entries.reduce((total, row) => total + Number(row.bytes), 0)
  };
  if (canonicalJson(document.counts) !== canonicalJson(expectedCounts)) {
    throw new Error('Release data-plane counts differ');
  }
  const rootMaterial = `${canonicalJson({
    algorithm: RELEASE_DATA_PLANE_ALGORITHM,
    packs: document.packs,
    entries: document.entries
  })}\n`;
  if (!SHA256.test(String(document.index_root_sha256 || '')) || (await sha256Hex(rootMaterial)) !== document.index_root_sha256) {
    throw new Error('Release data-plane index root differs');
  }
  return { document, packs, entries, baseUrl: pagesBase.toString() };
}

export function releaseDataRequest(
  reference: LargeResourceReference,
  prepared?: PreparedReleaseDataPlane
): ReleaseDataRequest | null {
  if (!prepared) return null;
  const path = safeRelativeResourcePath(resourcePath(reference), 'Bundle resource path');
  const resolved = new URL(path, prepared.baseUrl);
  if (resolved.origin !== new URL(prepared.baseUrl).origin) {
    throw new Error('Release data-plane resources must stay on the bundle origin');
  }
  const entry = prepared.entries.get(path);
  if (!entry) return null;
  const advertisedHash = resourceHash(reference);
  if (advertisedHash && advertisedHash !== entry.sha256) {
    throw new Error('Logical resource integrity differs from the release data-plane index');
  }
  const pack = prepared.packs.get(entry.pack)!;
  const end = entry.offset + entry.packed_bytes - 1;
  return {
    url: pack.url,
    headers: { Range: `bytes=${entry.offset}-${end}` },
    expectedHash: entry.sha256,
    expectedLength: entry.bytes,
    expectedPackedHash: entry.packed_sha256,
    expectedPackedLength: entry.packed_bytes,
    expectedContentRange: `bytes ${entry.offset}-${end}/${pack.bytes}`,
    logicalPath: path,
    compression: entry.compression as 'identity' | 'gzip',
    transportCompression: entry.transport_compression as 'identity' | 'gzip'
  };
}
