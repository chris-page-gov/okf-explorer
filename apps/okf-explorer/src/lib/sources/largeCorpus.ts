import type {
  LargeCorpusDescriptor,
  LargeCorpusSource,
  LargeAnalysisOverview,
  LargeDataManifest,
  LargeDataset,
  LargeEffectsReconciliation,
  LargeFacetRow,
  LargeFullIndex,
  LargeGovukContent,
  LargeGraphIndex,
  LargeOverview,
  LargeOperationalMetadataIndex,
  LargeProviderDatapack,
  LargeProviderDatapackCollection,
  LargeProviderDatapackManifest,
  LargePublisher,
  LargeReleaseDataPlaneIndex,
  LargeRelationship,
  LargeRelationshipAdjacencyManifest,
  LargeRelationshipDatapackManifest,
  LargeRecordLocatorManifest,
  LargeRelationshipsResult,
  LargeResource,
  LargeResourceReference,
  LargeShardMetadata
} from '$lib/types';
import { normalizeExplorerPresentation } from '$lib/viewer/facetPresentation';
import { normalizeEffectsReconciliation } from '$lib/viewer/effectsReconciliation';
import {
  normalizeProviderDatapack,
  normalizeProviderDatapackManifest,
  validateProviderDatapackCollection
} from '$lib/viewer/providerDatapack';
import { baseUrlFor, fetchJson, fetchJsonResource } from './fetch';
import {
  type PreparedReleaseDataPlane,
  prepareReleaseDataPlane,
  resourceHash,
  resourcePath,
  safeRelativeResourcePath
} from './releaseDataPlane';

// Hard cap on the number of relationship rows the explorer will hydrate into memory.
// Large corpora can carry millions of relationship rows; without a cap, loading the
// full relationship index can hydrate on the order of 2M rows unbounded.
export const MAX_RELATIONSHIP_ROWS = 300_000;
export const CHUNK_FETCH_BATCH_SIZE = 4;
const SHA256 = /^[0-9a-f]{64}$/;

type ResourceFetcher = <T>(reference: LargeResourceReference, requireReleaseEntry?: boolean) => Promise<T>;

function bundleResourceReference(
  value: unknown,
  baseUrl: string,
  label: string
): LargeResourceReference {
  if (
    typeof value !== 'string' &&
    (!value || typeof value !== 'object' || Array.isArray(value))
  ) {
    throw new Error(`${label} is missing or malformed`);
  }
  const reference = value as LargeResourceReference;
  const path = safeRelativeResourcePath(resourcePath(reference), `${label} path`);
  resourceHash(reference);
  const bundleBase = new URL(baseUrl);
  const bundlePrefix = bundleBase.pathname.endsWith('/')
    ? bundleBase.pathname
    : `${bundleBase.pathname}/`;
  const resolved = new URL(path, bundleBase);
  if (
    resolved.origin !== bundleBase.origin ||
    !resolved.pathname.startsWith(bundlePrefix)
  ) {
    throw new Error(`${label} must stay inside the bundle base path`);
  }
  return typeof reference === 'string' ? path : { ...reference, path };
}

function normalizeRelationshipDatapackManifest(
  value: unknown,
  snapshot: string
): LargeRelationshipDatapackManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Model relationship datapack manifest must be an object');
  }
  const document = value as Record<string, unknown>;
  if (document.schema !== 'okf-provider-datapack.v1') {
    throw new Error('Model relationship datapack manifest uses an unsupported schema');
  }
  const id = typeof document.id === 'string' ? document.id : '';
  const snapshotId = typeof document.snapshot_id === 'string' ? document.snapshot_id : '';
  if (!id || id.trim() !== id || !snapshotId || snapshotId.trim() !== snapshotId) {
    throw new Error('Model relationship datapack identity is malformed');
  }
  const snapshotInstant = (candidate: string) =>
    candidate.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)?.[0] || '';
  if (
    !snapshot ||
    (
      snapshotId !== snapshot &&
      (
        !snapshotInstant(snapshotId) ||
        snapshotInstant(snapshotId) !== snapshotInstant(snapshot)
      )
    )
  ) {
    throw new Error('Model relationship datapack snapshot differs from the loaded bundle snapshot');
  }
  if (!Array.isArray(document.chunks) || document.chunks.length > 100_000) {
    throw new Error('Model relationship datapack chunks are malformed');
  }
  const paths = new Set<string>();
  const chunks = document.chunks.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Model relationship datapack chunk ${index} is malformed`);
    }
    const chunk = raw as Record<string, unknown>;
    const path = safeRelativeResourcePath(
      chunk.path,
      `Model relationship datapack chunk ${index} path`
    );
    const sha256 = typeof chunk.sha256 === 'string' ? chunk.sha256 : '';
    const bytes = Number(chunk.bytes);
    const records = Number(chunk.records);
    const compression = typeof chunk.compression === 'string' ? chunk.compression : '';
    const mediaType = typeof chunk.media_type === 'string' ? chunk.media_type : '';
    const ordinal = String(index).padStart(3, '0');
    if (
      paths.has(path) ||
      !SHA256.test(sha256) ||
      !Number.isSafeInteger(bytes) ||
      bytes < 1 ||
      !Number.isSafeInteger(records) ||
      records < 0 ||
      compression !== 'gzip' ||
      mediaType !== 'application/json' ||
      !new RegExp(`-${ordinal}\\.json\\.gz$`).test(path)
    ) {
      throw new Error(`Model relationship datapack chunk ${index} contract is malformed`);
    }
    paths.add(path);
    return {
      path,
      sha256,
      bytes,
      records,
      compression,
      media_type: mediaType
    };
  });
  const counts =
    document.counts && typeof document.counts === 'object' && !Array.isArray(document.counts)
      ? document.counts as Record<string, number>
      : undefined;
  if (
    counts?.assertions !== undefined &&
    (
      !Number.isSafeInteger(counts.assertions) ||
      counts.assertions < 0 ||
      counts.assertions !== chunks.reduce((total, chunk) => total + chunk.records, 0)
    )
  ) {
    throw new Error('Model relationship datapack assertion count differs from its chunks');
  }
  return {
    schema: 'okf-provider-datapack.v1',
    id,
    snapshot_id: snapshotId,
    chunks,
    counts
  };
}

function canonicalRelationshipRoute(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
    throw new Error('Model relationship assertion route is malformed');
  }
  if (/^[a-z][a-z0-9-]*\/[^\s?#]+$/.test(value)) return value;
  const legislation = /^https:\/\/(?:www\.)?legislation\.gov\.uk\/id\/([a-z0-9-]+)\/(\d{4})\/([A-Za-z0-9._-]+)\/?$/.exec(value);
  if (legislation) return `dataset/${legislation[1]}-${legislation[2]}-${legislation[3]}`;
  return value;
}

function normalizeModelRelationshipRows(
  value: unknown,
  expectedRecords: number
): LargeRelationship[] {
  if (!Array.isArray(value) || value.length !== expectedRecords) {
    throw new Error('Model relationship datapack chunk record count differs from its manifest');
  }
  return value.map((raw, index): LargeRelationship => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Model relationship assertion ${index} is malformed`);
    }
    const row = raw as Record<string, unknown>;
    const source = canonicalRelationshipRoute(row.source);
    const target = canonicalRelationshipRoute(row.target);
    const kind = String(row.kind || row.predicate || row.type || '').trim();
    if (!kind) throw new Error(`Model relationship assertion ${index} has no predicate`);
    return { ...row, source, target, kind } as LargeRelationship;
  });
}

function mergeRelationships(
  base: LargeRelationship[],
  additions: LargeRelationship[]
): LargeRelationship[] {
  const merged = [...base];
  const seen = new Set(
    base.map((row) => String(row.id || `${row.source}\u0000${row.target}\u0000${row.kind}\u0000${JSON.stringify(row.authority || '')}`))
  );
  for (const row of additions) {
    const key = String(row.id || `${row.source}\u0000${row.target}\u0000${row.kind}\u0000${JSON.stringify(row.authority || '')}`);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(row);
    }
  }
  return merged;
}

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

export async function loadLargeCorpus(
  url: string,
  preloadedDescriptor?: LargeCorpusDescriptor
): Promise<LargeCorpusSource> {
  const descriptor = preloadedDescriptor || await fetchJson<LargeCorpusDescriptor>(url);
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
  const overviewPath = descriptorEntrypoint(descriptor, 'overview_index') || manifest.indexes?.overview;
  const overview = await fetchResource<LargeOverview>(overviewPath);
  const analysisPath = descriptorEntrypoint(descriptor, 'analysis_overview') || manifest.indexes?.analysis;
  const analysis = analysisPath
    ? await fetchResource<LargeAnalysisOverview>(analysisPath).catch(() => undefined)
    : undefined;
  const presentationPath = descriptorEntrypoint(descriptor, 'presentation') || manifest.indexes?.presentation;
  const presentation = presentationPath
    ? normalizeExplorerPresentation(await fetchResource<unknown>(presentationPath).catch(() => undefined))
    : undefined;
  const descriptorProviderDatapackPath = descriptorEntrypoint(
    descriptor,
    'provider_datapacks'
  );
  const descriptorProviderDatapackIntegrity =
    descriptor.entrypoint_integrity?.provider_datapacks;
  const manifestProviderDatapackPath = manifest.indexes?.provider_datapacks;
  if (
    descriptorProviderDatapackPath &&
    manifestProviderDatapackPath &&
    resourcePath(descriptorProviderDatapackPath) !== resourcePath(manifestProviderDatapackPath)
  ) {
    throw new Error(
      'Descriptor and data manifest provider-datapack manifest paths differ'
    );
  }
  const descriptorProviderHash = resourceHash(descriptorProviderDatapackPath);
  const manifestProviderHash = resourceHash(manifestProviderDatapackPath);
  if (
    descriptorProviderHash &&
    manifestProviderHash &&
    descriptorProviderHash !== manifestProviderHash
  ) {
    throw new Error(
      'Descriptor and data manifest provider-datapack manifest SHA-256 values differ'
    );
  }
  const providerDatapacksAdvertised = Boolean(
    descriptorProviderDatapackPath || manifestProviderDatapackPath
  );
  if (
    providerDatapacksAdvertised &&
    (
      !descriptor.entrypoints.provider_datapacks ||
      !descriptorProviderDatapackIntegrity ||
      !resourceHash(descriptorProviderDatapackIntegrity) ||
      !descriptorProviderHash
    )
  ) {
    throw new Error(
      'Advertised provider datapacks require a descriptor entrypoint with entrypoint_integrity SHA-256'
    );
  }
  const providerDatapackPath = descriptorProviderDatapackPath;
  let providerDatapackManifest: LargeProviderDatapackManifest | undefined;
  let providerDatapackPacks: LargeProviderDatapack[] = [];
  if (providerDatapackPath) {
    const manifestSnapshot = declaredSnapshot(manifest, 'Data manifest');
    if (!descriptorSnapshot || !manifestSnapshot) {
      throw new Error(
        'Advertised provider datapacks require snapshot identifiers on both the descriptor and data manifest'
      );
    }
    const bundleBase = new URL(baseUrl);
    const bundlePathPrefix = bundleBase.pathname.endsWith('/')
      ? bundleBase.pathname
      : `${bundleBase.pathname}/`;
    const resolvedManifest = new URL(resourcePath(providerDatapackPath), baseUrl);
    if (
      resolvedManifest.origin !== bundleBase.origin ||
      !resolvedManifest.pathname.startsWith(bundlePathPrefix)
    ) {
      throw new Error('Provider datapack manifest must stay inside the bundle base path');
    }
    providerDatapackManifest = normalizeProviderDatapackManifest(
      await fetchResource<unknown>(providerDatapackPath)
    );
    providerDatapackPacks = await Promise.all(
      providerDatapackManifest.packs.map(async (entry) => {
        const resolved = new URL(entry.path, baseUrl);
        if (
          resolved.origin !== bundleBase.origin ||
          !resolved.pathname.startsWith(bundlePathPrefix)
        ) {
          throw new Error(`Provider datapack ${entry.id} must stay inside the bundle base path`);
        }
        return normalizeProviderDatapack(
          await fetchResource<unknown>({ path: entry.path, sha256: entry.sha256 })
        );
      })
    );
  }
  const snapshot = consistentSnapshot([
    ['Descriptor', descriptor],
    ['Release data-plane index', releaseDataPlane?.document],
    ['Data manifest', manifest],
    ['Overview', overview],
    ['Analysis overview', analysis],
    ['Presentation profile', presentation],
    ['Provider datapack manifest', providerDatapackManifest],
    ...providerDatapackPacks.map(
      (pack) => [`Provider datapack ${pack.id}`, pack] as [string, unknown]
    )
  ]);
  const providerDatapacks: LargeProviderDatapackCollection | undefined =
    providerDatapackManifest
      ? validateProviderDatapackCollection(
          providerDatapackManifest,
          providerDatapackPacks,
          snapshot
        )
      : undefined;
  let effectsReconciliation: LargeEffectsReconciliation | undefined;
  let effectsReconciliationError = '';
  const reconciliationDeclaration =
    descriptor.extensions?.['okf-official-effects.v1']?.reconciliation;
  if (reconciliationDeclaration !== undefined) {
    try {
      const reconciliationReference = bundleResourceReference(
        reconciliationDeclaration,
        baseUrl,
        'Official-effects reconciliation'
      );
      effectsReconciliation = normalizeEffectsReconciliation(
        await fetchResource<unknown>(reconciliationReference)
      );
    } catch (error) {
      effectsReconciliationError = error instanceof Error ? error.message : String(error);
    }
  }
  const descriptorModelRelationships = descriptorEntrypoint(descriptor, 'model_enrichment_v2');
  const manifestModelRelationships = manifest.indexes?.model_enrichment_v2;
  if (
    descriptorModelRelationships &&
    manifestModelRelationships &&
    resourcePath(descriptorModelRelationships) !== resourcePath(manifestModelRelationships)
  ) {
    throw new Error('Descriptor and data manifest model-enrichment paths differ');
  }
  const modelRelationshipManifestReference = descriptorModelRelationships || manifestModelRelationships;
  const searchManifest = descriptorEntrypoint(descriptor, 'search_manifest') || manifest.indexes.search;
  const descriptorRecordLocator = descriptorEntrypoint(descriptor, 'record_locator');
  const manifestRecordLocator = manifest.indexes.record_locator;
  if (
    descriptorRecordLocator &&
    manifestRecordLocator &&
    resourcePath(descriptorRecordLocator) !== resourcePath(manifestRecordLocator)
  ) {
    throw new Error('Descriptor and data manifest record-locator paths differ');
  }
  const recordLocatorReference = descriptorRecordLocator || manifestRecordLocator;
  let facetIndexPromise: Promise<Record<string, LargeFacetRow[]>> | null = null;
  let fullIndexPromise: Promise<LargeFullIndex> | null = null;
  let relationshipsPromise: Promise<LargeRelationshipsResult> | null = null;
  let adjacencyManifestPromise: Promise<LargeRelationshipAdjacencyManifest> | null = null;
  const adjacencyBucketPromises = new Map<string, Promise<Record<string, LargeRelationship[]>>>();
  let recordLocatorPromise: Promise<LargeRecordLocatorManifest> | null = null;
  const recordLocatorBucketPromises = new Map<string, Promise<Record<string, [number, number]>>>();
  const recordChunkPromises = new Map<number, Promise<LargeDataset[]>>();
  let modelRelationshipManifestPromise: Promise<LargeRelationshipDatapackManifest> | null = null;
  const modelRelationshipChunkPromises = new Map<number, Promise<LargeRelationship[]>>();

  async function modelRelationshipManifest(
    locator: LargeRecordLocatorManifest
  ): Promise<LargeRelationshipDatapackManifest | null> {
    if (!modelRelationshipManifestReference) return null;
    if (!modelRelationshipManifestPromise) {
      modelRelationshipManifestPromise = fetchResource<unknown>(
        bundleResourceReference(
          modelRelationshipManifestReference,
          baseUrl,
          'Model relationship datapack manifest'
        )
      )
        .then((value) => {
          const datapack = normalizeRelationshipDatapackManifest(value, snapshot);
          if (datapack.chunks.length !== locator.record_chunks.length) {
            throw new Error(
              'Model relationship datapack chunks are not aligned with the record locator'
            );
          }
          return datapack;
        })
        .catch((error) => {
          modelRelationshipManifestPromise = null;
          throw error;
        });
    }
    return modelRelationshipManifestPromise;
  }

  async function modelRelationshipsForRoute(
    locator: LargeRecordLocatorManifest | null,
    relationshipRoute: string
  ): Promise<LargeRelationship[]> {
    if (!locator || !modelRelationshipManifestReference) return [];
    const location = await recordLocation(locator, relationshipRoute);
    if (!location) return [];
    const [chunkIndex] = location;
    const datapack = await modelRelationshipManifest(locator);
    const chunk = datapack?.chunks[chunkIndex];
    if (!chunk) {
      throw new Error(`Model relationship datapack has no aligned chunk for ${relationshipRoute}`);
    }
    let chunkPromise = modelRelationshipChunkPromises.get(chunkIndex);
    if (!chunkPromise) {
      const reference = bundleResourceReference(
        { path: chunk.path, sha256: chunk.sha256 },
        baseUrl,
        `Model relationship datapack chunk ${chunkIndex}`
      );
      chunkPromise = fetchResource<unknown>(reference, true)
        .then((value) => normalizeModelRelationshipRows(value, chunk.records))
        .catch((error) => {
          modelRelationshipChunkPromises.delete(chunkIndex);
          throw error;
        });
      modelRelationshipChunkPromises.set(chunkIndex, chunkPromise);
    }
    return (await chunkPromise).filter(
      (row) => row.source === relationshipRoute || row.target === relationshipRoute
    );
  }

  async function recordLocator(): Promise<LargeRecordLocatorManifest | null> {
    if (!recordLocatorReference) return null;
    if (!recordLocatorPromise) {
      recordLocatorPromise = fetchResource<LargeRecordLocatorManifest>(recordLocatorReference)
        .then((locator) => {
          if (
            !locator ||
            locator.schema !== 'okf-record-locator-sharded.v1' ||
            locator.algorithm !== 'fnv1a32-prefix-2'
          ) {
            throw new Error('Record locator uses an unsupported schema or algorithm');
          }
          const locatorSnapshot = declaredSnapshot(locator, 'Record locator manifest');
          if (locatorSnapshot && (!snapshot || locatorSnapshot !== snapshot)) {
            throw new Error('Record locator manifest snapshot differs from the loaded bundle snapshot');
          }
          if (
            !Number.isSafeInteger(locator.records) ||
            locator.records < 0 ||
            !Number.isSafeInteger(locator.chunk_size) ||
            locator.chunk_size < 1 ||
            locator.chunk_size > 100_000 ||
            !Array.isArray(locator.record_chunks) ||
            locator.record_chunks.length !== Math.ceil(locator.records / locator.chunk_size) ||
            !locator.buckets ||
            typeof locator.buckets !== 'object' ||
            Array.isArray(locator.buckets) ||
            Object.entries(locator.buckets).some(
              ([bucket, reference]) => !/^[0-9a-f]{2}$/.test(bucket) || !resourcePath(reference)
            ) ||
            (
              locator.route_aliases !== undefined &&
              (
                !locator.route_aliases ||
                typeof locator.route_aliases !== 'object' ||
                Array.isArray(locator.route_aliases) ||
                Object.entries(locator.route_aliases).some(
                  ([alias, canonical]) =>
                    !/^[a-z][a-z0-9-]*\/[^\s?#]+$/.test(alias) ||
                    typeof canonical !== 'string' ||
                    !/^[a-z][a-z0-9-]*\/[^\s?#]+$/.test(canonical) ||
                    alias === canonical
                )
              )
            )
          ) {
            throw new Error('Record locator manifest is malformed');
          }
          if (locator.bucket_count !== undefined && locator.bucket_count !== Object.keys(locator.buckets).length) {
            throw new Error('Record locator bucket count is inconsistent');
          }
          return locator;
        })
        .catch((error) => {
          recordLocatorPromise = null;
          throw error;
        });
    }
    return recordLocatorPromise;
  }

  async function recordLocation(
    locator: LargeRecordLocatorManifest,
    route: string,
    ordinal?: number
  ): Promise<[number, number] | null> {
    const bucket = relationshipBucket(route);
    const bucketReference = locator.buckets[bucket];
    if (bucketReference) {
      let bucketPromise = recordLocatorBucketPromises.get(bucket);
      if (!bucketPromise) {
        bucketPromise = fetchResource<Record<string, [number, number]>>(bucketReference, true);
        recordLocatorBucketPromises.set(bucket, bucketPromise);
      }
      const location = (await bucketPromise)[route];
      if (location !== undefined) {
        if (
          !Array.isArray(location) ||
          location.length !== 2 ||
          !Number.isSafeInteger(location[0]) ||
          location[0] < 0 ||
          !Number.isSafeInteger(location[1]) ||
          location[1] < 0
        ) {
          throw new Error(`Record locator bucket contains an invalid location for ${route}`);
        }
        return location;
      }
    }
    if (ordinal === undefined || !Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= locator.records) {
      return null;
    }
    return [Math.floor(ordinal / locator.chunk_size), ordinal % locator.chunk_size];
  }

  const source: LargeCorpusSource = {
    kind: 'large',
    url,
    baseUrl,
    snapshot,
    descriptor,
    manifest,
    overview,
    analysis,
    presentation,
    providerDatapacks,
    effectsReconciliation,
    effectsReconciliationError: effectsReconciliationError || undefined,
    releaseDataPlane: releaseDataPlane?.document,
    searchManifest,
    loadFacetIndex() {
      if (!facetIndexPromise) {
        facetIndexPromise = manifest.indexes.facets
          ? fetchResource<unknown>(manifest.indexes.facets)
              .then(normalizeFacetIndex)
              .catch((error) => {
                facetIndexPromise = null;
                throw error;
              })
          : Promise.resolve({});
      }
      return facetIndexPromise;
    },
    async loadDatasetForRoute(route: string, ordinal?: number) {
      const locator = await recordLocator();
      if (!locator) return null;
      const location = await recordLocation(locator, route, ordinal);
      if (!location) return null;
      const [chunkIndex, rowIndex] = location;
      const recordReference = locator.record_chunks[chunkIndex];
      if (!recordReference || !Number.isSafeInteger(rowIndex) || rowIndex < 0 || rowIndex >= locator.chunk_size) {
        throw new Error(`Record locator returned an invalid location for ${route}`);
      }
      let chunkPromise = recordChunkPromises.get(chunkIndex);
      if (!chunkPromise) {
        chunkPromise = fetchResource<LargeDataset[]>(
          integrityReference(recordReference, manifest.shards?.datasets || manifest.shards?.records, 'Dataset shard'),
          true
        );
        recordChunkPromises.set(chunkIndex, chunkPromise);
      }
      const record = (await chunkPromise)[rowIndex];
      const observedRoute = record?.route || (record?.name ? `dataset/${record.name}` : '');
      const canonicalRoute = locator.route_aliases?.[route] || route;
      if (!record || observedRoute !== canonicalRoute) {
        throw new Error(`Record locator resolved ${route} to a different record`);
      }
      return record;
    },
    loadFullIndex() {
      if (!fullIndexPromise) {
        const request = (async () => {
          const operationalPath = descriptorEntrypoint(descriptor, 'operational_metadata') || manifest.indexes.operational_metadata;
          const [rawDatasets, resources, publishers, facets, graph, govukContent, operationalMetadata] = await Promise.all([
            loadChunks<LargeDataset>(fetchResource, manifest.chunks?.datasets || manifest.chunks?.records || (manifest as Record<string, unknown>).record_shards as string[] || [], manifest.shards?.datasets || manifest.shards?.records, 'Dataset shard'),
            loadChunks<LargeResource>(fetchResource, manifest.chunks?.resources || [], manifest.shards?.resources, 'Resource shard'),
            loadChunks<LargePublisher>(fetchResource, manifest.chunks?.publishers || [], manifest.shards?.publishers, 'Publisher shard'),
            source.loadFacetIndex(),
            manifest.indexes.graph ? fetchResource<LargeGraphIndex>(manifest.indexes.graph) : {},
            manifest.indexes.govuk_content ? fetchResource<LargeGovukContent>(manifest.indexes.govuk_content) : {},
            operationalPath
              ? fetchResource<LargeOperationalMetadataIndex>(operationalPath)
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
        fullIndexPromise = request.catch((error) => {
          fullIndexPromise = null;
          throw error;
        });
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
      const locator = await recordLocator();
      const relationshipRoute = locator?.route_aliases?.[route] || route;
      const adjacencyPath = descriptorEntrypoint(descriptor, 'relationship_adjacency') || manifest.indexes.relationship_adjacency;
      let baseRelationships: LargeRelationship[];
      if (!adjacencyPath) {
        const result = await source.loadRelationships();
        baseRelationships = result.relationships.filter(
          (relationship) =>
            relationship.source === relationshipRoute ||
            relationship.target === relationshipRoute
        );
      } else {
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
        const bucket = relationshipBucket(relationshipRoute);
        const bucketPath = adjacency.buckets[bucket];
        if (!bucketPath) {
          baseRelationships = [];
        } else {
          const bucketReference = integrityReference(bucketPath, adjacency.shards, 'Relationship adjacency shard');
          let bucketPromise = adjacencyBucketPromises.get(bucket);
          if (!bucketPromise) {
            bucketPromise = fetchResource<Record<string, LargeRelationship[]>>(bucketReference, true);
            adjacencyBucketPromises.set(bucket, bucketPromise);
          }
          const rows = await bucketPromise;
          baseRelationships = rows[relationshipRoute] || [];
        }
      }
      const modelRelationships = await modelRelationshipsForRoute(locator, relationshipRoute);
      return mergeRelationships(baseRelationships, modelRelationships);
    }
  };
  return source;
}
