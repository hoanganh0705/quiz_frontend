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
import { act, renderHook, waitFor } from '@testing-library/react';

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

describe('useCreateVersion', () => {
  const quizId = 'quiz-123';

  it('creates version successfully', async () => {
    const mockVersion = makeVersionSummary('new-version-123');
    // The hook unwraps the response envelope via `(response as
    // { data }).data`, so the service mock must return the
    // `{ data: QuizVersionSummary }` shape rather than the bare
    // summary. A flat object would make `data` undefined and the
    // hook would throw "Unexpected response shape".
    //
    // Use a deferred promise so the test can observe the loading
    // state mid-flight. `mockResolvedValueOnce` would resolve on the
    // next microtask, faster than the `waitFor` polling, and the
    // hook would flip `isLoading` back to `false` before the
    // assertion ever runs.
    let resolveCreate!: (value: { data: typeof mockVersion }) => void;
    const pendingCreate = new Promise<{ data: typeof mockVersion }>(
      (resolve) => {
        resolveCreate = resolve;
      },
    );
    mockCreateQuizVersion.mockReturnValueOnce(pendingCreate);

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

    resolveCreate({ data: mockVersion });
    await createPromise;

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith(mockVersion);
  });

  it('surfaces GLOBAL_RATE_LIMITED error', async () => {
    const error = makeApiError(429, 'GLOBAL_RATE_LIMITED');
    // Use `mockRejectedValue` (not `mockRejectedValueOnce`) so the
    // hook's internal 429 retry loop sees the same error on every
    // attempt; otherwise the second attempt resolves to `undefined`.
    mockCreateQuizVersion.mockRejectedValue(error);

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useCreateVersion({ onError })
    );

    let caughtError: ApiError | undefined;
    // Wrap the mutating call in `act` so React commits the
    // queued `setError` before the await unwinds.
    await act(async () => {
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
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error).toEqual(error);
    expect(onError).toHaveBeenCalledWith(error);
    expect(caughtError?.code).toBe('GLOBAL_RATE_LIMITED');
  });

  it('surfaces 5xx server error', async () => {
    const error = makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    mockCreateQuizVersion.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreateVersion({}));

    await act(async () => {
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
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.status).toBe(500);
    expect(result.current.error?.code).toBe('GLOBAL_INTERNAL_ERROR');
  });

  it('prevents concurrent submissions (single-flight)', async () => {
    const mockVersion = makeVersionSummary('new-version-123');
    // The hook unwraps `(response as { data }).data`; return the
    // wrapped shape so the in-flight promise resolves successfully.
    mockCreateQuizVersion.mockResolvedValueOnce({ data: mockVersion });

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

    // `resetError` triggers a React state update; wrap the call in
    // `act` so the assertion reads the post-commit value rather than
    // the pre-render snapshot.
    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
  });
});
