/**
 * `useUpdateVersion.spec.ts` — unit tests for the quiz version update hook.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.21.
 *
 * Tests the useUpdateVersion hook for:
 * - Success path
 * - Error handling (QUIZ_VERSION_IMMUTABLE, QUIZ_SLUG_CONFLICT, etc.)
 * - Single-flight behavior
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useUpdateVersion } from '@/features/quizzes/hooks/useUpdateVersion';

// Mock the service module
const mockUpdateQuizVersion = vi.fn();
vi.mock('@/features/quizzes/services/quizzes.service', () => ({
  updateQuizVersion: (...args: unknown[]) => mockUpdateQuizVersion(...args),
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
        // The wire body puts `code` inside `extensions` (per RFC 7807).
        // The `ApiError` getter reads `data.extensions.code` first and
        // falls back to a synthesized code by status when the field is
        // absent — placing `code` at the top level would silently fall
        // back to `GLOBAL_*` and break the per-code assertions below.
        extensions: { code },
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

describe('useUpdateVersion', () => {
  const quizId = 'quiz-123';
  const versionId = 'version-123';

  it('updates version successfully', async () => {
    const mockVersion = makeVersionSummary(versionId);
    // The hook unwraps `(response as { data }).data`; return the
    // wrapped envelope so the in-flight promise resolves
    // successfully. Use a deferred promise so the test can observe
    // the loading state mid-flight before resolving.
    let resolveUpdate!: (value: { data: typeof mockVersion }) => void;
    const pendingUpdate = new Promise<{ data: typeof mockVersion }>(
      (resolve) => {
        resolveUpdate = resolve;
      },
    );
    mockUpdateQuizVersion.mockReturnValueOnce(pendingUpdate);

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useUpdateVersion({ onSuccess })
    );

    const updatePromise = result.current.updateVersion(quizId, versionId, {
      difficulty: 'hard',
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    resolveUpdate({ data: mockVersion });
    await updatePromise;

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith(mockVersion);
  });

  it('surfaces QUIZ_VERSION_IMMUTABLE error', async () => {
    const error = makeApiError(409, 'QUIZ_VERSION_IMMUTABLE');
    mockUpdateQuizVersion.mockRejectedValueOnce(error);

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useUpdateVersion({ onError })
    );

    let caughtError: ApiError | undefined;
    // Wrap in `act` so React commits the queued `setError` before
    // the await unwinds.
    await act(async () => {
      try {
        await result.current.updateVersion(quizId, versionId, {
          difficulty: 'hard',
        });
      } catch (e) {
        caughtError = e as ApiError;
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(onError).toHaveBeenCalledWith(error);
    expect(caughtError?.code).toBe('QUIZ_VERSION_IMMUTABLE');
  });

  it('surfaces QUIZ_SLUG_CONFLICT error', async () => {
    const error = makeApiError(409, 'QUIZ_SLUG_CONFLICT');
    mockUpdateQuizVersion.mockRejectedValueOnce(error);

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useUpdateVersion({ onError })
    );

    let caughtError: ApiError | undefined;
    await act(async () => {
      try {
        await result.current.updateVersion(quizId, versionId, {
          durationMs: 400_000,
        });
      } catch (e) {
        caughtError = e as ApiError;
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(caughtError?.code).toBe('QUIZ_SLUG_CONFLICT');
  });

  it('surfaces GLOBAL_RATE_LIMITED error', async () => {
    const error = makeApiError(429, 'GLOBAL_RATE_LIMITED');
    // Use `mockRejectedValue` (not `mockRejectedValueOnce`) so the
    // hook's internal 429 retry loop sees the same error on every
    // attempt; otherwise the second attempt resolves to `undefined`.
    mockUpdateQuizVersion.mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateVersion({}));

    await act(async () => {
      try {
        await result.current.updateVersion(quizId, versionId, {
          difficulty: 'hard',
        });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.code).toBe('GLOBAL_RATE_LIMITED');
  });

  it('surfaces 5xx server error', async () => {
    const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    mockUpdateQuizVersion.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useUpdateVersion({}));

    await act(async () => {
      try {
        await result.current.updateVersion(quizId, versionId, {
          difficulty: 'hard',
        });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.status).toBe(500);
  });

  it('prevents concurrent submissions (single-flight)', async () => {
    const mockVersion = makeVersionSummary(versionId);
    // The hook unwraps `(response as { data }).data`; return the
    // wrapped envelope so the in-flight promise resolves
    // successfully.
    mockUpdateQuizVersion.mockResolvedValueOnce({ data: mockVersion });

    const { result } = renderHook(() => useUpdateVersion({}));

    // Fire two concurrent updates
    const promise1 = result.current.updateVersion(quizId, versionId, { difficulty: 'hard' });
    const promise2 = result.current.updateVersion(quizId, versionId, { difficulty: 'easy' });

    await Promise.all([promise1, promise2]);

    // Should only call the API once (second call reuses the in-flight promise)
    expect(mockUpdateQuizVersion).toHaveBeenCalledTimes(1);
  });

  it('resetError clears the current error', async () => {
    const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    mockUpdateQuizVersion.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useUpdateVersion({}));

    await act(async () => {
      try {
        await result.current.updateVersion(quizId, versionId, {
          difficulty: 'hard',
        });
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Wrap `resetError` in `act` so the assertion reads the
    // post-commit value rather than the pre-render snapshot.
    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
  });
});
