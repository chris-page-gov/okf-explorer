import { describe, expect, it } from 'vitest';
import { hierarchyMembers, parseOntologyIndex, termLabel } from './ontologyIndex';

const source = 'urn:fixture:ontology';
const base = {
  schema: 'okf-ontology-navigation-index.v1',
  source,
  graph_sha256: 'a'.repeat(64),
  terms: [
    { id: 'urn:fixture:child', kinds: ['concept'], labels: [{ value: 'Llyfrgell', language: 'cy' }, { value: 'Library', language: 'en-gb' }] },
    { id: 'urn:fixture:parent', kinds: ['concept'], labels: [] }
  ],
  relationships: [{
    from: 'urn:fixture:child', to: 'urn:fixture:parent', predicate: 'http://www.w3.org/2004/02/skos/core#broader'
  }],
  mappings: [{
    from: 'urn:fixture:child', to: 'https://example.test/concepts/library',
    predicate: 'http://www.w3.org/2004/02/skos/core#closeMatch', strength: 'close'
  }]
};

describe('ontology navigation projections', () => {
  it('keeps only declared directions, identifies mapping strength and prefers the British English label', () => {
    const index = parseOntologyIndex(base, source);
    const child = index.byId.get('urn:fixture:child')!;
    expect(termLabel(child)).toBe('Library');
    expect(index.parents.get(child.id)).toMatchObject([{ to: 'urn:fixture:parent', names: { up: 'Broader concept' } }]);
    expect(index.children.get(child.id)).toBeUndefined();
    expect(index.mappings.get(child.id)).toMatchObject([{ strength: 'close' }]);
  });

  it('rejects mismatched sources, missing endpoints and changes of mapping strength', () => {
    expect(() => parseOntologyIndex(base, 'urn:wrong:bundle')).toThrow('mismatched source');
    expect(() => parseOntologyIndex({ ...base, terms: base.terms.slice(0, 1) }, source)).toThrow('declared terms');
    expect(() => parseOntologyIndex({ ...base, mappings: [{ ...base.mappings[0], strength: 'exact' }] }, source)).toThrow('Mapping strength');
  });

  it('follows only declared semantic paths and stops at cycles', () => {
    const scheme = 'urn:fixture:scheme';
    const child = 'urn:fixture:child';
    const parent = 'urn:fixture:parent';
    const property = 'urn:fixture:property';
    const index = parseOntologyIndex({
      ...base,
      terms: [
        ...base.terms.map(row => row.id === parent ? { ...row, kinds: ['concept', 'property'] } : row),
        { id: scheme, kinds: ['scheme'], labels: [] },
        { id: property, kinds: ['property'], labels: [] }
      ],
      relationships: [
        ...base.relationships,
        { from: parent, to: child, predicate: 'http://www.w3.org/2004/02/skos/core#broader' },
        { from: parent, to: scheme, predicate: 'http://www.w3.org/2004/02/skos/core#inScheme' },
        { from: property, to: parent, predicate: 'http://www.w3.org/2000/01/rdf-schema#subPropertyOf' }
      ]
    }, source);
    expect([...hierarchyMembers(index.children, scheme, false)]).toEqual([parent]);
    expect([...hierarchyMembers(index.children, scheme, true)]).toEqual([parent, child]);
  });
});
