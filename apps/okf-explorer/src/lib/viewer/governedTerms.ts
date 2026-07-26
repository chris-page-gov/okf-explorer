import type {
  GovernedTerm,
  GovernedTermRegistry,
  GovernedTermValidation,
  GovernedVocabulary,
  LargeCorpusDescriptor,
  LargeDataset,
  SearchResultDoc
} from '$lib/types';

type JsonObject = Record<string, unknown>;

const MAX_VOCABULARIES = 500;
const MAX_TERMS = 10_000;
const MAX_USAGE_ROWS = 2_000;
const TERM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*:[A-Za-z][A-Za-z0-9._-]*$/;
const HELP_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9:._-]*$/;
const TERM_STATUSES = new Set(['validated', 'pending', 'rejected', 'deprecated']);
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function objectValue(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : stringValue(value, label);
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function dateTimeValue(value: unknown, label: string): string {
  const result = stringValue(value, label);
  const date = result.slice(0, 10);
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (
    !DATE_TIME_PATTERN.test(result) ||
    Number.isNaN(new Date(result).valueOf()) ||
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${label} must be an RFC 3339 date-time`);
  }
  return result;
}

function boundedArray(value: unknown, label: string, maximum: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maximum) throw new Error(`${label} exceeds the ${maximum}-item limit`);
  return value;
}

function absoluteIri(value: unknown, label: string): string {
  const result = stringValue(value, label);
  let parsed: URL;
  try {
    parsed = new URL(result);
  } catch {
    throw new Error(`${label} must be an absolute IRI`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error(`${label} must use HTTP(S) without credentials`);
  }
  return result;
}

function sourceReference(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (result.startsWith('/')) return result;
  return absoluteIri(result, label);
}

function normalizeVocabulary(value: unknown, index: number): GovernedVocabulary {
  const record = objectValue(value, `Vocabulary ${index + 1}`);
  return {
    id: stringValue(record.id, `Vocabulary ${index + 1} id`),
    title: stringValue(record.title, `Vocabulary ${index + 1} title`),
    namespace: absoluteIri(record.namespace, `Vocabulary ${index + 1} namespace`),
    prefix: stringValue(record.prefix, `Vocabulary ${index + 1} prefix`),
    source: sourceReference(record.source, `Vocabulary ${index + 1} source`),
    version: optionalString(record.version, `Vocabulary ${index + 1} version`)
  };
}

function normalizeTerm(
  value: unknown,
  index: number,
  vocabularies: Map<string, GovernedVocabulary>
): GovernedTerm {
  const label = `Term ${index + 1}`;
  const record = objectValue(value, label);
  const id = stringValue(record.id, `${label} id`);
  if (!TERM_ID_PATTERN.test(id)) throw new Error(`${label} id is not a compact term identifier`);
  const vocabularyId = stringValue(record.vocabulary, `${label} vocabulary`);
  const vocabulary = vocabularies.get(vocabularyId);
  if (!vocabulary) throw new Error(`${label} names unknown vocabulary ${vocabularyId}`);
  const prefix = id.slice(0, id.indexOf(':'));
  if (prefix !== vocabulary.prefix) {
    throw new Error(`${label} prefix ${prefix} does not match vocabulary ${vocabularyId}`);
  }
  const iri = absoluteIri(record.iri, `${label} IRI`);
  const expectedIri = `${vocabulary.namespace}${id.slice(id.indexOf(':') + 1)}`;
  if (iri !== expectedIri) {
    throw new Error(`${label} IRI does not expand from its registered namespace`);
  }
  const status = stringValue(record.status, `${label} status`);
  if (!TERM_STATUSES.has(status)) throw new Error(`${label} has unsupported status ${status}`);
  const kind = stringValue(record.kind, `${label} kind`);
  const sourceLocator = optionalString(record.sourceLocator, `${label} source locator`);
  if (kind === 'specification-object' && sourceLocator !== id.slice(id.indexOf(':') + 1)) {
    throw new Error(`${label} specification locator must match its compact local name`);
  }
  const provenance = objectValue(record.provenance, `${label} provenance`);
  const provenanceVocabulary = stringValue(
    provenance.vocabulary,
    `${label} provenance vocabulary`
  );
  if (provenanceVocabulary !== vocabularyId) {
    throw new Error(`${label} provenance names a different vocabulary`);
  }
  const provenanceResource = sourceReference(
    provenance.resource,
    `${label} provenance resource`
  );
  if (provenanceResource !== vocabulary.source) {
    throw new Error(`${label} provenance resource differs from its vocabulary source`);
  }
  const validation = objectValue(record.validation, `${label} validation`);
  const validationStatuses = {
    recognition: stringValue(validation.recognition, `${label} recognition validation`),
    meaning: stringValue(validation.meaning, `${label} meaning validation`),
    application: stringValue(validation.application, `${label} application validation`)
  };
  for (const [dimension, dimensionStatus] of Object.entries(validationStatuses)) {
    if (!TERM_STATUSES.has(dimensionStatus)) {
      throw new Error(`${label} has unsupported ${dimension} validation ${dimensionStatus}`);
    }
  }
  if (
    status === 'validated' &&
    Object.values(validationStatuses).some((dimensionStatus) => dimensionStatus !== 'validated')
  ) {
    throw new Error(`${label} is validated but one or more validation dimensions are not`);
  }
  const usage = record.usage === undefined
    ? []
    : boundedArray(record.usage, `${label} usage`, MAX_USAGE_ROWS).map((row, usageIndex) => {
        const usageRecord = objectValue(row, `${label} usage ${usageIndex + 1}`);
        const samplePaths = usageRecord.samplePaths === undefined
          ? undefined
          : boundedArray(usageRecord.samplePaths, `${label} usage sample paths`, 100).map(
              (path, pathIndex) =>
                stringValue(path, `${label} usage ${usageIndex + 1} sample path ${pathIndex + 1}`)
            );
        return {
          artifact: stringValue(usageRecord.artifact, `${label} usage ${usageIndex + 1} artifact`),
          occurrences: nonNegativeInteger(
            usageRecord.occurrences,
            `${label} usage ${usageIndex + 1} occurrences`
          ),
          samplePaths
        };
      });
  const helpKey = optionalString(record.helpKey, `${label} help key`);
  if (helpKey && !HELP_KEY_PATTERN.test(helpKey)) {
    throw new Error(`${label} help key has an unsupported format`);
  }
  return {
    id,
    label: stringValue(record.label, `${label} label`),
    iri,
    kind,
    definition: stringValue(record.definition, `${label} definition`),
    application: stringValue(record.application, `${label} bounded application`),
    vocabulary: vocabularyId,
    status,
    sourceLocator,
    helpKey,
    provenance: {
      vocabulary: provenanceVocabulary,
      resource: provenanceResource,
      version: optionalString(provenance.version, `${label} provenance version`)
    },
    validation: {
      ...validationStatuses,
      method: stringValue(validation.method, `${label} validation method`),
      checkedBy: stringValue(validation.checkedBy, `${label} validation reviewer`),
      checkedAt: dateTimeValue(validation.checkedAt, `${label} validation time`)
    },
    usage
  };
}

function optionalStringRecord(value: unknown, label: string): Record<string, string> {
  if (value === undefined) return {};
  const record = objectValue(value, label);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, stringValue(item, `${label} ${key}`)])
  );
}

function optionalNumberRecord(value: unknown, label: string): Record<string, number> | undefined {
  if (value === undefined) return undefined;
  const record = objectValue(value, label);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, nonNegativeInteger(item, `${label} ${key}`)])
  );
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  return boundedArray(value, label, MAX_TERMS).map((item, index) =>
    stringValue(item, `${label} ${index + 1}`)
  );
}

export function normalizeGovernedTermRegistry(value: unknown): GovernedTermRegistry {
  const record = objectValue(value, 'Governed term registry');
  if (record.schema !== 'okf-explorer-governed-terms.v1') {
    throw new Error('Governed term registry has an unsupported schema');
  }
  const vocabularies = boundedArray(
    record.vocabularies,
    'Governed term vocabularies',
    MAX_VOCABULARIES
  ).map(normalizeVocabulary);
  if (!vocabularies.length) throw new Error('Governed term registry has no vocabularies');
  const vocabularyById = new Map(vocabularies.map((vocabulary) => [vocabulary.id, vocabulary]));
  if (vocabularyById.size !== vocabularies.length) {
    throw new Error('Governed term vocabulary identifiers must be unique');
  }
  if (new Set(vocabularies.map((vocabulary) => vocabulary.prefix)).size !== vocabularies.length) {
    throw new Error('Governed term vocabulary prefixes must be unique');
  }
  const terms = boundedArray(record.terms, 'Governed terms', MAX_TERMS).map((term, index) =>
    normalizeTerm(term, index, vocabularyById)
  );
  if (!terms.length) throw new Error('Governed term registry has no terms');
  if (new Set(terms.map((term) => term.id)).size !== terms.length) {
    throw new Error('Governed term identifiers must be unique');
  }
  const helpKeys = terms.map((term) => term.helpKey).filter((key): key is string => Boolean(key));
  if (new Set(helpKeys).size !== helpKeys.length) {
    throw new Error('Governed term help keys must be unique');
  }
  const reviewRecord = record.review === undefined
    ? undefined
    : objectValue(record.review, 'Governed term review');
  const review = reviewRecord
    ? {
        applicationStatus: optionalString(reviewRecord.applicationStatus, 'Review application status'),
        checkedAt: reviewRecord.checkedAt === undefined
          ? undefined
          : dateTimeValue(reviewRecord.checkedAt, 'Review checked at'),
        checkedBy: optionalString(reviewRecord.checkedBy, 'Review checked by'),
        liveLookupPerformed: reviewRecord.liveLookupPerformed === undefined
          ? undefined
          : booleanValue(reviewRecord.liveLookupPerformed, 'Review live lookup flag'),
        method: optionalString(reviewRecord.method, 'Review method'),
        scope: optionalString(reviewRecord.scope, 'Review scope')
      }
    : undefined;
  return {
    schema: 'okf-explorer-governed-terms.v1',
    title: stringValue(record.title, 'Governed term registry title'),
    description: optionalString(record.description, 'Governed term registry description'),
    snapshot: optionalString(record.snapshot, 'Governed term registry snapshot'),
    generated_at: record.generated_at === undefined
      ? undefined
      : dateTimeValue(record.generated_at, 'Governed term registry generated time'),
    review,
    vocabularies,
    terms,
    counts: optionalNumberRecord(record.counts, 'Governed term counts')
  };
}

export function normalizeGovernedTermValidation(value: unknown): GovernedTermValidation {
  const record = objectValue(value, 'Governed term validation');
  if (record.schema !== 'okf-explorer-governed-term-validation.v1') {
    throw new Error('Governed term validation has an unsupported schema');
  }
  const status = stringValue(record.status, 'Governed term validation status');
  if (!['conformant', 'non-conformant'].includes(status)) {
    throw new Error(`Governed term validation has unsupported status ${status}`);
  }
  return {
    schema: 'okf-explorer-governed-term-validation.v1',
    snapshot: optionalString(record.snapshot, 'Governed term validation snapshot'),
    generated_at: record.generated_at === undefined
      ? undefined
      : dateTimeValue(record.generated_at, 'Governed term validation generated time'),
    status,
    checkedAt: record.checkedAt === undefined
      ? undefined
      : dateTimeValue(record.checkedAt, 'Governed term validation checked at'),
    checkedBy: optionalString(record.checkedBy, 'Governed term validation checked by'),
    method: optionalString(record.method, 'Governed term validation method'),
    scope: optionalString(record.scope, 'Governed term validation scope'),
    liveLookupPerformed: record.liveLookupPerformed === undefined
      ? undefined
      : booleanValue(record.liveLookupPerformed, 'Governed term validation live lookup flag'),
    checks: optionalStringRecord(record.checks, 'Governed term validation checks'),
    counts: optionalNumberRecord(record.counts, 'Governed term validation counts'),
    limitations: optionalStringArray(record.limitations, 'Governed term validation limitations'),
    unregisteredTerms: optionalStringArray(
      record.unregisteredTerms,
      'Governed term validation unregistered terms'
    ),
    unusedStandardsTerms: optionalStringArray(
      record.unusedStandardsTerms,
      'Governed term validation unused standards terms'
    ),
    pendingApplicationReviews: optionalStringArray(
      record.pendingApplicationReviews,
      'Governed term validation pending application reviews'
    )
  };
}

export function validateGovernedTermEvidence(
  registry: GovernedTermRegistry,
  validation: GovernedTermValidation | undefined
): void {
  if (!validation) return;
  if (registry.snapshot && validation.snapshot && registry.snapshot !== validation.snapshot) {
    throw new Error('Governed term registry and validation report snapshots differ');
  }
  if (validation.status === 'conformant') {
    if (
      validation.unregisteredTerms?.length ||
      validation.pendingApplicationReviews?.length ||
      validation.unusedStandardsTerms?.length
    ) {
      throw new Error('Conformant governed term validation contains unresolved findings');
    }
    const failedChecks = Object.entries(validation.checks).filter(([, status]) => status !== 'passed');
    if (failedChecks.length) {
      throw new Error('Conformant governed term validation contains checks that did not pass');
    }
  }
}

export function governedTerm(
  registry: GovernedTermRegistry | undefined,
  id: string
): GovernedTerm | undefined {
  return registry?.terms.find((term) => term.id === id);
}

export function governedHelpText(
  registry: GovernedTermRegistry | undefined,
  key: string
): string {
  if (!registry) return '';
  const baseKey = key.split(':')[0];
  return (
    registry.terms.find(
      (term) =>
        term.helpKey &&
        (term.helpKey === key || term.helpKey.split(':')[0] === baseKey)
    )?.definition ||
    ''
  );
}

export function governedTermIdsForRecord(
  record: LargeDataset | SearchResultDoc | undefined
): string[] {
  if (!record) return [];
  const direct = Array.isArray(record.standard_term_ids)
    ? record.standard_term_ids.map((value) => String(value || '').trim())
    : [];
  const alignment = record.standards_alignment;
  const candidates = [
    ...direct,
    record.dcat_type,
    record.hydra_type,
    alignment?.dcat?.term,
    alignment?.hydra?.term
  ];
  return [...new Set(candidates.filter((value): value is string => Boolean(value)))];
}

export function semanticResourceLabel(path: string): string {
  let normalized = path.toLowerCase();
  try {
    normalized = new URL(path, 'https://example.invalid/').pathname.toLowerCase();
  } catch {
    // The extension test below is still useful for a non-URL reference.
  }
  if (normalized.endsWith('.yamlld') || normalized.endsWith('.ymlld')) return 'YAML-LD';
  if (normalized.endsWith('.jsonld')) return 'JSON-LD';
  if (normalized.endsWith('.yaml') || normalized.endsWith('.yml')) return 'YAML';
  if (normalized.endsWith('.json')) return 'JSON';
  return 'Semantic descriptor';
}

export function semanticResources(
  descriptor: LargeCorpusDescriptor
): Array<{ path: string; label: string }> {
  const paths = [
    descriptor.semantic_descriptor,
    descriptor.semantic_yamlld,
    descriptor.semantic_jsonld,
    descriptor.entrypoints.semantic_yamlld,
    descriptor.entrypoints.semantic_jsonld
  ].filter((value): value is string => Boolean(value));
  return [...new Set(paths)].map((path) => ({ path, label: semanticResourceLabel(path) }));
}
