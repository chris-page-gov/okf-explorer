import type { SearchResultDoc } from '$lib/types';

function firstText(element: Element, localName: string): string {
  const found = Array.from(element.getElementsByTagName('*')).find((item) => item.localName === localName);
  return String(found?.textContent || '').replace(/\s+/g, ' ').trim();
}

function linksFor(entry: Element): Record<string, string> {
  const links: Record<string, string> = {};
  for (const link of Array.from(entry.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'link'))) {
    const href = (link.getAttribute('href') || '').replace(/^http:/, 'https:');
    const media = link.getAttribute('type') || '';
    const rel = link.getAttribute('rel') || '';
    if (!href) continue;
    if (!rel) links.document = href;
    if (rel === 'alternate' && media === 'application/xml') links.clml = href;
    if (rel === 'alternate' && media === 'text/html') links.website = href;
    if (rel.includes('tableOfContents')) links.table_of_contents = href;
  }
  return links;
}

export function parseOfficialSearch(xml: string): SearchResultDoc[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const entries = Array.from(document.getElementsByTagNameNS('http://www.w3.org/2005/Atom', 'entry'));
  return entries.map((entry, index) => {
    const id = firstText(entry, 'id').replace(/^http:/, 'https:');
    const path = new URL(id).pathname.replace(/^\/id\//, '').split('/');
    const [typeCode = 'unknown', year = '', number = ''] = path;
    const links = linksFor(entry);
    const documentUri = links.document || id.replace('/id/', '/');
    const title = firstText(entry, 'title') || id;
    return {
      ordinal: -(index + 1),
      name: path.join('-'),
      title,
      publisher: 'official-full-text-search',
      publisher_title: 'legislation.gov.uk full-text search',
      resource_count: 0,
      formats: ['clml', 'website'],
      tags: [typeCode, `year-${year}`],
      topics: [],
      timestamp: firstText(entry, 'updated'),
      notes: firstText(entry, 'summary'),
      record_type: 'Legislation Work',
      source_tier: 'official-publication-api',
      source_adapter: 'legislation_gov_uk_atom_full_text_search',
      confidence: 'authoritative-source',
      dcat_type: 'eli:LegalResource',
      protocol: ['Atom', 'CLML'],
      documentation: 'https://legislation.github.io/data-documentation/api/search.html',
      url: documentUri,
      open: `dataset/${path.join('-')}`,
      legislation_id_uri: id,
      document_uri: documentUri,
      structure_url: links.clml || `${documentUri.replace(/\/$/, '')}/data.xml`,
      table_of_contents_url: links.table_of_contents,
      type_code: typeCode,
      year,
      number,
      category: 'official-search-match',
      jurisdiction: [],
      legal_status: 'Consult point-in-time and unapplied-effects metadata',
      schema_org_type: 'schema:Legislation',
      eli_class: 'eli:LegalResource',
      manifestations: links,
      official_full_text_match: true
    };
  });
}

export async function searchOfficialLegislation(template: string, query: string): Promise<SearchResultDoc[]> {
  const url = template.replace('{query}', encodeURIComponent(query));
  const response = await fetch(url, { headers: { Accept: 'application/atom+xml, application/xml;q=0.9' } });
  if (!response.ok) throw new Error(`Official full-text search failed (${response.status})`);
  return parseOfficialSearch(await response.text());
}
