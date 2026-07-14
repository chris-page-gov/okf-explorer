import type { LargeSearchManifest } from '$lib/types';

export const SEARCH_MANIFEST_LIMITS = Object.freeze({
  maxManifestShardReferences: 4096,
  maxPostingsPerToken: 50_000,
  maxQueryTokens: 24,
  maxResultChunksPerQuery: 16,
  maxResultLimit: 500
});

export const POSTINGS_PARTITIONING_CONTRACT = Object.freeze({
  schema: 'okf-search-postings-partitioning.v1',
  algorithm: 'greedy-contiguous-token-range-exact-utf8-json-v1',
  logical_shard_length: 2,
  max_bytes: 5 * 1024 * 1024,
  partition_index_width: 5,
  token_atomic: true,
  single_partition_legacy_path: true
});

export const DOC_MAP_PARTITIONING_CONTRACT = Object.freeze({
  schema: 'okf-search-doc-map-partitioning.v1',
  algorithm: 'contiguous-ordinal-max-count-v1',
  max_records: 1000,
  max_bytes: 5 * 1024 * 1024,
  partition_index_width: 5
});

const SUPPORTED_SCHEMAS = new Set([
  'okf-static-search.v1',
  'okf-static-search.v2',
  'gov-ckan-static-search.v1'
]);

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number, label: string): number {
  const candidate = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new Error(`Search manifest ${label} is outside the supported range`);
  }
  return candidate;
}

function references(value: unknown, label: string, shape: 'array' | 'object'): number {
  if (shape === 'array') {
    if (!Array.isArray(value) || value.some((path) => typeof path !== 'string' || !path)) {
      throw new Error(`Search manifest ${label} entrypoints are malformed`);
    }
    return value.length;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Search manifest ${label} entrypoints are malformed`);
  }
  const rows = Object.values(value);
  if (rows.some((path) => typeof path !== 'string' || !path)) {
    throw new Error(`Search manifest ${label} entrypoints are malformed`);
  }
  return rows.length;
}

function exactContract(value: unknown, expected: Record<string, unknown>, label: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Search manifest ${label} contract is malformed`);
  }
  const actual = value as Record<string, unknown>;
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index] || actual[key] !== expected[key])
  ) {
    throw new Error(`Search manifest ${label} contract is unsupported or has drifted`);
  }
}

/**
 * Validate and normalize both legacy Explorer manifests and the versioned,
 * partitioned GOV.UK search contract before the worker trusts any shard path.
 */
export function validateLargeSearchManifest(value: unknown, expectedSnapshot = ''): LargeSearchManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Search manifest must be an object');
  }
  const document = value as Record<string, unknown>;
  if (!SUPPORTED_SCHEMAS.has(String(document.schema || ''))) {
    throw new Error('Unsupported static-search manifest');
  }
  const entrypoints = document.entrypoints;
  if (!entrypoints || typeof entrypoints !== 'object' || Array.isArray(entrypoints)) {
    throw new Error('Search manifest entrypoints are malformed');
  }
  const entries = entrypoints as Record<string, unknown>;
  for (const [label, shape] of [
    ['result_docs', 'array'],
    ['lexicon', 'object'],
    ['postings', 'array'],
    ['prefixes', 'object']
  ] as const) {
    if (references(entries[label], label, shape) > SEARCH_MANIFEST_LIMITS.maxManifestShardReferences) {
      throw new Error(`Search manifest ${label} entrypoints exceed the supported limit`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(document, 'postings_partitioning')) {
    exactContract(document.postings_partitioning, POSTINGS_PARTITIONING_CONTRACT, 'postings_partitioning');
    if (Number(document.lexicon_shard_length) !== POSTINGS_PARTITIONING_CONTRACT.logical_shard_length) {
      throw new Error('Search manifest logical lexicon width differs from postings_partitioning');
    }
  }
  if (Object.prototype.hasOwnProperty.call(document, 'doc_map_partitioning')) {
    exactContract(document.doc_map_partitioning, DOC_MAP_PARTITIONING_CONTRACT, 'doc_map_partitioning');
    if (
      references(entries.doc_map, 'doc_map', 'array') > SEARCH_MANIFEST_LIMITS.maxManifestShardReferences
    ) {
      throw new Error('Search manifest doc_map entrypoints exceed the supported limit');
    }
  } else if (typeof entries.doc_map !== 'string' || !entries.doc_map) {
    throw new Error('Legacy search manifest doc_map entrypoint must be one path');
  }

  const snapshot = String(document.snapshot_id || document.snapshot || '');
  if (expectedSnapshot && snapshot !== expectedSnapshot) {
    throw new Error('Search manifest snapshot differs from the loaded bundle snapshot');
  }
  const counts = document.counts;
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    throw new Error('Search manifest counts are malformed');
  }
  const countRows = counts as Record<string, unknown>;
  const postingsCount = (entries.postings as unknown[]).length;
  if (countRows.postings_shards !== undefined && Number(countRows.postings_shards) !== postingsCount) {
    throw new Error('Search manifest postings_shards count differs from its entrypoints');
  }
  const docMapCount = Array.isArray(entries.doc_map) ? entries.doc_map.length : 1;
  if (countRows.doc_map_shards !== undefined && Number(countRows.doc_map_shards) !== docMapCount) {
    throw new Error('Search manifest doc_map_shards count differs from its entrypoints');
  }

  return {
    ...(document as LargeSearchManifest),
    token_min_length: boundedInteger(document.token_min_length, 2, 2, 16, 'token_min_length'),
    prefix_min_length: boundedInteger(document.prefix_min_length, 3, 2, 16, 'prefix_min_length'),
    lexicon_shard_length: boundedInteger(document.lexicon_shard_length, 2, 1, 4, 'lexicon_shard_length'),
    result_limit: boundedInteger(document.result_limit, 200, 1, SEARCH_MANIFEST_LIMITS.maxResultLimit, 'result_limit'),
    result_doc_chunk_size: boundedInteger(document.result_doc_chunk_size, 1000, 1, 100_000, 'result_doc_chunk_size'),
    counts: {
      ...(countRows as Record<string, number>),
      max_postings_per_token: boundedInteger(
        countRows.max_postings_per_token,
        SEARCH_MANIFEST_LIMITS.maxPostingsPerToken,
        1,
        SEARCH_MANIFEST_LIMITS.maxPostingsPerToken,
        'counts.max_postings_per_token'
      )
    }
  };
}
