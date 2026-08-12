import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Route } from '@playwright/test';

const ORIGIN = 'https://targeted-legislation.fixture.test';
const BUNDLE_URL = `${ORIGIN}/okf-explorer.json`;
const SNAPSHOT = 'targeted-legislation-fixture-v1';
const RECORD_ROUTE = 'dataset/ukpga-1998-42';
const AUDIT_ID = 'codex-assisted-v3-independent-audit-20260726';
const REVIEW_TASK_ID = 'codex-semantic-review-fixture-20260726';
const MODEL_MANIFEST_PATH = 'data/enrichment-v3/manifest.json';
const ACCEPTED_MANIFEST_PATH =
  'enrichment/codex-assisted-v3/accepted-manifest.json';
const AUDIT_PATH =
  'whole-law/assurance/enrichment-v3-independent-audit-20260726.json';
const REVIEWER_PATH =
  'whole-law/assurance/enrichment-v3-reviewer-task-receipt.json';

async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const owned = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  owned.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', owned);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function gzipJson(value: unknown): Promise<Uint8Array> {
  return new Uint8Array(
    await new Response(
      new Response(JSON.stringify(value)).body!.pipeThrough(
        new CompressionStream('gzip')
      )
    ).arrayBuffer()
  );
}

function relationshipBucket(route: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(route)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body)
  });
}

async function installTargetedFixture(
  context: BrowserContext,
  requests: string[],
  options: {
    datasetGroupingCount?: number;
    modelChunkFailures?: number;
    omitAdjacency?: boolean;
    omitAnalysisRecordCount?: boolean;
    omitDeclaredRecordCount?: boolean;
    resourceHydrationSafe?: boolean;
  } = {}
) {
  let modelChunkFailuresRemaining = options.modelChunkFailures || 0;
  const bucket = relationshipBucket(RECORD_ROUTE);
  const record = {
    ordinal: 0,
    id: 'https://www.legislation.gov.uk/id/ukpga/1998/42',
    name: 'ukpga-1998-42',
    route: RECORD_ROUTE,
    title: 'Target Act 1998',
    notes: 'A deterministic legal work used to prove bounded record and relationship hydration.',
    publisher: 'legislation-gov-uk',
    publisher_title: 'legislation.gov.uk',
    resource_count: 1,
    resource_ids: ['target-act-html'],
    formats: ['clml', 'website'],
    tags: ['ukpga', 'year-1998'],
    topics: [],
    record_type: 'Legislation Work',
    timestamp: '1998-11-19T00:00:00Z',
    legislation_id_uri: 'https://www.legislation.gov.uk/id/ukpga/1998/42',
    document_uri: 'https://www.legislation.gov.uk/ukpga/1998/42',
    url: 'https://www.legislation.gov.uk/ukpga/1998/42',
    narrative: {
      title: 'Target Act within its enclosing process',
      body: 'This authored narrative explains **what comes before**, what happens here, and what may follow without replacing official guidance.',
      process: { route: 'process/target-legislation', label: 'Target legislation process' },
      previous: [{ route: 'episode/prepare-target-act', label: 'Prepare the route' }],
      next: [{ route: 'episode/follow-target-act', label: 'Follow the outcome' }],
      variants: [{ route: 'variant/scotland', label: 'Scotland variant' }],
      related: [{ route: 'dataset/related-target-act', label: 'Related route' }]
    },
    open: RECORD_ROUTE
  };
  const resource = {
    id: 'target-act-html',
    name: 'Target Act HTML',
    dataset: record.name,
    route: 'resource/target-act-html',
    format: 'HTML',
    host: 'www.legislation.gov.uk',
    position: 0,
    url: record.url,
    source_access: {
      url: `${ORIGIN}/official/target-act.xml`,
      label: 'Official XML source',
      media_type: 'application/xml',
      display_mode: 'xml'
    }
  };
  const relationships = [
    {
      source: RECORD_ROUTE,
      target: 'legislation-type/ukpga',
      kind: 'has document type',
      authority: 'official',
      confidence: 1,
      evidence: ['https://www.legislation.gov.uk/id/ukpga/1998/42']
    },
    {
      source: RECORD_ROUTE,
      target: 'category/primary-legislation',
      kind: 'has category',
      authority: 'derived',
      derivation: 'deterministic-type-code-map',
      confidence: 1
    }
  ];
  const modelSource = 'https://www.legislation.gov.uk/id/ukpga/1998/42';
  const titleLiteral = 'Target Act';
  const notesLiteral = 'bounded record';
  const modelRelationship = {
    schema: 'okf-relationship-assertion.v2',
    id: `urn:okf:enrichment:sha256:${'1'.repeat(64)}`,
    acceptance_id: `urn:okf:model-acceptance:${'2'.repeat(64)}`,
    source: modelSource,
    target: 'topic/consumer-credit',
    predicate: 'classified as',
    dimension: 'topic',
    rule_id: 'R001',
    rule_label: 'Consumer credit',
    authority: {
      class: 'model-assisted',
      label: 'Governed accepted model-assisted discovery metadata',
      source: 'https://github.com/chris-page-gov/okf-uk-legislation'
    },
    derivation: 'codex-authored-deterministic-literal-rule-v3',
    confidence: 0.97,
    rights: {
      source:
        'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      assertion: 'derived discovery metadata'
    },
    support_profile: 'multi-field',
    evidence: [
      {
        url: modelSource,
        type: 'literal-title-match',
        source_field: 'title',
        field_provenance: 'official-source-record-work-title',
        source_value: record.title,
        source_value_sha256: await sha256(JSON.stringify(record.title)),
        source_value_hash_canonicalization: 'canonical-json-utf8',
        normalization: 'Unicode-NFC-and-whitespace-collapse',
        value: titleLiteral,
        literal_sha256: await sha256(titleLiteral),
        rule_id: 'R001',
        rationale: 'The title supplies the governed literal.'
      },
      {
        url: modelSource,
        type: 'literal-notes-match',
        source_field: 'notes',
        field_provenance: 'official-source-record-explanatory-note-or-long-title-equivalent',
        source_value: record.notes,
        source_value_sha256: await sha256(JSON.stringify(record.notes)),
        source_value_hash_canonicalization: 'canonical-json-utf8',
        normalization: 'Unicode-NFC-and-whitespace-collapse',
        value: notesLiteral,
        literal_sha256: await sha256(notesLiteral),
        rule_id: 'R001',
        rationale: 'The notes independently support the same conservative discovery topic.'
      }
    ],
    review_status: 'accepted-independent-review',
    review: {
      audit_id: AUDIT_ID,
      audit_path: AUDIT_PATH,
      verdict_id: `urn:okf:enrichment-review-verdict:${'3'.repeat(64)}`,
      review_task_id: REVIEW_TASK_ID,
      semantic_reviewer: 'Codex fixture reviewer'
    },
    verified: [
      {
        by: 'process:independent-deterministic-reconstruction',
        at: '2026-07-26T12:00:00Z',
        method: 'source/rule/evidence/identifier reconstruction',
        scope: 'literal discovery metadata; not legal classification'
      },
      {
        by: 'process:separate-codex-semantic-review',
        at: '2026-07-26T12:00:00Z',
        method: 'hash-bound semantic policy review',
        scope: REVIEW_TASK_ID
      }
    ],
    official_legal_classification: false,
    freshness: 'current'
  };
  const modelChunkBodies = await Promise.all([
    gzipJson([modelRelationship]),
    gzipJson([]),
    gzipJson([]),
    gzipJson([])
  ]);
  const modelChunks = await Promise.all(
    modelChunkBodies.map(async (body, index) => ({
      path: `enrichment/codex-assisted-v3/accepted-assertions/assertions-${String(index).padStart(3, '0')}.json.gz`,
      sha256: await sha256(body),
      bytes: body.byteLength,
      records: index === 0 ? 1 : 0,
      compression: 'gzip',
      media_type: 'application/json'
    }))
  );
  const modelCounts = {
    assertions: 1,
    by_kind: { topic: 1, concept: 0, entity: 0 },
    by_support: {
      'title-only': 0,
      'notes-only': 0,
      'metadata-only': 0,
      'multi-field': 1
    }
  };
  const reviewerReceipt = {
    schema: 'okf-codex-semantic-review-task-receipt.v1',
    status: 'accepted',
    review_task_id: REVIEW_TASK_ID,
    reviewer_visible_model_label: 'Codex fixture reviewer',
    reviewed_materials: {
      generator_executable_sha256: '0'.repeat(64),
      generator_prompt_sha256: '1'.repeat(64),
      reviewer_prompt_sha256: '2'.repeat(64),
      rules_sha256: '3'.repeat(64),
      review_policy_sha256: '4'.repeat(64),
      calibration_sha256: '5'.repeat(64),
      calibration_result_sha256: '6'.repeat(64),
      source_corpus_semantic_sha256: '7'.repeat(64),
      candidate_manifest_sha256: '8'.repeat(64),
      terminal_outcome_manifest_sha256: '9'.repeat(64),
      coverage_sha256: 'a'.repeat(64),
      checkpoints_sha256: 'b'.repeat(64)
    },
    verdict: 'accepted',
    source_edits_made_by_reviewer: false
  };
  const reviewerBody = JSON.stringify(reviewerReceipt);
  const reviewerBinding = {
    path: REVIEWER_PATH,
    bytes: new TextEncoder().encode(reviewerBody).byteLength,
    sha256: await sha256(reviewerBody)
  };
  const acceptedManifest = {
    schema: 'okf-enrichment-accepted-assertion-manifest.v3',
    id: 'uk-legislation-codex-assisted-v3-accepted',
    audit_id: AUDIT_ID,
    generated_at: '2026-07-26T12:00:00Z',
    snapshot_id: SNAPSHOT,
    review_materials_sha256: 'c'.repeat(64),
    counts: modelCounts,
    authority: 'derived-model-assisted-discovery-metadata',
    official_legal_classification: false,
    chunks: modelChunks.map((chunk) => ({
      ...chunk,
      path: `bundle/${chunk.path}`
    }))
  };
  const acceptedBody = JSON.stringify(acceptedManifest);
  const acceptedBinding = {
    path: ACCEPTED_MANIFEST_PATH,
    bytes: new TextEncoder().encode(acceptedBody).byteLength,
    sha256: await sha256(acceptedBody),
    schema: 'okf-enrichment-accepted-assertion-manifest.v3',
    audit_id: AUDIT_ID
  };
  const independentAudit = {
    schema: 'okf-enrichment-independent-audit.v3',
    audit_id: AUDIT_ID,
    audit_date: '2026-07-26',
    artifact_state: 'hash-bound-accepted',
    materials: {
      accepted_manifest: {
        path: `bundle/${ACCEPTED_MANIFEST_PATH}`,
        bytes: acceptedBinding.bytes,
        sha256: acceptedBinding.sha256
      },
      reviewer_task_receipt: {
        path: 'enrichment/codex-assisted-v3/reviewer-task-receipt.json',
        bytes: reviewerBinding.bytes,
        sha256: reviewerBinding.sha256
      }
    },
    counts: {
      accepted_assertions: modelCounts.assertions,
      accepted_by_kind: modelCounts.by_kind,
      accepted_by_support: modelCounts.by_support
    },
    checks: [
      { id: 'fixture-hash-bindings', status: 'passed' },
      { id: 'fixture-semantic-review', status: 'passed' }
    ],
    decision: {
      independent_review_status: 'accepted',
      release_gate_passed: true,
      accepted_assertions: modelCounts.assertions,
      accepted_by_kind: modelCounts.by_kind,
      errors: [],
      candidate_modified_by_audit: false
    }
  };
  const auditBody = JSON.stringify(independentAudit);
  const auditBinding = {
    path: AUDIT_PATH,
    bytes: new TextEncoder().encode(auditBody).byteLength,
    sha256: await sha256(auditBody)
  };
  const modelManifest = {
    schema: 'okf-provider-datapack.v1',
    id: 'uk-legislation-codex-assisted-v3-accepted',
    snapshot_id: SNAPSHOT,
    generated_at: '2026-07-26T12:00:00Z',
    authority: 'derived-model-assisted-discovery-metadata',
    official_legal_classification: false,
    source_contract: acceptedBinding,
    independent_audit: auditBinding,
    semantic_reviewer: reviewerBinding,
    counts: modelCounts,
    relationship_kinds: [
      { dimension: 'topic', predicate: 'classified as', count: 1 },
      { dimension: 'concept', predicate: 'has discovery concept', count: 0 },
      { dimension: 'entity', predicate: 'mentions entity', count: 0 }
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
    chunks: modelChunks
  };
  const descriptor = {
    schema: 'okf-explorer-large-corpus.v1',
    kind: 'okf-large-corpus',
    title: 'Targeted legislation hydration fixture',
    description: 'A huge logical corpus with bounded record and relationship indexes.',
    snapshot: SNAPSHOT,
    counts: {
      datasets: options.datasetGroupingCount
        ?? (options.resourceHydrationSafe ? 4 : 365_786),
      ...(options.omitDeclaredRecordCount
        ? {}
        : { records: options.resourceHydrationSafe ? 4 : 365_786 }),
      resources: 1,
      relationships: 853_883
    },
    vocabulary: {
      record_singular: 'legal work',
      record_plural: 'legal works',
      resource_singular: 'manifestation',
      resource_plural: 'manifestations',
      search_placeholder: 'Search targeted legislation'
    },
    entrypoints: {
      data_manifest: 'data/manifest.json',
      overview_index: 'data/overview.json',
      analysis_overview: 'data/analysis.json',
      search_manifest: 'search/manifest.json',
      record_locator: 'data/records/manifest.json',
      ...(options.omitAdjacency
        ? {}
        : { relationship_adjacency: 'data/adjacency/manifest.json' }),
      model_enrichment_v3: {
        path: MODEL_MANIFEST_PATH,
        sha256: await sha256(JSON.stringify(modelManifest))
      },
      model_enrichment_v3_accepted_manifest: acceptedBinding,
      model_enrichment_v3_independent_audit: auditBinding,
      model_enrichment_v3_reviewer: reviewerBinding,
      model_enrichment_v2_historical: 'enrichment/codex-assisted-v2/run.json'
    },
    extensions: {
      'okf-official-effects.v1': {
        reconciliation: 'data/effects/reconciliation.json'
      },
      'okf-legislation-corpus.v1': {
        remote_full_text_search: `${ORIGIN}/official-search?query={query}`
      },
      'okf-model-enrichment.v3': {
        entrypoint: 'model_enrichment_v3',
        accepted_manifest: 'model_enrichment_v3_accepted_manifest',
        independent_audit: 'model_enrichment_v3_independent_audit',
        semantic_reviewer: 'model_enrichment_v3_reviewer',
        accepted_assertions: 1,
        accepted_by_kind: { topic: 1, concept: 0, entity: 0 },
        official_legal_classification: false
      },
      'okf-model-enrichment.v2-historical': {
        entrypoint: 'model_enrichment_v2_historical',
        included_in_active_relationship_totals: false
      }
    }
  };
  const manifest = {
    title: descriptor.title,
    generated_at: '2026-07-25T00:00:00Z',
    snapshot: SNAPSHOT,
    counts: descriptor.counts,
    indexes: {
      overview: 'data/overview.json',
      analysis: 'data/analysis.json',
      facets: 'data/facets.json',
      search: 'search/manifest.json',
      record_locator: 'data/records/manifest.json',
      ...(options.omitAdjacency
        ? {}
        : { relationship_adjacency: 'data/adjacency/manifest.json' })
    },
    chunks: {
      datasets: [
        'data/works-0.json',
        'data/works-1.json',
        'data/works-2.json',
        'data/works-3.json'
      ],
      resources: ['data/resources.json'],
      publishers: [],
      relationships: ['data/relationships-full.json']
    }
  };
  const locator = {
    schema: 'okf-record-locator-sharded.v1',
    algorithm: 'fnv1a32-prefix-2',
    snapshot: SNAPSHOT,
    records: 365_786,
    chunk_size: 100_000,
    record_chunks: manifest.chunks.datasets,
    buckets: { [bucket]: `data/records/${bucket}.json` },
    bucket_count: 1
  };
  const adjacency = {
    schema: 'okf-relationship-adjacency.v1',
    algorithm: 'fnv1a32-prefix-2',
    snapshot: SNAPSHOT,
    routes: 365_786,
    relationships: 853_883,
    buckets: { [bucket]: `data/adjacency/${bucket}.json` }
  };
  const searchManifest = {
    schema: 'okf-static-search.v1',
    snapshot: SNAPSHOT,
    token_min_length: 2,
    prefix_min_length: 3,
    lexicon_shard_length: 2,
    result_limit: 200,
    result_doc_chunk_size: 1000,
    weights: {},
    field_masks: {},
    counts: {
      documents: 365_786,
      tokens: 0,
      postings_shards: 0,
      doc_map_shards: 1,
      max_postings_per_token: 10_000
    },
    entrypoints: {
      lexicon: {},
      prefixes: {},
      postings: [],
      result_docs: [],
      facets: 'data/facets.json',
      doc_map: 'search/doc-map.json'
    }
  };
  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Official legislation search</title>
  <entry>
    <id>https://www.legislation.gov.uk/id/ukpga/1998/42</id>
    <title>Target Act 1998</title>
    <updated>1998-11-19T00:00:00Z</updated>
    <summary>Deterministic official search match.</summary>
    <link href="https://www.legislation.gov.uk/ukpga/1998/42" />
    <link rel="alternate" type="application/xml" href="https://www.legislation.gov.uk/ukpga/1998/42/data.xml" />
    <link rel="alternate" type="text/html" href="https://www.legislation.gov.uk/ukpga/1998/42" />
  </entry>
</feed>`;

  await context.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    if (url.pathname === '/official-search') {
      return route.fulfill({
        status: 200,
        contentType: 'application/atom+xml',
        headers: { 'access-control-allow-origin': '*' },
        body: atom
      });
    }
    if (url.pathname === '/official/target-act.xml') {
      return route.fulfill({
        status: 200,
        contentType: 'application/xml',
        headers: { 'access-control-allow-origin': '*' },
        body: '<official-source><title>Target Act source response</title></official-source>'
      });
    }
    if (url.pathname === '/okf-explorer.json') return json(route, descriptor);
    if (url.pathname === '/data/manifest.json') return json(route, manifest);
    if (url.pathname === '/data/overview.json') {
      return json(route, {
        schema: 'okf-overview.v1',
        title: descriptor.title,
        snapshot: SNAPSHOT,
        generated_at: '2026-07-25T00:00:00Z',
        counts: descriptor.counts
      });
    }
    if (url.pathname === '/data/analysis.json') {
      return json(route, {
        schema: 'okf-explorer-analysis.v1',
        generated_at: '2026-07-25T00:00:00Z',
        summary: {
          title: descriptor.title,
          ...(options.omitAnalysisRecordCount
            ? {}
            : { record_count: descriptor.counts.records }),
          relationship_count: descriptor.counts.relationships
        }
      });
    }
    if (url.pathname === '/data/facets.json') return json(route, {});
    if (url.pathname === '/data/effects/reconciliation.json') {
      return json(route, {
        schema: 'okf-official-effects-reconciliation.v1',
        snapshot_id: 'effects-fixture-2026-07-25',
        generated_at: '2026-07-25T23:00:00Z',
        post_build_live: {
          observed_at: '2026-07-25T23:15:00Z',
          states: {
            agreement: 7,
            'live-addition': 2,
            superseded: 1,
            inaccessible: 3
          },
          scope: {
            statement: 'A bounded deterministic fixture comparison.'
          }
        },
        notice: 'A fixture refresh never rewrites historical evidence.'
      });
    }
    if (url.pathname === '/search/manifest.json') return json(route, searchManifest);
    if (url.pathname === '/search/doc-map.json') return json(route, {});
    if (url.pathname === '/data/records/manifest.json') return json(route, locator);
    if (url.pathname === `/data/records/${bucket}.json`) {
      return json(route, { [RECORD_ROUTE]: [0, 0] });
    }
    if (url.pathname === '/data/works-0.json') return json(route, [record]);
    if (url.pathname === '/data/resources.json') return json(route, [resource]);
    if (url.pathname === '/data/adjacency/manifest.json') return json(route, adjacency);
    if (url.pathname === `/data/adjacency/${bucket}.json`) {
      return json(route, { [RECORD_ROUTE]: relationships });
    }
    if (url.pathname === `/${MODEL_MANIFEST_PATH}`) {
      return json(route, modelManifest);
    }
    if (url.pathname === `/${ACCEPTED_MANIFEST_PATH}`) {
      return json(route, acceptedManifest);
    }
    if (url.pathname === `/${AUDIT_PATH}`) {
      return json(route, independentAudit);
    }
    if (url.pathname === `/${REVIEWER_PATH}`) {
      return json(route, reviewerReceipt);
    }
    const modelChunkIndex = modelChunks.findIndex((chunk) => `/${chunk.path}` === url.pathname);
    if (modelChunkIndex >= 0) {
      if (modelChunkFailuresRemaining > 0) {
        modelChunkFailuresRemaining -= 1;
        return json(route, { error: 'Accepted assertion shard temporarily unavailable' }, 503);
      }
      const nodeBuffer = (
        globalThis as unknown as {
          Buffer: { from(value: Uint8Array): unknown };
        }
      ).Buffer.from(modelChunkBodies[modelChunkIndex]);
      return route.fulfill({
        status: 200,
        contentType: 'application/gzip',
        headers: {
          'access-control-allow-origin': '*',
          'content-length': String(modelChunkBodies[modelChunkIndex].byteLength)
        },
        // Playwright requires Node's Buffer class (not a plain Uint8Array) for
        // byte-exact pre-compressed response bodies.
        body: nodeBuffer as string
      });
    }
    if (/^\/data\/works-[1-3]\.json$/.test(url.pathname)) return json(route, []);
    if (url.pathname === '/data/relationships-full.json') return json(route, relationships);
    return json(route, { error: `No fixture route for ${url.pathname}` }, 404);
  });
}

function expectNoFullHydration(requests: string[]) {
  expect(requests.filter((path) => /^\/data\/works-[1-3]\.json$/.test(path))).toEqual([]);
  expect(requests).not.toContain('/data/relationships-full.json');
}

test.describe('targeted large-corpus relationship hydration', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test('overview uses the declared record count rather than the dataset grouping count', async ({
    page
  }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests, {
      datasetGroupingCount: 14,
      omitAnalysisRecordCount: true
    });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=reader#overview`);

    const recordMetric = page.locator('[data-metric="legal-works"]');
    await expect(recordMetric.locator('strong')).toHaveText('365,786');
    await expect(recordMetric.locator('span')).toHaveText('legal works');

    await page.getByLabel('Views').getByRole('button', { name: 'Timeline', exact: true }).click();
    await expect(page.getByText('365,786 legal works in overview')).toBeVisible();
  });

  test('overview keeps the legacy dataset-count fallback when no record count is declared', async ({
    page
  }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests, {
      datasetGroupingCount: 14,
      omitAnalysisRecordCount: true,
      omitDeclaredRecordCount: true
    });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=reader#overview`);

    const recordMetric = page.locator('[data-metric="legal-works"]');
    await expect(recordMetric.locator('strong')).toHaveText('14');
    await expect(recordMetric.locator('span')).toHaveText('legal works');
  });

  test('deep-linked Graph loads bounded adjacency without hydrating the full corpus', async ({ page }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=graph#${RECORD_ROUTE}`);

    await expect(page.getByRole('group', { name: 'Large corpus graph' })).toBeVisible();
    await expect(page.locator('.graph-summary')).toContainText('10 nodes · 9 relationships');
    expect(requests).toContain('/data/adjacency/manifest.json');
    expect(requests).toContain(`/data/adjacency/${relationshipBucket(RECORD_ROUTE)}.json`);
    expectNoFullHydration(requests);
    await expect(page.getByText(/browser memory safety limit/i)).toHaveCount(0);

    await page.getByLabel('Views').getByRole('button', { name: 'Reader', exact: true }).click();
    const modelEnrichment = page.getByRole('region', {
      name: 'Model-assisted enrichment provenance'
    });
    await expect(modelEnrichment).toHaveAttribute(
      'data-model-enrichment-status',
      'ready'
    );
    const assertionCount = modelEnrichment.locator('.enrichment-counts article').first();
    await expect(assertionCount.locator('strong')).toHaveText('1');
    await expect(assertionCount.locator('span')).toHaveText('accepted assertions');
  });

  test('deep-linked Resources hydrates the resource index for the selected record', async ({
    page
  }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests, {
      resourceHydrationSafe: true
    });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=resources#${RECORD_ROUTE}`);

    await expect(page.getByRole('heading', { name: 'Resource stack' })).toBeVisible();
    await expect(page.getByText('1 manifestations shown from current reduction')).toBeVisible();
    await expect(page.getByRole('button', { name: /Target Act HTML/ })).toBeVisible();
    expect(requests).toContain('/data/resources.json');
  });

  test('record Narrative uses authored process context and typed XML source access', async ({
    page
  }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests, {
      resourceHydrationSafe: true
    });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}&view=resources#${RECORD_ROUTE}`);
    await expect(page.getByRole('button', { name: /Target Act HTML/ })).toBeVisible();

    await page.getByLabel('Views').getByRole('button', { name: 'Narrative', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Target Act within its enclosing process' })).toBeVisible();
    await expect(page.locator('.record-narrative-body')).toContainText('what comes before');
    await expect(page.getByRole('navigation', { name: 'Enclosing process and related routes' })).toContainText('Target legislation process');
    await expect(page.getByRole('navigation', { name: 'Enclosing process and related routes' })).toContainText('Follow the outcome');

    await page.locator('.right-panel').getByRole('button', { name: 'View source data', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Source data' })).toBeVisible();
    await expect(page.getByText('Displayed as inert text; Explorer does not execute source markup.')).toBeVisible();
    await expect(page.locator('.raw-panel pre')).toContainText('<official-source><title>Target Act source response</title></official-source>');
    await expect(page.locator('.source-inspector').getByRole('link', { name: 'Open source XML ↗' })).toHaveAttribute('target', '_blank');
    expect(requests).toContain('/official/target-act.xml');
  });

  test('Reader does not bypass the relationship memory guard when adjacency is absent', async ({
    page
  }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests, {
      omitAdjacency: true
    });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#${RECORD_ROUTE}`);

    await expect(page.locator('.right-panel').getByRole('heading', {
      name: 'Target Act 1998'
    })).toBeVisible();
    expect(requests).toContain('/data/works-0.json');
    expect(requests).not.toContain('/data/adjacency/manifest.json');
    expect(requests).not.toContain('/data/relationships-full.json');
    expectNoFullHydration(requests);
  });

  test('Reader presents all four official-effects reconciliation states explicitly', async ({ page }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#overview`);

    const reconciliation = page.getByRole('region', {
      name: 'Official effects live reconciliation'
    });
    await expect(reconciliation).toBeVisible();
    for (const [state, count] of [
      ['agreement', '7'],
      ['live-addition', '2'],
      ['superseded', '1'],
      ['inaccessible', '3']
    ] as const) {
      await expect(reconciliation.locator(`[data-reconciliation-state="${state}"]`)).toContainText(count);
    }
    const modelEnrichment = page.getByRole('region', {
      name: 'Model-assisted enrichment provenance'
    });
    await expect(modelEnrichment).toBeVisible();
    await expect(modelEnrichment).toContainText(
      'Governed accepted model-assisted enrichment v3'
    );
    await expect(modelEnrichment).toContainText('Not official effects');
    await expect(modelEnrichment).toHaveAttribute(
      'data-model-enrichment-mode',
      'governed-v3'
    );
    await expect(modelEnrichment).toHaveAttribute(
      'data-model-enrichment-status',
      'declared'
    );
    await expect(modelEnrichment.getByRole('status')).toContainText(
      'Accepted topic, concept and entity assertions'
    );
    expect(requests).toContain('/data/effects/reconciliation.json');
    expect(requests).not.toContain('/data/enrichment-v3/manifest.json');
    expectNoFullHydration(requests);
  });

  test('official search selection hydrates the selected route when Graph opens', async ({ page }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#overview`);

    const search = page.getByPlaceholder('Search targeted legislation');
    await search.fill('Target Act');
    const result = page.locator('.result-list button').filter({ hasText: 'Target Act 1998' }).first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page.locator('.right-panel')).toContainText('Relationships (3)');
    expect(requests).toContain('/data/adjacency/manifest.json');
    expect(requests).toContain(`/data/adjacency/${relationshipBucket(RECORD_ROUTE)}.json`);
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    await expect(
      graph.getByRole('button', { name: 'Target Act 1998 → classified as → consumer-credit' })
    ).toBeVisible();
    await expect(
      graph.getByRole('button', { name: 'Target Act 1998 → has document type → ukpga' })
    ).toBeVisible();
    const relationshipStyles = await graph.locator('.graph-edge').evaluateAll((edges) => edges.map((edge) => ({
      authority: edge.getAttribute('data-relationship-authority'),
      stroke: getComputedStyle(edge).stroke,
      dasharray: getComputedStyle(edge).strokeDasharray
    })));
    const officialStyle = relationshipStyles.find((edge) => edge.authority === 'official');
    const modelStyle = relationshipStyles.find((edge) => edge.authority === 'model-assisted');
    const derivedStyle = relationshipStyles.find((edge) => edge.authority === 'derived');
    expect(officialStyle?.stroke).toBeTruthy();
    expect(modelStyle?.stroke).toBeTruthy();
    expect(derivedStyle?.stroke).toBeTruthy();
    expect(modelStyle?.stroke).not.toBe(officialStyle?.stroke);
    expect(derivedStyle?.stroke).not.toBe(officialStyle?.stroke);
    expect(modelStyle?.dasharray).not.toBe('none');
    expect(derivedStyle?.dasharray).not.toBe('none');

    const authorityFilters = page.getByLabel('Relationship authority filters');
    const modelFilter = authorityFilters.getByRole('button', {
      name: 'Model-assisted relationships'
    });
    await expect(modelFilter).toHaveAttribute('aria-pressed', 'true');
    await modelFilter.click();
    await expect(modelFilter).toHaveAttribute('aria-pressed', 'false');
    await expect(graph.locator('.graph-edge[data-relationship-authority="model-assisted"]')).toHaveCount(0);
    await expect(graph.locator('.graph-edge[data-relationship-authority="official"]')).toHaveCount(1);
    await expect(graph.locator('.graph-edge[data-relationship-authority="derived"]')).toHaveCount(1);
    await expect(page).toHaveURL(/graph\.hideAuthority=model-assisted/);
    await modelFilter.click();
    await expect(graph.locator('.graph-edge[data-relationship-authority="model-assisted"]')).toHaveCount(1);

    const modelRelationship = graph.getByRole('button', {
      name: 'Target Act 1998 → classified as → consumer-credit'
    });
    await modelRelationship.click();
    const provenance = page.getByRole('region', {
      name: 'Model-assisted relationship provenance'
    });
    await expect(provenance).toBeVisible();
    await expect(provenance).toHaveAttribute('data-support-profile', 'multi-field');
    await expect(provenance).toContainText(
      'not an official legal effect or legal classification'
    );
    await expect(provenance).toContainText('accepted-independent-review');
    await expect(provenance).toContainText('Governed discovery metadata');
    const relationshipDetail = page.locator('.relationship-detail-content');
    await expect(
      relationshipDetail.getByRole('link', {
        name:
          'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
      })
    ).toHaveAttribute(
      'href',
      'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
    );
    expect(
      await provenance
        .locator('[data-evidence-source-field]')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-evidence-source-field')))
    ).toEqual(['title', 'notes']);
    await expect(
      provenance.locator('[data-evidence-source-field="title"]')
    ).toContainText('Target Act 1998');
    await expect(
      provenance.locator('[data-evidence-source-field="notes"]')
    ).toContainText('bounded record and relationship hydration');

    expect(requests.filter((path) => path === '/data/adjacency/manifest.json')).toHaveLength(1);
    expect(requests.filter((path) => path === '/data/enrichment-v3/manifest.json')).toHaveLength(1);
    expect(
      requests.filter((path) =>
        path.endsWith('/accepted-assertions/assertions-000.json.gz')
      )
    ).toHaveLength(1);
    expectNoFullHydration(requests);
    await expect(page.getByText(/browser memory safety limit/i)).toHaveCount(0);
  });

  test('announces an incomplete v3 route and retries it without retaining model rows', async ({
    page
  }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests, {
      modelChunkFailures: 3
    });
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#overview`);

    await page.getByPlaceholder('Search targeted legislation').fill('Target Act');
    const result = page.locator('.result-list button').filter({
      hasText: 'Target Act 1998'
    }).first();
    await expect(result).toBeVisible();
    await result.click();
    const viewTabs = page.getByLabel('Views');
    await viewTabs.getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    const incompleteAlert = page.getByRole('alert');
    await expect(incompleteAlert).toHaveAttribute(
      'data-incomplete-route',
      RECORD_ROUTE
    );
    await expect(incompleteAlert).toContainText(
      /governed model-assisted v3 enrichment is unavailable/i
    );
    await expect(
      graph.locator('.graph-edge[data-relationship-authority="model-assisted"]')
    ).toHaveCount(0);
    await expect(
      graph.locator('.graph-edge[data-relationship-authority="official"]')
    ).toHaveCount(1);
    await expect(
      graph.locator('.graph-edge[data-relationship-authority="derived"]')
    ).toHaveCount(1);

    await viewTabs.getByRole('button', { name: 'Reader', exact: true }).click();
    await viewTabs.getByRole('button', { name: 'Graph', exact: true }).click();
    await expect(
      graph.locator('.graph-edge[data-relationship-authority="model-assisted"]')
    ).toHaveCount(1);
    await expect(incompleteAlert).toHaveCount(0);
    expect(
      requests.filter((path) =>
        path.endsWith('/accepted-assertions/assertions-000.json.gz')
      )
    ).toHaveLength(4);
    expectNoFullHydration(requests);
  });

  test('graph commands have names and no interactive container nests controls', async ({ page }) => {
    const requests: string[] = [];
    await installTargetedFixture(page.context(), requests);
    await page.goto(`?bundle=${encodeURIComponent(BUNDLE_URL)}#overview`);
    await page.getByPlaceholder('Search targeted legislation').fill('Target Act');
    const result = page.locator('.result-list button').filter({ hasText: 'Target Act 1998' }).first();
    await expect(result).toBeVisible();
    await result.click();
    await page.getByLabel('Views').getByRole('button', { name: 'Graph', exact: true }).click();

    const graph = page.getByRole('group', { name: 'Large corpus graph' });
    await expect(graph).toBeVisible();
    const graphCommands = graph.locator('[role="button"]');
    expect(await graphCommands.count()).toBeGreaterThan(0);
    for (let index = 0; index < await graphCommands.count(); index += 1) {
      await expect(graphCommands.nth(index)).toHaveAccessibleName(/\S/);
    }
    for (const route of [
      RECORD_ROUTE,
      'topic/consumer-credit',
      'legislation-type/ukpga',
      'publisher/legislation-gov-uk',
      'format/clml',
      'tag/ukpga'
    ]) {
      await expect(graph.locator(`[data-route="${route}"][role="button"]`)).toHaveAccessibleName(/\S/);
    }

    const summary = page.locator('.edge-drawer > summary');
    await expect(summary).toHaveAccessibleName(/Relationships panel/);
    await expect(summary.getByRole('button')).toHaveCount(0);
    const beforeResize = await summary.getAttribute('aria-label');
    await summary.focus();
    await page.keyboard.press('ArrowUp');
    await expect(summary).not.toHaveAttribute('aria-label', beforeResize || '');
    await expect(page.locator('.edge-drawer')).toHaveAttribute('open', '');

    const analysis = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      analysis.violations.filter((violation) =>
        ['nested-interactive', 'aria-command-name'].includes(violation.id)
      )
    ).toEqual([]);
    expect(
      analysis.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
      )
    ).toEqual([]);
    expectNoFullHydration(requests);
  });
});
