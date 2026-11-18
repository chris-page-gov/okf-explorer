import {
  contentDigest as digest, descriptorUrl, namedIri as iri, objectRow as object,
  boundedText as text, readBoundPublicationJson, readGovernedDescriptor, sha256Pattern, webIri
} from '$lib/sources/governedDescriptor';
import { sha256Hex } from '$lib/sources/releaseDataPlane';
import { routeHash } from '$lib/viewer/routeHash';

export { webIri };

export const severities = ['violation', 'warning', 'info'] as const;
export type Severity = typeof severities[number];
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

export const isFindingId = (value: string) => sha256Pattern.test(value);
export const isSeverity = (value: unknown): value is Severity => severities.some(severity => severity === value);

function integer(value: unknown, maximum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error('Invalid validation count');
  }
  return value;
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
  const { url: descriptor, bundle, title, entrypoints } = await readGovernedDescriptor(value, pageOrigin);
  if (!entrypoints.shacl_findings) throw new Error('This bundle has no published SHACL findings');
  const projection = await readBoundPublicationJson(entrypoints.shacl_findings, descriptor);
  const parsed = await parseFindings(projection.document, bundle);
  const reviewResource = entrypoints.shacl_review
    ? await readBoundPublicationJson(entrypoints.shacl_review, descriptor)
    : undefined;
  const review = reviewResource
    ? parseReview(reviewResource.document, parsed.findings, projection.sha256, pageOrigin)
    : new Map<string, Review>();
  return {
    ...parsed, bundle, title, descriptor,
    projectionUrl: projection.url, projectionSha256: projection.sha256, review
  };
}

export function validationLink(descriptor: string): string {
  return '../validation/?' + new URLSearchParams({ bundle: descriptor });
}

export function sourceRecordLink(descriptor: string, route = ''): string {
  return '../explore/?' + new URLSearchParams({ bundle: descriptor }) + (route ? '#' + routeHash(route) : '');
}
