import type { OkfNode } from '$lib/types';

export type OkfTrustTier = 'unverified' | 'machine-confirmed' | 'human-reviewed';

export type OkfActorEvent = {
  by: string;
  at: string;
  [key: string]: unknown;
};

export type OkfUsageWindow = {
  from?: string;
  to?: string;
};

export type OkfSource = {
  id?: string;
  resource: string;
  title?: string;
  author?: string;
  usage_count?: number;
  last_modified?: string;
  usage_window?: OkfUsageWindow;
  legacy?: boolean;
  [key: string]: unknown;
};

export type OkfGenerated = {
  by: string;
  at: string;
  basis: 'okf-v0.2' | 'legacy-v0.1-timestamp' | 'not-declared';
};

export type OkfAttestedComputation = {
  declared: boolean;
  runtime: string;
  parameters: Array<{ name: string; type: string; required: boolean; [key: string]: unknown }>;
  computation: string;
  inlineComputation: boolean;
  executorResource: string;
  receiptFields: string[];
  attesterResource: string;
  contractWarnings: string[];
};

export type OkfConceptPresentation = {
  generated: OkfGenerated;
  verified: OkfActorEvent[];
  trustTier: OkfTrustTier;
  status: string;
  malformedStaleAfter: boolean;
  staleAfter: string;
  stale: boolean;
  sources: OkfSource[];
  usageWindow?: OkfUsageWindow;
  attestedComputation?: OkfAttestedComputation;
};

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';
}

// Keep the fractional second separate: RFC 3339 can carry more precision
// than JavaScript Date. Offset-equivalent instants compare identically.
function instant(value: unknown): { second: number; fraction: string } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})(?:[Tt]((?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)(?:\.(\d+))?([Zz]|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.exec(value);
  if (!match) return undefined;
  const [, date, time = '00:00:00', fraction = '', offset = 'Z'] = match;
  const midnight = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== date) return undefined;
  return { second: Date.parse(date + 'T' + time + offset.toUpperCase()), fraction: fraction.replace(/0+$/, '') };
}

function compareInstants(a: NonNullable<ReturnType<typeof instant>>, b: NonNullable<ReturnType<typeof instant>>): number {
  if (a.second !== b.second) return a.second - b.second;
  if (a.fraction === b.fraction) return 0;
  return a.fraction < b.fraction ? -1 : 1;
}

function absent(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && !value.length);
}

function rows(value: unknown): Record<string, unknown>[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(recordValue).filter((row): row is Record<string, unknown> => Boolean(row));
}

function validActor(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:\S+$/.test(value) || /^[^/\s:]+\/[^/\s]+$/.test(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(stringValue).filter(Boolean)
    : [];
}

export function normalizeVerified(value: unknown): OkfActorEvent[] {
  return rows(value)
    .filter(item => typeof item.by === 'string' && validActor(item.by) && instant(item.at))
    .map(item => ({ ...item, by: String(item.by), at: String(item.at) }));
}

export function deriveTrustTier(verified: OkfActorEvent[], generated?: unknown): OkfTrustTier {
  const changed = instant(recordValue(generated)?.at);
  if (!absent(generated) && !changed) return 'unverified';
  let tier: OkfTrustTier = 'unverified';
  for (const event of verified) {
    const checked = instant(event.at);
    if (!checked || !validActor(event.by) || (changed && compareInstants(checked, changed) < 0)) continue;
    if (event.by.startsWith('human:')) return 'human-reviewed';
    tier = 'machine-confirmed';
  }
  return tier;
}

export function conceptGenerated(node: OkfNode, legacy = true): OkfGenerated {
  if (Object.prototype.hasOwnProperty.call(node, 'generated')) {
    const generated = recordValue(node.generated);
    return {
      by: stringValue(generated?.by),
      at: stringValue(generated?.at),
      basis: 'okf-v0.2'
    };
  }
  const timestamp = stringValue(node.timestamp);
  if (legacy && timestamp) return { by: '', at: timestamp, basis: 'legacy-v0.1-timestamp' };
  return { by: '', at: '', basis: 'not-declared' };
}

function legacyCitationSources(body: unknown): OkfSource[] {
  const lines = stringValue(body).replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((line) => /^#{1,6}\s+Citations\s*$/i.test(line.trim()));
  if (start < 0) return [];
  const headingLevel = (lines[start].match(/^#+/) || [''])[0].length;
  const sources: OkfSource[] = [];
  for (const line of lines.slice(start + 1)) {
    const heading = line.match(/^(#+)\s+/);
    if (heading && heading[1].length <= headingLevel) break;
    const item = line.match(/^\s*[-*+]\s+(.+?)\s*$/);
    if (!item) continue;
    const markdownLink = item[1].match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    const rawResource = markdownLink?.[2] || item[1].replace(/^<|>$/g, '');
    if (!rawResource) continue;
    sources.push({
      resource: rawResource,
      ...(markdownLink?.[1] ? { title: markdownLink[1] } : {}),
      legacy: true
    });
  }
  return sources;
}

function normalizedUsageWindow(value: unknown): OkfUsageWindow | undefined {
  const row = recordValue(value);
  if (!row) return undefined;
  const from = instant(row.from) ? String(row.from) : undefined;
  const to = instant(row.to) ? String(row.to) : undefined;
  return from || to ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : undefined;
}

export function normalizeSources(node: OkfNode, legacy = true): OkfSource[] {
  if (Object.prototype.hasOwnProperty.call(node, 'sources')) {
    return rows(node.sources)
      .map((item) => ({
        ...item,
        resource: stringValue(item.resource),
        ...(stringValue(item.id) ? { id: stringValue(item.id) } : {}),
        ...(stringValue(item.title) ? { title: stringValue(item.title) } : {}),
        ...(stringValue(item.author) ? { author: stringValue(item.author) } : {}),
        ...(typeof item.usage_count === 'number' ? { usage_count: item.usage_count } : {}),
        ...(instant(item.last_modified) ? { last_modified: String(item.last_modified) } : {}),
        ...(normalizedUsageWindow(item.usage_window) ? { usage_window: normalizedUsageWindow(item.usage_window) } : {})
      }))
      .filter((item) => Boolean(item.resource));
  }
  return legacy ? legacyCitationSources(node.body) : [];
}

export function isConceptStale(staleAfter: unknown, today = new Date()): boolean {
  if (absent(staleAfter)) return false;
  const deadline = instant(staleAfter);
  const now = instant(today.toISOString());
  return !deadline || !now || compareInstants(now, deadline) >= 0;
}

function hasInlineComputation(body: string): boolean {
  let section = 0;
  let fence = '';
  for (const line of body.split(/\r?\n/)) {
    if (fence) {
      const trimmed = line.replace(/^ {0,3}/, '').trimEnd();
      if (trimmed.length >= fence.length && [...trimmed].every(char => char === fence[0])) fence = '';
      continue;
    }
    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
      if (section) return true;
      fence = opening[1];
      continue;
    }
    const heading = /^ {0,3}(#{1,6})(?:[ \t]+(.*)|$)/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const title = (heading[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '').trim();
      if (title === 'Computation') section = level;
      else if (level <= section) section = 0;
    }
  }
  return false;
}

export function normalizeAttestedComputation(node: OkfNode): OkfAttestedComputation | undefined {
  if (stringValue(node.type).toLowerCase() !== 'attested computation') return undefined;
  const executor = recordValue(node.executor);
  const attester = recordValue(node.attester);
  const declaredParameters = rows(node.parameters).map((item) => ({
    ...item,
    name: stringValue(item.name),
    type: stringValue(item.type),
    required: item.required === true
  }));
  const parameters = declaredParameters.filter(parameter => parameter.name && parameter.type);
  const computation = stringValue(node.computation);
  const inlineComputation = !computation && hasInlineComputation(stringValue(node.body));
  const runtime = stringValue(node.runtime);
  const executorResource = stringValue(executor?.resource);
  const attesterResource = stringValue(attester?.resource);
  const receiptFields = stringList(executor?.receipt);
  const warnings: string[] = [];
  if (!runtime) warnings.push('Runtime is not declared.');
  if (!computation && !inlineComputation) warnings.push('No computation file or inline Computation fence is declared.');
  if (!executorResource) warnings.push('Executor instructions are not declared.');
  if (!receiptFields.length) warnings.push('Executor receipt fields are not declared.');
  if (!attesterResource) warnings.push('Deterministic attester code is not declared.');
  if (parameters.length !== declaredParameters.length) {
    warnings.push('One or more parameters lack a name or type.');
  }
  return {
    declared: true,
    runtime,
    parameters,
    computation,
    inlineComputation,
    executorResource,
    receiptFields,
    attesterResource,
    contractWarnings: warnings
  };
}

export function okfConceptPresentation(node: OkfNode, today = new Date(), version = ''): OkfConceptPresentation {
  const legacy = ['', '0.1', '0.2'].includes(version);
  const verified = normalizeVerified(node.verified);
  const status = absent(node.status) ? 'stable' : stringValue(node.status) || 'Unknown';
  const staleAfter = absent(node.stale_after) ? '' : stringValue(node.stale_after);
  return {
    generated: conceptGenerated(node, legacy),
    verified,
    trustTier: deriveTrustTier(verified, node.generated),
    status,
    staleAfter,
    stale: isConceptStale(node.stale_after, today),
    malformedStaleAfter: !absent(node.stale_after) && !instant(node.stale_after),
    sources: normalizeSources(node, legacy),
    usageWindow: normalizedUsageWindow(node.usage_window),
    attestedComputation: normalizeAttestedComputation(node)
  };
}

export function trustTierLabel(value: OkfTrustTier): string {
  if (value === 'human-reviewed') return 'Human reviewed';
  if (value === 'machine-confirmed') return 'Machine confirmed';
  return 'Unverified';
}
