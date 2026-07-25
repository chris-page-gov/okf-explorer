import type { OkfNode } from '$lib/types';

export type OkfTrustTier = 'unverified' | 'machine-confirmed' | 'human-reviewed';
export type OkfLifecycleStatus = 'draft' | 'stable' | 'deprecated';

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
  status: OkfLifecycleStatus;
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

function dateOnly(value: unknown): string {
  const candidate = stringValue(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return '';
  const [year, month, day] = candidate.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? candidate
    : '';
}

function validActor(value: unknown): boolean {
  const candidate = stringValue(value);
  return /^(?:human|process):[^\s:]+$/.test(candidate)
    || /^[^/\s:]+\/[^/\s]+$/.test(candidate);
}

function validDateTime(value: unknown): boolean {
  const candidate = stringValue(value);
  const match = candidate.match(
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/
  );
  return Boolean(match && dateOnly(match[1]) && !Number.isNaN(Date.parse(candidate)));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(stringValue).filter(Boolean)
    : [];
}

export function normalizeVerified(value: unknown): OkfActorEvent[] {
  const candidates = Array.isArray(value) ? value : recordValue(value) ? [value] : [];
  return candidates
    .map(recordValue)
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({ ...item, by: stringValue(item.by), at: stringValue(item.at) }))
    // Malformed optional metadata remains consumable, but it must never
    // upgrade a concept's trust tier.
    .filter((item) => validActor(item.by) && validDateTime(item.at));
}

export function deriveTrustTier(verified: OkfActorEvent[]): OkfTrustTier {
  if (!verified.length) return 'unverified';
  return verified.some((event) => event.by.startsWith('human:'))
    ? 'human-reviewed'
    : 'machine-confirmed';
}

export function conceptGenerated(node: OkfNode): OkfGenerated {
  if (Object.prototype.hasOwnProperty.call(node, 'generated')) {
    const generated = recordValue(node.generated);
    return {
      by: stringValue(generated?.by),
      at: stringValue(generated?.at),
      basis: 'okf-v0.2'
    };
  }
  const timestamp = stringValue(node.timestamp);
  if (timestamp) return { by: '', at: timestamp, basis: 'legacy-v0.1-timestamp' };
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
  const from = dateOnly(row.from);
  const to = dateOnly(row.to);
  return from || to ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : undefined;
}

export function normalizeSources(node: OkfNode): OkfSource[] {
  if (Object.prototype.hasOwnProperty.call(node, 'sources')) {
    if (!Array.isArray(node.sources)) return [];
    return node.sources
      .map(recordValue)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        ...item,
        resource: stringValue(item.resource),
        ...(stringValue(item.id) ? { id: stringValue(item.id) } : {}),
        ...(stringValue(item.title) ? { title: stringValue(item.title) } : {}),
        ...(stringValue(item.author) ? { author: stringValue(item.author) } : {}),
        ...(typeof item.usage_count === 'number' ? { usage_count: item.usage_count } : {}),
        ...(dateOnly(item.last_modified) ? { last_modified: dateOnly(item.last_modified) } : {}),
        ...(normalizedUsageWindow(item.usage_window) ? { usage_window: normalizedUsageWindow(item.usage_window) } : {})
      }))
      .filter((item) => Boolean(item.resource));
  }
  return legacyCitationSources(node.body);
}

export function isConceptStale(staleAfter: unknown, today = new Date()): boolean {
  const staleDate = dateOnly(staleAfter);
  if (!staleDate) return false;
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');
  return localToday >= staleDate;
}

export function normalizeAttestedComputation(node: OkfNode): OkfAttestedComputation | undefined {
  if (stringValue(node.type).toLowerCase() !== 'attested computation') return undefined;
  const executor = recordValue(node.executor);
  const attester = recordValue(node.attester);
  const parameters = Array.isArray(node.parameters)
    ? node.parameters
        .map(recordValue)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => ({
          ...item,
          name: stringValue(item.name),
          type: stringValue(item.type),
          required: item.required === true
        }))
    : [];
  const computation = stringValue(node.computation);
  const inlineComputation = /(?:^|\n)#\s+Computation\s*(?:\n|$)[\s\S]*?```[\s\S]*?```/i.test(stringValue(node.body));
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
  if (parameters.some((parameter) => !parameter.name || !parameter.type)) {
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

export function okfConceptPresentation(node: OkfNode, today = new Date()): OkfConceptPresentation {
  const verified = normalizeVerified(node.verified);
  const statusValue = stringValue(node.status);
  const status: OkfLifecycleStatus = statusValue === 'draft' || statusValue === 'deprecated'
    ? statusValue
    : 'stable';
  const staleAfter = dateOnly(node.stale_after);
  return {
    generated: conceptGenerated(node),
    verified,
    trustTier: deriveTrustTier(verified),
    status,
    staleAfter,
    stale: isConceptStale(staleAfter, today),
    sources: normalizeSources(node),
    usageWindow: normalizedUsageWindow(node.usage_window),
    attestedComputation: normalizeAttestedComputation(node)
  };
}

export function trustTierLabel(value: OkfTrustTier): string {
  if (value === 'human-reviewed') return 'Human reviewed';
  if (value === 'machine-confirmed') return 'Machine confirmed';
  return 'Unverified';
}
