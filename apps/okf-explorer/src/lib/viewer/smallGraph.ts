import type { NormalizedCorpus, OkfNode } from '$lib/types';

/** Inspection never enters this function: only an explicit focus changes the neighbourhood. */
export function focusedSmallGraph(corpus: NormalizedCorpus | null, scope: OkfNode[], focus: string, folded: ReadonlySet<string> = new Set()) {
  const available = scope.filter(node => !folded.has(node.id));
  const focusNode = available.find(node => node.id === focus);
  const neighbours = new Set(corpus?.relationships.filter(row => row.source === focus || row.target === focus)
    .flatMap(row => [row.source, row.target]));
  const nodes = focusNode ? [focusNode, ...available.filter(node => node.id !== focus && neighbours.has(node.id))] : available.slice(0, 36);
  const ids = new Set(nodes.map(node => node.id));
  return { nodes, relationships: corpus?.relationships.filter(row => ids.has(row.source) && ids.has(row.target)).slice(0, 80) || [] };
}
