import { describe, expect, it } from 'vitest';
import { normalizeEffectsReconciliation } from './effectsReconciliation';

describe('official-effects reconciliation presentation', () => {
  it('normalizes the published receipt and always exposes all four UI states', () => {
    const result = normalizeEffectsReconciliation({
      schema: 'okf-official-effects-reconciliation.v1',
      snapshot_id: 'legislation-effects-2026-07-25',
      generated_at: '2026-07-25T21:30:00Z',
      notice: 'Refreshes are immutable.',
      post_build_live: {
        observed_at: '2026-07-26T00:34:00Z',
        release_effect: 'passed-with-declared-live-delta',
        receipt: 'whole-law/assurance/effects-live-reconciliation.json',
        live_additions: 2,
        states: {
          agreement: 16,
          'inaccessible-consistent': 6,
          superseded: 1
        },
        scope: { statement: 'Latest-entry probe, not a full recrawl.' }
      },
      states: {}
    });

    expect(result.states.map((state) => [state.id, state.count])).toEqual([
      ['agreement', 16],
      ['live-addition', 2],
      ['superseded', 1],
      ['inaccessible', 6]
    ]);
    expect(result.observedAt).toBe('2026-07-26T00:34:00Z');
    expect(result.scope).toContain('not a full recrawl');
  });

  it('uses explicit zeroes for unobserved live additions and superseded rows', () => {
    const result = normalizeEffectsReconciliation({
      schema: 'okf-official-effects-reconciliation.v1',
      snapshot_id: 'snapshot',
      generated_at: '2026-07-25T21:30:00Z',
      states: {
        post_build_agreement: 4,
        post_build_inaccessible_consistent: 2
      }
    });

    expect(result.states.map((state) => state.count)).toEqual([4, 0, 0, 2]);
  });

  it('fails closed on unsupported schemas and dishonest counts', () => {
    expect(() => normalizeEffectsReconciliation({
      schema: 'other',
      snapshot_id: 'snapshot',
      generated_at: '2026-07-25T21:30:00Z'
    })).toThrow('unsupported schema');
    expect(() => normalizeEffectsReconciliation({
      schema: 'okf-official-effects-reconciliation.v1',
      snapshot_id: 'snapshot',
      generated_at: '2026-07-25T21:30:00Z',
      states: { post_build_agreement: -1 }
    })).toThrow('non-negative integer');
  });
});
