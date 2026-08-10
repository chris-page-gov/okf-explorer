import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hasTargetedRelationshipDelivery,
  loadLargeCorpus,
  MAX_RELATIONSHIP_ROWS,
  MAX_RICH_RELATIONSHIP_CHUNK_BYTES,
  MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES,
  MAX_RICH_RELATIONSHIP_ROW_TEXT_UNITS,
  prefersTargetedRelationshipHydration,
  normalizeRichRelationshipRuntimeManifest
} from './largeCorpus';
import { sha256Hex } from './releaseDataPlane';

function jsonResponse(value: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: { 'content-type': 'application/json' }
  });
}

async function gzipJson(value: unknown): Promise<Uint8Array> {
  const text = JSON.stringify(value);
  return new Uint8Array(
    await new Response(
      new Response(text).body!.pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer()
  );
}

async function runtimeFixture(options: {
  unsafeSource?: boolean;
  unsafeAuthority?: boolean;
  invalidContract?: boolean;
  invalidEvidenceIri?: boolean;
  extraActiveChunks?: number;
  invalidCommitment?: boolean;
  declaredChunkBytes?: number;
  oversizedLabel?: boolean;
  unknownRowProperty?: boolean;
} = {}) {
  const base = 'https://example.test/rich/';
  const snapshot = 'snapshot-rich-one';
  const route = 'dataset/work-one';
  const target = 'category/primary';
  const corePlane = 'urn:okf:plane:core';
  const historicalPlane = 'urn:okf:plane:historical';
  const row = {
    schema: 'okf-relationship-runtime-row.v1',
    id: 'urn:okf:assertion:core-one',
    assertion_id: 'urn:okf:assertion:core-one',
    source: options.unsafeSource ? 'https://example.test/work-one' : route,
    target,
    source_route: options.unsafeSource ? 'https://example.test/work-one' : route,
    target_route: target,
    source_iri: 'https://example.test/id/work-one',
    target_iri: 'https://example.test/id/category-primary',
    predicate: 'https://example.test/vocabulary/has-category',
    predicate_iri: 'https://example.test/vocabulary/has-category',
    kind: 'has category',
    label: options.oversizedLabel
      ? 'x'.repeat(MAX_RICH_RELATIONSHIP_ROW_TEXT_UNITS + 1)
      : 'has category',
    inverse_label: 'categorises',
    direction: 'source-to-target',
    assertion_status: 'normalized',
    assertion_scope: options.invalidContract ? 'snapshot-bounded' : 'real-world',
    authority: {
      class: 'derived',
      label: 'Normalized source metadata',
      source: options.unsafeAuthority ? 'javascript:alert(1)' : 'https://example.test/source/'
    },
    derivation: 'urn:okf:process:source-projection',
    observed_at: '2026-08-09T00:00:00Z',
    evidence: [{
      '@id': 'urn:okf:evidence:core-one',
      type: 'source-record',
      url: 'https://example.test/source/work-one',
      source_field: 'title',
      source_value_sha256: 'a'.repeat(64),
      retrieved_at: '2026-08-09T00:00:00Z',
      ...(options.invalidEvidenceIri
        ? { normalization: 'repository-authored governed relationship' }
        : {})
    }],
    rights: {
      source: 'https://example.test/licence',
      assertion: 'Example source terms apply.'
    },
    plane: corePlane,
    active: true,
    ...(options.unknownRowProperty
      ? { unbounded_payload: 'not retained'.repeat(32_768) }
      : {})
  };
  const historicalRow = {
    ...row,
    id: 'urn:okf:assertion:historical-one',
    assertion_id: 'urn:okf:assertion:historical-one',
    authority: {
      class: 'model-assisted',
      label: 'Historical reviewed snapshot',
      source: 'https://example.test/history/'
    },
    assertion_status: 'model-derived',
    confidence_score: 0.8,
    derivation_activity: 'urn:okf:activity:historical-review',
    review_status: 'historical',
    plane: historicalPlane,
    active: false
  };
  const coreBytes = await gzipJson([row]);
  const historicalBytes = await gzipJson([historicalRow]);
  const coreHash = await sha256Hex(coreBytes);
  const corePath = 'data/semantic/runtime/core/relationships-000.json.gz';
  const corePaths = [
    corePath,
    ...Array.from(
      { length: options.extraActiveChunks || 0 },
      (_, index) =>
        `data/semantic/runtime/core/relationships-${String(index + 1).padStart(3, '0')}.json.gz`
    )
  ];
  const coreAssertionIds = corePaths.map((_, index) =>
    index ? `urn:okf:assertion:core-extra-${index}` : 'urn:okf:assertion:core-one'
  );
  const historicalPath = 'data/semantic/runtime/historical/relationships-000.json.gz';
  const prefix = (await sha256Hex(route)).slice(0, 2);
  const bucketPath = `data/semantic/runtime/route-locator/bucket-${prefix}.json.gz`;
  const bucket = {
    schema: 'okf-rich-relationship-route-locator-bucket.v1',
    generated_at: '2026-08-09T00:00:00Z',
    hash_algorithm: 'sha256-utf8-first-byte-hex',
    bucket: prefix,
    routes: [{
      route,
      chunks: [...corePaths, historicalPath],
      planes: [
        {
          name: 'core',
          assertions: corePaths.length,
          assertion_ids_sha256: options.invalidCommitment
            ? 'f'.repeat(64)
            : await sha256Hex(JSON.stringify([...coreAssertionIds].sort())),
          chunks: corePaths
        },
        {
          name: 'historical',
          assertions: 1,
          assertion_ids_sha256: await sha256Hex(
            JSON.stringify(['urn:okf:assertion:historical-one'])
          ),
          chunks: [historicalPath]
        }
      ]
    }],
    counts: { routes: 1, chunk_references: corePaths.length + 1 }
  };
  const bucketBytes = await gzipJson(bucket);
  const locatorPath = 'data/semantic/runtime/route-locator/manifest.json';
  const locator = {
    schema: 'okf-rich-relationship-route-locator.v1',
    generated_at: '2026-08-09T00:00:00Z',
    hash_algorithm: 'sha256-utf8-first-byte-hex',
    bucket_path_template: 'data/semantic/runtime/route-locator/bucket-{prefix}.json.gz',
    buckets: [{
      bucket: prefix,
      path: bucketPath,
      bytes: bucketBytes.byteLength,
      sha256: await sha256Hex(bucketBytes),
      content_encoding: 'gzip',
      routes: 1,
      chunk_references: corePaths.length + 1
    }],
    counts: { routes: 1, buckets: 1, chunk_references: corePaths.length + 1 }
  };
  const runtimePath = 'data/semantic/runtime-manifest.json';
  const runtime = {
    '@id': 'urn:okf:runtime:rich-one',
    schema: 'okf-rich-relationship-runtime-manifest.v1',
    snapshot,
    generated_at: '2026-08-09T00:00:00Z',
    semantic_manifest: 'data/semantic/manifest.yamlld',
    assertion_contract: 'schemas/relationship-assertion-v3.schema.json',
    row_contract: 'schemas/relationship-runtime-row.schema.json',
    default_planes: ['core'],
    route_locator: {
      path: locatorPath,
      id: 'urn:okf:locator:rich-one',
      routes: 1,
      buckets: 1,
      sha256: await sha256Hex(JSON.stringify(locator))
    },
    planes: [
      {
        id: corePlane,
        name: 'core',
        active: true,
        lifecycle: 'active',
        authority_classes: ['derived'],
        assertions: corePaths.length,
        chunks: corePaths.map((path, index) => ({
          path,
          id: `urn:okf:chunk:core-${index}`,
          media_type: 'application/json',
          content_encoding: 'gzip',
          bytes: options.declaredChunkBytes || coreBytes.byteLength,
          sha256: coreHash,
          count: 1,
          records: 1
        }))
      },
      {
        id: historicalPlane,
        name: 'historical',
        active: false,
        lifecycle: 'historical',
        authority_classes: ['model-assisted'],
        assertions: 1,
        chunks: [{
          path: historicalPath,
          id: 'urn:okf:chunk:historical-one',
          media_type: 'application/json',
          content_encoding: 'gzip',
          bytes: historicalBytes.byteLength,
          sha256: await sha256Hex(historicalBytes),
          count: 1,
          records: 1
        }]
      }
    ],
    totals: {
      active_assertions: corePaths.length,
      historical_assertions: 1,
      rejected_assertions: 0,
      all_assertions: corePaths.length + 1,
      chunks: corePaths.length + 1
    },
    loading_policy: 'Load active planes by default; historical planes require explicit use.'
  };
  const runtimeHash = await sha256Hex(JSON.stringify(runtime));
  const descriptorUrl = `${base}okf-explorer.json`;
  const payloads = new Map<string, unknown>([
    [descriptorUrl, {
      schema: 'okf-explorer-large-corpus.v1',
      kind: 'okf-large-corpus',
      title: 'Rich relationship fixture',
      snapshot,
      entrypoints: {
        data_manifest: 'data/manifest.json',
        relationship_runtime: runtimePath
      },
      entrypoint_integrity: {
        relationship_runtime: { path: runtimePath, sha256: runtimeHash }
      },
      counts: { datasets: 1, relationships: 2 }
    }],
    [`${base}data/manifest.json`, {
      title: 'Rich relationship fixture',
      generated_at: '2026-08-09T00:00:00Z',
      snapshot,
      counts: { datasets: 1, relationships: 2 },
      indexes: {
        overview: 'data/overview.json',
        relationship_runtime: { path: runtimePath, sha256: runtimeHash }
      },
      chunks: { datasets: [] }
    }],
    [`${base}data/overview.json`, {
      title: 'Rich relationship fixture',
      snapshot,
      counts: { datasets: 1, relationships: 2 }
    }],
    [`${base}${runtimePath}`, runtime],
    [`${base}${locatorPath}`, locator]
  ]);
  const binaries = new Map<string, Uint8Array>([
    [`${base}${bucketPath}`, bucketBytes],
    ...corePaths.map((path) => [`${base}${path}`, coreBytes] as [string, Uint8Array]),
    [`${base}${historicalPath}`, historicalBytes]
  ]);
  return { descriptorUrl, payloads, binaries, route, corePath, corePaths, historicalPath, runtime };
}

describe('rich relationship runtime source', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hydrates digest-bound active planes through the SHA-256 route locator', async () => {
    const fixture = await runtimeFixture();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) {
        return new Response(binary.slice(), {
          headers: { 'content-type': 'application/gzip' }
        });
      }
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    expect(hasTargetedRelationshipDelivery(source)).toBe(true);
    expect(prefersTargetedRelationshipHydration(source, fixture.route)).toBe(true);
    expect(prefersTargetedRelationshipHydration(source, '')).toBe(false);
    expect(source.descriptor.entrypoints.record_locator).toBeUndefined();
    const routed = await source.loadRelationshipsForRoute(fixture.route);
    expect(routed).toHaveLength(1);
    expect(routed[0]).toEqual(expect.objectContaining({
      id: 'urn:okf:assertion:core-one',
      source: fixture.route,
      source_iri: 'https://example.test/id/work-one',
      predicate: 'https://example.test/vocabulary/has-category'
    }));
    await expect(source.loadRelationships()).resolves.toEqual({
      relationships: routed,
      truncated: false
    });
    const requested = fetchMock.mock.calls.map(([input]) => String(input));
    expect(requested).toContain(`https://example.test/rich/${fixture.corePath}`);
    expect(requested).not.toContain(`https://example.test/rich/${fixture.historicalPath}`);
  });

  it('rejects absolute URLs in local runtime route fields even when all hashes match', async () => {
    const fixture = await runtimeFixture({ unsafeSource: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      'must be a safe local route'
    );
  });

  it('accepts a path-only descriptor when the matching data-manifest reference supplies the hash', async () => {
    const fixture = await runtimeFixture();
    const descriptor = fixture.payloads.get(fixture.descriptorUrl) as Record<string, unknown>;
    delete descriptor.entrypoint_integrity;
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).resolves.toHaveLength(1);
  });

  it('enforces the public whole-relationship hard cap before fetching runtime shards', async () => {
    const fixture = await runtimeFixture();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationships(MAX_RELATIONSHIP_ROWS + 1)).rejects.toThrow(
      `0 to ${MAX_RELATIONSHIP_ROWS}`
    );
    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      'https://example.test/rich/data/semantic/runtime-manifest.json'
    );
  });

  it('rejects excessive route fan-out before fetching any relationship chunk', async () => {
    const fixture = await runtimeFixture({ extraActiveChunks: 64 });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      'requires 65 active chunks, 65 declared shard rows, 65 incident assertions'
    );
    const requested = new Set(fetchMock.mock.calls.map(([input]) => String(input)));
    expect(
      fixture.corePaths.some((path) => requested.has(`https://example.test/rich/${path}`))
    ).toBe(false);
  });

  it('rejects aggregate compressed fan-out before fetching relationship chunks', async () => {
    const fixture = await runtimeFixture({
      extraActiveChunks: 8,
      declaredChunkBytes: MAX_RICH_RELATIONSHIP_CHUNK_BYTES
    });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    });
    vi.stubGlobal('fetch', fetchMock);

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      `${MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES} compressed bytes`
    );
    const requested = new Set(fetchMock.mock.calls.map(([input]) => String(input)));
    expect(
      fixture.corePaths.some((path) => requested.has(`https://example.test/rich/${path}`))
    ).toBe(false);
  });

  it('rejects a governed field that exceeds the retained per-row text ceiling', async () => {
    const fixture = await runtimeFixture({ oversizedLabel: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      `${MAX_RICH_RELATIONSHIP_ROW_TEXT_UNITS}-unit retained-text ceiling`
    );
  });

  it('drops ungoverned row properties from the retained Reader projection', async () => {
    const fixture = await runtimeFixture({ unknownRowProperty: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    const [relationship] = await source.loadRelationshipsForRoute(fixture.route);
    expect(relationship).not.toHaveProperty('unbounded_payload');
    expect(relationship).toEqual(expect.objectContaining({
      id: 'urn:okf:assertion:core-one',
      source: fixture.route,
      label: 'has category'
    }));
  });

  it('rejects script-scheme authority links in digest-valid runtime rows', async () => {
    const fixture = await runtimeFixture({ unsafeAuthority: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      'credential-free HTTP(S) URL'
    );
  });

  it('rejects rows outside the shared status and scope contract', async () => {
    const fixture = await runtimeFixture({ invalidContract: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      'assertion scope is outside the governed contract'
    );
  });

  it('rejects non-IRI evidence normalization values', async () => {
    const fixture = await runtimeFixture({ invalidEvidenceIri: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      'normalization must be an absolute IRI'
    );
  });

  it('fails closed when routed rows do not match the producer commitment', async () => {
    const fixture = await runtimeFixture({ invalidCommitment: true });
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const binary = fixture.binaries.get(url);
      if (binary) return new Response(binary.slice());
      const value = fixture.payloads.get(url);
      return value === undefined
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : jsonResponse(value);
    }));

    const source = await loadLargeCorpus(fixture.descriptorUrl);
    await expect(source.loadRelationshipsForRoute(fixture.route)).rejects.toThrow(
      'does not match its core assertion commitment'
    );
  });

  it('does not allow a historical authority plane in the default active set', async () => {
    const fixture = await runtimeFixture();
    fixture.runtime.planes[0].lifecycle = 'historical';
    expect(() => normalizeRichRelationshipRuntimeManifest(fixture.runtime)).toThrow(
      'lifecycle conflicts with its active flag'
    );
  });
});
