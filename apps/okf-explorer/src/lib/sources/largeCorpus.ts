import type {
  LargeCorpusDescriptor,
  LargeCorpusSource,
  LargeAnalysisOverview,
  LargeDataManifest,
  LargeDataset,
  LargeFacetRow,
  LargeFullIndex,
  LargeGovukContent,
  LargeGraphIndex,
  LargeOverview,
  LargeOperationalMetadataIndex,
  LargePublisher,
  LargeReleaseDataPlaneIndex,
  LargeRelationship,
  LargeRelationshipAdjacencyManifest,
  LargeRelationshipsResult,
  LargeResource,
  LargeResourceReference,
  LargeShardMetadata
} from '$lib/types';
import { baseUrlFor, fetchJson, fetchJsonResource } from './fetch';
import {
  type PreparedReleaseDataPlane,
  prepareReleaseDataPlane,
  resourceHash,
  resourcePath
} from './releaseDataPlane';

// Hard cap on the number of relationship rows the explorer will hydrate into memory.
// Large corpora can carry millions of relationship rows; without a cap, loading the
// full relationship index can hydrate on the order of 2M rows unbounded.
export const MAX_RELATIONSHIP_ROWS = 300_000;
export const CHUNK_FETCH_BATCH_SIZE = 4;

type ResourceFetcher = <T>(reference: LargeResourceReference, requireReleaseEntry?: boolean) => Promise<T>;

export function declaredSnapshot(document: unknown, label: string): string {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return '';
  const record = document as Record<string, unknown>;
  const values = ['snapshot_id', 'snapshot']
    .filter((key) => record[key] !== undefined && record[key] !== null && record[key] !== '')
    .map((key) => {
      const value = record[key];
      if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
        throw new Error(`${label} has an invalid snapshot identifier`);
      }
      return value;
    });
  if (new Set(values).size > 1) throw new Error(`${label} advertises conflicting snapshot identifiers`);
  return values[0] || '';
}

function consistentSnapshot(declarations: Array<[string, unknown]>): string {
  const values = declarations
    .map(([label, document]) => [label, declaredSnapshot(document, label)] as const)
    .filter(([, value]) => value);
  if (new Set(values.map(([, value]) => value)).size > 1) {
    throw new Error(
      `Bundle resources advertise different snapshot identifiers: ${values
        .map(([label, value]) => `${label}=${value}`)
        .join(', ')}`
    );
  }
  return values[0]?.[1] || '';
}

export function descriptorEntrypoint(
  descriptor: LargeCorpusDescriptor,
  name: keyof LargeCorpusDescriptor['entrypoints']
): LargeResourceReference | undefined {
  const entrypoint = descriptor.entrypoints?.[name];
  const integrity = descriptor.entrypoint_integrity?.[name];
  if (!integrity) return entrypoint;
  if (resourcePath(integrity) !== resourcePath(entrypoint)) {
    throw new Error(`Descriptor entrypoint and integrity path differ for ${name}`);
  }
  resourceHash(integrity);
  return integrity;
}

export function integrityReference(
  reference: LargeResourceReference,
  metadataRows: LargeShardMetadata[] | undefined,
  label: string
): LargeResourceReference {
  if (typeof reference !== 'string') {
    resourceHash(reference);
    return reference;
  }
  if (!Array.isArray(metadataRows)) return reference;
  const metadata = metadataRows.find((row) => row && row.path === reference);
  if (!metadata) throw new Error(`${label} has no integrity metadata`);
  resourceHash(metadata);
  return metadata;
}

export function relationshipBucket(route: string): string {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(route);
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ((hash >>> 24) & 0xff).toString(16).padStart(2, '0');
}

async function loadChunks<T>(
  fetchResource: ResourceFetcher,
  paths: LargeResourceReference[] = [],
  metadataRows?: LargeShardMetadata[],
  label = 'Record shard'
): Promise<T[]> {
  const rows: T[] = [];
  const batchSize = CHUNK_FETCH_BATCH_SIZE;
  for (let offset = 0; offset < paths.length; offset += batchSize) {
    const batch = await Promise.all(
      paths
        .slice(offset, offset + batchSize)
        .map((path) => fetchResource<T[]>(integrityReference(path, metadataRows, label), true))
    );
    for (const chunk of batch) rows.push(...chunk);
  }
  return rows;
}

async function loadRelationshipChunks(
  fetchResource: ResourceFetcher,
  paths: LargeResourceReference[] = [],
  metadataRows: LargeShardMetadata[] | undefined,
  maxRows: number
): Promise<LargeRelationshipsResult> {
  const relationships: LargeRelationship[] = [];
  const batchSize = CHUNK_FETCH_BATCH_SIZE;
  let truncated = false;

  for (let offset = 0; offset < paths.length; offset += batchSize) {
    if (relationships.length >= maxRows) {
      truncated = true;
      break;
    }
    const batchPaths = paths.slice(offset, offset + batchSize);
    const batch = await Promise.all(
      batchPaths.map((path) =>
        fetchResource<LargeRelationship[]>(integrityReference(path, metadataRows, 'Relationship shard'), true)
      )
    );
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

const FACET_INDEX_METADATA_KEYS = new Set(['schema', 'snapshot', 'snapshot_id', 'generated_at']);

function normalizeFacetIndex(document: unknown): Record<string, LargeFacetRow[]> {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Facet index must be a JSON object');
  }
  const facets: Record<string, LargeFacetRow[]> = {};
  for (const [key, value] of Object.entries(document)) {
    if (!Array.isArray(value)) {
      if (FACET_INDEX_METADATA_KEYS.has(key)) continue;
      throw new Error(`Facet index field ${key} must be an array`);
    }
    facets[key] = value.map((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Facet index field ${key}[${index}] must be an object`);
      }
      const facet = row as Record<string, unknown>;
      if (typeof facet.value !== 'string' || typeof facet.count !== 'number' || !Number.isFinite(facet.count) || facet.count < 0) {
        throw new Error(`Facet index field ${key}[${index}] has an invalid value or count`);
      }
      return { value: facet.value, count: facet.count };
    });
  }
  return facets;
}

export async function loadLargeCorpus(url: string): Promise<LargeCorpusSource> {
  const descriptor = await fetchJson<LargeCorpusDescriptor>(url);
  if (descriptor.kind !== 'okf-large-corpus') {
    throw new Error(`${url}: not an OKF large-corpus descriptor`);
  }
  const baseUrl = baseUrlFor(url);
  const descriptorSnapshot = declaredSnapshot(descriptor, 'Descriptor');
  const releaseDataPlaneReference = descriptorEntrypoint(descriptor, 'release_data_plane');
  let releaseDataPlane: PreparedReleaseDataPlane | undefined;
  if (releaseDataPlaneReference) {
    if (!resourceHash(releaseDataPlaneReference)) {
      throw new Error('Release data-plane index has no descriptor SHA-256 binding');
    }
    const document = await fetchJsonResource<LargeReleaseDataPlaneIndex>(releaseDataPlaneReference, baseUrl);
    releaseDataPlane = await prepareReleaseDataPlane(
      document,
      baseUrl,
      descriptorSnapshot
    );
  }
  const fetchResource: ResourceFetcher = <T>(reference: LargeResourceReference, requireReleaseEntry = false) =>
    fetchJsonResource<T>(reference, baseUrl, { releaseDataPlane, requireReleaseEntry });
  const dataManifestReference = descriptorEntrypoint(descriptor, 'data_manifest');
  if (!dataManifestReference) throw new Error(`${url}: large-corpus descriptor has no data manifest`);
  const manifest = await fetchResource<LargeDataManifest>(dataManifestReference);
  const advertisedRoot = String(descriptor.data_plane_manifest_root_sha256 || '');
  const manifestRoot = String(manifest.integrity?.manifest_root_sha256 || '');
  if (advertisedRoot && advertisedRoot !== manifestRoot) {
    throw new Error('Descriptor and data manifest integrity roots differ');
  }
  const overviewPath = descriptorEntrypoint(descriptor, 'overview_index') || manifest.indexes.overview;
  const overview = await fetchResource<LargeOverview>(overviewPath);
  const analysisPath = descriptorEntrypoint(descriptor, 'analysis_overview') || manifest.indexes.analysis;
  const analysis = analysisPath
    ? await fetchResource<LargeAnalysisOverview>(analysisPath).catch(() => undefined)
    : undefined;
  const snapshot = consistentSnapshot([
    ['Descriptor', descriptor],
    ['Release data-plane index', releaseDataPlane?.document],
    ['Data manifest', manifest],
    ['Overview', overview],
    ['Analysis overview', analysis]
  ]);
  const searchManifest = descriptorEntrypoint(descriptor, 'search_manifest') || manifest.indexes.search;
  let fullIndexPromise: Promise<LargeFullIndex> | null = null;
  let relationshipsPromise: Promise<LargeRelationshipsResult> | null = null;
  let adjacencyManifestPromise: Promise<LargeRelationshipAdjacencyManifest> | null = null;
  const adjacencyBucketPromises = new Map<string, Promise<Record<string, LargeRelationship[]>>>();

  const source: LargeCorpusSource = {
    kind: 'large',
    url,
    baseUrl,
    snapshot,
    descriptor,
    manifest,
    overview,
    analysis,
    releaseDataPlane: releaseDataPlane?.document,
    searchManifest,
    loadFullIndex() {
      if (!fullIndexPromise) {
        fullIndexPromise = (async () => {
          const operationalPath = descriptorEntrypoint(descriptor, 'operational_metadata') || manifest.indexes.operational_metadata;
          const [rawDatasets, resources, publishers, rawFacets, graph, govukContent, operationalMetadata] = await Promise.all([
            loadChunks<LargeDataset>(fetchResource, manifest.chunks.datasets || [], manifest.shards?.datasets, 'Dataset shard'),
            loadChunks<LargeResource>(fetchResource, manifest.chunks.resources || [], manifest.shards?.resources, 'Resource shard'),
            loadChunks<LargePublisher>(fetchResource, manifest.chunks.publishers || [], manifest.shards?.publishers, 'Publisher shard'),
            manifest.indexes.facets
              ? fetchResource<unknown>(manifest.indexes.facets)
              : {},
            manifest.indexes.graph ? fetchResource<LargeGraphIndex>(manifest.indexes.graph) : {},
            manifest.indexes.govuk_content ? fetchResource<LargeGovukContent>(manifest.indexes.govuk_content) : {},
            operationalPath
              ? fetchResource<LargeOperationalMetadataIndex>(operationalPath)
              : { schema: 'okf-operational-metadata.v1', records: {} }
          ]);
          const datasets = mergeOperationalMetadata(rawDatasets, operationalMetadata);
          const facets = normalizeFacetIndex(rawFacets);
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
        relationshipsPromise = loadRelationshipChunks(
          fetchResource,
          manifest.chunks.relationships || [],
          manifest.shards?.relationships,
          maxRows
        );
      }
      return relationshipsPromise;
    },
    async loadRelationshipsForRoute(route: string) {
      const adjacencyPath = descriptorEntrypoint(descriptor, 'relationship_adjacency') || manifest.indexes.relationship_adjacency;
      if (!adjacencyPath) {
        const result = await source.loadRelationships();
        return result.relationships.filter((relationship) => relationship.source === route || relationship.target === route);
      }
      if (!adjacencyManifestPromise) {
        adjacencyManifestPromise = fetchResource<LargeRelationshipAdjacencyManifest>(adjacencyPath);
      }
      const adjacency = await adjacencyManifestPromise;
      if (adjacency.algorithm !== 'fnv1a32-prefix-2') {
        throw new Error(`Unsupported relationship adjacency algorithm: ${adjacency.algorithm}`);
      }
      const adjacencySnapshot = declaredSnapshot(adjacency, 'Relationship adjacency manifest');
      if (adjacencySnapshot && (!snapshot || adjacencySnapshot !== snapshot)) {
        throw new Error('Relationship adjacency manifest snapshot differs from the loaded bundle snapshot');
      }
      const bucket = relationshipBucket(route);
      const bucketPath = adjacency.buckets[bucket];
      if (!bucketPath) return [];
      const bucketReference = integrityReference(bucketPath, adjacency.shards, 'Relationship adjacency shard');
      let bucketPromise = adjacencyBucketPromises.get(bucket);
      if (!bucketPromise) {
        bucketPromise = fetchResource<Record<string, LargeRelationship[]>>(bucketReference, true);
        adjacencyBucketPromises.set(bucket, bucketPromise);
      }
      const rows = await bucketPromise;
      return rows[route] || [];
    }
  };
  return source;
}
