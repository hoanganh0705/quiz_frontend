/**
 * `useCreateVersion.spec.ts` — unit tests for the quiz version creation hook.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.21.
 *
 * Tests the useCreateVersion hook for:
 * - Success path
 * - Error handling (429, 5xx, etc.)
 * - Single-flight behavior
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useCreateVersion } from '@/features/quizzes/hooks/useCreateVersion';

// Mock the service module
const mockCreateQuizVersion = vi.fn();
vi.mock('@/features/quizzes/services/quizzes.service', () => ({
  createQuizVersion: (...args: unknown[]) => mockCreateQuizVersion(...args),
}));

function makeVersionSummary(versionId: string) {
  return {
    quizVersionId: versionId,
    quizId: 'quiz-123',
    versionNumber: 1,
    status: 'draft' as const,
    difficulty: 'medium' as const,
    durationMs: 300_000,
    passingScorePercent: 70,
    rewardXp: 100,
    questions: undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeApiError(
  status: number,
  code: string = `TEST_ERROR_${status}`,
): ApiError {
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
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCreateVersion', () => {
  const quizId = 'quiz-123';

  it('creates version successfully', async () => {
    const mockVersion = makeVersionSummary('new-version-123');
    mockCreateQuizVersion.mockResolvedValueOnce(mockVersion);

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useCreateVersion({ onSuccess })
    );

    const createPromise = result.current.createVersion(quizId, {
      difficulty: 'medium',
      durationMs: 300_000,
      passingScorePercent: 70,
      rewardXp: 100,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await createPromise;

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith(mockVersion);
  });

  it('surfaces GLOBAL_RATE_LIMITED error', async () => {
    const error = makeApiError(429, 'GLOBAL_RATE_LIMITED');
    mockCreateQuizVersion.mockRejectedValueOnce(error);

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useCreateVersion({ onError })
    );

    let caughtError: ApiError | undefined;
    try {
      await result.current.createVersion(quizId, {
        difficulty: 'medium',
        durationMs: 300_000,
        passingScorePercent: 70,
        rewardXp: 100,
      });
    } catch (e) {
      caughtError = e as ApiError;
    }

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(onError).toHaveBeenCalledWith(error);
    expect(caughtError?.code).toBe('GLOBAL_RATE_LIMITED');
  });

  it('surfaces 5xx server error', async () => {
    const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    mockCreateQuizVersion.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreateVersion({}));

    try {
      await result.current.createVersion(quizId, {
        difficulty: 'medium',
        durationMs: 300_000,
        passingScorePercent: 70,
        rewardXp: 100,
      });
    } catch {
      // Expected
    }

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.status).toBe(500);
    expect(result.current.error?.code).toBe('GLOBAL_INTERNAL_ERROR');
  });

  it('prevents concurrent submissions (single-flight)', async () => {
    const mockVersion = makeVersionSummary('new-version-123');
    mockCreateQuizVersion.mockResolvedValueOnce(mockVersion);

    const { result } = renderHook(() => useCreateVersion({}));

    // Fire two concurrent creates
    const promise1 = result.current.createVersion(quizId, {
      difficulty: 'hard',
      durationMs: 300_000,
      passingScorePercent: 70,
      rewardXp: 100,
    });
    const promise2 = result.current.createVersion(quizId, {
      difficulty: 'easy',
      durationMs: 300_000,
      passingScorePercent: 70,
      rewardXp: 100,
    });

    await Promise.all([promise1, promise2]);

    // Should only call the API once (second call reuses the in-flight promise)
    expect(mockCreateQuizVersion).toHaveBeenCalledTimes(1);
  });

  it('resetError clears the current error', async () => {
    const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    mockCreateQuizVersion.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreateVersion({}));

    try {
      await result.current.createVersion(quizId, {
        difficulty: 'medium',
        durationMs: 300_000,
        passingScorePercent: 70,
        rewardXp: 100,
      });
    } catch {
      // Expected
    }

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    result.current.resetError();

    expect(result.current.error).toBeNull();
  });
});
