import { describe, expect, it } from 'vitest';
import {
  EXPLORATORY_BANNER_MESSAGE,
  buildExploratoryFeedbackUrl,
  parseExploratoryPublication
} from './exploratoryPublication';

const ROOT = 'a'.repeat(64);

function descriptor(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    snapshot: 'snapshot-2026-08-12',
    generated_at: '2026-08-12T09:30:00Z',
    plane_roots: { records: ROOT },
    exploratory_publication: {
      schema: 'okf-exploratory-publication.v1',
      publication_state: 'exploratory',
      snapshot_id: 'snapshot-2026-08-12',
      generated_at: '2026-08-12T09:30:00Z',
      applicable_plane_roots: { records: ROOT },
      publisher: {
        name: 'Independent Research Project',
        url: 'https://publisher.example.test/',
        authority_status: 'independent-research'
      },
      banner: {
        label: 'Exploratory',
        message: EXPLORATORY_BANNER_MESSAGE,
        feedback_url: 'https://feedback.example.test/issues/new?template=explore.yml',
        preserve_route: true
      },
      indexing_policy: 'noindex',
      limitations: ['Source coverage remains under review.'],
      permitted_claims: ['This snapshot is available for research and feedback.'],
      prohibited_claims: ['Do not claim release approval or completeness.'],
      promotion_rule: 'Owner review creates a fresh candidate.'
    },
    ...overrides
  };
}

describe('exploratory publication descriptor', () => {
  it('accepts and normalises a snapshot- and integrity-bound v1 block', () => {
    const result = parseExploratoryPublication(descriptor());
    expect(result.state).toBe('valid');
    expect(result.noindex).toBe(true);
    expect(result.publication).toMatchObject({
      snapshotId: 'snapshot-2026-08-12',
      applicablePlaneRoots: { records: ROOT },
      publisher: { name: 'Independent Research Project', authorityStatus: 'independent-research' },
      feedbackUrl: 'https://feedback.example.test/issues/new?template=explore.yml'
    });
  });

  it.each([
    ['an absent envelope state', {}],
    ['an explicit exploratory publication state', { publication_state: 'exploratory' }],
    ['a draft lifecycle status', { status: 'draft' }],
    ['an exploratory lifecycle status', { status: 'exploratory' }],
    ['a non-release descriptive status', { status: 'ai-generated-proof-of-concept' }]
  ])('accepts %s alongside the governed block', (_name, override) => {
    expect(parseExploratoryPublication(descriptor(override)).state).toBe('valid');
  });

  it.each([
    ['released', 'released'],
    ['case-normalised release', 'Released'],
    ['published', 'published'],
    ['stable', 'stable'],
    ['release approval', 'release-approved'],
    ['release candidate', 'release candidate'],
    ['production readiness', 'production-ready'],
    ['final', 'final'],
    ['authoritative', 'authoritative'],
    ['official', 'official-source'],
    ['complete', 'review-complete'],
    ['endorsed', 'owner-endorsed'],
    ['British owner authorisation', 'owner-authorised'],
    ['generally available', 'generally available'],
    ['hyphenated general availability', 'generally-available'],
    ['GA', 'GA']
  ])('fails closed on a %s envelope status', (_name, status) => {
    const result = parseExploratoryPublication(descriptor({ status }));
    expect(result.state).toBe('invalid');
    expect(result.noindex).toBe(true);
    expect(result.warning).toContain('release-like claim');
    expect(result.warning).toContain(status);
  });

  it.each(['released', 'draft', '', null])(
    'fails closed when an explicit envelope publication_state is %j',
    (publicationState) => {
      const result = parseExploratoryPublication(descriptor({
        publication_state: publicationState
      }));
      expect(result.state).toBe('invalid');
      expect(result.noindex).toBe(true);
      expect(result.warning).toContain(
        'descriptor envelope publication_state must be exploratory'
      );
    }
  );

  it('does not classify a normal descriptor as exploratory', () => {
    expect(parseExploratoryPublication({ title: 'Released pack' })).toEqual({
      state: 'not-exploratory',
      publication: null,
      warning: '',
      noindex: false
    });
  });

  it('honours a top-level noindex policy without inventing exploratory status', () => {
    expect(parseExploratoryPublication({ indexing_policy: 'noindex' })).toEqual({
      state: 'not-exploratory',
      publication: null,
      warning: '',
      noindex: true
    });
  });

  it('binds the established data-plane manifest root alias when plane_roots is absent', () => {
    const block = descriptor().exploratory_publication as Record<string, unknown>;
    const result = parseExploratoryPublication({
      ...descriptor(),
      plane_roots: undefined,
      data_plane_manifest_root_sha256: ROOT,
      exploratory_publication: {
        ...block,
        applicable_plane_roots: { data_plane_manifest: ROOT }
      }
    });
    expect(result.state).toBe('valid');
  });

  it('fails closed when descriptor snapshot aliases conflict', () => {
    const result = parseExploratoryPublication(descriptor({
      snapshot_id: 'snapshot-2026-08-12',
      snapshot: 'different-snapshot'
    }));
    expect(result.state).toBe('invalid');
    expect(result.warning).toContain('snapshot and snapshot_id conflict');
  });

  it('fails closed when descriptor data-plane root aliases conflict', () => {
    const block = descriptor().exploratory_publication as Record<string, unknown>;
    const result = parseExploratoryPublication(descriptor({
      plane_roots: { data_plane_manifest: ROOT },
      data_plane_manifest_root_sha256: 'b'.repeat(64),
      exploratory_publication: {
        ...block,
        applicable_plane_roots: { data_plane_manifest: ROOT }
      }
    }));
    expect(result.state).toBe('invalid');
    expect(result.warning).toContain(
      'plane_roots.data_plane_manifest conflicts with data_plane_manifest_root_sha256'
    );
  });

  it('fails closed when an exploratory descriptor omits its governed block', () => {
    const result = parseExploratoryPublication({ status: 'exploratory' });
    expect(result.state).toBe('invalid');
    expect(result.noindex).toBe(true);
    expect(result.warning).toContain('exploratory_publication is missing');
  });

  it.each([
    ['malformed', { exploratory_publication: [] }, 'is not an object'],
    ['unsupported schema', {
      exploratory_publication: {
        ...(descriptor().exploratory_publication as Record<string, unknown>),
        schema: 'okf-exploratory-publication.v2'
      }
    }, 'unsupported exploratory publication schema'],
    ['unknown field', {
      exploratory_publication: {
        ...(descriptor().exploratory_publication as Record<string, unknown>),
        release_approved: true
      }
    }, 'unsupported field'],
    ['unsafe feedback URL', {
      exploratory_publication: {
        ...(descriptor().exploratory_publication as Record<string, unknown>),
        banner: {
          ...((descriptor().exploratory_publication as Record<string, unknown>).banner as Record<string, unknown>),
          feedback_url: 'javascript:alert(1)'
        }
      }
    }, 'credential-free HTTP(S) URL']
  ])('warns and forces noindex for a %s block', (_name, override, expected) => {
    const result = parseExploratoryPublication(descriptor(override));
    expect(result.state).toBe('invalid');
    expect(result.noindex).toBe(true);
    expect(result.warning).toContain(expected);
  });

  it.each([
    ['snapshot', { snapshot: 'different-snapshot' }, 'snapshot identity'],
    ['generated time', { generated_at: '2026-08-12T10:00:00Z' }, 'generated_at'],
    ['plane root', { plane_roots: { records: 'b'.repeat(64) } }, 'integrity root']
  ])('fails closed on a %s integrity mismatch', (_name, override, expected) => {
    const result = parseExploratoryPublication(descriptor(override));
    expect(result.state).toBe('invalid');
    expect(result.noindex).toBe(true);
    expect(result.warning).toContain(expected);
  });

  it('enforces the published schema collection bounds and uniqueness', () => {
    const block = descriptor().exploratory_publication as Record<string, unknown>;
    const tooManyRoots = Object.fromEntries(
      Array.from({ length: 33 }, (_, index) => [`plane_${index}`, ROOT])
    );
    expect(parseExploratoryPublication(descriptor({
      plane_roots: tooManyRoots,
      exploratory_publication: { ...block, applicable_plane_roots: tooManyRoots }
    })).warning).toContain('between 1 and 32 plane roots');
    expect(parseExploratoryPublication(descriptor({
      exploratory_publication: {
        ...block,
        limitations: ['Repeated limitation.', 'Repeated limitation.']
      }
    })).warning).toContain('must not contain duplicate statements');
  });

  it('enforces the published schema string bounds', () => {
    const block = descriptor().exploratory_publication as Record<string, unknown>;
    expect(parseExploratoryPublication(descriptor({
      exploratory_publication: { ...block, snapshot_id: 's'.repeat(257) }
    })).warning).toContain('no longer than 256 characters');
    expect(parseExploratoryPublication(descriptor({
      exploratory_publication: { ...block, promotion_rule: 'p'.repeat(2049) }
    })).warning).toContain('no longer than 2048 characters');
  });
});

describe('exploratory feedback route', () => {
  it('preserves the exact review URL and explicit bundle, view, query, filters and route', () => {
    const reviewUrl = 'https://explorer.example.test/?bundle=https%3A%2F%2Fpack.test%2Fbundle.json&view=graph&q=probate&filter.topic=Housing#dataset%2Frecord-1';
    const url = new URL(buildExploratoryFeedbackUrl(
      'https://feedback.example.test/issues/new?template=explore.yml',
      {
        reviewUrl,
        bundleUrl: 'https://pack.test/bundle.json',
        view: 'graph',
        query: 'probate',
        filters: { topic: ['Housing'], publisher: ['Council', 'Council'] },
        route: 'dataset/record-1'
      }
    ));
    expect(url.searchParams.get('template')).toBe('explore.yml');
    expect(url.searchParams.get('okf_review_url')).toBe(reviewUrl);
    expect(url.searchParams.get('okf_bundle')).toBe('https://pack.test/bundle.json');
    expect(url.searchParams.get('okf_view')).toBe('graph');
    expect(url.searchParams.get('okf_query')).toBe('probate');
    expect(url.searchParams.getAll('okf_filter')).toEqual(['publisher=Council', 'topic=Housing']);
    expect(url.searchParams.get('okf_route')).toBe('dataset/record-1');
  });
});
