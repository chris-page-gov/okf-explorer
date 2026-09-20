import type {
  ContextAssertion, ContextBinding, ContextBudget, ContextIndex, ContextIssue,
  ContextPackage, ContextPath, ContextRecord, ContextResolution, ContextSelection, ContextAssemblyOptions
} from './types.ts';
export type * from './types.ts';

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  max_nodes: 64, max_relationships: 128, max_depth: 6, max_bytes: 524288
};
export const MAX_CONTEXT_BUDGET: ContextBudget = {
  max_nodes: 200, max_relationships: 1000, max_depth: 8, max_bytes: 524288
};
export const CONTEXT_PREDICATES = new Set([
  'http://purl.org/dc/terms/references',
  'http://purl.org/dc/terms/requires',
  'http://www.w3.org/2004/02/skos/core#related',
  'http://www.w3.org/2004/02/skos/core#narrower',
  'http://www.w3.org/2004/02/skos/core#broader'
]);
const REQUIRES = 'http://purl.org/dc/terms/requires';
const MAX_RESOLUTION_OPERATIONS = 500_000;
const HASH = /^[a-f0-9]{64}$/;
const STATUSES = new Set(['official', 'normalized', 'inferred', 'model-derived']);
// Linguistic scaffolding only. Domain aliases and dependencies belong to bundles.
const CONNECTIVES = new Set(('a an the and or but to of for from on in into at with without by as ' +
  'is are was were be been being has have had do does did will would can could should may might ' +
  'i we you they it its their this that these those what which who how why when where whether ' +
  'explain show describe compare find give tell please happens happen effect effects affect affects ' +
  'distinguish distinguishing difference differences between loss lost each all any some both ' +
  'trace conclusion conclusions relevant given following about against over under than then also ' +
  'need needed information evidence source sources question answer me my us our such so if not ' +
  'must meaning means mean regarding relates concerning details detail').split(' '));

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export async function contextSha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function bytes(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).length; }
function tokens(text: string, sensitive = false): string[] {
  const normal = text.normalize('NFKD').replace(/\p{M}/gu, '');
  return (sensitive ? normal : normal.toLocaleLowerCase('en-GB')).match(/[\p{L}\p{N}]+/gu) || [];
}
function http(value: unknown): boolean {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)
    || /[\s<>"'`\\^{}|]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.port !== '0';
  } catch { return false; }
}
function iri(value: unknown): boolean {
  return typeof value === 'string' && /^[a-z][a-z0-9+.-]*:[^\s<>"'`\\]+$/i.test(value);
}
function timestamp(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)) return false;
  if (!Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Invalid context index: ${message}`);
}
function fields(value: Record<string, unknown>, allowed: string[], label: string): void {
  assert(Object.keys(value).every((key) => allowed.includes(key)), `${label} has unsupported fields`);
}
function validateGovernance(row: Record<string, unknown>): void {
  const authority = row.authority as Record<string, unknown>;
  fields(authority, ['class', 'label', 'source'], 'authority');
  assert(Object.values(authority).every((v) => typeof v === 'string' && v.length <= 8000), 'invalid authority value');
  for (const provenance of row.provenance as Record<string, unknown>[]) {
    fields(provenance, ['url', 'source_sha256', 'locator', 'captured_at', 'source_date', 'source_date_kind', 'literal_sha256'], 'provenance');
    assert(Object.values(provenance).every((v) => typeof v === 'string' && v.length <= 8000), 'invalid provenance value');
  }
}

/** Structural validation rejects corrupt indexes; absent evidence is reported in the package. */
export function validateContextIndex(value: unknown, snapshot?: string): ContextIndex {
  assert(object(value) && value.schema === 'okf-context-index.v1', 'unsupported schema');
  fields(value, ['schema', 'bundle', 'scope', 'limitations', 'records', 'assertions', 'requirements'], 'index');
  assert(object(value.bundle) && iri(value.bundle.id) && typeof value.bundle.snapshot === 'string'
    && http(value.bundle.source_url), 'bundle identity is required');
  fields(value.bundle, ['id', 'snapshot', 'source_url'], 'bundle');
  assert(!snapshot || value.bundle.snapshot === snapshot, 'snapshot mismatch');
  assert(typeof value.scope === 'string' && value.scope.length <= 8000, 'scope is required');
  assert(Array.isArray(value.limitations) && value.limitations.length <= 100
    && value.limitations.every((v) => typeof v === 'string' && v.length <= 4000), 'invalid limitations');
  assert(Array.isArray(value.records) && value.records.length <= 10000, 'record limit');
  assert(Array.isArray(value.assertions) && value.assertions.length <= 30000, 'assertion limit');
  assert(Array.isArray(value.requirements) && value.requirements.length <= 500, 'requirement limit');
  assert(bytes(value) <= 4 * 1024 * 1024, 'index exceeds 4 MiB');
  const ids = new Set<string>();
  for (const row of value.records) {
    assert(object(row) && iri(row.id) && !ids.has(row.id as string), 'duplicate or invalid record ID');
    fields(row, ['id', 'route', 'label', 'kind', 'aliases', 'text', 'assertion_status', 'authority', 'scope',
      'provenance', 'rights', 'access', 'review_status', 'conflicts_with'], 'record');
    ids.add(row.id as string);
    assert(typeof row.route === 'string' && /^[a-z][a-z0-9-]*(?:\/[A-Za-z0-9._~-]+)+$/.test(row.route), 'unsafe record route');
    assert(typeof row.label === 'string' && row.label.length > 0 && row.label.length <= 500, 'invalid label');
    assert(['concept', 'evidence', 'scope'].includes(String(row.kind)), 'unknown record kind');
    assert(typeof row.text === 'string' && row.text.length <= 100000, 'invalid record text');
    assert(STATUSES.has(String(row.assertion_status)), 'unknown assertion status');
    assert(object(row.authority) && typeof row.scope === 'string', 'authority/scope shape');
    assert(Array.isArray(row.provenance) && row.provenance.length <= 32, 'provenance shape');
    assert(row.provenance.every(object), 'provenance entries must be objects');
    validateGovernance(row);
    assert(['public', 'restricted'].includes(String(row.access)), 'access must be explicit');
    assert(typeof row.rights === 'string', 'rights shape');
    assert(row.review_status === undefined || typeof row.review_status === 'string', 'invalid review status');
    assert(row.aliases === undefined || (Array.isArray(row.aliases) && row.aliases.length <= 100
      && row.aliases.every((alias) => typeof alias === 'string' ? alias.length <= 500
        : object(alias) && typeof alias.label === 'string' && alias.label.length <= 500
          && typeof alias.case_sensitive === 'boolean')), 'invalid aliases');
    for (const alias of (row.aliases || []) as unknown[]) {
      if (object(alias)) fields(alias, ['label', 'case_sensitive'], 'alias');
    }
    assert(row.conflicts_with === undefined || (Array.isArray(row.conflicts_with)
      && row.conflicts_with.length <= 100 && row.conflicts_with.every(iri)), 'invalid conflicts');
  }
  const assertionIds = new Set<string>();
  for (const row of value.assertions) {
    assert(object(row) && iri(row.id) && !assertionIds.has(row.id as string), 'duplicate or invalid assertion ID');
    fields(row, ['id', 'source', 'target', 'predicate', 'label', 'assertion_status', 'authority', 'scope', 'provenance', 'original_assertion_id'], 'assertion');
    assertionIds.add(row.id as string);
    assert(iri(row.source) && iri(row.target) && iri(row.predicate), 'invalid assertion endpoints or predicate');
    assert(typeof row.label === 'string' && typeof row.scope === 'string' && object(row.authority)
      && STATUSES.has(String(row.assertion_status)) && Array.isArray(row.provenance), 'invalid assertion governance');
    assert(row.provenance.length <= 32 && row.provenance.every(object), 'invalid assertion provenance');
    validateGovernance(row);
    assert(row.original_assertion_id === undefined || iri(row.original_assertion_id), 'invalid original assertion ID');
  }
  const requirementIds = new Set<string>();
  for (const row of value.requirements) {
    assert(object(row) && iri(row.id) && !requirementIds.has(row.id as string), 'duplicate or invalid requirement');
    fields(row, ['id', 'label', 'when_all', 'covers', 'required', 'required_paths', 'scope', 'limitations'], 'requirement');
    requirementIds.add(row.id as string);
    assert(typeof row.label === 'string' && typeof row.scope === 'string'
      && Array.isArray(row.when_all) && row.when_all.length > 0 && row.when_all.length <= 100
      && row.when_all.every(iri) && Array.isArray(row.required) && row.required.length > 0
      && row.required.length <= 200 && row.required.every(iri), 'invalid evidence requirement');
    assert(row.covers === undefined || (Array.isArray(row.covers) && row.covers.length <= 200
      && row.covers.every(iri)), 'invalid requirement concept coverage');
    if (row.required_paths !== undefined) {
      assert(Array.isArray(row.required_paths) && row.required_paths.length <= 100, 'invalid required paths');
      for (const path of row.required_paths) {
        assert(object(path), 'required path must be an object');
        fields(path, ['seed', 'assertions', 'records'], 'required path');
        assert(iri(path.seed) && Array.isArray(path.assertions) && path.assertions.length > 0
          && path.assertions.length <= 8 && path.assertions.every(iri) && Array.isArray(path.records)
          && path.records.length === path.assertions.length + 1 && path.records.every(iri)
          && path.records[0] === path.seed, 'invalid required directed path');
      }
    }
    assert(row.limitations === undefined || (Array.isArray(row.limitations)
      && row.limitations.length <= 100 && row.limitations.every((v) => typeof v === 'string')), 'invalid requirement limitations');
  }
  return value as unknown as ContextIndex;
}

export function normaliseContextBudget(input: Partial<ContextBudget> = {}): ContextBudget {
  if (!object(input)) throw new Error('Context budget must be an object');
  const result = { ...DEFAULT_CONTEXT_BUDGET };
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(result, key) || !Number.isInteger(value)) throw new Error(`Invalid context budget: ${key}`);
    const name = key as keyof ContextBudget;
    const minimum = name === 'max_bytes' ? 8192 : name === 'max_depth' ? 0 : 1;
    if (value < minimum || value > MAX_CONTEXT_BUDGET[name]) throw new Error(`Context budget ${key} outside ${minimum}–${MAX_CONTEXT_BUDGET[name]}`);
    result[name] = value;
  }
  return result;
}

export function resolveConcepts(index: ContextIndex, question: string): {
  resolved: ContextResolution[];
  ambiguities: ContextPackage['ambiguities'];
  unresolved: string[];
  truncated: boolean;
} {
  const query = tokens(question);
  const exact = tokens(question, true);
  type Alias = { key: string; ids: Set<string>; phrase: string[]; sensitive: boolean; label: string };
  const aliases = new Map<string, Alias>();
  for (const row of index.records.filter((r) => r.kind === 'concept' && r.access === 'public')) {
    for (const alias of [row.label, ...(row.aliases || [])]) {
      const sensitive = typeof alias !== 'string' && alias.case_sensitive;
      const label = typeof alias === 'string' ? alias : alias.label;
      const phrase = tokens(label, sensitive);
      if (!phrase.length) continue;
      const key = `${sensitive}:${phrase.join(' ')}`;
      const group = aliases.get(key) || { key, ids: new Set<string>(), phrase, sensitive: !!sensitive, label };
      group.ids.add(row.id);
      aliases.set(key, group);
    }
  }
  const byFirstToken = new Map<string, Alias[]>();
  for (const alias of aliases.values()) {
    const first = alias.phrase[0].toLocaleLowerCase('en-GB');
    const group = byFirstToken.get(first) || [];
    group.push(alias); byFirstToken.set(first, group);
  }
  const matches = new Map<string, { aliases: Alias[]; positions: number[]; label: string }>();
  let operations = 0;
  let truncated = false;
  matching: for (let start = 0; start < query.length; start++) {
    for (const alias of byFirstToken.get(query[start]) || []) {
      operations += alias.phrase.length;
      if (operations > MAX_RESOLUTION_OPERATIONS) { truncated = true; break matching; }
      const haystack = alias.sensitive ? exact : query;
      if (!alias.phrase.every((token, i) => haystack[start + i] === token)) continue;
      const key = `${start}:${alias.phrase.length}`;
      const match = matches.get(key) || { aliases: [], positions: alias.phrase.map((_, i) => start + i), label: alias.label };
      match.aliases.push(alias); matches.set(key, match);
    }
  }
  // Longest declared phrase wins for a span. This avoids an acronym or short
  // name stealing a more specific entity's words. Separate mentions still match.
  const accepted: Array<{ aliases: Alias[]; positions: number[]; label: string }> = [];
  const covered = new Set<number>();
  for (const match of [...matches.values()].sort((a, b) => b.positions.length - a.positions.length
    || a.positions[0] - b.positions[0] || a.label.localeCompare(b.label))) {
    if (match.positions.some((i) => covered.has(i))) continue;
    accepted.push(match);
    match.positions.forEach((i) => covered.add(i));
  }
  const byId = new Map(index.records.map((row) => [row.id, row]));
  const resolved = new Map<string, ContextResolution>();
  const ambiguities: ContextPackage['ambiguities'] = [];
  const seenPhrases = new Set<string>();
  for (const match of accepted) {
    const key = match.aliases.map((alias) => alias.key).sort().join('|');
    if (seenPhrases.has(key)) continue;
    seenPhrases.add(key);
    operations += match.aliases.reduce((count, alias) => count + alias.ids.size, 0);
    if (operations > MAX_RESOLUTION_OPERATIONS) { truncated = true; break; }
    const ids = new Set(match.aliases.flatMap((alias) => [...alias.ids]));
    if (ids.size > 1) {
      ambiguities.push({ phrase: match.label, candidates: [...ids].sort() });
      continue;
    }
    const id = [...ids][0];
    const row = resolved.get(id) || { id, label: byId.get(id)!.label, matched: [], method: 'declared-phrase', confidence: 'exact-alias' };
    if (!row.matched.includes(match.label)) row.matched.push(match.label);
    resolved.set(id, row);
  }
  return {
    resolved: [...resolved.values()].sort((a, b) => a.id.localeCompare(b.id)),
    ambiguities: ambiguities.sort((a, b) => a.phrase.localeCompare(b.phrase)),
    unresolved: [...new Set(query.filter((token, i) => !covered.has(i) && !CONNECTIVES.has(token)))].sort(),
    truncated
  };
}

function governanceIssues(row: ContextRecord | ContextAssertion): ContextIssue[] {
  const issues: ContextIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message, ids: [row.id] });
  if (!row.scope.trim()) add('missing_scope', 'The item has no declared applicability scope.');
  if (!row.authority.label || !http(row.authority.source) || !row.authority.class
      || row.authority.class === 'unclassified') add('missing_authority', 'The item has no classified, traceable authority.');
  const expected = row.assertion_status === 'official' ? ['official']
    : row.assertion_status === 'model-derived' ? ['model-assisted', 'synthetic'] : ['derived', 'synthetic'];
  if (!expected.includes(row.authority.class)) add('authority_mismatch', 'Assertion status and authority class disagree.');
  if (!row.provenance.length || row.provenance.some((p) => !object(p) || !http(p.url)
    || !HASH.test(p.source_sha256) || !p.locator || !timestamp(p.captured_at))) {
    add('missing_provenance', 'A source URL, digest, locator or capture date is missing or invalid.');
  }
  if ('kind' in row && !row.rights.trim()) add('missing_rights', 'No reuse basis is declared.');
  if ('kind' in row && row.kind === 'evidence'
    && (!row.text.trim() || !row.provenance.some((p) => HASH.test(p.literal_sha256 || '')))) {
    add('missing_evidence', 'Evidence requires a complete passage and a literal digest.');
  }
  return issues;
}

/** No fetch, model call, browser state or DWP-specific behaviour is allowed here. */
export async function assembleContext(
  raw: ContextIndex, question: string, requested: Partial<ContextBudget> = {}, binding?: ContextBinding,
  discovery?: ContextAssemblyOptions
): Promise<ContextPackage> {
  if (typeof question !== 'string' || !question.trim() || question.length > 4000) {
    throw new Error('Provide a question of 1–4000 characters.');
  }
  const index = validateContextIndex(raw);
  const limit = normaliseContextBudget(requested);
  const bound = binding || { index_url: index.bundle.source_url, index_sha256: await contextSha256(canonicalJson(index)) };
  if (!http(bound.index_url) || !HASH.test(bound.index_sha256)) throw new Error('Invalid context index binding');
  const resolution = resolveConcepts(index, question);
  const recordById = new Map(index.records.map((record) => [record.id, record]));
  const outgoing = new Map<string, ContextAssertion[]>();
  for (const assertion of [...index.assertions].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = outgoing.get(assertion.source) || [];
    list.push(assertion); outgoing.set(assertion.source, list);
  }
  const selected = new Map<string, ContextSelection>();
  const relationships = new Map<string, ContextAssertion>();
  const missing: ContextIssue[] = [];
  const omissions: ContextIssue[] = [];
  if (discovery) {
    assert(discovery.evidenceSeeds.length <= 32, 'too many lexical evidence seeds');
    assert(new Set(discovery.evidenceSeeds.map((seed) => seed.id)).size === discovery.evidenceSeeds.length,
      'duplicate lexical evidence seed');
    for (const seed of discovery.evidenceSeeds) {
      assert(recordById.get(seed.id)?.kind === 'evidence' && typeof seed.reason === 'string'
        && seed.reason.length > 0 && seed.reason.length <= 1000, 'invalid lexical evidence seed');
    }
    omissions.push(...discovery.retrieval.omissions);
  }
  if (resolution.truncated) omissions.push({ code: 'resolution_budget',
    message: 'Concept resolution reached its fixed comparison budget; interpretation is incomplete.', ids: [] });
  const queue: Array<{ id: string; path: ContextPath; reason: string }> = (discovery?.evidenceSeeds || []).map((row) => ({
    id: row.id, path: { seed: row.id, assertions: [], records: [row.id] }, reason: row.reason
  })).concat(resolution.resolved.map((row) => ({
    id: row.id, path: { seed: row.id, assertions: [], records: [row.id] },
    reason: `Declared phrase match: ${row.matched.join(', ')}`
  })));
  let depth = 0;
  const addIssue = (rows: ContextIssue[], issue: ContextIssue) => {
    if (!rows.some((r) => r.code === issue.code && r.ids.join('|') === issue.ids.join('|'))) rows.push(issue);
  };
  while (queue.length) {
    const item = queue.shift()!;
    const existing = selected.get(item.id);
    if (existing) {
      if (existing.paths.length < 4 && !existing.paths.some((p) => p.assertions.join('|') === item.path.assertions.join('|'))) {
        existing.paths.push(item.path);
        if (!existing.reasons.includes(item.reason)) existing.reasons.push(item.reason);
      }
      continue;
    }
    const record = recordById.get(item.id);
    if (!record) { addIssue(missing, { code: 'missing_record', message: 'A traversed destination is absent from this index.', ids: [item.id] }); continue; }
    if (record.access !== 'public') { addIssue(missing, { code: 'restricted_evidence', message: 'A required or reached item is not available for public context assembly.', ids: [item.id] }); continue; }
    if (selected.size >= limit.max_nodes) { addIssue(omissions, { code: 'node_budget', message: 'The node budget prevented inclusion.', ids: [item.id] }); continue; }
    selected.set(item.id, { record, reasons: [item.reason], paths: [item.path] });
    depth = Math.max(depth, item.path.assertions.length);
    governanceIssues(record).forEach((issue) => addIssue(missing, issue));
    if (record.kind === 'evidence') {
      const digest = await contextSha256(record.text);
      if (record.provenance.some((p) => p.literal_sha256 && p.literal_sha256 !== digest)) {
        addIssue(missing, { code: 'evidence_digest_mismatch', message: 'The passage does not match its declared literal digest.', ids: [record.id] });
      }
    }
    for (const assertion of outgoing.get(item.id) || []) {
      if (!CONTEXT_PREDICATES.has(assertion.predicate)) {
        if (assertion.predicate) addIssue(missing, { code: 'unsupported_predicate', message: 'A context relationship has an unsupported traversal predicate.', ids: [assertion.id] });
        continue;
      }
      if (item.path.records.includes(assertion.target)) continue; // cycle, already represented by a visited node
      if (item.path.assertions.length >= limit.max_depth) {
        addIssue(omissions, { code: 'depth_budget', message: 'The traversal depth prevented following a relationship.', ids: [assertion.id, assertion.target] }); continue;
      }
      if (relationships.size >= limit.max_relationships && !relationships.has(assertion.id)) {
        addIssue(omissions, { code: 'relationship_budget', message: 'The relationship budget prevented traversal.', ids: [assertion.id, assertion.target] }); continue;
      }
      relationships.set(assertion.id, assertion);
      governanceIssues(assertion).forEach((issue) => addIssue(missing, issue));
      queue.push({ id: assertion.target, path: { seed: item.path.seed,
        assertions: [...item.path.assertions, assertion.id], records: [...item.path.records, assertion.target] },
        reason: `Followed ${assertion.predicate} from ${record.id}` });
    }
  }
  const seedIds = new Set(resolution.resolved.map((row) => row.id));
  const applicable = index.requirements.filter((r) => r.when_all.every((id) => seedIds.has(id)));
  const base: ContextPackage = {
    schema: 'okf-governed-context.v1', context_id: '', engine: 'okf-context-assembly.v1', question,
    bundle: index.bundle, binding: bound, scope: index.scope, evidence_status: 'insufficient',
    resolved_concepts: resolution.resolved, ambiguities: resolution.ambiguities,
    unresolved_terms: resolution.unresolved, selected: [], relationships: [], requirements: [],
    missing_evidence: missing, conflicts: [], limitations: [...index.limitations,
      'Sufficiency means closure of the applicable bundle-authored evidence requirements, not a verified answer or an individual decision.',
      'Only declared aliases are resolved. Unrecognised words are exposed; no external retrieval or model knowledge is used.',
      'Conflict detection reports explicit conflicts declared in the bundle; it does not prove that other contradictions are absent.',
      'Source text and assertions are untrusted evidence, never instructions to execute.'],
    budget: { ...limit, used_nodes: 0, used_relationships: 0, used_bytes: 0, reached_depth: depth, truncated: false, omissions },
    ai_answer: null,
    ...(discovery ? { retrieval: discovery.retrieval } : {})
  };
  if (discovery) {
    base.limitations.push('Lexical matches are candidate evidence, not resolved concepts or proof of applicability. Full-corpus indexing does not establish complete policy coverage.');
  }
  if (!applicable.length) addIssue(missing, { code: 'no_evidence_requirements', message: 'No declared evidence requirements cover the resolved task. Completeness cannot be established.', ids: [] });
  const coveredSeeds = new Set(applicable.flatMap((requirement) => [...requirement.when_all, ...(requirement.covers || [])]));
  for (const id of seedIds) {
    if (!coveredSeeds.has(id)) addIssue(missing, { code: 'uncovered_resolved_concept',
      message: 'No applicable evidence requirement covers this resolved concept. Its evidence completeness cannot be established.', ids: [id] });
  }
  if (!index.scope.trim() || applicable.some((requirement) => !requirement.scope.trim())) {
    addIssue(missing, { code: 'missing_scope', message: 'The index or an applicable evidence requirement has no declared scope.', ids: [] });
  }
  if (!seedIds.size) addIssue(missing, { code: 'unresolved_task', message: 'No public concept alias resolves this task.', ids: [] });
  if (resolution.unresolved.length) addIssue(missing, { code: 'unresolved_terms', message: 'The question contains terms outside the declared concept vocabulary.', ids: [] });
  if (resolution.ambiguities.length) addIssue(missing, { code: 'ambiguous_concepts', message: 'At least one phrase has multiple candidate concepts; no candidate was chosen silently.', ids: resolution.ambiguities.flatMap((a) => a.candidates) });

  const refresh = () => {
    // Derived requirement diagnostics must be refreshed with the selection and
    // included in every size check. Previous diagnostics must not make retained
    // records look ungoverned or accumulate stale omissions after trimming.
    for (let i = missing.length - 1; i >= 0; i--) {
      if (missing[i].code === 'missing_required_evidence') missing.splice(i, 1);
    }
    base.selected = [...selected.values()];
    base.relationships = [...relationships.values()];
    base.requirements = applicable.map((r) => {
      const absent = new Set(r.required.filter((id) => !selected.has(id) || missing.some((m) => m.ids.includes(id))));
      for (const path of r.required_paths || []) {
        path.records.filter((id) => !selected.has(id)).forEach((id) => absent.add(id));
        for (let i = 0; i < path.assertions.length; i++) {
          const id = path.assertions[i];
          const edge = relationships.get(id);
          if (!edge || edge.source !== path.records[i] || edge.target !== path.records[i + 1]
            || missing.some((issue) => issue.ids.includes(id))) absent.add(id);
        }
      }
      return { ...r, missing: [...absent].sort(), status: absent.size ? 'insufficient' : 'supported-within-declared-scope' };
    });
    base.conflicts = [];
    for (const { record } of selected.values()) {
      for (const other of record.conflicts_with || []) {
        addIssue(base.conflicts, { code: 'declared_conflict', message: 'The bundle declares conflicting evidence; resolve scope before drawing a conclusion.', ids: [record.id, other].sort() });
      }
    }
    for (const assertion of relationships.values()) {
      if (assertion.predicate === REQUIRES && !selected.has(assertion.target)) {
        addIssue(missing, { code: 'missing_dependency', message: 'An explicitly required context dependency was not included.', ids: [assertion.source, assertion.target] });
      }
    }
    base.budget.used_nodes = selected.size;
    base.budget.used_relationships = relationships.size;
    base.budget.truncated = omissions.length > 0;
    base.evidence_status = base.conflicts.length ? 'conflicting'
      : !missing.length && !omissions.length && base.requirements.length
        && base.requirements.every((r) => r.status === 'supported-within-declared-scope') ? 'sufficient' : 'insufficient';
    for (const requirement of base.requirements) {
      if (requirement.missing.length) addIssue(missing, { code: 'missing_required_evidence',
        message: `Evidence required by ${requirement.label} was absent, omitted or lacked governance.`, ids: requirement.missing });
    }
  };
  refresh();
  // Reserve the hash and final byte-counter digits. Never cut an evidence passage.
  while (bytes(base) + 100 > limit.max_bytes && selected.size) {
    const id = [...selected.keys()].at(-1)!;
    selected.delete(id);
    for (const [key, edge] of relationships) if (edge.source === id || edge.target === id) relationships.delete(key);
    for (const [key, selection] of selected) {
      selection.paths = selection.paths.filter((path) => path.records.every((r) => selected.has(r)));
      if (!selection.paths.length) selected.delete(key);
    }
    addIssue(omissions, { code: 'byte_budget', message: 'A whole item was omitted to meet the package byte budget.', ids: [id] });
    refresh();
  }
  // Large indexes can themselves contain more diagnostic metadata than the
  // caller permits. Fail closed with a bounded diagnostic, not a partial answer.
  if (bytes(base) + 100 > limit.max_bytes) {
    base.selected = []; base.relationships = []; base.requirements = [];
    base.resolved_concepts = []; base.ambiguities = []; base.unresolved_terms = [];
    if (base.retrieval) base.retrieval = { ...base.retrieval, query_tokens: [], omitted_query_tokens: [], candidates: [], truncated: true, omissions: [{ code: 'metadata_budget', message: 'Retrieval details omitted at the package byte limit.', ids: [] }] };
    base.scope = 'The requested budget is too small for the package metadata.';
    base.limitations = ['No evidence or completeness claim is returned. Increase the byte budget to inspect the full diagnostics.'];
    base.conflicts = []; base.missing_evidence = [{ code: 'metadata_budget', message: 'Question interpretation and evidence diagnostics exceeded the byte budget.', ids: [] }];
    base.evidence_status = 'insufficient';
    base.budget = { ...limit, used_nodes: 0, used_relationships: 0, used_bytes: 0, reached_depth: depth, truncated: true,
      omissions: [{ code: 'byte_budget', message: 'The full result could not be represented within this budget.', ids: [] }] };
  }
  base.context_id = `urn:sha256:${await contextSha256(canonicalJson({ ...base, context_id: undefined, budget: { ...base.budget, used_bytes: undefined } }))}`;
  for (let i = 0; i < 4; i++) base.budget.used_bytes = bytes(base);
  if (base.budget.used_bytes > limit.max_bytes) throw new Error('The question and bundle identity exceed the minimum package budget.');
  return base;
}

export function explainContext(context: ContextPackage, recordId?: string): unknown {
  return recordId ? { context_id: context.context_id, evidence_status: context.evidence_status,
    item: context.selected.find((item) => item.record.id === recordId) || null,
    missing_evidence: context.missing_evidence.filter((item) => item.ids.includes(recordId)) }
    : context;
}
