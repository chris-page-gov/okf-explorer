import { describe, expect, it } from 'vitest';
import type { LargeSearchManifest } from '$lib/types';
import {
  DOC_MAP_PARTITIONING_CONTRACT,
  POSTINGS_PARTITIONING_CONTRACT,
  validateLargeSearchManifest
} from './largeSearchContract';

function manifest(): LargeSearchManifest {
  return {
    schema: 'okf-static-search.v1',
    snapshot: 'snapshot-1',
    token_min_length: 2,
    prefix_min_length: 3,
    lexicon_shard_length: 2,
    result_limit: 200,
    result_doc_chunk_size: 1000,
    weights: { title: 16 },
    field_masks: { title: 1 },
    counts: { documents: 1, max_postings_per_token: 100, postings_shards: 1, doc_map_shards: 1 },
    entrypoints: {
      lexicon: { ed: 'data/search/lexicon/ed.json' },
      prefixes: { ed: 'data/search/prefixes/ed.json' },
      postings: ['data/search/postings/ed.json'],
      result_docs: ['data/search/results-0.json'],
      facets: 'data/facets.json',
      doc_map: 'data/search/doc-map.json'
    }
  };
}

describe('large search manifest contract', () => {
  it('accepts legacy manifests while binding an advertised snapshot', () => {
    expect(validateLargeSearchManifest(manifest(), 'snapshot-1')).toMatchObject({
      schema: 'okf-static-search.v1',
      snapshot: 'snapshot-1',
      result_limit: 200
    });
    expect(() => validateLargeSearchManifest(manifest(), 'snapshot-2')).toThrow('snapshot differs');
  });

  it('accepts only the exact versioned postings and doc-map partition contracts', () => {
    const value = manifest();
    value.postings_partitioning = { ...POSTINGS_PARTITIONING_CONTRACT };
    value.doc_map_partitioning = { ...DOC_MAP_PARTITIONING_CONTRACT };
    value.entrypoints.doc_map = ['data/search/doc-map-00000.json'];
    expect(validateLargeSearchManifest(value, 'snapshot-1').entrypoints.doc_map).toEqual([
      'data/search/doc-map-00000.json'
    ]);

    value.postings_partitioning.max_bytes = 6 * 1024 * 1024;
    expect(() => validateLargeSearchManifest(value, 'snapshot-1')).toThrow('unsupported or has drifted');
  });

  it('rejects malformed shard counts and resource-amplifying limits', () => {
    const wrongCount = manifest();
    wrongCount.counts.postings_shards = 2;
    expect(() => validateLargeSearchManifest(wrongCount)).toThrow('postings_shards count differs');

    const excessiveLimit = manifest();
    excessiveLimit.counts.max_postings_per_token = 50_001;
    expect(() => validateLargeSearchManifest(excessiveLimit)).toThrow('outside the supported range');
  });

  it('rejects unsupported schemas and malformed core entrypoint collections', () => {
    const unsupported = manifest();
    unsupported.schema = 'unknown-search.v1';
    expect(() => validateLargeSearchManifest(unsupported)).toThrow('Unsupported');

    const malformed = manifest() as unknown as Record<string, unknown>;
    (malformed.entrypoints as Record<string, unknown>).postings = 'data/search/postings/ed.json';
    expect(() => validateLargeSearchManifest(malformed)).toThrow('postings entrypoints are malformed');
  });
});
