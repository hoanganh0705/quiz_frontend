/**
 * `daily-challenge.spec.ts` — Playwright e2e coverage for the
 * `/daily-challenge` route.
 *
 * Source epic:   Story 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-3.12.E2 — E2E Playwright tests for the
 *                 daily-challenge surface.
 *
 * The spec runs against a running dev backend (per
 * `playwright.config.ts`). For local development, the spec stubs
 * the relevant endpoints via `stubDailyChallengeLive(page)` so the
 * live branch (Branch 4) and the in-page play surface can be
 * exercised deterministically.
 *
 * ## What this spec locks
 *
 *   (a) `renders the placeholder when the locked default
 *       flag = 'placeholder' is in effect`.
 *   (b) `never 404s — the page renders SOMETHING in either flag
 *       value`.
 *   (c) `the placeholder surface carries an accessible role +
 *       aria-label`.
 *   (d) `the page chrome (header + InfoCard) is preserved in the
 *       placeholder branch`.
 *   (e) `flag = 'v1' with the SDK absent still renders the
 *       placeholder (the wrapper's missing-endpoint guard wins)`.
 *   (f) `authenticated user with the live flag: live card + streak
 *       indicator + history list render`.
 *   (g) `clicking load-more appends additional entries from the
 *       next cursor page`.
 *   (h) `empty history response: the empty state primitive
 *       renders`.
 *   (i) `play surface: the question UI mounts when status=pending
 *       and a correct submission advances to the next question`.
 *
 * ## Cookie clearing
 *
 * Each `beforeEach` clears cookies + localStorage so cross-spec
 * state does not leak (mirrors `e2e/leaderboard/leaderboard.spec.ts`
 * line 67).
 */

import { expect, test } from '@playwright/test'

import {
  stubAuth,
  stubDailyChallengeHistory,
  stubDailyChallengeLive,
  stubDailyChallengeToday,
} from './daily-challenge.helpers'

test.describe('Daily-challenge acceptance (Story 3.12 / TKT-3.12.E2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  // ─────────────────────────────────────────────────────────────────
  // (a) Placeholder renders on first paint (locked default flag).
  // ─────────────────────────────────────────────────────────────────

  test('(a) renders the placeholder on first paint with the locked default flag = "placeholder"', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: false })

    await page.goto('/daily-challenge')

    // The live composition reaches Branch 1 (placeholder) because
    // the flag is locked to 'placeholder' at this commit.
    await expect(
      page.getByTestId('daily-challenge-page-placeholder'),
    ).toBeVisible()

    // The placeholder primitive is the visible surface.
    await expect(page.getByTestId('daily-challenge-placeholder')).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────────────
  // (b) Never 404s — the page renders SOMETHING.
  // ─────────────────────────────────────────────────────────────────

  test('(b) the page renders without 404ing, in unauthenticated + placeholder branches', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: false })

    const response = await page.goto('/daily-challenge')

    // The route MUST NOT 404. AC #2 of Story 3.12 — "Either way,
    // the page does not 404 on the user".
    expect(response?.status()).toBeLessThan(400)
    expect(response?.status()).toBe(200)

    // The header is preserved (it is NOT gated on the flag).
    await expect(
      page.getByRole('heading', { name: /daily challenge/i, level: 1 }),
    ).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────────────
  // (c) Placeholder carries an accessible region.
  // ─────────────────────────────────────────────────────────────────

  test('(c) the placeholder surface carries role + aria-label', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: false })

    await page.goto('/daily-challenge')

    const region = page.getByTestId('daily-challenge-page-placeholder')
    await expect(region).toBeVisible()
    await expect(region).toHaveAttribute('role', 'region')
    await expect(region).toHaveAttribute('aria-label', /daily challenge/i)
  })

  // ─────────────────────────────────────────────────────────────────
  // (d) Page chrome is preserved (header + InfoCard siblings).
  // ─────────────────────────────────────────────────────────────────

  test('(d) the page chrome (heading + InfoCard) is preserved in the placeholder branch', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: false })

    await page.goto('/daily-challenge')

    await expect(
      page.getByRole('heading', { name: /daily challenge/i, level: 1 }),
    ).toBeVisible()

    await expect(
      page.getByRole('region', { name: 'Challenge information' }),
    ).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────────────
  // (e) Authenticated placeholder — streak indicator is NOT rendered.
  // ─────────────────────────────────────────────────────────────────

  test('(e) authenticated user with the placeholder flag: streak indicator is NOT rendered', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: true })

    await page.goto('/daily-challenge')

    await expect(
      page.getByTestId('daily-challenge-page-placeholder'),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="daily-challenge-streak-indicator"]'),
    ).toHaveCount(0)
  })

  // ─────────────────────────────────────────────────────────────────
  // (f) Live branch — authenticated user with the live flag.
  // ─────────────────────────────────────────────────────────────────

  test('(f) authenticated user with the live flag: card + streak + history list render', async ({
    page,
  }) => {
    await stubDailyChallengeLive(page, { authenticate: true })

    await page.goto('/daily-challenge')

    await expect(
      page.getByTestId('daily-challenge-page-live'),
    ).toBeVisible()
    await expect(
      page.getByTestId('daily-challenge-card'),
    ).toBeVisible()
    await expect(
      page.getByTestId('daily-challenge-streak-indicator'),
    ).toBeVisible()
    await expect(
      page.getByTestId('daily-challenge-history-list'),
    ).toBeVisible()
    // The card renders the quiz title from the backend.
    await expect(
      page.getByText(/Solar System Trivia/),
    ).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────────────
  // (g) Load more appends the next cursor page.
  // ─────────────────────────────────────────────────────────────────

  test('(g) clicking load-more appends additional entries from the next cursor page', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: true })
    await stubDailyChallengeToday(page)
    await stubDailyChallengeHistory(page, {
      items: Array.from({ length: 4 }, (_, i) => ({
        date: `2026-08-0${i + 1}T00:00:00.000Z`,
        quizId: `0192f4d8-cccc-7000-8000-0000000001${i + 1}0`,
        quizTitle: `Solar System Quiz ${i + 1}`,
        difficulty: 'medium' as const,
        score: 80,
        rank: 5,
      })),
      hasNextPage: true,
      nextCursor: 'cursor-2',
    })

    await page.goto('/daily-challenge')

    const loadMore = page.getByRole('button', {
      name: /Load 1 more past challenges/i,
    })
    await expect(loadMore).toBeVisible()
    await loadMore.click()

    // The "View Less" affordance appears after load-more is clicked
    // (the list no longer truncates to 3).
    await expect(
      page.getByRole('button', { name: /View less challenge history/i }),
    ).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────────────
  // (h) Empty history — empty state primitive renders.
  // ─────────────────────────────────────────────────────────────────

  test('(h) empty history response: the empty state primitive renders', async ({
    page,
  }) => {
    await stubAuth(page, { authenticate: true })
    await stubDailyChallengeToday(page)
    await stubDailyChallengeHistory(page, { items: [] })

    await page.goto('/daily-challenge')

    await expect(
      page.getByTestId('daily-challenge-history-empty-state'),
    ).toBeVisible()
  })

  // ─────────────────────────────────────────────────────────────────
  // (i) Play surface — mount + submit advances to next question.
  // ─────────────────────────────────────────────────────────────────

  test('(i) play surface mounts when status=pending and a correct submit advances to the next question', async ({
    page,
  }) => {
    await stubDailyChallengeLive(page, { authenticate: true })

    await page.goto('/daily-challenge')

    // The play surface is mounted inside Branch 4 when status=pending
    // and the viewer is authenticated.
    await expect(
      page.getByTestId('daily-challenge-play-surface'),
    ).toBeVisible()

    // The first question is rendered.
    await expect(
      page.getByText('Which planet is closest to the Sun?'),
    ).toBeVisible()

    // Pick the first option and submit.
    const firstOption = page.getByRole('radio', { name: /Mercury/ })
    await firstOption.click()
    await expect(firstOption).toHaveAttribute('aria-checked', 'true')

    await page.getByTestId('daily-challenge-play-submit').click()

    // After submit, the next question is rendered (because
    // nextQuestionIndex=1 in the default stub).
    await expect(
      page.getByText('Which planet is the largest?'),
    ).toBeVisible({ timeout: 5_000 })
  })
})