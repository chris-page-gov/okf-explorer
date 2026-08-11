import { describe, expect, it } from 'vitest';

import type { LargeSearchQueryPolicy } from '$lib/types';
import {
  QUERY_POLICY_LIMITS,
  QUERY_POLICY_SCHEMA,
  QUERY_POLICY_TOKENISER,
  requiredQueryTokenGroups,
  tokeniseWithQueryPolicy,
  validateQueryPolicy
} from '$lib/search/queryPolicy';

const policy = (): LargeSearchQueryPolicy => ({
  schema: QUERY_POLICY_SCHEMA,
  tokeniser: QUERY_POLICY_TOKENISER,
  stopwords: ['a', 'the', 'what'],
  minimum_should_match: {
    apply_from_query_tokens: 3,
    minimum_matches: 2,
    ratio_numerator: 3,
    ratio_denominator: 10
  }
});

describe('large-search query policy', () => {
  it('validates the exact versioned integer contract', () => {
    expect(validateQueryPolicy(policy(), 24)).toEqual(policy());
  });

  it('tokenises NFKD lower-case ASCII components with declared stopwords and stable de-duplication', () => {
    expect(
      tokeniseWithQueryPolicy('What Café.alpha-beta ALPHA x R2-D2 the', policy(), 2)
    ).toEqual(['cafe', 'alpha', 'beta', 'r2', 'd2']);
  });

  it('uses the schema-defined one-group rule below the threshold and integer ceiling at or above it', () => {
    const value = policy();
    expect(Array.from({ length: 11 }, (_, count) => requiredQueryTokenGroups(value, count))).toEqual([
      0,
      1,
      1,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3
    ]);
  });

  it.each([
    ['non-object policy', null, /contract is malformed/],
    ['extra policy field', { ...policy(), fallback: 'or' }, /unsupported or has drifted/],
    ['wrong schema', { ...policy(), schema: 'okf-search-query-policy.v2' }, /schema is unsupported/],
    ['wrong tokeniser', { ...policy(), tokeniser: 'words-v1' }, /tokeniser is unsupported/],
    ['unsorted stopwords', { ...policy(), stopwords: ['the', 'a'] }, /must be sorted/],
    ['duplicate stopwords', { ...policy(), stopwords: ['a', 'a'] }, /must be unique/],
    ['non-component stopword', { ...policy(), stopwords: ['title-plan'] }, /token components/],
    [
      'too many stopwords',
      {
        ...policy(),
        stopwords: Array.from(
          { length: QUERY_POLICY_LIMITS.maxStopwords + 1 },
          (_, index) => `s${String(index).padStart(3, '0')}`
        )
      },
      /exceed the supported limit/
    ],
    [
      'floating ratio',
      {
        ...policy(),
        minimum_should_match: { ...policy().minimum_should_match, ratio_numerator: 0.3 }
      },
      /outside the supported range/
    ],
    [
      'ratio greater than one',
      {
        ...policy(),
        minimum_should_match: {
          ...policy().minimum_should_match,
          ratio_numerator: 11,
          ratio_denominator: 10
        }
      },
      /no greater than one/
    ],
    [
      'minimum above threshold',
      {
        ...policy(),
        minimum_should_match: {
          ...policy().minimum_should_match,
          apply_from_query_tokens: 3,
          minimum_matches: 4
        }
      },
      /exceeds its application threshold/
    ],
    [
      'extra minimum field',
      {
        ...policy(),
        minimum_should_match: { ...policy().minimum_should_match, ratio: 0.3 }
      },
      /unsupported or has drifted/
    ]
  ])('rejects %s', (_label, value, error) => {
    expect(() => validateQueryPolicy(value, 24)).toThrow(error as RegExp);
  });
});
