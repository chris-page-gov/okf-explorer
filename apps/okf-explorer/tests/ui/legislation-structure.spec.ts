import { expect, test } from '@playwright/test';

test('CLML keeps repeated wording, a long ending and source hierarchy', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { parseClml } = await import(/* @vite-ignore */ '/src/lib/legislation/structure.ts' as string) as typeof import('../../src/lib/legislation/structure');
    const ending = 'Final qualification after the excerpt boundary';
    const longText = 'A'.repeat(2500) + ending;
    const xml = `<Legislation><Body><P1 id="section-70" DocumentURI="http://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29" Version="2026-04-29"><Number>70</Number><P1para><Text>${longText}</Text><Text>Repeated legal wording.</Text><Text>Repeated legal wording.</Text></P1para><P2 id="section-70-subsection-1" Status="repealed"><P2para><Text>Nested status wording.</Text></P2para></P2></P1></Body></Legislation>`;
    const rows = parseClml(xml, 'https://www.legislation.gov.uk/ukpga/1992/4/2026-04-29');
    return { section: rows.find((row) => row.id === 'section-70'), child: rows.find((row) => row.id === 'section-70-subsection-1') };
  });
  expect(result.section?.text).toContain('Final qualification after the excerpt boundary');
  expect(result.section?.excerpt).not.toContain('Final qualification after the excerpt boundary');
  expect(result.section?.text.match(/Repeated legal wording\./g)).toHaveLength(2);
  expect(result.section?.sourceDocumentUri).toBe('http://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
  expect(result.section?.sourceVersion).toBe('2026-04-29');
  expect(result.section?.officialUrl).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
  expect(result.child?.parentId).toBe('section-70');
  expect(result.child?.depth).toBe((result.section?.depth ?? 0) + 1);
  expect(result.child?.status).toBe('repealed');
  expect(result.section?.text).toContain('Nested status wording.');
  expect(result.section?.ownText).not.toContain('Nested status wording.');
});

test('CLML rejects hostile source-native links and oversized parse input', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { parseClml, MAX_CLML_BYTES } = await import(/* @vite-ignore */ '/src/lib/legislation/structure.ts' as string) as typeof import('../../src/lib/legislation/structure');
    const rows = parseClml('<Legislation><Body><P1 id="section-70" DocumentURI="javascript:alert(1)"><Text>Safe text</Text></P1></Body></Legislation>', 'https://www.legislation.gov.uk/ukpga/1992/4/2026-04-29');
    let error = '';
    try { parseClml('a'.repeat(MAX_CLML_BYTES + 1), 'https://www.legislation.gov.uk/ukpga/1992/4'); }
    catch (caught) { error = String(caught); }
    return { url: rows.find((row) => row.id === 'section-70')?.officialUrl, error };
  });
  expect(result.url).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-04-29');
  expect(result.error).toContain('8 MiB parse limit');
});

test('territorial versions with the same XML ID remain separate source occurrences', async ({ page }) => {
  await page.goto('/');
  const rows = await page.evaluate(async () => {
    const { parseClml } = await import(/* @vite-ignore */ '/src/lib/legislation/structure.ts' as string) as typeof import('../../src/lib/legislation/structure');
    const xml = `<Legislation><Body>
      <P1 id="section-70" IdURI="http://www.legislation.gov.uk/id/ukpga/1992/4/section/70" DocumentURI="http://www.legislation.gov.uk/ukpga/1992/4/section/70/england+wales/2026-09-20"><Text>England and Wales wording.</Text><P2 id="section-70-subsection-1"><Text>First child.</Text></P2></P1>
      <P1 id="section-70" IdURI="http://www.legislation.gov.uk/id/ukpga/1992/4/section/70" DocumentURI="http://www.legislation.gov.uk/ukpga/1992/4/section/70/scotland/2026-09-20"><Text>Scotland wording.</Text><P2 id="section-70-subsection-1"><Text>Second child.</Text></P2></P1>
    </Body></Legislation>`;
    return parseClml(xml, 'https://www.legislation.gov.uk/ukpga/1992/4/2026-09-20');
  });
  const sections = rows.filter((row) => row.id === 'section-70');
  expect(sections).toHaveLength(2);
  expect(sections.map((row) => row.officialUrl)).toEqual([
    'https://www.legislation.gov.uk/ukpga/1992/4/section/70/england+wales/2026-09-20',
    'https://www.legislation.gov.uk/ukpga/1992/4/section/70/scotland/2026-09-20'
  ]);
  expect(sections.map((row) => row.ownText)).toEqual(['England and Wales wording.', 'Scotland wording.']);
  expect(sections[0].text).toContain('First child.');
  expect(sections[1].text).toContain('Second child.');
  expect(sections[0].sourceIdUri).toBe(sections[1].sourceIdUri);
  expect(sections[0].key).not.toBe(sections[1].key);
  expect(rows.find((row) => row.text === 'First child.')?.parentKey).toBe(sections[0].key);
  expect(rows.find((row) => row.text === 'Second child.')?.parentKey).toBe(sections[1].key);
});

test('complete subtree text retains numbered qualifications, tables and formulae', async ({ page }) => {
  await page.goto('/');
  const section = await page.evaluate(async () => {
    const { parseClml } = await import(/* @vite-ignore */ '/src/lib/legislation/structure.ts' as string) as typeof import('../../src/lib/legislation/structure');
    const xml = '<Legislation><Body><P1 id="section-70"><Number>70</Number><Title>Qualifying cases</Title><P1para><Text>Opening wording.</Text></P1para><P2 id="section-70-subsection-1"><Pnumber>(1)</Pnumber><P2para><Text>Subject to the final qualification.</Text><Table><Row><Cell>Included table condition</Cell></Row></Table><Formula><Math>x+y=2</Math></Formula><AppendText>unless excluded.</AppendText></P2para></P2></P1></Body></Legislation>';
    return parseClml(xml, 'https://www.legislation.gov.uk/ukpga/1992/4')[1];
  });
  expect(section.text).toContain('70 Qualifying cases Opening wording. (1) Subject to the final qualification. Included table condition x+y=2 unless excluded.');
  expect(section.ownText).toBe('Opening wording.');
});

test('deep XML is rejected before passage extraction', async ({ page }) => {
  await page.goto('/');
  const message = await page.evaluate(async () => {
    const { parseClml, MAX_CLML_NESTING } = await import(/* @vite-ignore */ '/src/lib/legislation/structure.ts' as string) as typeof import('../../src/lib/legislation/structure');
    const xml = `<Legislation>${'<Wrapper>'.repeat(MAX_CLML_NESTING + 1)}<P1 id="section-1"><Text>Text</Text></P1>${'</Wrapper>'.repeat(MAX_CLML_NESTING + 1)}</Legislation>`;
    try { parseClml(xml, 'https://www.legislation.gov.uk/ukpga/1992/4'); return ''; }
    catch (error) { return String(error); }
  });
  expect(message).toContain('nesting limit');
});

test('an undated or mismatched source link cannot replace the requested version', async ({ page }) => {
  await page.goto('/');
  const rows = await page.evaluate(async () => {
    const { parseClml } = await import(/* @vite-ignore */ '/src/lib/legislation/structure.ts' as string) as typeof import('../../src/lib/legislation/structure');
    const xml = '<Legislation><Body><P1 id="section-70" DocumentURI="https://www.legislation.gov.uk/ukpga/1992/4/section/70"><Text>Undated.</Text></P1><P1 id="section-71" DocumentURI="https://www.legislation.gov.uk/ukpga/1992/4/section/71/2025-01-01"><Text>Wrong date.</Text></P1></Body></Legislation>';
    return parseClml(xml, 'https://www.legislation.gov.uk/ukpga/1992/4/2026-09-20');
  });
  expect(rows.find((row) => row.id === 'section-70')?.officialUrl).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/70/2026-09-20');
  expect(rows.find((row) => row.id === 'section-71')?.officialUrl).toBe('https://www.legislation.gov.uk/ukpga/1992/4/section/71/2026-09-20');
  expect(rows.find((row) => row.id === 'section-71')?.sourceDocumentUri).toContain('2025-01-01');
});
