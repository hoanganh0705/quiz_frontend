/**
 * `quiz-detail.spec.ts` — Playwright e2e coverage for `/quizzes/[idOrSlug]`.
 *
 * Source epics:
 *   - Epic 3.6 — Quiz detail (player view) + stats (initial coverage).
 *   - Story 3.8 / TKT-3.8.F2 — Related quizzes block on a real backend
 *     (UUID-or-slug parity, click-through navigation, hidden-on-empty
 *     contract, hidden-on-error contract).
 *
 * The spec runs against a running dev backend (per `playwright.config.ts`
 * — the config does NOT spin up its own backend). When the dev backend
 * is unavailable, the tests will time out on the first navigation.
 *
 * ## AC #1 — `/quizzes/[idOrSlug]` renders the related block with live data
 *
 *   (a) `related-renders-on-slug` — `/quizzes/<slug>` shows the heading
 *       + 4 `<QuizCard />` links.
 *   (b) `related-renders-on-uuid` — `/quizzes/<UUID>` for the same quiz
 *       shows the same heading + 4 cards (UUID-or-slug parity).
 *   (c) `related-click-navigates` — clicking a related card navigates
 *       to that quiz's `/quizzes/[idOrSlug]` (preserving history).
 *
 * ## AC #2 — The block is hidden entirely when the endpoint returns empty OR errors
 *
 *   (d) `related-empty-hides-block` — open a quiz whose related set is
 *       empty; the related heading is absent from the DOM.
 *   (e) `related-error-hides-block` — throttle / block the related
 *       endpoint; the related heading is absent from the DOM, no toast.
 *
 * The malicious-correctness + placeholder-skeletion tests from the
 * earlier spec are retained so the F2 cases don't regress the Epic 3.6
 * contract.
 */

import { expect, test, type Page, type Request } from '@playwright/test';

const QUIZ_ID = '0192f4d8-1111-7000-8000-000000000001';
const QUIZ_SLUG = 'epic-science-challenge';
const RELATED_QUIZ_ID = '0192f4d8-2222-7000-8000-000000000002';
const RELATED_QUIZ_SLUG = 'companion-science-quiz';
const TITLE = 'Epic Science Challenge';

interface StubOptions {
  detailStatus?: number;
  statsStatus?: number;
  emptyQuestions?: boolean;
  maliciousCorrectness?: boolean;
  /**
   * `relatedStatus` controls how the `/quizzes/<idOrSlug>/related`
   * endpoint is stubbed. Defaults to `200` with 4 `QuizListItemDto`
   * entries. Set to `404` to simulate "no related items" (the live
   * component treats 404 identically to an empty array — the block is
   * hidden entirely). Set to `500` to simulate a 5xx (silent failure
   * — the block is hidden, no toast).
   */
  relatedStatus?: number;
  relatedItems?: Array<{
    quizId: string;
    slug: string;
    title: string;
  }>;
}

function makeQuiz(options: StubOptions = {}) {
  const answerOptions = [
    {
      optionId: 'option-2',
      position: 2,
      value: 'Second option',
      createdAt: '2026-07-01T00:00:00.000Z',
      ...(options.maliciousCorrectness ? { isCorrect: false } : {}),
    },
    {
      optionId: 'option-1',
      position: 1,
      value: 'First option',
      createdAt: '2026-07-01T00:00:00.000Z',
      ...(options.maliciousCorrectness ? { isCorrect: true } : {}),
    },
  ];

  const questions = options.emptyQuestions
    ? []
    : [
        {
          questionId: 'question-2',
          quizVersionId: 'version-1',
          position: 2,
          questionText: 'Second question in canonical order',
          imageUrl: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          answerOptions,
        },
        {
          questionId: 'question-1',
          quizVersionId: 'version-1',
          position: 1,
          questionText: 'First question in canonical order',
          imageUrl: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          answerOptions,
        },
      ];

  return {
    quizId: QUIZ_ID,
    creatorId: null,
    title: TITLE,
    description: `## About this quiz\n\n${'Explore safely with keyboard and mouse. '.repeat(12)}`,
    slug: QUIZ_SLUG,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: true,
    publishedVersionId: 'version-1',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    tags: [
      { tagId: 'tag-1', name: 'Science', slug: 'science' },
      { tagId: 'tag-2', name: 'Featured', slug: 'featured' },
    ],
    publishedVersion: {
      quizVersionId: 'version-1',
      quizId: QUIZ_ID,
      versionNumber: 7,
      status: 'published',
      difficulty: 'medium',
      durationMs: 900_000,
      passingScorePercent: 70,
      rewardXp: 50,
      creatorId: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      publishedAt: '2026-07-02T00:00:00.000Z',
      archivedAt: null,
      updatedAt: '2026-07-02T00:00:00.000Z',
      questions,
    },
  };
}

const stats = {
  quizId: QUIZ_ID,
  totalAttempts: 120,
  uniquePlayers: 95,
  averageScore: 76.5,
  averageRating: 4.4,
  bookmarkCount: 28,
  completionRate: 88,
  popularityScore: 67.2,
  trendingScore: 13.4,
};

/**
 * Default set of related items (4 entries — the Story 3.8 baseline).
 * Each entry is shaped like `QuizListItemDto` so the live component
 * can render `<QuizCard />` for each.
 */
function makeRelatedItems(options: StubOptions = {}) {
  if (options.relatedItems) return options.relatedItems;
  return [
    { quizId: RELATED_QUIZ_ID, slug: RELATED_QUIZ_SLUG, title: 'Companion Science Quiz' },
    { quizId: '0192f4d8-2222-7000-8000-000000000003', slug: 'physics-fundamentals', title: 'Physics Fundamentals' },
    { quizId: '0192f4d8-2222-7000-8000-000000000004', slug: 'chemistry-basics', title: 'Chemistry Basics' },
    { quizId: '0192f4d8-2222-7000-8000-000000000005', slug: 'biology-essentials', title: 'Biology Essentials' },
  ];
}

/**
 * Project a related item stub onto the `QuizListItemDto` shape the
 * live `<QuizCard />` consumes. Mirrors the projected fields in
 * `trendingQuizItemToQuizListItem` (Story 3.7 C5) — the related
 * endpoint returns plain `QuizListItemDto[]`, so the live component
 * does NOT need a projection helper.
 */
function projectToQuizListItem(item: { quizId: string; slug: string; title: string }) {
  return {
    quizId: item.quizId,
    creatorId: null,
    title: item.title,
    description: null,
    slug: item.slug,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

async function stubQuizApi(page: Page, options: StubOptions = {}) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request);
  });

  await page.route('**/api/v1/quizzes/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path.endsWith('/related')) {
      // Story 3.8 — `/quizzes/<idOrSlug>/related` returns
      // `{ data?: QuizListItemDto[] }` per TKT-3.8.A1 §2 (no
      // `meta.pagination`, no `cursor`). The wrapper `getQuizzesRelated`
      // (A2) strips the envelope so the hook sees the inner array.
      const status = options.relatedStatus ?? 200;
      if (status === 200) {
        const items = makeRelatedItems(options).map(projectToQuizListItem);
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ data: items }),
        });
      } else {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'about:blank',
            title: status === 404 ? 'Not Found' : 'Service Unavailable',
            status,
            extensions: {
              code: status === 404 ? 'QUIZ_NOT_FOUND' : 'GLOBAL_INTERNAL_ERROR',
            },
          }),
        });
      }
      return;
    }

    if (path.endsWith('/stats')) {
      const status = options.statsStatus ?? 200;
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(
          status === 200
            ? { data: stats }
            : {
                type: 'about:blank',
                title: status === 404 ? 'Not Found' : 'Service Unavailable',
                status,
                extensions: { code: status === 404 ? 'QUIZ_STATS_NOT_FOUND' : 'GLOBAL_INTERNAL_ERROR' },
              },
        ),
      });
      return;
    }

    const status = options.detailStatus ?? 200;
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(
        status === 200
          ? { data: makeQuiz(options) }
          : {
              type: 'about:blank',
              title: status === 404 ? 'Not Found' : 'Service Unavailable',
              status,
              extensions: { code: status === 404 ? 'QUIZ_NOT_FOUND' : 'GLOBAL_INTERNAL_ERROR' },
            },
      ),
    });
  });

  return requests;
}

async function expectResolvedQuiz(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByTestId('quiz-question-card')).toHaveCount(2);
  await expect(page.getByTestId('quiz-question-card').nth(0)).toContainText(
    'First question in canonical order',
  );
  await expect(page.getByTestId('quiz-question-card').nth(1)).toContainText(
    'Second question in canonical order',
  );
  await expect(page.getByTestId('quiz-question-option').nth(0)).toContainText(
    'First option',
  );
  await expect(page.getByTestId('quiz-metadata-row')).toContainText('15m');
}

test.describe('Quiz detail route', () => {
  test('UUID and slug URLs render the same published player view', async ({ page }) => {
    await stubQuizApi(page);

    await page.goto(`/quizzes/${QUIZ_ID}`);
    await expectResolvedQuiz(page);
    const uuidQuestions = await page.getByTestId('quiz-question-card').allTextContents();
    const uuidOptions = await page.getByTestId('quiz-question-option').allTextContents();

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);
    expect(await page.getByTestId('quiz-question-card').allTextContents()).toEqual(
      uuidQuestions,
    );
    expect(await page.getByTestId('quiz-question-option').allTextContents()).toEqual(
      uuidOptions,
    );
  });

  test('strips malicious correctness keys from HTML and the browser DOM', async ({ page }) => {
    await stubQuizApi(page, { maliciousCorrectness: true });
    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    const content = await page.content();
    const bodyHtml = await page.locator('body').evaluate((body) => body.innerHTML);
    expect(content).not.toContain('isCorrect');
    expect(bodyHtml).not.toContain('isCorrect');
  });

  test('uses the app NotFound surface for a missing or deleted quiz', async ({ page }) => {
    await stubQuizApi(page, { detailStatus: 404, statsStatus: 404 });
    await page.goto('/quizzes/deleted-quiz');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
  });

  test('isolates missing stats while preserving all quiz detail', async ({ page }) => {
    await stubQuizApi(page, { statsStatus: 404 });
    await page.goto(`/quizzes/${QUIZ_SLUG}`);

    await expectResolvedQuiz(page);
    await expect(page.getByText('Data will populate as people play')).toBeVisible();
  });

  test('keeps bookmark inert, start disabled, and the related block resolved', async ({ page }) => {
    // Story 3.8 — the live `<QuizRelatedQuizzes />` requests the
    // `/related` endpoint on mount (TKT-3.8.B1). The stub now
    // satisfies it with 4 items so the block resolves to a 4-card
    // grid below the stats panel.
    const requests = await stubQuizApi(page);
    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    const bookmark = page.getByRole('button', { name: 'Bookmark quiz' });
    await bookmark.click();
    await expect(bookmark).toHaveAttribute('aria-pressed', 'false');

    const start = page.getByRole('button', { name: 'Start attempt (unavailable)' });
    await expect(start).toBeDisabled();
    await page.getByTestId('quiz-start-tooltip-trigger').focus();
    await expect(
      page.getByRole('tooltip').getByText(
        'Starting attempts opens in a later release',
      ),
    ).toBeVisible();

    // The live block resolves with 4 cards (the default stub).
    const relatedSection = page.getByTestId('quiz-related-quizzes');
    await expect(relatedSection).toBeVisible();
    await expect(
      relatedSection.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeVisible();
    await expect(relatedSection.getByTestId('quiz-card')).toHaveCount(4);

    // `/related` is now requested (the live hook fires on mount).
    expect(requests.some((request) => request.url().includes('/related'))).toBe(true);
    expect(requests.some((request) => request.method() !== 'GET')).toBe(false);
  });

  test('expands a long description by mouse and keyboard', async ({ page }) => {
    await stubQuizApi(page);
    await page.goto(`/quizzes/${QUIZ_SLUG}`);

    const toggle = page.getByRole('button', { name: 'Read more' });
    await toggle.click();
    await expect(toggle).toHaveText('Show less');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveText('Read more');
  });

  test('has one h1 and no page-level overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await stubQuizApi(page);
    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Story 3.8 / TKT-3.8.F2 — Related block end-to-end on a real backend
//
// Each case uses `stubQuizApi` with the `relatedStatus` / `relatedItems`
// overrides so the test is deterministic even against an unseeded
// dev backend. The stubs are scoped to this spec and do not depend
// on global state from the other specs.
// ──────────────────────────────────────────────────────────────────────

test.describe('Quiz detail route — related block (Story 3.8 / TKT-3.8.F2)', () => {
  test('(a) /quizzes/<slug> renders the heading + 4 related cards', async ({ page }) => {
    await stubQuizApi(page, {
      relatedStatus: 200,
      relatedItems: [
        { quizId: RELATED_QUIZ_ID, slug: RELATED_QUIZ_SLUG, title: 'Companion Science Quiz' },
        { quizId: '0192f4d8-2222-7000-8000-000000000003', slug: 'physics-fundamentals', title: 'Physics Fundamentals' },
        { quizId: '0192f4d8-2222-7000-8000-000000000004', slug: 'chemistry-basics', title: 'Chemistry Basics' },
        { quizId: '0192f4d8-2222-7000-8000-000000000005', slug: 'biology-essentials', title: 'Biology Essentials' },
      ],
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    const relatedSection = page.getByTestId('quiz-related-quizzes');
    await expect(relatedSection).toBeVisible();
    await expect(
      relatedSection.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeVisible();
    await expect(relatedSection.getByTestId('quiz-card')).toHaveCount(4);

    // The first card is a link to the related quiz's detail page.
    const firstCard = relatedSection.getByTestId('quiz-card').first();
    await expect(firstCard).toHaveAttribute('aria-label', 'Companion Science Quiz');
  });

  test('(b) /quizzes/<UUID> renders the same related block (UUID-or-slug parity)', async ({ page }) => {
    await stubQuizApi(page, { relatedStatus: 200 });

    await page.goto(`/quizzes/${QUIZ_ID}`);
    await expectResolvedQuiz(page);

    const relatedSection = page.getByTestId('quiz-related-quizzes');
    await expect(relatedSection).toBeVisible();
    await expect(relatedSection.getByTestId('quiz-card')).toHaveCount(4);
  });

  test('(c) clicking a related card navigates to that quiz detail (preserves history)', async ({ page }) => {
    await stubQuizApi(page, { relatedStatus: 200 });
    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    const relatedSection = page.getByTestId('quiz-related-quizzes');
    const targetCard = relatedSection.getByTestId('quiz-card').first();
    await expect(targetCard).toHaveAttribute('aria-label', 'Companion Science Quiz');

    // Click the card — `<QuizCard />` wraps the surface in a Next.js
    // `<Link>` to `/quizzes/<slug>` (Story 3.1 C1).
    await targetCard.click();

    // Wait for the navigation to complete.
    await page.waitForURL((url) =>
      url.pathname === `/quizzes/${RELATED_QUIZ_SLUG}`,
    );

    // The next quiz's title (the stub fulfills the same detail
    // payload regardless of slug, so the player view shows the
    // original TITLE — that's fine; we only care that the URL
    // updated).
    await expect(page).toHaveURL(new RegExp(`/quizzes/${RELATED_QUIZ_SLUG}$`));

    // History is preserved (back button returns to the original
    // quiz detail page).
    await page.goBack();
    await page.waitForURL((url) => url.pathname === `/quizzes/${QUIZ_SLUG}`);
  });

  test('(d) empty related set hides the related block entirely', async ({ page }) => {
    await stubQuizApi(page, {
      relatedStatus: 200,
      relatedItems: [],
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    // The block is hidden — no `<section data-testid="quiz-related-quizzes">`
    // and no `Related quizzes` heading.
    await expect(page.getByTestId('quiz-related-quizzes')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toHaveCount(0);

    // The detail page is otherwise intact.
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  });

  test('(e) throttling the related endpoint hides the related block — no toast', async ({ page }) => {
    // Stub the OTHER endpoints first so the rest of the page renders.
    // Playwright runs matching routes in REVERSE order of registration
    // (the last registered handler runs first). Registering the abort
    // handler AFTER the stub ensures the abort handler runs first.
    await stubQuizApi(page, { relatedStatus: undefined });

    // Abort the `/related` request outright so the SDK rejects with
    // a network error (equivalent to a 5xx from the live component's
    // point of view — silent failure contract from Story 3.8 lines
    // 884–885).
    await page.route('**/api/v1/quizzes/**/related', async (route) => {
      await route.abort('failed');
    });

    await page.goto(`/quizzes/${QUIZ_SLUG}`);
    await expectResolvedQuiz(page);

    // The related block is hidden.
    await expect(page.getByTestId('quiz-related-quizzes')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toHaveCount(0);

    // No toast, no inline error surface (Story 3.8 lines 884–885:
    // "swallowed silently" / "does not blank the detail page").
    await expect(page.getByRole('alert')).toHaveCount(0);

    // The detail page is otherwise intact.
    await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  });
});
