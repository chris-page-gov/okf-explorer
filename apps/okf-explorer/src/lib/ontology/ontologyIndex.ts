import {
  boundedText, contentDigest, namedIri, objectRow, readBoundPublicationJson, readGovernedDescriptor
} from '$lib/sources/governedDescriptor';

export const termKinds = ['class', 'property', 'concept', 'scheme'] as const;
export type TermKind = typeof termKinds[number];
export const kindLabels: Record<TermKind, string> = {
  class: 'Classes', property: 'Properties', concept: 'Concepts', scheme: 'Concept schemes'
};
const rdfs = 'http://www.w3.org/2000/01/rdf-schema#';
const skos = 'http://www.w3.org/2004/02/skos/core#';

const hierarchy = new Map<string, { source: TermKind; target: TermKind; up: string; down: string }>([
  [rdfs + 'subClassOf', { source: 'class', target: 'class', up: 'Superclass', down: 'Subclass' }],
  [rdfs + 'subPropertyOf', { source: 'property', target: 'property', up: 'Superproperty', down: 'Subproperty' }],
  [skos + 'broader', { source: 'concept', target: 'concept', up: 'Broader concept', down: 'Narrower concept' }],
  [skos + 'inScheme', { source: 'concept', target: 'scheme', up: 'Concept scheme', down: 'Scheme member' }]
]);

export const mappingStrengths = ['exact', 'close', 'broad', 'narrow', 'related'] as const;
export type MappingStrength = typeof mappingStrengths[number];

export type Term = { id: string; kinds: TermKind[]; labels: Array<{ value: string; language: string }> };
export type HierarchyEdge = {
  from: string; to: string; predicate: string;
  names: { source: TermKind; target: TermKind; up: string; down: string };
};
export type Mapping = { from: string; to: string; predicate: string; strength: MappingStrength };

export const isTermKind = (value: unknown): value is TermKind => termKinds.some(kind => kind === value);
export const isMappingStrength = (value: unknown): value is MappingStrength => mappingStrengths.some(strength => strength === value);

function rows(value: unknown, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error('Ontology index exceeds its declared collection limits');
  return value;
}

function distinctKey(previous: Set<string>, parts: string[]) {
  const key = parts.join('\u0000');
  if (previous.has(key)) throw new Error('Ontology index contains duplicate terms or edges');
  previous.add(key);
}

export function termLabel(term: Term): string {
  return (term.labels.find(row => row.language.toLowerCase() === 'en-gb')
    || term.labels.find(row => row.language.toLowerCase() === 'en')
    || term.labels[0])?.value || term.id;
}

export function parseOntologyIndex(value: unknown, expectedBundle: string) {
  const raw = objectRow(value);
  if (raw.schema !== 'okf-ontology-navigation-index.v1' || raw.source !== expectedBundle) {
    throw new Error('Unsupported ontology index or mismatched source identity');
  }
  const graphDigest = contentDigest(raw.graph_sha256);
  const byId = new Map<string, Term>();
  const terms = rows(raw.terms, 12_000).map(objectRow).map((row): Term => {
    const id = namedIri(row.id);
    const kinds = rows(row.kinds, termKinds.length);
    if (byId.has(id) || !kinds.length || !kinds.every(isTermKind) || new Set(kinds).size !== kinds.length) {
      throw new Error('Invalid or duplicate ontology term');
    }
    const labels = rows(row.labels, 12).map(objectRow).map(label => {
      if (typeof label.language !== 'string' || (label.language && !/^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$/.test(label.language))) {
        throw new Error('Invalid label language');
      }
      return { value: boundedText(label.value, 1000), language: label.language };
    });
    const term = { id, kinds, labels };
    byId.set(id, term);
    return term;
  });

  const parents = new Map<string, HierarchyEdge[]>();
  const children = new Map<string, HierarchyEdge[]>();
  const seenHierarchy = new Set<string>();
  for (const row of rows(raw.relationships, 30_000).map(objectRow)) {
    const from = namedIri(row.from);
    const to = namedIri(row.to);
    const predicate = namedIri(row.predicate);
    const names = hierarchy.get(predicate);
    if (!names || !byId.get(from)?.kinds.includes(names.source) || !byId.get(to)?.kinds.includes(names.target)) {
      throw new Error('Hierarchy edges require declared terms and a supported predicate');
    }
    distinctKey(seenHierarchy, [from, predicate, to]);
    const edge = { from, to, predicate, names };
    const upstream = parents.get(from) || [];
    upstream.push(edge);
    parents.set(from, upstream);
    const downstream = children.get(to) || [];
    downstream.push(edge);
    children.set(to, downstream);
  }

  const mappings = new Map<string, Mapping[]>();
  const seenMappings = new Set<string>();
  for (const row of rows(raw.mappings, 30_000).map(objectRow)) {
    const from = namedIri(row.from);
    const to = namedIri(row.to);
    const predicate = namedIri(row.predicate);
    if (!byId.get(from)?.kinds.includes('concept') || !isMappingStrength(row.strength) ||
        predicate !== skos + row.strength + 'Match') {
      throw new Error('Mapping strength must match the declared SKOS predicate');
    }
    distinctKey(seenMappings, [from, predicate, to]);
    const forward = mappings.get(from) || [];
    forward.push({ from, to, predicate, strength: row.strength });
    mappings.set(from, forward);
  }

  return {
    graphDigest, terms: terms.sort((left, right) => termLabel(left).localeCompare(termLabel(right), 'en-GB') || left.id.localeCompare(right.id)),
    byId, parents, children, mappings
  };
}

export async function loadOntology(value: string, pageOrigin: string) {
  const descriptor = await readGovernedDescriptor(value, pageOrigin);
  if (!descriptor.entrypoints.ontology_navigation) throw new Error('This bundle has no published ontology navigation index');
  const { document, ...resource } = await readBoundPublicationJson(descriptor.entrypoints.ontology_navigation, descriptor.url);
  return { ...parseOntologyIndex(document, descriptor.bundle), descriptor, resource };
}

export function ontologyLink(descriptor: string): string {
  return '../ontology/?' + new URLSearchParams({ bundle: descriptor });
}
