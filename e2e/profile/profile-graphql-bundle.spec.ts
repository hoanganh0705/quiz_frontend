/**
 * `profile-graphql-bundle.spec.ts` — Playwright e2e coverage for the
 * `/profile/[name]` route's GraphQL bundle.
 *
 * Validates the pilot page contract:
 *   - Exactly one `/graphql` request fires on mount (no fan-out to the
 *     legacy `/api/v1/users/{id}/profile-bundle` endpoint or the
 *     `useUserQuizAnalytics` / `useUserQuizzes` / `useUserActivity` /
 *     `useFollowers` / `useFollowing` REST endpoints the previous
 *     implementation fanned out to).
 *   - An anonymous viewer mounts with `includeAnalytics: false` and
 *     `includeFollowers: false` so the auth-gated fields are not
 *     requested.
 *   - An authenticated self viewer mounts with `includeAnalytics: true`
 *     and `includeFollowers: true` so the auth-gated fields are
 *     requested.
 *
 * The page mounts a fresh Apollo Client per `ApolloSubtreeProvider`
 * instance. The client reads `auth_token` (when present) but does not
 * require authentication, so the anonymous spec runs against the
 * public `/profile/[name]` route.
 */

import { expect, test, type Page, type Request } from '@playwright/test';

const PROFILE_USERNAME = 'alice';
const PROFILE_USER_ID = '0192f4d8-5001-7000-8000-000000000001';
const VIEWER_USER_ID = '0192f4d8-5002-7000-8000-000000000002';

const LEGACY_ENDPOINTS = [
  '/api/v1/users/',
  '/profile-bundle',
  '/quiz-analytics',
  '/social/users/',
  '/followers',
  '/following',
  '/user-activity',
] as const;

interface ProfileStubOptions {
  /**
   * Viewer identity embedded in the auth token. The page reads
   * `auth_token` from the cookie jar; when this is set, the test
   * pretends the request is from the named viewer.
   */
  viewerId?: string;
  viewerUsername?: string;
}

function makeProfileResponse(options: ProfileStubOptions) {
  const isSelf =
    options.viewerId === PROFILE_USER_ID &&
    options.viewerUsername === PROFILE_USERNAME;

  const profile = {
    summary: {
      userId: PROFILE_USER_ID,
      username: PROFILE_USERNAME,
      displayName: 'Alice Example',
      avatarUrl: null,
      bio: 'Hello world',
      country: 'Wonderland',
      countryCode: 'WL',
      bgImageUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      xpTotal: 1500,
      level: 3,
      currentLevelXP: 1000,
      nextLevelXP: 2000,
      xpProgressPercent: 50,
      levelTitle: 'apprentice',
      levelTitleLocalised: 'Apprentice',
      currentStreak: 4,
      longestStreak: 9,
      quizzesCreated: 1,
      quizzesPublished: 1,
      quizzesTaken: 21,
      followers: 12,
      following: 34,
      friends: 1,
      coinBalance: 50,
    },
    analytics: isSelf
      ? {
          userId: PROFILE_USER_ID,
          summary: { totalAttempts: 30, completedQuizzes: 21, averageScore: 84.5 },
          favoriteCategory: { id: 'cat-1', name: 'Science' },
          favoriteTag: null,
          lastUpdated: '2026-08-10T12:00:00.000Z',
        }
      : null,
    xpHistory: isSelf
      ? { bucket: 'day', unit: 'xp', points: [] }
      : null,
    recentActivity: isSelf
      ? [
          {
            eventId: 'evt-1',
            eventType: 'quiz_completed',
            createdAt: '2026-08-10T12:00:00.000Z',
            metadataKeys: ['quizTitle', 'score'],
          },
        ]
      : null,
    wallet: isSelf
      ? {
          balance: 50,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-08-10T12:00:00.000Z',
          lastTransactionAt: null,
          earnedToday: 0,
          dailyEarnCap: 100,
        }
      : null,
    followers: isSelf
      ? {
          items: [
            {
              userId: '00000000-0000-7000-8000-000000000777',
              username: 'fan-1',
              avatarUrl: null,
              followedAt: '2026-08-01T00:00:00.000Z',
            },
          ],
          pageInfo: { limit: 50, nextCursor: null, hasNextPage: false },
        }
      : null,
    following: isSelf
      ? { items: [], pageInfo: { limit: 50, nextCursor: null, hasNextPage: false } }
      : null,
    activity: isSelf
      ? { items: [], pageInfo: { limit: 30, nextCursor: null, hasNextPage: false } }
      : null,
  };

  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { userProfile: profile } }),
  };
}

async function stubProfileApi(page: Page, options: ProfileStubOptions = {}) {
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
    const response = makeProfileResponse(options);
    await route.fulfill(response);
  });

  return { graphqlRequests, restRequests };
}

test.describe('/profile/[name] route — GraphQL bundle (single-request mount contract)', () => {
  test('exactly 1 /graphql request fires on mount (no fan-out to legacy endpoints)', async ({
    page,
  }) => {
    const { graphqlRequests, restRequests } = await stubProfileApi(page);

    await page.goto(`/profile/${PROFILE_USERNAME}`);

    await expect(page.getByTestId('public-profile-page')).toBeVisible();

    await page.waitForLoadState('networkidle');

    expect(graphqlRequests).toHaveLength(1);
    for (const legacy of LEGACY_ENDPOINTS) {
      const matched = restRequests.some((request) =>
        request.url().includes(legacy),
      );
      expect(
        matched,
        `expected no requests to legacy endpoint containing ${legacy}, but found one`,
      ).toBe(false);
    }
  });

  test('anonymous viewer requests includeAnalytics:false / includeFollowers:false', async ({
    page,
  }) => {
    const { graphqlRequests } = await stubProfileApi(page);

    await page.goto(`/profile/${PROFILE_USERNAME}`);

    await expect(page.getByTestId('public-profile-page')).toBeVisible();

    expect(graphqlRequests).toHaveLength(1);
    const body = JSON.parse(graphqlRequests[0].postData() ?? '{}');
    expect(body.operationName).toBe('UserProfile');
    expect(body.variables?.username).toBe(PROFILE_USERNAME);
    expect(body.variables?.includeAnalytics).toBe(false);
    expect(body.variables?.includeFollowers).toBe(false);
  });

  test('authenticated self viewer requests includeAnalytics:true / includeFollowers:true', async ({
    page,
    context,
  }) => {
    // Seed a stub auth_token cookie before any client code runs so
    // the Apollo auth link picks it up on the first request.
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'stub-jwt',
        domain: 'localhost',
        path: '/',
      },
    ]);

    const { graphqlRequests } = await stubProfileApi(page, {
      viewerId: PROFILE_USER_ID,
      viewerUsername: PROFILE_USERNAME,
    });

    await page.goto(`/profile/${PROFILE_USERNAME}`);

    await expect(page.getByTestId('public-profile-page')).toBeVisible();

    expect(graphqlRequests).toHaveLength(1);
    const body = JSON.parse(graphqlRequests[0].postData() ?? '{}');
    expect(body.operationName).toBe('UserProfile');
    expect(body.variables?.username).toBe(PROFILE_USERNAME);
    expect(body.variables?.includeAnalytics).toBe(true);
    expect(body.variables?.includeFollowers).toBe(true);
  });

  test('the request body includes the documented social-rail page sizes', async ({
    page,
  }) => {
    const { graphqlRequests } = await stubProfileApi(page);

    await page.goto(`/profile/${PROFILE_USERNAME}`);

    await expect(page.getByTestId('public-profile-page')).toBeVisible();

    expect(graphqlRequests).toHaveLength(1);
    const body = JSON.parse(graphqlRequests[0].postData() ?? '{}');
    expect(body.variables?.followersFirst).toBe(50);
    expect(body.variables?.followingFirst).toBe(50);
    expect(body.variables?.activityFirst).toBe(30);
  });

  test('the printed document gates auth-conditional fields with @include(if:)', async ({
    page,
  }) => {
    const { graphqlRequests } = await stubProfileApi(page);

    await page.goto(`/profile/${PROFILE_USERNAME}`);

    await expect(page.getByTestId('public-profile-page')).toBeVisible();

    expect(graphqlRequests).toHaveLength(1);
    const body = JSON.parse(graphqlRequests[0].postData() ?? '{}');
    const printedQuery: string = body.query ?? '';
    expect(printedQuery).toContain('analytics @include(if: $includeAnalytics)');
    expect(printedQuery).toContain('followers(first: $followersFirst) @include(if: $includeFollowers)');
    expect(printedQuery).toContain('following(first: $followingFirst) @include(if: $includeFollowers)');
    expect(printedQuery).toContain('activity(first: $activityFirst) @include(if: $includeFollowers)');
  });
});
