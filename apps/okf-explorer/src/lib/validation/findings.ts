import type { LargeResourceReference } from '$lib/types';
import { isLargeCorpusDescriptor } from '$lib/sources/descriptor';
import { baseUrlFor, fetchJsonResource, readResponseText } from '$lib/sources/fetch';
import { safeRelativeResourcePath, sha256Hex } from '$lib/sources/releaseDataPlane';
import { routeHash } from '$lib/viewer/routeHash';
import { citationUrl } from '$lib/viewer/okfPlusContext';

export const severities = ['violation', 'warning', 'info'] as const;
export type Severity = typeof severities[number];
type Binding = Exclude<LargeResourceReference, string> & { sha256: string; bytes: number };
type Finding = {
  id: string;
  bundle: string;
  severity: Severity;
  focus: string;
  shape: string;
  path: string | null;
  constraint: string;
  occurrences: number;
};
type Source = { bundle: string; descriptor: string; route: string; evidence: string };
type Review = { remediation: string; sources: Source[] };

const digestPattern = /^[0-9a-f]{64}$/;
export const isFindingId = (value: string) => digestPattern.test(value);
export const isSeverity = (value: unknown): value is Severity => severities.some(severity => severity === value);
const maxResourceBytes = 2 * 1024 * 1024;
const maxDescriptorBytes = 128 * 1024;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a validation object');
  return value as Record<string, unknown>;
}

function text(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('Invalid validation text');
  }
  return value;
}

function digest(value: unknown): string {
  if (typeof value !== 'string' || !isFindingId(value)) throw new Error('Invalid validation digest');
  return value;
}

function iri(value: unknown): string {
  const named = text(value, 2048);
  if (/^urn:[^\s<>"\\]+$/i.test(named) || webIri(named)) return named;
  throw new Error('Invalid validation IRI');
}

export function webIri(value: string): string | undefined {
  return citationUrl(value.replace(/^https?:/i, scheme => scheme.toLowerCase())) ?? undefined;
}

function descriptorUrl(value: unknown, pageOrigin: string): URL {
  const publicUrl = webIri(text(value, 2048));
  if (!publicUrl) throw new Error('Use a public HTTPS descriptor URL or a full URL from this site');
  const url = new URL(publicUrl);
  if (url.hash ||
      (url.protocol !== 'https:' && (url.protocol !== 'http:' || url.origin !== pageOrigin))) {
    throw new Error('Use a public HTTPS descriptor URL or a full URL from this site');
  }
  return url;
}

function integer(value: unknown, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error('Invalid validation count or byte length');
  }
  return value;
}

function binding(value: unknown): Binding {
  const row = object(value);
  const path = safeRelativeResourcePath(text(row.path, 300), 'Validation resource path');
  if (!path.endsWith('.json')) throw new Error('Expected a relative validation JSON resource');
  return { path, sha256: digest(row.sha256), bytes: integer(row.bytes, maxResourceBytes) };
}

export async function parseFindings(value: unknown, expectedBundle: string) {
  const report = object(value);
  if (report.schema !== 'okf-shacl-findings.v1' || report.bundle !== expectedBundle ||
      typeof report.conforms !== 'boolean' || !Array.isArray(report.findings) ||
      report.findings.length > 2000 || report.conforms !== (report.findings.length === 0)) {
    throw new Error('Unsupported SHACL report or mismatched bundle identity');
  }
  const reportSha256 = digest(report.report_sha256);
  const findings: Finding[] = [];
  for (const row of report.findings.map(object)) {
    if (!isSeverity(row.severity) || row.bundle !== expectedBundle) throw new Error('Invalid finding severity or bundle');
    const id = digest(row.id);
    const fields = {
      bundle: expectedBundle,
      constraint: iri(row.constraint),
      focus: iri(row.focus),
      path: row.path === null ? null : iri(row.path),
      severity: row.severity,
      shape: iri(row.shape)
    };
    if (findings.length && id <= findings[findings.length - 1].id) throw new Error('Findings must be unique and ordered by ID');
    findings.push({ id, ...fields, occurrences: integer(row.occurrences, 20_000) });
  }
  await Promise.all(findings.map(async ({ id, occurrences: _, ...fields }) => {
    if (await sha256Hex(JSON.stringify(fields) + '\n') !== id) throw new Error('Finding ID does not match its evidence');
  }));
  return { conforms: report.conforms, reportSha256, findings };
}

function parseReview(value: unknown, findings: Finding[], expectedDigest: string, pageOrigin: string): Map<string, Review> {
  const document = object(value);
  if (document.schema !== 'okf-shacl-review.v1' || document.findings_sha256 !== expectedDigest ||
      !Array.isArray(document.findings) || document.findings.length > findings.length) {
    throw new Error('Review guidance must identify this exact findings projection');
  }
  const knownFindings = new Set(findings.map(finding => finding.id));
  const reviews = new Map<string, Review>();
  for (const row of document.findings.map(object)) {
    const id = digest(row.id);
    if (!knownFindings.has(id) || reviews.has(id) || !Array.isArray(row.sources) || row.sources.length < 1 || row.sources.length > 16) {
      throw new Error('Review guidance must identify one known finding and its sources');
    }
    const sources = row.sources.map(object).map((source): Source => {
      const descriptor = descriptorUrl(source.descriptor, pageOrigin).href;
      const evidence = iri(source.evidence);
      const route = text(source.record_route, 512);
      if (!/^[a-z][a-z0-9-]*(?:\/(?:[A-Za-z0-9._~-]|%[0-9a-fA-F]{2})+)+$/.test(route) || !webIri(evidence)) {
        throw new Error('Review sources need an Explorer record route and a public evidence URL');
      }
      return { bundle: iri(source.bundle), descriptor, route, evidence };
    });
    const sourceKeys = new Set(sources.map(source => JSON.stringify(source)));
    if (sourceKeys.size !== sources.length) throw new Error('Review guidance contains duplicate sources');
    reviews.set(id, { remediation: text(row.remediation, 1500), sources });
  }
  return reviews;
}

export async function loadValidation(value: string, pageOrigin: string) {
  const descriptor = descriptorUrl(value, pageOrigin);
  const response = await fetch(descriptor, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(8000) });
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || !['application/json', 'application/ld+json'].includes(contentType || '')) {
    throw new Error('Could not read the bundle descriptor as JSON');
  }
  const raw = object(JSON.parse(await readResponseText(response, descriptor.href, maxDescriptorBytes)));
  if (!isLargeCorpusDescriptor(raw)) throw new Error('This view requires a large-corpus descriptor');
  const bundle = iri(raw['@id']);
  const entrypoints = object(raw.entrypoints);
  if (!entrypoints.shacl_findings) throw new Error('This bundle has no published SHACL findings');
  const findingsRef = binding(entrypoints.shacl_findings);
  const base = baseUrlFor(descriptor.href);
  const options = {
    rejectRedirects: true, credentials: 'omit' as const, attempts: 1, timeoutMs: 8000,
    acceptedMediaTypes: ['application/json', 'application/ld+json']
  };
  const parsed = await parseFindings(await fetchJsonResource(findingsRef, base, options), bundle);
  const review = entrypoints.shacl_review
    ? parseReview(await fetchJsonResource(binding(entrypoints.shacl_review), base, options), parsed.findings, findingsRef.sha256, pageOrigin)
    : new Map<string, Review>();
  return {
    ...parsed, bundle, title: text(raw.title, 256), descriptor: descriptor.href,
    projectionUrl: new URL(findingsRef.path, base).href, projectionSha256: findingsRef.sha256, review
  };
}

export function validationLink(descriptor: string): string {
  return '../validation/?' + new URLSearchParams({ bundle: descriptor });
}

export function sourceRecordLink(descriptor: string, route = ''): string {
  return '../explore/?' + new URLSearchParams({ bundle: descriptor }) + (route ? '#' + routeHash(route) : '');
}
