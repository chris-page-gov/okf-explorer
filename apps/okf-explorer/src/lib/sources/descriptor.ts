const LARGE_CORPUS_SCHEMA = 'okf-explorer-large-corpus.v1';
const LARGE_CORPUS_KIND = 'okf-large-corpus';

export type RelatedDescriptorLink = {
  label: string;
  url: string;
  kind: string;
};

const MAX_RELATED_LINKS = 8;
const MAX_RELATED_LINK_LABEL = 120;
const MAX_RELATED_LINK_URL = 2048;

/** Return only bounded, canonical HTTPS links declared by this descriptor. */
export function parseRelatedDescriptorLinks(value: unknown): RelatedDescriptorLink[] {
  if (!Array.isArray(value)) return [];
  const links: RelatedDescriptorLink[] = [];
  for (const candidate of value.slice(0, MAX_RELATED_LINKS)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const row = candidate as Record<string, unknown>;
    const { label, url, kind } = row;
    if (typeof label !== 'string' || label.length < 1 || label.length > MAX_RELATED_LINK_LABEL || label.trim() !== label || /[\u0000-\u001f\u007f]/.test(label)) continue;
    if (typeof kind !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(kind)) continue;
    if (typeof url !== 'string' || url.length < 1 || url.length > MAX_RELATED_LINK_URL || /[\s\u0000-\u001f\u007f"'<>\\]/.test(url) || /%(?![0-9a-fA-F]{2})/.test(url)) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || parsed.href !== url) continue;
    } catch {
      continue;
    }
    links.push({ label, url, kind });
  }
  return links;
}

export function isLargeCorpusDescriptor(
  value: Record<string, unknown>
): boolean {
  const schema = typeof value.schema === 'string' ? value.schema : '';
  const kind = typeof value.kind === 'string' ? value.kind : '';
  const declaresLargeSchema = schema.startsWith('okf-explorer-large-corpus.');
  const declaresLargeKind = kind === LARGE_CORPUS_KIND;

  if (declaresLargeSchema !== declaresLargeKind) {
    throw new Error(
      `Large-corpus descriptor identity mismatch: schema ${schema || '<missing>'} and kind ${kind || '<missing>'}`
    );
  }
  if (declaresLargeKind && schema !== LARGE_CORPUS_SCHEMA) {
    throw new Error(`Unsupported large-corpus descriptor schema: ${schema || '<missing>'}`);
  }
  return declaresLargeKind;
}
