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
  LargeOperationalMetadataIndex,
  LargePublisher,
  LargeRelationship,
  LargeRelationshipAdjacencyManifest,
  LargeRelationshipsResult,
  LargeResource
} from '$lib/types';
import { baseUrlFor, fetchJson, resolveUrl } from './fetch';

// Hard cap on the number of relationship rows the explorer will hydrate into memory.
// Large corpora can carry millions of relationship rows; without a cap, loading the
// full relationship index can hydrate on the order of 2M rows unbounded.
export const MAX_RELATIONSHIP_ROWS = 300_000;
export const CHUNK_FETCH_BATCH_SIZE = 4;

export function relationshipBucket(route: string): string {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(route);
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

async function loadChunks<T>(baseUrl: string, paths: string[] = []): Promise<T[]> {
  const rows: T[] = [];
  const batchSize = CHUNK_FETCH_BATCH_SIZE;
  for (let offset = 0; offset < paths.length; offset += batchSize) {
    const batch = await Promise.all(paths.slice(offset, offset + batchSize).map((path) => fetchJson<T[]>(resolveUrl(path, baseUrl))));
    for (const chunk of batch) rows.push(...chunk);
  }
  return rows;
}

async function loadRelationshipChunks(baseUrl: string, paths: string[] = [], maxRows: number): Promise<LargeRelationshipsResult> {
  const relationships: LargeRelationship[] = [];
  const batchSize = CHUNK_FETCH_BATCH_SIZE;
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

function mergeOperationalMetadata(
  datasets: LargeDataset[],
  index: LargeOperationalMetadataIndex
): LargeDataset[] {
  return datasets.map((dataset) => {
    const route = dataset.route || `dataset/${dataset.name}`;
    const metadata = index.records[route] || index.records[dataset.name];
    return metadata ? { ...dataset, operational_metadata: metadata } : dataset;
  });
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
  let adjacencyManifestPromise: Promise<LargeRelationshipAdjacencyManifest> | null = null;
  const adjacencyBucketPromises = new Map<string, Promise<Record<string, LargeRelationship[]>>>();

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
          const operationalPath = descriptor.entrypoints.operational_metadata || manifest.indexes.operational_metadata;
          const [rawDatasets, resources, publishers, facets, graph, govukContent, operationalMetadata] = await Promise.all([
            loadChunks<LargeDataset>(baseUrl, manifest.chunks.datasets || []),
            loadChunks<LargeResource>(baseUrl, manifest.chunks.resources || []),
            loadChunks<LargePublisher>(baseUrl, manifest.chunks.publishers || []),
            manifest.indexes.facets ? fetchJson<Record<string, Array<{ value: string; count: number }>>>(resolveUrl(manifest.indexes.facets, baseUrl)) : {},
            manifest.indexes.graph ? fetchJson<LargeGraphIndex>(resolveUrl(manifest.indexes.graph, baseUrl)) : {},
            manifest.indexes.govuk_content ? fetchJson<LargeGovukContent>(resolveUrl(manifest.indexes.govuk_content, baseUrl)) : {},
            operationalPath
              ? fetchJson<LargeOperationalMetadataIndex>(resolveUrl(operationalPath, baseUrl))
              : { schema: 'okf-operational-metadata.v1', records: {} }
          ]);
          const datasets = mergeOperationalMetadata(rawDatasets, operationalMetadata);
          return {
            datasets,
            resources,
            publishers,
            facets,
            graph,
            govukContent,
            operationalMetadata,
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
    },
    async loadRelationshipsForRoute(route: string) {
      const adjacencyPath = descriptor.entrypoints.relationship_adjacency || manifest.indexes.relationship_adjacency;
      if (!adjacencyPath) {
        const result = await source.loadRelationships();
        return result.relationships.filter((relationship) => relationship.source === route || relationship.target === route);
      }
      if (!adjacencyManifestPromise) {
        adjacencyManifestPromise = fetchJson<LargeRelationshipAdjacencyManifest>(resolveUrl(adjacencyPath, baseUrl));
      }
      const adjacency = await adjacencyManifestPromise;
      if (adjacency.algorithm !== 'fnv1a32-prefix-2') {
        throw new Error(`Unsupported relationship adjacency algorithm: ${adjacency.algorithm}`);
      }
      const bucket = relationshipBucket(route);
      const bucketPath = adjacency.buckets[bucket];
      if (!bucketPath) return [];
      let bucketPromise = adjacencyBucketPromises.get(bucket);
      if (!bucketPromise) {
        bucketPromise = fetchJson<Record<string, LargeRelationship[]>>(resolveUrl(bucketPath, baseUrl));
        adjacencyBucketPromises.set(bucket, bucketPromise);
      }
      const rows = await bucketPromise;
      return rows[route] || [];
    }
  };
  return source;
}
