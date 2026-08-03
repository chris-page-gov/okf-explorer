import type { LargeSearchTypoTolerance, SearchTokenCorrection } from '$lib/types';

/**
 * The first typo-tolerance contract is deliberately fixed rather than
 * producer-tunable. That keeps request fan-out and candidate expansion
 * predictable for static hosts and makes independently built indexes behave
 * identically in the Explorer.
 */
export const TYPO_TOLERANCE_CONTRACT = Object.freeze({
  schema: 'okf-search-typo-tolerance.v1',
  algorithm: 'symmetric-delete-damerau-levenshtein-v1',
  max_edit_distance: 1,
  min_token_length: 4,
  max_token_length: 32,
  max_delete_keys_per_token: 33,
  max_candidates_per_delete_key: 8,
  max_candidates_per_token: 3,
  max_corrected_tokens_per_query: 4,
  max_shards_per_query: 12,
  max_keys_per_shard: 50_000,
  shard_length: 2
}) satisfies Readonly<LargeSearchTypoTolerance>;

export type TypoDeletionCandidate = {
  token: string;
  df: number;
};

export type TypoDeletionShard = {
  schema: 'okf-search-typo-deletions.v1';
  keys: Record<string, TypoDeletionCandidate[]>;
};

/** Return the token plus every unique one-character deletion. */
export function symmetricDeleteKeys(token: string): string[] {
  return [...new Set([
    token,
    ...Array.from({ length: token.length }, (_value, index) => `${token.slice(0, index)}${token.slice(index + 1)}`)
  ])];
}

/**
 * Return a distance only for exact or single-edit matches. Transposition is a
 * single edit, which is useful for place names such as "Covnetry". This
 * verifier prevents broad symmetric-delete collisions from becoming matches.
 */
export function damerauLevenshteinAtMostOne(left: string, right: string): 0 | 1 | null {
  if (left === right) return 0;
  const lengthDelta = left.length - right.length;
  if (Math.abs(lengthDelta) > 1) return null;

  if (lengthDelta === 0) {
    const mismatches: number[] = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches.push(index);
      if (mismatches.length > 2) return null;
    }
    if (mismatches.length === 1) return 1;
    if (
      mismatches.length === 2 &&
      mismatches[1] === mismatches[0] + 1 &&
      left[mismatches[0]] === right[mismatches[1]] &&
      left[mismatches[1]] === right[mismatches[0]]
    ) {
      return 1;
    }
    return null;
  }

  const [longer, shorter] = lengthDelta > 0 ? [left, right] : [right, left];
  let longerIndex = 0;
  let shorterIndex = 0;
  let skipped = false;
  while (longerIndex < longer.length && shorterIndex < shorter.length) {
    if (longer[longerIndex] === shorter[shorterIndex]) {
      longerIndex += 1;
      shorterIndex += 1;
      continue;
    }
    if (skipped) return null;
    skipped = true;
    longerIndex += 1;
  }
  return 1;
}

export function typoShardFor(key: string, shardLength = TYPO_TOLERANCE_CONTRACT.shard_length): string {
  const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean.slice(0, shardLength) || '_';
}

export function validateTypoDeletionShard(
  value: unknown,
  options: { documents: number; path: string }
): TypoDeletionShard {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Typo deletion shard ${options.path} must be an object`);
  }
  const document = value as Record<string, unknown>;
  if (document.schema !== 'okf-search-typo-deletions.v1') {
    throw new Error(`Typo deletion shard ${options.path} has an unsupported schema`);
  }
  if (!document.keys || typeof document.keys !== 'object' || Array.isArray(document.keys)) {
    throw new Error(`Typo deletion shard ${options.path} keys are malformed`);
  }
  const keys = document.keys as Record<string, unknown>;
  if (Object.keys(keys).length > TYPO_TOLERANCE_CONTRACT.max_keys_per_shard) {
    throw new Error(`Typo deletion shard ${options.path} exceeds the key limit`);
  }

  for (const [key, rows] of Object.entries(keys)) {
    if (!key || key.length > TYPO_TOLERANCE_CONTRACT.max_token_length || !Array.isArray(rows)) {
      throw new Error(`Typo deletion shard ${options.path} contains a malformed key`);
    }
    if (rows.length > TYPO_TOLERANCE_CONTRACT.max_candidates_per_delete_key) {
      throw new Error(`Typo deletion shard ${options.path} candidate expansion exceeds the supported limit`);
    }
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Typo deletion shard ${options.path} contains a malformed candidate`);
      }
      const candidate = row as Record<string, unknown>;
      if (
        typeof candidate.token !== 'string' ||
        candidate.token.length < TYPO_TOLERANCE_CONTRACT.min_token_length ||
        candidate.token.length > TYPO_TOLERANCE_CONTRACT.max_token_length ||
        !/^[a-z0-9][a-z0-9._-]*$/.test(candidate.token) ||
        !Number.isInteger(candidate.df) ||
        Number(candidate.df) < 1 ||
        Number(candidate.df) > options.documents
      ) {
        throw new Error(`Typo deletion shard ${options.path} contains a malformed candidate`);
      }
    }
  }
  return document as TypoDeletionShard;
}

export function correctionFor(
  queryToken: string,
  matchedToken: string,
  candidateRank: number
): SearchTokenCorrection | null {
  const distance = damerauLevenshteinAtMostOne(queryToken, matchedToken);
  if (distance !== 1) return null;
  return {
    query_token: queryToken,
    matched_token: matchedToken,
    edit_distance: distance,
    method: TYPO_TOLERANCE_CONTRACT.algorithm,
    candidate_rank: candidateRank
  };
}
