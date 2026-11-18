import AxeBuilder from '@axe-core/playwright';

import { expect, test } from '../browserDiagnostics';

test('all beginner guide pages pass fragment and automated accessibility checks', async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('docs/beginners/index.html');
  const guideBase = new URL('.', page.url()).href;
  const referenceResponse = await page.request.get(new URL('cross-references.json', guideBase).href);
  expect(referenceResponse.ok()).toBe(true);
  const references: { schema: string; pages: Record<string, string[]> } = await referenceResponse.json();
  expect(references.schema).toBe('okf-beginner-guide-cross-references.v1');
  const routes = await page.getByRole('navigation', { name: 'Beginner guide chapters' })
    .getByRole('link').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  expect(routes.every(route => route.startsWith(guideBase) && route.endsWith('.html'))).toBe(true);
  expect(routes.length).toBeGreaterThanOrEqual(27);
  expect(new Set(routes).size).toBe(routes.length);

  const chapters: Array<{ route: string; headings: string[]; manualChecks: string[] }> = [];
  for (const route of routes) {
    const response = await page.goto(route);
    expect([200, 304], route).toContain(response?.status());
    const main = page.locator('#main-content');
    const title = main.getByRole('heading', { level: 1 });
    await expect(title).toHaveCount(1);
    const headings = await main.locator('h2[id], h3[id], h4[id], h5[id], h6[id]')
      .evaluateAll(elements => elements.map(element => element.id));
    expect(headings.length, route).toBeGreaterThan(0);
    expect(new Set(headings).size, route).toBe(headings.length);
    expect(references.pages[route.slice(guideBase.length)], route)
      .toEqual([await title.getAttribute('id'), ...headings]);

    const unmatched = await page.evaluate(ids => {
      return ids.filter(id => {
        location.replace(`#${encodeURIComponent(id)}`);
        return document.querySelector(':target')?.id !== id;
      });
    }, headings);
    expect(unmatched, route).toEqual([]);

    const last = headings.at(-1)!;
    const deepLink = new URL(`#${encodeURIComponent(last)}`, route);
    await page.goto(deepLink.href);
    await page.reload();
    await expect(main.locator(':target')).toHaveAttribute('id', last);
    const first = headings[0];
    if (first !== last) {
      await page.goto(new URL(`#${encodeURIComponent(first)}`, route).href);
      await expect(main.locator(':target')).toHaveAttribute('id', first);
      await page.goBack();
      await expect(main.locator(':target')).toHaveAttribute('id', last);
      await page.goForward();
      await expect(main.locator(':target')).toHaveAttribute('id', first);
    }

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => node.target) })), route).toEqual([]);
    chapters.push({ route, headings, manualChecks: scan.incomplete.map(finding => finding.id) });
  }
  await info.attach('observed-guide-fragments', {
    body: JSON.stringify(chapters, null, 2),
    contentType: 'application/json'
  });
});
