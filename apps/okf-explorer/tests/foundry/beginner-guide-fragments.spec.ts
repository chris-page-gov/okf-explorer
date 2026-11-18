import { expect, test } from '../browserDiagnostics';

test('each beginner guide chapter exposes its declared heading fragments', async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('docs/beginners/index.html');
  const guideBase = new URL('.', page.url()).href;
  const routes = await page.getByRole('navigation', { name: 'Beginner guide chapters' })
    .getByRole('link').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  expect(routes.every(route => route.startsWith(guideBase) && route.endsWith('.html'))).toBe(true);
  expect(routes.length).toBeGreaterThanOrEqual(27);
  expect(new Set(routes).size).toBe(routes.length);

  const chapters: Array<{ route: string; headings: string[] }> = [];
  for (const route of routes) {
    const response = await page.goto(route);
    expect([200, 304], route).toContain(response?.status());
    const main = page.locator('#main-content');
    await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
    const headings = await main.locator('h2[id], h3[id], h4[id], h5[id], h6[id]')
      .evaluateAll(elements => elements.map(element => element.id));
    expect(headings.length, route).toBeGreaterThan(0);
    expect(new Set(headings).size, route).toBe(headings.length);

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
    chapters.push({ route, headings });
  }
  await info.attach('observed-guide-fragments', {
    body: JSON.stringify(chapters, null, 2),
    contentType: 'application/json'
  });
});
