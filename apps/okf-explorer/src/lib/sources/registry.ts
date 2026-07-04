import type { BundleRegistryEntry } from '$lib/types';
import { fetchJson } from './fetch';

const HISTORY_KEY = 'okfExplorerBundleHistory:v2';

export function loadHistory(): BundleRegistryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as BundleRegistryEntry[];
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.url).slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function rememberHistory(entry: BundleRegistryEntry): BundleRegistryEntry[] {
  const history = loadHistory().filter((item) => item.url !== entry.url);
  const next = [{ ...entry, kind: entry.kind || 'history' }, ...history].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function loadRegistry(url: string): Promise<BundleRegistryEntry[]> {
  try {
    const registry = await fetchJson<{ bundles?: BundleRegistryEntry[]; entries?: BundleRegistryEntry[] }>(url);
    return [...(registry.bundles || []), ...(registry.entries || [])].filter((entry) => entry.url);
  } catch {
    return [];
  }
}
