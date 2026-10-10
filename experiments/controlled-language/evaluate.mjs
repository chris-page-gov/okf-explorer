/** Bounded assessor-side regression signals. Never upgrades lexical coverage to semantic acceptance. */
export function evaluateRendering(text, assessor, provenanceValid = true) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 32768) throw new Error('Invalid rendering size');
  const flags = 'isu';
  const requirements = assessor.requirements.map((item) => ({
    id: item.id, dimension: item.dimension, stage: item.stage, basis: item.basis,
    status: item.all.every((pattern) => new RegExp(pattern, flags).test(text)) ? 'signal-present' : 'signal-missing',
  }));
  const forbidden = assessor.forbidden.filter((item) => new RegExp(item.pattern, flags).test(text));
  const citations = [...text.matchAll(/\[([A-Z][A-Z0-9]*-\d+)\]/g)].map((m) => m[1]);
  const missingCitations = assessor.citations.filter((id) => !citations.includes(id));
  const unknownCitations = citations.filter((id) => !assessor.citations.includes(id));
  const failed = requirements.some((row) => row.status === 'signal-missing')
    || forbidden.length > 0 || missingCitations.length > 0 || unknownCitations.length > 0 || !provenanceValid;
  return {
    method: assessor.method, assessor_status: assessor.status,
    requirements, forbidden_claim_signals: forbidden,
    missing_citations: missingCitations, unknown_citations: unknownCitations,
    provenance_binding: provenanceValid ? 'passed' : 'failed',
    citation_presence: missingCitations.length || unknownCitations.length ? 'failed' : 'passed',
    bounded_checks: failed ? 'failed' : 'passed',
    semantic_preservation: failed ? 'failed-development-checks' : 'not-established',
    unsupported_claims: null,
    unsupported_claims_note: 'Not exhaustively assessed; only declared forbidden patterns were checked.',
    review_status: 'independent review required',
    not_measured: assessor.not_measured,
    stages: {
      A: 'source bytes checked separately by evidence lock',
      B: 'declared phrase signals only; graph semantics not re-evaluated',
      C: 'not measured; fixed source-guided package',
      D: 'not measured; no traversal change',
      E: 'same evidence digest in each rendering request',
      F: provenanceValid ? 'digest binding passed; citation support needs review' : 'failed',
      G: requirements.filter((r) => r.stage === 'G'),
      H: 'evidence remains insufficient; no individual answerability established',
    },
  };
}
