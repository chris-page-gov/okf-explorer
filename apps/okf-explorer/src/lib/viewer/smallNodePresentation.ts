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

function isTableLine(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableDelimiter(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function renderTable(rows: string[], baseUrl: string): string {
  const headings = splitTableRow(rows[0]);
  const body = rows.slice(1).map(splitTableRow);
  return `<div class="markdown-table-wrap"><table><thead><tr>${headings.map((heading) => `<th>${inlineMarkdown(heading, baseUrl)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${headings.map((_heading, index) => `<td>${inlineMarkdown(row[index] || '', baseUrl)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function mermaidNodeToken(value: string, nodes: Map<string, string>): string {
  const token = value.trim().replace(/;$/, '');
  const match = /^([A-Za-z][A-Za-z0-9_-]*)(?:\["?([^\]]+?)"?\]|\((?:"?)([^)]+?)(?:"?)\))?$/.exec(token);
  if (!match) return '';
  const id = match[1];
  const label = (match[2] || match[3] || id).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (!nodes.has(id)) nodes.set(id, label);
  return id;
}

function wrapMermaidLabel(value: string): string[] {
  const lines: string[] = [];
  for (const sourceLine of value.split('\n')) {
    let line = '';
    for (const word of sourceLine.split(/\s+/)) {
      if (!word) continue;
      if (`${line} ${word}`.trim().length > 24) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [value];
}

function renderMermaidLite(source: string): string {
  const lines = source.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('%%'));
  const heading = lines.shift() || '';
  const mode = /^(?:flowchart|graph)\s+(LR|RL|TD|TB)$/i.exec(heading);
  if (!mode) return `<pre><code>${escapeHtml(source)}</code></pre>`;

  const nodes = new Map<string, string>();
  const edges: Array<[string, string]> = [];
  for (const line of lines) {
    const parts = line.replace(/;$/, '').split(/\s*(?:-->|==>|-\.->)\s*/);
    if (parts.length < 2) continue;
    const ids = parts.map((part) => mermaidNodeToken(part, nodes));
    for (let index = 0; index < ids.length - 1; index += 1) {
      if (ids[index] && ids[index + 1]) edges.push([ids[index], ids[index + 1]]);
    }
  }
  const ids = [...nodes.keys()];
  if (!ids.length) return `<pre><code>${escapeHtml(source)}</code></pre>`;

  const incoming = new Map(ids.map((id) => [id, 0]));
  edges.forEach(([, target]) => incoming.set(target, (incoming.get(target) || 0) + 1));
  const rank = new Map(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => !incoming.get(id));
  const visit = queue.length ? [...queue] : [...ids];
  let guard = 0;
  for (let index = 0; index < visit.length && guard < ids.length * ids.length * 4; index += 1, guard += 1) {
    const id = visit[index];
    for (const [sourceId, targetId] of edges) {
      const nextRank = Math.min(ids.length - 1, (rank.get(sourceId) || 0) + 1);
      if (sourceId === id && (rank.get(targetId) || 0) < nextRank) {
        rank.set(targetId, nextRank);
        visit.push(targetId);
      }
    }
  }

  const ranks = [...new Set(ids.map((id) => rank.get(id) || 0))].sort((left, right) => left - right);
  const reverse = ['RL', 'BT'].includes(mode[1].toUpperCase());
  if (reverse) ranks.reverse();
  const groups = new Map(ranks.map((value) => [value, ids.filter((id) => (rank.get(id) || 0) === value)]));
  const horizontal = ['LR', 'RL'].includes(mode[1].toUpperCase());
  const nodeW = 190;
  const nodeH = 76;
  const gapX = 62;
  const gapY = 34;
  const pad = 28;
  const maxGroup = Math.max(...ranks.map((value) => groups.get(value)?.length || 0));
  const width = horizontal
    ? pad * 2 + ranks.length * nodeW + Math.max(0, ranks.length - 1) * gapX
    : pad * 2 + maxGroup * nodeW + Math.max(0, maxGroup - 1) * gapX;
  const height = horizontal
    ? pad * 2 + maxGroup * nodeH + Math.max(0, maxGroup - 1) * gapY
    : pad * 2 + ranks.length * nodeH + Math.max(0, ranks.length - 1) * gapY;
  const positions = new Map<string, { x: number; y: number }>();
  ranks.forEach((value, rankIndex) => {
    (groups.get(value) || []).forEach((id, itemIndex) => {
      positions.set(id, horizontal
        ? { x: pad + rankIndex * (nodeW + gapX), y: pad + itemIndex * (nodeH + gapY) }
        : { x: pad + itemIndex * (nodeW + gapX), y: pad + rankIndex * (nodeH + gapY) });
    });
  });

  let hash = 0;
  for (const character of source) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  const marker = `mermaid-arrow-${Math.abs(hash)}`;
  let svg = `<svg class="mermaid-lite" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mermaid flowchart"><title>Flowchart generated from Mermaid source</title><defs><marker id="${marker}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path class="mermaid-arrow" d="M0,0 L10,4 L0,8 Z"></path></marker></defs>`;
  for (const [sourceId, targetId] of edges) {
    const sourcePoint = positions.get(sourceId);
    const targetPoint = positions.get(targetId);
    if (!sourcePoint || !targetPoint) continue;
    const sourceX = horizontal ? sourcePoint.x + nodeW : sourcePoint.x + nodeW / 2;
    const sourceY = horizontal ? sourcePoint.y + nodeH / 2 : sourcePoint.y + nodeH;
    const targetX = horizontal ? targetPoint.x : targetPoint.x + nodeW / 2;
    const targetY = horizontal ? targetPoint.y + nodeH / 2 : targetPoint.y;
    const control1X = horizontal ? sourceX + gapX * 0.45 : sourceX;
    const control1Y = horizontal ? sourceY : sourceY + gapY * 0.45;
    const control2X = horizontal ? targetX - gapX * 0.45 : targetX;
    const control2Y = horizontal ? targetY : targetY - gapY * 0.45;
    svg += `<path class="mermaid-edge" d="M${sourceX} ${sourceY} C${control1X} ${control1Y}, ${control2X} ${control2Y}, ${targetX} ${targetY}" marker-end="url(#${marker})"></path>`;
  }
  for (const id of ids) {
    const point = positions.get(id);
    if (!point) continue;
    const labelLines = wrapMermaidLabel(nodes.get(id) || id).slice(0, 4);
    const startY = point.y + nodeH / 2 - (labelLines.length - 1) * 7;
    svg += `<g class="mermaid-node"><rect x="${point.x}" y="${point.y}" width="${nodeW}" height="${nodeH}" rx="7"></rect><text text-anchor="middle">`;
    labelLines.forEach((line, index) => {
      svg += `<tspan x="${point.x + nodeW / 2}" y="${startY + index * 15}">${escapeHtml(line)}</tspan>`;
    });
    svg += '</text></g>';
  }
  return `${svg}</svg>`;
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
  let codeLanguage = '';

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

  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      flushParagraph();
      flushList();
      if (fenced) {
        const code = codeLines.join('\n');
        html.push(codeLanguage === 'mermaid' ? renderMermaidLite(code) : `<pre><code>${escapeHtml(code)}</code></pre>`);
        codeLines = [];
        codeLanguage = '';
      } else {
        codeLanguage = line.trim().replace(/^`+/, '').trim().toLowerCase();
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
    if (isTableLine(line) && isTableDelimiter(lines[index + 1] || '')) {
      flushParagraph();
      flushList();
      const rows = [line];
      index += 2;
      while (index < lines.length && isTableLine(lines[index])) {
        rows.push(lines[index]);
        index += 1;
      }
      index -= 1;
      html.push(renderTable(rows, baseUrl));
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
  if (fenced && codeLines.length) {
    const code = codeLines.join('\n');
    html.push(codeLanguage === 'mermaid' ? renderMermaidLite(code) : `<pre><code>${escapeHtml(code)}</code></pre>`);
  }
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
