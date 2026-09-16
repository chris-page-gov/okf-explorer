import { contextSha256 } from '../lib/context/index';
import type { ContextIndex, ContextRecord } from '../lib/context/types.ts';

/** Synthetic assertions over excerpts from the fictional study-club example.
 * Not a claim that Markdown hyperlinks themselves encode room-use semantics.
 */
export async function studyClubContextFixture(): Promise<ContextIndex> {
  const base = 'https://example.test/study-club/';
  const texts: Record<string, string> = {
    reading: 'The reading circle meets on Tuesday at 18:30 in the [Library room](library-room.md). It is free.',
    library: 'The Library room is recorded as step-free. No address or capacity is recorded.',
    repair: 'The repair demonstration meets on Saturday at 10:00 in the [Workshop room](workshop-room.md). [Booking](booking.md) is required. Its price is not recorded.',
    workshop: 'Accessibility for the Workshop room is not recorded. No address or capacity is recorded.',
    booking: 'Booking is required for the [Repair demonstration](repair-demonstration.md). No telephone number, booking URL or availability is recorded.'
  };
  const names: Record<string, string> = {
    reading: 'Reading circle', library: 'Library room', repair: 'Repair demonstration',
    workshop: 'Workshop room', booking: 'Booking'
  };
  const records: ContextRecord[] = [];
  for (const [name, text] of Object.entries(texts)) {
    const literal = await contextSha256(text);
    records.push({ id: `${base}evidence/${name}`, route: `evidence/${name}`, label: names[name], kind: 'evidence',
      text, assertion_status: 'normalized', authority: { class: 'synthetic', label: 'Fictional study-club teaching fixture', source: base },
      scope: 'Invented teaching data. No real event or service.', provenance: [{ url: `${base}${name}.md`, source_sha256: literal,
        locator: 'Fictional source excerpt', captured_at: '2026-09-16T00:00:00Z', source_date: '2026-09-06', source_date_kind: 'fictional note date', literal_sha256: literal }],
      rights: 'CC0 synthetic fixture', access: 'public' });
  }
  for (const name of ['reading', 'repair']) {
    const original = records.find((r) => r.id === `${base}evidence/${name}`)!;
    records.push({ ...original, id: `${base}concept/${name}`, route: `concept/${name}`, kind: 'concept',
      label: names[name], text: `Navigation concept for ${names[name]}.`, aliases: [names[name]], provenance: original.provenance.map(({ literal_sha256: _literal, ...p }) => p) });
  }
  const dependencies = [
    ['concept/reading', 'evidence/reading'], ['evidence/reading', 'evidence/library'],
    ['concept/repair', 'evidence/repair'], ['evidence/repair', 'evidence/workshop'], ['evidence/repair', 'evidence/booking']
  ];
  return { schema: 'okf-context-index.v1', bundle: { id: `${base}bundle`, snapshot: 'synthetic-study-club-v1', source_url: `${base}index.json` },
    scope: 'Source explanation for the fictional study club.', limitations: ['Synthetic fixture; not real service information.'], records,
    assertions: dependencies.map(([source, target], i) => ({ id: `${base}assertion/${i}`, source: base + source, target: base + target,
      predicate: 'http://purl.org/dc/terms/requires', label: 'requires contextual evidence', assertion_status: 'model-derived',
      authority: { class: 'synthetic', label: 'Explicit synthetic evidence dependency', source: base },
      scope: 'Context dependency; not a domain predicate inferred from a hyperlink.',
      provenance: records.find((r) => r.id === base + target)!.provenance.map(({ literal_sha256: _literal, ...p }) => p) })),
    requirements: ['reading', 'repair'].map((name) => ({ id: `${base}requirement/${name}`, label: `${names[name]} context`,
      when_all: [`${base}concept/${name}`], required: [name, ...(name === 'reading' ? ['library'] : ['workshop', 'booking'])].map((s) => `${base}evidence/${s}`),
      scope: 'Retain activity, location and booking evidence including explicitly unknown facts.' })) };
}
