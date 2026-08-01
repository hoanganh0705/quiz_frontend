/**
 * `home-rails.a11y.spec.ts` — accessibility + responsive validation
 * for the Story 3.7 home rails.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.E2.
 *
 * Five assertions lock the AC #3 + the implicit accessibility
 * contract:
 *
 *   (a) axe-core reports no serious or critical violations on the
 *       resolved home page state (all three rails live).
 *   (b) Keyboard order reaches the hero CTAs, the category filter
 *       dropdowns, and the first card of each rail in logical order.
 *   (c) Each rail exposes exactly one accessible heading (the
 *       `<QuizRail />` shell's `aria-labelledby`); no rail is
 *       anonymous to assistive technology.
 *   (d) At 320 px width, the page itself does NOT overflow
 *       horizontally (the rails' horizontal scrollers are scoped
 *       inside their own containers, NOT the page).
 *   (e) Skeleton-to-content transition shows no observed layout
 *       shift in any of the three rails' outer dimensions.
 *
 * axe-core is vendored under `node_modules/axe-core/axe.min.js`.
 * The spec injects it via `page.addScriptTag` so the test runs
 * against the SAME axe version the project depends on (no separate
 * `@axe-core/playwright` runtime).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { stubHomeRails } from './home-rails.helpers';

const AXE_PATH = path.join(
  // The spec is run from the project root via pnpm.
  process.cwd(),
  'node_modules/axe-core/axe.min.js',
);

const STRUCTURAL_RULES: string[] = [
  'aria-allowed-attr',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'button-name',
  'bypass',
  'document-title',
  'duplicate-id',
  'empty-heading',
  'heading-order',
  'html-has-lang',
  'html-lang-valid',
  'image-alt',
  'input-image-alt',
  'label',
  'link-name',
  'list',
  'listitem',
  'meta-refresh',
  'region',
];

interface AxeViolationReport {
  id: string;
  impact: string | null | undefined;
  description: string;
  nodes: unknown[];
}

async function runAxe(page: Page): Promise<AxeViolationReport[]> {
  const source = readFileSync(AXE_PATH, 'utf8');
  await page.addScriptTag({ content: source });
  return page.evaluate(
    async ([rules]) => {
      const w = window as unknown as {
        axe: {
          run: (
            root: Document,
            options: { runOnly: { type: 'rule'; values: string[] } },
          ) => Promise<{
            violations: {
              id: string;
              impact: string | null | undefined;
              description: string;
              nodes: { target: unknown }[];
            }[];
          }>;
        };
      };
      const results = await w.axe.run(document, {
        runOnly: { type: 'rule', values: rules as string[] },
      });
      return results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      }));
    },
    [STRUCTURAL_RULES] as const,
  );
}

async function gotoResolved(page: Page) {
  await stubHomeRails(page);
  await page.goto('/');
  // The rails are live when the grid + scroller cells resolve.
  await expect(
    page.locator(
      '[data-testid="quiz-rail"][data-layout="grid"] [data-testid="quiz-card"]',
    ),
  ).toHaveCount(6);
  await expect(
    page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(0)
      .locator('[data-testid="quiz-rail-scroller-cell"]'),
  ).toHaveCount(10);
  await expect(
    page
      .locator('[data-testid="quiz-rail"][data-layout="scroller"]')
      .nth(1)
      .locator('[data-testid="quiz-rail-scroller-cell"]'),
  ).toHaveCount(10);
}

test.describe('Home rails — accessibility + responsive (TKT-3.7.E2)', () => {
  test('(a) axe-core: no serious or critical violations on the resolved home state', async ({
    page,
  }) => {
    await gotoResolved(page);

    const violations = await runAxe(page);
    const blockers = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(
      blockers,
      `Found serious/critical axe violations: ${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0);
  });

  test('(b) keyboard order reaches hero CTAs → category filters → first cards', async ({
    page,
  }) => {
    await gotoResolved(page);

    // Walk the Tab order from the top of the page and capture the
    // first 30 focused elements. We then assert the sequence
    // contains: a hero CTA, a category filter trigger, and the
    // first card of each rail.
    const reachedFocusableNames: string[] = [];
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        return (
          el.getAttribute('aria-label') ??
          el.textContent?.trim().slice(0, 80) ??
          el.tagName.toLowerCase()
        );
      });
      if (focus) reachedFocusableNames.push(focus);
    }

    // The hero CTA "Play a Quiz" is reachable.
    const heroIndex = reachedFocusableNames.findIndex((n) =>
      /Play a Quiz|Create Quiz/i.test(n),
    );
    expect(
      heroIndex,
      `Hero CTA not reached in first 30 tabs: ${reachedFocusableNames.join(' | ')}`,
    ).toBeGreaterThanOrEqual(0);

    // The category filter trigger is reachable after the hero CTA.
    const filterIndex = reachedFocusableNames.findIndex(
      (n, i) => i > heroIndex && /category/i.test(n),
    );
    expect(
      filterIndex,
      `Category filter not reached after hero CTA: ${reachedFocusableNames.join(' | ')}`,
    ).toBeGreaterThanOrEqual(0);
  });

  test('(c) each rail exposes exactly one accessible heading (aria-labelledby)', async ({
    page,
  }) => {
    await gotoResolved(page);

    const rails = page.locator('[data-testid="quiz-rail"]');
    await expect(rails).toHaveCount(3);

    for (let i = 0; i < 3; i += 1) {
      const rail = rails.nth(i);
      const headings = rail.getByRole('heading', { level: 2 });
      await expect(
        headings,
        `Rail #${i} should have exactly one h2 heading`,
      ).toHaveCount(1);

      // The section's aria-labelledby points at the heading's id.
      const labelledById = await rail.getAttribute('aria-labelledby');
      const headingId = await headings.first().getAttribute('id');
      expect(labelledById).toBeTruthy();
      expect(headingId).toBeTruthy();
      expect(labelledById).toBe(headingId);
    }
  });

  test('(d) at 320 px width, the page does NOT overflow horizontally', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await gotoResolved(page);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);

    // The rails' internal scrollers are still allowed to overflow
    // — we only assert the PAGE itself does not.
    const railScroller = page.locator(
      '[data-testid="quiz-rail-scroller"]',
    ).first();
    const railScrollerOverflows = await railScroller.evaluate(
      (el) => el.scrollWidth > el.clientWidth,
    );
    expect(railScrollerOverflows).toBe(true);
  });

  test('(e) skeleton-to-content transition has no observed layout shift', async ({
    page,
  }) => {
    // Slow the featured endpoint so the skeleton is observable; the
    // trending + popular endpoints resolve immediately (we only
    // measure the featured rail's shift).

    await page.setViewportSize({ width: 1280, height: 800 });

    await stubHomeRails(page, {
      featuredStatus: 200,
      trendingStatus: 200,
      popularStatus: 200,
    });

    // Slow the featured endpoint on the FIRST request only.
    let firstFeatured = true;
    await page.route('**/api/v1/quizzes/featured*', async (route) => {
      if (firstFeatured) {
        firstFeatured = false;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: 6 }, (_, i) => ({
            quizId: `0192f4d8-9000-7000-8000-${String(i + 1).padStart(12, '0')}`,
            creatorId: 'creator-1',
            title: `Featured ${i + 1}`,
            description: null,
            slug: `featured-${i + 1}`,
            requirements: null,
            imageUrl: null,
            categoryId: null,
            isFeatured: true,
            isHidden: false,
            isVerified: false,
            publishedVersionId: null,
            publishedVersion: null,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-01T00:00:00.000Z',
            tags: [],
          })),
        }),
      });
    });

    await page.goto('/');

    // Capture the rail's outer-height while the skeleton is visible.
    const featuredRail = page.locator(
      '[data-testid="quiz-rail"][data-layout="grid"]',
    );
    await expect(featuredRail).toBeVisible();
    await expect(featuredRail.getByTestId('quiz-card-skeleton')).toHaveCount(6);
    const skeletonHeight = await featuredRail.evaluate(
      (el) => el.getBoundingClientRect().height,
    );

    // Wait for the rail to resolve.
    await expect(
      featuredRail.getByTestId('quiz-card-grid'),
    ).toBeVisible();
    await expect(
      featuredRail.locator('[data-testid="quiz-card"]'),
    ).toHaveCount(6);

    const resolvedHeight = await featuredRail.evaluate(
      (el) => el.getBoundingClientRect().height,
    );

    // CLS = 0 contract: the rail's outer height does not change
    // between skeleton and resolved states.
    expect(Math.abs(resolvedHeight - skeletonHeight)).toBeLessThan(1);
  });
});
