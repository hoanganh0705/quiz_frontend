/**
 * `use-my-profile-bundle.spec.ts` — Phase 6 integration spec for the
 * `/users/me/profile` bundle hook (W-30+).
 *
 * Asserts the end-to-end contract of `useMyProfileBundle()`:
 *
 *   1. The bundle fetcher calls `userControllerGetMyProfileBundle()` on the
 *      SDK with the active SWR key — confirming the wire-level contract
 *      behind the `/users/me/profile` endpoint.
 *   2. A successful response populates `summary`, `analytics`, `xpHistory`,
 *      and `recentActivity` directly from the SDK payload (no silent
 *      fallbacks, no rewrites).
 *   3. A 404 from the SDK surfaces as `notFound: true` with `error: null`
 *      — i.e. the hook treats "profile not yet provisioned" as a
 *      non-error empty state, matching the contract documented in
 *      `useMyProfileBundle.ts`.
 *   4. A 500 surfaces as `error: ApiError` and `notFound: false` so the
 *      UI can render the error banner.
 *   5. SWR's retry helper is exposed through `retry()` and reissues the
 *      SDK call.
 *
 * ## Mocking strategy
 *
 * Phase 6 contract: the hook reads the SDK through `getUsers()` and the
 * generated `userControllerGetMyProfileBundle()` function. We stub the
 * SDK function to return the unwrapped payload so we don't need to
 * mock the Axios transport. SWR's `useSingleWithRetry` is wrapped
 * behind a single SWR key, so this spec exercises the bundled
 * reducer end-to-end without spinning up a real cache provider.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';
import { useMyProfileBundle } from '../use-my-profile-bundle';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getUsers: vi.fn(),
  };
});

const { getUsers } = await import('@/lib/api');
const mockedGetUsers = vi.mocked(getUsers);

const FULL_BUNDLE = {
  summary: {
    userId: '00000000-0000-7000-8000-000000000001',
    username: 'fresh-user',
    displayName: 'Fresh User',
    avatarUrl: null,
    bio: null,
    country: null,
    countryCode: null,
    bgImageUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    xpTotal: 1500,
    level: 2,
    currentLevelXP: 1000,
    nextLevelXP: 2000,
    xpProgressPercent: 50,
    levelTitle: 'apprentice' as const,
    levelTitleLocalised: 'Apprentice',
    currentStreak: 4,
    longestStreak: 9,
    quizzesCreated: 3,
    quizzesPublished: 2,
    quizzesTaken: 7,
    followers: 11,
    following: 5,
    friends: 1,
  },
  analytics: {
    totalXp: 1500,
    quizzesAuthored: 3,
    quizzesPublished: 2,
    quizzesCompleted: 7,
    averageScorePercent: 80.5,
    perfectScores: 1,
    questionsAnswered: 35,
    correctAnswers: 28,
    accuracyPercent: 80,
    dailyActiveStreak: 4,
    longestDailyStreak: 9,
    lastActiveAt: '2026-08-10T12:00:00.000Z',
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-08-10T23:59:59.000Z',
    topCategoryId: null,
    topCategoryName: null,
  },
  xpHistory: {
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-08-10T23:59:59.000Z',
    granularity: 'day' as const,
    points: [
      { at: '2026-08-09T00:00:00.000Z', value: 100 },
      { at: '2026-08-10T00:00:00.000Z', value: 200 },
    ],
  },
  recentActivity: [
    {
      id: 'a-1',
      type: 'quiz_completed',
      at: '2026-08-10T12:00:00.000Z',
      payload: { quizId: 'q-1', score: 90 },
    },
  ],
};

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
  return new ApiError({
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code, detail: `Mock ${status}` },
    },
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('useMyProfileBundle — /users/me/profile integration', () => {
  beforeEach(() => {
    mockedGetUsers.mockReset();
    mockedGetUsers.mockReturnValue({
      userControllerGetMyProfileBundle: vi.fn(),
    } as unknown as ReturnType<typeof getUsers>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the SDK with the documented contract and exposes the unwrapped bundle', async () => {
    const sdkCall = vi.fn().mockResolvedValue({ data: FULL_BUNDLE });
    mockedGetUsers.mockReturnValue({
      userControllerGetMyProfileBundle: sdkCall,
    } as unknown as ReturnType<typeof getUsers>);

    const { result } = renderHook(() => useMyProfileBundle());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(sdkCall).toHaveBeenCalledTimes(1);
    expect(result.current.summary).toEqual(FULL_BUNDLE.summary);
    expect(result.current.analytics).toEqual(FULL_BUNDLE.analytics);
    expect(result.current.xpHistory).toEqual(FULL_BUNDLE.xpHistory);
    expect(result.current.recentActivity).toEqual(FULL_BUNDLE.recentActivity);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('maps a 404 to a non-error empty state (notFound=true)', async () => {
    mockedGetUsers.mockReturnValue({
      userControllerGetMyProfileBundle: vi
        .fn()
        .mockRejectedValue(makeApiError(404, 'GLOBAL_NOT_FOUND')),
    } as unknown as ReturnType<typeof getUsers>);

    const { result } = renderHook(() => useMyProfileBundle());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.analytics).toBeNull();
  });

  it('surfaces a 500 as error and notFound=false so the UI can render the banner', async () => {
    mockedGetUsers.mockReturnValue({
      userControllerGetMyProfileBundle: vi
        .fn()
        .mockRejectedValue(makeApiError(500, 'GLOBAL_INTERNAL_ERROR')),
    } as unknown as ReturnType<typeof getUsers>);

    const { result } = renderHook(() => useMyProfileBundle());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notFound).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.status).toBe(500);
  });

  it('exposes a retry() action that reissues the SDK call', async () => {
    const sdkCall = vi
      .fn()
      .mockRejectedValueOnce(makeApiError(500, 'GLOBAL_INTERNAL_ERROR'))
      .mockResolvedValueOnce({ data: FULL_BUNDLE });
    mockedGetUsers.mockReturnValue({
      userControllerGetMyProfileBundle: sdkCall,
    } as unknown as ReturnType<typeof getUsers>);

    const { result } = renderHook(() => useMyProfileBundle());

    await waitFor(() => expect(result.current.error).not.toBeNull());

    await result.current.retry();

    await waitFor(() => expect(result.current.summary).toEqual(FULL_BUNDLE.summary));
    expect(sdkCall).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });
});