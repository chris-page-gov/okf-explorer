import { createAskService } from './service.ts';
import { loadApprovedSource } from './bundles.ts';
// Lazy verification starts inside the request context. Corpus versions fetch
// immutable, manifest-bound assets; the custody index is entirely vendored.
export default createAskService({
  loadContext: loadApprovedSource,
  diagnostics: (entry) => console.log(JSON.stringify(entry))
});
