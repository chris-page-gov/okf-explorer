import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonResource } from './fetch';
import {
  MAX_MODEL_ENRICHMENT_CHUNK_BYTES,
  normalizeModelRelationshipRows,
  normalizeRelationshipDatapackManifest
} from './largeCorpus';
import { sha256Hex } from './releaseDataPlane';

const SNAPSHOT = 'legislation-work-index-2026-07-11T18:00:00Z';
const SOURCE = 'https://www.legislation.gov.uk/id/uksi/2026/99';
const AUDIT_PATH =
  'whole-law/assurance/enrichment-v3-independent-audit-20260726.json';
const ITEM_FIELDS = [
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
];

async function acceptedRow(source = SOURCE) {
  const sourceValue = 'The Consumer Credit Regulations 2026 regulate consumer credit.';
  const value = 'Consumer Credit';
  return {
    schema: 'okf-relationship-assertion.v2',
    id: `urn:okf:enrichment:sha256:${'1'.repeat(64)}`,
    acceptance_id: `urn:okf:model-acceptance:${'2'.repeat(64)}`,
    source,
    target: 'topic/consumer-credit',
    predicate: 'classified as',
    dimension: 'topic',
    rule_id: 'R001',
    authority: { class: 'model-assisted' },
    derivation: 'codex-authored-deterministic-literal-rule-v3',
    confidence: 0.98,
    rights: {
      source:
        'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
      assertion: 'derived discovery metadata'
    },
    support_profile: 'title-only',
    evidence: [
      {
        url: source,
        type: 'literal-title-match',
        source_field: 'title',
        field_provenance: 'official-source-record-work-title',
        source_value: sourceValue,
        source_value_sha256: await sha256Hex(JSON.stringify(sourceValue)),
        source_value_hash_canonicalization: 'canonical-json-utf8',
        normalization: 'Unicode-NFC-and-whitespace-collapse',
        value,
        literal_sha256: await sha256Hex(value),
        rule_id: 'R001',
        rationale: 'The official work title contains the governed literal.'
      }
    ],
    review_status: 'accepted-independent-review',
    official_legal_classification: false,
    freshness: 'current',
    review: {
      audit_id: 'codex-assisted-v3-independent-audit-20260726',
      audit_path: AUDIT_PATH,
      review_task_id: 'review-task-fixture',
      verdict_id: 'verdict-fixture'
    },
    verified: [
      { by: 'process:fixture-reconstruction' },
      { by: 'process:fixture-semantic-review' }
    ]
  };
}

function projectionManifest() {
  return {
    schema: 'okf-provider-datapack.v1',
    id: 'uk-legislation-codex-assisted-v3-accepted',
    snapshot_id: SNAPSHOT,
    generated_at: '2026-07-26T12:00:00Z',
    authority: 'derived-model-assisted-discovery-metadata',
    official_legal_classification: false,
    source_contract: {
      path: 'enrichment/codex-assisted-v3/accepted-manifest.json',
      bytes: 123,
      sha256: '1'.repeat(64),
      schema: 'okf-enrichment-accepted-assertion-manifest.v3'
    },
    independent_audit: {
      path: 'whole-law/assurance/enrichment-v3-independent-audit-20260726.json',
      bytes: 456,
      sha256: '2'.repeat(64)
    },
    semantic_reviewer: {
      path: 'whole-law/assurance/enrichment-v3-reviewer-task-receipt.json',
      bytes: 789,
      sha256: '3'.repeat(64)
    },
    counts: {
      assertions: 1,
      by_kind: { topic: 1, concept: 0, entity: 0 },
      by_support: {
        'title-only': 1,
        'notes-only': 0,
        'metadata-only': 0,
        'multi-field': 0
      }
    },
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
      item_fields: ITEM_FIELDS
    },
    chunks: [
      {
        path:
          'enrichment/codex-assisted-v3/accepted-assertions/assertions-000.json.gz',
        sha256: '4'.repeat(64),
        bytes: 100,
        records: 1,
        compression: 'gzip',
        media_type: 'application/json'
      }
    ]
  };
}

describe('governed model-enrichment v3 contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('distinguishes canonical JSON source hashes from raw literal hashes', async () => {
    const row = await acceptedRow();
    await expect(normalizeModelRelationshipRows([row], 1, 'v3')).resolves.toEqual([
      expect.objectContaining({
        source: 'dataset/uksi-2026-99',
        support_profile: 'title-only'
      })
    ]);

    const invalid = structuredClone(row);
    invalid.evidence[0].source_value_sha256 = await sha256Hex(
      invalid.evidence[0].source_value
    );
    await expect(normalizeModelRelationshipRows([invalid], 1, 'v3')).rejects.toThrow(
      /invalid digest/
    );
  });

  it('canonicalizes historical regnal legislation identifiers to record routes', async () => {
    const row = await acceptedRow(
      'https://www.legislation.gov.uk/id/aep/WillandMar/5-6/20'
    );
    await expect(normalizeModelRelationshipRows([row], 1, 'v3')).resolves.toEqual([
      expect.objectContaining({
        source: 'dataset/aep-willandmar-5-6-20'
      })
    ]);
  });

  it('rejects reordered evidence profiles and undeclared normalization', async () => {
    const row = await acceptedRow();
    row.support_profile = 'notes-only';
    row.evidence[0].normalization = 'raw-text';
    await expect(normalizeModelRelationshipRows([row], 1, 'v3')).rejects.toThrow(
      /evidence 0 is malformed/
    );
  });

  it('rejects duplicate accepted identifiers within a digest batch', async () => {
    const row = await acceptedRow();
    const duplicate = structuredClone(row);
    duplicate.acceptance_id = `urn:okf:model-acceptance:${'3'.repeat(64)}`;
    await expect(
      normalizeModelRelationshipRows([row, duplicate], 2, 'v3')
    ).rejects.toThrow(/assertion 1 is malformed/);
  });

  it('rejects non-official sources and dimension-mismatched target routes', async () => {
    const untrustedSource = await acceptedRow('https://example.test/id/uksi/2026/99');
    await expect(
      normalizeModelRelationshipRows([untrustedSource], 1, 'v3')
    ).rejects.toThrow(/not an official legislation identifier/);

    const wrongTopicTarget = await acceptedRow();
    wrongTopicTarget.target = 'entity/consumer-credit';
    await expect(
      normalizeModelRelationshipRows([wrongTopicTarget], 1, 'v3')
    ).rejects.toThrow(/topic relationship target is malformed/);

    const disguisedPredicate = {
      ...(await acceptedRow()),
      kind: 'classified as',
      predicate: 'mentions entity'
    };
    await expect(
      normalizeModelRelationshipRows([disguisedPredicate], 1, 'v3')
    ).rejects.toThrow(/assertion 0 is malformed/);

    const concept = await acceptedRow();
    concept.dimension = 'concept';
    concept.predicate = 'has discovery concept';
    concept.target =
      'https://chris-page-gov.github.io/okf-uk-legislation/profile/whole-law/v1#concept-consumer-credit';
    await expect(
      normalizeModelRelationshipRows([concept], 1, 'v3')
    ).resolves.toEqual([
      expect.objectContaining({ target: concept.target })
    ]);
  });

  it('rejects relationship and acceptance identifiers duplicated across chunks', async () => {
    const registry = {
      relationshipIds: new Set<string>(),
      acceptanceIds: new Set<string>()
    };
    const first = await acceptedRow();
    await normalizeModelRelationshipRows([first], 1, 'v3', { registry });

    const duplicateRelationship = await acceptedRow();
    duplicateRelationship.acceptance_id =
      `urn:okf:model-acceptance:${'3'.repeat(64)}`;
    await expect(
      normalizeModelRelationshipRows([duplicateRelationship], 1, 'v3', {
        registry
      })
    ).rejects.toThrow(/duplicated across chunks/);

    const duplicateAcceptance = await acceptedRow();
    duplicateAcceptance.id = `urn:okf:enrichment:sha256:${'4'.repeat(64)}`;
    await expect(
      normalizeModelRelationshipRows([duplicateAcceptance], 1, 'v3', {
        registry
      })
    ).rejects.toThrow(/duplicated across chunks/);
  });

  it('rejects accepted gzip chunks above the declared compressed-byte cap', () => {
    const manifest = projectionManifest();
    manifest.chunks[0].bytes = MAX_MODEL_ENRICHMENT_CHUNK_BYTES + 1;
    expect(() =>
      normalizeRelationshipDatapackManifest(manifest, SNAPSHOT, 'v3')
    ).toThrow(/chunk 0 contract is malformed/);
  });

  it('enforces the accepted shard compressed-byte binding before decoding', async () => {
    const compressed = new Uint8Array(
      await new Response(
        new Response(JSON.stringify([])).body!.pipeThrough(
          new CompressionStream('gzip')
        )
      ).arrayBuffer()
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(compressed.slice(), {
          headers: {
            'content-type': 'application/gzip',
            'content-length': String(compressed.byteLength)
          }
        })
      )
    );

    await expect(
      fetchJsonResource(
        {
          path: 'accepted-assertions/assertions-000.json.gz',
          sha256: await sha256Hex(compressed),
          bytes: compressed.byteLength + 1,
          compression: 'gzip'
        },
        'https://example.test/',
        { attempts: 1 }
      )
    ).rejects.toThrow(/resource byte length differs from the declared/);
  });
});
