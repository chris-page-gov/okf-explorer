import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  baseUrlFor,
  declaredDescriptorCandidates,
  fetchJson,
  fetchSourceJson,
  fetchSourceResponse,
  fetchStructuredDocument,
  fetchStructuredDocumentWithFallback,
  MAX_JSON_BYTES,
  MAX_SOURCE_JSON_BYTES,
  movedBundleTarget,
  parseStructuredDocumentText,
  readResponseText,
  resolveUrl,
  sourceJsonCandidates
} from './fetch';
import { CHUNK_FETCH_BATCH_SIZE, loadLargeCorpus, MAX_RELATIONSHIP_ROWS, relationshipBucket } from './largeCorpus';
import { sha256Hex } from './releaseDataPlane';
import { loadHistory, loadRegistry, rememberHistory } from './registry';
import { normalizeSmallBundle } from './smallBundle';
import { makeRangePackFixture, rangeResponse } from '../../test/rangePackFixture';
import type { OkfBundle } from '$lib/types';

function mockLocalStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => {
      values.clear();
    })
  };
}

function jsonResponse(value: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: { 'content-type': 'application/json' }
  });
}

function providerDatapackFixture(snapshot = 'snapshot-one') {
  return {
    schema: 'okf-explorer-provider-datapack.v1',
    snapshot,
    id: 'provider-one',
    provider: {
      id: 'provider-one',
      title: 'Provider One',
      liveServiceUrl: 'https://provider.example/live/',
      repositoryUrl: 'https://provider.example/source/'
    },
    selector: { field: 'source_surface', operator: 'equals', value: 'provider-one' },
    governedSnapshot: {
      status: 'governed-pinned-snapshot',
      label: 'Governed snapshot',
      snapshotId: snapshot,
      recordCount: 1,
      sourceCommit: 'a'.repeat(40),
      sourceCommitShort: 'aaaaaaa',
      sourceAsOf: '2026-07-17T00:00:00Z',
      sourceAsOfBasis: 'verified source revision',
      metadataOnly: true,
      observationsIncluded: false,
      records: [
        {
          recordId: 'provider-one:record-one',
          title: 'Provider record one',
          metadataModified: '2026-07-17'
        }
      ]
    },
    reviewedLiveReference: {
      status: 'reviewed-reference-not-live-validated',
      label: 'Reviewed reference',
      lastChecked: '2026-07-23',
      network: 'external',
      liveServiceUrl: 'https://provider.example/live/',
      repositoryUrl: 'https://provider.example/source/',
      sourceCommit: 'b'.repeat(40),
      sourceCommitShort: 'bbbbbbb',
      sourceCommitAsOf: '2026-07-22T00:00:00Z',
      metadataInputSha256: 'c'.repeat(64),
      records: [
        {
          recordId: 'provider-one:record-one',
          title: 'Provider record one',
          metadataModified: '2026-07-22'
        }
      ]
    },
    comparison: {
      status: 'known-drift',
      comparisonAsOf: '2026-07-23',
      summary: 'A reviewed difference is known.',
      evidenceScope: 'reviewed-record-examples',
      exhaustive: false,
      executionRequiresLiveValidation: true,
      differences: [
        {
          recordId: 'provider-one:record-one',
          title: 'Provider record one',
          fields: [
            {
              field: 'metadataModified',
              snapshot: '2026-07-17',
              reviewedLiveReference: '2026-07-22'
            }
          ]
        }
      ]
    },
    presentation: {
      snapshotLabel: 'Snapshot',
      liveLabel: 'Reviewed reference',
      lastCheckedWording: 'Last checked 23 July 2026.',
      notice: 'The external service may have changed.',
      actions: [
        {
          id: 'open-provider',
          label: 'Open provider',
          kind: 'external-link',
          urlTemplate: 'https://provider.example/live/',
          network: 'external'
        }
      ]
    }
  };
}

function governedTermsFixture(snapshot = 'snapshot-one') {
  return {
    schema: 'okf-explorer-governed-terms.v1',
    title: 'Fixture terms',
    snapshot,
    generated_at: '2026-07-26T12:00:00Z',
    review: {
      applicationStatus: 'validated-for-bounded-use',
      checkedAt: '2026-07-26T12:00:00Z',
      checkedBy: 'process:fixture-review',
      liveLookupPerformed: false,
      method: 'curated-static-specification-review',
      scope: 'Fixture UI metadata.'
    },
    vocabularies: [
      {
        id: 'fixture-ui-v1',
        namespace: 'https://example.test/ui/',
        prefix: 'ui',
        source: 'https://example.test/bundle/data/terms.json',
        title: 'Fixture UI vocabulary',
        version: '1'
      }
    ],
    terms: [
      {
        id: 'ui:access-model',
        iri: 'https://example.test/ui/access-model',
        label: 'Access model',
        kind: 'ui-term',
        definition: 'How access requirements are described.',
        application: 'Explorer help key access-model.',
        vocabulary: 'fixture-ui-v1',
        provenance: {
          vocabulary: 'fixture-ui-v1',
          resource: 'https://example.test/bundle/data/terms.json',
          version: '1'
        },
        validation: {
          recognition: 'validated',
          meaning: 'validated',
          application: 'validated',
          method: 'curated-static-specification-review',
          checkedBy: 'process:fixture-review',
          checkedAt: '2026-07-26T12:00:00Z'
        },
        status: 'validated',
        helpKey: 'access-model',
        usage: []
      }
    ],
    counts: { vocabularies: 1, standardsTerms: 0, uiTerms: 1 }
  };
}

function governedTermValidationFixture(snapshot = 'snapshot-one') {
  return {
    schema: 'okf-explorer-governed-term-validation.v1',
    snapshot,
    generated_at: '2026-07-26T12:00:00Z',
    status: 'conformant',
    checkedAt: '2026-07-26T12:00:00Z',
    checkedBy: 'process:fixture-review',
    method: 'curated-static-specification-review',
    scope: 'Fixture UI metadata.',
    liveLookupPerformed: false,
    checks: {
      authoritativeProvenance: 'passed',
      boundedApplicationReviewed: 'passed',
      generatedTermCoverage: 'passed',
      meaningReviewed: 'passed',
      namespaceExpansion: 'passed',
      termRecognition: 'passed',
      termKindDeclared: 'passed',
      uniqueIdentifiers: 'passed'
    },
    counts: {
      registeredTerms: 1,
      unregisteredTerms: 0,
      unusedStandardsTerms: 0,
      pendingApplicationReviews: 0
    },
    limitations: ['Closed-world fixture validation.'],
    unregisteredTerms: [],
    unusedStandardsTerms: [],
    pendingApplicationReviews: []
  };
}

describe('fetch helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves bundle-relative URLs and reports HTTP failures', async () => {
    expect(resolveUrl('data/manifest.json', 'https://example.test/repo/okf-explorer.json')).toBe('https://example.test/repo/data/manifest.json');
    expect(baseUrlFor('https://example.test/repo/okf-explorer.json')).toBe('https://example.test/repo/');

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })));
    await expect(fetchJson<{ ok: boolean }>('https://example.test/data.json')).resolves.toEqual({ ok: true });

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: true }, { status: 404, statusText: 'Not Found' })));
    await expect(fetchJson('https://example.test/missing.json')).rejects.toThrow('404 Not Found');
  });

  it('resolves machine-readable moved bundle descriptors', () => {
    expect(
      movedBundleTarget(
        { kind: 'okf-moved', moved_to: 'https://canonical.example/okf-explorer.json' },
        'https://legacy.example/okf-explorer.json'
      )
    ).toBe('https://canonical.example/okf-explorer.json');
    expect(movedBundleTarget({ kind: 'okf-large-corpus' }, 'https://legacy.example/okf-explorer.json')).toBeNull();
    expect(() => movedBundleTarget({ kind: 'okf-moved' }, 'https://legacy.example/okf-explorer.json')).toThrow('missing moved_to');
    expect(() =>
      movedBundleTarget(
        { kind: 'okf-moved', moved_to: 'https://legacy.example/okf-explorer.json' },
        'https://legacy.example/okf-explorer.json'
      )
    ).toThrow('points to itself');
  });

  it('retries transient HTTP failures before surfacing an error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: true }, { status: 503, statusText: 'Service Unavailable' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson<{ ok: boolean }>('https://example.test/flaky.json', 30000, 2, 0)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects responses that report a content-length above the cap', async () => {
    const oversized = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(MAX_JSON_BYTES + 1) : null) },
      json: async () => ({ ok: true })
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => oversized));
    await expect(fetchJson('https://example.test/huge.json')).rejects.toThrow('response too large');
  });

  it('allows responses at or under the content-length cap', async () => {
    const atCap = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(MAX_JSON_BYTES) : null) },
      text: async () => '{"ok":true}'
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => atCap));
    await expect(fetchJson<{ ok: boolean }>('https://example.test/atcap.json')).resolves.toEqual({ ok: true });
  });

  it('rejects streamed responses that exceed the byte cap without content-length', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"ok":'));
          controller.enqueue(new TextEncoder().encode('"too large"}'));
          controller.close();
        }
      })
    );

    await expect(readResponseText(response, 'https://example.test/chunked.json', 8)).rejects.toThrow('response too large');
  });

  it('reads streamed responses within the byte cap', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"ok":true}'));
          controller.close();
        }
      })
    );

    await expect(readResponseText(response, 'https://example.test/chunked.json', 64)).resolves.toBe('{"ok":true}');
  });

  it('content-sniffs JSON and safely parses YAML-LD served as octet-stream', async () => {
    expect(
      parseStructuredDocumentText<{ schema: string }>(
        '{"schema":"okf-explorer-federation.v1"}',
        'https://example.test/federation.json',
        'application/octet-stream'
      )
    ).toEqual({ schema: 'okf-explorer-federation.v1' });
    expect(
      parseStructuredDocumentText<{ schema: string; enabled: boolean; date: string }>(
        'schema: okf-explorer-federation.v1\nenabled: true\ndate: 2026-07-25\n',
        'https://example.test/federation.yamlld',
        'application/octet-stream'
      )
    ).toEqual({
      schema: 'okf-explorer-federation.v1',
      enabled: true,
      date: '2026-07-25'
    });
    expect(() =>
      parseStructuredDocumentText(
        'schema: unsafe',
        'https://example.test/federation.txt',
        'text/html'
      )
    ).toThrow('neither JSON nor explicitly declared YAML-LD');
    expect(() =>
      parseStructuredDocumentText(
        'one: &shared [1, 2]\ntwo: *shared\n',
        'https://example.test/federation.yamlld',
        'application/octet-stream'
      )
    ).toThrow('unsafe or cyclic YAML-LD');
    expect(() =>
      parseStructuredDocumentText(
        '? [not, a, string]\n: invalid\n',
        'https://example.test/federation.yamlld',
        'application/octet-stream'
      )
    ).toThrow('mapping keys must be strings');
  });

  it('retrieves YAML-LD through the structured document fetcher', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('schema: okf-explorer-federation.v1\nkind: okf-federation\n', {
        headers: { 'content-type': 'application/octet-stream' }
      })
    ));
    const response = await fetchStructuredDocument<Record<string, string>>(
      'https://example.test/federation.yamlld',
      30000,
      1,
      0
    );
    expect(response.document.kind).toBe('okf-federation');
    expect(response.contentType).toBe('application/octet-stream');
  });

  it('uses only declared loadable descriptor fallbacks in priority order', async () => {
    const primary = 'https://pages.example/whole-law/okf-explorer.json';
    const routes = [
      {
        kind: 'repository',
        purpose: 'source',
        url: 'https://github.com/example/whole-law'
      },
      {
        kind: 'raw',
        purpose: 'descriptor',
        priority: 20,
        url: 'https://raw.example/main/bundle/whole-law/okf-explorer.json'
      },
      {
        kind: 'published',
        purpose: 'descriptor',
        priority: 10,
        url: 'https://mirror.example/whole-law/okf-explorer.json'
      }
    ];
    expect(declaredDescriptorCandidates(primary, routes)).toEqual([
      primary,
      'https://mirror.example/whole-law/okf-explorer.json',
      'https://raw.example/main/bundle/whole-law/okf-explorer.json'
    ]);

    const fetchMock = vi.fn(async (url: string) =>
      url === primary
        ? jsonResponse({ error: true }, { status: 404, statusText: 'Not Found' })
        : jsonResponse({ schema: 'okf-explorer-federation.v1' })
    );
    vi.stubGlobal('fetch', fetchMock);
    const recovered = await fetchStructuredDocumentWithFallback<{ schema: string }>(
      primary,
      routes,
      30000,
      1,
      0
    );
    expect(recovered.document.schema).toBe('okf-explorer-federation.v1');
    expect(recovered.responseUrl).toBe('https://mirror.example/whole-law/okf-explorer.json');
    expect(recovered.attemptedUrls).toEqual([
      primary,
      'https://mirror.example/whole-law/okf-explorer.json'
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('loads bounded external source JSON with response provenance', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('{"success":true}', {
        headers: { 'content-type': 'application/json; charset=utf-8' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchSourceJson('https://example.test/api/record');
    expect(response.json).toEqual({ success: true });
    expect(response.bytes).toBe(16);
    expect(response.contentType).toBe('application/json; charset=utf-8');
    expect(response.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.responseUrl).toBe('https://example.test/api/record');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/record',
      expect.objectContaining({ headers: { Accept: 'application/json, application/*+json;q=0.9' } })
    );
  });

  it('requests and returns XML as escaped display text without JSON parsing', async () => {
    const xml = '<service><title>Official route</title></service>';
    const fetchMock = vi.fn(async () => new Response(xml, { headers: { 'content-type': 'application/xml' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchSourceResponse('https://example.test/route.xml', 'xml', 'application/xml', 15000, 1, 0);
    expect(response.data).toBeNull();
    expect(response.text).toBe(xml);
    expect(response.displayMode).toBe('xml');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/route.xml',
      expect.objectContaining({ headers: { Accept: 'application/xml, text/xml;q=0.9, application/*+xml;q=0.8' } })
    );
  });

  it('requests plain text without applying the JSON endpoint fallback', async () => {
    const fetchMock = vi.fn(async () => new Response('Current official guidance', { headers: { 'content-type': 'text/plain' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchSourceResponse('https://data.gov.uk/api/action/example', 'text', 'text/plain', 15000, 1, 0);
    expect(response.text).toBe('Current official guidance');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://data.gov.uk/api/action/example',
      expect.objectContaining({ headers: { Accept: 'text/plain, text/*;q=0.9' } })
    );
  });

  it('uses a smaller display cap for external source responses', async () => {
    const oversized = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(MAX_SOURCE_JSON_BYTES + 1) : null) }
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => oversized));

    await expect(fetchSourceJson('https://example.test/api/huge', 15000, 1, 0)).rejects.toThrow('response too large');
  });

  it('resolves legacy data.gov.uk action URLs through the browser-readable CKAN host', async () => {
    const legacy = 'https://data.gov.uk/api/action/package_show?id=example';
    const canonical = 'https://ckan.publishing.service.gov.uk/api/3/action/package_show?id=example';
    expect(sourceJsonCandidates(legacy)).toEqual([canonical, legacy]);
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await fetchSourceJson(legacy, 15000, 1, 0);
    expect(response.json).toEqual({ success: true });
    expect(response.responseUrl).toBe(canonical);
    expect(fetchMock).toHaveBeenCalledWith(canonical, expect.any(Object));
  });

  it('decompresses explicit gzip corpus chunks before parsing', async () => {
    const source = new Response('{"ok":true}').body!;
    const compressed = await new Response(source.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    await expect(readResponseText(new Response(compressed), 'https://example.test/works-0.json.gz', 64)).resolves.toBe('{"ok":true}');
  });
});

describe('small bundle normalisation', () => {
  it('normalises explicit YAML-LD graph nodes and rich directed assertions without remote context expansion', () => {
    const corpus = normalizeSmallBundle({
      '@context': 'https://example.test/pinned-context.jsonld',
      '@id': 'https://example.test/bundle',
      '@type': 'okf:Bundle',
      okf_version: '0.2',
      title: 'Semantic journey',
      '@graph': [
        {
          '@id': 'https://example.test/service/birth-registration',
          '@type': 'https://example.test/ns#Service',
          route: 'service/birth-registration',
          title: 'Register a birth'
        },
        {
          '@id': 'https://example.test/organisation/register-office',
          '@type': 'https://example.test/ns#Organisation',
          route: 'organisation/register-office',
          title: 'Register office'
        },
        {
          '@id': 'https://example.test/assertion/birth-registration-provider',
          '@type': ['rdf:Statement', 'okf:RelationshipAssertion'],
          source: { '@id': 'https://example.test/service/birth-registration' },
          predicate: { '@id': 'https://example.test/ns#providedBy' },
          target: { '@id': 'https://example.test/organisation/register-office' },
          kind: 'provided by',
          label: 'provided by',
          inverse_label: 'provides',
          assertion_status: 'normalized',
          assertion_scope: 'real-world',
          authority: {
            class: 'derived',
            label: 'Deterministic projection',
            source: 'https://example.test/source/services'
          },
          derivation: 'https://example.test/rules/provider-copy-v1',
          observed_at: '2026-08-09T00:00:00Z',
          evidence: [{
            '@id': 'https://example.test/evidence/birth-registration-provider',
            type: 'source-record',
            url: 'https://example.test/source/services/birth-registration',
            source_artifact: 'source/services.yaml',
            source_field: 'provider',
            source_value_sha256: 'a'.repeat(64),
            retrieved_at: '2026-08-09T00:00:00Z'
          }],
          rights: {
            source: 'https://example.test/terms',
            assertion: 'Example terms apply.'
          }
        }
      ]
    } as unknown as OkfBundle);

    expect(corpus.nodes['service/birth-registration']).toEqual(expect.objectContaining({
      title: 'Register a birth',
      semantic_id: 'https://example.test/service/birth-registration'
    }));
    expect(corpus.relationships).toEqual([
      expect.objectContaining({
        id: 'https://example.test/assertion/birth-registration-provider',
        source: 'service/birth-registration',
        target: 'organisation/register-office',
        source_iri: 'https://example.test/service/birth-registration',
        target_iri: 'https://example.test/organisation/register-office',
        predicate: 'https://example.test/ns#providedBy',
        kind: 'provided by',
        inverse_label: 'provides',
        assertion_status: 'normalized',
        assertion_scope: 'real-world'
      })
    ]);
    expect(corpus.meta?.semantic_source).toBe(true);
  });

  it('does not invent local routes from semantic IRIs or accept unsafe declared routes', () => {
    expect(() => normalizeSmallBundle({
      '@context': 'https://example.test/pinned-context.jsonld',
      '@id': 'https://example.test/bundle',
      '@graph': [
        {
          '@id': 'https://example.test/service/no-route',
          '@type': 'https://example.test/ns#Service',
          title: 'Missing route'
        },
        {
          '@id': 'https://example.test/organisation/unsafe-route',
          '@type': 'https://example.test/ns#Organisation',
          route: 'https://example.test/not-local',
          title: 'Unsafe route'
        },
        {
          '@id': 'https://example.test/assertion/without-routes',
          '@type': 'okf:RelationshipAssertion',
          source: { '@id': 'https://example.test/service/no-route' },
          source_route: '../service/no-route',
          predicate: { '@id': 'https://example.test/ns#providedBy' },
          target: { '@id': 'https://example.test/organisation/unsafe-route' },
          label: 'provided by'
        }
      ]
    } as unknown as OkfBundle)).toThrow('requires an explicit safe local route');
  });

  it('fails closed when an explicit semantic assertion omits governed evidence fields', () => {
    expect(() => normalizeSmallBundle({
      '@context': 'https://example.test/pinned-context.jsonld',
      '@id': 'https://example.test/bundle',
      '@graph': [
        {
          '@id': 'https://example.test/source/one',
          route: 'source/one',
          title: 'Source one'
        },
        {
          '@id': 'https://example.test/target/one',
          route: 'target/one',
          title: 'Target one'
        },
        {
          '@id': 'https://example.test/assertion/incomplete',
          '@type': 'okf:RelationshipAssertion',
          source: 'https://example.test/source/one',
          predicate: 'https://example.test/predicate/related',
          target: 'https://example.test/target/one',
          label: 'related to'
        }
      ]
    } as unknown as OkfBundle)).toThrow('requires kind');
  });

  it('rejects relationship-shaped graph rows that omit RelationshipAssertion type', () => {
    expect(() => normalizeSmallBundle({
      '@context': 'https://example.test/pinned-context.jsonld',
      '@id': 'https://example.test/bundle',
      '@graph': [
        {
          '@id': 'https://example.test/source/one',
          route: 'source/one'
        },
        {
          '@id': 'https://example.test/target/one',
          route: 'target/one'
        },
        {
          '@id': 'https://example.test/assertion/missing-type',
          source: 'https://example.test/source/one',
          predicate: 'https://example.test/predicate/related',
          target: 'https://example.test/target/one'
        }
      ]
    } as unknown as OkfBundle)).toThrow('must declare RelationshipAssertion type');
  });

  it('normalises top-level bundle nodes and relationships', () => {
    const corpus = normalizeSmallBundle({
      meta: { title: 'Bundle title', description: 'Bundle description' },
      nodes: {
        a: { id: 'raw-a', title: 'Alpha', aliases: 'A; Alpha service', tags: 'one; two' },
        b: { id: 'custom-b', name: 'Beta' },
        c: { id: 'custom-c', label: 'Gamma' },
        d: { id: 'custom-d' }
      },
      relationships: [
        { source: 'a', target: 'custom-b', kind: 'related' },
        { source: 'b', target: 'c', type: 'typed' },
        { source: 'c', target: 'd', label: 'labelled' },
        { source: '', target: 'd', kind: 'missing source' }
      ]
    } as unknown as OkfBundle);

    expect(corpus.title).toBe('Bundle title');
    expect(corpus.description).toBe('Bundle description');
    expect(corpus.nodes.a.id).toBe('a');
    expect(corpus.nodes.a.aliases).toEqual(['A', 'Alpha service']);
    expect(corpus.nodes.a.tags).toEqual(['one', 'two']);
    expect(corpus.nodes.b.id).toBe('b');
    expect(corpus.nodes.b.title).toBe('Beta');
    expect(corpus.nodes.c.title).toBe('Gamma');
    expect(corpus.nodes.d.title).toBe('d');
    expect(corpus.nodes.d.type).toBe('Node');
    expect(corpus.nodes.d.section).toBe('root');
    expect(corpus.relationships).toEqual([
      { source: 'a', target: 'custom-b', kind: 'related' },
      { source: 'b', target: 'c', type: 'typed', kind: 'typed' },
      { source: 'c', target: 'd', label: 'labelled', kind: 'labelled' }
    ]);
  });

  it('uses the first corpus when corpora are present', () => {
    const corpus = normalizeSmallBundle({
      corpora: {
        first: {
          id: 'first',
          title: 'First corpus',
          nodes: { a: { id: 'a', title: 'Alpha' } },
          relationships: []
        },
        second: {
          id: 'second',
          title: 'Second corpus',
          nodes: { b: { id: 'b', title: 'Beta' } },
          relationships: []
        }
      }
    });

    expect(corpus.id).toBe('first');
    expect(Object.keys(corpus.nodes)).toEqual(['a']);
  });

  it('accepts generator-style edges at bundle and corpus scope', () => {
    const bundleEdges = normalizeSmallBundle({
      nodes: {
        a: { id: 'a', title: 'Alpha' },
        b: { id: 'b', title: 'Beta' }
      },
      edges: [{ source: 'a', target: 'b', type: 'generated edge' }]
    });
    expect(bundleEdges.relationships).toEqual([
      { source: 'a', target: 'b', type: 'generated edge', kind: 'generated edge' }
    ]);

    const corpusEdges = normalizeSmallBundle({
      corpora: {
        selected: {
          nodes: {
            a: { id: 'a', title: 'Alpha' },
            b: { id: 'b', title: 'Beta' }
          },
          edges: [{ source: 'b', target: 'a', label: 'corpus edge' }]
        }
      }
    }, 'selected');
    expect(corpusEdges.relationships).toEqual([
      { source: 'b', target: 'a', label: 'corpus edge', kind: 'corpus edge' }
    ]);
  });

  it('retains a separately declared default-off synthetic semantic corpus', () => {
    const corpus = normalizeSmallBundle({
      extensions: {
        'okf-semantic-model.v1': {
          schema: 'okf-semantic-model.v1',
          status: 'experimental'
        }
      },
      corpora: {
        assurance: {
          id: 'assurance',
          title: 'Synthetic assurance fixture',
          nodes: { a: { id: 'a', title: 'Synthetic asset' } },
          relationships: [{
            source: 'a', target: 'a', predicate: 'dcterms:references',
            assertion_scope: 'synthetic-fixture', authority: { class: 'synthetic' }
          }],
          assertion_scope: 'synthetic-fixture',
          default_loaded: false,
          include_in_counts: false,
          include_in_search: false
        }
      }
    } as unknown as OkfBundle, 'assurance');

    expect(corpus.assertionScope).toBe('synthetic-fixture');
    expect(corpus.defaultLoaded).toBe(false);
    expect(corpus.includeInCounts).toBe(false);
    expect(corpus.includeInSearch).toBe(false);
    expect(corpus.meta?.semantic_model).toEqual(expect.objectContaining({
      schema: 'okf-semantic-model.v1'
    }));
  });

  it('does not select a default-off synthetic corpus ahead of a faithful corpus', () => {
    const corpus = normalizeSmallBundle({
      meta: { default_corpus: 'synthetic' },
      corpora: {
        synthetic: {
          id: 'synthetic',
          title: 'Synthetic supplement',
          nodes: { synthetic: { id: 'synthetic', title: 'Invented record' } },
          assertion_scope: 'synthetic-fixture',
          default_loaded: false,
          include_in_counts: false,
          include_in_search: false
        },
        faithful: {
          id: 'faithful',
          title: 'Faithful source corpus',
          nodes: { official: { id: 'official', title: 'Source-backed record' } },
          assertion_scope: 'real-world',
          default_loaded: true
        }
      }
    } as unknown as OkfBundle);

    expect(corpus.id).toBe('faithful');
    expect(corpus.assertionScope).toBe('real-world');
    expect(Object.keys(corpus.nodes)).toEqual(['official']);
  });

  it('normalises an empty small bundle to safe defaults', () => {
    const corpus = normalizeSmallBundle({} as OkfBundle);

    expect(corpus.id).toBe('default');
    expect(corpus.title).toBe('OKF bundle');
    expect(corpus.description).toBe('');
    expect(corpus.nodes).toEqual({});
    expect(corpus.relationships).toEqual([]);
  });

  it('honours preferred corpora and falls back to bundle-level nodes and metadata', () => {
    const bundle = {
      title: 'Bundle fallback title',
      nodes: { fallback: { id: 'fallback', title: 'Fallback node' } },
      relationships: [{ source: 'fallback', target: 'fallback' }],
      corpora: {
        empty: {
          id: 'empty',
          description: 'Empty corpus'
        },
        selected: {
          id: 'selected',
          title: 'Selected corpus',
          nodes: { selected: { id: 'selected', title: 'Selected node' } },
          relationships: []
        }
      }
    } as unknown as OkfBundle;

    const fallbackCorpus = normalizeSmallBundle(bundle);
    expect(fallbackCorpus.id).toBe('empty');
    expect(fallbackCorpus.title).toBe('Bundle fallback title');
    expect(Object.keys(fallbackCorpus.nodes)).toEqual(['fallback']);
    expect(fallbackCorpus.relationships).toEqual([{ source: 'fallback', target: 'fallback', kind: 'related' }]);

    const selectedCorpus = normalizeSmallBundle(bundle, 'selected');
    expect(selectedCorpus.id).toBe('selected');
    expect(selectedCorpus.title).toBe('Selected corpus');
    expect(Object.keys(selectedCorpus.nodes)).toEqual(['selected']);
  });
});

describe('registry and history', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores bundle history as newest unique entries', () => {
    rememberHistory({ title: 'First', url: 'https://example.test/one.json' });
    rememberHistory({ title: 'Second', url: 'https://example.test/two.json' });
    rememberHistory({ title: 'First again', url: 'https://example.test/one.json' });

    expect(loadHistory()).toEqual([
      expect.objectContaining({ title: 'First again', url: 'https://example.test/one.json', kind: 'history' }),
      expect.objectContaining({ title: 'Second', url: 'https://example.test/two.json', kind: 'history' })
    ]);
  });

  it('ignores corrupted history storage', () => {
    localStorage.setItem('okfExplorerBundleHistory:v2', '{not json');
    expect(loadHistory()).toEqual([]);
  });

  it('ignores non-array history storage and caps the stored list', () => {
    localStorage.setItem('okfExplorerBundleHistory:v2', JSON.stringify({ url: 'https://example.test/not-array.json' }));
    expect(loadHistory()).toEqual([]);

    for (let index = 0; index < 25; index += 1) {
      rememberHistory({ title: `Bundle ${index}`, url: `https://example.test/${index}.json` });
    }
    expect(loadHistory()).toHaveLength(20);
    expect(loadHistory()[0].url).toBe('https://example.test/24.json');
  });

  it('loads registry entries and degrades to an empty registry on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          bundles: [{ title: 'Bundle', url: 'https://example.test/bundle.json' }],
          entries: [{ title: 'Large', url: 'https://example.test/large.json' }, { title: 'Broken' }]
        })
      )
    );
    await expect(loadRegistry('https://example.test/registry.json')).resolves.toHaveLength(2);

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 500, statusText: 'Server Error' })));
    await expect(loadRegistry('https://example.test/registry.json')).resolves.toEqual([]);
  });

  it('ignores registry entries without URLs when bundles or entries are absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          entries: [{ title: 'Missing URL' }, { title: 'Valid', url: 'https://example.test/valid.json' }]
        })
      )
    );

    await expect(loadRegistry('https://example.test/registry.json')).resolves.toEqual([
      { title: 'Valid', url: 'https://example.test/valid.json' }
    ]);
  });

  it('handles empty registry payloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({})));
    await expect(loadRegistry('https://example.test/registry.json')).resolves.toEqual([]);
  });
});

describe('large corpus source', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads descriptors, overview analysis, chunks and lazy relationship indexes', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            overview_index: 'data/overview.json',
            analysis_overview: 'data/analysis/overview.json',
            presentation: 'data/presentation.json',
            operational_metadata: 'data/operational-metadata.json'
          },
          counts: { datasets: 1, resources: 2, relationships: 1 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 1, resources: 2, relationships: 1 },
          indexes: {
            overview: 'data/overview.json',
            facets: 'data/facets.json',
            graph: 'data/graph.json',
            govuk_content: 'data/govuk.json',
            relationship_adjacency: 'data/adjacency/manifest.json'
          },
          chunks: {
            datasets: ['data/datasets-0.json'],
            resources: ['data/resources-0.json'],
            publishers: ['data/publishers-0.json'],
            relationships: ['data/relationships-0.json']
          }
        }
      ],
      [
        'https://example.test/ckan/data/overview.json',
        {
          title: 'Overview',
          counts: { datasets: 1, resources: 2, relationships: 1 }
        }
      ],
      [
        'https://example.test/ckan/data/analysis/overview.json',
        {
          schema: 'okf-explorer-analysis.v1',
          generated_at: '2026-07-06T00:00:00Z',
          summary: { title: 'Analysis' }
        }
      ],
      [
        'https://example.test/ckan/data/presentation.json',
        {
          schema: 'okf-explorer-presentation.v1',
          status: 'experimental',
          facets: [{ key: 'publisher', label: 'Provider', default_state: 'pinned' }]
        }
      ],
      [
        'https://example.test/ckan/data/datasets-0.json',
        [
          {
            id: 'd1',
            name: 'dataset-one',
            title: 'Dataset One',
            publisher: 'publisher-one',
            resource_count: 2
          }
        ]
      ],
      [
        'https://example.test/ckan/data/resources-0.json',
        [
          { id: 'r2', dataset: 'dataset-one', name: 'Second', position: 2 },
          { id: 'r3', dataset: 'dataset-one', name: 'Another second', position: 2 },
          { id: 'r00', dataset: 'dataset-one', name: 'Another' },
          { id: 'r1', dataset: 'dataset-one', name: 'First', position: 1 },
          { id: 'r0', dataset: 'dataset-one' }
        ]
      ],
      ['https://example.test/ckan/data/publishers-0.json', [{ id: 'p1', name: 'publisher-one', title: 'Publisher One' }]],
      [
        'https://example.test/ckan/data/facets.json',
        {
          schema: 'okf-facets.v1',
          generated_at: '2026-07-06T00:00:00Z',
          publisher: [{ value: 'publisher-one', count: 1 }]
        }
      ],
      ['https://example.test/ckan/data/graph.json', { nodes: [], edges: [] }],
      ['https://example.test/ckan/data/govuk.json', { paths: [] }],
      [
        'https://example.test/ckan/data/operational-metadata.json',
        {
          schema: 'okf-operational-metadata.v1',
          generated_at: '2026-07-13T00:00:00Z',
          records: {
            'dataset/dataset-one': {
              authoritative_source: { name: 'Publisher One' },
              update_frequency: 'Monthly'
            }
          }
        }
      ],
      [
        'https://example.test/ckan/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          algorithm: 'fnv1a32-prefix-2',
          routes: 2,
          relationships: 1,
          buckets: { '83': 'data/adjacency/83.json' }
        }
      ],
      [
        'https://example.test/ckan/data/adjacency/83.json',
        { 'dataset/dataset-one': [{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }] }
      ],
      ['https://example.test/ckan/data/relationships-0.json', [{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }]]
    ]);

    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
      return jsonResponse(payloads.get(key));
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    expect(source.analysis?.summary?.title).toBe('Analysis');
    expect(source.presentation?.facets?.[0]).toEqual(
      expect.objectContaining({ key: 'publisher', label: 'Provider', default_state: 'pinned' })
    );
    expect(fetchMock).not.toHaveBeenCalledWith('https://example.test/ckan/data/datasets-0.json', expect.anything());

    const facetIndex = await source.loadFacetIndex();
    expect(facetIndex).toEqual({ publisher: [{ value: 'publisher-one', count: 1 }] });
    expect(await source.loadFacetIndex()).toBe(facetIndex);
    expect(fetchMock).not.toHaveBeenCalledWith('https://example.test/ckan/data/datasets-0.json', expect.anything());

    const fullIndex = await source.loadFullIndex();
    expect(fullIndex.datasetByName.get('dataset-one')?.title).toBe('Dataset One');
    expect(fullIndex.datasetByRoute.get('dataset/dataset-one')?.title).toBe('Dataset One');
    expect(fullIndex.datasetByName.get('dataset-one')?.operational_metadata?.update_frequency).toBe('Monthly');
    expect(fullIndex.operationalMetadata.schema).toBe('okf-operational-metadata.v1');
    expect(fullIndex.facets).toEqual({ publisher: [{ value: 'publisher-one', count: 1 }] });
    expect(fullIndex.resourcesByDataset.get('dataset-one')?.map((resource) => resource.id)).toEqual(['r0', 'r00', 'r1', 'r3', 'r2']);
    expect(await source.loadFullIndex()).toBe(fullIndex);

    const relationshipsResult = await source.loadRelationships();
    expect(relationshipsResult).toEqual({
      relationships: [{ source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }],
      truncated: false
    });
    expect(await source.loadRelationships()).toBe(relationshipsResult);

    await expect(source.loadRelationshipsForRoute('dataset/dataset-one')).resolves.toEqual([
      { source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }
    ]);
    await expect(source.loadRelationshipsForRoute('missing/route')).resolves.toEqual([]);
  });

  it('loads one routed record through the sharded locator without hydrating other record chunks', async () => {
    const route = 'dataset/work-two';
    const aliasRoute = 'dataset/work-two-case-preserved';
    const fallbackAliasRoute = 'dataset/work-two-legacy';
    const bucket = relationshipBucket(route);
    const aliasBucket = relationshipBucket(aliasRoute);
    const locatorBucketPath = 'data/records/locator/shared.json';
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/locator/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Record locator fixture',
          snapshot: 'snapshot-one',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            record_locator: 'data/records/manifest.json'
          },
          counts: { datasets: 2, resources: 0, relationships: 1 }
        }
      ],
      [
        'https://example.test/locator/data/manifest.json',
        {
          title: 'Record locator fixture',
          snapshot: 'snapshot-one',
          counts: { datasets: 2, resources: 0, relationships: 1 },
          indexes: {
            overview: 'data/overview.json',
            record_locator: 'data/records/manifest.json'
          },
          chunks: {
            datasets: ['data/works-0.json', 'data/works-1.json'],
            relationships: ['data/relationships-0.json']
          }
        }
      ],
      [
        'https://example.test/locator/data/overview.json',
        {
          title: 'Record locator fixture',
          snapshot: 'snapshot-one',
          counts: { datasets: 2, resources: 0, relationships: 1 }
        }
      ],
      [
        'https://example.test/locator/data/records/manifest.json',
        {
          schema: 'okf-record-locator-sharded.v1',
          snapshot: 'snapshot-one',
          algorithm: 'fnv1a32-prefix-2',
          records: 2,
          chunk_size: 1,
          record_chunks: ['data/works-0.json', 'data/works-1.json'],
          buckets: {
            [bucket]: locatorBucketPath,
            [aliasBucket]: locatorBucketPath
          },
          bucket_count: new Set([bucket, aliasBucket]).size,
          route_aliases: {
            [aliasRoute]: route,
            [fallbackAliasRoute]: route
          }
        }
      ],
      [
        `https://example.test/locator/${locatorBucketPath}`,
        {
          [route]: [1, 0],
          [aliasRoute]: [1, 0]
        }
      ],
      [
        'https://example.test/locator/data/works-0.json',
        [
          {
            name: 'work-one',
            route: 'dataset/work-one',
            title: 'Work One'
          }
        ]
      ],
      [
        'https://example.test/locator/data/works-1.json',
        [
          {
            name: 'work-two',
            route,
            title: 'Work Two'
          }
        ]
      ],
      [
        'https://example.test/locator/data/relationships-0.json',
        [
          {
            source: route,
            target: 'dataset/work-one',
            kind: 'related-to'
          }
        ]
      ]
    ]);
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
      return jsonResponse(payloads.get(key));
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus('https://example.test/locator/okf-explorer.json');
    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      'https://example.test/locator/data/records/manifest.json'
    );

    await expect(source.loadDatasetForRoute(route)).resolves.toEqual(
      expect.objectContaining({ route, title: 'Work Two' })
    );
    await expect(source.loadRelationshipsForRoute(aliasRoute)).resolves.toEqual([
      expect.objectContaining({ source: route, target: 'dataset/work-one' })
    ]);
    await expect(source.loadDatasetForRoute(aliasRoute)).resolves.toEqual(
      expect.objectContaining({ route, title: 'Work Two' })
    );
    await expect(source.loadDatasetForRoute(fallbackAliasRoute)).resolves.toEqual(
      expect.objectContaining({ route, title: 'Work Two' })
    );
    await expect(source.loadDatasetForRoute(route)).resolves.toEqual(
      expect.objectContaining({ route, title: 'Work Two' })
    );

    const requestedUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(requestedUrls).toContain(
      `https://example.test/locator/${locatorBucketPath}`
    );
    expect(requestedUrls).not.toContain(
      'https://example.test/locator/data/works-0.json'
    );
    expect(
      requestedUrls.filter(
        (requestedUrl) => requestedUrl === 'https://example.test/locator/data/works-1.json'
      )
    ).toHaveLength(1);
  });

  it('hydrates the aligned model relationship shard and presents all four live-reconciliation states', async () => {
    const route = 'dataset/uksi-2026-99';
    const bucket = relationshipBucket(route);
    const modelRows = [
      {
        id: 'model-one',
        source: 'https://www.legislation.gov.uk/id/uksi/2026/99',
        target: 'topic/transport-and-infrastructure',
        predicate: 'classified as',
        authority: {
          class: 'model-assisted',
          label: 'Model-assisted candidate'
        },
        confidence: 0.98
      }
    ];
    const modelText = JSON.stringify(modelRows);
    const compressed = new Uint8Array(
      await new Response(
        new Response(modelText).body!.pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer()
    );
    const modelHash = await sha256Hex(compressed);
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/legislation/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Legislation relationship fixture',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            record_locator: 'data/records/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json',
            model_enrichment_v2: 'data/enrichment/manifest.json'
          },
          extensions: {
            'okf-official-effects.v1': {
              reconciliation: 'data/effects/reconciliation.json'
            }
          },
          counts: { datasets: 1, relationships: 3 }
        }
      ],
      [
        'https://example.test/legislation/data/manifest.json',
        {
          title: 'Legislation relationship fixture',
          generated_at: '2026-07-25T22:20:00Z',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          counts: { datasets: 1, relationships: 3 },
          indexes: {
            overview: 'data/overview.json',
            record_locator: 'data/records/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json',
            model_enrichment_v2: 'data/enrichment/manifest.json'
          },
          chunks: {
            datasets: ['data/works-000.json.gz']
          }
        }
      ],
      [
        'https://example.test/legislation/data/overview.json',
        {
          title: 'Legislation relationship fixture',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          counts: { datasets: 1, relationships: 3 }
        }
      ],
      [
        'https://example.test/legislation/data/effects/reconciliation.json',
        {
          schema: 'okf-official-effects-reconciliation.v1',
          snapshot_id: 'legislation-effects-2026-07-25',
          generated_at: '2026-07-25T21:30:00Z',
          post_build_live: {
            observed_at: '2026-07-26T00:34:00Z',
            states: {
              agreement: 16,
              'live-addition': 2,
              superseded: 1,
              'inaccessible-consistent': 6
            }
          }
        }
      ],
      [
        'https://example.test/legislation/data/records/manifest.json',
        {
          schema: 'okf-record-locator-sharded.v1',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          algorithm: 'fnv1a32-prefix-2',
          records: 1,
          chunk_size: 1,
          record_chunks: ['data/works-000.json.gz'],
          buckets: {
            [bucket]: 'data/records/locator.json'
          },
          bucket_count: 1
        }
      ],
      [
        'https://example.test/legislation/data/records/locator.json',
        {
          [route]: [0, 0]
        }
      ],
      [
        'https://example.test/legislation/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          algorithm: 'fnv1a32-prefix-2',
          routes: 1,
          relationships: 2,
          buckets: {
            [bucket]: 'data/adjacency/route.json'
          }
        }
      ],
      [
        'https://example.test/legislation/data/adjacency/route.json',
        {
          [route]: [
            {
              source: route,
              target: 'legislation-type/uksi',
              kind: 'has document type',
              authority: { class: 'official' }
            },
            {
              source: route,
              target: 'topic/unclassified-title-only-heuristic',
              kind: 'classified as',
              authority: { class: 'derived' }
            }
          ]
        }
      ],
      [
        'https://example.test/legislation/data/enrichment/manifest.json',
        {
          schema: 'okf-provider-datapack.v1',
          id: 'legislation-model-assisted-v2',
          snapshot_id: 'legislation-2026-07-11T18:00:00Z',
          chunks: [
            {
              path: 'data/enrichment/assertions-000.json.gz',
              sha256: modelHash,
              bytes: compressed.byteLength,
              records: modelRows.length,
              compression: 'gzip',
              media_type: 'application/json'
            }
          ],
          counts: { assertions: modelRows.length }
        }
      ]
    ]);
    const modelChunkUrl =
      'https://example.test/legislation/data/enrichment/assertions-000.json.gz';
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === modelChunkUrl) {
        return new Response(compressed.slice(), {
          headers: { 'content-type': 'application/gzip' }
        });
      }
      const value = payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(
      'https://example.test/legislation/okf-explorer.json'
    );
    expect(source.modelEnrichment).toEqual(
      expect.objectContaining({
        version: 'v2',
        mode: 'historical-v2-fallback',
        status: 'declared',
        label: 'Historical model-assisted v2 compatibility fallback'
      })
    );
    expect(source.effectsReconciliation?.states.map(({ id, count }) => [id, count])).toEqual([
      ['agreement', 16],
      ['live-addition', 2],
      ['superseded', 1],
      ['inaccessible', 6]
    ]);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(modelChunkUrl);

    const relationships = await source.loadRelationshipsForRoute(route);
    expect(relationships).toEqual([
      expect.objectContaining({ authority: { class: 'official' } }),
      expect.objectContaining({ authority: { class: 'derived' } }),
      expect.objectContaining({
        id: 'model-one',
        source: route,
        target: 'topic/transport-and-infrastructure',
        kind: 'classified as',
        authority: { class: 'model-assisted', label: 'Model-assisted candidate' }
      })
    ]);
    expect(fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url === modelChunkUrl)).toHaveLength(1);
    expect(source.modelEnrichment?.status).toBe('ready');
    await source.loadRelationshipsForRoute(route);
    expect(fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url === modelChunkUrl)).toHaveLength(1);
  });

  it('loads a collision alias from its requested v3 shard, validates governance and never merges v2', async () => {
    const route = 'dataset/uksi-2026-99';
    const aliasRoute = `${route}--collision-fixture`;
    const otherRoute = 'dataset/uksi-2026-100';
    const sourceUri = 'https://www.legislation.gov.uk/id/uksi/2026/99';
    const bucket = relationshipBucket(route);
    const aliasBucket = relationshipBucket(aliasRoute);
    const otherBucket = relationshipBucket(otherRoute);
    const evidence = async (
      field: 'title' | 'notes',
      sourceValue: string,
      value: string
    ) => ({
      url: sourceUri,
      type: `literal-${field}-match`,
      source_field: field,
      field_provenance:
        field === 'title'
          ? 'official-source-record-work-title'
          : 'official-source-record-explanatory-note-or-long-title-equivalent',
      source_value: sourceValue,
      source_value_sha256: await sha256Hex(JSON.stringify(sourceValue)),
      source_value_hash_canonicalization: 'canonical-json-utf8',
      normalization: 'Unicode-NFC-and-whitespace-collapse',
      value,
      literal_sha256: await sha256Hex(value),
      rule_id: 'R001',
      rationale: 'Literal evidence supports conservative discovery metadata.'
    });
    const common = {
      schema: 'okf-relationship-assertion.v2',
      source: sourceUri,
      authority: {
        class: 'model-assisted',
        label: 'Governed accepted model-assisted discovery metadata',
        source: 'https://github.com/example/legislation'
      },
      derivation: 'codex-authored-deterministic-literal-rule-v3',
      review_status: 'accepted-independent-review',
      official_legal_classification: false,
      confidence: 0.98,
      freshness: 'current',
      rights: {
        source:
          'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
        assertion: 'derived discovery metadata'
      },
      rule_id: 'R001',
      review: {
        audit_id: 'codex-assisted-v3-independent-audit-20260726',
        audit_path:
          'whole-law/assurance/enrichment-v3-independent-audit-20260726.json',
        review_task_id: 'review-task-fixture',
        verdict_id: 'verdict-fixture'
      },
      verified: [
        { by: 'process:fixture-reconstruction' },
        { by: 'process:fixture-semantic-review' }
      ]
    };
    const modelRows = [
      {
        ...common,
        id: `urn:okf:enrichment:sha256:${'1'.repeat(64)}`,
        acceptance_id: `urn:okf:model-acceptance:${'1'.repeat(64)}`,
        dimension: 'topic',
        target: 'topic/transport-and-infrastructure',
        predicate: 'classified as',
        support_profile: 'title-only',
        evidence: [await evidence('title', 'Air Navigation Order 2026', 'Air Navigation')]
      },
      {
        ...common,
        id: `urn:okf:enrichment:sha256:${'2'.repeat(64)}`,
        acceptance_id: `urn:okf:model-acceptance:${'2'.repeat(64)}`,
        dimension: 'concept',
        target:
          'https://chris-page-gov.github.io/okf-uk-legislation/profile/whole-law/v1#concept-air-navigation',
        predicate: 'has discovery concept',
        support_profile: 'notes-only',
        evidence: [
          await evidence(
            'notes',
            'This Order concerns air-navigation requirements.',
            'air-navigation'
          )
        ]
      },
      {
        ...common,
        id: `urn:okf:enrichment:sha256:${'3'.repeat(64)}`,
        acceptance_id: `urn:okf:model-acceptance:${'3'.repeat(64)}`,
        dimension: 'entity',
        target: 'https://www.caa.co.uk/',
        predicate: 'mentions entity',
        support_profile: 'multi-field',
        evidence: [
          await evidence('title', 'Civil Aviation Authority Order 2026', 'Civil Aviation Authority'),
          await evidence(
            'notes',
            'Functions of the Civil Aviation Authority are described.',
            'Civil Aviation Authority'
          )
        ]
      }
    ];
    const modelText = JSON.stringify(modelRows);
    const compressed = new Uint8Array(
      await new Response(
        new Response(modelText).body!.pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer()
    );
    const modelHash = await sha256Hex(compressed);
    const emptyCompressed = new Uint8Array(
      await new Response(
        new Response('[]').body!.pipeThrough(new CompressionStream('gzip'))
      ).arrayBuffer()
    );
    const emptyModelHash = await sha256Hex(emptyCompressed);
    const governanceCounts = {
      assertions: 3,
      by_kind: { topic: 1, concept: 1, entity: 1 },
      by_support: {
        'title-only': 1,
        'notes-only': 1,
        'metadata-only': 0,
        'multi-field': 1
      }
    };
    const reviewerDocument = {
      schema: 'okf-codex-semantic-review-task-receipt.v1',
      status: 'accepted',
      verdict: 'accepted',
      review_task_id: 'review-task-fixture',
      reviewer_visible_model_label: 'Fixture reviewer',
      source_edits_made_by_reviewer: false,
      reviewed_materials: Object.fromEntries(
        [
          'generator_executable_sha256',
          'generator_prompt_sha256',
          'reviewer_prompt_sha256',
          'rules_sha256',
          'review_policy_sha256',
          'calibration_sha256',
          'calibration_result_sha256',
          'source_corpus_semantic_sha256',
          'candidate_manifest_sha256',
          'terminal_outcome_manifest_sha256',
          'coverage_sha256',
          'checkpoints_sha256'
        ].map((key, index) => [key, index.toString(16).repeat(64)])
      ),
      limitations: []
    };
    const reviewerText = JSON.stringify(reviewerDocument);
    const reviewerBinding = {
      path: 'whole-law/assurance/enrichment-v3-reviewer-task-receipt.json',
      bytes: new TextEncoder().encode(reviewerText).byteLength,
      sha256: await sha256Hex(reviewerText)
    };
    const acceptedDocument = {
      schema: 'okf-enrichment-accepted-assertion-manifest.v3',
      id: 'uk-legislation-codex-assisted-v3-accepted',
      audit_id: 'codex-assisted-v3-independent-audit-20260726',
      generated_at: '2026-07-26T12:00:00Z',
      snapshot_id: 'legislation-work-index-2026-07-11T18:00:00Z',
      review_materials_sha256: 'a'.repeat(64),
      counts: governanceCounts,
      authority: 'derived-model-assisted-discovery-metadata',
      official_legal_classification: false,
      chunks: [
        {
          path:
            'bundle/enrichment/codex-assisted-v3/accepted-assertions/assertions-000.json.gz',
          sha256: modelHash,
          bytes: compressed.byteLength,
          records: modelRows.length,
          compression: 'gzip',
          media_type: 'application/json'
        },
        {
          path:
            'bundle/enrichment/codex-assisted-v3/accepted-assertions/assertions-001.json.gz',
          sha256: emptyModelHash,
          bytes: emptyCompressed.byteLength,
          records: 0,
          compression: 'gzip',
          media_type: 'application/json'
        }
      ]
    };
    const acceptedText = JSON.stringify(acceptedDocument);
    const acceptedBinding = {
      path: 'enrichment/codex-assisted-v3/accepted-manifest.json',
      bytes: new TextEncoder().encode(acceptedText).byteLength,
      sha256: await sha256Hex(acceptedText)
    };
    const auditDocument = {
      schema: 'okf-enrichment-independent-audit.v3',
      audit_id: 'codex-assisted-v3-independent-audit-20260726',
      artifact_state: 'hash-bound-accepted',
      materials: {
        accepted_manifest: {
          ...acceptedBinding,
          path: 'bundle/enrichment/codex-assisted-v3/accepted-manifest.json'
        },
        reviewer_task_receipt: {
          ...reviewerBinding,
          path: 'enrichment/codex-assisted-v3/reviewer-task-receipt.json'
        }
      },
      counts: {
        accepted_assertions: governanceCounts.assertions,
        accepted_by_kind: governanceCounts.by_kind,
        accepted_by_support: governanceCounts.by_support
      },
      checks: [{ id: 'fixture', status: 'passed' }],
      decision: {
        release_gate_passed: true,
        independent_review_status: 'accepted',
        accepted_assertions: governanceCounts.assertions,
        accepted_by_kind: governanceCounts.by_kind,
        errors: []
      }
    };
    const auditText = JSON.stringify(auditDocument);
    const auditBinding = {
      path:
        'whole-law/assurance/enrichment-v3-independent-audit-20260726.json',
      bytes: new TextEncoder().encode(auditText).byteLength,
      sha256: await sha256Hex(auditText)
    };
    const v3Manifest = {
      schema: 'okf-provider-datapack.v1',
      id: 'uk-legislation-codex-assisted-v3-accepted',
      snapshot_id: 'legislation-work-index-2026-07-11T18:00:00Z',
      generated_at: '2026-07-26T12:00:00Z',
      authority: 'derived-model-assisted-discovery-metadata',
      official_legal_classification: false,
      source_contract: {
        ...acceptedBinding,
        schema: 'okf-enrichment-accepted-assertion-manifest.v3',
        audit_id: 'codex-assisted-v3-independent-audit-20260726'
      },
      independent_audit: auditBinding,
      semantic_reviewer: reviewerBinding,
      counts: governanceCounts,
      relationship_kinds: [
        { dimension: 'topic', predicate: 'classified as', count: 1 },
        { dimension: 'concept', predicate: 'has discovery concept', count: 1 },
        { dimension: 'entity', predicate: 'mentions entity', count: 1 }
      ],
      provenance: {
        evidence_field: 'evidence',
        evidence_shape: 'stable-ordered-list',
        source_field_order: ['title', 'notes'],
        support_profile_field: 'support_profile',
        support_profiles: {
          'title-only': ['title'],
          'notes-only': ['notes'],
          'multi-field': ['title', 'notes']
        },
        item_fields: [
          'url',
          'type',
          'source_field',
          'field_provenance',
          'source_value',
          'source_value_sha256',
          'source_value_hash_canonicalization',
          'normalization',
          'value',
          'literal_sha256',
          'rule_id',
          'rationale'
        ]
      },
      chunks: [
        {
          path: 'enrichment/codex-assisted-v3/accepted-assertions/assertions-000.json.gz',
          sha256: modelHash,
          bytes: compressed.byteLength,
          records: modelRows.length,
          compression: 'gzip',
          media_type: 'application/json'
        },
        {
          path: 'enrichment/codex-assisted-v3/accepted-assertions/assertions-001.json.gz',
          sha256: emptyModelHash,
          bytes: emptyCompressed.byteLength,
          records: 0,
          compression: 'gzip',
          media_type: 'application/json'
        }
      ]
    };
    const v3ManifestHash = await sha256Hex(JSON.stringify(v3Manifest));
    const descriptorUrl = 'https://example.test/v3/okf-explorer.json';
    const payloads = new Map<string, unknown>([
      [
        descriptorUrl,
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Governed v3 relationship fixture',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            record_locator: 'data/records/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json',
            model_enrichment_v3: {
              path: 'data/enrichment-v3/manifest.json',
              sha256: v3ManifestHash
            },
            model_enrichment_v3_accepted_manifest: acceptedBinding,
            model_enrichment_v3_independent_audit: auditBinding,
            model_enrichment_v3_reviewer: reviewerBinding,
            model_enrichment_v2: 'data/enrichment-v2/manifest.json',
            model_enrichment_v2_historical: 'enrichment/codex-assisted-v2/run.json'
          },
          entrypoint_integrity: {
            model_enrichment_v2: {
              path: 'data/enrichment-v2/different-manifest.json',
              sha256: 'f'.repeat(64)
            }
          },
          extensions: {
            'okf-model-enrichment.v3': {
              entrypoint: 'model_enrichment_v3',
              accepted_manifest: 'model_enrichment_v3_accepted_manifest',
              independent_audit: 'model_enrichment_v3_independent_audit',
              semantic_reviewer: 'model_enrichment_v3_reviewer',
              accepted_assertions: 3,
              accepted_by_kind: { topic: 1, concept: 1, entity: 1 },
              official_legal_classification: false
            },
            'okf-model-enrichment.v2-historical': {
              entrypoint: 'model_enrichment_v2_historical',
              included_in_active_relationship_totals: false
            }
          },
          counts: { datasets: 2, relationships: 5 }
        }
      ],
      [
        'https://example.test/v3/data/manifest.json',
        {
          title: 'Governed v3 relationship fixture',
          generated_at: '2026-07-26T12:00:00Z',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          counts: { datasets: 2, relationships: 5 },
          indexes: {
            overview: 'data/overview.json',
            record_locator: 'data/records/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json',
            model_enrichment_v2: 'data/enrichment-v2/manifest.json'
          },
          chunks: {
            datasets: ['data/works-000.json.gz', 'data/works-001.json.gz']
          }
        }
      ],
      [
        'https://example.test/v3/data/overview.json',
        {
          title: 'Governed v3 relationship fixture',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          counts: { datasets: 2, relationships: 5 }
        }
      ],
      [
        'https://example.test/v3/data/records/manifest.json',
        {
          schema: 'okf-record-locator-sharded.v1',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          algorithm: 'fnv1a32-prefix-2',
          records: 2,
          chunk_size: 1,
          record_chunks: ['data/works-000.json.gz', 'data/works-001.json.gz'],
          buckets: {
            [aliasBucket]: 'data/records/locator.json',
            [otherBucket]: 'data/records/locator.json'
          },
          bucket_count: new Set([aliasBucket, otherBucket]).size,
          route_aliases: { [aliasRoute]: route }
        }
      ],
      [
        'https://example.test/v3/data/records/locator.json',
        { [aliasRoute]: [0, 0], [otherRoute]: [1, 0] }
      ],
      [
        'https://example.test/v3/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          snapshot: 'legislation-work-index-2026-07-11T18:00:00Z',
          algorithm: 'fnv1a32-prefix-2',
          routes: 2,
          relationships: 2,
          buckets: {
            [bucket]: 'data/adjacency/route.json',
            [otherBucket]: 'data/adjacency/route.json'
          }
        }
      ],
      [
        'https://example.test/v3/data/adjacency/route.json',
        {
          [route]: [
            {
              source: route,
              target: 'legislation-type/uksi',
              kind: 'has document type',
              authority: { class: 'official' }
            }
          ],
          [otherRoute]: [
            {
              source: otherRoute,
              target: 'legislation-type/uksi',
              kind: 'has document type',
              authority: { class: 'official' }
            }
          ]
        }
      ],
      ['https://example.test/v3/data/enrichment-v3/manifest.json', v3Manifest],
      [
        'https://example.test/v3/enrichment/codex-assisted-v3/accepted-manifest.json',
        acceptedDocument
      ],
      [
        'https://example.test/v3/whole-law/assurance/enrichment-v3-independent-audit-20260726.json',
        auditDocument
      ],
      [
        'https://example.test/v3/whole-law/assurance/enrichment-v3-reviewer-task-receipt.json',
        reviewerDocument
      ]
    ]);
    const v3ChunkUrl =
      'https://example.test/v3/enrichment/codex-assisted-v3/accepted-assertions/assertions-000.json.gz';
    const emptyV3ChunkUrl =
      'https://example.test/v3/enrichment/codex-assisted-v3/accepted-assertions/assertions-001.json.gz';
    let v3ChunkRequests = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const requested = String(input);
      if (requested === v3ChunkUrl) {
        v3ChunkRequests += 1;
        if (v3ChunkRequests === 1) {
          return new Response('', { status: 404, statusText: 'Not Found' });
        }
        return new Response(compressed.slice(), {
          headers: {
            'content-type': 'application/gzip',
            'content-length': String(compressed.byteLength)
          }
        });
      }
      if (requested === emptyV3ChunkUrl) {
        return new Response(emptyCompressed.slice(), {
          headers: {
            'content-type': 'application/gzip',
            'content-length': String(emptyCompressed.byteLength)
          }
        });
      }
      const value = payloads.get(requested);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(descriptorUrl);
    expect(source.modelEnrichment).toEqual(
      expect.objectContaining({
        version: 'v3',
        mode: 'governed-v3',
        status: 'declared',
        historicalV2Declared: true
      })
    );

    await expect(source.loadRelationshipsForRoute(otherRoute)).resolves.toEqual([
      expect.objectContaining({ kind: 'has document type' })
    ]);
    expect(source.modelEnrichmentSnapshot()).toEqual(
      expect.objectContaining({ status: 'ready' })
    );

    await expect(source.loadRelationshipsForRoute(aliasRoute)).resolves.toEqual([
      expect.objectContaining({ kind: 'has document type' })
    ]);
    expect(source.modelEnrichmentSnapshot()).toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );

    await expect(source.loadRelationshipsForRoute(otherRoute)).resolves.toEqual([
      expect.objectContaining({ kind: 'has document type' })
    ]);
    expect(source.modelEnrichmentSnapshot()).toEqual(
      expect.objectContaining({ status: 'unavailable' })
    );

    const relationships = await source.loadRelationshipsForRoute(aliasRoute);
    expect(relationships).toHaveLength(4);
    expect(relationships.map(({ kind }) => kind)).toEqual([
      'has document type',
      'classified as',
      'has discovery concept',
      'mentions entity'
    ]);
    expect(
      relationships.find(({ kind }) => kind === 'mentions entity')
    ).toEqual(
      expect.objectContaining({
        source: route,
        support_profile: 'multi-field',
        evidence: [
          expect.objectContaining({ source_field: 'title' }),
          expect.objectContaining({ source_field: 'notes' })
        ]
      })
    );
    expect(source.modelEnrichment).toEqual(
      expect.objectContaining({
        status: 'ready',
        counts: {
          assertions: 3,
          byKind: { topic: 1, concept: 1, entity: 1 },
          bySupport: {
            'title-only': 1,
            'notes-only': 1,
            'metadata-only': 0,
            'multi-field': 1
          }
        }
      })
    );
    const requests = fetchMock.mock.calls.map(([input]) => String(input));
    expect(requests).toEqual(
      expect.arrayContaining([
        'https://example.test/v3/enrichment/codex-assisted-v3/accepted-manifest.json',
        'https://example.test/v3/whole-law/assurance/enrichment-v3-independent-audit-20260726.json',
        'https://example.test/v3/whole-law/assurance/enrichment-v3-reviewer-task-receipt.json'
      ])
    );
    expect(requests).not.toContain(
      'https://example.test/v3/data/enrichment-v2/manifest.json'
    );
    expect(requests).not.toContain(
      'https://example.test/v3/enrichment/codex-assisted-v2/run.json'
    );
    expect(requests.filter((url) => url === v3ChunkUrl)).toHaveLength(2);
    expect(requests.filter((url) => url === emptyV3ChunkUrl)).toHaveLength(1);
    await source.loadRelationshipsForRoute(aliasRoute);
    expect(
      fetchMock.mock.calls
        .map(([input]) => String(input))
        .filter((url) => url === v3ChunkUrl)
    ).toHaveLength(2);
    expect(source.modelEnrichmentSnapshot()).toEqual(
      expect.objectContaining({ status: 'ready' })
    );
    expect(source.modelEnrichmentSnapshot()).not.toBe(source.modelEnrichment);
  });

  it('keeps base relationships usable when advertised v3 material is missing and does not substitute v2', async () => {
    const route = 'dataset/uksi-2026-404';
    const bucket = relationshipBucket(route);
    const descriptorUrl = 'https://example.test/missing-v3/okf-explorer.json';
    const payloads = new Map<string, unknown>([
      [
        descriptorUrl,
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Missing governed v3 fixture',
          snapshot: 'snapshot-one',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            record_locator: 'data/records/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json',
            model_enrichment_v3: {
              path: 'data/enrichment-v3/manifest.json',
              sha256: 'a'.repeat(64)
            },
            model_enrichment_v2: 'data/enrichment-v2/manifest.json'
          },
          extensions: {
            'okf-model-enrichment.v3': { entrypoint: 'model_enrichment_v3' }
          },
          counts: { datasets: 1, relationships: 1 }
        }
      ],
      [
        'https://example.test/missing-v3/data/manifest.json',
        {
          title: 'Missing governed v3 fixture',
          generated_at: '2026-07-26T12:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 1, relationships: 1 },
          indexes: {
            overview: 'data/overview.json',
            record_locator: 'data/records/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json',
            model_enrichment_v2: 'data/enrichment-v2/manifest.json'
          },
          chunks: { datasets: ['data/works-000.json.gz'] }
        }
      ],
      [
        'https://example.test/missing-v3/data/overview.json',
        { title: 'Missing governed v3 fixture', snapshot: 'snapshot-one', counts: {} }
      ],
      [
        'https://example.test/missing-v3/data/records/manifest.json',
        {
          schema: 'okf-record-locator-sharded.v1',
          snapshot: 'snapshot-one',
          algorithm: 'fnv1a32-prefix-2',
          records: 1,
          chunk_size: 1,
          record_chunks: ['data/works-000.json.gz'],
          buckets: { [bucket]: 'data/records/locator.json' },
          bucket_count: 1
        }
      ],
      [
        'https://example.test/missing-v3/data/records/locator.json',
        { [route]: [0, 0] }
      ],
      [
        'https://example.test/missing-v3/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          snapshot: 'snapshot-one',
          algorithm: 'fnv1a32-prefix-2',
          routes: 1,
          relationships: 1,
          buckets: { [bucket]: 'data/adjacency/route.json' }
        }
      ],
      [
        'https://example.test/missing-v3/data/adjacency/route.json',
        {
          [route]: [
            {
              source: route,
              target: 'legislation-type/uksi',
              kind: 'has document type',
              authority: { class: 'official' }
            }
          ]
        }
      ]
    ]);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const value = payloads.get(String(input));
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(descriptorUrl);
    await expect(source.loadRelationshipsForRoute(route)).resolves.toEqual([
      expect.objectContaining({
        kind: 'has document type',
        authority: { class: 'official' }
      })
    ]);
    expect(source.modelEnrichment).toEqual(
      expect.objectContaining({
        version: 'v3',
        status: 'unavailable'
      })
    );
    expect(source.modelEnrichment?.message).toMatch(
      /v3 enrichment is unavailable.*did not guess a path or substitute historical v2/i
    );
    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      'https://example.test/missing-v3/data/enrichment-v2/manifest.json'
    );
  });

  it('keeps advertised reconciliation evidence inside the bundle origin', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/bundle/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Unsafe reconciliation fixture',
          snapshot: 'snapshot-one',
          entrypoints: { data_manifest: 'data/manifest.json' },
          extensions: {
            'okf-official-effects.v1': {
              reconciliation: 'https://untrusted.example/reconciliation.json'
            }
          },
          counts: {}
        }
      ],
      [
        'https://example.test/bundle/data/manifest.json',
        {
          title: 'Unsafe reconciliation fixture',
          generated_at: '2026-07-26T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: {},
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      [
        'https://example.test/bundle/data/overview.json',
        { title: 'Unsafe reconciliation fixture', snapshot: 'snapshot-one', counts: {} }
      ]
    ]);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const value = payloads.get(String(input));
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    expect(source.effectsReconciliation).toBeUndefined();
    expect(source.effectsReconciliationError).toMatch(/path is unsafe|inside the bundle/);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      'https://untrusted.example/reconciliation.json'
    );
  });

  it('loads same-origin provider datapacks at startup and binds every layer to the bundle snapshot', async () => {
    const providerPack = providerDatapackFixture();
    const providerManifest = {
      schema: 'okf-explorer-provider-datapack-manifest.v1',
      snapshot: 'snapshot-one',
      packCount: 1,
      packs: [
        {
          id: 'provider-one',
          selector: { field: 'source_surface', operator: 'equals', value: 'provider-one' },
          path: 'data/providers/provider-one.json',
          sha256: await sha256Hex(JSON.stringify(providerPack)),
          status: 'known-drift',
          lastChecked: '2026-07-23'
        }
      ]
    };
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/providers/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Provider fixture',
          snapshot: 'snapshot-one',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            provider_datapacks: 'data/providers/manifest.json'
          },
          entrypoint_integrity: {
            provider_datapacks: {
              path: 'data/providers/manifest.json',
              sha256: await sha256Hex(JSON.stringify(providerManifest))
            }
          },
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      [
        'https://example.test/providers/data/manifest.json',
        {
          title: 'Provider fixture',
          generated_at: '2026-07-23T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 0, resources: 0, relationships: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: { datasets: [], resources: [], publishers: [], relationships: [] }
        }
      ],
      [
        'https://example.test/providers/data/overview.json',
        {
          title: 'Provider fixture',
          generated_at: '2026-07-23T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      ['https://example.test/providers/data/providers/manifest.json', providerManifest],
      [
        'https://example.test/providers/data/providers/provider-one.json',
        providerPack
      ]
    ]);
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
      return jsonResponse(payloads.get(key));
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus('https://example.test/providers/okf-explorer.json');
    expect(source.snapshot).toBe('snapshot-one');
    expect(source.providerDatapacks?.manifest.schema).toBe(
      'okf-explorer-provider-datapack-manifest.v1'
    );
    expect(source.providerDatapacks?.packs[0]).toEqual(
      expect.objectContaining({
        id: 'provider-one',
        snapshot: 'snapshot-one',
        comparison: expect.objectContaining({ status: 'known-drift', exhaustive: false })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/providers/data/providers/provider-one.json',
      expect.anything()
    );

    payloads.set('https://example.test/providers/data/providers/provider-one.json', {
      ...providerPack,
      snapshot: 'tampered-after-manifest'
    });
    await expect(
      loadLargeCorpus('https://example.test/providers/okf-explorer.json')
    ).rejects.toThrow('Resource integrity check failed');

    payloads.set(
      'https://example.test/providers/data/providers/provider-one.json',
      providerPack
    );
    payloads.set('https://example.test/providers/data/providers/manifest.json', {
      ...providerManifest,
      packCount: 0
    });
    await expect(
      loadLargeCorpus('https://example.test/providers/okf-explorer.json')
    ).rejects.toThrow('Resource integrity check failed');
  });

  it('fails closed when an advertised provider datapack belongs to another snapshot', async () => {
    const mismatchedProviderPack = providerDatapackFixture('snapshot-two');
    const mismatchedProviderManifest = {
      schema: 'okf-explorer-provider-datapack-manifest.v1',
      snapshot: 'snapshot-one',
      packCount: 1,
      packs: [
        {
          id: 'provider-one',
          selector: { field: 'source_surface', operator: 'equals', value: 'provider-one' },
          path: 'data/providers/provider-one.json',
          sha256: await sha256Hex(JSON.stringify(mismatchedProviderPack)),
          status: 'known-drift',
          lastChecked: '2026-07-23'
        }
      ]
    };
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/provider-mismatch/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Mismatch fixture',
          snapshot: 'snapshot-one',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            provider_datapacks: 'data/providers/manifest.json'
          },
          entrypoint_integrity: {
            provider_datapacks: {
              path: 'data/providers/manifest.json',
              sha256: await sha256Hex(JSON.stringify(mismatchedProviderManifest))
            }
          },
          counts: { datasets: 0 }
        }
      ],
      [
        'https://example.test/provider-mismatch/data/manifest.json',
        {
          title: 'Mismatch fixture',
          generated_at: '2026-07-23T00:00:00Z',
          snapshot: 'snapshot-one',
          counts: { datasets: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      [
        'https://example.test/provider-mismatch/data/overview.json',
        {
          title: 'Mismatch fixture',
          snapshot: 'snapshot-one',
          counts: { datasets: 0 }
        }
      ],
      [
        'https://example.test/provider-mismatch/data/providers/manifest.json',
        mismatchedProviderManifest
      ],
      [
        'https://example.test/provider-mismatch/data/providers/provider-one.json',
        mismatchedProviderPack
      ]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({}, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    await expect(
      loadLargeCorpus('https://example.test/provider-mismatch/okf-explorer.json')
    ).rejects.toThrow('advertise different snapshot identifiers');
  });

  it('requires an integrity-bound provider manifest on a matching bundle path', async () => {
    async function expectReferenceFailure({
      suffix,
      descriptorPath,
      descriptorIntegrity,
      manifestReference,
      message
    }: {
      suffix: string;
      descriptorPath?: string | { path: string; sha256: string };
      descriptorIntegrity?: { path: string; sha256: string };
      manifestReference?: string | { path: string; sha256: string };
      message: string;
    }) {
      const prefix = `https://example.test/provider-reference-${suffix}/`;
      const payloads = new Map<string, unknown>([
        [
          `${prefix}okf-explorer.json`,
          {
            schema: 'okf-explorer-large-corpus.v1',
            kind: 'okf-large-corpus',
            title: 'Provider reference fixture',
            snapshot: 'snapshot-one',
            entrypoints: {
              data_manifest: 'data/manifest.json',
              ...(descriptorPath ? { provider_datapacks: descriptorPath } : {})
            },
            ...(descriptorIntegrity
              ? { entrypoint_integrity: { provider_datapacks: descriptorIntegrity } }
              : {}),
            counts: { datasets: 0 }
          }
        ],
        [
          `${prefix}data/manifest.json`,
          {
            title: 'Provider reference fixture',
            generated_at: '2026-07-23T00:00:00Z',
            snapshot: 'snapshot-one',
            counts: { datasets: 0 },
            indexes: {
              overview: 'data/overview.json',
              ...(manifestReference ? { provider_datapacks: manifestReference } : {})
            },
            chunks: {}
          }
        ],
        [
          `${prefix}data/overview.json`,
          {
            title: 'Provider reference fixture',
            snapshot: 'snapshot-one',
            counts: { datasets: 0 }
          }
        ]
      ]);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string | URL | Request) => {
          const key = String(url);
          if (!payloads.has(key)) {
            return jsonResponse({}, { status: 404, statusText: 'Not Found' });
          }
          return jsonResponse(payloads.get(key));
        })
      );
      await expect(loadLargeCorpus(`${prefix}okf-explorer.json`)).rejects.toThrow(message);
    }

    await expectReferenceFailure({
      suffix: 'unbound',
      descriptorPath: 'data/providers/manifest.json',
      manifestReference: 'data/providers/manifest.json',
      message: 'require a descriptor entrypoint with entrypoint_integrity SHA-256'
    });
    await expectReferenceFailure({
      suffix: 'direct-hash-without-integrity-row',
      descriptorPath: {
        path: 'data/providers/manifest.json',
        sha256: 'd'.repeat(64)
      },
      manifestReference: 'data/providers/manifest.json',
      message: 'require a descriptor entrypoint with entrypoint_integrity SHA-256'
    });
    await expectReferenceFailure({
      suffix: 'manifest-only-hash',
      manifestReference: {
        path: 'data/providers/manifest.json',
        sha256: 'd'.repeat(64)
      },
      message: 'require a descriptor entrypoint with entrypoint_integrity SHA-256'
    });
    await expectReferenceFailure({
      suffix: 'path-mismatch',
      descriptorPath: 'data/providers/manifest.json',
      descriptorIntegrity: {
        path: 'data/providers/manifest.json',
        sha256: 'd'.repeat(64)
      },
      manifestReference: 'data/different-provider-manifest.json',
      message: 'provider-datapack manifest paths differ'
    });
    await expectReferenceFailure({
      suffix: 'outside-base',
      descriptorPath: '../outside/provider-manifest.json',
      descriptorIntegrity: {
        path: '../outside/provider-manifest.json',
        sha256: 'd'.repeat(64)
      },
      message: 'must stay inside the bundle base path'
    });
  });

  it('requires descriptor and data-manifest snapshot bindings when provider datapacks are advertised', async () => {
    for (const missingSnapshot of ['descriptor', 'manifest'] as const) {
      const prefix = `https://example.test/provider-${missingSnapshot}-snapshot/`;
      const descriptor = {
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Provider snapshot requirement fixture',
        ...(missingSnapshot === 'descriptor' ? {} : { snapshot: 'snapshot-one' }),
        entrypoints: {
          data_manifest: 'data/manifest.json',
          provider_datapacks: 'data/providers/manifest.json'
        },
        entrypoint_integrity: {
          provider_datapacks: {
            path: 'data/providers/manifest.json',
            sha256: 'd'.repeat(64)
          }
        },
        counts: { datasets: 0 }
      };
      const manifest = {
        title: 'Provider snapshot requirement fixture',
        generated_at: '2026-07-23T00:00:00Z',
        ...(missingSnapshot === 'manifest' ? {} : { snapshot: 'snapshot-one' }),
        counts: { datasets: 0 },
        indexes: { overview: 'data/overview.json' },
        chunks: {}
      };
      const payloads = new Map<string, unknown>([
        [`${prefix}okf-explorer.json`, descriptor],
        [`${prefix}data/manifest.json`, manifest],
        [
          `${prefix}data/overview.json`,
          {
            title: 'Provider snapshot requirement fixture',
            snapshot: 'snapshot-one',
            counts: { datasets: 0 }
          }
        ]
      ]);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string | URL | Request) => {
          const key = String(url);
          if (!payloads.has(key)) {
            return jsonResponse({}, { status: 404, statusText: 'Not Found' });
          }
          return jsonResponse(payloads.get(key));
        })
      );

      await expect(loadLargeCorpus(`${prefix}okf-explorer.json`)).rejects.toThrow(
        'require snapshot identifiers on both the descriptor and data manifest'
      );
    }
  });

  it('retries full hydration after a transient lightweight facet failure', async () => {
    const payloads = new Map<string, unknown>([
      ['https://example.test/retry/okf-explorer.json', {
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus',
        title: 'Retry fixture',
        entrypoints: { data_manifest: 'data/manifest.json' }
      }],
      ['https://example.test/retry/data/manifest.json', {
        title: 'Retry manifest',
        generated_at: '2026-07-21T00:00:00Z',
        counts: { datasets: 0, resources: 0, relationships: 0 },
        indexes: { overview: 'data/overview.json', facets: 'data/facets.json' },
        chunks: { datasets: [], resources: [], publishers: [], relationships: [] }
      }],
      ['https://example.test/retry/data/overview.json', {
        title: 'Retry overview',
        counts: { datasets: 0, resources: 0, relationships: 0 }
      }],
      ['https://example.test/retry/data/facets.json', {
        topic: [{ value: 'population', count: 1 }]
      }]
    ]);
    let facetAttempts = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      const key = String(url);
      if (key.endsWith('/data/facets.json') && facetAttempts++ === 0) {
        return jsonResponse({}, { status: 404, statusText: 'Not Found' });
      }
      return payloads.has(key)
        ? jsonResponse(payloads.get(key))
        : jsonResponse({}, { status: 404, statusText: 'Not Found' });
    }));

    const source = await loadLargeCorpus('https://example.test/retry/okf-explorer.json');
    await expect(source.loadFullIndex()).rejects.toThrow('404 Not Found');
    await expect(source.loadFullIndex()).resolves.toEqual(expect.objectContaining({
      facets: { topic: [{ value: 'population', count: 1 }] }
    }));
    expect(facetAttempts).toBe(2);
  });

  it('uses the portable UTF-8 FNV-1a adjacency bucket algorithm', () => {
    expect(relationshipBucket('dataset/dataset-one')).toBe('83');
    expect(relationshipBucket('publisher/publisher-one')).toBe('7f');
    expect(relationshipBucket('é')).toBe('1e');
  });

  it('rejects non-large-corpus descriptors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ kind: 'okf-bundle' })));
    await expect(loadLargeCorpus('https://example.test/bundle.json')).rejects.toThrow('not an OKF large-corpus descriptor');
  });

  it('caps relationship rows at an explicit maxRows and reports truncation', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 5 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 5 },
          indexes: { overview: 'data/overview.json' },
          chunks: {
            relationships: ['data/relationships-0.json', 'data/relationships-1.json']
          }
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }],
      [
        'https://example.test/ckan/data/relationships-0.json',
        [
          { source: 'a', target: 'b', kind: 'one' },
          { source: 'b', target: 'c', kind: 'two' }
        ]
      ],
      [
        'https://example.test/ckan/data/relationships-1.json',
        [
          { source: 'c', target: 'd', kind: 'three' },
          { source: 'd', target: 'e', kind: 'four' },
          { source: 'e', target: 'f', kind: 'five' }
        ]
      ]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    const result = await source.loadRelationships(3);
    expect(result.truncated).toBe(true);
    expect(result.relationships).toEqual([
      { source: 'a', target: 'b', kind: 'one' },
      { source: 'b', target: 'c', kind: 'two' },
      { source: 'c', target: 'd', kind: 'three' }
    ]);
    // Cached after the first call, regardless of a differing maxRows on a later call.
    expect(await source.loadRelationships(1)).toBe(result);
  });

  it('does not report truncation when every relationship row fits under maxRows', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 2 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 2 },
          indexes: { overview: 'data/overview.json' },
          chunks: {
            relationships: ['data/relationships-0.json']
          }
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }],
      [
        'https://example.test/ckan/data/relationships-0.json',
        [
          { source: 'a', target: 'b', kind: 'one' },
          { source: 'b', target: 'c', kind: 'two' }
        ]
      ]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    const result = await source.loadRelationships(2);
    expect(result.truncated).toBe(false);
    expect(result.relationships).toHaveLength(2);
  });

  it('continues when the optional analysis overview is missing', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            analysis_overview: 'data/analysis/overview.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    expect(source.analysis).toBeUndefined();
    expect(source.overview.title).toBe('Overview');

    const fullIndex = await source.loadFullIndex();
    expect(fullIndex.datasets).toEqual([]);
    expect(fullIndex.resources).toEqual([]);
    expect(fullIndex.facets).toEqual({});
    expect(fullIndex.graph).toEqual({});
    expect(fullIndex.govukContent).toEqual({});
    await expect(source.loadRelationships()).resolves.toEqual({ relationships: [], truncated: false });
  });

  it('loads without analysis when no analysis entrypoint is advertised', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/ckan/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'CKAN fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json'
          },
          counts: { datasets: 0, resources: 0, relationships: 0 }
        }
      ],
      [
        'https://example.test/ckan/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-06T00:00:00Z',
          counts: { datasets: 0, resources: 0, relationships: 0 },
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      ['https://example.test/ckan/data/overview.json', { title: 'Overview', counts: {} }]
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        const key = String(url);
        if (!payloads.has(key)) return jsonResponse({ missing: key }, { status: 404, statusText: 'Not Found' });
        return jsonResponse(payloads.get(key));
      })
    );

    const source = await loadLargeCorpus('https://example.test/ckan/okf-explorer.json');
    expect(source.analysis).toBeUndefined();
  });

  it('defaults to the exported relationship row cap', () => {
    expect(MAX_RELATIONSHIP_ROWS).toBe(300_000);
  });

  it('keeps large chunk fetch batches small enough for static hosting', () => {
    expect(CHUNK_FETCH_BATCH_SIZE).toBeLessThanOrEqual(4);
  });

  it.each([
    ['a string entrypoint without entrypoint_integrity', 'release-data-plane.json'],
    ['a path-only object entrypoint', { path: 'release-data-plane.json' }]
  ])('rejects an unbound release index advertised through %s', async (_label, releaseDataPlane) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Unbound release fixture',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            release_data_plane: releaseDataPlane
          },
          counts: {}
        })
      )
    );

    await expect(loadLargeCorpus('https://example.test/bundle/okf-explorer.json')).rejects.toThrow(
      'no descriptor SHA-256 binding'
    );
  });

  it('loads ranged records, relationship chunks and route adjacency without fetching virtual shard URLs', async () => {
    const packed = await makeRangePackFixture([
      {
        path: 'data/records-0.json',
        value: [{ id: 'd1', name: 'record-one', title: 'Record one', publisher: 'publisher-one', resource_count: 0 }]
      },
      {
        path: 'data/relationships-0.json',
        value: [{ source: 'dataset/record-one', target: 'publisher/publisher-one', kind: 'published by' }]
      },
      {
        path: 'data/adjacency/83.json.gz',
        value: {
          'dataset/dataset-one': [
            { source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }
          ]
        },
        compression: 'gzip'
      }
    ]);
    const [recordEntry, relationshipEntry, adjacencyEntry] = packed.document.entries;
    const manifest = {
      title: 'Ranged manifest',
      generated_at: '2026-07-14T00:00:00Z',
      snapshot: 'snapshot-1',
      counts: { datasets: 1, resources: 0, relationships: 1 },
      integrity: { manifest_root_sha256: 'a'.repeat(64) },
      indexes: {
        overview: 'data/overview.json',
        relationship_adjacency: 'data/adjacency/manifest.json'
      },
      chunks: {
        datasets: [recordEntry.path],
        relationships: [relationshipEntry.path]
      },
      shards: {
        datasets: [{ path: recordEntry.path, sha256: recordEntry.sha256 }],
        relationships: [{ path: relationshipEntry.path, sha256: relationshipEntry.sha256 }]
      }
    };
    const overview = { schema: 'okf-overview.v1', title: 'Ranged overview', counts: manifest.counts };
    const adjacency = {
      schema: 'okf-relationship-adjacency.v1',
      snapshot: 'snapshot-1',
      algorithm: 'fnv1a32-prefix-2',
      routes: 1,
      relationships: 1,
      buckets: { '83': adjacencyEntry.path },
      shards: [{ path: adjacencyEntry.path, sha256: adjacencyEntry.sha256 }]
    };
    const manifestText = JSON.stringify(manifest);
    const adjacencyText = JSON.stringify(adjacency);
    const descriptor = {
      schema: 'okf-explorer-large-corpus.v1',
      kind: 'okf-large-corpus',
      title: 'Ranged fixture',
      snapshot: 'snapshot-1',
      data_plane_manifest_root_sha256: 'a'.repeat(64),
      entrypoints: {
        data_manifest: 'data/manifest.json',
        overview_index: 'data/overview.json',
        relationship_adjacency: 'data/adjacency/manifest.json',
        release_data_plane: 'release-data-plane.json'
      },
      entrypoint_integrity: {
        data_manifest: { path: 'data/manifest.json', sha256: await sha256Hex(manifestText) },
        relationship_adjacency: { path: 'data/adjacency/manifest.json', sha256: await sha256Hex(adjacencyText) },
        release_data_plane: { path: 'release-data-plane.json', sha256: packed.indexHash }
      },
      counts: manifest.counts,
      distribution: { data_plane: 'github-pages-same-origin-range-packs' }
    };
    const controls = new Map<string, string>([
      ['https://example.test/bundle/okf-explorer.json', JSON.stringify(descriptor)],
      ['https://example.test/bundle/release-data-plane.json', packed.indexText],
      ['https://example.test/bundle/data/manifest.json', manifestText],
      ['https://example.test/bundle/data/overview.json', JSON.stringify(overview)],
      ['https://example.test/bundle/data/adjacency/manifest.json', adjacencyText]
    ]);
    const fetchedUrls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      fetchedUrls.push(url);
      if (url === packed.packUrl) {
        return rangeResponse(packed, new Headers(init?.headers).get('Range') || '');
      }
      const text = controls.get(url);
      return text === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : new Response(text, { headers: { 'content-type': 'application/json' } });
    }));

    const source = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    expect(source.snapshot).toBe('snapshot-1');
    expect(source.releaseDataPlane?.schema).toBe('govuk-okf-github-release-pack-index.v1');
    expect((await source.loadFullIndex()).datasets[0].title).toBe('Record one');
    await expect(source.loadRelationships()).resolves.toEqual({
      relationships: [{ source: 'dataset/record-one', target: 'publisher/publisher-one', kind: 'published by' }],
      truncated: false
    });
    await expect(source.loadRelationshipsForRoute('dataset/dataset-one')).resolves.toEqual([
      { source: 'dataset/dataset-one', target: 'publisher/publisher-one', kind: 'published by' }
    ]);
    expect(fetchedUrls).not.toContain('https://example.test/bundle/data/records-0.json');
    expect(fetchedUrls).not.toContain('https://example.test/bundle/data/relationships-0.json');
    expect(fetchedUrls).not.toContain('https://example.test/bundle/data/adjacency/83.json.gz');
    expect(fetchedUrls.filter((url) => url === packed.packUrl)).toHaveLength(3);
  });

  it('rejects conflicting explicit snapshot identifiers before lazy shard loading', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/bundle/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Mixed snapshot fixture',
          snapshot: 'snapshot-descriptor',
          entrypoints: { data_manifest: 'data/manifest.json' },
          counts: {}
        }
      ],
      [
        'https://example.test/bundle/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-14T00:00:00Z',
          snapshot: 'snapshot-manifest',
          counts: {},
          indexes: { overview: 'data/overview.json' },
          chunks: {}
        }
      ],
      ['https://example.test/bundle/data/overview.json', { title: 'Overview', counts: {} }]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const value = payloads.get(String(input));
        return value === undefined
          ? new Response('', { status: 404, statusText: 'Not Found' })
          : jsonResponse(value);
      })
    );

    await expect(loadLargeCorpus('https://example.test/bundle/okf-explorer.json')).rejects.toThrow(
      'different snapshot identifiers'
    );
  });

  it('loads and snapshot-binds advertised governed terms and validation evidence', async () => {
    const snapshot = 'snapshot-one';
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/bundle/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Governed term fixture',
          snapshot,
          entrypoints: {
            data_manifest: 'data/manifest.json',
            terms: 'data/terms.json',
            term_validation: 'data/term-validation.json'
          },
          counts: {}
        }
      ],
      [
        'https://example.test/bundle/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-26T12:00:00Z',
          snapshot,
          counts: {},
          indexes: {
            overview: 'data/overview.json',
            terms: 'data/terms.json',
            term_validation: 'data/term-validation.json'
          },
          chunks: {}
        }
      ],
      [
        'https://example.test/bundle/data/overview.json',
        { schema: 'okf-overview.v1', title: 'Overview', generated_at: '2026-07-26T12:00:00Z', snapshot, counts: {} }
      ],
      ['https://example.test/bundle/data/terms.json', governedTermsFixture(snapshot)],
      [
        'https://example.test/bundle/data/term-validation.json',
        governedTermValidationFixture(snapshot)
      ]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const value = payloads.get(String(input));
        return value === undefined
          ? new Response('', { status: 404, statusText: 'Not Found' })
          : jsonResponse(value);
      })
    );

    const source = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    expect(source.termRegistry?.terms[0].id).toBe('ui:access-model');
    expect(source.termValidation?.status).toBe('conformant');

    payloads.set(
      'https://example.test/bundle/data/term-validation.json',
      governedTermValidationFixture('snapshot-two')
    );
    await expect(
      loadLargeCorpus('https://example.test/bundle/okf-explorer.json')
    ).rejects.toThrow('snapshots differ');
  });

  it('accepts a legacy snapshotless adjacency manifest but rejects an advertised mismatch', async () => {
    const payloads = new Map<string, unknown>([
      [
        'https://example.test/bundle/okf-explorer.json',
        {
          schema: 'okf-explorer-large-corpus.v1',
          kind: 'okf-large-corpus',
          title: 'Adjacency snapshot fixture',
          snapshot: 'snapshot-1',
          entrypoints: {
            data_manifest: 'data/manifest.json',
            relationship_adjacency: 'data/adjacency/manifest.json'
          },
          counts: {}
        }
      ],
      [
        'https://example.test/bundle/data/manifest.json',
        {
          title: 'Manifest',
          generated_at: '2026-07-14T00:00:00Z',
          snapshot: 'snapshot-1',
          counts: {},
          indexes: {
            overview: 'data/overview.json',
            relationship_adjacency: 'data/adjacency/manifest.json'
          },
          chunks: {}
        }
      ],
      [
        'https://example.test/bundle/data/overview.json',
        { title: 'Overview', snapshot: 'snapshot-1', counts: {} }
      ],
      [
        'https://example.test/bundle/data/adjacency/manifest.json',
        {
          schema: 'okf-relationship-adjacency.v1',
          algorithm: 'fnv1a32-prefix-2',
          routes: 0,
          relationships: 0,
          buckets: {}
        }
      ]
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const value = payloads.get(String(input));
        return value === undefined
          ? new Response('', { status: 404, statusText: 'Not Found' })
          : jsonResponse(value);
      })
    );

    const source = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    await expect(source.loadRelationshipsForRoute('dataset/example')).resolves.toEqual([]);

    payloads.set('https://example.test/bundle/data/adjacency/manifest.json', {
      schema: 'okf-relationship-adjacency.v1',
      snapshot: 'snapshot-2',
      algorithm: 'fnv1a32-prefix-2',
      routes: 0,
      relationships: 0,
      buckets: {}
    });
    const mixedSource = await loadLargeCorpus('https://example.test/bundle/okf-explorer.json');
    await expect(mixedSource.loadRelationshipsForRoute('dataset/example')).rejects.toThrow(
      'adjacency manifest snapshot differs'
    );
  });
});
