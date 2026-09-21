import indexText from '../vendor/okf-dwp-assembly-index.json?raw';
import descriptorText from '../vendor/okf-dwp-descriptor.json?raw';
import manifestText from '../vendor/okf-dwp-corpus-manifest.json?raw';
import householdManifestText from '../vendor/okf-dwp-household-corpus-manifest.json?raw';
import staffManifestText from '../vendor/okf-dwp-staff-corpus-manifest.json?raw';
import previousManifestText from '../vendor/okf-dwp-previous-corpus-manifest.json?raw';
import { BUNDLE_VERSION, HOUSEHOLD_BUNDLE_VERSION, LEGACY_BUNDLE_VERSION, STAFF_BUNDLE_VERSION, PREVIOUS_BUNDLE_VERSION, verifyBundledContext, verifyBundledCorpus,
  type ApprovedSource } from './registry.ts';

let legacy: ReturnType<typeof verifyBundledContext> | undefined;
let household: ReturnType<typeof verifyBundledCorpus> | undefined;
let staff: ReturnType<typeof verifyBundledCorpus> | undefined;
let previous: ReturnType<typeof verifyBundledCorpus> | undefined;
let corpus: ReturnType<typeof verifyBundledCorpus> | undefined;

/** Only registry-selected immutable sources are available to a client. */
export function loadApprovedSource(version = BUNDLE_VERSION): Promise<ApprovedSource> {
  if (version === LEGACY_BUNDLE_VERSION) return legacy ??= verifyBundledContext(indexText, descriptorText);
  if (version === BUNDLE_VERSION) return corpus ??= verifyBundledCorpus(manifestText);
  if (version === HOUSEHOLD_BUNDLE_VERSION) return household ??= verifyBundledCorpus(householdManifestText, version);
  if (version === STAFF_BUNDLE_VERSION) return staff ??= verifyBundledCorpus(staffManifestText, version);
  if (version === PREVIOUS_BUNDLE_VERSION) return previous ??= verifyBundledCorpus(previousManifestText, version);
  return Promise.reject(new Error('Bundle version is not approved.'));
}
