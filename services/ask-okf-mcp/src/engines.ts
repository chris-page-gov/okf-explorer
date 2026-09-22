import * as current from '../vendor/engines/c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e/index.ts';
import * as currentCorpus from '../vendor/engines/c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e/corpus.ts';
import currentManifest from '../vendor/engines/c4f2de0a99b7bc2f8b8c8a06a3c715fb56b66d8e/manifest.json' with { type: 'json' };
import * as previous from '../vendor/engines/b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55/index.ts';
import * as previousCorpus from '../vendor/engines/b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55/corpus.ts';
import previousManifest from '../vendor/engines/b9a3b68b6dbf222f9a73cc8f450dd53f126e1b55/manifest.json' with { type: 'json' };
import type { ContextBudget, ContextPackage } from '../../../apps/okf-explorer/src/lib/context/types.ts';
import type { ApprovedSource } from './registry.ts';
import type { ContextCorpusManifest } from '../../../apps/okf-explorer/src/lib/context/corpus.ts';

function legacyManifest(manifest: ContextCorpusManifest): currentCorpus.ContextCorpusManifest {
  if (manifest.schema !== 'okf-context-corpus.v1') throw new Error('Frozen engines do not support logical-unit corpus v2.');
  return { ...manifest, schema: 'okf-context-corpus.v1' };
}

// Explicit compatibility pairs. A future registry addition must not silently
// authorise an older assembler for a new source or schema.
const historicalVersions = Object.freeze([
  '3ef0e786e9a18e76fa17c7d925ff509d6d6c9f84',
  '9de52acf1db84b27f8933d80480eaa850e74fa33',
  'bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752',
  'efb05c66616a9cd4328a86cf412780fe7bc7cf0b'
]);
export type EngineAdapter = {
  readonly engine_id: string; readonly source_commit: string; readonly source_versions: readonly string[];
  assemble(source: ApprovedSource, question: string, budget: Partial<ContextBudget> | undefined, fetcher: typeof fetch): Promise<ContextPackage>;
};
export const CURRENT_ENGINE_ID = currentManifest.engine_id;
export const PREVIOUS_ENGINE_ID = previousManifest.engine_id;
// Static imports only: no caller URL, executable selection or dynamic imports.
export const ENGINES: readonly EngineAdapter[] = Object.freeze([
  Object.freeze({ engine_id: CURRENT_ENGINE_ID, source_commit: currentManifest.source_commit, source_versions: Object.freeze(['723bcc5b015ab38a026625c2148edbd784edf7c7', ...historicalVersions]),
    assemble: (source: ApprovedSource, question: string, budget: Partial<ContextBudget> | undefined, fetcher: typeof fetch) =>
      'manifest' in source ? currentCorpus.assembleCorpusContext(legacyManifest(source.manifest), source.binding, question, budget, fetcher)
        : current.assembleContext(source.index, question, budget, source.binding) }),
  Object.freeze({ engine_id: PREVIOUS_ENGINE_ID, source_commit: previousManifest.source_commit, source_versions: historicalVersions,
    assemble: (source: ApprovedSource, question: string, budget: Partial<ContextBudget> | undefined, fetcher: typeof fetch) =>
      'manifest' in source ? previousCorpus.assembleCorpusContext(legacyManifest(source.manifest), source.binding, question, budget, fetcher)
        : previous.assembleContext(source.index, question, budget, source.binding) })
]);
export const APPROVED_ENGINE_IDS = Object.freeze(ENGINES.map(engine => engine.engine_id));
export const ENGINE_CATALOGUE = Object.freeze(ENGINES.map(({ engine_id, source_commit, source_versions }) =>
  Object.freeze({ engine_id, source_commit, source_versions })));
