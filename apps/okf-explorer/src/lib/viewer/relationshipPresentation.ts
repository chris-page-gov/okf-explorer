import type {
  FederationRelationshipSummary,
  RelationshipAuthorityClass
} from '$lib/types';

export type RelationshipPresentation = {
  authorityClass: RelationshipAuthorityClass;
  authorityLabel: string;
  authoritySource: string;
  derivation: string;
  confidence: string;
  observedAt: string;
  staleAfter: string;
  freshness: 'current' | 'stale' | 'unknown';
  evidenceUrls: string[];
  rights: string;
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

export function relationshipAuthorityClass(
  relationship: Record<string, unknown> | undefined
): RelationshipAuthorityClass {
  if (!relationship) return 'unclassified';
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
  const authorityClass = relationshipAuthorityClass(relationship);
  const evidence = Array.isArray(relationship?.evidence)
    ? relationship.evidence
    : Array.isArray(relationship?.evidenceUrls)
      ? relationship.evidenceUrls
      : [];
  return {
    authorityClass,
    authorityLabel: stringValue(authority?.label || relationship?.authorityLabel) || {
      official: 'Official source',
      derived: 'Deterministically derived',
      'model-assisted': 'Model-assisted candidate',
      unclassified: 'Authority not declared'
    }[authorityClass],
    authoritySource: stringValue(authority?.source || relationship?.authoritySource),
    derivation: stringValue(relationship?.derivation),
    confidence: stringValue(relationship?.confidence),
    observedAt: stringValue(relationship?.observed_at || relationship?.observedAt),
    staleAfter: stringValue(relationship?.stale_after || relationship?.staleAfter),
    freshness: relationshipFreshness(relationship, now),
    evidenceUrls: [...new Set(evidence.map(evidenceUrl).filter(Boolean))],
    rights: stringValue(recordValue(relationship?.rights)?.url || relationship?.rights)
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
