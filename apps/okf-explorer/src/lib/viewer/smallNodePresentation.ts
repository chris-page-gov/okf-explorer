import type { OkfNode } from '$lib/types';

export type SmallNodeLink = {
  label: string;
  url: string;
  kind: 'source' | 'resource';
};

export type SmallNodeMetadataRow = {
  key: string;
  label: string;
  value: unknown;
};

const SECRET_QUERY_KEY = /^(?:api[-_]?key|access[-_]?token|auth|authorization|client[-_]?secret|key|password|secret|signature|sig|token)$/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function valueString(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function safeSmallNodeUrl(value: unknown, baseUrl = ''): string {
  const candidate = valueString(value);
  if (!candidate) return '';
  try {
    const base = /^https?:\/\//i.test(baseUrl) ? baseUrl : undefined;
    const url = new URL(candidate, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_QUERY_KEY.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return '';
  }
}

function inlineMarkdown(value: string, baseUrl: string): string {
  const tokens: string[] = [];
  const token = (html: string) => {
    const index = tokens.push(html) - 1;
    return `\u0000OKF${index}\u0000`;
  };
  const linked = value
    .replace(/`([^`]+)`/g, (_match, code: string) => token(`<code>${escapeHtml(code)}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, label: string, href: string) => {
      const safeUrl = safeSmallNodeUrl(href, baseUrl);
      const safeLabel = escapeHtml(label);
      return token(safeUrl
        ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`
        : safeLabel);
    });
  return escapeHtml(linked)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>')
    .replace(/\u0000OKF(\d+)\u0000/g, (_match, index: string) => tokens[Number(index)] || '');
}

export function renderSafeMarkdown(value: unknown, baseUrl = ''): string {
  const markdown = valueString(value).replace(/\r\n?/g, '\n');
  if (!markdown) return '';

  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | '' = '';
  let listItems: string[] = [];
  let fenced = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '), baseUrl)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listType || !listItems.length) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item, baseUrl)}</li>`).join('')}</${listType}>`);
    listType = '';
    listItems = [];
  };

  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) {
      flushParagraph();
      flushList();
      if (fenced) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
      }
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2], baseUrl)}</h${level}>`);
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push('<hr>');
      continue;
    }
    const unordered = /^\s*[-+*]\s+(.+)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? 'ul' : 'ol';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered || ordered)?.[1] || '');
      continue;
    }
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(quote[1], baseUrl)}</blockquote>`);
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  if (fenced && codeLines.length) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  flushParagraph();
  flushList();
  return html.join('');
}

export function smallNodeSearchText(node: OkfNode): string {
  return [
    node.title,
    node.id,
    ...(node.aliases || []),
    node.description,
    node.summary,
    ...(node.tags || []),
    node.body
  ].map((value) => valueString(value)).filter(Boolean).join(' ');
}

export function smallNodeLinks(node: OkfNode, bundleUrl = ''): SmallNodeLink[] {
  const links: SmallNodeLink[] = [];
  const seen = new Set<string>();
  const add = (label: string, value: unknown, kind: SmallNodeLink['kind']) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => add(`${label}${index ? ` ${index + 1}` : ''}`, item, kind));
      return;
    }
    const record = objectValue(value);
    const candidate = record
      ? record.url || record.download_url || record.href || record.access_url || record.accessURL || record.content_url || record.contentUrl || record['@id']
      : value;
    const url = safeSmallNodeUrl(candidate, bundleUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const recordLabel = record && valueString(record.title || record.name || record.label || record.format);
    links.push({ label: recordLabel || label.trim() || (kind === 'source' ? 'Source' : 'Resource'), url, kind });
  };

  const schema = objectValue(node.schema);
  const provenance = objectValue(node.provenance);

  add('Source', node.source, 'source');
  add('Source URL', node.source_url, 'source');
  add('Landing page', node.landing_page || node.landingPage, 'source');
  add('Documentation', node.documentation_url || node.documentation, 'source');
  add('Schema.org URL', node.url, 'source');
  add('Schema.org URL', schema?.url || schema?.['@id'], 'source');
  add('Schema.org sameAs', node.same_as || node.sameAs, 'source');
  add('Schema.org sameAs', schema?.same_as || schema?.sameAs, 'source');
  add('Provenance source', provenance?.source_url || provenance?.source, 'source');
  add('Resource', node.resource, 'resource');

  const resources = Array.isArray(node.resources) ? node.resources : [];
  for (const [index, resource] of resources.entries()) {
    if (typeof resource === 'string') {
      add(`Resource ${index + 1}`, resource, 'resource');
      continue;
    }
    const record = objectValue(resource);
    if (!record) continue;
    const label = valueString(record.title || record.name || record.label || record.format) || `Resource ${index + 1}`;
    add(label, record, 'resource');
  }
  return links;
}

export function smallNodeMetadataRows(node: OkfNode): SmallNodeMetadataRow[] {
  const rows: SmallNodeMetadataRow[] = [];
  const add = (key: string, label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ key, label, value });
  };
  const schema = objectValue(node.schema);
  add('schema_org_type', 'Schema.org type', node.schema_org_type || node.schemaOrgType || node.schema_type || node.schemaType || node['@type'] || schema?.['@type'] || schema?.type);
  add('schema_org_id', 'Schema.org ID', node['@id'] || schema?.['@id']);
  add('identifier', 'Identifier', node.identifier);
  add('publisher', 'Publisher', node.publisher);
  add('license', 'Licence', node.license || node.licence);
  add('date_modified', 'Date modified', node.date_modified || node.dateModified);
  add('spatial_coverage', 'Spatial coverage', node.spatial_coverage || node.spatialCoverage);
  add('temporal_coverage', 'Temporal coverage', node.temporal_coverage || node.temporalCoverage);

  const provenance = objectValue(node.provenance);
  if (provenance) {
    add('provenance.source', 'Provenance source', provenance.source || provenance.source_url);
    add('provenance.retrieved_at', 'Retrieved', provenance.retrieved_at || provenance.observed_at || provenance.generated_at);
    add('provenance.method', 'Provenance method', provenance.method || provenance.collector);
    add('provenance.confidence', 'Provenance confidence', provenance.confidence);
  }
  return rows;
}
