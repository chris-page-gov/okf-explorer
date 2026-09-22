import type { NormalizedCorpus, OkfNode } from '$lib/types';

export type LearningPresentation = {
  schema: 'okf-learning-presentation.v1';
  start_route: string;
  title: string;
  introduction: string;
  facets: { key: string; label: string }[];
  groups: { title: string; description: string; routes: string[] }[];
};

const plain = (value: unknown, max = 240): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Opt-in presentation only: never infer domain meaning from paths or labels. */
export function learningPresentation(corpus: NormalizedCorpus | null): LearningPresentation | null {
  const raw = object(corpus?.meta?.learning_presentation);
  if (!corpus || raw?.schema !== 'okf-learning-presentation.v1') return null;
  const start = plain(raw.start_route);
  if (!Object.hasOwn(corpus.nodes, start)) return null;
  const seen = new Set<string>();
  const facets = (Array.isArray(raw.facets) ? raw.facets : []).slice(0, 12).flatMap(value => {
    const entry = object(value), key = plain(entry?.key, 40), label = plain(entry?.label, 80);
    if (!/^[a-z][a-z0-9_-]*$/.test(key) || ['type', 'trust', 'lifecycle', 'section', 'constructor', 'prototype'].includes(key) || !label || seen.has(key)) return [];
    seen.add(key);
    return [{ key, label }];
  });
  const groups = (Array.isArray(raw.groups) ? raw.groups : []).slice(0, 12).flatMap(value => {
    const group = object(value), title = plain(group?.title, 120);
    const routes = [...new Set((Array.isArray(group?.routes) ? group.routes : [])
      .filter((route): route is string => typeof route === 'string' && Object.hasOwn(corpus.nodes, route)))].slice(0, 24);
    return title && routes.length ? [{ title, description: plain(group?.description, 600), routes }] : [];
  });
  if (!facets.length || !groups.length) return null;
  return { schema: 'okf-learning-presentation.v1', start_route: start,
    title: plain(raw.title) || corpus.title, introduction: plain(raw.introduction, 1200), facets, groups };
}

export function initialSmallRoute(corpus: NormalizedCorpus, requested = ''): string {
  return requested && Object.hasOwn(corpus.nodes, requested) ? requested
    : learningPresentation(corpus)?.start_route || Object.keys(corpus.nodes)[0] || '';
}

export function conceptualFacetValues(node: OkfNode, key: string): string[] {
  const facets = object(node.learning_facets);
  if (!facets || !Object.hasOwn(facets, key)) return [];
  const raw = facets[key];
  return [...new Set((Array.isArray(raw) ? raw : [raw])
    .filter((value): value is string => typeof value === 'string')
    .map(value => plain(value, 160)).filter(Boolean))].slice(0, 40);
}
