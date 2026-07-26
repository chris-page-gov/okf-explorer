import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { openOnsFacetFixture } from './fixtures/ons-facets.fixture';

test('WCAG-E2E-01 has no serious or critical WCAG 2.2 violations in the loaded Explorer', async ({ page }) => {
  await openOnsFacetFixture(page, []);
  await page.getByPlaceholder('Search ONS products, concepts and geographies').waitFor();

  const analysis = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const releaseBlocking = analysis.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical'
  );

  expect(
    releaseBlocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target)
    }))
  ).toEqual([]);
});
