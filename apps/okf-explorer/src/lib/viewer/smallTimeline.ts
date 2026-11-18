import type { OkfNode } from '$lib/types';
import { hansardProceedings, type HansardProceedings } from './hansardPresentation';

type DatePrecision = 'year' | 'month' | 'day' | 'timestamp';

export type SmallTimelineDate = {
  value: string;
  display: string;
  precision: DatePrecision;
  label: string;
};

export type SmallTimelineRow = {
  node: OkfNode;
  primary: SmallTimelineDate;
  audit: SmallTimelineDate[];
  proceedings?: HansardProceedings;
  markers?: SmallTimelineDate[];
};

const PUBLISHED = ['schema:datePublished', 'https://schema.org/datePublished', 'http://schema.org/datePublished', 'datePublished'];
const ISSUED = ['dcterms:issued', 'http://purl.org/dc/terms/issued', 'issued'];
const ABOUT = ['schema:about', 'https://schema.org/about', 'http://schema.org/about', 'about'];
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' });
const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const WESTMINSTER_FORMAT = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  second: '2-digit', timeZone: 'Europe/London', timeZoneName: 'short'
});
const ZONE = /(?:Z|[+-]\d{2}:\d{2})$/;

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function scalarValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(scalarValues);
  if (typeof value === 'string') return [value.trim()];
  const literal = record(value)?.['@value'];
  return typeof literal === 'string' ? [literal.trim()] : [];
}

function parseDate(value: string, label: string, clock?: 'source' | 'westminster'): SmallTimelineDate | undefined {
  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2})(T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?)?)?$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2] || 1);
  const day = Number(match[3] || 1);
  // The temporary calendar values validate and format partial dates only.
  // They never become a claimed publication day or exported datetime.
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (year < 1 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return undefined;
  const precision: DatePrecision = match[4] ? 'timestamp' : match[3] ? 'day' : match[2] ? 'month' : 'year';
  let display = precision === 'year' ? match[1] : (match[3] ? DAY_FORMAT : MONTH_FORMAT).format(calendar);
  if (clock && match[4]) {
    const zone = match[4].match(ZONE)?.[0];
    if (clock === 'westminster' && zone) {
      display = WESTMINSTER_FORMAT.format(new Date(value));
    } else {
      const time = zone ? match[4].slice(1, -zone.length) : match[4].slice(1);
      display += ` at ${time} ${zone === 'Z' ? 'UTC' : zone || '(time zone unrecorded)'}`;
    }
  }
  return { value, display, precision, label };
}

function dateDeclaration(values: unknown[], label: string, clock?: 'source'): { date?: SmallTimelineDate; conflicting: boolean } {
  const dates = values.flatMap(scalarValues).map((value) => parseDate(value, label, clock))
    .filter((date): date is SmallTimelineDate => Boolean(date));
  const unique = new Map(dates.map((date) => [date.value, date]));
  // Missing and conflicting declarations must remain distinct: an ambiguous
  // subject cannot disappear when dates from several subjects are compared.
  return { date: unique.size === 1 ? [...unique.values()][0] : undefined, conflicting: unique.size > 1 };
}

function declaredDate(values: unknown[], label: string): SmallTimelineDate | undefined {
  return dateDeclaration(values, label).date;
}

function publicationDate(records: Record<string, unknown>[], subject: 'Source' | 'Record'): SmallTimelineDate | undefined {
  const dates: SmallTimelineDate[] = [];
  for (const item of records) {
    const published = dateDeclaration(PUBLISHED.map((key) => item[key]), `${subject} published`, 'source');
    const issued = dateDeclaration(ISSUED.map((key) => item[key]), `${subject} issued`, 'source');
    if (published.conflicting || issued.conflicting) return undefined;
    const date = published.date || issued.date;
    if (date) dates.push(date);
  }
  // Resolve each described subject before comparing them: differing predicates
  // must not conceal conflicting dates belonging to different publications.
  if (!dates.length || new Set(dates.map((date) => date.value)).size !== 1) return undefined;
  return new Set(dates.map((date) => date.label)).size === 1 ? dates[0]
    : { ...dates[0], label: `${subject} published or issued` };
}

/** Timeline presentation only: it never rewrites a record's generation or trust metadata. */
export function smallNodeTimeline(node: OkfNode): SmallTimelineRow | undefined {
  const subjects = ABOUT.flatMap((key) => Array.isArray(node[key]) ? node[key] : [node[key]])
    .map(record).filter((item): item is Record<string, unknown> => Boolean(item));
  const sourcePublication = publicationDate(subjects, 'Source');
  const recordPublication = publicationDate([node], 'Record');
  const capture = declaredDate([node.retrieved_at, node.captured_at, record(node.provenance)?.retrieved_at], 'Captured');
  const observed = declaredDate([node.observedAt, node.observed_at], 'Observed');
  const generated = declaredDate([record(node.generated)?.at], 'Record generated');
  const timestamp = dateDeclaration([node.timestamp], 'Recorded timestamp', 'source').date;
  const proceedings = hansardProceedings(node);
  const sourcedTime = proceedings?.contribution_time
    ? parseDate(proceedings.contribution_time, 'Contribution time', 'westminster')
    : undefined;
  const contribution = sourcedTime?.precision === 'timestamp' ? sourcedTime : undefined;
  const sitting = proceedings ? parseDate(proceedings.sitting_date, 'Sitting date') : undefined;
  const markers = proceedings?.markers.map(marker => parseDate(marker.value, 'Proceedings time marker', 'westminster'))
    .filter((date): date is SmallTimelineDate => date?.precision === 'timestamp');
  const dates = [contribution || sitting, sourcePublication, recordPublication, capture, observed, generated, proceedings ? undefined : timestamp]
    .filter((date): date is SmallTimelineDate => Boolean(date));
  if (!dates.length) return undefined;
  return { node, primary: dates[0], audit: dates.slice(1), proceedings, markers };
}

export function smallTimelineRows(nodes: OkfNode[]): SmallTimelineRow[] {
  const rows = nodes.map(smallNodeTimeline).filter((row): row is SmallTimelineRow => Boolean(row));
  const group = (row: SmallTimelineRow) => row.proceedings?.section_id || '';
  const day = (row: SmallTimelineRow) => row.proceedings?.sitting_date || row.primary.value.split('T')[0];
  rows.sort((left, right) => day(right).localeCompare(day(left)) || group(left).localeCompare(group(right))
    || (left.proceedings && right.proceedings
      ? (left.proceedings.source_item || 0) - (right.proceedings.source_item || 0)
      : right.primary.value.localeCompare(left.primary.value))
    || left.node.title.localeCompare(right.node.title));

  // Exact times can reorder timed contributions within their own section.
  // Untimed slots stay in source order and wall-clock times only compare
  // with other wall-clock times from the same source section.
  const comparable = new Map<string, number[]>();
  rows.forEach((row, index) => {
    if (!row.proceedings?.source_item || row.primary.label !== 'Contribution time') return;
    const key = `${day(row)}|${group(row)}|${ZONE.test(row.primary.value) ? 'instant' : 'wall'}`;
    const positions = comparable.get(key);
    if (positions) positions.push(index);
    else comparable.set(key, [index]);
  });
  for (const positions of comparable.values()) {
    const sortTime = (row: SmallTimelineRow) => Date.parse(ZONE.test(row.primary.value) ? row.primary.value : `${row.primary.value}Z`);
    const timed = positions.map(index => rows[index]).sort((left, right) => sortTime(left) - sortTime(right));
    positions.forEach((position, index) => { rows[position] = timed[index]; });
  }
  return rows;
}
