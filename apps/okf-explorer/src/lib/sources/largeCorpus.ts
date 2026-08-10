import type {
  LargeCorpusDescriptor,
  LargeCorpusSource,
  LargeAnalysisOverview,
  LargeDataManifest,
  LargeDataset,
  LargeEffectsReconciliation,
  LargeFacetRow,
  LargeFullIndex,
  LargeGovukContent,
  LargeGraphIndex,
  LargeModelEnrichmentState,
  LargeOverview,
  LargeOperationalMetadataIndex,
  GovernedTermRegistry,
  GovernedTermValidation,
  LargeProviderDatapack,
  LargeProviderDatapackCollection,
  LargeProviderDatapackManifest,
  LargePublisher,
  LargeReleaseDataPlaneIndex,
  LargeRelationship,
  LargeRelationshipAdjacencyManifest,
  LargeRelationshipDatapackManifest,
  LargeRichRelationshipRouteLocator,
  LargeRichRelationshipRouteLocatorBucket,
  LargeRichRelationshipRuntimeChunk,
  LargeRichRelationshipRuntimeManifest,
  LargeRichRelationshipRuntimePlane,
  LargeRecordLocatorManifest,
  LargeRelationshipsResult,
  LargeResource,
  LargeResourceReference,
  LargeShardMetadata
} from '$lib/types';
import { normalizeExplorerPresentation } from '$lib/viewer/facetPresentation';
import { normalizeEffectsReconciliation } from '$lib/viewer/effectsReconciliation';
import {
  normalizeGovernedTermRegistry,
  normalizeGovernedTermValidation,
  validateGovernedTermEvidence
} from '$lib/viewer/governedTerms';
import {
  normalizeProviderDatapack,
  normalizeProviderDatapackManifest,
  validateProviderDatapackCollection
} from '$lib/viewer/providerDatapack';
import { isHttpUrl } from '$lib/viewer/helpers';
import { baseUrlFor, fetchJson, fetchJsonResource, MAX_JSON_BYTES } from './fetch';
import {
  type PreparedReleaseDataPlane,
  prepareReleaseDataPlane,
  resourceHash,
  resourcePath,
  safeRelativeResourcePath,
  sha256Hex
} from './releaseDataPlane';

// Hard cap on the number of relationship rows the explorer will hydrate into memory.
// Large corpora can carry millions of relationship rows; without a cap, loading the
// full relationship index can hydrate on the order of 2M rows unbounded.
export const MAX_RELATIONSHIP_ROWS = 300_000;
export const CHUNK_FETCH_BATCH_SIZE = 4;
export const MAX_RICH_RELATIONSHIP_ROUTE_CHUNKS = 64;
export const MAX_RICH_RELATIONSHIP_ROUTE_ROWS = 100_000;
export const MAX_RICH_RELATIONSHIP_CHUNK_ROWS = 50_000;
export const MAX_RICH_RELATIONSHIP_CHUNK_BYTES = 8 * 1024 * 1024;
// Rich chunks are decoded one at a time. fetchJsonResource enforces this raw
// decoded-byte ceiling before JSON parsing, while the projection limits below
// bound what survives after parsing and across the complete hydration.
export const MAX_RICH_RELATIONSHIP_DECODED_CHUNK_BYTES = MAX_JSON_BYTES;
export const MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES = 64 * 1024 * 1024;
export const MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS = 32 * 1024 * 1024;
export const MAX_RICH_RELATIONSHIP_ROW_TEXT_UNITS = 32 * 1024;
export const MAX_RICH_RELATIONSHIP_EVIDENCE_ITEMS = 16;
export const MAX_RICH_RELATIONSHIP_SUPPORTING_ASSERTIONS = 128;
export const MAX_RICH_RELATIONSHIP_CACHED_CHUNKS = 16;
export const MAX_RICH_RELATIONSHIP_PLANES = 16;
export const MAX_RICH_RELATIONSHIP_CHUNKS = 10_000;
export const MAX_MODEL_ENRICHMENT_CHUNKS = 10_000;
export const MAX_MODEL_ENRICHMENT_CHUNK_BYTES = 8 * 1024 * 1024;
export const MAX_MODEL_ENRICHMENT_CHUNK_ROWS = 50_000;
const SHA256 = /^[0-9a-f]{64}$/;
const ABSOLUTE_IRI = /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$/;
const LOCAL_RELATIONSHIP_ROUTE = /^[a-z][a-z0-9-]*(?:\/[A-Za-z0-9._~-]+)+$/;
const RICH_RELATIONSHIP_RUNTIME_SCHEMA = 'okf-rich-relationship-runtime-manifest.v1';
const RICH_RELATIONSHIP_ROW_SCHEMA = 'okf-relationship-runtime-row.v1';
const RICH_RELATIONSHIP_LOCATOR_SCHEMA = 'okf-rich-relationship-route-locator.v1';
const RICH_RELATIONSHIP_LOCATOR_BUCKET_SCHEMA = 'okf-rich-relationship-route-locator-bucket.v1';
const RICH_RELATIONSHIP_LOCATOR_ALGORITHM = 'sha256-utf8-first-byte-hex';
const RICH_RELATIONSHIP_AUTHORITY_CLASSES = new Set([
  'official',
  'derived',
  'model-assisted',
  'synthetic',
  'unclassified'
]);
const RICH_RELATIONSHIP_ASSERTION_STATUSES = new Set([
  'official',
  'normalized',
  'inferred',
  'model-derived'
]);
const RICH_RELATIONSHIP_ASSERTION_SCOPES = new Set([
  'real-world',
  'synthetic-fixture'
]);
const RICH_RELATIONSHIP_PLANE_LIFECYCLES = new Set([
  'active',
  'historical',
  'rejected'
]);
const MODEL_ENRICHMENT_V3_PREDICATES = {
  topic: 'classified as',
  concept: 'has discovery concept',
  entity: 'mentions entity'
} as const;
const MODEL_ENRICHMENT_V3_SUPPORT_PROFILES = {
  'title-only': ['title'],
  'notes-only': ['notes'],
  'multi-field': ['title', 'notes']
} as const;
const MODEL_ENRICHMENT_V3_EVIDENCE_FIELDS = [
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
] as const;
const MODEL_ENRICHMENT_V3_FIELD_PROVENANCE = {
  title: 'official-source-record-work-title',
  notes: 'official-source-record-explanatory-note-or-long-title-equivalent'
} as const;
const MODEL_ENRICHMENT_V3_CONCEPT_PREFIX =
  'https://chris-page-gov.github.io/okf-uk-legislation/profile/whole-law/v1#concept-';
const MODEL_ENRICHMENT_V3_ACCEPTED_MANIFEST_PATH =
  'enrichment/codex-assisted-v3/accepted-manifest.json';
const MODEL_ENRICHMENT_V3_ACCEPTED_MANIFEST_REPOSITORY_PATH =
  `bundle/${MODEL_ENRICHMENT_V3_ACCEPTED_MANIFEST_PATH}`;
const MODEL_ENRICHMENT_V3_AUDIT_PATH =
  'whole-law/assurance/enrichment-v3-independent-audit-20260726.json';
const MODEL_ENRICHMENT_V3_REVIEWER_PATH =
  'whole-law/assurance/enrichment-v3-reviewer-task-receipt.json';
const MODEL_ENRICHMENT_V3_REVIEWER_REPOSITORY_PATH =
  'enrichment/codex-assisted-v3/reviewer-task-receipt.json';
const MODEL_ENRICHMENT_V3_REVIEWED_MATERIAL_FIELDS = [
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
] as const;

type ResourceFetcher = <T>(reference: LargeResourceReference, requireReleaseEntry?: boolean) => Promise<T>;

function bundleResourceReference(
  value: unknown,
  baseUrl: string,
  label: string
): LargeResourceReference {
  if (
    typeof value !== 'string' &&
    (!value || typeof value !== 'object' || Array.isArray(value))
  ) {
    throw new Error(`${label} is missing or malformed`);
  }
  const reference = value as LargeResourceReference;
  const path = safeRelativeResourcePath(resourcePath(reference), `${label} path`);
  resourceHash(reference);
  const bundleBase = new URL(baseUrl);
  const bundlePrefix = bundleBase.pathname.endsWith('/')
    ? bundleBase.pathname
    : `${bundleBase.pathname}/`;
  const resolved = new URL(path, bundleBase);
  if (
    resolved.origin !== bundleBase.origin ||
    !resolved.pathname.startsWith(bundlePrefix)
  ) {
    throw new Error(`${label} must stay inside the bundle base path`);
  }
  return typeof reference === 'string' ? path : { ...reference, path };
}

type ModelEnrichmentVersion = 'v3' | 'v2';

type ModelRelationshipIdRegistry = {
  relationshipIds: Set<string>;
  acceptanceIds: Set<string>;
};

type ModelEnrichmentV3ReviewBinding = {
  auditId: string;
  auditPath: string;
  reviewTaskId: string;
};

type ModelEnrichmentV3Counts = {
  assertions: number;
  by_kind: {
    topic: number;
    concept: number;
    entity: number;
  };
  by_support: {
    'title-only': number;
    'notes-only': number;
    'metadata-only': number;
    'multi-field': number;
  };
};

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function boundGovernanceResource(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} binding is malformed`);
  }
  const binding = value as Record<string, unknown>;
  if (
    typeof binding.path !== 'string' ||
    !binding.path.trim() ||
    binding.path.trim() !== binding.path ||
    !nonNegativeSafeInteger(binding.bytes) ||
    binding.bytes < 1 ||
    typeof binding.sha256 !== 'string' ||
    !SHA256.test(binding.sha256)
  ) {
    throw new Error(`${label} binding is malformed`);
  }
  return {
    ...binding,
    path: safeRelativeResourcePath(binding.path, `${label} path`)
  };
}

function objectDocument(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return (
    Object.keys(value).sort().join('\0') === [...expected].sort().join('\0')
  );
}

function normalizeModelEnrichmentV3Counts(
  value: unknown,
  label: string,
  exactTopLevel = true
): ModelEnrichmentV3Counts {
  const counts = objectDocument(value, `${label} counts`);
  const byKind = objectDocument(counts.by_kind, `${label} kind counts`);
  const bySupport = objectDocument(counts.by_support, `${label} support counts`);
  const kindKeys = Object.keys(MODEL_ENRICHMENT_V3_PREDICATES);
  const supportKeys = ['title-only', 'notes-only', 'metadata-only', 'multi-field'];
  const assertions = counts.assertions;
  if (
    (exactTopLevel && !exactKeys(counts, ['assertions', 'by_kind', 'by_support'])) ||
    !nonNegativeSafeInteger(assertions) ||
    !exactKeys(byKind, kindKeys) ||
    kindKeys.some((key) => !nonNegativeSafeInteger(byKind[key])) ||
    kindKeys.reduce((total, key) => total + Number(byKind[key]), 0) !== assertions ||
    !exactKeys(bySupport, supportKeys) ||
    supportKeys.some((key) => !nonNegativeSafeInteger(bySupport[key])) ||
    bySupport['metadata-only'] !== 0 ||
    supportKeys.reduce((total, key) => total + Number(bySupport[key]), 0) !== assertions
  ) {
    throw new Error(`${label} counts are malformed or unreconciled`);
  }
  return {
    assertions,
    by_kind: {
      topic: Number(byKind.topic),
      concept: Number(byKind.concept),
      entity: Number(byKind.entity)
    },
    by_support: {
      'title-only': Number(bySupport['title-only']),
      'notes-only': Number(bySupport['notes-only']),
      'metadata-only': 0,
      'multi-field': Number(bySupport['multi-field'])
    }
  };
}

function modelEnrichmentV3CountsEqual(
  left: ModelEnrichmentV3Counts,
  right: ModelEnrichmentV3Counts
): boolean {
  return (
    left.assertions === right.assertions &&
    Object.keys(MODEL_ENRICHMENT_V3_PREDICATES).every(
      (key) =>
        left.by_kind[key as keyof ModelEnrichmentV3Counts['by_kind']] ===
        right.by_kind[key as keyof ModelEnrichmentV3Counts['by_kind']]
    ) &&
    Object.keys(MODEL_ENRICHMENT_V3_SUPPORT_PROFILES).every(
      (key) =>
        left.by_support[key as keyof ModelEnrichmentV3Counts['by_support']] ===
        right.by_support[key as keyof ModelEnrichmentV3Counts['by_support']]
    ) &&
    left.by_support['metadata-only'] === right.by_support['metadata-only']
  );
}

function bindingEquals(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  includePath = true
): boolean {
  return (
    (!includePath || left.path === right.path) &&
    left.bytes === right.bytes &&
    left.sha256 === right.sha256
  );
}

function requireGovernanceBindingMatch(
  projectionValue: unknown,
  descriptorValue: unknown,
  label: string,
  expectedPath: string
): Record<string, unknown> {
  const projection = boundGovernanceResource(projectionValue, `${label} projection`);
  const descriptor = boundGovernanceResource(descriptorValue, `${label} descriptor`);
  if (
    projection.path !== expectedPath ||
    !bindingEquals(projection, descriptor)
  ) {
    throw new Error(`${label} descriptor and projection bindings differ`);
  }
  return projection;
}

function governanceResourceReference(
  binding: Record<string, unknown>
): Exclude<LargeResourceReference, string> {
  return {
    path: String(binding.path),
    bytes: Number(binding.bytes),
    sha256: String(binding.sha256)
  };
}

export function normalizeRelationshipDatapackManifest(
  value: unknown,
  snapshot: string,
  version: ModelEnrichmentVersion = 'v2'
): LargeRelationshipDatapackManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Model relationship datapack manifest must be an object');
  }
  const document = value as Record<string, unknown>;
  if (document.schema !== 'okf-provider-datapack.v1') {
    throw new Error('Model relationship datapack manifest uses an unsupported schema');
  }
  const id = typeof document.id === 'string' ? document.id : '';
  const snapshotId = typeof document.snapshot_id === 'string' ? document.snapshot_id : '';
  const generatedAt = typeof document.generated_at === 'string' ? document.generated_at : '';
  if (!id || id.trim() !== id || !snapshotId || snapshotId.trim() !== snapshotId) {
    throw new Error('Model relationship datapack identity is malformed');
  }
  const snapshotInstant = (candidate: string) =>
    candidate.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)?.[0] || '';
  if (
    !snapshot ||
    (
      snapshotId !== snapshot &&
      (
        !snapshotInstant(snapshotId) ||
        snapshotInstant(snapshotId) !== snapshotInstant(snapshot)
      )
    )
  ) {
    throw new Error('Model relationship datapack snapshot differs from the loaded bundle snapshot');
  }
  if (
    !Array.isArray(document.chunks) ||
    document.chunks.length > MAX_MODEL_ENRICHMENT_CHUNKS
  ) {
    throw new Error('Model relationship datapack chunks are malformed');
  }
  const paths = new Set<string>();
  const chunks = document.chunks.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Model relationship datapack chunk ${index} is malformed`);
    }
    const chunk = raw as Record<string, unknown>;
    const path = safeRelativeResourcePath(
      chunk.path,
      `Model relationship datapack chunk ${index} path`
    );
    const sha256 = typeof chunk.sha256 === 'string' ? chunk.sha256 : '';
    const bytes =
      typeof chunk.bytes === 'number'
        ? chunk.bytes
        : version === 'v2'
          ? Number(chunk.bytes)
          : Number.NaN;
    const records =
      typeof chunk.records === 'number'
        ? chunk.records
        : version === 'v2'
          ? Number(chunk.records)
          : Number.NaN;
    const compression = typeof chunk.compression === 'string' ? chunk.compression : '';
    const mediaType = typeof chunk.media_type === 'string' ? chunk.media_type : '';
    const ordinal = String(index).padStart(3, '0');
    const governedV3Path =
      `enrichment/codex-assisted-v3/accepted-assertions/` +
      `assertions-${ordinal}.json.gz`;
    if (
      paths.has(path) ||
      !SHA256.test(sha256) ||
      !Number.isSafeInteger(bytes) ||
      bytes < 1 ||
      bytes > MAX_MODEL_ENRICHMENT_CHUNK_BYTES ||
      !Number.isSafeInteger(records) ||
      records < 0 ||
      records > MAX_MODEL_ENRICHMENT_CHUNK_ROWS ||
      compression !== 'gzip' ||
      mediaType !== 'application/json' ||
      (version === 'v3' && path !== governedV3Path) ||
      !new RegExp(`-${ordinal}\\.json\\.gz$`).test(path)
    ) {
      throw new Error(`Model relationship datapack chunk ${index} contract is malformed`);
    }
    paths.add(path);
    return {
      path,
      sha256,
      bytes,
      records,
      compression,
      media_type: mediaType
    };
  });
  const rawCounts =
    document.counts && typeof document.counts === 'object' && !Array.isArray(document.counts)
      ? document.counts as Record<string, unknown>
      : undefined;
  const assertionCount = rawCounts?.assertions;
  if (
    assertionCount !== undefined &&
    (
      !nonNegativeSafeInteger(assertionCount) ||
      assertionCount > MAX_RELATIONSHIP_ROWS ||
      assertionCount !== chunks.reduce((total, chunk) => total + chunk.records, 0)
    )
  ) {
    throw new Error('Model relationship datapack assertion count differs from its chunks');
  }
  let counts: LargeRelationshipDatapackManifest['counts'] =
    assertionCount === undefined ? undefined : { assertions: assertionCount };
  let authority: string | undefined;
  let officialLegalClassification: boolean | undefined;
  let sourceContract: Record<string, unknown> | undefined;
  let independentAudit: Record<string, unknown> | undefined;
  let semanticReviewer: Record<string, unknown> | undefined;
  let relationshipKinds: LargeRelationshipDatapackManifest['relationship_kinds'];
  let provenance: Record<string, unknown> | undefined;
  if (version === 'v3') {
    if (!generatedAt || generatedAt.trim() !== generatedAt) {
      throw new Error('Governed v3 model-enrichment generation timestamp is malformed');
    }
    const byKind =
      rawCounts?.by_kind && typeof rawCounts.by_kind === 'object' && !Array.isArray(rawCounts.by_kind)
        ? rawCounts.by_kind as Record<string, unknown>
        : null;
    const bySupport =
      rawCounts?.by_support && typeof rawCounts.by_support === 'object' && !Array.isArray(rawCounts.by_support)
        ? rawCounts.by_support as Record<string, unknown>
        : null;
    const kindKeys = Object.keys(MODEL_ENRICHMENT_V3_PREDICATES);
    const supportKeys = ['title-only', 'notes-only', 'metadata-only', 'multi-field'];
    if (
      !nonNegativeSafeInteger(assertionCount) ||
      !byKind ||
      Object.keys(byKind).sort().join('\0') !== [...kindKeys].sort().join('\0') ||
      kindKeys.some((key) => !nonNegativeSafeInteger(byKind[key])) ||
      kindKeys.reduce((total, key) => total + Number(byKind[key]), 0) !== assertionCount ||
      !bySupport ||
      Object.keys(bySupport).sort().join('\0') !== [...supportKeys].sort().join('\0') ||
      supportKeys.some((key) => !nonNegativeSafeInteger(bySupport[key])) ||
      bySupport['metadata-only'] !== 0 ||
      supportKeys.reduce((total, key) => total + Number(bySupport[key]), 0) !== assertionCount
    ) {
      throw new Error('Governed v3 model-enrichment counts are malformed or unreconciled');
    }
    authority = typeof document.authority === 'string' ? document.authority : '';
    officialLegalClassification = document.official_legal_classification as boolean;
    if (
      authority !== 'derived-model-assisted-discovery-metadata' ||
      officialLegalClassification !== false
    ) {
      throw new Error('Governed v3 model-enrichment authority is malformed');
    }
    sourceContract = boundGovernanceResource(
      document.source_contract,
      'Governed v3 accepted-manifest'
    );
    if (sourceContract.schema !== 'okf-enrichment-accepted-assertion-manifest.v3') {
      throw new Error('Governed v3 accepted-manifest schema is unsupported');
    }
    independentAudit = boundGovernanceResource(
      document.independent_audit,
      'Governed v3 independent-audit'
    );
    semanticReviewer = boundGovernanceResource(
      document.semantic_reviewer,
      'Governed v3 semantic-reviewer'
    );
    if (!Array.isArray(document.relationship_kinds) || document.relationship_kinds.length !== 3) {
      throw new Error('Governed v3 relationship kinds are malformed');
    }
    relationshipKinds = document.relationship_kinds.map((raw, index) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(`Governed v3 relationship kind ${index} is malformed`);
      }
      const row = raw as Record<string, unknown>;
      const dimension = row.dimension;
      if (
        typeof dimension !== 'string' ||
        !(dimension in MODEL_ENRICHMENT_V3_PREDICATES) ||
        row.predicate !== MODEL_ENRICHMENT_V3_PREDICATES[
          dimension as keyof typeof MODEL_ENRICHMENT_V3_PREDICATES
        ] ||
        row.count !== byKind[dimension]
      ) {
        throw new Error(`Governed v3 relationship kind ${index} is malformed`);
      }
      return {
        dimension: dimension as 'topic' | 'concept' | 'entity',
        predicate: String(row.predicate),
        count: Number(row.count)
      };
    });
    if (new Set(relationshipKinds.map(({ dimension }) => dimension)).size !== 3) {
      throw new Error('Governed v3 relationship kinds are duplicated');
    }
    if (!document.provenance || typeof document.provenance !== 'object' || Array.isArray(document.provenance)) {
      throw new Error('Governed v3 provenance contract is malformed');
    }
    provenance = document.provenance as Record<string, unknown>;
    const profiles =
      provenance.support_profiles &&
      typeof provenance.support_profiles === 'object' &&
      !Array.isArray(provenance.support_profiles)
        ? provenance.support_profiles as Record<string, unknown>
        : {};
    if (
      provenance.evidence_field !== 'evidence' ||
      provenance.evidence_shape !== 'stable-ordered-list' ||
      provenance.support_profile_field !== 'support_profile' ||
      JSON.stringify(provenance.source_field_order) !== JSON.stringify(['title', 'notes']) ||
      JSON.stringify(profiles['title-only']) !== JSON.stringify(['title']) ||
      JSON.stringify(profiles['notes-only']) !== JSON.stringify(['notes']) ||
      JSON.stringify(profiles['multi-field']) !== JSON.stringify(['title', 'notes']) ||
      JSON.stringify(provenance.item_fields) !==
        JSON.stringify(MODEL_ENRICHMENT_V3_EVIDENCE_FIELDS)
    ) {
      throw new Error('Governed v3 provenance ordering or support profiles are malformed');
    }
    counts = {
      assertions: assertionCount,
      by_kind: {
        topic: Number(byKind.topic),
        concept: Number(byKind.concept),
        entity: Number(byKind.entity)
      },
      by_support: {
        'title-only': Number(bySupport['title-only']),
        'notes-only': Number(bySupport['notes-only']),
        'metadata-only': 0,
        'multi-field': Number(bySupport['multi-field'])
      }
    };
  }
  return {
    schema: 'okf-provider-datapack.v1',
    id,
    snapshot_id: snapshotId,
    ...(generatedAt ? { generated_at: generatedAt } : {}),
    chunks,
    counts,
    ...(authority ? { authority } : {}),
    ...(officialLegalClassification !== undefined
      ? { official_legal_classification: officialLegalClassification }
      : {}),
    ...(sourceContract ? { source_contract: sourceContract } : {}),
    ...(independentAudit ? { independent_audit: independentAudit } : {}),
    ...(semanticReviewer ? { semantic_reviewer: semanticReviewer } : {}),
    ...(relationshipKinds ? { relationship_kinds: relationshipKinds } : {}),
    ...(provenance ? { provenance } : {})
  };
}

function validateModelEnrichmentV3Governance(
  datapack: LargeRelationshipDatapackManifest,
  acceptedValue: unknown,
  auditValue: unknown,
  reviewerValue: unknown
): ModelEnrichmentV3ReviewBinding {
  const accepted = objectDocument(
    acceptedValue,
    'Governed v3 accepted-manifest document'
  );
  const audit = objectDocument(
    auditValue,
    'Governed v3 independent-audit document'
  );
  const reviewer = objectDocument(
    reviewerValue,
    'Governed v3 semantic-reviewer document'
  );
  const projectionCounts = normalizeModelEnrichmentV3Counts(
    datapack.counts,
    'Governed v3 projection'
  );
  const acceptedCounts = normalizeModelEnrichmentV3Counts(
    accepted.counts,
    'Governed v3 accepted manifest'
  );
  const sourceContract = objectDocument(
    datapack.source_contract,
    'Governed v3 projection accepted-manifest binding'
  );
  const auditBinding = objectDocument(
    datapack.independent_audit,
    'Governed v3 projection independent-audit binding'
  );
  const reviewerBinding = objectDocument(
    datapack.semantic_reviewer,
    'Governed v3 projection semantic-reviewer binding'
  );
  const auditId = typeof accepted.audit_id === 'string' ? accepted.audit_id : '';
  const reviewMaterialsHash =
    typeof accepted.review_materials_sha256 === 'string'
      ? accepted.review_materials_sha256
      : '';
  if (
    accepted.schema !== 'okf-enrichment-accepted-assertion-manifest.v3' ||
    accepted.id !== datapack.id ||
    !auditId ||
    auditId.trim() !== auditId ||
    sourceContract.audit_id !== auditId ||
    accepted.snapshot_id !== datapack.snapshot_id ||
    accepted.generated_at !== datapack.generated_at ||
    !SHA256.test(reviewMaterialsHash) ||
    accepted.authority !== 'derived-model-assisted-discovery-metadata' ||
    accepted.official_legal_classification !== false ||
    !modelEnrichmentV3CountsEqual(acceptedCounts, projectionCounts)
  ) {
    throw new Error('Governed v3 accepted manifest is not bound to the projection');
  }

  if (
    !Array.isArray(accepted.chunks) ||
    accepted.chunks.length === 0 ||
    accepted.chunks.length !== datapack.chunks.length
  ) {
    throw new Error('Governed v3 accepted-manifest chunks differ from the projection');
  }
  for (let index = 0; index < datapack.chunks.length; index += 1) {
    const acceptedChunk = boundGovernanceResource(
      accepted.chunks[index],
      `Governed v3 accepted-manifest chunk ${index}`
    );
    const projectionChunk = datapack.chunks[index];
    if (
      acceptedChunk.path !== `bundle/${projectionChunk.path}` ||
      acceptedChunk.bytes !== projectionChunk.bytes ||
      acceptedChunk.sha256 !== projectionChunk.sha256 ||
      acceptedChunk.records !== projectionChunk.records ||
      acceptedChunk.compression !== projectionChunk.compression ||
      acceptedChunk.media_type !== projectionChunk.media_type
    ) {
      throw new Error(
        `Governed v3 accepted-manifest chunk ${index} differs from the projection`
      );
    }
  }

  const decision = objectDocument(
    audit.decision,
    'Governed v3 independent-audit decision'
  );
  const auditCounts = objectDocument(
    audit.counts,
    'Governed v3 independent-audit counts'
  );
  const auditByKind = objectDocument(
    auditCounts.accepted_by_kind,
    'Governed v3 independent-audit kind counts'
  );
  const auditBySupport = objectDocument(
    auditCounts.accepted_by_support,
    'Governed v3 independent-audit support counts'
  );
  const decisionByKind = objectDocument(
    decision.accepted_by_kind,
    'Governed v3 independent-audit decision kind counts'
  );
  const countsMatch = (
    auditCounts.accepted_assertions === projectionCounts.assertions &&
    decision.accepted_assertions === projectionCounts.assertions &&
    exactKeys(auditByKind, Object.keys(MODEL_ENRICHMENT_V3_PREDICATES)) &&
    exactKeys(decisionByKind, Object.keys(MODEL_ENRICHMENT_V3_PREDICATES)) &&
    Object.keys(MODEL_ENRICHMENT_V3_PREDICATES).every(
      (key) =>
        auditByKind[key] ===
          projectionCounts.by_kind[key as keyof ModelEnrichmentV3Counts['by_kind']] &&
        decisionByKind[key] ===
          projectionCounts.by_kind[key as keyof ModelEnrichmentV3Counts['by_kind']]
    ) &&
    exactKeys(auditBySupport, [
      'title-only',
      'notes-only',
      'metadata-only',
      'multi-field'
    ]) &&
    Object.keys(projectionCounts.by_support).every(
      (key) =>
        auditBySupport[key] ===
        projectionCounts.by_support[key as keyof ModelEnrichmentV3Counts['by_support']]
    )
  );
  if (
    audit.schema !== 'okf-enrichment-independent-audit.v3' ||
    audit.audit_id !== auditId ||
    audit.artifact_state !== 'hash-bound-accepted' ||
    !Array.isArray(audit.checks) ||
    audit.checks.length === 0 ||
    audit.checks.some(
      (check) =>
        !check ||
        typeof check !== 'object' ||
        Array.isArray(check) ||
        (check as Record<string, unknown>).status !== 'passed'
    ) ||
    decision.release_gate_passed !== true ||
    decision.independent_review_status !== 'accepted' ||
    !Array.isArray(decision.errors) ||
    decision.errors.length !== 0 ||
    !countsMatch
  ) {
    throw new Error('Governed v3 independent audit did not accept the projection');
  }

  const materials = objectDocument(
    audit.materials,
    'Governed v3 independent-audit materials'
  );
  const acceptedMaterial = boundGovernanceResource(
    materials.accepted_manifest,
    'Governed v3 independent-audit accepted-manifest material'
  );
  const reviewerMaterial = boundGovernanceResource(
    materials.reviewer_task_receipt,
    'Governed v3 independent-audit semantic-reviewer material'
  );
  if (
    acceptedMaterial.path !== MODEL_ENRICHMENT_V3_ACCEPTED_MANIFEST_REPOSITORY_PATH ||
    !bindingEquals(acceptedMaterial, sourceContract, false) ||
    reviewerMaterial.path !== MODEL_ENRICHMENT_V3_REVIEWER_REPOSITORY_PATH ||
    !bindingEquals(reviewerMaterial, reviewerBinding, false)
  ) {
    throw new Error('Governed v3 independent-audit material bindings differ');
  }

  const reviewTaskId =
    typeof reviewer.review_task_id === 'string' ? reviewer.review_task_id : '';
  const reviewedMaterials = objectDocument(
    reviewer.reviewed_materials,
    'Governed v3 semantic-reviewer materials'
  );
  if (
    reviewer.schema !== 'okf-codex-semantic-review-task-receipt.v1' ||
    reviewer.status !== 'accepted' ||
    reviewer.verdict !== 'accepted' ||
    !reviewTaskId ||
    reviewTaskId.trim() !== reviewTaskId ||
    reviewer.source_edits_made_by_reviewer !== false ||
    !exactKeys(reviewedMaterials, MODEL_ENRICHMENT_V3_REVIEWED_MATERIAL_FIELDS) ||
    MODEL_ENRICHMENT_V3_REVIEWED_MATERIAL_FIELDS.some(
      (key) =>
        typeof reviewedMaterials[key] !== 'string' ||
        !SHA256.test(String(reviewedMaterials[key]))
    )
  ) {
    throw new Error('Governed v3 semantic reviewer did not accept the projection');
  }

  return {
    auditId,
    auditPath: String(auditBinding.path),
    reviewTaskId
  };
}

function canonicalRelationshipRoute(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
    throw new Error('Model relationship assertion route is malformed');
  }
  if (/^[a-z][a-z0-9-]*\/[^\s?#]+$/.test(value)) return value;
  const legislation =
    /^https:\/\/(?:www\.)?legislation\.gov\.uk\/id\/([^?#]+?)\/?$/.exec(value);
  if (legislation) {
    let identifier: string;
    try {
      identifier = decodeURIComponent(legislation[1]);
    } catch {
      throw new Error('Model relationship assertion legislation identifier is malformed');
    }
    // Match the producer's route slugging for both modern type/year/number
    // identifiers and historical regnal identifiers such as
    // /id/aep/WillandMar/5-6/20.
    const slug = identifier
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      throw new Error('Model relationship assertion legislation identifier is malformed');
    }
    return `dataset/${slug}`;
  }
  return value;
}

function governedV3SourceRoute(value: unknown): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new Error('Governed v3 model relationship source is malformed');
  }
  const legislation =
    /^https:\/\/www\.legislation\.gov\.uk\/id\/([^?#]+?)\/?$/.exec(value);
  if (!legislation) {
    throw new Error(
      'Governed v3 model relationship source is not an official legislation identifier'
    );
  }
  let identifier: string;
  try {
    identifier = decodeURIComponent(legislation[1]);
  } catch {
    throw new Error('Governed v3 model relationship legislation identifier is malformed');
  }
  if (
    !identifier ||
    identifier.includes('\\') ||
    identifier.includes('\0') ||
    identifier.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Governed v3 model relationship legislation identifier is malformed');
  }
  const slug = identifier
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Governed v3 model relationship legislation identifier is malformed');
  }
  return `dataset/${slug}`;
}

function governedV3TargetRoute(value: unknown, dimension: unknown): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new Error('Governed v3 model relationship target is malformed');
  }
  const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
  if (dimension === 'topic') {
    if (!new RegExp(`^topic/${slug}$`).test(value)) {
      throw new Error('Governed v3 topic relationship target is malformed');
    }
    return value;
  }
  if (dimension === 'concept') {
    const conceptSlug = value.startsWith(MODEL_ENRICHMENT_V3_CONCEPT_PREFIX)
      ? value.slice(MODEL_ENRICHMENT_V3_CONCEPT_PREFIX.length)
      : '';
    if (!new RegExp(`^${slug}$`).test(conceptSlug)) {
      throw new Error('Governed v3 concept relationship target is malformed');
    }
    return value;
  }
  if (dimension === 'entity') {
    let target: URL;
    try {
      target = new URL(value);
    } catch {
      throw new Error('Governed v3 entity relationship target is malformed');
    }
    if (
      target.protocol !== 'https:' ||
      target.username ||
      target.password ||
      target.port ||
      target.search ||
      target.hash ||
      !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(target.hostname) ||
      !target.hostname.includes('.') ||
      /\s|\\/.test(value)
    ) {
      throw new Error('Governed v3 entity relationship target is malformed');
    }
    return value;
  }
  throw new Error('Governed v3 model relationship dimension is malformed');
}

type ModelRelationshipNormalizationOptions = {
  registry?: ModelRelationshipIdRegistry;
  reviewBinding?: ModelEnrichmentV3ReviewBinding;
  validateRows?: (rows: LargeRelationship[]) => Promise<void>;
};

async function normalizeModelRelationshipRow(
  raw: unknown,
  index: number,
  version: ModelEnrichmentVersion,
  ids: Set<string>,
  acceptanceIds: Set<string>,
  reviewBinding?: ModelEnrichmentV3ReviewBinding
): Promise<LargeRelationship> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Model relationship assertion ${index} is malformed`);
  }
  const row = raw as Record<string, unknown>;
  const originalSource = row.source;
  const dimension = row.dimension;
  const source =
    version === 'v3'
      ? governedV3SourceRoute(row.source)
      : canonicalRelationshipRoute(row.source);
  const target =
    version === 'v3'
      ? governedV3TargetRoute(row.target, dimension)
      : canonicalRelationshipRoute(row.target);
  const kind = String(
    version === 'v3'
      ? row.predicate || ''
      : row.kind || row.predicate || row.type || ''
  ).trim();
  if (!kind) {
    throw new Error(`Model relationship assertion ${index} has no predicate`);
  }
  if (version !== 'v3') {
    return { ...row, source, target, kind } as LargeRelationship;
  }

  const authority =
    row.authority &&
    typeof row.authority === 'object' &&
    !Array.isArray(row.authority)
      ? row.authority as Record<string, unknown>
      : null;
  const profile = row.support_profile;
  const expectedFields =
    typeof profile === 'string'
      ? MODEL_ENRICHMENT_V3_SUPPORT_PROFILES[
          profile as keyof typeof MODEL_ENRICHMENT_V3_SUPPORT_PROFILES
        ]
      : undefined;
  const evidence = row.evidence;
  const identifier = typeof row.id === 'string' ? row.id : '';
  const acceptanceId =
    typeof row.acceptance_id === 'string' ? row.acceptance_id : '';
  const confidence = row.confidence;
  const review =
    row.review &&
    typeof row.review === 'object' &&
    !Array.isArray(row.review)
      ? row.review as Record<string, unknown>
      : null;
  const verified = row.verified;
  const rights =
    row.rights &&
    typeof row.rights === 'object' &&
    !Array.isArray(row.rights)
      ? row.rights as Record<string, unknown>
      : null;
  if (
    row.schema !== 'okf-relationship-assertion.v2' ||
    !/^urn:okf:enrichment:sha256:[0-9a-f]{64}$/.test(identifier) ||
    ids.has(identifier) ||
    !/^urn:okf:model-acceptance:[0-9a-f]{64}$/.test(acceptanceId) ||
    acceptanceIds.has(acceptanceId) ||
    typeof dimension !== 'string' ||
    !(dimension in MODEL_ENRICHMENT_V3_PREDICATES) ||
    row.predicate !== MODEL_ENRICHMENT_V3_PREDICATES[
      dimension as keyof typeof MODEL_ENRICHMENT_V3_PREDICATES
    ] ||
    authority?.class !== 'model-assisted' ||
    row.derivation !== 'codex-authored-deterministic-literal-rule-v3' ||
    row.review_status !== 'accepted-independent-review' ||
    row.official_legal_classification !== false ||
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1 ||
    rights?.source !==
      'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/' ||
    rights?.assertion !== 'derived discovery metadata' ||
    row.freshness !== 'current' ||
    !review ||
    typeof review.audit_id !== 'string' ||
    !review.audit_id ||
    typeof review.audit_path !== 'string' ||
    !review.audit_path ||
    typeof review.review_task_id !== 'string' ||
    !review.review_task_id ||
    typeof review.verdict_id !== 'string' ||
    !review.verdict_id ||
    (reviewBinding !== undefined &&
      (
        review.audit_id !== reviewBinding.auditId ||
        review.audit_path !== reviewBinding.auditPath ||
        review.review_task_id !== reviewBinding.reviewTaskId
      )) ||
    !Array.isArray(verified) ||
    verified.length !== 2 ||
    verified.some(
      (item) => !item || typeof item !== 'object' || Array.isArray(item)
    ) ||
    !expectedFields ||
    !Array.isArray(evidence) ||
    evidence.length !== expectedFields.length
  ) {
    throw new Error(`Governed v3 model relationship assertion ${index} is malformed`);
  }

  // Reserve the identifier before asynchronous digest checks so duplicates in
  // the same validation batch cannot race past the uniqueness guard.
  ids.add(identifier);
  acceptanceIds.add(acceptanceId);
  const ruleId = typeof row.rule_id === 'string' ? row.rule_id : '';
  for (let evidenceIndex = 0; evidenceIndex < evidence.length; evidenceIndex += 1) {
    const item = evidence[evidenceIndex];
    const field = expectedFields[evidenceIndex];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(
        `Governed v3 model relationship assertion ${index} evidence ${evidenceIndex} is malformed`
      );
    }
    const evidenceRow = item as Record<string, unknown>;
    if (
      evidenceRow.url !== originalSource ||
      evidenceRow.source_field !== field ||
      evidenceRow.type !== `literal-${field}-match` ||
      evidenceRow.field_provenance !== MODEL_ENRICHMENT_V3_FIELD_PROVENANCE[field] ||
      typeof evidenceRow.source_value !== 'string' ||
      !evidenceRow.source_value ||
      typeof evidenceRow.source_value_sha256 !== 'string' ||
      !SHA256.test(evidenceRow.source_value_sha256) ||
      evidenceRow.source_value_hash_canonicalization !== 'canonical-json-utf8' ||
      evidenceRow.normalization !== 'Unicode-NFC-and-whitespace-collapse' ||
      typeof evidenceRow.value !== 'string' ||
      !evidenceRow.value ||
      typeof evidenceRow.literal_sha256 !== 'string' ||
      !SHA256.test(evidenceRow.literal_sha256) ||
      !ruleId ||
      evidenceRow.rule_id !== ruleId ||
      typeof evidenceRow.rationale !== 'string' ||
      !evidenceRow.rationale
    ) {
      throw new Error(
        `Governed v3 model relationship assertion ${index} evidence ${evidenceIndex} is malformed`
      );
    }
    const sourceValue = evidenceRow.source_value;
    const literal = evidenceRow.value;
    const [sourceValueSha256, literalSha256] = await Promise.all([
      sha256Hex(JSON.stringify(sourceValue)),
      sha256Hex(literal)
    ]);
    if (
      sourceValueSha256 !== evidenceRow.source_value_sha256 ||
      literalSha256 !== evidenceRow.literal_sha256
    ) {
      throw new Error(
        `Governed v3 model relationship assertion ${index} evidence ${evidenceIndex} has an invalid digest`
      );
    }
    const normalizedSource = sourceValue
      .normalize('NFC')
      .replace(/\s+/gu, ' ')
      .trim();
    if (
      !normalizedSource
        .toLocaleLowerCase('en-GB')
        .includes(literal.toLocaleLowerCase('en-GB'))
    ) {
      throw new Error(
        `Governed v3 model relationship assertion ${index} evidence ${evidenceIndex} is not source-supported`
      );
    }
  }
  return { ...row, source, target, kind } as LargeRelationship;
}

export async function normalizeModelRelationshipRows(
  value: unknown,
  expectedRecords: number,
  version: ModelEnrichmentVersion = 'v2',
  options: ModelRelationshipNormalizationOptions = {}
): Promise<LargeRelationship[]> {
  if (
    !Array.isArray(value) ||
    value.length > MAX_MODEL_ENRICHMENT_CHUNK_ROWS ||
    value.length !== expectedRecords
  ) {
    throw new Error('Model relationship datapack chunk record count differs from its manifest');
  }
  const ids = new Set<string>();
  const acceptanceIds = new Set<string>();
  const normalizedRows: LargeRelationship[] = [];
  const digestBatchSize = 64;
  for (let offset = 0; offset < value.length; offset += digestBatchSize) {
    const batch = await Promise.all(
      value
        .slice(offset, offset + digestBatchSize)
        .map((raw, batchIndex) =>
          normalizeModelRelationshipRow(
            raw,
            offset + batchIndex,
            version,
            ids,
            acceptanceIds,
            options.reviewBinding
          )
        )
    );
    normalizedRows.push(...batch);
  }
  if (options.validateRows) {
    await options.validateRows(normalizedRows);
  }
  if (options.registry) {
    if (
      [...ids].some((identifier) => options.registry!.relationshipIds.has(identifier)) ||
      [...acceptanceIds].some((identifier) =>
        options.registry!.acceptanceIds.has(identifier)
      )
    ) {
      throw new Error(
        'Governed v3 model relationship or acceptance identifier is duplicated across chunks'
      );
    }
    for (const identifier of ids) options.registry.relationshipIds.add(identifier);
    for (const identifier of acceptanceIds) options.registry.acceptanceIds.add(identifier);
  }
  return normalizedRows;
}

function mergeRelationships(
  base: LargeRelationship[],
  additions: LargeRelationship[]
): LargeRelationship[] {
  const merged = [...base];
  const seen = new Set(
    base.map((row) => String(row.id || `${row.source}\u0000${row.target}\u0000${row.kind}\u0000${JSON.stringify(row.authority || '')}`))
  );
  for (const row of additions) {
    const key = String(row.id || `${row.source}\u0000${row.target}\u0000${row.kind}\u0000${JSON.stringify(row.authority || '')}`);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(row);
    }
  }
  return merged;
}

export function declaredSnapshot(document: unknown, label: string): string {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return '';
  const record = document as Record<string, unknown>;
  const values = ['snapshot_id', 'snapshot']
    .filter((key) => record[key] !== undefined && record[key] !== null && record[key] !== '')
    .map((key) => {
      const value = record[key];
      if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
        throw new Error(`${label} has an invalid snapshot identifier`);
      }
      return value;
    });
  if (new Set(values).size > 1) throw new Error(`${label} advertises conflicting snapshot identifiers`);
  return values[0] || '';
}

function consistentSnapshot(declarations: Array<[string, unknown]>): string {
  const values = declarations
    .map(([label, document]) => [label, declaredSnapshot(document, label)] as const)
    .filter(([, value]) => value);
  if (new Set(values.map(([, value]) => value)).size > 1) {
    throw new Error(
      `Bundle resources advertise different snapshot identifiers: ${values
        .map(([label, value]) => `${label}=${value}`)
        .join(', ')}`
    );
  }
  return values[0]?.[1] || '';
}

export function descriptorEntrypoint(
  descriptor: LargeCorpusDescriptor,
  name: keyof LargeCorpusDescriptor['entrypoints']
): LargeResourceReference | undefined {
  const entrypoint = descriptor.entrypoints?.[name];
  const integrity = descriptor.entrypoint_integrity?.[name];
  if (!integrity) return entrypoint;
  if (resourcePath(integrity) !== resourcePath(entrypoint)) {
    throw new Error(`Descriptor entrypoint and integrity path differ for ${name}`);
  }
  resourceHash(integrity);
  return integrity;
}

export function integrityReference(
  reference: LargeResourceReference,
  metadataRows: LargeShardMetadata[] | undefined,
  label: string
): LargeResourceReference {
  if (typeof reference !== 'string') {
    resourceHash(reference);
    return reference;
  }
  if (!Array.isArray(metadataRows)) return reference;
  const metadata = metadataRows.find((row) => row && row.path === reference);
  if (!metadata) throw new Error(`${label} has no integrity metadata`);
  resourceHash(metadata);
  return metadata;
}

export function relationshipBucket(route: string): string {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(route);
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

export function hasTargetedRelationshipDelivery(
  source: Pick<LargeCorpusSource, 'descriptor' | 'manifest'>
): boolean {
  return Boolean(
    source.descriptor.entrypoints.relationship_adjacency ||
    source.manifest.indexes.relationship_adjacency ||
    source.descriptor.entrypoints.relationship_runtime ||
    source.manifest.indexes.relationship_runtime
  );
}

/**
 * Select route-bounded relationship hydration before any record/full-plane
 * fallback. Record locators are deliberately not part of this decision: rich
 * runtime and adjacency locators can resolve aggregate routes independently.
 */
export function prefersTargetedRelationshipHydration(
  source: Pick<LargeCorpusSource, 'descriptor' | 'manifest'>,
  route: string
): boolean {
  return Boolean(route && hasTargetedRelationshipDelivery(source));
}

async function loadChunks<T>(
  fetchResource: ResourceFetcher,
  paths: LargeResourceReference[] = [],
  metadataRows?: LargeShardMetadata[],
  label = 'Record shard'
): Promise<T[]> {
  const rows: T[] = [];
  const batchSize = CHUNK_FETCH_BATCH_SIZE;
  for (let offset = 0; offset < paths.length; offset += batchSize) {
    const batch = await Promise.all(
      paths
        .slice(offset, offset + batchSize)
        .map((path) => fetchResource<T[]>(integrityReference(path, metadataRows, label), true))
    );
    for (const chunk of batch) rows.push(...chunk);
  }
  return rows;
}

async function loadRelationshipChunks(
  fetchResource: ResourceFetcher,
  paths: LargeResourceReference[] = [],
  metadataRows: LargeShardMetadata[] | undefined,
  maxRows: number
): Promise<LargeRelationshipsResult> {
  const relationships: LargeRelationship[] = [];
  const batchSize = CHUNK_FETCH_BATCH_SIZE;
  let truncated = false;

  for (let offset = 0; offset < paths.length; offset += batchSize) {
    if (relationships.length >= maxRows) {
      truncated = true;
      break;
    }
    const batchPaths = paths.slice(offset, offset + batchSize);
    const batch = await Promise.all(
      batchPaths.map((path) =>
        fetchResource<LargeRelationship[]>(integrityReference(path, metadataRows, 'Relationship shard'), true)
      )
    );
    for (const chunk of batch) {
      if (relationships.length >= maxRows) {
        truncated = true;
        break;
      }
      const remaining = maxRows - relationships.length;
      if (chunk.length > remaining) {
        relationships.push(...chunk.slice(0, remaining));
        truncated = true;
      } else {
        relationships.push(...chunk);
      }
    }
    if (truncated) break;
  }

  return { relationships, truncated };
}

function richRuntimeObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function richRuntimeString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function richRuntimeIri(value: unknown, label: string): string {
  const iri = richRuntimeString(value, label);
  if (!ABSOLUTE_IRI.test(iri)) throw new Error(`${label} must be an absolute IRI`);
  return iri;
}

function richRuntimeHttpUrl(value: unknown, label: string): string {
  if (!isHttpUrl(value)) {
    throw new Error(`${label} must be a canonical credential-free HTTP(S) URL`);
  }
  return value;
}

function richRuntimeRoute(value: unknown, label: string): string {
  const route = richRuntimeString(value, label);
  if (!LOCAL_RELATIONSHIP_ROUTE.test(route)) {
    throw new Error(`${label} must be a safe local route`);
  }
  return route;
}

function richRuntimeInteger(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

function richRuntimeUnitNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a finite number from 0 to 1`);
  }
  return value;
}

function richRuntimeHash(value: unknown, label: string): string {
  const hash = richRuntimeString(value, label).toLowerCase();
  if (!SHA256.test(hash)) throw new Error(`${label} must be a SHA-256 digest`);
  return hash;
}

function richRuntimePath(value: unknown, label: string): string {
  return safeRelativeResourcePath(richRuntimeString(value, label), label);
}

function normalizeRichRelationshipRuntimeChunk(
  value: unknown,
  label: string
): LargeRichRelationshipRuntimeChunk {
  const row = richRuntimeObject(value, label);
  const path = richRuntimePath(row.path, `${label} path`);
  const id = richRuntimeIri(row.id, `${label} id`);
  const mediaType = richRuntimeString(row.media_type, `${label} media type`);
  const contentEncoding = richRuntimeString(
    row.content_encoding,
    `${label} content encoding`
  );
  if (mediaType !== 'application/json' || contentEncoding !== 'gzip') {
    throw new Error(`${label} must advertise gzip-compressed JSON`);
  }
  const count = richRuntimeInteger(row.count, `${label} count`);
  if (count > MAX_RICH_RELATIONSHIP_CHUNK_ROWS) {
    throw new Error(`${label} exceeds the rich relationship row ceiling`);
  }
  const records = row.records === undefined
    ? undefined
    : richRuntimeInteger(row.records, `${label} records`);
  if (records !== undefined && records !== count) {
    throw new Error(`${label} count and records differ`);
  }
  const bytes = richRuntimeInteger(row.bytes, `${label} bytes`, 1);
  if (bytes > MAX_RICH_RELATIONSHIP_CHUNK_BYTES) {
    throw new Error(`${label} exceeds the rich relationship compressed-byte ceiling`);
  }
  return {
    path,
    id,
    media_type: mediaType,
    content_encoding: contentEncoding,
    bytes,
    sha256: richRuntimeHash(row.sha256, `${label} SHA-256`),
    count,
    ...(records === undefined ? {} : { records })
  };
}

export function normalizeRichRelationshipRuntimeManifest(
  value: unknown
): LargeRichRelationshipRuntimeManifest {
  const document = richRuntimeObject(value, 'Rich relationship runtime manifest');
  if (document.schema !== RICH_RELATIONSHIP_RUNTIME_SCHEMA) {
    throw new Error('Rich relationship runtime manifest schema is unsupported');
  }
  if (
    !Array.isArray(document.default_planes) ||
    !document.default_planes.length ||
    document.default_planes.length > MAX_RICH_RELATIONSHIP_PLANES
  ) {
    throw new Error('Rich relationship runtime manifest has no default planes');
  }
  const defaultPlanes = document.default_planes.map((name, index) =>
    richRuntimeString(name, `Rich relationship default plane ${index}`)
  );
  if (new Set(defaultPlanes).size !== defaultPlanes.length) {
    throw new Error('Rich relationship runtime default planes are duplicated');
  }
  if (
    !Array.isArray(document.planes) ||
    !document.planes.length ||
    document.planes.length > MAX_RICH_RELATIONSHIP_PLANES
  ) {
    throw new Error('Rich relationship runtime manifest has no planes');
  }

  const chunkPaths = new Set<string>();
  const chunkIds = new Set<string>();
  const planeNames = new Set<string>();
  const planeIds = new Set<string>();
  const planes: LargeRichRelationshipRuntimePlane[] = document.planes.map(
    (value, planeIndex) => {
      const plane = richRuntimeObject(value, `Rich relationship plane ${planeIndex}`);
      const name = richRuntimeString(plane.name, `Rich relationship plane ${planeIndex} name`);
      const id = richRuntimeIri(plane.id, `Rich relationship plane ${name} id`);
      if (planeNames.has(name) || planeIds.has(id)) {
        throw new Error('Rich relationship runtime planes have duplicate identities');
      }
      planeNames.add(name);
      planeIds.add(id);
      if (typeof plane.active !== 'boolean') {
        throw new Error(`Rich relationship plane ${name} active flag is malformed`);
      }
      const lifecycle = richRuntimeString(
        plane.lifecycle,
        `Rich relationship plane ${name} lifecycle`
      );
      if (
        !RICH_RELATIONSHIP_PLANE_LIFECYCLES.has(lifecycle) ||
        plane.active !== (lifecycle === 'active')
      ) {
        throw new Error(`Rich relationship plane ${name} lifecycle conflicts with its active flag`);
      }
      if (!Array.isArray(plane.authority_classes) || !plane.authority_classes.length) {
        throw new Error(`Rich relationship plane ${name} has no authority classes`);
      }
      const authorityClasses = plane.authority_classes.map((authority, index) => {
        const authorityClass = richRuntimeString(
          authority,
          `Rich relationship plane ${name} authority class ${index}`
        );
        if (!RICH_RELATIONSHIP_AUTHORITY_CLASSES.has(authorityClass)) {
          throw new Error(`Rich relationship plane ${name} has an unsupported authority class`);
        }
        return authorityClass;
      });
      if (new Set(authorityClasses).size !== authorityClasses.length) {
        throw new Error(`Rich relationship plane ${name} has duplicate authority classes`);
      }
      if (!Array.isArray(plane.chunks)) {
        throw new Error(`Rich relationship plane ${name} has no chunk list`);
      }
      const chunks = plane.chunks.map((chunk, chunkIndex) => {
        const normalized = normalizeRichRelationshipRuntimeChunk(
          chunk,
          `Rich relationship plane ${name} chunk ${chunkIndex}`
        );
        if (chunkPaths.has(normalized.path) || chunkIds.has(normalized.id)) {
          throw new Error('Rich relationship runtime chunks have duplicate identities');
        }
        chunkPaths.add(normalized.path);
        chunkIds.add(normalized.id);
        return normalized;
      });
      const assertions = richRuntimeInteger(
        plane.assertions,
        `Rich relationship plane ${name} assertion count`
      );
      if (chunks.reduce((total, chunk) => total + chunk.count, 0) !== assertions) {
        throw new Error(`Rich relationship plane ${name} chunk counts do not reconcile`);
      }
      return {
        id,
        name,
        active: plane.active,
        lifecycle,
        authority_classes: authorityClasses,
        assertions,
        chunks
      };
    }
  );

  const activeNames = planes.filter((plane) => plane.active).map((plane) => plane.name);
  if (
    defaultPlanes.length !== activeNames.length ||
    defaultPlanes.some((name, index) => name !== activeNames[index])
  ) {
    throw new Error('Rich relationship runtime defaults must exactly match active planes');
  }

  const locator = richRuntimeObject(
    document.route_locator,
    'Rich relationship runtime route locator'
  );
  const totals = richRuntimeObject(document.totals, 'Rich relationship runtime totals');
  const normalizedTotals = {
    active_assertions: richRuntimeInteger(
      totals.active_assertions,
      'Rich relationship active assertion total'
    ),
    historical_assertions: richRuntimeInteger(
      totals.historical_assertions,
      'Rich relationship historical assertion total'
    ),
    rejected_assertions: richRuntimeInteger(
      totals.rejected_assertions,
      'Rich relationship rejected assertion total'
    ),
    all_assertions: richRuntimeInteger(
      totals.all_assertions,
      'Rich relationship all-assertion total'
    ),
    chunks: richRuntimeInteger(totals.chunks, 'Rich relationship chunk total')
  };
  const planeAssertionTotal = planes.reduce((total, plane) => total + plane.assertions, 0);
  const activeAssertionTotal = planes
    .filter((plane) => plane.active)
    .reduce((total, plane) => total + plane.assertions, 0);
  const chunkTotal = planes.reduce((total, plane) => total + plane.chunks.length, 0);
  if (chunkTotal > MAX_RICH_RELATIONSHIP_CHUNKS) {
    throw new Error('Rich relationship runtime exceeds the chunk-count ceiling');
  }
  const historicalAssertionTotal = planes
    .filter((plane) => plane.lifecycle === 'historical')
    .reduce((total, plane) => total + plane.assertions, 0);
  const rejectedAssertionTotal = planes
    .filter((plane) => plane.lifecycle === 'rejected')
    .reduce((total, plane) => total + plane.assertions, 0);
  if (
    normalizedTotals.active_assertions !== activeAssertionTotal ||
    normalizedTotals.historical_assertions !== historicalAssertionTotal ||
    normalizedTotals.rejected_assertions !== rejectedAssertionTotal ||
    normalizedTotals.all_assertions !== planeAssertionTotal ||
    normalizedTotals.active_assertions +
      normalizedTotals.historical_assertions +
      normalizedTotals.rejected_assertions !==
      normalizedTotals.all_assertions ||
    normalizedTotals.chunks !== chunkTotal
  ) {
    throw new Error('Rich relationship runtime totals do not reconcile with its planes');
  }

  return {
    '@id': richRuntimeIri(document['@id'], 'Rich relationship runtime manifest id'),
    schema: RICH_RELATIONSHIP_RUNTIME_SCHEMA,
    snapshot: richRuntimeString(document.snapshot, 'Rich relationship runtime snapshot'),
    generated_at: richRuntimeString(
      document.generated_at,
      'Rich relationship runtime generation time'
    ),
    semantic_manifest: richRuntimePath(
      document.semantic_manifest,
      'Rich relationship semantic manifest path'
    ),
    assertion_contract: richRuntimePath(
      document.assertion_contract,
      'Rich relationship assertion contract path'
    ),
    row_contract: richRuntimePath(
      document.row_contract,
      'Rich relationship row contract path'
    ),
    default_planes: defaultPlanes,
    route_locator: {
      path: richRuntimePath(locator.path, 'Rich relationship route locator path'),
      id: richRuntimeIri(locator.id, 'Rich relationship route locator id'),
      routes: richRuntimeInteger(locator.routes, 'Rich relationship route count', 1),
      buckets: richRuntimeInteger(locator.buckets, 'Rich relationship route bucket count', 1),
      sha256: richRuntimeHash(locator.sha256, 'Rich relationship route locator SHA-256')
    },
    planes,
    totals: normalizedTotals,
    loading_policy: richRuntimeString(
      document.loading_policy,
      'Rich relationship loading policy'
    )
  };
}

function normalizeRichRelationshipRouteLocator(
  value: unknown,
  runtime: LargeRichRelationshipRuntimeManifest
): LargeRichRelationshipRouteLocator {
  const document = richRuntimeObject(value, 'Rich relationship route locator');
  if (
    document.schema !== RICH_RELATIONSHIP_LOCATOR_SCHEMA ||
    document.hash_algorithm !== RICH_RELATIONSHIP_LOCATOR_ALGORITHM
  ) {
    throw new Error('Rich relationship route locator schema or algorithm is unsupported');
  }
  const template = richRuntimePath(
    document.bucket_path_template,
    'Rich relationship route locator bucket template'
  );
  if (!template.includes('{prefix}')) {
    throw new Error('Rich relationship route locator bucket template has no prefix token');
  }
  if (!Array.isArray(document.buckets)) {
    throw new Error('Rich relationship route locator has no bucket metadata');
  }
  const prefixes = new Set<string>();
  const paths = new Set<string>();
  const buckets = document.buckets.map((value, index) => {
    const row = richRuntimeObject(value, `Rich relationship route bucket ${index}`);
    const bucket = richRuntimeString(row.bucket, `Rich relationship route bucket ${index} prefix`);
    if (!/^[0-9a-f]{2}$/.test(bucket) || prefixes.has(bucket)) {
      throw new Error('Rich relationship route locator bucket prefixes are malformed or duplicated');
    }
    prefixes.add(bucket);
    const path = richRuntimePath(row.path, `Rich relationship route bucket ${bucket} path`);
    if (path !== template.replace('{prefix}', bucket) || paths.has(path)) {
      throw new Error('Rich relationship route locator bucket paths are malformed or duplicated');
    }
    paths.add(path);
    const contentEncoding = richRuntimeString(
      row.content_encoding,
      `Rich relationship route bucket ${bucket} content encoding`
    );
    if (contentEncoding !== 'gzip') {
      throw new Error('Rich relationship route locator buckets must be gzip-compressed');
    }
    const bytes = richRuntimeInteger(
      row.bytes,
      `Rich relationship route bucket ${bucket} bytes`,
      1
    );
    if (bytes > MAX_RICH_RELATIONSHIP_CHUNK_BYTES) {
      throw new Error(`Rich relationship route bucket ${bucket} exceeds the compressed-byte ceiling`);
    }
    return {
      bucket,
      path,
      bytes,
      sha256: richRuntimeHash(row.sha256, `Rich relationship route bucket ${bucket} SHA-256`),
      content_encoding: contentEncoding,
      routes: richRuntimeInteger(row.routes, `Rich relationship route bucket ${bucket} routes`),
      chunk_references: richRuntimeInteger(
        row.chunk_references,
        `Rich relationship route bucket ${bucket} chunk references`
      )
    };
  });
  const counts = richRuntimeObject(document.counts, 'Rich relationship route locator counts');
  const normalizedCounts = {
    routes: richRuntimeInteger(counts.routes, 'Rich relationship route locator route count'),
    buckets: richRuntimeInteger(counts.buckets, 'Rich relationship route locator bucket count'),
    chunk_references: richRuntimeInteger(
      counts.chunk_references,
      'Rich relationship route locator chunk-reference count'
    )
  };
  if (
    normalizedCounts.routes !== buckets.reduce((total, row) => total + row.routes, 0) ||
    normalizedCounts.buckets !== buckets.length ||
    normalizedCounts.buckets > 256 ||
    normalizedCounts.chunk_references !==
      buckets.reduce((total, row) => total + row.chunk_references, 0) ||
    runtime.route_locator.routes !== normalizedCounts.routes ||
    runtime.route_locator.buckets !== normalizedCounts.buckets
  ) {
    throw new Error('Rich relationship route locator counts do not reconcile');
  }
  return {
    schema: RICH_RELATIONSHIP_LOCATOR_SCHEMA,
    generated_at: richRuntimeString(
      document.generated_at,
      'Rich relationship route locator generation time'
    ),
    hash_algorithm: RICH_RELATIONSHIP_LOCATOR_ALGORITHM,
    bucket_path_template: template,
    buckets,
    counts: normalizedCounts
  };
}

async function normalizeRichRelationshipRouteLocatorBucket(
  value: unknown,
  prefix: string,
  expectedRoutes: number,
  expectedReferences: number,
  knownChunks: Map<string, string>
): Promise<LargeRichRelationshipRouteLocatorBucket> {
  const document = richRuntimeObject(value, `Rich relationship route bucket ${prefix}`);
  if (
    document.schema !== RICH_RELATIONSHIP_LOCATOR_BUCKET_SCHEMA ||
    document.hash_algorithm !== RICH_RELATIONSHIP_LOCATOR_ALGORITHM ||
    document.bucket !== prefix
  ) {
    throw new Error(`Rich relationship route bucket ${prefix} schema, algorithm or prefix differs`);
  }
  if (!Array.isArray(document.routes)) {
    throw new Error(`Rich relationship route bucket ${prefix} has no routes`);
  }
  const seenRoutes = new Set<string>();
  const routes = await Promise.all(document.routes.map(async (value, index) => {
    const row = richRuntimeObject(value, `Rich relationship route bucket ${prefix} row ${index}`);
    const route = richRuntimeRoute(row.route, `Rich relationship route bucket ${prefix} route ${index}`);
    if (seenRoutes.has(route)) {
      throw new Error(`Rich relationship route bucket ${prefix} has a duplicate or misplaced route`);
    }
    seenRoutes.add(route);
    if ((await sha256Hex(route)).slice(0, 2) !== prefix) {
      throw new Error(`Rich relationship route bucket ${prefix} has a duplicate or misplaced route`);
    }
    if (!Array.isArray(row.chunks) || !row.chunks.length) {
      throw new Error(`Rich relationship route bucket ${prefix} route ${route} has no chunks`);
    }
    const chunks = row.chunks.map((path, chunkIndex) => {
      const normalizedPath = richRuntimePath(
        path,
        `Rich relationship route bucket ${prefix} route ${route} chunk ${chunkIndex}`
      );
      if (!knownChunks.has(normalizedPath)) {
        throw new Error(`Rich relationship route bucket ${prefix} names an unknown chunk`);
      }
      return normalizedPath;
    });
    if (new Set(chunks).size !== chunks.length) {
      throw new Error(`Rich relationship route bucket ${prefix} route ${route} repeats a chunk`);
    }
    if (!Array.isArray(row.planes) || !row.planes.length) {
      throw new Error(`Rich relationship route bucket ${prefix} route ${route} has no plane commitments`);
    }
    const planeNames = new Set<string>();
    const planes = row.planes.map((value, planeIndex) => {
      const plane = richRuntimeObject(
        value,
        `Rich relationship route bucket ${prefix} route ${route} plane ${planeIndex}`
      );
      const name = richRuntimeString(
        plane.name,
        `Rich relationship route bucket ${prefix} route ${route} plane ${planeIndex} name`
      );
      if (planeNames.has(name)) {
        throw new Error(`Rich relationship route bucket ${prefix} route ${route} repeats a plane`);
      }
      planeNames.add(name);
      if (!Array.isArray(plane.chunks) || !plane.chunks.length) {
        throw new Error(
          `Rich relationship route bucket ${prefix} route ${route} plane ${name} has no chunks`
        );
      }
      const planeChunks = plane.chunks.map((path, chunkIndex) => {
        const normalizedPath = richRuntimePath(
          path,
          `Rich relationship route bucket ${prefix} route ${route} plane ${name} chunk ${chunkIndex}`
        );
        if (knownChunks.get(normalizedPath) !== name) {
          throw new Error(
            `Rich relationship route bucket ${prefix} route ${route} plane ${name} names an unknown or cross-plane chunk`
          );
        }
        return normalizedPath;
      });
      if (new Set(planeChunks).size !== planeChunks.length) {
        throw new Error(
          `Rich relationship route bucket ${prefix} route ${route} plane ${name} repeats a chunk`
        );
      }
      return {
        name,
        assertions: richRuntimeInteger(
          plane.assertions,
          `Rich relationship route bucket ${prefix} route ${route} plane ${name} assertions`,
          1
        ),
        assertion_ids_sha256: richRuntimeHash(
          plane.assertion_ids_sha256,
          `Rich relationship route bucket ${prefix} route ${route} plane ${name} assertion digest`
        ),
        chunks: planeChunks
      };
    });
    const committedChunks = new Set(planes.flatMap((plane) => plane.chunks));
    if (
      committedChunks.size !== chunks.length ||
      chunks.some((path) => !committedChunks.has(path))
    ) {
      throw new Error(`Rich relationship route bucket ${prefix} route ${route} plane commitments differ from its chunks`);
    }
    return { route, chunks, planes };
  }));
  const counts = richRuntimeObject(
    document.counts,
    `Rich relationship route bucket ${prefix} counts`
  );
  const normalizedCounts = {
    routes: richRuntimeInteger(counts.routes, `Rich relationship route bucket ${prefix} route count`),
    chunk_references: richRuntimeInteger(
      counts.chunk_references,
      `Rich relationship route bucket ${prefix} chunk-reference count`
    )
  };
  if (
    normalizedCounts.routes !== routes.length ||
    normalizedCounts.chunk_references !== routes.reduce((total, row) => total + row.chunks.length, 0) ||
    normalizedCounts.routes !== expectedRoutes ||
    normalizedCounts.chunk_references !== expectedReferences
  ) {
    throw new Error(`Rich relationship route bucket ${prefix} counts do not reconcile`);
  }
  return {
    schema: RICH_RELATIONSHIP_LOCATOR_BUCKET_SCHEMA,
    generated_at: richRuntimeString(
      document.generated_at,
      `Rich relationship route bucket ${prefix} generation time`
    ),
    hash_algorithm: RICH_RELATIONSHIP_LOCATOR_ALGORITHM,
    bucket: prefix,
    routes,
    counts: normalizedCounts
  };
}

type RichRelationshipChunkProjection = {
  relationships: LargeRelationship[];
  retainedTextUnits: number;
};

function richRuntimeOptionalText(
  source: Record<string, unknown>,
  field: string,
  label: string
): string | undefined {
  const value = source[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${label} must be a string`);
  return value;
}

function retainedTextUnits(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + retainedTextUnits(item), 0);
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .reduce<number>((total, item) => total + retainedTextUnits(item), 0);
  }
  return 0;
}

function projectRichRelationshipEvidence(
  value: unknown,
  label: string
): Record<string, unknown> {
  const evidence = richRuntimeObject(value, label);
  const projected: Record<string, unknown> = {
    '@id': richRuntimeIri(evidence['@id'], `${label} id`),
    type: richRuntimeString(evidence.type, `${label} type`),
    url: richRuntimeHttpUrl(evidence.url, `${label} URL`),
    source_field: richRuntimeString(evidence.source_field, `${label} source field`),
    source_value_sha256: richRuntimeHash(
      evidence.source_value_sha256,
      `${label} source-value SHA-256`
    ),
    retrieved_at: richRuntimeString(evidence.retrieved_at, `${label} retrieval time`)
  };
  if (evidence.resource !== undefined) {
    projected.resource = richRuntimeHttpUrl(evidence.resource, `${label} resource`);
  }
  for (const field of ['normalization', 'rule_id'] as const) {
    if (evidence[field] !== undefined) {
      projected[field] = richRuntimeIri(evidence[field], `${label} ${field}`);
    }
  }
  for (const field of ['source_sha256', 'literal_sha256'] as const) {
    if (evidence[field] !== undefined) {
      projected[field] = richRuntimeHash(evidence[field], `${label} ${field}`);
    }
  }
  for (const field of [
    'source_artifact',
    'field_provenance',
    'source_value',
    'source_value_hash_canonicalization',
    'value',
    'rationale',
    'locator',
    'source_locator'
  ] as const) {
    const text = richRuntimeOptionalText(evidence, field, `${label} ${field}`);
    if (text !== undefined) projected[field] = text;
  }
  return projected;
}

function normalizeRichRelationshipRows(
  value: unknown,
  chunk: LargeRichRelationshipRuntimeChunk,
  plane: LargeRichRelationshipRuntimePlane
): RichRelationshipChunkProjection {
  if (!Array.isArray(value) || value.length !== chunk.count) {
    throw new Error(`Rich relationship chunk ${chunk.path} row count differs from its manifest`);
  }
  const identifiers = new Set<string>();
  const relationships: LargeRelationship[] = [];
  let chunkRetainedTextUnits = 0;
  value.forEach((value, index) => {
    const label = `Rich relationship chunk ${chunk.path} row ${index}`;
    const row = richRuntimeObject(value, label);
    if (row.schema !== RICH_RELATIONSHIP_ROW_SCHEMA) {
      throw new Error(`${label} schema is unsupported`);
    }
    const id = richRuntimeIri(row.id, `${label} id`);
    const assertionId = richRuntimeIri(row.assertion_id, `${label} assertion id`);
    if (id !== assertionId || identifiers.has(id)) {
      throw new Error(`${label} has a mismatched or duplicate assertion identity`);
    }
    identifiers.add(id);
    const source = richRuntimeRoute(row.source, `${label} source`);
    const target = richRuntimeRoute(row.target, `${label} target`);
    if (
      (row.source_route !== undefined && richRuntimeRoute(row.source_route, `${label} source route`) !== source) ||
      (row.target_route !== undefined && richRuntimeRoute(row.target_route, `${label} target route`) !== target)
    ) {
      throw new Error(`${label} route aliases differ`);
    }
    const predicate = richRuntimeIri(row.predicate, `${label} predicate`);
    if (richRuntimeIri(row.predicate_iri, `${label} predicate IRI`) !== predicate) {
      throw new Error(`${label} predicate aliases differ`);
    }
    if (
      row.direction !== 'source-to-target' ||
      row.active !== plane.active ||
      richRuntimeIri(row.plane, `${label} plane`) !== plane.id
    ) {
      throw new Error(`${label} direction or plane binding differs`);
    }
    const assertionStatus = richRuntimeString(
      row.assertion_status,
      `${label} assertion status`
    );
    const assertionScope = richRuntimeString(
      row.assertion_scope,
      `${label} assertion scope`
    );
    if (!RICH_RELATIONSHIP_ASSERTION_STATUSES.has(assertionStatus)) {
      throw new Error(`${label} assertion status is outside the governed contract`);
    }
    if (!RICH_RELATIONSHIP_ASSERTION_SCOPES.has(assertionScope)) {
      throw new Error(`${label} assertion scope is outside the governed contract`);
    }
    const authority = richRuntimeObject(row.authority, `${label} authority`);
    const authorityClass = richRuntimeString(authority.class, `${label} authority class`);
    if (
      !RICH_RELATIONSHIP_AUTHORITY_CLASSES.has(authorityClass) ||
      !plane.authority_classes.includes(authorityClass)
    ) {
      throw new Error(`${label} authority is outside its declared plane`);
    }
    const authorityLabel = richRuntimeString(authority.label, `${label} authority label`);
    const authoritySource = richRuntimeHttpUrl(authority.source, `${label} authority source`);
    const expectedAuthorityClass = assertionScope === 'synthetic-fixture'
      ? 'synthetic'
      : {
          official: 'official',
          normalized: 'derived',
          inferred: 'derived',
          'model-derived': 'model-assisted'
        }[assertionStatus];
    if (authorityClass !== expectedAuthorityClass) {
      throw new Error(`${label} authority conflicts with its assertion status and scope`);
    }
    if (!Array.isArray(row.evidence) || !row.evidence.length) {
      throw new Error(`${label} has no evidence`);
    }
    if (row.evidence.length > MAX_RICH_RELATIONSHIP_EVIDENCE_ITEMS) {
      throw new Error(
        `${label} exceeds the ${MAX_RICH_RELATIONSHIP_EVIDENCE_ITEMS}-item evidence ceiling`
      );
    }
    const evidenceIds = new Set<string>();
    const projectedEvidence = row.evidence.map((value, evidenceIndex) => {
      const evidenceLabel = `${label} evidence ${evidenceIndex}`;
      const evidence = projectRichRelationshipEvidence(value, evidenceLabel);
      const evidenceId = String(evidence['@id']);
      if (evidenceIds.has(evidenceId)) {
        throw new Error(`${label} repeats an evidence identity`);
      }
      evidenceIds.add(evidenceId);
      return evidence;
    });
    const rights = richRuntimeObject(row.rights, `${label} rights`);
    const rightsSource = richRuntimeHttpUrl(rights.source, `${label} rights source`);
    const rightsAssertion = richRuntimeString(rights.assertion, `${label} rights assertion`);
    const derivation = richRuntimeIri(row.derivation, `${label} derivation`);
    const observedAt = richRuntimeString(row.observed_at, `${label} observation time`);
    const kind = richRuntimeString(row.kind, `${label} kind`);
    const relationshipLabel = richRuntimeString(row.label, `${label} label`);
    const inverseLabel = richRuntimeString(row.inverse_label, `${label} inverse label`);
    let rule: string | undefined;
    let derivationActivity: string | undefined;
    let confidenceScore: number | undefined;
    let supportingAssertions: string[] | undefined;
    let reviewStatus: string | undefined;
    if (assertionStatus === 'inferred') {
      rule = richRuntimeIri(row.rule, `${label} inference rule`);
      derivationActivity = richRuntimeIri(
        row.derivation_activity,
        `${label} derivation activity`
      );
      confidenceScore = richRuntimeUnitNumber(
        row.confidence_score,
        `${label} confidence score`
      );
      if (!Array.isArray(row.supporting_assertions) || !row.supporting_assertions.length) {
        throw new Error(`${label} inferred assertion has no supporting assertions`);
      }
      if (row.supporting_assertions.length > MAX_RICH_RELATIONSHIP_SUPPORTING_ASSERTIONS) {
        throw new Error(
          `${label} exceeds the ` +
          `${MAX_RICH_RELATIONSHIP_SUPPORTING_ASSERTIONS}-item supporting-assertion ceiling`
        );
      }
      supportingAssertions = row.supporting_assertions.map((value, supportIndex) =>
        richRuntimeIri(value, `${label} supporting assertion ${supportIndex}`)
      );
    }
    if (assertionStatus === 'model-derived') {
      derivationActivity = richRuntimeIri(
        row.derivation_activity,
        `${label} derivation activity`
      );
      confidenceScore = richRuntimeUnitNumber(
        row.confidence_score,
        `${label} confidence score`
      );
      reviewStatus = richRuntimeString(row.review_status, `${label} review status`);
    }

    const sourceIri = richRuntimeIri(row.source_iri, `${label} source IRI`);
    const targetIri = richRuntimeIri(row.target_iri, `${label} target IRI`);
    const projected: LargeRelationship = {
      schema: RICH_RELATIONSHIP_ROW_SCHEMA,
      id,
      assertion_id: assertionId,
      source,
      target,
      source_route: source,
      target_route: target,
      source_iri: sourceIri,
      target_iri: targetIri,
      predicate,
      predicate_iri: predicate,
      kind,
      label: relationshipLabel,
      inverse_label: inverseLabel,
      direction: 'source-to-target',
      assertion_status: assertionStatus,
      assertion_scope: assertionScope,
      authority: {
        class: authorityClass,
        label: authorityLabel,
        source: authoritySource
      },
      derivation,
      observed_at: observedAt,
      evidence: projectedEvidence,
      rights: {
        source: rightsSource,
        assertion: rightsAssertion
      },
      plane: plane.id,
      lifecycle: plane.lifecycle,
      active: plane.active,
      ...(rule ? { rule } : {}),
      ...(derivationActivity ? { derivation_activity: derivationActivity } : {}),
      ...(confidenceScore === undefined ? {} : { confidence_score: confidenceScore }),
      ...(supportingAssertions ? { supporting_assertions: supportingAssertions } : {}),
      ...(reviewStatus ? { review_status: reviewStatus } : {})
    };
    for (const field of ['stale_after', 'freshness', 'support_profile'] as const) {
      const text = richRuntimeOptionalText(row, field, `${label} ${field}`);
      if (text !== undefined) projected[field] = text;
    }
    if (row.confidence !== undefined) {
      if (
        !(
          typeof row.confidence === 'string' ||
          (typeof row.confidence === 'number' && Number.isFinite(row.confidence))
        )
      ) {
        throw new Error(`${label} confidence must be a string or finite number`);
      }
      projected.confidence = row.confidence;
    }
    for (const field of ['strength', 'count'] as const) {
      if (row[field] !== undefined) {
        if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) {
          throw new Error(`${label} ${field} must be a finite number`);
        }
        projected[field] = row[field];
      }
    }
    if (row.official_legal_classification !== undefined) {
      if (typeof row.official_legal_classification !== 'boolean') {
        throw new Error(`${label} official legal classification must be boolean`);
      }
      projected.official_legal_classification = row.official_legal_classification;
    }

    const rowRetainedTextUnits = retainedTextUnits(projected);
    if (rowRetainedTextUnits > MAX_RICH_RELATIONSHIP_ROW_TEXT_UNITS) {
      throw new Error(
        `${label} exceeds the ${MAX_RICH_RELATIONSHIP_ROW_TEXT_UNITS}-unit retained-text ceiling`
      );
    }
    chunkRetainedTextUnits += rowRetainedTextUnits;
    if (chunkRetainedTextUnits > MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS) {
      throw new Error(
        `Rich relationship chunk ${chunk.path} exceeds the aggregate retained-text ceiling`
      );
    }
    relationships.push(projected);
  });
  return { relationships, retainedTextUnits: chunkRetainedTextUnits };
}

function indexResourcesByDataset(resources: LargeResource[]): Map<string, LargeResource[]> {
  const out = new Map<string, LargeResource[]>();
  for (const resource of resources) {
    const rows = out.get(resource.dataset) || [];
    rows.push(resource);
    out.set(resource.dataset, rows);
  }
  for (const rows of out.values()) {
    rows.sort((left, right) => (left.position || 0) - (right.position || 0) || (left.name || '').localeCompare(right.name || ''));
  }
  return out;
}

function mergeOperationalMetadata(
  datasets: LargeDataset[],
  index: LargeOperationalMetadataIndex
): LargeDataset[] {
  return datasets.map((dataset) => {
    const route = dataset.route || `dataset/${dataset.name}`;
    const metadata = index.records[route] || index.records[dataset.name];
    return metadata ? { ...dataset, operational_metadata: metadata } : dataset;
  });
}

const FACET_INDEX_METADATA_KEYS = new Set(['schema', 'snapshot', 'snapshot_id', 'generated_at']);

function normalizeFacetIndex(document: unknown): Record<string, LargeFacetRow[]> {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Facet index must be a JSON object');
  }
  const facets: Record<string, LargeFacetRow[]> = {};
  for (const [key, value] of Object.entries(document)) {
    if (!Array.isArray(value)) {
      if (FACET_INDEX_METADATA_KEYS.has(key)) continue;
      throw new Error(`Facet index field ${key} must be an array`);
    }
    facets[key] = value.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Facet index field ${key}[${index}] must be an object`);
      }
      const facet = row as Record<string, unknown>;
      if (typeof facet.value !== 'string' || typeof facet.count !== 'number' || !Number.isFinite(facet.count) || facet.count < 0) {
        throw new Error(`Facet index field ${key}[${index}] has an invalid value or count`);
      }
      return { value: facet.value, count: facet.count };
    });
  }
  return facets;
}

export async function loadLargeCorpus(
  url: string,
  preloadedDescriptor?: LargeCorpusDescriptor
): Promise<LargeCorpusSource> {
  const descriptor = preloadedDescriptor || await fetchJson<LargeCorpusDescriptor>(url);
  if (descriptor.kind !== 'okf-large-corpus') {
    throw new Error(`${url}: not an OKF large-corpus descriptor`);
  }
  const baseUrl = baseUrlFor(url);
  const descriptorSnapshot = declaredSnapshot(descriptor, 'Descriptor');
  const releaseDataPlaneReference = descriptorEntrypoint(descriptor, 'release_data_plane');
  let releaseDataPlane: PreparedReleaseDataPlane | undefined;
  if (releaseDataPlaneReference) {
    if (!resourceHash(releaseDataPlaneReference)) {
      throw new Error('Release data-plane index has no descriptor SHA-256 binding');
    }
    const document = await fetchJsonResource<LargeReleaseDataPlaneIndex>(releaseDataPlaneReference, baseUrl);
    releaseDataPlane = await prepareReleaseDataPlane(
      document,
      baseUrl,
      descriptorSnapshot
    );
  }
  const fetchResource: ResourceFetcher = <T>(reference: LargeResourceReference, requireReleaseEntry = false) =>
    fetchJsonResource<T>(reference, baseUrl, { releaseDataPlane, requireReleaseEntry });
  const dataManifestReference = descriptorEntrypoint(descriptor, 'data_manifest');
  if (!dataManifestReference) throw new Error(`${url}: large-corpus descriptor has no data manifest`);
  const manifest = await fetchResource<LargeDataManifest>(dataManifestReference);
  const advertisedRoot = String(descriptor.data_plane_manifest_root_sha256 || '');
  const manifestRoot = String(manifest.integrity?.manifest_root_sha256 || '');
  if (advertisedRoot && advertisedRoot !== manifestRoot) {
    throw new Error('Descriptor and data manifest integrity roots differ');
  }
  const overviewPath = descriptorEntrypoint(descriptor, 'overview_index') || manifest.indexes?.overview;
  const overview = await fetchResource<LargeOverview>(overviewPath);
  const analysisPath = descriptorEntrypoint(descriptor, 'analysis_overview') || manifest.indexes?.analysis;
  const analysis = analysisPath
    ? await fetchResource<LargeAnalysisOverview>(analysisPath).catch(() => undefined)
    : undefined;
  const presentationPath = descriptorEntrypoint(descriptor, 'presentation') || manifest.indexes?.presentation;
  const presentation = presentationPath
    ? normalizeExplorerPresentation(await fetchResource<unknown>(presentationPath).catch(() => undefined))
    : undefined;
  const descriptorTermsPath = descriptorEntrypoint(descriptor, 'terms');
  const manifestTermsPath = manifest.indexes?.terms;
  if (
    descriptorTermsPath &&
    manifestTermsPath &&
    resourcePath(descriptorTermsPath) !== resourcePath(manifestTermsPath)
  ) {
    throw new Error('Descriptor and data manifest governed-term registry paths differ');
  }
  const termsPath = descriptorTermsPath || manifestTermsPath;
  const termRegistry: GovernedTermRegistry | undefined = termsPath
    ? normalizeGovernedTermRegistry(await fetchResource<unknown>(termsPath))
    : undefined;
  const descriptorTermValidationPath = descriptorEntrypoint(descriptor, 'term_validation');
  const manifestTermValidationPath = manifest.indexes?.term_validation;
  if (
    descriptorTermValidationPath &&
    manifestTermValidationPath &&
    resourcePath(descriptorTermValidationPath) !== resourcePath(manifestTermValidationPath)
  ) {
    throw new Error('Descriptor and data manifest governed-term validation paths differ');
  }
  const termValidationPath = descriptorTermValidationPath || manifestTermValidationPath;
  if (termValidationPath && !termRegistry) {
    throw new Error('Governed-term validation is advertised without a governed-term registry');
  }
  const termValidation: GovernedTermValidation | undefined = termValidationPath
    ? normalizeGovernedTermValidation(await fetchResource<unknown>(termValidationPath))
    : undefined;
  if (termRegistry) validateGovernedTermEvidence(termRegistry, termValidation);
  const descriptorProviderDatapackPath = descriptorEntrypoint(
    descriptor,
    'provider_datapacks'
  );
  const descriptorProviderDatapackIntegrity =
    descriptor.entrypoint_integrity?.provider_datapacks;
  const manifestProviderDatapackPath = manifest.indexes?.provider_datapacks;
  if (
    descriptorProviderDatapackPath &&
    manifestProviderDatapackPath &&
    resourcePath(descriptorProviderDatapackPath) !== resourcePath(manifestProviderDatapackPath)
  ) {
    throw new Error(
      'Descriptor and data manifest provider-datapack manifest paths differ'
    );
  }
  const descriptorProviderHash = resourceHash(descriptorProviderDatapackPath);
  const manifestProviderHash = resourceHash(manifestProviderDatapackPath);
  if (
    descriptorProviderHash &&
    manifestProviderHash &&
    descriptorProviderHash !== manifestProviderHash
  ) {
    throw new Error(
      'Descriptor and data manifest provider-datapack manifest SHA-256 values differ'
    );
  }
  const providerDatapacksAdvertised = Boolean(
    descriptorProviderDatapackPath || manifestProviderDatapackPath
  );
  if (
    providerDatapacksAdvertised &&
    (
      !descriptor.entrypoints.provider_datapacks ||
      !descriptorProviderDatapackIntegrity ||
      !resourceHash(descriptorProviderDatapackIntegrity) ||
      !descriptorProviderHash
    )
  ) {
    throw new Error(
      'Advertised provider datapacks require a descriptor entrypoint with entrypoint_integrity SHA-256'
    );
  }
  const providerDatapackPath = descriptorProviderDatapackPath;
  let providerDatapackManifest: LargeProviderDatapackManifest | undefined;
  let providerDatapackPacks: LargeProviderDatapack[] = [];
  if (providerDatapackPath) {
    const manifestSnapshot = declaredSnapshot(manifest, 'Data manifest');
    if (!descriptorSnapshot || !manifestSnapshot) {
      throw new Error(
        'Advertised provider datapacks require snapshot identifiers on both the descriptor and data manifest'
      );
    }
    const bundleBase = new URL(baseUrl);
    const bundlePathPrefix = bundleBase.pathname.endsWith('/')
      ? bundleBase.pathname
      : `${bundleBase.pathname}/`;
    const resolvedManifest = new URL(resourcePath(providerDatapackPath), baseUrl);
    if (
      resolvedManifest.origin !== bundleBase.origin ||
      !resolvedManifest.pathname.startsWith(bundlePathPrefix)
    ) {
      throw new Error('Provider datapack manifest must stay inside the bundle base path');
    }
    providerDatapackManifest = normalizeProviderDatapackManifest(
      await fetchResource<unknown>(providerDatapackPath)
    );
    providerDatapackPacks = await Promise.all(
      providerDatapackManifest.packs.map(async (entry) => {
        const resolved = new URL(entry.path, baseUrl);
        if (
          resolved.origin !== bundleBase.origin ||
          !resolved.pathname.startsWith(bundlePathPrefix)
        ) {
          throw new Error(`Provider datapack ${entry.id} must stay inside the bundle base path`);
        }
        return normalizeProviderDatapack(
          await fetchResource<unknown>({ path: entry.path, sha256: entry.sha256 })
        );
      })
    );
  }
  const snapshot = consistentSnapshot([
    ['Descriptor', descriptor],
    ['Release data-plane index', releaseDataPlane?.document],
    ['Data manifest', manifest],
    ['Overview', overview],
    ['Analysis overview', analysis],
    ['Presentation profile', presentation],
    ['Governed term registry', termRegistry],
    ['Governed term validation', termValidation],
    ['Provider datapack manifest', providerDatapackManifest],
    ...providerDatapackPacks.map(
      (pack) => [`Provider datapack ${pack.id}`, pack] as [string, unknown]
    )
  ]);
  const providerDatapacks: LargeProviderDatapackCollection | undefined =
    providerDatapackManifest
      ? validateProviderDatapackCollection(
          providerDatapackManifest,
          providerDatapackPacks,
          snapshot
        )
      : undefined;
  let effectsReconciliation: LargeEffectsReconciliation | undefined;
  let effectsReconciliationError = '';
  const reconciliationDeclaration =
    descriptor.extensions?.['okf-official-effects.v1']?.reconciliation;
  if (reconciliationDeclaration !== undefined) {
    try {
      const reconciliationReference = bundleResourceReference(
        reconciliationDeclaration,
        baseUrl,
        'Official-effects reconciliation'
      );
      effectsReconciliation = normalizeEffectsReconciliation(
        await fetchResource<unknown>(reconciliationReference)
      );
    } catch (error) {
      effectsReconciliationError = error instanceof Error ? error.message : String(error);
    }
  }
  const historicalV2Declared = Boolean(
    descriptor.entrypoints.model_enrichment_v2 ||
    manifest.indexes?.model_enrichment_v2 ||
    descriptor.entrypoints.model_enrichment_v2_historical ||
    descriptor.entrypoints.model_enrichment_v2_historical_manifest ||
    descriptor.extensions?.['okf-model-enrichment.v2-historical']
  );
  const manifestModelRelationshipsV3 = manifest.indexes?.model_enrichment_v3;
  const v3Extension = descriptor.extensions?.['okf-model-enrichment.v3'];
  const v3ExtensionRecord =
    v3Extension &&
    typeof v3Extension === 'object' &&
    !Array.isArray(v3Extension)
      ? v3Extension as Record<string, unknown>
      : undefined;
  const v3Declared = Boolean(
    descriptor.entrypoints.model_enrichment_v3 ||
    manifestModelRelationshipsV3 ||
    v3Extension
  );
  let descriptorModelRelationshipsV3: LargeResourceReference | undefined;
  let descriptorModelRelationshipsV3AcceptedManifest:
    LargeResourceReference | undefined;
  let descriptorModelRelationshipsV3IndependentAudit:
    LargeResourceReference | undefined;
  let descriptorModelRelationshipsV3Reviewer:
    LargeResourceReference | undefined;
  let modelEnrichmentDeclarationError = '';
  if (v3Declared) {
    try {
      descriptorModelRelationshipsV3 = descriptorEntrypoint(
        descriptor,
        'model_enrichment_v3'
      );
      if (!descriptorModelRelationshipsV3) {
        throw new Error('the descriptor has no model_enrichment_v3 entrypoint');
      }
      if (!resourceHash(descriptorModelRelationshipsV3)) {
        throw new Error('the descriptor model_enrichment_v3 entrypoint has no SHA-256 binding');
      }
      descriptorModelRelationshipsV3AcceptedManifest = descriptorEntrypoint(
        descriptor,
        'model_enrichment_v3_accepted_manifest'
      );
      descriptorModelRelationshipsV3IndependentAudit = descriptorEntrypoint(
        descriptor,
        'model_enrichment_v3_independent_audit'
      );
      descriptorModelRelationshipsV3Reviewer = descriptorEntrypoint(
        descriptor,
        'model_enrichment_v3_reviewer'
      );
      const acceptedDescriptorBinding = boundGovernanceResource(
        descriptorModelRelationshipsV3AcceptedManifest,
        'Governed v3 descriptor accepted-manifest'
      );
      const auditDescriptorBinding = boundGovernanceResource(
        descriptorModelRelationshipsV3IndependentAudit,
        'Governed v3 descriptor independent-audit'
      );
      const reviewerDescriptorBinding = boundGovernanceResource(
        descriptorModelRelationshipsV3Reviewer,
        'Governed v3 descriptor semantic-reviewer'
      );
      if (
        acceptedDescriptorBinding.path !== MODEL_ENRICHMENT_V3_ACCEPTED_MANIFEST_PATH ||
        auditDescriptorBinding.path !== MODEL_ENRICHMENT_V3_AUDIT_PATH ||
        reviewerDescriptorBinding.path !== MODEL_ENRICHMENT_V3_REVIEWER_PATH
      ) {
        throw new Error('the governed v3 descriptor bindings use unsupported paths');
      }
      if (
        manifestModelRelationshipsV3 &&
        resourcePath(descriptorModelRelationshipsV3) !==
          resourcePath(manifestModelRelationshipsV3)
      ) {
        throw new Error('descriptor and data manifest v3 paths differ');
      }
      const descriptorHash = resourceHash(descriptorModelRelationshipsV3);
      const manifestHash = resourceHash(manifestModelRelationshipsV3);
      if (descriptorHash && manifestHash && descriptorHash !== manifestHash) {
        throw new Error('descriptor and data manifest v3 SHA-256 bindings differ');
      }
      if (v3Extension !== undefined && !v3ExtensionRecord) {
        throw new Error('the governed v3 extension is malformed');
      }
      if (
        v3ExtensionRecord &&
        v3ExtensionRecord.entrypoint !== 'model_enrichment_v3'
      ) {
        throw new Error('the governed v3 extension names a different entrypoint');
      }
      if (
        v3ExtensionRecord?.official_legal_classification !== undefined &&
        v3ExtensionRecord.official_legal_classification !== false
      ) {
        throw new Error('the governed v3 extension misclassifies model metadata as official');
      }
      if (
        v3ExtensionRecord &&
        (
          v3ExtensionRecord.accepted_manifest !==
            'model_enrichment_v3_accepted_manifest' ||
          v3ExtensionRecord.independent_audit !==
            'model_enrichment_v3_independent_audit' ||
          v3ExtensionRecord.semantic_reviewer !== 'model_enrichment_v3_reviewer'
        )
      ) {
        throw new Error('the governed v3 extension does not bind its governance entrypoints');
      }
    } catch (error) {
      modelEnrichmentDeclarationError =
        error instanceof Error ? error.message : String(error);
      descriptorModelRelationshipsV3 = undefined;
      descriptorModelRelationshipsV3AcceptedManifest = undefined;
      descriptorModelRelationshipsV3IndependentAudit = undefined;
      descriptorModelRelationshipsV3Reviewer = undefined;
    }
  }
  // A declared v3 plane is authoritative for runtime selection. Do not even
  // interpret an old v2 integrity record when v3 is present: v2 is preserved
  // as historical material, not a second active input or a fallback-on-error.
  const descriptorModelRelationshipsV2 = v3Declared
    ? undefined
    : descriptorEntrypoint(descriptor, 'model_enrichment_v2');
  const manifestModelRelationshipsV2 = v3Declared
    ? undefined
    : manifest.indexes?.model_enrichment_v2;
  if (
    !v3Declared &&
    descriptorModelRelationshipsV2 &&
    manifestModelRelationshipsV2 &&
    resourcePath(descriptorModelRelationshipsV2) !==
      resourcePath(manifestModelRelationshipsV2)
  ) {
    throw new Error('Descriptor and data manifest model-enrichment paths differ');
  }
  const modelRelationshipVersion: ModelEnrichmentVersion | null = v3Declared
    ? 'v3'
    : descriptorModelRelationshipsV2 || manifestModelRelationshipsV2
      ? 'v2'
      : null;
  const modelRelationshipManifestReference =
    modelRelationshipVersion === 'v3'
      ? descriptorModelRelationshipsV3
      : modelRelationshipVersion === 'v2'
        ? descriptorModelRelationshipsV2 || manifestModelRelationshipsV2
        : undefined;
  const modelEnrichment: LargeModelEnrichmentState | undefined =
    modelRelationshipVersion === 'v3'
      ? {
          version: 'v3',
          mode: 'governed-v3',
          status: modelEnrichmentDeclarationError ? 'unavailable' : 'declared',
          label: 'Governed accepted model-assisted enrichment v3',
          message: modelEnrichmentDeclarationError
            ? (
                `Governed model-assisted v3 enrichment is unavailable: ` +
                `${modelEnrichmentDeclarationError}. Explorer will show only official and ` +
                `deterministic relationships; it did not guess a path or substitute historical v2 assertions.`
              )
            : (
                `Accepted topic, concept and entity assertions load for the selected record. ` +
                `They are model-assisted discovery metadata, not official legal effects or classifications.`
              ),
          historicalV2Declared
        }
      : modelRelationshipVersion === 'v2'
        ? {
            version: 'v2',
            mode: 'historical-v2-fallback',
            status: 'declared',
            label: 'Historical model-assisted v2 compatibility fallback',
            message:
              'This older descriptor does not declare v3. Its v2 relationship plane is used alone and is never combined with v3 or counted as official effects.',
            historicalV2Declared: true
          }
        : undefined;
  const searchManifest = descriptorEntrypoint(descriptor, 'search_manifest') || manifest.indexes.search;
  const descriptorRecordLocator = descriptorEntrypoint(descriptor, 'record_locator');
  const manifestRecordLocator = manifest.indexes.record_locator;
  if (
    descriptorRecordLocator &&
    manifestRecordLocator &&
    resourcePath(descriptorRecordLocator) !== resourcePath(manifestRecordLocator)
  ) {
    throw new Error('Descriptor and data manifest record-locator paths differ');
  }
  const recordLocatorReference = descriptorRecordLocator || manifestRecordLocator;
  const descriptorRelationshipRuntime = descriptorEntrypoint(
    descriptor,
    'relationship_runtime'
  );
  const manifestRelationshipRuntime = manifest.indexes.relationship_runtime;
  if (
    descriptorRelationshipRuntime &&
    manifestRelationshipRuntime &&
    resourcePath(descriptorRelationshipRuntime) !== resourcePath(manifestRelationshipRuntime)
  ) {
    throw new Error('Descriptor and data manifest rich relationship runtime paths differ');
  }
  const descriptorRelationshipRuntimeHash = resourceHash(descriptorRelationshipRuntime);
  const manifestRelationshipRuntimeHash = resourceHash(manifestRelationshipRuntime);
  if (
    descriptorRelationshipRuntimeHash &&
    manifestRelationshipRuntimeHash &&
    descriptorRelationshipRuntimeHash !== manifestRelationshipRuntimeHash
  ) {
    throw new Error('Descriptor and data manifest rich relationship runtime SHA-256 values differ');
  }
  const relationshipRuntimeReference = descriptorRelationshipRuntimeHash
    ? descriptorRelationshipRuntime
    : manifestRelationshipRuntimeHash
      ? manifestRelationshipRuntime
      : descriptorRelationshipRuntime || manifestRelationshipRuntime;
  if (relationshipRuntimeReference && !resourceHash(relationshipRuntimeReference)) {
    throw new Error(
      'Advertised rich relationship runtime requires a descriptor or data-manifest SHA-256 binding'
    );
  }
  let facetIndexPromise: Promise<Record<string, LargeFacetRow[]>> | null = null;
  let fullIndexPromise: Promise<LargeFullIndex> | null = null;
  let relationshipsPromise: Promise<LargeRelationshipsResult> | null = null;
  let adjacencyManifestPromise: Promise<LargeRelationshipAdjacencyManifest> | null = null;
  const adjacencyBucketPromises = new Map<string, Promise<Record<string, LargeRelationship[]>>>();
  let richRelationshipRuntimePromise: Promise<LargeRichRelationshipRuntimeManifest> | null = null;
  let richRelationshipLocatorPromise: Promise<LargeRichRelationshipRouteLocator> | null = null;
  const richRelationshipLocatorBucketPromises = new Map<
    string,
    Promise<LargeRichRelationshipRouteLocatorBucket>
  >();
  const richRelationshipChunkPromises = new Map<
    string,
    Promise<RichRelationshipChunkProjection>
  >();
  const richRelationshipChunkRetainedTextUnits = new Map<string, number>();
  let richRelationshipCachedTextUnits = 0;
  let recordLocatorPromise: Promise<LargeRecordLocatorManifest> | null = null;
  const recordLocatorBucketPromises = new Map<string, Promise<Record<string, [number, number]>>>();
  const recordChunkPromises = new Map<number, Promise<LargeDataset[]>>();
  let modelRelationshipManifestPromise: Promise<LargeRelationshipDatapackManifest> | null = null;
  const modelRelationshipChunkPromises = new Map<number, Promise<LargeRelationship[]>>();
  const modelRelationshipIdRegistry: ModelRelationshipIdRegistry = {
    relationshipIds: new Set<string>(),
    acceptanceIds: new Set<string>()
  };
  const modelRelationshipFailedChunks = new Set<number>();
  const modelRelationshipLocatorFailures = new Set<string>();
  let modelRelationshipManifestFailed = false;
  let modelEnrichmentV3ReviewBinding: ModelEnrichmentV3ReviewBinding | undefined;
  const modelEnrichmentAvailableMessage = modelEnrichment?.message || '';

  function markModelEnrichmentReady(): void {
    if (
      !modelEnrichment ||
      modelEnrichmentDeclarationError ||
      modelRelationshipManifestFailed ||
      modelRelationshipFailedChunks.size ||
      modelRelationshipLocatorFailures.size
    ) {
      return;
    }
    modelEnrichment.status = 'ready';
    modelEnrichment.message = modelEnrichmentAvailableMessage;
  }

  function markModelEnrichmentUnavailable(error: unknown): void {
    if (!modelEnrichment) return;
    const detail = error instanceof Error ? error.message : String(error);
    modelEnrichment.status = 'unavailable';
    modelEnrichment.message =
      modelEnrichment.version === 'v3'
        ? (
            `Governed model-assisted v3 enrichment is unavailable: ${detail}. ` +
            `Explorer is showing only official and deterministic relationships; it did not ` +
            `guess a path or substitute historical v2 assertions.`
          )
        : (
            `The historical model-assisted v2 compatibility fallback is unavailable: ${detail}. ` +
            `Official and deterministic relationships remain usable.`
          );
  }

  async function modelRelationshipManifest(
    locator: LargeRecordLocatorManifest
  ): Promise<LargeRelationshipDatapackManifest | null> {
    if (!modelRelationshipManifestReference) return null;
    if (!modelRelationshipManifestPromise) {
      modelRelationshipManifestPromise = fetchResource<unknown>(
        bundleResourceReference(
          modelRelationshipManifestReference,
          baseUrl,
          'Model relationship datapack manifest'
        )
      )
        .then(async (value) => {
          const datapack = normalizeRelationshipDatapackManifest(
            value,
            snapshot,
            modelRelationshipVersion || 'v2'
          );
          if (datapack.chunks.length !== locator.record_chunks.length) {
            throw new Error(
              'Model relationship datapack chunks are not aligned with the record locator'
            );
          }
          if (
            modelRelationshipVersion === 'v3' &&
            v3ExtensionRecord?.accepted_assertions !== undefined &&
            v3ExtensionRecord.accepted_assertions !== datapack.counts?.assertions
          ) {
            throw new Error(
              'Governed v3 extension and accepted datapack assertion counts differ'
            );
          }
          if (
            modelRelationshipVersion === 'v3' &&
            v3ExtensionRecord?.accepted_by_kind !== undefined
          ) {
            const declaredKinds = v3ExtensionRecord.accepted_by_kind;
            const datapackKinds = datapack.counts?.by_kind;
            const kindKeys = Object.keys(MODEL_ENRICHMENT_V3_PREDICATES);
            if (
              !declaredKinds ||
              typeof declaredKinds !== 'object' ||
              Array.isArray(declaredKinds) ||
              !datapackKinds ||
              Object.keys(declaredKinds).sort().join('\0') !==
                [...kindKeys].sort().join('\0') ||
              kindKeys.some(
                (key) =>
                  (declaredKinds as Record<string, unknown>)[key] !==
                  datapackKinds[key as keyof typeof datapackKinds]
              )
            ) {
              throw new Error(
                'Governed v3 extension and accepted datapack relationship-kind counts differ'
              );
            }
          }
          if (modelRelationshipVersion === 'v3') {
            if (
              !descriptorModelRelationshipsV3AcceptedManifest ||
              !descriptorModelRelationshipsV3IndependentAudit ||
              !descriptorModelRelationshipsV3Reviewer
            ) {
              throw new Error(
                'Governed v3 descriptor governance bindings are unavailable'
              );
            }
            const acceptedBinding = requireGovernanceBindingMatch(
              datapack.source_contract,
              descriptorModelRelationshipsV3AcceptedManifest,
              'Governed v3 accepted-manifest',
              MODEL_ENRICHMENT_V3_ACCEPTED_MANIFEST_PATH
            );
            const auditBinding = requireGovernanceBindingMatch(
              datapack.independent_audit,
              descriptorModelRelationshipsV3IndependentAudit,
              'Governed v3 independent-audit',
              MODEL_ENRICHMENT_V3_AUDIT_PATH
            );
            const reviewerBinding = requireGovernanceBindingMatch(
              datapack.semantic_reviewer,
              descriptorModelRelationshipsV3Reviewer,
              'Governed v3 semantic-reviewer',
              MODEL_ENRICHMENT_V3_REVIEWER_PATH
            );
            const [acceptedDocument, auditDocument, reviewerDocument] =
              await Promise.all([
                fetchResource<unknown>(
                  governanceResourceReference(acceptedBinding),
                  true
                ),
                fetchResource<unknown>(
                  governanceResourceReference(auditBinding),
                  true
                ),
                fetchResource<unknown>(
                  governanceResourceReference(reviewerBinding),
                  true
                )
              ]);
            modelEnrichmentV3ReviewBinding =
              validateModelEnrichmentV3Governance(
                datapack,
                acceptedDocument,
                auditDocument,
                reviewerDocument
              );
          }
          modelRelationshipManifestFailed = false;
          if (modelEnrichment) {
            markModelEnrichmentReady();
            const assertions = datapack.counts?.assertions;
            if (typeof assertions === 'number') {
              modelEnrichment.counts = {
                assertions,
                ...(datapack.counts?.by_kind
                  ? { byKind: datapack.counts.by_kind }
                  : {}),
                ...(datapack.counts?.by_support
                  ? { bySupport: datapack.counts.by_support }
                  : {})
              };
            }
          }
          return datapack;
        })
        .catch((error) => {
          modelRelationshipManifestFailed = true;
          modelRelationshipManifestPromise = null;
          throw error;
        });
    }
    return modelRelationshipManifestPromise;
  }

  async function validateModelRelationshipChunkRoutes(
    locator: LargeRecordLocatorManifest,
    rows: LargeRelationship[],
    chunkIndex: number
  ): Promise<void> {
    const aliasesByCanonical = new Map<string, string[]>();
    for (const [alias, canonical] of Object.entries(locator.route_aliases || {})) {
      const aliases = aliasesByCanonical.get(canonical) || [];
      aliases.push(alias);
      aliasesByCanonical.set(canonical, aliases);
    }
    const sourceRoutes = [...new Set(rows.map(({ source }) => source))];
    const batchSize = 64;
    for (let offset = 0; offset < sourceRoutes.length; offset += batchSize) {
      await Promise.all(
        sourceRoutes.slice(offset, offset + batchSize).map(async (sourceRoute) => {
          const candidates = [
            sourceRoute,
            ...(aliasesByCanonical.get(sourceRoute) || [])
          ];
          for (const candidate of candidates) {
            const location = await recordLocation(locator, candidate);
            if (location?.[0] === chunkIndex) return;
          }
          throw new Error(
            `Governed v3 model relationship source ${sourceRoute} is not aligned with accepted shard ${chunkIndex}`
          );
        })
      );
    }
  }

  async function modelRelationshipsForRoute(
    locator: LargeRecordLocatorManifest | null,
    locatorRoute: string,
    relationshipRoute: string
  ): Promise<LargeRelationship[]> {
    if (!modelRelationshipVersion) return [];
    if (!modelRelationshipManifestReference) return [];
    if (!locator) {
      if (locatorRoute.startsWith('dataset/')) {
        modelRelationshipLocatorFailures.add(relationshipRoute);
        markModelEnrichmentUnavailable(
          new Error('no record locator is published for bounded accepted-shard hydration')
        );
      }
      return [];
    }
    let failureScope: 'locator' | 'manifest' | 'chunk' = 'locator';
    let failedChunkIndex: number | undefined;
    try {
      let location = await recordLocation(locator, locatorRoute);
      if (!location && locatorRoute !== relationshipRoute) {
        location = await recordLocation(locator, relationshipRoute);
      }
      if (!location) return [];
      const [chunkIndex] = location;
      failedChunkIndex = chunkIndex;
      failureScope = 'manifest';
      const datapack = await modelRelationshipManifest(locator);
      failureScope = 'chunk';
      const chunk = datapack?.chunks[chunkIndex];
      if (!chunk) {
        throw new Error(`the accepted datapack has no aligned chunk for ${relationshipRoute}`);
      }
      let chunkPromise = modelRelationshipChunkPromises.get(chunkIndex);
      if (!chunkPromise) {
        const reference = bundleResourceReference(
          {
            path: chunk.path,
            sha256: chunk.sha256,
            bytes: chunk.bytes,
            compression: 'gzip'
          },
          baseUrl,
          `Model relationship datapack chunk ${chunkIndex}`
        );
        chunkPromise = fetchResource<unknown>(reference, true)
          .then((value) =>
            normalizeModelRelationshipRows(
              value,
              chunk.records,
              modelRelationshipVersion,
              modelRelationshipVersion === 'v3'
                  ? {
                      registry: modelRelationshipIdRegistry,
                      reviewBinding: modelEnrichmentV3ReviewBinding,
                      validateRows: (rows) =>
                        validateModelRelationshipChunkRoutes(
                          locator,
                          rows,
                          chunkIndex
                        )
                    }
                : {}
            )
          )
          .catch((error) => {
            modelRelationshipFailedChunks.add(chunkIndex);
            modelRelationshipChunkPromises.delete(chunkIndex);
            throw error;
          });
        modelRelationshipChunkPromises.set(chunkIndex, chunkPromise);
      }
      const rows = await chunkPromise;
      modelRelationshipFailedChunks.delete(chunkIndex);
      modelRelationshipLocatorFailures.delete(relationshipRoute);
      markModelEnrichmentReady();
      return rows.filter(
        (row) => row.source === relationshipRoute || row.target === relationshipRoute
      );
    } catch (error) {
      if (failureScope === 'locator') {
        modelRelationshipLocatorFailures.add(relationshipRoute);
      } else if (failureScope === 'chunk' && failedChunkIndex !== undefined) {
        modelRelationshipFailedChunks.add(failedChunkIndex);
      }
      markModelEnrichmentUnavailable(error);
      return [];
    }
  }

  async function richRelationshipRuntime(): Promise<LargeRichRelationshipRuntimeManifest | null> {
    if (!relationshipRuntimeReference) return null;
    if (!richRelationshipRuntimePromise) {
      richRelationshipRuntimePromise = fetchResource<unknown>(relationshipRuntimeReference, true)
        .then((value) => {
          const runtime = normalizeRichRelationshipRuntimeManifest(value);
          if (!snapshot || runtime.snapshot !== snapshot) {
            throw new Error(
              'Rich relationship runtime snapshot differs from the loaded bundle snapshot'
            );
          }
          return runtime;
        })
        .catch((error) => {
          richRelationshipRuntimePromise = null;
          throw error;
        });
    }
    return richRelationshipRuntimePromise;
  }

  function richRelationshipChunksByPath(
    runtime: LargeRichRelationshipRuntimeManifest
  ): Map<string, { chunk: LargeRichRelationshipRuntimeChunk; plane: LargeRichRelationshipRuntimePlane }> {
    return new Map(
      runtime.planes.flatMap((plane) =>
        plane.chunks.map((chunk) => [chunk.path, { chunk, plane }] as const)
      )
    );
  }

  async function richRelationshipLocator(
    runtime: LargeRichRelationshipRuntimeManifest
  ): Promise<LargeRichRelationshipRouteLocator> {
    if (!richRelationshipLocatorPromise) {
      const reference = bundleResourceReference(
        {
          path: runtime.route_locator.path,
          sha256: runtime.route_locator.sha256,
          compression: 'identity'
        },
        baseUrl,
        'Rich relationship route locator manifest'
      );
      richRelationshipLocatorPromise = fetchResource<unknown>(reference, true)
        .then((value) => normalizeRichRelationshipRouteLocator(value, runtime))
        .catch((error) => {
          richRelationshipLocatorPromise = null;
          throw error;
        });
    }
    return richRelationshipLocatorPromise;
  }

  async function richRelationshipChunk(
    chunk: LargeRichRelationshipRuntimeChunk,
    plane: LargeRichRelationshipRuntimePlane
  ): Promise<RichRelationshipChunkProjection> {
    const evict = (path: string) => {
      richRelationshipChunkPromises.delete(path);
      const retained = richRelationshipChunkRetainedTextUnits.get(path) || 0;
      richRelationshipChunkRetainedTextUnits.delete(path);
      richRelationshipCachedTextUnits -= retained;
    };
    let promise = richRelationshipChunkPromises.get(chunk.path);
    if (promise) {
      richRelationshipChunkPromises.delete(chunk.path);
      richRelationshipChunkPromises.set(chunk.path, promise);
    }
    if (!promise) {
      const reference = bundleResourceReference(
        {
          path: chunk.path,
          sha256: chunk.sha256,
          bytes: chunk.bytes,
          compression: 'gzip'
        },
        baseUrl,
        `Rich relationship chunk ${chunk.path}`
      );
      promise = fetchResource<unknown>(reference, true)
        .then((value) => normalizeRichRelationshipRows(value, chunk, plane))
        .then((projection) => {
          if (richRelationshipChunkPromises.get(chunk.path) === promise) {
            richRelationshipChunkRetainedTextUnits.set(
              chunk.path,
              projection.retainedTextUnits
            );
            richRelationshipCachedTextUnits += projection.retainedTextUnits;
            while (
              richRelationshipChunkPromises.size > MAX_RICH_RELATIONSHIP_CACHED_CHUNKS ||
              richRelationshipCachedTextUnits > MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS
            ) {
              const oldest = richRelationshipChunkPromises.keys().next().value;
              if (typeof oldest !== 'string' || oldest === chunk.path) break;
              evict(oldest);
            }
          }
          return projection;
        })
        .catch((error) => {
          if (richRelationshipChunkPromises.get(chunk.path) === promise) evict(chunk.path);
          throw error;
        });
      while (richRelationshipChunkPromises.size >= MAX_RICH_RELATIONSHIP_CACHED_CHUNKS) {
        const oldest = richRelationshipChunkPromises.keys().next().value;
        if (typeof oldest !== 'string') break;
        evict(oldest);
      }
      richRelationshipChunkPromises.set(chunk.path, promise);
    }
    return promise;
  }

  async function loadRichRelationshipRuntime(
    maxRows: number
  ): Promise<LargeRelationshipsResult> {
    if (!Number.isSafeInteger(maxRows) || maxRows < 0 || maxRows > MAX_RELATIONSHIP_ROWS) {
      throw new Error(
        `Rich relationship row limit must be an integer from 0 to ${MAX_RELATIONSHIP_ROWS}`
      );
    }
    const runtime = await richRelationshipRuntime();
    if (!runtime) return { relationships: [], truncated: false };
    const defaultNames = new Set(runtime.default_planes);
    const planes = runtime.planes.filter((plane) => defaultNames.has(plane.name));
    const chunks = planes.flatMap((plane) => plane.chunks.map((chunk) => ({ chunk, plane })));
    const expectedRows = planes.reduce((total, plane) => total + plane.assertions, 0);
    const selectedChunks: typeof chunks = [];
    let selectedDeclaredRows = 0;
    for (const item of chunks) {
      if (selectedDeclaredRows >= maxRows) break;
      selectedChunks.push(item);
      selectedDeclaredRows += item.chunk.count;
    }
    const selectedCompressedBytes = selectedChunks.reduce(
      (total, { chunk }) => total + chunk.bytes,
      0
    );
    if (selectedCompressedBytes > MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES) {
      throw new Error(
        `Rich relationship hydration requires ${selectedCompressedBytes} compressed bytes; ` +
        `it exceeds the ${MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES}-byte aggregate ceiling`
      );
    }
    const relationships: LargeRelationship[] = [];
    const identifiers = new Set<string>();
    let hydrationRetainedTextUnits = 0;
    for (const { chunk, plane } of selectedChunks) {
      const projection = await richRelationshipChunk(chunk, plane);
      hydrationRetainedTextUnits += projection.retainedTextUnits;
      if (hydrationRetainedTextUnits > MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS) {
        throw new Error(
          `Rich relationship hydration exceeds the ` +
          `${MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS}-unit retained-text ceiling`
        );
      }
      for (const row of projection.relationships) {
        if (relationships.length >= maxRows) break;
        const identifier = String(row.id || '');
        if (identifiers.has(identifier)) {
          throw new Error(`Rich relationship assertion identity is duplicated: ${identifier}`);
        }
        identifiers.add(identifier);
        relationships.push(row);
      }
    }
    return { relationships, truncated: relationships.length < expectedRows };
  }

  async function richRelationshipsForRoute(
    route: string
  ): Promise<LargeRelationship[]> {
    const runtime = await richRelationshipRuntime();
    if (!runtime) return [];
    const locator = await richRelationshipLocator(runtime);
    const prefix = (await sha256Hex(route)).slice(0, 2);
    const metadata = locator.buckets.find((row) => row.bucket === prefix);
    if (!metadata) return [];
    let bucketPromise = richRelationshipLocatorBucketPromises.get(prefix);
    if (!bucketPromise) {
      const knownChunks = new Map(
        [...richRelationshipChunksByPath(runtime)].map(([path, { plane }]) => [path, plane.name])
      );
      const reference = bundleResourceReference(
        {
          path: metadata.path,
          sha256: metadata.sha256,
          bytes: metadata.bytes,
          compression: 'gzip'
        },
        baseUrl,
        `Rich relationship route bucket ${prefix}`
      );
      bucketPromise = fetchResource<unknown>(reference, true)
        .then((value) =>
          normalizeRichRelationshipRouteLocatorBucket(
            value,
            prefix,
            metadata.routes,
            metadata.chunk_references,
            knownChunks
          )
        )
        .catch((error) => {
          richRelationshipLocatorBucketPromises.delete(prefix);
          throw error;
        });
      richRelationshipLocatorBucketPromises.set(prefix, bucketPromise);
    }
    const bucket = await bucketPromise;
    const located = bucket.routes.find((row) => row.route === route);
    if (!located) return [];

    const chunkIndex = richRelationshipChunksByPath(runtime);
    const activeNames = new Set(runtime.default_planes);
    const selected = located.chunks
      .map((path) => chunkIndex.get(path)!)
      .filter(({ plane }) => activeNames.has(plane.name));
    const selectedRows = selected.reduce((total, { chunk }) => total + chunk.count, 0);
    const activeCommitments = located.planes.filter((plane) => activeNames.has(plane.name));
    const expectedIncidentRows = activeCommitments.reduce(
      (total, plane) => total + plane.assertions,
      0
    );
    const selectedCompressedBytes = selected.reduce(
      (total, { chunk }) => total + chunk.bytes,
      0
    );
    if (
      selected.length > MAX_RICH_RELATIONSHIP_ROUTE_CHUNKS ||
      selectedRows > MAX_RICH_RELATIONSHIP_ROUTE_ROWS ||
      expectedIncidentRows > MAX_RICH_RELATIONSHIP_ROUTE_ROWS ||
      selectedCompressedBytes > MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES
    ) {
      throw new Error(
        `Rich relationship route ${route} requires ${selected.length} active chunks, ` +
        `${selectedRows} declared shard rows, ${expectedIncidentRows} incident assertions and ` +
        `${selectedCompressedBytes} compressed bytes; ` +
        `it exceeds the bounded browser hydration ceiling ` +
        `(${MAX_RICH_RELATIONSHIP_ROUTE_CHUNKS} chunks and ` +
        `${MAX_RICH_RELATIONSHIP_ROUTE_ROWS} rows or ` +
        `${MAX_RICH_RELATIONSHIP_HYDRATION_COMPRESSED_BYTES} compressed bytes). ` +
        `The semantic graph remains available ` +
        `through its digest-bound shards; use a narrower record route or an offline query ` +
        `for this high-degree hub.`
      );
    }
    const relationships: LargeRelationship[] = [];
    let hydrationRetainedTextUnits = 0;
    for (const { chunk, plane } of selected) {
      const projection = await richRelationshipChunk(chunk, plane);
      hydrationRetainedTextUnits += projection.retainedTextUnits;
      if (hydrationRetainedTextUnits > MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS) {
        throw new Error(
          `Rich relationship route ${route} exceeds the ` +
          `${MAX_RICH_RELATIONSHIP_RETAINED_TEXT_UNITS}-unit retained-text ceiling`
        );
      }
      relationships.push(
        ...projection.relationships.filter((row) => row.source === route || row.target === route)
      );
    }
    if (selected.length && !relationships.length) {
      throw new Error(`Rich relationship route locator resolved ${route} to unrelated chunks`);
    }
    const identifiers = new Set<string>();
    for (const relationship of relationships) {
      const identifier = String(relationship.id || '');
      if (identifiers.has(identifier)) {
        throw new Error(`Rich relationship assertion identity is duplicated: ${identifier}`);
      }
      identifiers.add(identifier);
    }
    const planesByName = new Map(runtime.planes.map((plane) => [plane.name, plane]));
    for (const commitment of activeCommitments) {
      const plane = planesByName.get(commitment.name)!;
      const assertionIds = relationships
        .filter((row) => row.plane === plane.id)
        .map((row) => String(row.id || ''))
        .sort();
      if (
        assertionIds.length !== commitment.assertions ||
        await sha256Hex(JSON.stringify(assertionIds)) !== commitment.assertion_ids_sha256
      ) {
        throw new Error(
          `Rich relationship route ${route} does not match its ${commitment.name} assertion commitment`
        );
      }
    }
    if (relationships.length !== expectedIncidentRows) {
      throw new Error(`Rich relationship route ${route} incident assertion totals do not reconcile`);
    }
    return relationships;
  }

  async function recordLocator(): Promise<LargeRecordLocatorManifest | null> {
    if (!recordLocatorReference) return null;
    if (!recordLocatorPromise) {
      recordLocatorPromise = fetchResource<LargeRecordLocatorManifest>(recordLocatorReference)
        .then((locator) => {
          if (
            !locator ||
            locator.schema !== 'okf-record-locator-sharded.v1' ||
            locator.algorithm !== 'fnv1a32-prefix-2'
          ) {
            throw new Error('Record locator uses an unsupported schema or algorithm');
          }
          const locatorSnapshot = declaredSnapshot(locator, 'Record locator manifest');
          if (locatorSnapshot && (!snapshot || locatorSnapshot !== snapshot)) {
            throw new Error('Record locator manifest snapshot differs from the loaded bundle snapshot');
          }
          if (
            !Number.isSafeInteger(locator.records) ||
            locator.records < 0 ||
            !Number.isSafeInteger(locator.chunk_size) ||
            locator.chunk_size < 1 ||
            locator.chunk_size > 100_000 ||
            !Array.isArray(locator.record_chunks) ||
            locator.record_chunks.length !== Math.ceil(locator.records / locator.chunk_size) ||
            !locator.buckets ||
            typeof locator.buckets !== 'object' ||
            Array.isArray(locator.buckets) ||
            Object.entries(locator.buckets).some(
              ([bucket, reference]) => !/^[0-9a-f]{2}$/.test(bucket) || !resourcePath(reference)
            ) ||
            (
              locator.route_aliases !== undefined &&
              (
                !locator.route_aliases ||
                typeof locator.route_aliases !== 'object' ||
                Array.isArray(locator.route_aliases) ||
                Object.entries(locator.route_aliases).some(
                  ([alias, canonical]) =>
                    !/^[a-z][a-z0-9-]*\/[^\s?#]+$/.test(alias) ||
                    typeof canonical !== 'string' ||
                    !/^[a-z][a-z0-9-]*\/[^\s?#]+$/.test(canonical) ||
                    alias === canonical
                )
              )
            )
          ) {
            throw new Error('Record locator manifest is malformed');
          }
          if (locator.bucket_count !== undefined && locator.bucket_count !== Object.keys(locator.buckets).length) {
            throw new Error('Record locator bucket count is inconsistent');
          }
          return locator;
        })
        .catch((error) => {
          recordLocatorPromise = null;
          throw error;
        });
    }
    return recordLocatorPromise;
  }

  async function recordLocation(
    locator: LargeRecordLocatorManifest,
    route: string,
    ordinal?: number
  ): Promise<[number, number] | null> {
    const bucket = relationshipBucket(route);
    const bucketReference = locator.buckets[bucket];
    if (bucketReference) {
      let bucketPromise = recordLocatorBucketPromises.get(bucket);
      if (!bucketPromise) {
        bucketPromise = fetchResource<Record<string, [number, number]>>(bucketReference, true);
        recordLocatorBucketPromises.set(bucket, bucketPromise);
      }
      const location = (await bucketPromise)[route];
      if (location !== undefined) {
        if (
          !Array.isArray(location) ||
          location.length !== 2 ||
          !Number.isSafeInteger(location[0]) ||
          location[0] < 0 ||
          !Number.isSafeInteger(location[1]) ||
          location[1] < 0
        ) {
          throw new Error(`Record locator bucket contains an invalid location for ${route}`);
        }
        return location;
      }
    }
    if (ordinal === undefined || !Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= locator.records) {
      return null;
    }
    return [Math.floor(ordinal / locator.chunk_size), ordinal % locator.chunk_size];
  }

  const source: LargeCorpusSource = {
    kind: 'large',
    url,
    baseUrl,
    snapshot,
    descriptor,
    manifest,
    overview,
    analysis,
    presentation,
    termRegistry,
    termValidation,
    providerDatapacks,
    effectsReconciliation,
    effectsReconciliationError: effectsReconciliationError || undefined,
    modelEnrichment,
    modelEnrichmentSnapshot() {
      if (!modelEnrichment) return undefined;
      return {
        ...modelEnrichment,
        ...(modelEnrichment.counts
          ? {
              counts: {
                ...modelEnrichment.counts,
                ...(modelEnrichment.counts.byKind
                  ? { byKind: { ...modelEnrichment.counts.byKind } }
                  : {}),
                ...(modelEnrichment.counts.bySupport
                  ? { bySupport: { ...modelEnrichment.counts.bySupport } }
                  : {})
              }
            }
          : {})
      };
    },
    releaseDataPlane: releaseDataPlane?.document,
    searchManifest,
    loadFacetIndex() {
      if (!facetIndexPromise) {
        facetIndexPromise = manifest.indexes.facets
          ? fetchResource<unknown>(manifest.indexes.facets)
              .then(normalizeFacetIndex)
              .catch((error) => {
                facetIndexPromise = null;
                throw error;
              })
          : Promise.resolve({});
      }
      return facetIndexPromise;
    },
    async loadDatasetForRoute(route: string, ordinal?: number) {
      const locator = await recordLocator();
      if (!locator) return null;
      const canonicalRoute = locator.route_aliases?.[route] || route;
      let location = await recordLocation(locator, route);
      if (!location && canonicalRoute !== route) {
        location = await recordLocation(locator, canonicalRoute);
      }
      if (!location && ordinal !== undefined) {
        location = await recordLocation(locator, route, ordinal);
      }
      if (!location) return null;
      const [chunkIndex, rowIndex] = location;
      const recordReference = locator.record_chunks[chunkIndex];
      if (!recordReference || !Number.isSafeInteger(rowIndex) || rowIndex < 0 || rowIndex >= locator.chunk_size) {
        throw new Error(`Record locator returned an invalid location for ${route}`);
      }
      let chunkPromise = recordChunkPromises.get(chunkIndex);
      if (!chunkPromise) {
        chunkPromise = fetchResource<LargeDataset[]>(
          integrityReference(recordReference, manifest.shards?.datasets || manifest.shards?.records, 'Dataset shard'),
          true
        );
        recordChunkPromises.set(chunkIndex, chunkPromise);
      }
      const record = (await chunkPromise)[rowIndex];
      const observedRoute = record?.route || (record?.name ? `dataset/${record.name}` : '');
      if (!record || observedRoute !== canonicalRoute) {
        throw new Error(`Record locator resolved ${route} to a different record`);
      }
      return record;
    },
    loadFullIndex() {
      if (!fullIndexPromise) {
        const request = (async () => {
          const operationalPath = descriptorEntrypoint(descriptor, 'operational_metadata') || manifest.indexes.operational_metadata;
          const [rawDatasets, resources, publishers, facets, graph, govukContent, operationalMetadata] = await Promise.all([
            loadChunks<LargeDataset>(fetchResource, manifest.chunks?.datasets || manifest.chunks?.records || (manifest as Record<string, unknown>).record_shards as string[] || [], manifest.shards?.datasets || manifest.shards?.records, 'Dataset shard'),
            loadChunks<LargeResource>(fetchResource, manifest.chunks?.resources || [], manifest.shards?.resources, 'Resource shard'),
            loadChunks<LargePublisher>(fetchResource, manifest.chunks?.publishers || [], manifest.shards?.publishers, 'Publisher shard'),
            source.loadFacetIndex(),
            manifest.indexes.graph ? fetchResource<LargeGraphIndex>(manifest.indexes.graph) : {},
            manifest.indexes.govuk_content ? fetchResource<LargeGovukContent>(manifest.indexes.govuk_content) : {},
            operationalPath
              ? fetchResource<LargeOperationalMetadataIndex>(operationalPath)
              : { schema: 'okf-operational-metadata.v1', records: {} }
          ]);
          const datasets = mergeOperationalMetadata(rawDatasets, operationalMetadata);
          return {
            datasets,
            resources,
            publishers,
            facets,
            graph,
            govukContent,
            operationalMetadata,
            datasetByName: new Map(datasets.map((dataset) => [dataset.name, dataset])),
            datasetByRoute: new Map(
              datasets.map((dataset) => [dataset.route || `dataset/${dataset.name}`, dataset])
            ),
            resourceById: new Map(resources.map((resource) => [resource.id, resource])),
            publisherByName: new Map(publishers.map((publisher) => [publisher.name, publisher])),
            resourcesByDataset: indexResourcesByDataset(resources)
          };
        })();
        fullIndexPromise = request.catch((error) => {
          fullIndexPromise = null;
          throw error;
        });
      }
      return fullIndexPromise;
    },
    loadRelationships(maxRows: number = MAX_RELATIONSHIP_ROWS) {
      if (!Number.isSafeInteger(maxRows) || maxRows < 0 || maxRows > MAX_RELATIONSHIP_ROWS) {
        return Promise.reject(
          new Error(`Relationship row limit must be an integer from 0 to ${MAX_RELATIONSHIP_ROWS}`)
        );
      }
      if (!relationshipsPromise) {
        relationshipsPromise = relationshipRuntimeReference
          ? loadRichRelationshipRuntime(maxRows)
          : loadRelationshipChunks(
              fetchResource,
              manifest.chunks.relationships || [],
              manifest.shards?.relationships,
              maxRows
            );
      }
      return relationshipsPromise;
    },
    async loadRelationshipsForRoute(route: string) {
      const locator = await recordLocator();
      const relationshipRoute = locator?.route_aliases?.[route] || route;
      if (relationshipRuntimeReference) {
        return richRelationshipsForRoute(relationshipRoute);
      }
      const adjacencyPath = descriptorEntrypoint(descriptor, 'relationship_adjacency') || manifest.indexes.relationship_adjacency;
      let baseRelationships: LargeRelationship[];
      if (!adjacencyPath) {
        const result = await source.loadRelationships();
        baseRelationships = result.relationships.filter(
          (relationship) =>
            relationship.source === relationshipRoute ||
            relationship.target === relationshipRoute
        );
      } else {
        if (!adjacencyManifestPromise) {
          adjacencyManifestPromise = fetchResource<LargeRelationshipAdjacencyManifest>(adjacencyPath);
        }
        const adjacency = await adjacencyManifestPromise;
        if (adjacency.algorithm !== 'fnv1a32-prefix-2') {
          throw new Error(`Unsupported relationship adjacency algorithm: ${adjacency.algorithm}`);
        }
        const adjacencySnapshot = declaredSnapshot(adjacency, 'Relationship adjacency manifest');
        if (adjacencySnapshot && (!snapshot || adjacencySnapshot !== snapshot)) {
          throw new Error('Relationship adjacency manifest snapshot differs from the loaded bundle snapshot');
        }
        const bucket = relationshipBucket(relationshipRoute);
        const bucketPath = adjacency.buckets[bucket];
        if (!bucketPath) {
          baseRelationships = [];
        } else {
          const bucketReference = integrityReference(bucketPath, adjacency.shards, 'Relationship adjacency shard');
          let bucketPromise = adjacencyBucketPromises.get(bucket);
          if (!bucketPromise) {
            bucketPromise = fetchResource<Record<string, LargeRelationship[]>>(bucketReference, true);
            adjacencyBucketPromises.set(bucket, bucketPromise);
          }
          const rows = await bucketPromise;
          baseRelationships = rows[relationshipRoute] || [];
        }
      }
      const modelRelationships = await modelRelationshipsForRoute(
        locator,
        route,
        relationshipRoute
      );
      return mergeRelationships(baseRelationships, modelRelationships);
    }
  };
  return source;
}
