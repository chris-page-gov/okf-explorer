/** Fixed verification questions and budgets; these are acceptance cases, not engine rules. */
export function verificationCases(current, previous, legacy) {
  const imprisonment = 'A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance.';
  const childDisability = 'What is the interaction between Child DLA and PIP?';
  return {
    full: [
      { id: 'imprisonment', question: imprisonment, expected: 'insufficient', version: current },
      { id: 'hospital', question: 'A claimant is admitted to hospital. Explain the effect on JSA, Income Support, State Pension Credit and ESA, distinguishing entitlement, payment and changes in amount, and trace each conclusion to the applicable DWP guidance.', expected: 'insufficient', version: current },
      { id: 'historical-imprisonment', question: imprisonment, expected: 'sufficient', version: legacy },
      { id: 'previous-corpus-imprisonment', question: imprisonment, expected: 'insufficient', version: previous },
      { id: 'staff-child-dla-pip', question: childDisability, expected: 'insufficient', version: current, budget: { max_bytes: 262144 } }
    ],
    compact: [
      { id: 'staff-child-dla-pip-compact-delivery', question: childDisability, version: current, budget: { max_bytes: 262144 } },
      { id: 'previous-bounded-abroad-compact-delivery', question: 'What happens to your benefits if you go abroad?', version: previous, budget: { max_bytes: 32768 } },
      { id: 'historical-custody-compact-delivery', question: imprisonment, version: legacy }
    ]
  };
}
