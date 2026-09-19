import { describe, expect, it } from 'vitest';
import { classificationMethodLabels, facetClassification } from './facetClassification';

const classification = {
  basis: ['explicit-mention', 'curated-reference'], review_status: 'unreviewed',
  classified_records: 12, total_records: 100,
  limitations: ['A text mention does not establish applicability.']
};

describe('producer-declared conceptual facet coverage', () => {
  it('preserves whole-snapshot denominators, method and review boundaries', () => {
    expect(facetClassification(classification)).toEqual(classification);
    expect(classificationMethodLabels(facetClassification(classification)!))
      .toEqual(['Explicit text mentions', 'Authored concept references']);
  });
  it.each([
    { classified_records: 101 }, { classified_records: -1 }, { total_records: 1.5 },
    { review_status: 'official' }, { total_records: '100' }, { classified_records: Number.NaN }
  ])('rejects invalid coverage or an undeclared review state %j', (change) => {
    expect(facetClassification({ ...classification, ...change })).toBeUndefined();
  });
  it('does not upgrade an unknown method and bounds untrusted descriptions', () => {
    const parsed = facetClassification({ ...classification, basis: ['AI says official', 'AI says official'], limitations: Array(50).fill('one') })!;
    expect(classificationMethodLabels(parsed)).toEqual(['Other producer method: AI says official']);
    expect(parsed.limitations).toEqual(['one']);
  });
});
