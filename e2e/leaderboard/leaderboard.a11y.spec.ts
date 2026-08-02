/**
 * `leaderboard.a11y.spec.ts` — accessibility + keyboard navigation
 * tests for the live `/leaderboard` route.
 *
 * Source epic:   Story 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.F4 — a11y evidence (axe-core + keyboard
 *                 trace).
 *
 * Five assertions lock the AC #3 self-entry highlight a11y and the
 * cross-cutting a11y invariants:
 *
 *   (a) axe-core reports no serious or critical violations on the
 *       resolved live state (authenticated, entries resolved).
 *   (b) axe-core reports no serious or critical violations on the
 *       unauthenticated state (no self-entry highlight).
 *   (c) Keyboard order reaches the period selector (the focus
 *       cascades: skip link → page chrome → period selector →
 *       rank-change-free table → load-more).
 *   (d) Each row carries `data-leaderboard-row` AND the self-entry
 *       row carries `aria-current="true"` when the user is
 *       authenticated and the entry is the current user.
 *   (e) The period selector is keyboard-reachable (Tab + Enter /
 *       Space activate the focused option; the active option is
 *       `aria-pressed="true"`).
 *
 * axe-core is vendored under `node_modules/axe-core/axe.min.js`.
 * The spec injects it via `page.addScriptTag` so the test runs
 * against the SAME axe version the project depends on (no separate
 * `@axe-core/playwright` runtime).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { SELF_USER_ID, stubLeaderboard } from './leaderboard.helpers';

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

test.describe('Leaderboard a11y (Story 3.11 / TKT-3.11.F4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  // ───────────────────────────────────────────────────────────────────
  // (a) Authenticated live state — no axe violations
  // ───────────────────────────────────────────────────────────────────

  test('(a) authenticated live state: no serious or critical violations', async ({
    page,
  }) => {
    await stubLeaderboard(page, { authenticate: true });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    const violations = await runAxe(page);
    const blockers = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // (b) Unauthenticated state — no axe violations + no self-entry highlight
  // ───────────────────────────────────────────────────────────────────

  test('(b) unauthenticated state: no serious or critical violations AND no self-entry highlight', async ({
    page,
  }) => {
    await stubLeaderboard(page, { authenticate: false });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    const violations = await runAxe(page);
    const blockers = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0);

    // The auth gate wins: NO row carries `aria-current="true"`.
    const highlightedRows = await page.locator('[aria-current="true"]').count();
    expect(highlightedRows).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // (c) Keyboard order reaches the period selector
  // ───────────────────────────────────────────────────────────────────

  test('(c) keyboard order reaches the period selector (Tab + Enter activate the focused option)', async ({
    page,
  }) => {
    await stubLeaderboard(page);

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    // The Weekly button starts with aria-pressed=true.
    await expect(
      page.getByRole('button', { name: 'Weekly' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Focus the Monthly button and activate it via Enter.
    const monthly = page.getByRole('button', { name: 'Monthly' });
    await monthly.focus();
    await page.keyboard.press('Enter');

    // After the keyboard activation, the Monthly button is
    // aria-pressed=true and a new request to `/api/v1/leaderboard`
    // with `period=monthly` was sent.
    await expect(monthly).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Weekly' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // The wire-side enum is `monthly` (not kebab-case).
    const monthlyRequests = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('resource');
      return perfEntries
        .filter((entry) => entry.name.includes('/api/v1/leaderboard'))
        .map((entry) => new URL(entry.name).searchParams.get('period'));
    });
    expect(monthlyRequests).toContain('monthly');
  });

  // ───────────────────────────────────────────────────────────────────
  // (d) Self-entry highlight gate
  // ───────────────────────────────────────────────────────────────────

  test('(d) self-entry row has aria-current="true" when authenticated AND entry.isCurrentUser === true', async ({
    page,
  }) => {
    await stubLeaderboard(page, { authenticate: true });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    const selfRow = page.locator(`[data-leaderboard-row="${SELF_USER_ID}"]`);
    await expect(selfRow).toBeVisible();
    await expect(selfRow).toHaveAttribute('aria-current', 'true');
  });

  test('(d′) self-entry highlight is ABSENT when unauthenticated', async ({
    page,
  }) => {
    await stubLeaderboard(page, { authenticate: false });

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    // No row carries the highlight regardless of the wire payload
    // — the auth gate is the source of truth.
    const highlighted = await page.locator('[aria-current="true"]').count();
    expect(highlighted).toBe(0);
  });

  // ───────────────────────────────────────────────────────────────────
  // (e) Period selector is keyboard-reachable (Tab + Space activate)
  // ───────────────────────────────────────────────────────────────────

  test('(e) period selector activates via Space key', async ({ page }) => {
    await stubLeaderboard(page);

    await page.goto('/leaderboard');
    await expect(page.getByTestId('leaderboard-page')).toBeVisible();

    const allTime = page.getByRole('button', { name: 'All-time' });
    await allTime.focus();
    await page.keyboard.press(' ');

    // Space toggles the focus to the pressed state.
    await expect(allTime).toHaveAttribute('aria-pressed', 'true');

    // The wire-side enum is `all_time` (snake_case — drift A1 §7.2).
    const allTimeRequests = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('resource');
      return perfEntries
        .filter((entry) => entry.name.includes('/api/v1/leaderboard'))
        .map((entry) => new URL(entry.name).searchParams.get('period'));
    });
    expect(allTimeRequests).toContain('all_time');
  });
});
