import type { OkfNode } from '$lib/types';
import { isHttpUrl } from './helpers';

type SourceMarker = { value: string; source_item: number; source_field: string };

export type HansardProceedings = {
  section_id: string;
  section_title: string;
  sitting_date: string;
  house: 'Commons' | 'Lords';
  speaker: string;
  source_item?: number;
  contribution_time?: string;
  markers: SourceMarker[];
};

function sourcePosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

// The projection describes a single producer's source fields. The browser
// keeps the source item position separate from the global record order.
export function hansardProceedings(node: OkfNode): HansardProceedings | undefined {
  const raw = node.hansard_proceedings as Record<string, unknown> | undefined;
  if (!raw || raw.schema !== 'okf-hansard-proceedings.v1'
    || typeof raw.section_id !== 'string' || !raw.section_id
    || typeof raw.section_title !== 'string' || !raw.section_title
    || typeof raw.sitting_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.sitting_date)
    || (raw.house !== 'Commons' && raw.house !== 'Lords')) return undefined;

  const markers = Array.isArray(raw.markers) ? raw.markers.slice(0, 64).filter((mark): mark is SourceMarker =>
    mark && typeof mark.value === 'string' && sourcePosition(mark.source_item)
    && typeof mark.source_field === 'string'
  ) : [];
  return {
    section_id: raw.section_id,
    section_title: raw.section_title,
    sitting_date: raw.sitting_date,
    house: raw.house,
    speaker: typeof raw.speaker === 'string' ? raw.speaker : '',
    source_item: sourcePosition(raw.source_item) ? raw.source_item : undefined,
    contribution_time: typeof raw.contribution_time === 'string' ? raw.contribution_time : undefined,
    markers
  };
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function hansardResultEvidence(node: OkfNode) {
  const proceedings = hansardProceedings(node);
  if (!proceedings?.source_item || !isHttpUrl(node.url)) return undefined;
  const source = new URL(node.url);
  if (source.origin !== 'https://hansard.parliament.uk' || !/^#contribution-[a-z0-9-]+$/i.test(source.hash)) return undefined;
  const sitting = new Date(`${proceedings.sitting_date}T00:00:00Z`);
  if (!Number.isFinite(sitting.getTime()) || sitting.toISOString().slice(0, 10) !== proceedings.sitting_date) return undefined;
  const summary = node.hansard_summary as Record<string, unknown> | undefined;
  return {
    source: node.url,
    metadata: [proceedings.speaker, `House of ${proceedings.house}`, DATE.format(sitting), `Source item ${proceedings.source_item}`]
      .filter(Boolean).join(' · '),
    summary: summary?.source === node.url && typeof summary.text === 'string' && summary.text.trim()
      ? summary.text.trim().slice(0, 1200)
      : undefined
  };
}
