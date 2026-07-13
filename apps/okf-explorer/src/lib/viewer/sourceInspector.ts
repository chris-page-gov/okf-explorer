export interface SourceSummaryRow {
  label: string;
  value: string;
}

export interface SourceSummary {
  title: string;
  description: string;
  rows: SourceSummaryRow[];
  tags: string[];
}

export function sourcePayload(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return isRecord(value.result) ? value.result : value;
}

export function sourceSummary(value: unknown, fallbackTitle: string): SourceSummary {
  const root = isRecord(value) ? value : null;
  const payload = sourcePayload(value);
  if (!payload) return { title: fallbackTitle, description: '', rows: [], tags: [] };

  const organization = isRecord(payload.organization) ? payload.organization : null;
  const resources = Array.isArray(payload.resources) ? payload.resources : [];
  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .map((tag) => (isRecord(tag) ? stringValue(tag.display_name || tag.name) : stringValue(tag)))
        .filter(Boolean)
    : [];
  const rows: SourceSummaryRow[] = [];
  addSummaryRow(rows, 'Source status', root && typeof root.success === 'boolean' ? (root.success ? 'Successful response' : 'Unsuccessful response') : '');
  addSummaryRow(rows, 'Identifier', stringValue(payload.id || payload.name));
  addSummaryRow(rows, 'Publisher', stringValue(organization?.title || organization?.name || payload.publisher_title || payload.publisher));
  addSummaryRow(rows, 'Licence', stringValue(payload.license_title || payload.license_id));
  addSummaryRow(rows, 'Created', stringValue(payload.metadata_created || payload.created));
  addSummaryRow(rows, 'Last modified', stringValue(payload.metadata_modified || payload.modified));
  if (Array.isArray(payload.resources)) addSummaryRow(rows, 'Resources', resources.length.toLocaleString());

  return {
    title: stringValue(payload.title || payload.name) || fallbackTitle,
    description: stringValue(payload.notes || payload.description),
    rows,
    tags
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function isJsonContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object';
}

export function jsonEntries(value: unknown): Array<[string, unknown]> {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  return isRecord(value) ? Object.entries(value) : [];
}

export function jsonCollectionLabel(value: Record<string, unknown> | unknown[]): string {
  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  return Array.isArray(value) ? `[${count.toLocaleString()}]` : `{${count.toLocaleString()}}`;
}

export function jsonScalarText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return JSON.stringify(value) ?? String(value);
}

export function jsonPath(parent: string, key: string): string {
  if (/^\d+$/.test(key)) return `${parent}[${key}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${parent}.${key}`;
  return `${parent}[${JSON.stringify(key)}]`;
}

export function jsonNodeMatches(key: string, value: unknown, path: string, rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return true;
  if (`${key} ${path}`.toLocaleLowerCase().includes(query)) return true;
  if (!isJsonContainer(value)) return jsonScalarText(value).toLocaleLowerCase().includes(query);
  return jsonEntries(value).some(([childKey, childValue]) => jsonNodeMatches(childKey, childValue, jsonPath(path, childKey), query));
}

export function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function addSummaryRow(rows: SourceSummaryRow[], label: string, value: string) {
  if (value) rows.push({ label, value });
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
