import indexText from '../vendor/okf-dwp-assembly-index.json?raw';
import descriptorText from '../vendor/okf-dwp-descriptor.json?raw';
import { createAskService } from './service.ts';
import { verifyBundledContext } from './registry.ts';
// Lazy verification starts inside the request context; no network or global I/O.
let approved: ReturnType<typeof verifyBundledContext> | undefined;
export default createAskService({
  loadContext: () => approved ??= verifyBundledContext(indexText, descriptorText),
  diagnostics: (entry) => console.log(JSON.stringify(entry))
});
