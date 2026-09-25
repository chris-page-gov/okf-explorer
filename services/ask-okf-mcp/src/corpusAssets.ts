import type { ContextCorpusManifest, Reference } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';

/** Complete transport allow-list, after the source manifest has been admitted.
 * Discovery cards and adjacency files are navigation data, not executable inputs
 * or independent evidence. Extension metadata never adds fetch permissions.
 */
export function corpusAssetReferences(manifest: ContextCorpusManifest): Reference[] {
  return [manifest.base_index, ...manifest.records.shards, ...Object.values(manifest.search.shards),
    ...(manifest.schema === 'okf-context-corpus.v3'
      ? [...manifest.discovery.shards, ...Object.values(manifest.relationships.shards)] : [])];
}
