import { describe, expect, it } from 'vitest';
import {
  conceptGenerated,
  deriveTrustTier,
  isConceptStale,
  normalizeAttestedComputation,
  normalizeSources,
  normalizeVerified,
  okfConceptPresentation
} from './okfV02';

describe('OKF v0.2 compatibility', () => {
  it('gives v0.2 generated and sources fields precedence over v0.1 fallbacks', () => {
    const node = {
      id: 'metric',
      title: 'Metric',
      type: 'Metric',
      timestamp: '2025-01-01T00:00:00Z',
      generated: { by: 'process:catalogue-build', at: '2026-07-25T09:00:00Z' },
      sources: [{ id: 'policy', resource: 'https://example.test/policy', title: 'Policy' }],
      body: '# Citations\n\n- https://legacy.example/ignored'
    };

    expect(conceptGenerated(node)).toEqual({
      by: 'process:catalogue-build',
      at: '2026-07-25T09:00:00Z',
      basis: 'okf-v0.2'
    });
    expect(normalizeSources(node)).toEqual([
      { id: 'policy', resource: 'https://example.test/policy', title: 'Policy' }
    ]);
  });

  it('consumes a v0.1 timestamp and Citations section without inventing verification', () => {
    const node = {
      id: 'legacy',
      title: 'Legacy',
      type: 'Reference',
      timestamp: '2024-03-01T00:00:00Z',
      body: '# Summary\n\nLegacy body.\n\n# Citations\n\n- [Primary reference](https://example.test/reference)\n- <https://example.test/second>\n\n# Notes\n\nIgnored.'
    };

    expect(conceptGenerated(node).basis).toBe('legacy-v0.1-timestamp');
    expect(normalizeSources(node)).toEqual([
      {
        resource: 'https://example.test/reference',
        title: 'Primary reference',
        legacy: true
      },
      {
        resource: 'https://example.test/second',
        legacy: true
      }
    ]);
    expect(okfConceptPresentation(node).trustTier).toBe('unverified');
  });

  it('does not let a legacy timestamp override a present v0.2 generated field', () => {
    const node = {
      id: 'malformed-new-field',
      title: 'Malformed generated field',
      type: 'Reference',
      timestamp: '2024-03-01T00:00:00Z',
      generated: 'invalid'
    };
    expect(conceptGenerated(node as never)).toEqual({ by: '', at: '', basis: 'okf-v0.2' });
  });

  it('normalises one or many verification events and derives the normative tier', () => {
    const machine = normalizeVerified({ by: 'process:nightly', at: '2026-07-25T01:00:00Z' });
    const mixed = normalizeVerified([
      { by: 'process:nightly', at: '2026-07-25T01:00:00Z' },
      { by: 'human:reviewer', at: '2026-07-25T09:00:00Z' }
    ]);

    expect(machine).toHaveLength(1);
    expect(deriveTrustTier(machine)).toBe('machine-confirmed');
    expect(deriveTrustTier(mixed)).toBe('human-reviewed');
    expect(deriveTrustTier([])).toBe('unverified');
    expect(normalizeVerified({ at: '2026-07-25T01:00:00Z' })).toEqual([]);
    expect(deriveTrustTier(normalizeVerified({ at: '2026-07-25T01:00:00Z' }))).toBe('unverified');
    expect(normalizeVerified({ by: 'team:reviewer', at: '2026-07-25T01:00:00Z' })).toHaveLength(1);
    expect(normalizeVerified({ by: 'human:reviewer', at: '2026-07-25' })).toHaveLength(1);
    expect(normalizeVerified({ by: 'human:reviewer', at: '2026-02-30T01:00:00Z' })).toEqual([]);
  });

  it('marks a concept stale on its stale_after day', () => {
    const today = new Date(2026, 6, 25, 12);
    expect(isConceptStale('2026-07-25', today)).toBe(true);
    expect(isConceptStale('2026-07-26', today)).toBe(false);
    expect(isConceptStale('invalid', today)).toBe(true);
    expect(isConceptStale('2026-99-99', today)).toBe(true);
  });

  it('presents an Attested Computation as a passive declared contract', () => {
    const node = {
      id: 'revenue',
      title: 'Revenue',
      type: 'Attested Computation',
      runtime: 'bigquery',
      parameters: [{ name: 'year', type: 'integer', required: true }],
      executor: {
        resource: 'references/run.md',
        receipt: ['job_id', 'executed_sql', 'result']
      },
      attester: { resource: 'references/attest.py' },
      body: '# Computation\n\n```sql\nSELECT @year\n```'
    };

    expect(normalizeAttestedComputation(node)).toEqual({
      declared: true,
      runtime: 'bigquery',
      parameters: [{ name: 'year', type: 'integer', required: true }],
      computation: '',
      inlineComputation: true,
      executorResource: 'references/run.md',
      receiptFields: ['job_id', 'executed_sql', 'result'],
      attesterResource: 'references/attest.py',
      contractWarnings: []
    });
  });

  it('preserves unknown fields through the presentation boundary', () => {
    const node = {
      id: 'extension',
      title: 'Extension',
      type: 'Producer-defined Type',
      generated: { by: 'process:builder', at: '2026-07-25T00:00:00Z' },
      'x-provider-policy': { retain: true }
    };
    expect(okfConceptPresentation(node).generated.by).toBe('process:builder');
    expect(node['x-provider-policy']).toEqual({ retain: true });
  });
});

describe('OKF 0.3 interpretation', () => {
  it('keeps history while comparing author and verifier instants across offsets at full precision', () => {
    const generated = { by: 'editor/v1', at: '2026-11-01T01:00:00.0000002+01:00' };
    const verified = normalizeVerified([
      { by: 'human:past', at: '2026-11-01T00:00:00.0000001Z' },
      { by: 'custom:checker', at: '2026-11-01T00:00:00.000000200Z' }
    ]);
    expect(verified).toHaveLength(2);
    expect(deriveTrustTier(verified, generated)).toBe('machine-confirmed');
    expect(deriveTrustTier(verified, { at: 'broken' })).toBe('unverified');
    expect(deriveTrustTier(verified)).toBe('human-reviewed');
  });

  it('compares the exact stale instant, treats midnight as UTC and retains source timestamps', () => {
    const now = new Date('2026-11-23T00:00:00.000Z');
    expect(isConceptStale('2026-11-22T23:00:00.000001-01:00', now)).toBe(false);
    expect(isConceptStale('2026-11-23', now)).toBe(true);
    expect(isConceptStale('2026-11-23T00:00:00', now)).toBe(true);
    expect(isConceptStale([], now)).toBe(false);
    const node = { id: 'a', title: 'A', type: 'Metric', status: 'paused', timestamp: 'old',
      sources: { resource: 'urn:source:a', last_modified: '2026-11-23T08:30:00+01:00' } };
    const result = okfConceptPresentation(node, now, '0.3');
    expect(result.sources[0].last_modified).toBe(node.sources.last_modified);
    expect(result.status).toBe('paused');
    expect(result.generated.basis).toBe('not-declared');
  });
});

it('selects a fence only in the Computation section and gives a file precedence', () => {
  const node = { id: 'x', title: 'X', type: 'Attested Computation', parameters: { name: 'year', type: 'integer' },
    body: '## Computation\n### Query\n~~~sql\nSELECT 1\n~~~' };
  expect(normalizeAttestedComputation(node)?.inlineComputation).toBe(true);
  expect(normalizeAttestedComputation(node)?.parameters[0].required).toBe(false);
  expect(normalizeAttestedComputation({ ...node, computation: 'file.sql' })?.inlineComputation).toBe(false);
  expect(normalizeAttestedComputation({ ...node, body: '## Computation\nText\n## Other\n~~~sql\nx\n~~~' })?.inlineComputation).toBe(false);
});
