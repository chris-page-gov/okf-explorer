export type LegislationProvision = {
  id: string;
  sourceElement: string;
  normalizedType: string;
  number: string;
  title: string;
  text: string;
  depth: number;
  parentId?: string;
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

function ownPassageText(element: Element): string {
  const pieces: string[] = [];
  const visit = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (child !== element && STRUCTURAL_ELEMENTS.has(child.localName)) continue;
      if (['Text', 'Para', 'Pnumber', 'Number', 'Title'].includes(child.localName)) {
        const value = normalizedText(child.textContent);
        if (value) pieces.push(value);
        if (child.localName === 'Text') continue;
      }
      visit(child);
    }
  };
  visit(element);
  return normalizedText([...new Set(pieces)].join(' ')).slice(0, 2400);
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
  const pattern = /(schedule|appendix|annex|part|chapter|section|article|regulation|rule|paragraph)-([a-z0-9.]+)/g;
  for (const match of normalized.matchAll(pattern)) segments.push(match[1], match[2]);
  return segments.length ? `/${segments.join('/')}` : '';
}

export function provisionOfficialUrl(documentUri: string, id: string): string {
  const base = documentUri.replace(/\/$/, '');
  const path = provisionPathFromId(id);
  const normalizedId = id.toLowerCase().replace(/_/g, '-');
  const representedId = path.replace(/^\//, '').replaceAll('/', '-');
  const nestedFragment = Boolean(path) && normalizedId !== representedId;
  return path ? `${base}${path}${nestedFragment ? `#${encodeURIComponent(id)}` : ''}` : `${base}#${encodeURIComponent(id)}`;
}

export function parseClml(xml: string, documentUri: string): LegislationProvision[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = Array.from(document.getElementsByTagName('*')).find((item) => item.localName === 'parsererror');
  if (parserError) throw new Error(`Official CLML could not be parsed: ${normalizedText(parserError.textContent)}`);

  const provisions: LegislationProvision[] = [];
  const walk = (element: Element, depth: number, parentId?: string) => {
    let nextDepth = depth;
    let nextParent = parentId;
    if (STRUCTURAL_ELEMENTS.has(element.localName)) {
      const id = element.getAttribute('id') || element.getAttribute('Id') || `${element.localName}-${provisions.length + 1}`;
      const number = normalizedText(directChild(element, ['Number', 'Pnumber'])?.textContent);
      const title = normalizedText(directChild(element, ['Title'])?.textContent);
      provisions.push({
        id,
        sourceElement: element.localName,
        normalizedType: provisionType(element.localName, id),
        number,
        title,
        text: ownPassageText(element),
        depth,
        parentId,
        extent: element.getAttribute('RestrictExtent') || undefined,
        status: element.getAttribute('Status') || undefined,
        officialUrl: provisionOfficialUrl(documentUri, id)
      });
      nextDepth = depth + 1;
      nextParent = id;
    }
    for (const child of Array.from(element.children)) walk(child, nextDepth, nextParent);
  };
  if (document.documentElement) walk(document.documentElement, 0);
  return provisions;
}
