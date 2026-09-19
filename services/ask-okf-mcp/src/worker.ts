import { createAskService } from './service.ts';
import { loadApprovedSource } from './bundles.ts';
// Lazy verification starts inside the request context. Only the new corpus
// version fetches immutable, manifest-bound assets through the shared core.
export default createAskService({
  loadContext: loadApprovedSource,
  diagnostics: (entry) => console.log(JSON.stringify(entry))
});
