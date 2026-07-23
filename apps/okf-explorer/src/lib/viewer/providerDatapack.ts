import type {
  LargeDataset,
  LargeProviderDatapack,
  LargeProviderDatapackAction,
  LargeProviderDatapackCollection,
  LargeProviderDatapackManifest,
  LargeProviderDatapackManifestEntry,
  LargeProviderDatapackRecord,
  LargeProviderDatapackSelector,
  SearchResultDoc
} from '$lib/types';

const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
const SELECTOR_FIELD_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const SHA1_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SHORT_COMMIT_PATTERN = /^[0-9a-f]{7,12}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const COMPARISON_STATUSES = new Set(['known-drift', 'aligned', 'unknown']);
const ACTION_TEMPLATE_TOKENS = new Set(['native_id']);
const MAX_PACKS = 50;
const MAX_RECORD_REFERENCES = 10_000;
const MAX_DIFFERENCES = 1_000;
const MAX_ACTIONS = 8;

type JsonRecord = Record<string, unknown>;
type ProviderRecordLike = Partial<LargeDataset> | Partial<SearchResultDoc>;

export type ResolvedProviderDatapackAction = Omit<LargeProviderDatapackAction, 'urlTemplate'> & {
  url: string;
};

export type ProviderDatapackRecordContext = {
  snapshot?: LargeProviderDatapackRecord;
  reviewedLiveReference?: LargeProviderDatapackRecord;
  difference?: LargeProviderDatapack['comparison']['differences'][number];
};

export type ProviderDatapackScopeState = {
  status:
    | LargeProviderDatapack['comparison']['status']
    | 'aligned-reviewed-fields'
    | 'not-reviewed';
  label: string;
  summary: string;
  isDrift: boolean;
};

function objectValue(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function identifierValue(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!IDENTIFIER_PATTERN.test(result)) throw new Error(`${label} is not a safe identifier`);
  return result;
}

function exactString<T extends string>(value: unknown, expected: T, label: string): T {
  if (value !== expected) throw new Error(`${label} must be ${expected}`);
  return expected;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
  return value;
}

function exactBoolean(value: unknown, expected: boolean, label: string): boolean {
  const result = booleanValue(value, label);
  if (result !== expected) throw new Error(`${label} must be ${expected}`);
  return result;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function boundedArray(value: unknown, label: string, maximum: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maximum) throw new Error(`${label} exceeds the ${maximum}-item limit`);
  return value;
}

function comparisonStatus(
  value: unknown,
  label: string
): LargeProviderDatapack['comparison']['status'] {
  const result = stringValue(value, label);
  if (!COMPARISON_STATUSES.has(result)) throw new Error(`${label} is not supported`);
  return result as LargeProviderDatapack['comparison']['status'];
}

function commitValue(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!SHA1_PATTERN.test(result)) throw new Error(`${label} must be a lowercase 40-character Git commit`);
  return result;
}

function shortCommitValue(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!SHORT_COMMIT_PATTERN.test(result)) throw new Error(`${label} must be a lowercase abbreviated Git commit`);
  return result;
}

function sha256Value(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!SHA256_PATTERN.test(result)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
  return result;
}

function dateValue(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!DATE_PATTERN.test(result)) throw new Error(`${label} must be an RFC 3339 full-date`);
  const parsed = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new Error(`${label} must be a valid RFC 3339 full-date`);
  }
  return result;
}

function dateTimeValue(value: unknown, label: string): string {
  const result = stringValue(value, label);
  if (!DATE_TIME_PATTERN.test(result)) {
    throw new Error(`${label} must be an RFC 3339 date-time`);
  }
  dateValue(result.slice(0, 10), label);
  if (Number.isNaN(new Date(result).valueOf())) {
    throw new Error(`${label} must be a valid RFC 3339 date-time`);
  }
  return result;
}

function safeHttpsUrl(value: unknown, label: string): string {
  const result = stringValue(value, label);
  let parsed: URL;
  try {
    parsed = new URL(result);
  } catch {
    throw new Error(`${label} must be an absolute HTTPS URL`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error(`${label} must be an absolute HTTPS URL without credentials`);
  }
  return parsed.toString();
}

function normalizeSelector(value: unknown, label: string): LargeProviderDatapackSelector {
  const candidate = objectValue(value, label);
  const field = stringValue(candidate.field, `${label}.field`);
  if (!SELECTOR_FIELD_PATTERN.test(field)) throw new Error(`${label}.field is not a safe record field`);
  return {
    field,
    operator: exactString(candidate.operator, 'equals', `${label}.operator`),
    value: stringValue(candidate.value, `${label}.value`)
  };
}

function normalizeRecord(value: unknown, label: string): LargeProviderDatapackRecord {
  const candidate = objectValue(value, label);
  const optionalString = (key: keyof LargeProviderDatapackRecord) =>
    candidate[key] === undefined ? undefined : stringValue(candidate[key], `${label}.${key}`);
  return {
    recordId: stringValue(candidate.recordId, `${label}.recordId`),
    title: stringValue(candidate.title, `${label}.title`),
    ...(optionalString('timeCoverageEnd') ? { timeCoverageEnd: optionalString('timeCoverageEnd') } : {}),
    ...(optionalString('metadataModified') ? { metadataModified: optionalString('metadataModified') } : {}),
    ...(optionalString('dataModified') ? { dataModified: optionalString('dataModified') } : {})
  };
}

function normalizeRecords(value: unknown, label: string): LargeProviderDatapackRecord[] {
  const records = boundedArray(value, label, MAX_RECORD_REFERENCES).map((record, index) =>
    normalizeRecord(record, `${label}[${index}]`)
  );
  if (new Set(records.map((record) => record.recordId)).size !== records.length) {
    throw new Error(`${label} contains duplicate record IDs`);
  }
  return records;
}

function normalizeAction(value: unknown, label: string): LargeProviderDatapackAction {
  const candidate = objectValue(value, label);
  const urlTemplate = stringValue(candidate.urlTemplate, `${label}.urlTemplate`);
  const templateTokens = [...urlTemplate.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]);
  const withoutTokens = urlTemplate.replace(/\{[^{}]+\}/g, '');
  if (withoutTokens.includes('{') || withoutTokens.includes('}')) {
    throw new Error(`${label}.urlTemplate has malformed placeholders`);
  }
  for (const token of templateTokens) {
    if (!ACTION_TEMPLATE_TOKENS.has(token)) {
      throw new Error(`${label}.urlTemplate uses unsupported placeholder {${token}}`);
    }
  }
  safeHttpsUrl(urlTemplate.replace(/\{native_id\}/g, 'provider-record'), `${label}.urlTemplate`);
  const parsedTemplate = new URL(urlTemplate);
  const pathTokenCount = parsedTemplate.pathname
    .split('/')
    .filter((segment) => decodeURIComponent(segment) === '{native_id}').length;
  if (pathTokenCount !== templateTokens.length) {
    throw new Error(`${label}.urlTemplate must use {native_id} as a complete pathname segment`);
  }
  return {
    id: identifierValue(candidate.id, `${label}.id`),
    label: stringValue(candidate.label, `${label}.label`),
    kind: exactString(candidate.kind, 'external-link', `${label}.kind`),
    urlTemplate,
    network: exactString(candidate.network, 'external', `${label}.network`)
  };
}

function normalizeDifference(
  value: unknown,
  label: string
): LargeProviderDatapack['comparison']['differences'][number] {
  const candidate = objectValue(value, label);
  const fields = boundedArray(candidate.fields, `${label}.fields`, 50).map((field, index) => {
    const row = objectValue(field, `${label}.fields[${index}]`);
    return {
      field: stringValue(row.field, `${label}.fields[${index}].field`),
      snapshot: stringValue(row.snapshot, `${label}.fields[${index}].snapshot`),
      reviewedLiveReference: stringValue(
        row.reviewedLiveReference,
        `${label}.fields[${index}].reviewedLiveReference`
      )
    };
  });
  if (!fields.length) throw new Error(`${label}.fields must contain at least one reviewed field`);
  if (new Set(fields.map((field) => field.field)).size !== fields.length) {
    throw new Error(`${label}.fields contains duplicate field names`);
  }
  return {
    recordId: stringValue(candidate.recordId, `${label}.recordId`),
    title: stringValue(candidate.title, `${label}.title`),
    fields
  };
}

export function normalizeProviderDatapackManifest(value: unknown): LargeProviderDatapackManifest {
  const candidate = objectValue(value, 'Provider datapack manifest');
  exactString(
    candidate.schema,
    'okf-explorer-provider-datapack-manifest.v1',
    'Provider datapack manifest schema'
  );
  const entries = boundedArray(candidate.packs, 'Provider datapack manifest packs', MAX_PACKS).map(
    (entry, index): LargeProviderDatapackManifestEntry => {
      const row = objectValue(entry, `Provider datapack manifest packs[${index}]`);
      const path = stringValue(row.path, `Provider datapack manifest packs[${index}].path`);
      const segments = path.split('/');
      if (
        path.includes('\\') ||
        path.includes('\0') ||
        path.includes('%') ||
        path.includes('?') ||
        path.includes('#') ||
        path.startsWith('/') ||
        /^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) ||
        segments.some((segment) => !segment || segment === '.' || segment === '..')
      ) {
        throw new Error(`Provider datapack manifest packs[${index}].path is unsafe`);
      }
      return {
        id: identifierValue(row.id, `Provider datapack manifest packs[${index}].id`),
        selector: normalizeSelector(row.selector, `Provider datapack manifest packs[${index}].selector`),
        path,
        sha256: sha256Value(row.sha256, `Provider datapack manifest packs[${index}].sha256`),
        status: comparisonStatus(row.status, `Provider datapack manifest packs[${index}].status`),
        lastChecked: dateValue(
          row.lastChecked,
          `Provider datapack manifest packs[${index}].lastChecked`
        )
      };
    }
  );
  const packCount = nonNegativeInteger(candidate.packCount, 'Provider datapack manifest packCount');
  if (packCount !== entries.length) throw new Error('Provider datapack manifest packCount does not match packs');
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
    throw new Error('Provider datapack manifest contains duplicate pack IDs');
  }
  return {
    schema: 'okf-explorer-provider-datapack-manifest.v1',
    snapshot: stringValue(candidate.snapshot, 'Provider datapack manifest snapshot'),
    packCount,
    packs: entries
  };
}

export function normalizeProviderDatapack(value: unknown): LargeProviderDatapack {
  const candidate = objectValue(value, 'Provider datapack');
  exactString(candidate.schema, 'okf-explorer-provider-datapack.v1', 'Provider datapack schema');
  const provider = objectValue(candidate.provider, 'Provider datapack provider');
  const governedSnapshot = objectValue(
    candidate.governedSnapshot,
    'Provider datapack governedSnapshot'
  );
  const reviewed = objectValue(
    candidate.reviewedLiveReference,
    'Provider datapack reviewedLiveReference'
  );
  const comparison = objectValue(candidate.comparison, 'Provider datapack comparison');
  const presentation = objectValue(candidate.presentation, 'Provider datapack presentation');
  const differences = boundedArray(
    comparison.differences,
    'Provider datapack comparison.differences',
    MAX_DIFFERENCES
  ).map((difference, index) =>
    normalizeDifference(difference, `Provider datapack comparison.differences[${index}]`)
  );
  if (new Set(differences.map((difference) => difference.recordId)).size !== differences.length) {
    throw new Error('Provider datapack comparison.differences contains duplicate record IDs');
  }
  const actions = boundedArray(
    presentation.actions,
    'Provider datapack presentation.actions',
    MAX_ACTIONS
  ).map((action, index) => normalizeAction(action, `Provider datapack presentation.actions[${index}]`));
  if (new Set(actions.map((action) => action.id)).size !== actions.length) {
    throw new Error('Provider datapack presentation.actions contains duplicate action IDs');
  }
  const id = identifierValue(candidate.id, 'Provider datapack id');
  const providerId = identifierValue(provider.id, 'Provider datapack provider.id');
  if (providerId !== id) {
    throw new Error('Provider datapack provider.id must match its top-level id');
  }
  const providerLiveServiceUrl = safeHttpsUrl(
    provider.liveServiceUrl,
    'Provider datapack provider.liveServiceUrl'
  );
  const providerRepositoryUrl = safeHttpsUrl(
    provider.repositoryUrl,
    'Provider datapack provider.repositoryUrl'
  );
  const governedSourceCommit = commitValue(
    governedSnapshot.sourceCommit,
    'Provider datapack governedSnapshot.sourceCommit'
  );
  const governedSourceCommitShort = shortCommitValue(
    governedSnapshot.sourceCommitShort,
    'Provider datapack governedSnapshot.sourceCommitShort'
  );
  if (!governedSourceCommit.startsWith(governedSourceCommitShort)) {
    throw new Error(
      'Provider datapack governedSnapshot.sourceCommitShort must abbreviate sourceCommit'
    );
  }
  const reviewedSourceCommit = commitValue(
    reviewed.sourceCommit,
    'Provider datapack reviewedLiveReference.sourceCommit'
  );
  const reviewedSourceCommitShort = shortCommitValue(
    reviewed.sourceCommitShort,
    'Provider datapack reviewedLiveReference.sourceCommitShort'
  );
  if (!reviewedSourceCommit.startsWith(reviewedSourceCommitShort)) {
    throw new Error(
      'Provider datapack reviewedLiveReference.sourceCommitShort must abbreviate sourceCommit'
    );
  }
  const reviewedLiveServiceUrl = safeHttpsUrl(
    reviewed.liveServiceUrl,
    'Provider datapack reviewedLiveReference.liveServiceUrl'
  );
  const reviewedRepositoryUrl = safeHttpsUrl(
    reviewed.repositoryUrl,
    'Provider datapack reviewedLiveReference.repositoryUrl'
  );
  if (
    reviewedLiveServiceUrl !== providerLiveServiceUrl ||
    reviewedRepositoryUrl !== providerRepositoryUrl
  ) {
    throw new Error('Provider datapack reviewed reference URLs must match its provider URLs');
  }
  const comparisonAsOf = dateValue(
    comparison.comparisonAsOf,
    'Provider datapack comparison.comparisonAsOf'
  );
  const comparisonStatusValue = comparisonStatus(
    comparison.status,
    'Provider datapack comparison.status'
  );
  if (comparisonStatusValue === 'known-drift' && !differences.length) {
    throw new Error(
      'Provider datapack comparison.differences must describe a known-drift comparison'
    );
  }
  if (comparisonStatusValue !== 'known-drift' && differences.length) {
    throw new Error(
      'Provider datapack comparison.differences must be empty unless status is known-drift'
    );
  }
  const lastChecked = dateValue(
    reviewed.lastChecked,
    'Provider datapack reviewedLiveReference.lastChecked'
  );
  if (comparisonAsOf !== lastChecked) {
    throw new Error(
      'Provider datapack comparison.comparisonAsOf must match reviewedLiveReference.lastChecked'
    );
  }
  const governedRecords = normalizeRecords(
    governedSnapshot.records,
    'Provider datapack governedSnapshot.records'
  );
  const reviewedRecords = normalizeRecords(
    reviewed.records,
    'Provider datapack reviewedLiveReference.records'
  );
  const governedRecordsById = new Map(
    governedRecords.map((record) => [record.recordId, record])
  );
  const reviewedRecordsById = new Map(reviewedRecords.map((record) => [record.recordId, record]));
  const differencesByRecordId = new Map(
    differences.map((difference) => [difference.recordId, difference])
  );
  const comparedRecordFields: Array<{
    recordField: keyof LargeProviderDatapackRecord;
    differenceField: string;
  }> = [
    { recordField: 'title', differenceField: 'title' },
    { recordField: 'timeCoverageEnd', differenceField: 'timeCoverage.end' },
    { recordField: 'metadataModified', differenceField: 'metadataModified' },
    { recordField: 'dataModified', differenceField: 'dataModified' }
  ];
  const recordFieldByDifferenceField = new Map(
    comparedRecordFields.map(({ recordField, differenceField }) => [
      differenceField,
      recordField
    ])
  );
  for (const difference of differences) {
    const snapshotRecord = governedRecordsById.get(difference.recordId);
    const reviewedRecord = reviewedRecordsById.get(difference.recordId);
    if (!snapshotRecord || !reviewedRecord) {
      throw new Error(
        `Provider datapack comparison difference ${difference.recordId} must reference a record in both reviewed arrays`
      );
    }
    if (difference.title !== snapshotRecord.title) {
      throw new Error(
        `Provider datapack comparison difference ${difference.recordId} title must match its governed record`
      );
    }
    for (const field of difference.fields) {
      const recordField = recordFieldByDifferenceField.get(field.field);
      if (!recordField) continue;
      const snapshotValue = snapshotRecord[recordField];
      const reviewedValue = reviewedRecord[recordField];
      if (
        snapshotValue === reviewedValue ||
        field.snapshot !== snapshotValue ||
        field.reviewedLiveReference !== reviewedValue
      ) {
        throw new Error(
          `Provider datapack comparison difference ${difference.recordId} has an inexact ${field.field} field`
        );
      }
    }
  }
  for (const snapshotRecord of governedRecords) {
    const reviewedRecord = reviewedRecordsById.get(snapshotRecord.recordId);
    if (!reviewedRecord) continue;
    const difference = differencesByRecordId.get(snapshotRecord.recordId);
    for (const { recordField, differenceField } of comparedRecordFields) {
      const snapshotValue = snapshotRecord[recordField];
      const reviewedValue = reviewedRecord[recordField];
      if (snapshotValue === reviewedValue) continue;
      const exactFieldDifference = difference?.fields.find(
        (field) =>
          field.field === differenceField &&
          field.snapshot === snapshotValue &&
          field.reviewedLiveReference === reviewedValue
      );
      if (!exactFieldDifference) {
        throw new Error(
          `Provider datapack record ${snapshotRecord.recordId} requires an exact ${differenceField} comparison.differences entry`
        );
      }
    }
  }

  return {
    schema: 'okf-explorer-provider-datapack.v1',
    snapshot: stringValue(candidate.snapshot, 'Provider datapack snapshot'),
    id,
    provider: {
      id: providerId,
      title: stringValue(provider.title, 'Provider datapack provider.title'),
      liveServiceUrl: providerLiveServiceUrl,
      repositoryUrl: providerRepositoryUrl
    },
    selector: normalizeSelector(candidate.selector, 'Provider datapack selector'),
    governedSnapshot: {
      status: exactString(
        governedSnapshot.status,
        'governed-pinned-snapshot',
        'Provider datapack governedSnapshot.status'
      ),
      label: stringValue(
        governedSnapshot.label,
        'Provider datapack governedSnapshot.label'
      ),
      snapshotId: stringValue(
        governedSnapshot.snapshotId,
        'Provider datapack governedSnapshot.snapshotId'
      ),
      recordCount: nonNegativeInteger(
        governedSnapshot.recordCount,
        'Provider datapack governedSnapshot.recordCount'
      ),
      sourceCommit: governedSourceCommit,
      sourceCommitShort: governedSourceCommitShort,
      sourceAsOf: dateTimeValue(
        governedSnapshot.sourceAsOf,
        'Provider datapack governedSnapshot.sourceAsOf'
      ),
      sourceAsOfBasis: stringValue(
        governedSnapshot.sourceAsOfBasis,
        'Provider datapack governedSnapshot.sourceAsOfBasis'
      ),
      metadataOnly: exactBoolean(
        governedSnapshot.metadataOnly,
        true,
        'Provider datapack governedSnapshot.metadataOnly'
      ) as true,
      observationsIncluded: exactBoolean(
        governedSnapshot.observationsIncluded,
        false,
        'Provider datapack governedSnapshot.observationsIncluded'
      ) as false,
      records: governedRecords,
    },
    reviewedLiveReference: {
      status: exactString(
        reviewed.status,
        'reviewed-reference-not-live-validated',
        'Provider datapack reviewedLiveReference.status'
      ),
      label: stringValue(reviewed.label, 'Provider datapack reviewedLiveReference.label'),
      lastChecked,
      network: exactString(
        reviewed.network,
        'external',
        'Provider datapack reviewedLiveReference.network'
      ),
      liveServiceUrl: reviewedLiveServiceUrl,
      repositoryUrl: reviewedRepositoryUrl,
      sourceCommit: reviewedSourceCommit,
      sourceCommitShort: reviewedSourceCommitShort,
      sourceCommitAsOf: dateTimeValue(
        reviewed.sourceCommitAsOf,
        'Provider datapack reviewedLiveReference.sourceCommitAsOf'
      ),
      metadataInputSha256: sha256Value(
        reviewed.metadataInputSha256,
        'Provider datapack reviewedLiveReference.metadataInputSha256'
      ),
      records: reviewedRecords
    },
    comparison: {
      status: comparisonStatusValue,
      comparisonAsOf,
      summary: stringValue(comparison.summary, 'Provider datapack comparison.summary'),
      evidenceScope: exactString(
        comparison.evidenceScope,
        'reviewed-record-examples',
        'Provider datapack comparison.evidenceScope'
      ),
      exhaustive: exactBoolean(
        comparison.exhaustive,
        false,
        'Provider datapack comparison.exhaustive'
      ) as false,
      executionRequiresLiveValidation: exactBoolean(
        comparison.executionRequiresLiveValidation,
        true,
        'Provider datapack comparison.executionRequiresLiveValidation'
      ) as true,
      differences
    },
    presentation: {
      snapshotLabel: stringValue(
        presentation.snapshotLabel,
        'Provider datapack presentation.snapshotLabel'
      ),
      liveLabel: stringValue(
        presentation.liveLabel,
        'Provider datapack presentation.liveLabel'
      ),
      lastCheckedWording: stringValue(
        presentation.lastCheckedWording,
        'Provider datapack presentation.lastCheckedWording'
      ),
      notice: stringValue(presentation.notice, 'Provider datapack presentation.notice'),
      actions
    }
  };
}

export function validateProviderDatapackCollection(
  manifest: LargeProviderDatapackManifest,
  packs: LargeProviderDatapack[],
  expectedSnapshot: string
): LargeProviderDatapackCollection {
  if (expectedSnapshot && manifest.snapshot !== expectedSnapshot) {
    throw new Error(
      `Provider datapack manifest snapshot ${manifest.snapshot} differs from bundle snapshot ${expectedSnapshot}`
    );
  }
  if (packs.length !== manifest.packCount) {
    throw new Error('Loaded provider datapack count does not match its manifest');
  }
  for (let index = 0; index < packs.length; index += 1) {
    const entry = manifest.packs[index];
    const pack = packs[index];
    if (pack.id !== entry.id) throw new Error(`Provider datapack ID differs from manifest entry ${entry.id}`);
    if (
      pack.selector.field !== entry.selector.field ||
      pack.selector.operator !== entry.selector.operator ||
      pack.selector.value !== entry.selector.value
    ) {
      throw new Error(`Provider datapack selector differs from manifest entry ${entry.id}`);
    }
    if (pack.snapshot !== manifest.snapshot) {
      throw new Error(`Provider datapack ${entry.id} top-level snapshot differs from its manifest`);
    }
    if (pack.governedSnapshot.snapshotId !== manifest.snapshot) {
      throw new Error(`Provider datapack ${entry.id} snapshot differs from its manifest`);
    }
    if (pack.comparison.status !== entry.status) {
      throw new Error(`Provider datapack ${entry.id} comparison status differs from its manifest`);
    }
    if (pack.reviewedLiveReference.lastChecked !== entry.lastChecked) {
      throw new Error(`Provider datapack ${entry.id} last-checked date differs from its manifest`);
    }
  }
  return { manifest, packs };
}

export function providerDatapackMatchesRecord(
  pack: LargeProviderDatapack,
  record: ProviderRecordLike | undefined
): boolean {
  if (!record || pack.selector.operator !== 'equals') return false;
  const value = (record as Record<string, unknown>)[pack.selector.field];
  return typeof value === 'string'
    ? value === pack.selector.value
    : Array.isArray(value) && value.some((item) => item === pack.selector.value);
}

export function providerDatapacksForRecord(
  collection: LargeProviderDatapackCollection | undefined,
  record: ProviderRecordLike | undefined
): LargeProviderDatapack[] {
  return collection?.packs.filter((pack) => providerDatapackMatchesRecord(pack, record)) || [];
}

function providerRecordId(record: ProviderRecordLike | undefined): string {
  if (!record) return '';
  for (const key of ['record_id', 'id', 'name']) {
    const value = (record as Record<string, unknown>)[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

export function providerDatapackRecordContext(
  pack: LargeProviderDatapack,
  record: ProviderRecordLike | undefined
): ProviderDatapackRecordContext {
  const recordId = providerRecordId(record);
  if (!recordId) return {};
  return {
    snapshot: pack.governedSnapshot.records.find((item) => item.recordId === recordId),
    reviewedLiveReference: pack.reviewedLiveReference.records.find(
      (item) => item.recordId === recordId
    ),
    difference: pack.comparison.differences.find((item) => item.recordId === recordId)
  };
}

export function providerDatapackScopeState(
  pack: LargeProviderDatapack,
  record: ProviderRecordLike | undefined,
  scope: 'bundle' | 'record' | 'resource' = 'bundle'
): ProviderDatapackScopeState {
  if (scope === 'bundle') {
    return {
      status: pack.comparison.status,
      label: providerDatapackComparisonLabel(pack.comparison.status),
      summary: pack.comparison.summary,
      isDrift: pack.comparison.status === 'known-drift'
    };
  }
  const context = providerDatapackRecordContext(pack, record);
  if (context.difference) {
    return {
      status: 'known-drift',
      label: 'Known snapshot/live difference',
      summary: pack.comparison.summary,
      isDrift: true
    };
  }
  if (context.snapshot && context.reviewedLiveReference) {
    return {
      status: 'aligned-reviewed-fields',
      label: 'Aligned in reviewed fields',
      summary:
        'No difference was recorded in the reviewed fields for this record. This is not an exhaustive live comparison.',
      isDrift: false
    };
  }
  return {
    status: 'not-reviewed',
    label: 'Record alignment not reviewed',
    summary:
      'This record matches the provider datapack, but it was not one of the reviewed comparison examples.',
    isDrift: false
  };
}

export function resolveProviderDatapackActions(
  pack: LargeProviderDatapack,
  record?: ProviderRecordLike
): ResolvedProviderDatapackAction[] {
  const nativeId = record?.native_id;
  return pack.presentation.actions.flatMap((action) => {
    const tokens = [...action.urlTemplate.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]);
    if (tokens.some((token) => !ACTION_TEMPLATE_TOKENS.has(token))) return [];
    let url = action.urlTemplate;
    if (tokens.includes('native_id')) {
      if (typeof nativeId !== 'string' || !nativeId.trim()) return [];
      const normalizedNativeId = nativeId.trim();
      if (normalizedNativeId === '.' || normalizedNativeId === '..') return [];
      url = url.replace(/\{native_id\}/g, encodeURIComponent(normalizedNativeId));
    }
    if (url.includes('{') || url.includes('}')) return [];
    try {
      return [{ ...action, url: safeHttpsUrl(url, `Provider datapack action ${action.id}`) }];
    } catch {
      return [];
    }
  });
}

export function providerDatapackComparisonLabel(status: string): string {
  if (status === 'known-drift') return 'Known snapshot/live difference';
  if (status === 'aligned') return 'Aligned when reviewed';
  return 'Current alignment unknown';
}
