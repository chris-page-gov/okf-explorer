import type { ViewMode } from '$lib/types';

export const EXPLORATORY_PUBLICATION_SCHEMA = 'okf-exploratory-publication.v1' as const;
export const EXPLORATORY_PUBLICATION_STATE = 'exploratory' as const;
export const EXPLORATORY_BANNER_LABEL = 'Exploratory' as const;
export const EXPLORATORY_BANNER_MESSAGE =
  'This is an incomplete research view, not an authoritative service or released data product. Content and links may change. Check the cited official source before making a decision.' as const;
export const EXPLORATORY_WARNING_MESSAGE =
  'The exploratory publication information is invalid or incomplete. Treat this material as incomplete research, not an authoritative service or released data product. Content and links may change. Check the cited official sources before making a decision.' as const;

const SHA256 = /^[a-f0-9]{64}$/;
const ALLOWED_ROOT_FIELDS = new Set([
  'schema',
  'publication_state',
  'snapshot_id',
  'generated_at',
  'applicable_plane_roots',
  'publisher',
  'banner',
  'indexing_policy',
  'limitations',
  'permitted_claims',
  'prohibited_claims',
  'promotion_rule'
]);
const ALLOWED_BANNER_FIELDS = new Set(['label', 'message', 'feedback_url', 'preserve_route']);
const ALLOWED_PUBLISHER_FIELDS = new Set(['name', 'url', 'authority_status']);
const MAX_SHORT_STRING_LENGTH = 256;
const MAX_STATEMENT_LENGTH = 2_048;
const MAX_URL_LENGTH = 4_096;
const MAX_DATE_TIME_LENGTH = 64;
const MAX_LIST_ITEMS = 64;
const MAX_PLANE_ROOTS = 32;
const UNSAFE_HTTP_URL_CHARACTER = /[^\x21-\x7e]|["'<>\\^`{|}]/;
const MALFORMED_PERCENT_ESCAPE = /%(?![0-9A-Fa-f]{2})/;
const RELEASE_LIKE_STATUS_TOKEN = new Set([
  'approval',
  'approved',
  'authoritative',
  'authorised',
  'authorized',
  'candidate',
  'complete',
  'completed',
  'endorsed',
  'final',
  'live',
  'official',
  'production',
  'publish',
  'published',
  'releasable',
  'release',
  'released',
  'stable'
]);

export type ExploratoryIndexingPolicy = 'noindex' | 'owner-decision';

export type ExploratoryPublication = {
  schema: typeof EXPLORATORY_PUBLICATION_SCHEMA;
  publicationState: typeof EXPLORATORY_PUBLICATION_STATE;
  snapshotId: string;
  generatedAt: string;
  applicablePlaneRoots: Record<string, string>;
  publisher: {
    name: string;
    url?: string;
    authorityStatus: 'independent-research' | 'official-source' | 'unverified';
  };
  feedbackUrl: string;
  indexingPolicy: ExploratoryIndexingPolicy;
  limitations: string[];
  permittedClaims: string[];
  prohibitedClaims: string[];
  promotionRule: string;
};

export type ExploratoryPublicationResult =
  | { state: 'not-exploratory'; publication: null; warning: ''; noindex: boolean }
  | { state: 'valid'; publication: ExploratoryPublication; warning: ''; noindex: boolean }
  | { state: 'invalid'; publication: null; warning: string; noindex: true };

export type ExploratoryFeedbackState = {
  reviewUrl: string;
  bundleUrl: string;
  view: ViewMode;
  query: string;
  filters: Record<string, string[]>;
  route: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string no longer than ${maxLength} characters`);
  }
  return value.trim();
}

function exactFields(value: Record<string, unknown>, allowed: Set<string>, field: string): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`${field} contains unsupported field${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_LIST_ITEMS) {
    throw new Error(`${field} must contain between 1 and ${MAX_LIST_ITEMS} statements`);
  }
  const statements = value.map((entry, index) =>
    nonEmptyString(entry, `${field}[${index}]`, MAX_STATEMENT_LENGTH)
  );
  if (new Set(statements).size !== statements.length) {
    throw new Error(`${field} must not contain duplicate statements`);
  }
  return statements;
}

function safeFeedbackUrl(value: unknown): string {
  const raw = nonEmptyString(
    value,
    'exploratory_publication.banner.feedback_url',
    MAX_URL_LENGTH
  );
  if (
    UNSAFE_HTTP_URL_CHARACTER.test(raw) ||
    MALFORMED_PERCENT_ESCAPE.test(raw)
  ) {
    throw new Error('exploratory_publication.banner.feedback_url must be a safe absolute HTTP(S) URL');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('exploratory_publication.banner.feedback_url must be an absolute HTTP(S) URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port === '0'
  ) {
    throw new Error('exploratory_publication.banner.feedback_url must be a credential-free HTTP(S) URL');
  }
  return url.toString();
}

function safePublisherUrl(value: unknown): string {
  const raw = nonEmptyString(
    value,
    'exploratory_publication.publisher.url',
    MAX_URL_LENGTH
  );
  if (
    UNSAFE_HTTP_URL_CHARACTER.test(raw) ||
    MALFORMED_PERCENT_ESCAPE.test(raw)
  ) {
    throw new Error('exploratory_publication.publisher.url must be a safe absolute HTTPS URL');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('exploratory_publication.publisher.url must be an absolute HTTPS URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port === '0') {
    throw new Error('exploratory_publication.publisher.url must be a credential-free HTTPS URL');
  }
  return url.toString();
}

function rfc3339(value: unknown, field: string): string {
  const raw = nonEmptyString(value, field, MAX_DATE_TIME_LENGTH);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw) || Number.isNaN(Date.parse(raw))) {
    throw new Error(`${field} must be an RFC 3339 date-time`);
  }
  return raw;
}

function planeRoots(value: unknown, field: string): Record<string, string> {
  const roots = record(value);
  if (!roots || !Object.keys(roots).length || Object.keys(roots).length > MAX_PLANE_ROOTS) {
    throw new Error(`${field} must contain between 1 and ${MAX_PLANE_ROOTS} plane roots`);
  }
  const normalized: Record<string, string> = {};
  for (const key of Object.keys(roots).sort()) {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(key)) {
      throw new Error(`${field} contains an invalid plane name: ${key}`);
    }
    if (typeof roots[key] !== 'string' || !SHA256.test(roots[key])) {
      throw new Error(`${field}.${key} must be a lowercase SHA-256 digest`);
    }
    normalized[key] = roots[key] as string;
  }
  return normalized;
}

function exploratoryIntent(descriptor: Record<string, unknown>): boolean {
  return descriptor.publication_state === EXPLORATORY_PUBLICATION_STATE ||
    descriptor.status === EXPLORATORY_PUBLICATION_STATE ||
    Object.prototype.hasOwnProperty.call(descriptor, 'exploratory_publication');
}

function validateEnvelopePublicationClaims(descriptor: Record<string, unknown>): void {
  if (Object.prototype.hasOwnProperty.call(descriptor, 'publication_state')) {
    if (descriptor.publication_state !== EXPLORATORY_PUBLICATION_STATE) {
      throw new Error(
        'the descriptor envelope publication_state must be exploratory when exploratory_publication is present'
      );
    }
  }

  if (descriptor.status === undefined || descriptor.status === null || descriptor.status === '') {
    return;
  }
  const status = nonEmptyString(
    descriptor.status,
    'the descriptor envelope status',
    MAX_SHORT_STRING_LENGTH
  );
  const tokens = status.toLocaleLowerCase('en-GB').split(/[^a-z0-9]+/).filter(Boolean);
  const generallyAvailable = tokens.some(
    (token, index) => token === 'generally' && tokens[index + 1] === 'available'
  );
  if (
    tokens.some((token) => RELEASE_LIKE_STATUS_TOKEN.has(token)) ||
    (tokens.length === 1 && tokens[0] === 'ga') ||
    generallyAvailable
  ) {
    throw new Error(
      `the descriptor envelope status ${JSON.stringify(status)} makes a release-like claim incompatible with exploratory_publication`
    );
  }
}

function invalid(reason: string): ExploratoryPublicationResult {
  return {
    state: 'invalid',
    publication: null,
    warning: `${EXPLORATORY_WARNING_MESSAGE} Descriptor problem: ${reason}.`,
    noindex: true
  };
}

/**
 * Validate the complete exploratory publication block before any publisher
 * wording or feedback route is trusted. Integrity is established by matching
 * the block's snapshot and applicable plane roots to the descriptor envelope.
 */
export function parseExploratoryPublication(
  descriptor: Record<string, unknown>
): ExploratoryPublicationResult {
  if (!exploratoryIntent(descriptor)) {
    return {
      state: 'not-exploratory',
      publication: null,
      warning: '',
      noindex: descriptor.indexing_policy === 'noindex'
    };
  }

  try {
    const block = record(descriptor.exploratory_publication);
    if (!block) throw new Error('exploratory_publication is missing or is not an object');
    exactFields(block, ALLOWED_ROOT_FIELDS, 'exploratory_publication');
    if (block.schema !== EXPLORATORY_PUBLICATION_SCHEMA) {
      throw new Error(`unsupported exploratory publication schema ${String(block.schema || '<missing>')}`);
    }
    if (block.publication_state !== EXPLORATORY_PUBLICATION_STATE) {
      throw new Error('publication_state must be exploratory');
    }
    validateEnvelopePublicationClaims(descriptor);

    const snapshotId = nonEmptyString(
      block.snapshot_id,
      'exploratory_publication.snapshot_id',
      MAX_SHORT_STRING_LENGTH
    );
    const snapshotAliases = [
      ['snapshot_id', descriptor.snapshot_id],
      ['snapshot', descriptor.snapshot]
    ] as const;
    const declaredSnapshots = snapshotAliases
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([field, value]) => nonEmptyString(value, field, MAX_SHORT_STRING_LENGTH));
    if (new Set(declaredSnapshots).size > 1) {
      throw new Error('snapshot and snapshot_id conflict in the descriptor envelope');
    }
    const descriptorSnapshot = declaredSnapshots[0] || '';
    if (!descriptorSnapshot) throw new Error('the descriptor envelope has no snapshot or snapshot_id');
    if (snapshotId !== descriptorSnapshot) throw new Error('snapshot identity does not match the descriptor envelope');

    const generatedAt = rfc3339(block.generated_at, 'exploratory_publication.generated_at');
    if (typeof descriptor.generated_at !== 'string' || generatedAt !== descriptor.generated_at.trim()) {
      throw new Error('generated_at does not match the descriptor envelope');
    }

    const applicablePlaneRoots = planeRoots(
      block.applicable_plane_roots,
      'exploratory_publication.applicable_plane_roots'
    );
    const descriptorPlaneRoots = descriptor.plane_roots === undefined
      ? {}
      : planeRoots(descriptor.plane_roots, 'plane_roots');
    if (descriptor.data_plane_manifest_root_sha256 !== undefined) {
      const legacyDataRoot = planeRoots(
        { data_plane_manifest: descriptor.data_plane_manifest_root_sha256 },
        'data_plane_manifest_root_sha256'
      ).data_plane_manifest;
      if (
        descriptorPlaneRoots.data_plane_manifest &&
        descriptorPlaneRoots.data_plane_manifest !== legacyDataRoot
      ) {
        throw new Error(
          'plane_roots.data_plane_manifest conflicts with data_plane_manifest_root_sha256'
        );
      }
      descriptorPlaneRoots.data_plane_manifest = legacyDataRoot;
    }
    if (!Object.keys(descriptorPlaneRoots).length) {
      throw new Error('the descriptor envelope has no applicable plane roots');
    }
    for (const [plane, digest] of Object.entries(applicablePlaneRoots)) {
      if (descriptorPlaneRoots[plane] !== digest) {
        throw new Error(`integrity root for plane ${plane} does not match the descriptor envelope`);
      }
    }

    const publisher = record(block.publisher);
    if (!publisher) throw new Error('publisher must be an object');
    exactFields(publisher, ALLOWED_PUBLISHER_FIELDS, 'exploratory_publication.publisher');
    const authorityStatus = publisher.authority_status;
    if (!['independent-research', 'official-source', 'unverified'].includes(String(authorityStatus))) {
      throw new Error('publisher.authority_status must be independent-research, official-source or unverified');
    }

    const banner = record(block.banner);
    if (!banner) throw new Error('banner must be an object');
    exactFields(banner, ALLOWED_BANNER_FIELDS, 'exploratory_publication.banner');
    if (banner.label !== EXPLORATORY_BANNER_LABEL) throw new Error('banner.label must be Exploratory');
    if (banner.message !== EXPLORATORY_BANNER_MESSAGE) {
      throw new Error('banner.message does not contain the governed v1 warning');
    }
    if (banner.preserve_route !== true) throw new Error('banner.preserve_route must be true');

    const indexingPolicy = block.indexing_policy;
    if (indexingPolicy !== 'noindex' && indexingPolicy !== 'owner-decision') {
      throw new Error('indexing_policy must be noindex or owner-decision');
    }

    const publication: ExploratoryPublication = {
      schema: EXPLORATORY_PUBLICATION_SCHEMA,
      publicationState: EXPLORATORY_PUBLICATION_STATE,
      snapshotId,
      generatedAt,
      applicablePlaneRoots,
      publisher: {
        name: nonEmptyString(
          publisher.name,
          'exploratory_publication.publisher.name',
          MAX_SHORT_STRING_LENGTH
        ),
        ...(publisher.url === undefined ? {} : { url: safePublisherUrl(publisher.url) }),
        authorityStatus: authorityStatus as ExploratoryPublication['publisher']['authorityStatus']
      },
      feedbackUrl: safeFeedbackUrl(banner.feedback_url),
      indexingPolicy,
      limitations: stringList(block.limitations, 'exploratory_publication.limitations'),
      permittedClaims: stringList(block.permitted_claims, 'exploratory_publication.permitted_claims'),
      prohibitedClaims: stringList(block.prohibited_claims, 'exploratory_publication.prohibited_claims'),
      promotionRule: nonEmptyString(
        block.promotion_rule,
        'exploratory_publication.promotion_rule',
        MAX_STATEMENT_LENGTH
      )
    };
    return {
      state: 'valid',
      publication,
      warning: '',
      noindex: publication.indexingPolicy === 'noindex'
    };
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error));
  }
}

/** Build a feedback URL that carries both explicit fields and the canonical URL. */
export function buildExploratoryFeedbackUrl(
  feedbackUrl: string,
  state: ExploratoryFeedbackState
): string {
  const target = new URL(feedbackUrl);
  target.searchParams.set('okf_review_url', state.reviewUrl);
  target.searchParams.set('okf_bundle', state.bundleUrl);
  target.searchParams.set('okf_view', state.view);
  target.searchParams.set('okf_query', state.query);
  target.searchParams.delete('okf_filter');
  for (const key of Object.keys(state.filters).sort()) {
    for (const value of [...new Set(state.filters[key])].sort((left, right) => left.localeCompare(right))) {
      target.searchParams.append('okf_filter', `${key}=${value}`);
    }
  }
  target.searchParams.set('okf_route', state.route);
  return target.toString();
}
