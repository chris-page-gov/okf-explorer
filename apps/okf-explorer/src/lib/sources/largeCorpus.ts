import type { LargeCorpusDescriptor, LargeDataManifest, LargeOverview } from '$lib/types';
import { baseUrlFor, fetchJson, resolveUrl } from './fetch';

export async function loadLargeCorpus(url: string) {
  const descriptor = await fetchJson<LargeCorpusDescriptor>(url);
  if (descriptor.kind !== 'okf-large-corpus') {
    throw new Error(`${url}: not an OKF large-corpus descriptor`);
  }
  const baseUrl = baseUrlFor(url);
  const manifest = await fetchJson<LargeDataManifest>(resolveUrl(descriptor.entrypoints.data_manifest, baseUrl));
  const overviewPath = descriptor.entrypoints.overview_index || manifest.indexes.overview;
  const overview = await fetchJson<LargeOverview>(resolveUrl(overviewPath, baseUrl));
  return { kind: 'large' as const, url, baseUrl, descriptor, manifest, overview };
}
