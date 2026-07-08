import type {
  LargeCorpusDescriptor,
  LargeCorpusSource,
  LargeAnalysisOverview,
  LargeDataManifest,
  LargeDataset,
  LargeFullIndex,
  LargeGovukContent,
  LargeGraphIndex,
  LargeOverview,
  LargePublisher,
  LargeRelationship,
  LargeRelationshipsResult,
  LargeResource
} from '$lib/types';
import { baseUrlFor, fetchJson, resolveUrl } from './fetch';

// Hard cap on the number of relationship rows the explorer will hydrate into memory.
// Large corpora can carry millions of relationship rows; without a cap, loading the
// full relationship index can hydrate on the order of 2M rows unbounded.
export const MAX_RELATIONSHIP_ROWS = 300_000;

async function loadChunks<T>(baseUrl: string, paths: string[] = []): Promise<T[]> {
  const rows: T[] = [];
  const batchSize = 16;
  for (let offset = 0; offset < paths.length; offset += batchSize) {
    const batch = await Promise.all(paths.slice(offset, offset + batchSize).map((path) => fetchJson<T[]>(resolveUrl(path, baseUrl))));
    for (const chunk of batch) rows.push(...chunk);
  }
  return rows;
}

async function loadRelationshipChunks(baseUrl: string, paths: string[] = [], maxRows: number): Promise<LargeRelationshipsResult> {
  const relationships: LargeRelationship[] = [];
  const batchSize = 16;
  let truncated = false;

  for (let offset = 0; offset < paths.length; offset += batchSize) {
    if (relationships.length >= maxRows) {
      truncated = true;
      break;
    }
    const batchPaths = paths.slice(offset, offset + batchSize);
    const batch = await Promise.all(batchPaths.map((path) => fetchJson<LargeRelationship[]>(resolveUrl(path, baseUrl))));
    for (const chunk of batch) {
      if (relationships.length >= maxRows) {
        truncated = true;
        break;
      }
      const remaining = maxRows - relationships.length;
      if (chunk.length > remaining) {
        relationships.push(...chunk.slice(0, remaining));
        truncated = true;
      } else {
        relationships.push(...chunk);
      }
    }
    if (truncated) break;
  }

  return { relationships, truncated };
}

function indexResourcesByDataset(resources: LargeResource[]): Map<string, LargeResource[]> {
  const out = new Map<string, LargeResource[]>();
  for (const resource of resources) {
    const rows = out.get(resource.dataset) || [];
    rows.push(resource);
    out.set(resource.dataset, rows);
  }
  for (const rows of out.values()) {
    rows.sort((left, right) => (left.position || 0) - (right.position || 0) || (left.name || '').localeCompare(right.name || ''));
  }
  return out;
}

export async function loadLargeCorpus(url: string): Promise<LargeCorpusSource> {
  const descriptor = await fetchJson<LargeCorpusDescriptor>(url);
  if (descriptor.kind !== 'okf-large-corpus') {
    throw new Error(`${url}: not an OKF large-corpus descriptor`);
  }
  const baseUrl = baseUrlFor(url);
  const manifest = await fetchJson<LargeDataManifest>(resolveUrl(descriptor.entrypoints.data_manifest, baseUrl));
  const overviewPath = descriptor.entrypoints.overview_index || manifest.indexes.overview;
  const overview = await fetchJson<LargeOverview>(resolveUrl(overviewPath, baseUrl));
  const analysisPath = descriptor.entrypoints.analysis_overview || manifest.indexes.analysis;
  const analysis = analysisPath
    ? await fetchJson<LargeAnalysisOverview>(resolveUrl(analysisPath, baseUrl)).catch(() => undefined)
    : undefined;
  let fullIndexPromise: Promise<LargeFullIndex> | null = null;
  let relationshipsPromise: Promise<LargeRelationshipsResult> | null = null;

  const source: LargeCorpusSource = {
    kind: 'large',
    url,
    baseUrl,
    descriptor,
    manifest,
    overview,
    analysis,
    loadFullIndex() {
      if (!fullIndexPromise) {
        fullIndexPromise = (async () => {
          const [datasets, resources, publishers, facets, graph, govukContent] = await Promise.all([
            loadChunks<LargeDataset>(baseUrl, manifest.chunks.datasets || []),
            loadChunks<LargeResource>(baseUrl, manifest.chunks.resources || []),
            loadChunks<LargePublisher>(baseUrl, manifest.chunks.publishers || []),
            manifest.indexes.facets ? fetchJson<Record<string, Array<{ value: string; count: number }>>>(resolveUrl(manifest.indexes.facets, baseUrl)) : {},
            manifest.indexes.graph ? fetchJson<LargeGraphIndex>(resolveUrl(manifest.indexes.graph, baseUrl)) : {},
            manifest.indexes.govuk_content ? fetchJson<LargeGovukContent>(resolveUrl(manifest.indexes.govuk_content, baseUrl)) : {}
          ]);
          return {
            datasets,
            resources,
            publishers,
            facets,
            graph,
            govukContent,
            datasetByName: new Map(datasets.map((dataset) => [dataset.name, dataset])),
            resourceById: new Map(resources.map((resource) => [resource.id, resource])),
            publisherByName: new Map(publishers.map((publisher) => [publisher.name, publisher])),
            resourcesByDataset: indexResourcesByDataset(resources)
          };
        })();
      }
      return fullIndexPromise;
    },
    loadRelationships(maxRows: number = MAX_RELATIONSHIP_ROWS) {
      if (!relationshipsPromise) {
        relationshipsPromise = loadRelationshipChunks(baseUrl, manifest.chunks.relationships || [], maxRows);
      }
      return relationshipsPromise;
    }
  };
  return source;
}
