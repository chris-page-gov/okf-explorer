import { describe, expect, it } from 'vitest';
import { validateWorkbenchModels } from './modelValidation';
import type { CalculationModel, InteractionProposal } from './toolTypes';

const cases = new Set(['club-01', 'club-02']);
type Candidate = { calculation_models: CalculationModel[]; interaction_proposals: InteractionProposal[] };
const proposal = (): Candidate => ({
  calculation_models: [{
    id: 'room-cost', title: 'Fictional room cost readiness', status: 'blocked', authority: 'authored-unreviewed-proposal',
    case_ids: ['club-01'], components: ['Room use'], jurisdiction: null,
    effective_period: { from: null, to: null },
    inputs: [{ id: 'meeting-date', label: 'Meeting date', type: 'date', unit: null, reason: 'No reviewed date rule', required: null, group: 'Timing' }],
    stages: [{ id: 'check-room', label: 'Check room', description: 'Inspect the room note',
      evidence: [{ case_id: 'club-01', record_id: 'https://example.test/room-note' }], gaps: ['Source not reviewed'] }],
    gaps: ['No executable rule or reviewed rates']
  }],
  interaction_proposals: [{ id: 'room-interaction', case_id: 'club-01', from: 'Reading circle', to: 'Library room',
    distinction: 'Use versus booking', effect: 'A booking may be needed', qualification: 'Fictional and unreviewed',
    evidence: [{ case_id: 'club-02', record_id: 'https://example.test/booking-note' }], authority: 'authored-unreviewed-proposal' }]
});

function check(edit?: (candidate: Candidate) => void): void {
  const candidate = proposal();
  edit?.(candidate);
  validateWorkbenchModels(candidate, cases);
}

describe('admitted workbench modelling proposals', () => {
  it('accepts only blocked inspection, nullable unknown inputs and cited interactions', () => {
    expect(() => check()).not.toThrow();
    expect(() => check(candidate => { candidate.calculation_models[0].inputs[0].required = false; })).not.toThrow();
    expect(() => check(candidate => { candidate.calculation_models[0].effective_period = { from: '2026-01-01', to: '2026-12-31' }; })).not.toThrow();
    expect(() => validateWorkbenchModels({}, cases)).not.toThrow();
  });

  it.each([
    ['formula', (value: Candidate) => Object.assign(value.calculation_models[0], { formula: 'amount * rate' })],
    ['renderer', (value: Candidate) => Object.assign(value.calculation_models[0], { renderer: '<script>alert(1)</script>' })],
    ['remote configuration', (value: Candidate) => Object.assign(value.interaction_proposals[0], { remote_config: 'https://example.test/config' })],
    ['input expression', (value: Candidate) => Object.assign(value.calculation_models[0].inputs[0], { expression: 'eval(input)' })],
    ['evidence code', (value: Candidate) => Object.assign(value.calculation_models[0].stages[0].evidence[0], { code: 'run()' })]
  ])('rejects extraneous %s', (_label, edit) => {
    expect(() => check(edit)).toThrow(/Unsupported modelling field/);
  });

  it('rejects executable status, unreviewed authority changes and missing gaps', () => {
    expect(() => check(value => { Object.assign(value.calculation_models[0], { status: 'executable' }); })).toThrow(/blocked, unreviewed/);
    expect(() => check(value => { Object.assign(value.calculation_models[0], { authority: 'human-reviewed' }); })).toThrow(/blocked, unreviewed/);
    expect(() => check(value => { value.calculation_models[0].gaps = []; })).toThrow(/explain its gaps/);
    expect(() => check(value => { Object.assign(value.calculation_models[0].inputs[0], { required: undefined }); })).toThrow(/unknown/);
  });

  it('rejects unknown question scopes and uncited or out-of-scope evidence', () => {
    expect(() => check(value => { value.calculation_models[0].case_ids = ['outside']; })).toThrow(/question scope/);
    expect(() => check(value => { value.interaction_proposals[0].case_id = 'outside'; })).toThrow(/interaction scope/);
    expect(() => check(value => { value.calculation_models[0].stages[0].evidence[0].case_id = 'outside'; })).toThrow(/unknown question/);
    expect(() => check(value => { value.interaction_proposals[0].evidence = []; })).toThrow(/needs source references/);
  });

  it('rejects duplicate model, input, stage and interaction identifiers', () => {
    expect(() => check(value => { value.calculation_models.push(structuredClone(value.calculation_models[0])); })).toThrow(/duplicate modelling ID/);
    expect(() => check(value => { value.calculation_models[0].inputs.push(structuredClone(value.calculation_models[0].inputs[0])); })).toThrow(/duplicate modelling ID/);
    expect(() => check(value => { value.calculation_models[0].stages.push(structuredClone(value.calculation_models[0].stages[0])); })).toThrow(/duplicate modelling ID/);
    expect(() => check(value => { value.interaction_proposals.push(structuredClone(value.interaction_proposals[0])); })).toThrow(/duplicate modelling ID/);
  });

  it('rejects impossible and reversed effective dates', () => {
    expect(() => check(value => { value.calculation_models[0].effective_period.from = '2026-02-30'; })).toThrow(/Invalid model date/);
    expect(() => check(value => { value.calculation_models[0].effective_period = { from: '2026-12-01', to: '2026-01-01' }; })).toThrow(/reversed/);
  });
});
