import type {
  FederationRelationshipSummary,
  RelationshipAssertionScope,
  RelationshipAssertionStatus,
  RelationshipAuthorityClass
} from '$lib/types';

export type RelationshipPresentation = {
  id: string;
  predicate: string;
  inverseLabel: string;
  sourceIri: string;
  targetIri: string;
  assertionStatus: RelationshipAssertionStatus | 'unclassified';
  assertionScope: RelationshipAssertionScope | 'unclassified';
  authorityClass: RelationshipAuthorityClass;
  authorityLabel: string;
  authoritySource: string;
  derivation: string;
  derivationActivity: string;
  rule: string;
  supportingAssertions: string[];
  confidence: string;
  observedAt: string;
  staleAfter: string;
  freshness: 'current' | 'stale' | 'unknown';
  evidenceUrls: string[];
  evidenceItems: RelationshipEvidencePresentation[];
  supportProfile: '' | 'title-only' | 'notes-only' | 'multi-field';
  reviewStatus: string;
  officialLegalClassification?: boolean;
  rights: string;
  rightsSource: string;
  rightsAssertion: string;
};

export type RelationshipEvidencePresentation = {
  url: string;
  type: string;
  sourceField: string;
  sourceArtifact: string;
  sourceSha256: string;
  fieldProvenance: string;
  sourceValue: string;
  sourceValueSha256: string;
  sourceValueHashCanonicalization: string;
  normalization: string;
  value: string;
  literalSha256: string;
  ruleId: string;
  rationale: string;
  locator: string;
  retrievedAt: string;
};

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

function normalizedAuthority(value: string): RelationshipAuthorityClass {
  const normalized = value.toLowerCase().replace(/[_\s]+/g, '-');
  if (['official', 'authoritative', 'source-native', 'official-source'].includes(normalized)) {
    return 'official';
  }
  if (['model', 'model-assisted', 'machine-assisted', 'llm-assisted'].includes(normalized)) {
    return 'model-assisted';
  }
  if (['synthetic', 'synthetic-fixture', 'fixture'].includes(normalized)) {
    return 'synthetic';
  }
  if (['derived', 'derived-non-official', 'deterministic', 'computed', 'inferred'].includes(normalized)) {
    return 'derived';
  }
  return 'unclassified';
}

function evidenceUrl(value: unknown): string {
  const candidate = stringValue(recordValue(value)?.url || recordValue(value)?.resource || recordValue(value)?.['@id'] || value);
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.toString()
      : '';
  } catch {
    return '';
  }
}

function evidencePresentation(value: unknown): RelationshipEvidencePresentation {
  const record = recordValue(value);
  return {
    url: evidenceUrl(value),
    type: stringValue(record?.type),
    sourceField: stringValue(record?.source_field || record?.sourceField),
    sourceArtifact: stringValue(record?.source_artifact || record?.sourceArtifact),
    sourceSha256: stringValue(record?.source_sha256 || record?.sourceSha256 || record?.sha256),
    fieldProvenance: stringValue(record?.field_provenance || record?.fieldProvenance),
    sourceValue:
      typeof (record?.source_value ?? record?.sourceValue) === 'string'
        ? String(record?.source_value ?? record?.sourceValue)
        : '',
    sourceValueSha256: stringValue(record?.source_value_sha256 || record?.sourceValueSha256),
    sourceValueHashCanonicalization: stringValue(
      record?.source_value_hash_canonicalization ||
      record?.sourceValueHashCanonicalization
    ),
    normalization: stringValue(record?.normalization),
    value: typeof record?.value === 'string' ? record.value : '',
    literalSha256: stringValue(record?.literal_sha256 || record?.literalSha256),
    ruleId: stringValue(record?.rule_id || record?.ruleId),
    rationale: typeof record?.rationale === 'string' ? record.rationale : '',
    locator: stringValue(record?.locator || record?.source_locator || record?.sourceLocator),
    retrievedAt: stringValue(record?.retrieved_at || record?.retrievedAt)
  };
}

export function relationshipAuthorityClass(
  relationship: Record<string, unknown> | undefined
): RelationshipAuthorityClass {
  if (!relationship) return 'unclassified';
  if (
    stringValue(relationship.assertion_scope || relationship.assertionScope) ===
    'synthetic-fixture'
  ) return 'synthetic';
  const authority = recordValue(relationship.authority);
  const declared = stringValue(
    authority?.class ||
    relationship.authorityClass ||
    relationship.authority_class ||
    relationship.authority
  );
  const fromAuthority = normalizedAuthority(declared);
  if (fromAuthority !== 'unclassified') return fromAuthority;
  const derivation = normalizedAuthority(stringValue(relationship.derivation));
  if (derivation !== 'unclassified') return derivation;
  return relationship.model || relationship.prompt || relationship.model_run
    ? 'model-assisted'
    : 'unclassified';
}

export function relationshipFreshness(
  relationship: Record<string, unknown> | undefined,
  now = new Date()
): 'current' | 'stale' | 'unknown' {
  if (!relationship) return 'unknown';
  const declared = stringValue(relationship.freshness || relationship.freshness_state).toLowerCase();
  if (declared === 'current' || declared === 'stale' || declared === 'unknown') return declared;
  const staleAfter = stringValue(relationship.stale_after || relationship.staleAfter);
  if (!staleAfter) return 'unknown';
  const boundary = Date.parse(staleAfter);
  return Number.isFinite(boundary) ? (boundary < now.getTime() ? 'stale' : 'current') : 'unknown';
}

export function relationshipPresentation(
  relationship: Record<string, unknown> | undefined,
  now = new Date()
): RelationshipPresentation {
  const authority = recordValue(relationship?.authority);
  const rights = recordValue(relationship?.rights);
  const rightsSource = stringValue(
    rights?.source ||
    rights?.url ||
    relationship?.rightsSource ||
    relationship?.rights
  );
  const rightsAssertion = stringValue(
    rights?.assertion || relationship?.rightsAssertion
  );
  const authorityClass = relationshipAuthorityClass(relationship);
  const evidence = Array.isArray(relationship?.evidence)
    ? relationship.evidence
    : Array.isArray(relationship?.evidenceItems)
      ? relationship.evidenceItems
    : Array.isArray(relationship?.evidenceUrls)
      ? relationship.evidenceUrls
      : [];
  const evidenceItems = evidence.map(evidencePresentation);
  const supportProfile = stringValue(
    relationship?.support_profile || relationship?.supportProfile
  );
  const supportingAssertions =
    relationship?.supporting_assertions || relationship?.supportingAssertions;
  return {
    id: stringValue(relationship?.id || relationship?.['@id']),
    predicate: stringValue(
      relationship?.predicate || relationship?.kind || relationship?.type || relationship?.label
    ),
    inverseLabel: stringValue(relationship?.inverse_label || relationship?.inverseLabel),
    sourceIri: stringValue(relationship?.source_iri || relationship?.sourceIri),
    targetIri: stringValue(relationship?.target_iri || relationship?.targetIri),
    assertionStatus: (() => {
      const value = stringValue(
        relationship?.assertion_status || relationship?.assertionStatus
      );
      return value === 'official' || value === 'normalized' || value === 'inferred' || value === 'model-derived'
        ? value
        : 'unclassified';
    })(),
    assertionScope: (() => {
      const value = stringValue(
        relationship?.assertion_scope || relationship?.assertionScope
      );
      return value === 'real-world' || value === 'synthetic-fixture'
        ? value
        : 'unclassified';
    })(),
    authorityClass,
    authorityLabel: stringValue(authority?.label || relationship?.authorityLabel) || {
      official: 'Official source',
      derived: 'Deterministically derived',
      'model-assisted': 'Model-assisted candidate',
      synthetic: 'Synthetic assurance fixture',
      unclassified: 'Authority not declared'
    }[authorityClass],
    authoritySource: stringValue(authority?.source || relationship?.authoritySource),
    derivation: stringValue(relationship?.derivation),
    derivationActivity: stringValue(
      relationship?.derivation_activity || relationship?.derivationActivity
    ),
    rule: stringValue(relationship?.rule || relationship?.rule_id || relationship?.ruleId),
    supportingAssertions: Array.isArray(supportingAssertions)
      ? supportingAssertions.map(stringValue).filter(Boolean)
      : [],
    confidence: stringValue(
      relationship?.confidence_score ?? relationship?.confidenceScore ?? relationship?.confidence
    ),
    observedAt: stringValue(relationship?.observed_at || relationship?.observedAt),
    staleAfter: stringValue(relationship?.stale_after || relationship?.staleAfter),
    freshness: relationshipFreshness(relationship, now),
    evidenceUrls: [...new Set(evidenceItems.map(({ url }) => url).filter(Boolean))],
    evidenceItems,
    supportProfile:
      supportProfile === 'title-only' ||
      supportProfile === 'notes-only' ||
      supportProfile === 'multi-field'
        ? supportProfile
        : '',
    reviewStatus: stringValue(
      relationship?.review_status || relationship?.reviewStatus
    ),
    ...(typeof (
      relationship?.official_legal_classification ??
      relationship?.officialLegalClassification
    ) === 'boolean'
      ? {
          officialLegalClassification: (
            relationship?.official_legal_classification ??
            relationship?.officialLegalClassification
          ) as boolean
        }
      : {}),
    rights: rightsSource,
    rightsSource,
    rightsAssertion
  };
}

export function summarizeRelationships(
  relationships: Array<Record<string, unknown>>,
  scope: FederationRelationshipSummary['scope'] = 'federation-control-plane',
  now = new Date()
): FederationRelationshipSummary {
  const byPredicate: Record<string, number> = {};
  const byAuthority: FederationRelationshipSummary['by_authority'] = {
    official: 0,
    derived: 0,
    'model-assisted': 0,
    synthetic: 0,
    unclassified: 0
  };
  const byFreshness: FederationRelationshipSummary['by_freshness'] = {
    current: 0,
    stale: 0,
    unknown: 0
  };
  for (const relationship of relationships) {
    const predicate = stringValue(
      relationship.predicate || relationship.kind || relationship.type || relationship.label
    ) || 'related';
    byPredicate[predicate] = (byPredicate[predicate] || 0) + 1;
    const presentation = relationshipPresentation(relationship, now);
    byAuthority[presentation.authorityClass] = (byAuthority[presentation.authorityClass] || 0) + 1;
    byFreshness[presentation.freshness] += 1;
  }
  return {
    scope,
    total: relationships.length,
    by_predicate: byPredicate,
    by_authority: byAuthority,
    by_freshness: byFreshness
  };
}
