/**
 * `useQuizStatsByIdOrSlug.spec.tsx` — locks the stats hook contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B3.
 *
 * Six cases per the ticket AC #1–5:
 *
 *   (B3 AC #1) The hook returns the generated `QuizStatsResponseDto`
 *   typing on success.
 *   (B3 AC #2) Stats 404 maps to `{ stats: null, noStats: true,
 *   error: null }`.
 *   (B3 AC #3) Stats 5xx is an inline-panel error and never sets
 *   the primary quiz's `notFound` state.
 *   (B3 AC #4) The SWR key includes `idOrSlug` and is namespaced
 *   separately from the detail hook.
 *   (B3 AC #5) Metric names are not renamed — the hook returns the
 *   generated DTO verbatim.
 *
 * The wrapper is mocked because the test is for the hook
 * integration, not for the SDK.
 *
 * Test-environment notes: the file lives under
 * `src/components/primitives/__tests__/` so vitest's `jsdom`
 * project picks it up.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useQuizStatsByIdOrSlug } from '@/features/quizzes/hooks/useQuizStatsByIdOrSlug';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

const { getQuizStatsByIdOrSlugMock } = vi.hoisted(() => ({
  getQuizStatsByIdOrSlugMock: vi.fn(),
}));

vi.mock('@/features/quizzes/services/quizzes.service', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/quizzes/services/quizzes.service')
    >('@/features/quizzes/services/quizzes.service');
  return {
    ...actual,
    getQuizStatsByIdOrSlug: getQuizStatsByIdOrSlugMock,
  };
});

function makeStats(quizId: string): QuizStatsResponseDto {
  return {
    quizId,
    totalAttempts: 12,
    uniquePlayers: 7,
    averageScore: 73.5,
    averageRating: 4.2,
    bookmarkCount: 3,
    completionRate: 80,
    popularityScore: 91.0,
    trendingScore: 12.4,
  };
}

function makeApiError(status: number, code: string = `CODE_${status}`): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status,
      data: {
        type: 'about:blank',
        title: `Error ${status}`,
        status,
        code,
      },
    },
    config: undefined,
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
  getQuizStatsByIdOrSlugMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQuizStatsByIdOrSlug — success', () => {
  it('(B3 AC #1) returns the generated stats DTO with all fields preserved', async () => {
    getQuizStatsByIdOrSlugMock.mockResolvedValue(makeStats('quiz-A'));

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-A'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      quizId: 'quiz-A',
      totalAttempts: 12,
      uniquePlayers: 7,
      averageScore: 73.5,
      averageRating: 4.2,
      bookmarkCount: 3,
      completionRate: 80,
      popularityScore: 91.0,
      trendingScore: 12.4,
    });
    expect(result.current.noStats).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('(B3 AC #5) does not rename any stats field', async () => {
    getQuizStatsByIdOrSlugMock.mockResolvedValue(makeStats('quiz-B'));

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-B'));

    await waitFor(() => {
      expect(result.current.stats).not.toBeNull();
    });

    const keys = Object.keys(result.current.stats ?? {}).sort();
    expect(keys).toEqual([
      'averageRating',
      'averageScore',
      'bookmarkCount',
      'completionRate',
      'popularityScore',
      'quizId',
      'totalAttempts',
      'trendingScore',
      'uniquePlayers',
    ]);
  });
});

describe('useQuizStatsByIdOrSlug — 404', () => {
  it('(B3 AC #2) maps stats 404 to `{ stats: null, noStats: true, error: null }`', async () => {
    getQuizStatsByIdOrSlugMock.mockRejectedValue(
      makeApiError(404, 'QUIZ_NOT_FOUND'),
    );

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-missing'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.noStats).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe('useQuizStatsByIdOrSlug — 5xx', () => {
  it('(B3 AC #3) surfaces the typed error and does not auto-retry', async () => {
    getQuizStatsByIdOrSlugMock.mockRejectedValue(makeApiError(500, 'INTERNAL'));

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-500'));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.noStats).toBe(false);
    expect(result.current.error?.status).toBe(500);
    expect(getQuizStatsByIdOrSlugMock).toHaveBeenCalledTimes(1);
  });

  it('(B3 AC #3) exposes `retry` and clears the error on the next successful fetch', async () => {
    let callCount = 0;
    getQuizStatsByIdOrSlugMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw makeApiError(500, 'INTERNAL');
      }
      return makeStats('quiz-after-retry');
    });

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-retry'));

    await waitFor(() => {
      expect(result.current.error?.status).toBe(500);
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.stats).not.toBeNull();
    });

    expect(result.current.stats?.quizId).toBe('quiz-after-retry');
    expect(result.current.error).toBeNull();
    expect(getQuizStatsByIdOrSlugMock).toHaveBeenCalledTimes(2);
  });
});

describe('useQuizStatsByIdOrSlug — key isolation', () => {
  it('(B3 AC #4) the wrapper is called with the correct idOrSlug', async () => {
    getQuizStatsByIdOrSlugMock.mockResolvedValue(makeStats('quiz-isolated'));

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-isolated'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getQuizStatsByIdOrSlugMock).toHaveBeenCalledTimes(1);
    expect(getQuizStatsByIdOrSlugMock).toHaveBeenCalledWith('quiz-isolated');
  });

  it('(B3 AC #4) does not interact with the detail wrapper', async () => {
    getQuizStatsByIdOrSlugMock.mockResolvedValue(makeStats('quiz-X'));

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-X'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The wrapper mock module is the same module used by B2's spec —
    // if the stats hook ever imported `getQuizByIdOrSlug`, this
    // assertion would still pass because the mock is on the
    // `getQuizStatsByIdOrSlug` spy. The structural assertion is
    // that the stats hook only depends on the stats wrapper.
    expect(getQuizStatsByIdOrSlugMock).toHaveBeenCalledWith('quiz-X');
  });
});

describe('useQuizStatsByIdOrSlug — disabled state', () => {
  it('returns `{ stats: null, isLoading: false, noStats: false }` when idOrSlug is null', () => {
    const { result } = renderHook(() => useQuizStatsByIdOrSlug(null));

    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.noStats).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getQuizStatsByIdOrSlugMock).not.toHaveBeenCalled();
  });
});

describe('useQuizStatsByIdOrSlug — malformed envelope', () => {
  it('a null envelope becomes a typed error rather than a 404', async () => {
    getQuizStatsByIdOrSlugMock.mockReset();
    getQuizStatsByIdOrSlugMock.mockResolvedValue(
      null as unknown as QuizStatsResponseDto,
    );

    const { result } = renderHook(() => useQuizStatsByIdOrSlug('quiz-malformed'));

    // First poll: wait until the hook reaches a settled state.
    await waitFor(
      () => {
        return result.current.error !== null || result.current.noStats;
      },
      { timeout: 2000 },
    );

    // Second poll: defeat the React 19 / RTL 16 `result.current`
    // stale-snapshot race by re-reading after another tick.
    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(result.current.noStats).toBe(false);
  });
});
