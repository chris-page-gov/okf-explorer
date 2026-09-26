export type LegislationProvision = {
  key: string;
  id: string;
  sourceElement: string;
  normalizedType: string;
  number: string;
  title: string;
  text: string;
  ownText: string;
  excerpt: string;
  depth: number;
  parentId?: string;
  parentKey?: string;
  sourceIdUri?: string;
  sourceDocumentUri?: string;
  sourceVersion?: string;
  extent?: string;
  status?: string;
  officialUrl: string;
};

const STRUCTURAL_ELEMENTS = new Set([
  'PrimaryPrelims', 'SecondaryPrelims', 'EUPrelims', 'Body', 'EUBody',
  'Group', 'Part', 'Chapter', 'Pblock', 'PsubBlock',
  'P1group', 'P2group', 'P3group', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7',
  'Schedules', 'Schedule', 'Appendix', 'Attachments', 'Attachment',
  'ExplanatoryNotes', 'SignedSection', 'EUPart', 'EUTitle', 'EUChapter',
  'EUSection', 'EUSubsection', 'Division', 'Annex'
]);

export const MAX_CLML_BYTES = 8 * 1024 * 1024;
export const MAX_CLML_PROVISIONS = 20_000;
export const MAX_CLML_NESTING = 256;
export const MAX_CLML_ELEMENTS = 200_000;
export const PASSAGE_EXCERPT_CHARACTERS = 2400;

export async function readClmlBytes(response: Response): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length') || 0) > MAX_CLML_BYTES) {
    await response.body?.cancel();
    throw new Error('Official CLML exceeds the 8 MiB download limit.');
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_CLML_BYTES) throw new Error('Official CLML exceeds the 8 MiB download limit.');
    return bytes;
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_CLML_BYTES) {
      await reader.cancel();
      throw new Error('Official CLML exceeds the 8 MiB download limit.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

const TYPE_FROM_ID: Array<[RegExp, string]> = [
  [/(?:^|[-_])subsection(?:[-_]|$)/i, 'Subsection'],
  [/(?:^|[-_])subparagraph(?:[-_]|$)/i, 'Sub-paragraph'],
  [/(?:^|[-_])schedule(?:[-_]|$)/i, 'Schedule'],
  [/(?:^|[-_])appendix(?:[-_]|$)/i, 'Appendix'],
  [/(?:^|[-_])annex(?:[-_]|$)/i, 'Annex'],
  [/(?:^|[-_])part(?:[-_]|$)/i, 'Part'],
  [/(?:^|[-_])chapter(?:[-_]|$)/i, 'Chapter'],
  [/(?:^|[-_])section(?:[-_]|$)/i, 'Section'],
  [/(?:^|[-_])article(?:[-_]|$)/i, 'Article'],
  [/(?:^|[-_])regulation(?:[-_]|$)/i, 'Regulation'],
  [/(?:^|[-_])rule(?:[-_]|$)/i, 'Rule'],
  [/(?:^|[-_])paragraph(?:[-_]|$)/i, 'Paragraph']
];

function normalizedText(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function directChild(element: Element, names: string[]): Element | undefined {
  return Array.from(element.children).find((child) => names.includes(child.localName));
}

function passageText(element: Element, includeNested: boolean): string {
  const pieces: string[] = [];
  const visit = (node: Element) => {
    for (const item of Array.from(node.childNodes)) {
      if (item.nodeType === 3) {
        const value = normalizedText(item.textContent);
        if (value) pieces.push(value);
        continue;
      }
      if (item.nodeType !== 1) continue;
      const child = item as Element;
      if (!includeNested && child !== element && STRUCTURAL_ELEMENTS.has(child.localName)) continue;
      if (!includeNested && ['Number', 'Pnumber', 'Title'].includes(child.localName)) continue;
      if (child.localName === 'Text' || (child.localName === 'Para' && !Array.from(child.getElementsByTagName('*')).some((descendant) => descendant.localName === 'Text'))) {
        const value = normalizedText(child.textContent);
        if (value) pieces.push(value);
        continue;
      }
      visit(child);
    }
  };
  visit(element);
  return pieces.join(' ');
}

function safeOfficialUrl(value: string | null, documentUri: string): string | undefined {
  if (!value || !/^https?:\/\//i.test(value) || /[\s"'<>\\]/.test(value) || /%(?![\da-f]{2})/i.test(value)) return undefined;
  try {
    const url = new URL(value);
    const work = new URL(documentUri);
    const requestedVersion = /\/(\d{4}-\d{2}-\d{2}|enacted|made)\/?$/.exec(work.pathname)?.[1];
    const workPath = work.pathname.replace(/\/(?:\d{4}-\d{2}-\d{2}|enacted|made)\/?$/, '').replace(/\/$/, '');
    if (!['legislation.gov.uk', 'www.legislation.gov.uk'].includes(url.hostname) ||
      !['legislation.gov.uk', 'www.legislation.gov.uk'].includes(work.hostname) ||
      url.username || url.password || url.port || url.search ||
      !url.pathname.startsWith(`${workPath}/`) ||
      (requestedVersion && !url.pathname.endsWith(`/${requestedVersion}`))) return undefined;
    url.protocol = 'https:';
    return url.href;
  } catch { return undefined; }
}

export function officialDocumentUrl(value: string): string {
  if (!value || !/^https?:\/\//i.test(value) || /[\s"'<>\\]/.test(value) || /%(?![\da-f]{2})/i.test(value)) return '';
  try {
    const url = new URL(value);
    if (!['legislation.gov.uk', 'www.legislation.gov.uk'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash) return '';
    url.protocol = 'https:';
    return url.href.replace(/\/$/, '');
  } catch { return ''; }
}

export function provisionType(sourceElement: string, id = ''): string {
  if (/^P[2-7]$/.test(sourceElement)) return `Nested provision (${sourceElement})`;
  let semanticMatch: { index: number; label: string } | undefined;
  for (const [pattern, label] of TYPE_FROM_ID) {
    const match = pattern.exec(id);
    if (match && (!semanticMatch || match.index >= semanticMatch.index)) semanticMatch = { index: match.index, label };
  }
  if (semanticMatch) return semanticMatch.label;
  const explicit: Record<string, string> = {
    P1: 'Provision', P2: 'Sub-provision', P3: 'Sub-provision', P4: 'Sub-provision',
    P5: 'Sub-provision', P6: 'Sub-provision', P7: 'Sub-provision',
    P1group: 'Provision group', P2group: 'Sub-provision group', P3group: 'Sub-provision group',
    Pblock: 'Provision block', PsubBlock: 'Provision sub-block',
    PrimaryPrelims: 'Primary preliminaries', SecondaryPrelims: 'Secondary preliminaries',
    EUPrelims: 'EU preliminaries', EUBody: 'EU body', EUPart: 'EU part',
    EUTitle: 'EU title', EUChapter: 'EU chapter', EUSection: 'EU section',
    EUSubsection: 'EU subsection', SignedSection: 'Signed section'
  };
  return explicit[sourceElement] || sourceElement.replace(/([a-z])([A-Z])/g, '$1 $2');
}

export function provisionPathFromId(id: string): string {
  const normalized = id.toLowerCase().replace(/_/g, '-');
  const segments: string[] = [];
  const pattern = /(?:^|-)(schedule|appendix|annex|part|chapter|section|article|regulation|rule|paragraph)-([a-z0-9.]+)/g;
  for (const match of normalized.matchAll(pattern)) segments.push(match[1], match[2]);
  return segments.length ? `/${segments.join('/')}` : '';
}

export function provisionOfficialUrl(documentUri: string, id: string): string {
  const base = officialDocumentUrl(documentUri);
  if (!base) return '';
  const path = provisionPathFromId(id);
  const normalizedId = id.toLowerCase().replace(/_/g, '-');
  const representedId = path.replace(/^\//, '').replaceAll('/', '-');
  const nestedFragment = Boolean(path) && normalizedId !== representedId;
  const date = /^(.*?)(\/(?:\d{4}-\d{2}-\d{2}|enacted|made))$/.exec(base);
  const root = date ? date[1] : base;
  const alreadySelected = Boolean(path) && (root.endsWith(path) || root.includes(`${path}/`));
  const passage = `${root}${alreadySelected ? '' : path}${date ? date[2] : ''}`;
  return `${passage}${!path || nestedFragment ? `#${encodeURIComponent(id)}` : ''}`;
}

export function parseClml(xml: string, documentUri: string): LegislationProvision[] {
  if (new TextEncoder().encode(xml).byteLength > MAX_CLML_BYTES) throw new Error('Official CLML exceeds the 8 MiB parse limit. Open the official source directly.');
  if (/<!DOCTYPE/i.test(xml)) throw new Error('Official CLML contains a document type declaration that this Reader cannot safely process.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = Array.from(document.getElementsByTagName('*')).find((item) => item.localName === 'parsererror');
  if (parserError) throw new Error(`Official CLML could not be parsed: ${normalizedText(parserError.textContent)}`);

  const pending: Array<{ element: Element; depth: number }> = document.documentElement ? [{ element: document.documentElement, depth: 0 }] : [];
  let elementCount = 0;
  while (pending.length) {
    const { element, depth } = pending.pop()!;
    if (depth > MAX_CLML_NESTING) throw new Error('Official CLML exceeds the nesting limit. Open the official source directly.');
    if (++elementCount > MAX_CLML_ELEMENTS) throw new Error('Official CLML exceeds the XML element limit. Open the official source directly.');
    for (const child of Array.from(element.children)) pending.push({ element: child, depth: depth + 1 });
  }

  const provisions: LegislationProvision[] = [];
  const walk = (element: Element, depth: number, parentId?: string, parentKey?: string, xmlDepth = 0) => {
    if (xmlDepth > MAX_CLML_NESTING) throw new Error('Official CLML exceeds the nesting limit. Open the official source directly.');
    let nextDepth = depth;
    let nextParent = parentId;
    let nextParentKey = parentKey;
    if (STRUCTURAL_ELEMENTS.has(element.localName)) {
      if (provisions.length >= MAX_CLML_PROVISIONS) throw new Error('Official CLML exceeds the structural element limit. Open the official source directly.');
      const id = element.getAttribute('id') || element.getAttribute('Id') || `${element.localName}-${provisions.length + 1}`;
      const key = String(provisions.length);
      const number = normalizedText(directChild(element, ['Number', 'Pnumber'])?.textContent);
      const title = normalizedText(directChild(element, ['Title'])?.textContent);
      const ownText = passageText(element, false);
      const text = passageText(element, true);
      provisions.push({
        key,
        id,
        sourceElement: element.localName,
        normalizedType: provisionType(element.localName, id),
        number,
        title,
        text,
        ownText,
        excerpt: text.slice(0, PASSAGE_EXCERPT_CHARACTERS),
        depth,
        parentId,
        parentKey,
        sourceIdUri: element.getAttribute('IdURI') || undefined,
        sourceDocumentUri: element.getAttribute('DocumentURI') || undefined,
        sourceVersion: element.getAttribute('Version') || undefined,
        extent: element.getAttribute('RestrictExtent') || undefined,
        status: element.getAttribute('Status') || undefined,
        officialUrl: safeOfficialUrl(element.getAttribute('DocumentURI'), documentUri) || provisionOfficialUrl(documentUri, id)
      });
      nextDepth = depth + 1;
      nextParent = id;
      nextParentKey = key;
    }
    for (const child of Array.from(element.children)) walk(child, nextDepth, nextParent, nextParentKey, xmlDepth + 1);
  };
  if (document.documentElement) walk(document.documentElement, 0);
  return provisions;
}
