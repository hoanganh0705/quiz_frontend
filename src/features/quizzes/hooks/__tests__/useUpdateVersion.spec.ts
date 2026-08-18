

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';

import { useUpdateVersion } from '@/features/quizzes/hooks/useUpdateVersion';

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

mockUpdateQuizVersion.mockResolvedValueOnce({ data: mockVersion });

const { result } = renderHook(() => useUpdateVersion({}));

const promise1 = result.current.updateVersion(quizId, versionId, { difficulty: 'hard' });
const promise2 = result.current.updateVersion(quizId, versionId, { difficulty: 'easy' });

await Promise.all([promise1, promise2]);

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

act(() => {
result.current.resetError();
    });

expect(result.current.error).toBeNull();
  });
});
