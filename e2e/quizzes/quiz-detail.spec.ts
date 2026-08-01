import { expect, test, type Page, type Request } from '@playwright/test';

const QUIZ_ID = '0192f4d8-1111-7000-8000-000000000001';
const QUIZ_SLUG = 'epic-science-challenge';
const TITLE = 'Epic Science Challenge';

interface StubOptions {
  detailStatus?: number;
  statsStatus?: number;
  emptyQuestions?: boolean;
  maliciousCorrectness?: boolean;
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

async function stubQuizApi(page: Page, options: StubOptions = {}) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request);
  });

  await page.route('**/api/v1/quizzes/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

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

  test('keeps bookmark inert, start disabled, and related requests absent', async ({ page }) => {
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

    await expect(page.getByTestId('quiz-related-quizzes-slot').getByTestId('quiz-card-skeleton')).toHaveCount(3);
    expect(requests.some((request) => request.url().includes('/related'))).toBe(false);
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
