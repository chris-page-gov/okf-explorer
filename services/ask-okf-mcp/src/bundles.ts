import indexText from '../vendor/okf-dwp-assembly-index.json?raw';
import descriptorText from '../vendor/okf-dwp-descriptor.json?raw';
import manifestText from '../vendor/okf-dwp-corpus-manifest.json?raw';
import { BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, verifyBundledContext, verifyBundledCorpus,
  type ApprovedSource } from './registry.ts';

let legacy: ReturnType<typeof verifyBundledContext> | undefined;
let corpus: ReturnType<typeof verifyBundledCorpus> | undefined;

/** Only registry-selected immutable sources are available to a client. */
export function loadApprovedSource(version = BUNDLE_VERSION): Promise<ApprovedSource> {
  if (version === LEGACY_BUNDLE_VERSION) return legacy ??= verifyBundledContext(indexText, descriptorText);
  if (version === BUNDLE_VERSION) return corpus ??= verifyBundledCorpus(manifestText);
  return Promise.reject(new Error('Bundle version is not approved.'));
}
