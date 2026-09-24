import type { ContextPackage } from '../context/types';
import type { WorkbenchManifest } from './workbench';

export const WORKBENCH_VIEWS = ['source', 'extraction', 'passage', 'ontology', 'definitions', 'trace', 'review', 'graph', 'interactions', 'requirements', 'rates', 'calculation'] as const;
export type WorkbenchView = typeof WORKBENCH_VIEWS[number];
export const DATA_VIEWS = ['graph', 'interactions', 'requirements', 'rates', 'calculation'] as const;
export type DataView = typeof DATA_VIEWS[number];
export type EvidenceReference = { case_id: string; record_id: string };

/** Producer-authored modelling proposal. This version deliberately has no execution contract. */
export type CalculationModel = {
  id: string; title: string; status: 'blocked'; authority: 'authored-unreviewed-proposal';
  case_ids: string[]; components: string[]; jurisdiction: string | null;
  effective_period: { from: string | null; to: string | null };
  inputs: Array<{ id: string; label: string; type: 'money' | 'date' | 'boolean' | 'enum' | 'integer'; unit: string | null; reason: string; required: boolean | null; group: string }>;
  stages: Array<{ id: string; label: string; description: string; evidence: EvidenceReference[]; gaps: string[] }>;
  gaps: string[];
};
export type InteractionProposal = {
  id: string; case_id: string; from: string; to: string; distinction: string;
  effect: string; qualification: string; evidence: EvidenceReference[];
  authority: 'authored-unreviewed-proposal';
};
export type WorkbenchPageState = {
  revision: number; loading: boolean; manifest: WorkbenchManifest | null;
  manifestUrl: string | null; manifestDigest: string | null;
  caseId: string | null; recordId: string | null; view: WorkbenchView;
  context: ContextPackage | null;
};
export type Presentation = { case_id: string; record_id?: string; view: WorkbenchView; result_id?: string };
export type WorkbenchPort = {
  state: () => WorkbenchPageState;
  /** Must apply atomically, check the revision after loading, and await the render. */
  present: (selection: Presentation, expectedRevision: number, signal: AbortSignal) => Promise<void>;
  deepLink: (selection: Presentation) => string;
};
export type ViewCell = string | number | boolean | null | string[];
export type ViewPayload = {
  schema: 'okf-workbench-view.v1'; kind: DataView; title: string;
  fields: Array<{ key: string; label: string; type: 'string' | 'number' | 'boolean'; unit?: string }>;
  rows: Array<Record<string, ViewCell>>;
  nodes?: Array<{ ref: string; label: string; status: string }>;
  edges?: Array<{ ref: string; source: string; target: string; label: string; status: string }>;
  time_basis: { assessment_date: string | null; effective_from: string | null; effective_to: string | null };
  provenance: Array<{ ref: string; url: string; locator: string; source_date: string | null }>;
  limitations: string[]; authority: 'retained-evidence-projection' | 'authored-unreviewed-proposal';
  coverage?: { offset: number; total_rows: number; delivered_rows: number; complete: boolean; next_cursor: string | null };
};
export type WorkbenchResult = {
  schema: 'okf-workbench-result.v1'; snapshot_id: string | null; result_id?: string;
  evidence_status: 'sufficient' | 'insufficient' | 'conflicting' | 'not-loaded';
  state_revision: number; data?: Record<string, unknown> | ViewPayload;
  delivery: { complete: boolean; next_cursor: string | null; bytes: number; characters: number; estimated_tokens: number };
  error?: { code: string; message: string; recovery: string };
  limitations: string[];
};
