import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LargeCorpusDescriptor, LargeEndpointLabelIndex } from '$lib/types';
import { loadLargeCorpus } from '$lib/sources/largeCorpus';
import { sha256Hex } from '$lib/sources/releaseDataPlane';
import {
  endpointLabelEntryForInspection,
  endpointLabelForRoute,
  endpointTypeForRoute,
  decodeEndpointRouteSegment,
  encodeEndpointRouteSegment,
  isOpaqueEndpointIdentifier,
  largeRecordRoute,
  metadataEndpointRoute,
  MISSING_ENDPOINT_LABEL,
  normaliseEndpointLabelIndex
} from './endpointLabels';

const SNAPSHOT = 'endpoint-label-fixture-2026-08-12';
const AUTHORITY_SOURCE = 'https://example.test/research/label-review';

function labelIndex(snapshot = SNAPSHOT): LargeEndpointLabelIndex {
  const entries = [
    ['publisher/publisher-5f7670365c7dc347f281bbef', 'HM Land Registry', 'Organisation'],
    ['source/source-3b1fbf315fecd0fdd686c62a', 'GOV.UK probate guidance', 'Official source'],
    ['rights/rights-76093b40870d2f36982d4ca5', 'Open Government Licence v3.0', 'Rights statement'],
    ['activity/activity-24242a2da2dca5a6e0dbbbf7', 'Applying for probate', 'Citizen activity'],
    ['concept/probate', 'Probate', 'Concept']
  ].map(([route, label, type]) => ({
    route,
    label,
    language: 'en-GB',
    type,
    label_authority: {
      class: 'domain-profile',
      source: AUTHORITY_SOURCE
    },
    iri: `https://example.test/id/${route}`
  }));
  return {
    schema: 'okf-explorer-endpoint-label-index.v1',
    snapshot,
    generated_at: '2026-08-12T12:00:00Z',
    default_language: 'en-GB',
    opaque_identifier_patterns: [
      'publisher-*',
      'source-*',
      'rights-*',
      'activity-*',
      'catalogue-record-*',
      'concept-internal-*'
    ],
    entries,
    counts: { entries: entries.length }
  };
}

function jsonResponse(text: string): Response {
  return new Response(text, {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

async function corpusFixture(options: {
  labelSnapshot?: string;
  manifestHash?: string;
  manifestBytes?: number;
  manifestSnapshot?: string;
  descriptorIntegrityHash?: string;
  descriptorIntegrityBytes?: number;
} = {}) {
  const labels = labelIndex(options.labelSnapshot);
  const labelsText = JSON.stringify(labels);
  const labelsHash = await sha256Hex(labelsText);
  const reference = {
    path: 'data/labels/index.json',
    sha256: labelsHash,
    bytes: new TextEncoder().encode(labelsText).byteLength
  };
  const descriptor: LargeCorpusDescriptor = {
    schema: 'okf-explorer-large-corpus.v1',
    kind: 'okf-large-corpus',
    title: 'Endpoint label actual-consumer fixture',
    snapshot: options.manifestSnapshot || SNAPSHOT,
    entrypoints: {
      data_manifest: 'data/manifest.json',
      endpoint_labels: reference
    },
    entrypoint_integrity: {
      endpoint_labels: {
        ...reference,
        sha256: options.descriptorIntegrityHash || reference.sha256,
        bytes: options.descriptorIntegrityBytes || reference.bytes
      }
    },
    counts: { records: 0 }
  };
  const manifest = {
    title: descriptor.title,
    generated_at: '2026-08-12T12:00:00Z',
    snapshot: SNAPSHOT,
    counts: descriptor.counts,
    indexes: {
      overview: 'data/overview.json',
      endpoint_labels: {
        ...reference,
        sha256: options.manifestHash || reference.sha256,
        bytes: options.manifestBytes || reference.bytes
      }
    },
    chunks: {}
  };
  const payloads = new Map<string, string>([
    ['https://example.test/bundle/data/manifest.json', JSON.stringify(manifest)],
    [
      'https://example.test/bundle/data/overview.json',
      JSON.stringify({
        schema: 'okf-overview.v1',
        title: descriptor.title,
        generated_at: '2026-08-12T12:00:00Z',
        snapshot: SNAPSHOT,
        counts: descriptor.counts
      })
    ],
    ['https://example.test/bundle/data/labels/index.json', labelsText]
  ]);
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    requests.push(url);
    const body = payloads.get(url);
    return body === undefined
      ? new Response('', { status: 404, statusText: 'Not Found' })
      : jsonResponse(body);
  }));
  return { descriptor, requests };
}

describe('endpoint label/type index', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves off-shard endpoint labels and types while retaining raw identity for inspection', () => {
    const registry = normaliseEndpointLabelIndex(labelIndex(), SNAPSHOT);
    const route = 'activity/activity-24242a2da2dca5a6e0dbbbf7';

    expect(endpointLabelForRoute(registry, route, route)).toBe('Applying for probate');
    expect(endpointTypeForRoute(registry, route, 'activity')).toBe('Citizen activity');
    expect(endpointLabelEntryForInspection(registry, route)).toMatchObject({
      route,
      iri: `https://example.test/id/${route}`,
      label_authority: { class: 'domain-profile', source: AUTHORITY_SOURCE }
    });
  });

  it('uses one canonical safe encoding for multi-word metadata route segments', () => {
    expect([
      ['ArcGIS REST', 'ArcGIS%20REST'],
      ['Business & economy', 'Business%20%26%20economy'],
      ['100%', '100%25'],
      ['Caf\u00e9', 'Caf%C3%A9'],
      ['parent/child', 'parent%2Fchild']
    ].map(([raw, _encoded]) => encodeEndpointRouteSegment(raw))).toEqual([
      'ArcGIS%20REST',
      'Business%20%26%20economy',
      '100%25',
      'Caf%C3%A9',
      'parent%2Fchild'
    ]);
    expect(metadataEndpointRoute('topic', 'Education and skills')).toBe(
      'topic/Education%20and%20skills'
    );
    expect(decodeEndpointRouteSegment('Education%20and%20skills')).toBe(
      'Education and skills'
    );
  });

  it('prefers a search route, then a source-native record route, before deriving one from the name', () => {
    expect(largeRecordRoute({
      open: 'work/search-route',
      route: 'work/source-route',
      name: 'opaque-name'
    })).toBe('work/search-route');
    expect(largeRecordRoute({
      route: 'work/source-route',
      name: 'opaque-name'
    })).toBe('work/source-route');
    expect(largeRecordRoute({ name: 'fallback-name' })).toBe('dataset/fallback-name');
  });

  it.each([
    'topic/bare%',
    'topic/lower%2fslash',
    'topic/not%ZZhex',
    'topic/raw space',
    'topic/%41',
    'topic/%7E'
  ])(
    'rejects a non-canonical route escape: %s',
    (route) => {
      const fixture = labelIndex();
      fixture.entries[0].route = route;
      expect(() => normaliseEndpointLabelIndex(fixture, SNAPSHOT)).toThrow(
        'route is not a safe local route'
      );
    }
  );

  it('turns configured and hash-style opaque fallbacks into an explicit quality defect', () => {
    const registry = normaliseEndpointLabelIndex(labelIndex(), SNAPSHOT);

    expect(
      endpointLabelForRoute(
        registry,
        'concept/concept-internal-123',
        'concept-internal-123'
      )
    ).toBe(MISSING_ENDPOINT_LABEL);
    expect(
      endpointLabelForRoute(
        undefined,
        'publisher/publisher-5f7670365c7dc347f281bbef',
        'publisher-5f7670365c7dc347f281bbef'
      )
    ).toBe(MISSING_ENDPOINT_LABEL);
    expect(isOpaqueEndpointIdentifier('Everyday readable name')).toBe(false);
  });

  it('exposes an incomplete advertised index even when a readable fallback exists', () => {
    const registry = normaliseEndpointLabelIndex(labelIndex(), SNAPSHOT);
    expect(
      endpointLabelForRoute(
        registry,
        'organisation/unindexed-body',
        'Plausible but ungoverned fallback'
      )
    ).toBe(MISSING_ENDPOINT_LABEL);
  });

  it.each([
    ['label', MISSING_ENDPOINT_LABEL],
    ['type', MISSING_ENDPOINT_LABEL],
    ['type', 'publisher-0123456789abcdef']
  ] as const)('rejects an unreadable governed %s', (field, value) => {
    const fixture = labelIndex();
    fixture.entries[0][field] = value;
    expect(() => normaliseEndpointLabelIndex(fixture, SNAPSHOT)).toThrow(
      field === 'label' ? /reserved missing-label|readable label/ : /readable label/
    );
  });

  it('rejects equivalent duplicates instead of silently multiplying projections', () => {
    const fixture = labelIndex();
    fixture.entries.push({ ...fixture.entries[0] });
    fixture.counts.entries += 1;
    expect(() => normaliseEndpointLabelIndex(fixture, SNAPSHOT)).toThrow(
      'Endpoint label route is duplicated'
    );
  });

  it('rejects conflicting labels, types and authorities for the same route', () => {
    const fixture = labelIndex();
    fixture.entries.push({
      ...fixture.entries[0],
      label: 'Conflicting publisher label',
      type: 'Conflicting type',
      label_authority: {
        class: 'editorial',
        source: 'https://example.test/research/conflict'
      }
    });
    fixture.counts.entries += 1;
    expect(() => normaliseEndpointLabelIndex(fixture, SNAPSHOT)).toThrow(
      'Endpoint label route has conflicting declarations'
    );
  });

  it('loads the integrity-bound index through the actual large-corpus consumer without record hydration', async () => {
    const { descriptor, requests } = await corpusFixture();
    const source = await loadLargeCorpus(
      'https://example.test/bundle/okf-explorer.json',
      descriptor
    );

    expect(source.endpointLabels?.document.snapshot).toBe(SNAPSHOT);
    expect(
      endpointLabelForRoute(
        source.endpointLabels,
        'source/source-3b1fbf315fecd0fdd686c62a'
      )
    ).toBe('GOV.UK probate guidance');
    expect(requests).toEqual([
      'https://example.test/bundle/data/manifest.json',
      'https://example.test/bundle/data/overview.json',
      'https://example.test/bundle/data/labels/index.json'
    ]);
  });

  it('fails closed before label consumption when descriptor and manifest integrity differ', async () => {
    const { descriptor } = await corpusFixture({ manifestHash: 'f'.repeat(64) });
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json', descriptor)
    ).rejects.toThrow('endpoint label index bindings differ');
  });

  it('fails closed before label consumption when descriptor and manifest byte counts differ', async () => {
    const { descriptor } = await corpusFixture({ manifestBytes: 1 });
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json', descriptor)
    ).rejects.toThrow('endpoint label index bindings differ');
  });

  it('fails closed when duplicate descriptor bindings disagree on SHA-256', async () => {
    const { descriptor } = await corpusFixture({
      descriptorIntegrityHash: 'f'.repeat(64)
    });
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json', descriptor)
    ).rejects.toThrow('entrypoint and integrity SHA-256 differ for endpoint_labels');
  });

  it('fails closed when duplicate descriptor bindings disagree on byte count', async () => {
    const { descriptor } = await corpusFixture({ descriptorIntegrityBytes: 1 });
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json', descriptor)
    ).rejects.toThrow('entrypoint and integrity byte count differ for endpoint_labels');
  });

  it('fails closed before label consumption when descriptor and manifest snapshots differ', async () => {
    const { descriptor } = await corpusFixture({ manifestSnapshot: 'different-snapshot' });
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json', descriptor)
    ).rejects.toThrow('endpoint label index snapshots differ');
  });

  it('fails closed when an integrity-valid label index belongs to another snapshot', async () => {
    const { descriptor } = await corpusFixture({ labelSnapshot: 'different-snapshot' });
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json', descriptor)
    ).rejects.toThrow('snapshot differs from the loaded bundle snapshot');
  });
});
