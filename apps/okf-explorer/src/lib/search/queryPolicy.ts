import type { LargeSearchQueryPolicy } from '$lib/types';

export const QUERY_POLICY_SCHEMA = 'okf-search-query-policy.v1' as const;
export const QUERY_POLICY_TOKENISER = 'nfkd-lowercase-ascii-alphanumeric-component-v1' as const;
export const QUERY_POLICY_RESULT_SCHEMA = 'okf-search-query-policy-result.v1' as const;

export const QUERY_POLICY_LIMITS = Object.freeze({
  maxStopwords: 256,
  maxStopwordLength: 32,
  maxRatioDenominator: 1000
});

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string): void {
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  invariant(
    actual.length === canonical.length && actual.every((key, index) => key === canonical[index]),
    `Search manifest ${label} contract is unsupported or has drifted`
  );
}

function boundedInteger(value: unknown, minimum: number, maximum: number, label: string): number {
  invariant(
    Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum,
    `Search manifest ${label} is outside the supported range`
  );
  return Number(value);
}

/**
 * Validate the opt-in query-policy extension without accepting aliases or
 * floating-point ratios. The exact schema version defines the tokeniser and
 * the below-threshold one-group rule.
 */
export function validateQueryPolicy(value: unknown, maximumQueryTokens: number): LargeSearchQueryPolicy {
  invariant(value && typeof value === 'object' && !Array.isArray(value), 'Search manifest query_policy contract is malformed');
  const policy = value as Record<string, unknown>;
  exactKeys(policy, ['schema', 'tokeniser', 'stopwords', 'minimum_should_match'], 'query_policy');
  invariant(policy.schema === QUERY_POLICY_SCHEMA, 'Search manifest query_policy schema is unsupported');
  invariant(policy.tokeniser === QUERY_POLICY_TOKENISER, 'Search manifest query_policy tokeniser is unsupported');

  invariant(Array.isArray(policy.stopwords), 'Search manifest query_policy stopwords are malformed');
  invariant(
    policy.stopwords.length <= QUERY_POLICY_LIMITS.maxStopwords,
    'Search manifest query_policy stopwords exceed the supported limit'
  );
  const stopwords = policy.stopwords as unknown[];
  invariant(
    stopwords.every(
      (word) =>
        typeof word === 'string' &&
        word.length >= 1 &&
        word.length <= QUERY_POLICY_LIMITS.maxStopwordLength &&
        /^[a-z0-9]+$/.test(word)
    ),
    'Search manifest query_policy stopwords must be bounded lower-case token components'
  );
  invariant(new Set(stopwords).size === stopwords.length, 'Search manifest query_policy stopwords must be unique');
  invariant(
    stopwords.every((word, index) => index === 0 || String(stopwords[index - 1]) < String(word)),
    'Search manifest query_policy stopwords must be sorted'
  );

  invariant(
    policy.minimum_should_match &&
      typeof policy.minimum_should_match === 'object' &&
      !Array.isArray(policy.minimum_should_match),
    'Search manifest query_policy minimum_should_match is malformed'
  );
  const minimumShouldMatch = policy.minimum_should_match as Record<string, unknown>;
  exactKeys(
    minimumShouldMatch,
    ['apply_from_query_tokens', 'minimum_matches', 'ratio_numerator', 'ratio_denominator'],
    'query_policy.minimum_should_match'
  );
  const applyFrom = boundedInteger(
    minimumShouldMatch.apply_from_query_tokens,
    1,
    maximumQueryTokens,
    'query_policy.minimum_should_match.apply_from_query_tokens'
  );
  const minimumMatches = boundedInteger(
    minimumShouldMatch.minimum_matches,
    1,
    maximumQueryTokens,
    'query_policy.minimum_should_match.minimum_matches'
  );
  const ratioNumerator = boundedInteger(
    minimumShouldMatch.ratio_numerator,
    1,
    QUERY_POLICY_LIMITS.maxRatioDenominator,
    'query_policy.minimum_should_match.ratio_numerator'
  );
  const ratioDenominator = boundedInteger(
    minimumShouldMatch.ratio_denominator,
    1,
    QUERY_POLICY_LIMITS.maxRatioDenominator,
    'query_policy.minimum_should_match.ratio_denominator'
  );
  invariant(
    minimumMatches <= applyFrom,
    'Search manifest query_policy minimum_matches exceeds its application threshold'
  );
  invariant(
    ratioNumerator <= ratioDenominator,
    'Search manifest query_policy ratio must be no greater than one'
  );

  return {
    schema: QUERY_POLICY_SCHEMA,
    tokeniser: QUERY_POLICY_TOKENISER,
    stopwords: stopwords as string[],
    minimum_should_match: {
      apply_from_query_tokens: applyFrom,
      minimum_matches: minimumMatches,
      ratio_numerator: ratioNumerator,
      ratio_denominator: ratioDenominator
    }
  };
}

export function tokeniseWithQueryPolicy(
  value: string,
  policy: LargeSearchQueryPolicy,
  minimumTokenLength: number
): string[] {
  const text = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const stopwords = new Set(policy.stopwords);
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9]+/g)) {
    const token = match[0];
    if (token.length < minimumTokenLength || stopwords.has(token) || seen.has(token)) continue;
    tokens.push(token);
    seen.add(token);
  }
  return tokens;
}

export function requiredQueryTokenGroups(policy: LargeSearchQueryPolicy, queryTokenCount: number): number {
  if (queryTokenCount <= 0) return 0;
  const contract = policy.minimum_should_match;
  if (queryTokenCount < contract.apply_from_query_tokens) return 1;
  const ratioMatches = Math.ceil(
    (queryTokenCount * contract.ratio_numerator) / contract.ratio_denominator
  );
  return Math.min(queryTokenCount, Math.max(contract.minimum_matches, ratioMatches));
}
