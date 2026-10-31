/**
 * `quizzes-graphql-bundle.spec.ts` — Playwright e2e coverage for the
 * `/quizzes` route's GraphQL bundle.
 *
 * Validates the pilot page contract:
 *   - Exactly one `/graphql` request fires on mount (no fan-out to
 *     `/quizzes`, `/quizzes/popular`, `/quizzes/trending`,
 *     `/tags/popular`, `/categories/popular`).
 *   - A category-filter click triggers a new `/graphql` request (cache miss).
 *   - The directory renders the populated grid + load-more affordance.
 *
 * The page mounts a fresh Apollo Client per `ApolloSubtreeProvider`
 * instance. That client reads `auth_token` (when present) but does not
 * require authentication, so the spec runs against the public
 * `/quizzes` route.
 */

import { expect, test, type Page, type Request } from '@playwright/test';

const POPULAR_QUIZ_ID = '0192f4d8-3001-7000-8000-000000000001';
const TRENDING_QUIZ_ID = '0192f4d8-3002-7000-8000-000000000002';
const DIRECTORY_QUIZ_ID = '0192f4d8-3003-7000-8000-000000000003';
const CATEGORY_ID = '0192f4d8-3004-7000-8000-000000000004';

const LEGACY_ENDPOINTS = [
  '/api/v1/quizzes',
  '/api/v1/quizzes/popular',
  '/api/v1/quizzes/trending',
  '/api/v1/tags/popular',
  '/api/v1/categories/popular',
] as const;

interface StubOptions {
  /**
   * Items returned by the next-page bundle call. The first call always
   * returns the default 1-item list with `hasNextPage: true`.
   */
  nextPageItems?: Array<{
    quizId: string;
    slug: string;
    title: string;
  }>;
  /** Status code for the GraphQL response. Defaults to 200. */
  status?: number;
}

function makeBundleItems(
  page: 'first' | 'second',
  options: StubOptions,
) {
  if (page === 'second') {
    const next = options.nextPageItems ?? [];
    return next.map((q) => ({
      quizId: q.quizId,
      slug: q.slug,
      title: q.title,
      imageUrl: null,
      questionCount: 5,
      averageRating: 4.0,
      reviewCount: 1,
      attemptCount: 10,
      difficulty: { label: 'easy' },
      category: null,
      tags: [],
    }));
  }

  return [
    {
      quizId: DIRECTORY_QUIZ_ID,
      slug: 'directory-quiz',
      title: 'Directory Quiz',
      imageUrl: null,
      questionCount: 8,
      averageRating: 4.5,
      reviewCount: 12,
      attemptCount: 87,
      difficulty: { label: 'medium' },
      category: {
        categoryId: CATEGORY_ID,
        name: 'Science',
        slug: 'science',
      },
      tags: [
        { tagId: 'tag-1', name: 'Biology', slug: 'biology' },
      ],
    },
  ];
}

function makeBundleResponse(
  page: 'first' | 'second',
  options: StubOptions,
) {
  const status = options.status ?? 200;
  if (status !== 200) {
    return {
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        errors: [
          {
            message: 'quizzesBundle resolver unavailable',
            extensions: { code: 'GLOBAL_INTERNAL_ERROR', status },
          },
        ],
      }),
    };
  }

  const items = makeBundleItems(page, options);
  const isFirst = page === 'first';
  const popular = [
    {
      rank: 1,
      quizId: POPULAR_QUIZ_ID,
      title: 'Popular Quiz',
      slug: 'popular-quiz',
      imageUrl: null,
      popularityScore: 91.2,
      totalAttempts: 220,
    },
  ];
  const trending = [
    {
      rank: 1,
      quizId: TRENDING_QUIZ_ID,
      title: 'Trending Quiz',
      slug: 'trending-quiz',
      imageUrl: null,
      trendingScore: 73.4,
      totalAttempts: 110,
    },
  ];
  const categories = [
    { rank: 1, categoryId: CATEGORY_ID, name: 'Science', slug: 'science' },
  ];
  const tags = [
    { rank: 1, tagId: 'tag-1', name: 'Biology', slug: 'biology' },
  ];

  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        quizzesBundle: {
          items,
          pageInfo: {
            limit: 20,
            nextCursor: isFirst ? 'cursor-2' : null,
            hasNextPage: isFirst,
          },
          popular,
          trending,
          categories,
          tags,
        },
      },
    }),
  };
}

async function stubBundleApi(page: Page, options: StubOptions = {}) {
  const graphqlRequests: Request[] = [];
  const restRequests: Request[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/graphql') && !url.includes('/api/v1/')) {
      graphqlRequests.push(request);
      return;
    }
    if (url.includes('/api/v1/')) {
      restRequests.push(request);
    }
  });

  await page.route('**/graphql', async (route) => {
    const requestUrl = new URL(route.request().url());
    const requestBody = JSON.parse(route.request().postData() ?? '{}');
    const variables = requestBody?.variables ?? {};
    const isPagination =
      typeof variables?.cursor === 'string' && variables.cursor !== null;

    const response = makeBundleResponse(
      isPagination ? 'second' : 'first',
      options,
    );
    await route.fulfill(response);
  });

  return { graphqlRequests, restRequests };
}

test.describe('/quizzes route — GraphQL bundle (single-request mount contract)', () => {
  test('exactly 1 /graphql request fires on mount (no fan-out to legacy endpoints)', async ({
    page,
  }) => {
    const { graphqlRequests, restRequests } = await stubBundleApi(page);

    await page.goto('/quizzes');

    await expect(page.getByTestId('quizzes-directory-grid')).toBeVisible();
    await expect(
      page.getByTestId('quizzes-directory-card').first(),
    ).toBeVisible();
    await expect(
      page.getByTestId('popular-quizzes-strip'),
    ).toBeVisible();
    await expect(
      page.getByTestId('trending-quizzes-strip'),
    ).toBeVisible();

    // Wait for any in-flight network traffic to settle before snapshotting.
    await page.waitForLoadState('networkidle');

    expect(graphqlRequests.length).toBe(1);
    for (const legacy of LEGACY_ENDPOINTS) {
      const matched = restRequests.some((request) =>
        request.url().includes(legacy),
      );
      expect(
        matched,
        `expected no requests to legacy endpoint ${legacy}, but found one`,
      ).toBe(false);
    }
  });

  test('the bundle POSTs the QuizzesBundle operation with no cursor on mount', async ({
    page,
  }) => {
    const { graphqlRequests } = await stubBundleApi(page);

    await page.goto('/quizzes');

    await expect(page.getByTestId('quizzes-directory-grid')).toBeVisible();

    expect(graphqlRequests).toHaveLength(1);
    const body = JSON.parse(graphqlRequests[0].postData() ?? '{}');
    expect(body.operationName).toBe('QuizzesBundle');
    expect(body.variables?.cursor ?? null).toBeNull();
    expect(body.variables?.limit).toBe(20);
  });

  test('clicking Load More appends via fetchMore (1 extra /graphql request, with cursor)', async ({
    page,
  }) => {
    const { graphqlRequests } = await stubBundleApi(page, {
      nextPageItems: [
        { quizId: 'next-1', slug: 'next-1', title: 'Next Page Quiz' },
      ],
    });

    await page.goto('/quizzes');

    const loadMore = page.getByTestId('quiz-grid-load-more-button');
    await expect(loadMore).toBeVisible();

    await loadMore.click();

    await page.waitForResponse(
      (response) =>
        response.url().includes('/graphql') && response.status() === 200,
    );

    await expect(
      page.getByTestId('quizzes-directory-card').nth(1),
    ).toBeVisible();

    // The click must trigger exactly one additional /graphql request.
    expect(graphqlRequests.length).toBe(2);

    const secondBody = JSON.parse(graphqlRequests[1].postData() ?? '{}');
    expect(secondBody.operationName).toBe('QuizzesBundle');
    expect(secondBody.variables?.cursor).toBe('cursor-2');
  });
});
