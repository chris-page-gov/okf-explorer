import { describe, expect, it } from 'vitest';
import {
  TYPO_TOLERANCE_CONTRACT,
  correctionFor,
  damerauLevenshteinAtMostOne,
  symmetricDeleteKeys,
  typoShardFor,
  validateTypoDeletionShard
} from './typoTolerance';

describe('static-search typo tolerance', () => {
  it('builds deterministic, unique symmetric-delete keys', () => {
    expect(symmetricDeleteKeys('abb')).toEqual(['abb', 'bb', 'ab']);
    expect(symmetricDeleteKeys('coventry')).toHaveLength(9);
  });

  it('accepts one insertion, deletion, substitution, or adjacent transposition only', () => {
    expect(damerauLevenshteinAtMostOne('cathedral', 'cathedral')).toBe(0);
    expect(damerauLevenshteinAtMostOne('cathedrl', 'cathedral')).toBe(1);
    expect(damerauLevenshteinAtMostOne('cathedraal', 'cathedral')).toBe(1);
    expect(damerauLevenshteinAtMostOne('cathedrel', 'cathedral')).toBe(1);
    expect(damerauLevenshteinAtMostOne('covnetry', 'coventry')).toBe(1);
    expect(damerauLevenshteinAtMostOne('cat', 'cathedral')).toBeNull();
    expect(damerauLevenshteinAtMostOne('warwikc', 'warwickshire')).toBeNull();
    expect(damerauLevenshteinAtMostOne('ab', 'ba')).toBe(1);
    expect(damerauLevenshteinAtMostOne('abcd', 'badc')).toBeNull();
  });

  it('uses the normalized deletion-key prefix for deterministic sharding', () => {
    expect(typoShardFor('Coventry')).toBe('co');
    expect(typoShardFor('.a-b')).toBe('ab');
    expect(typoShardFor('--')).toBe('_');
  });

  it('emits explainable correction metadata only for a verified single edit', () => {
    expect(correctionFor('covnetry', 'coventry', 1)).toEqual({
      query_token: 'covnetry',
      matched_token: 'coventry',
      edit_distance: 1,
      method: TYPO_TOLERANCE_CONTRACT.algorithm,
      candidate_rank: 1
    });
    expect(correctionFor('coventry', 'coventry', 1)).toBeNull();
    expect(correctionFor('covntry', 'warwick', 1)).toBeNull();
  });

  it('rejects malformed and resource-amplifying deletion shards', () => {
    expect(validateTypoDeletionShard({
      schema: 'okf-search-typo-deletions.v1',
      keys: { covetry: [{ token: 'coventry', df: 4 }] }
    }, { documents: 10, path: 'co.json' }).keys.covetry).toEqual([{ token: 'coventry', df: 4 }]);

    const candidates = Array.from(
      { length: TYPO_TOLERANCE_CONTRACT.max_candidates_per_delete_key + 1 },
      (_value, index) => ({ token: `candidate${index}`, df: 1 })
    );
    expect(() => validateTypoDeletionShard({
      schema: 'okf-search-typo-deletions.v1',
      keys: { candidate: candidates }
    }, { documents: 10, path: 'ca.json' })).toThrow('candidate expansion');

    expect(() => validateTypoDeletionShard({
      schema: 'okf-search-typo-deletions.v1',
      keys: { covetry: [{ token: 'Coventry', df: 4 }] }
    }, { documents: 10, path: 'co.json' })).toThrow('malformed candidate');
  });
});
