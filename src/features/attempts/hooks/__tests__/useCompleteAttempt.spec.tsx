/**
 * `useCompleteAttempt.spec.tsx` — locks the complete-attempt mutation hook.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.5.
 *
 * Coverage:
 *
 *   - Auth-gating short-circuits to `idle` when auth is unresolved.
 *   - Cooldown gate drops rapid double clicks into `cooldown`.
 *   - Success path:
 *       - calls the service with the verified attempt id;
 *       - clears the runner's transient error / cooldown via
 *         `hydrateAttemptEntry`;
 *       - mutates every dependent cache (active / detail / answers
 *         / result / history list / history stats);
 *       - emits exactly one cross-tab broadcast with `kind: 'complete'`.
 *   - 403 `ATTEMPT_NOT_ACTIVE` resolves to `not_active` without toast.
 *   - 404 `ATTEMPT_NOT_FOUND` and 403 `ATTEMPT_FORBIDDEN` resolve to
 *     `redirect` to `/quizzes`.
 *   - 422 `ATTEMPT_VALIDATION_FAILED` resolves to `validation` (inline
 *     banner copy stays via `error.code === 'ATTEMPT_VALIDATION_FAILED'`).
 *   - 429 and 5xx surface typed `ApiError` and preserve retryable state.
 *   - Pending state blocks duplicate triggers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import {
  completeAttempt,
  getAttemptResult,
} from '@/features/attempts/services/attempts.service';
import {
  broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

import { useCompleteAttempt } from '../useCompleteAttempt';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const completeAttemptMock = vi.fn();
const broadcastAttemptsChangedMock = vi.fn();

vi.mock('@/features/attempts/services/attempts.service', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/attempts/services/attempts.service')
    >('@/features/attempts/services/attempts.service');
  return {
    ...actual,
    completeAttempt: (...args: unknown[]) => completeAttemptMock(...args),
    getAttemptResult: (...args: unknown[]) =>
      vi.fn()(...(args as Parameters<typeof getAttemptResult>)),
  };
});

vi.mock('@/lib/api/core/attempts-broadcast-channel', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/lib/api/core/attempts-broadcast-channel')
    >('@/lib/api/core/attempts-broadcast-channel');
  return {
    ...actual,
    broadcastAttemptsChanged: (...args: unknown[]) =>
      broadcastAttemptsChangedMock(...args),
  };
});

// Auth bootstrap mock — the hook reads `bootstrapState` + `currentUser`.
const useAuthBootstrapMock = vi.fn();

vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: () => useAuthBootstrapMock(),
}));

// SWR mutate mock — the hook invalidates several cache keys on success.
const mutateMock = vi.fn().mockResolvedValue(undefined);

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

// Runner-store hydrate mock — the hook clears transient error / cooldown
// via `hydrateAttemptEntry` on success.
const hydrateAttemptEntryMock = vi.fn();

vi.mock('@/features/attempts/stores/useAttemptsStore', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/attempts/stores/useAttemptsStore')
    >('@/features/attempts/stores/useAttemptsStore');
  return {
    ...actual,
    hydrateAttemptEntry: (...args: unknown[]) =>
      hydrateAttemptEntryMock(...args),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeApiError(status: number, code: string, message: string): ApiError {
  return new ApiError({
    name: 'AxiosError',
    message,
    isAxiosError: true,
    response: {
      status,
      statusText: 'X',
      data: {
        type: 'https://api.quiz.local/problems/x',
        title: 'X',
        status,
        detail: message,
        instance: '/api/v1/x',
        extensions: { code, requestId: 'req-test' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function authedAs(userId: string): void {
  useAuthBootstrapMock.mockReturnValue({
    bootstrapState: 'authenticated',
    currentUser: { id: userId, userId },
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useCompleteAttempt — gating', () => {
  beforeEach(() => {
    useAuthBootstrapMock.mockReturnValue({
      bootstrapState: 'unauthenticated',
      currentUser: null,
    });
  });

  it('resolves to idle when auth is unresolved', async () => {
    const { result } = renderHook(() =>
      useCompleteAttempt({
        attemptId: 'a1',
        quizVersionId: 'qv1',
      }),
    );

    let outcome: { kind: string } | undefined;
    await act(async () => {
      outcome = await result.current.complete();
    });

    expect(outcome).toEqual({ kind: 'idle' });
    expect(completeAttemptMock).not.toHaveBeenCalled();
  });

  it('resolves to idle when attemptId is null', async () => {
    authedAs('user-1');
    const { result } = renderHook(() =>
      useCompleteAttempt({
        attemptId: null,
        quizVersionId: 'qv1',
      }),
    );

    let outcome: { kind: string } | undefined;
    await act(async () => {
      outcome = await result.current.complete();
    });

    expect(outcome).toEqual({ kind: 'idle' });
    expect(completeAttemptMock).not.toHaveBeenCalled();
  });

  it('drops rapid double clicks into cooldown', async () => {
    authedAs('user-1');
    completeAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      quizId: 'q1',
      status: 'completed',
      xpEarned: 10,
      finishedAt: '2026-08-01T00:00:00.000Z',
    });

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    let first: { kind: string } | undefined;
    let second: { kind: string } | undefined;
    await act(async () => {
      first = await result.current.complete();
    });
    await act(async () => {
      second = await result.current.complete();
    });

    expect(first?.kind).toBe('success');
    expect(second?.kind).toBe('cooldown');
    expect(completeAttemptMock).toHaveBeenCalledTimes(1);
  });
});

describe('useCompleteAttempt — success', () => {
  beforeEach(() => {
    authedAs('user-1');
  });

  it('calls the service with the verified attempt id', async () => {
    const completedDto = {
      attemptId: 'a1',
      quizId: 'q1',
      status: 'completed',
      scorePercent: 80,
      correctCount: 4,
      timeTakenMs: 12_345,
      xpEarned: 25,
      finishedAt: '2026-08-01T00:00:00.000Z',
    };
    completeAttemptMock.mockResolvedValue(completedDto);

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    expect(completeAttemptMock).toHaveBeenCalledTimes(1);
    expect(completeAttemptMock).toHaveBeenCalledWith('a1');
  });

  it('clears the runner transient error / cooldown via hydrateAttemptEntry', async () => {
    completeAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      status: 'completed',
      xpEarned: 0,
      finishedAt: '2026-08-01T00:00:00.000Z',
    });

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    expect(hydrateAttemptEntryMock).toHaveBeenCalledWith(
      'a1',
      'qv1',
      'user-1',
      { error: null, cooldownUntil: null },
    );
  });

  it('invalidates every dependent cache key on success', async () => {
    completeAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      status: 'completed',
      xpEarned: 0,
      finishedAt: '2026-08-01T00:00:00.000Z',
    });

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    // Active / detail / answers / result are explicit key calls.
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'active',
      'qv1',
      'user-1',
    ]);
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'detail',
      'a1',
      'user-1',
    ]);
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'answers',
      'a1',
      'user-1',
    ]);
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'result',
      'user-1',
      'a1',
    ]);
    // History list uses a predicate; history stats is an explicit key.
    const predicateCall = mutateMock.mock.calls.find(
      (args) => typeof args[0] === 'function',
    );
    expect(predicateCall).toBeDefined();
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'history',
      'stats',
      'user-1',
    ]);
  });

  it('emits exactly one cross-tab broadcast with kind complete', async () => {
    completeAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      status: 'completed',
      xpEarned: 0,
      finishedAt: '2026-08-01T00:00:00.000Z',
    });

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    expect(broadcastAttemptsChangedMock).toHaveBeenCalledTimes(1);
    expect(broadcastAttemptsChangedMock).toHaveBeenCalledWith({
      userId: 'user-1',
      attemptId: 'a1',
      kind: 'complete',
    });
  });

  it('exposes the canonical result projection via outcome.kind === success', async () => {
    const dto = {
      attemptId: 'a1',
      quizId: 'q1',
      status: 'completed',
      scorePercent: 80,
      correctCount: 4,
      timeTakenMs: 12_345,
      xpEarned: 25,
      finishedAt: '2026-08-01T00:00:00.000Z',
    };
    completeAttemptMock.mockResolvedValue(dto);

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('success');
    });
    if (result.current.outcome?.kind === 'success') {
      expect(result.current.outcome.result).toEqual(dto);
    }
  });
});

describe('useCompleteAttempt — outcomes', () => {
  beforeEach(() => {
    authedAs('user-1');
  });

  it('403 ATTEMPT_NOT_ACTIVE resolves to not_active (no toast)', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(403, 'ATTEMPT_NOT_ACTIVE', 'no longer active'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('not_active');
    });
  });

  it('404 ATTEMPT_NOT_FOUND resolves to redirect to /quizzes', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(404, 'ATTEMPT_NOT_FOUND', 'missing'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('redirect');
    });
    if (result.current.outcome?.kind === 'redirect') {
      expect(result.current.outcome.target).toBe('/quizzes');
      expect(result.current.outcome.error.code).toBe('ATTEMPT_NOT_FOUND');
    }
  });

  it('403 ATTEMPT_FORBIDDEN resolves to redirect to /quizzes', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(403, 'ATTEMPT_FORBIDDEN', 'cross-user'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('redirect');
    });
    if (result.current.outcome?.kind === 'redirect') {
      expect(result.current.outcome.error.code).toBe('ATTEMPT_FORBIDDEN');
    }
  });

  it('422 ATTEMPT_VALIDATION_FAILED resolves to validation (inline banner)', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(422, 'ATTEMPT_VALIDATION_FAILED', 'no answers'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('validation');
    });
    if (result.current.outcome?.kind === 'validation') {
      expect(result.current.outcome.error.code).toBe('ATTEMPT_VALIDATION_FAILED');
    }
  });

  it('429 surfaces a retryable outcome with a typed ApiError', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED', 'slow down'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('retryable');
    });
    if (result.current.outcome?.kind === 'retryable') {
      expect(result.current.outcome.error.code).toBe('GLOBAL_RATE_LIMITED');
      expect(result.current.outcome.error.status).toBe(429);
    }
  });

  it('5xx surfaces a retryable outcome with a typed ApiError', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR', 'oops'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('retryable');
    });
  });
});

describe('useCompleteAttempt — pending state', () => {
  beforeEach(() => {
    authedAs('user-1');
  });

  it('disables duplicate triggers while pending', async () => {
    let resolveService: (value: unknown) => void = () => undefined;
    completeAttemptMock.mockImplementation(
      () =>
        new Promise<unknown>((resolve) => {
          resolveService = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    let first: { kind: string } | undefined;
    act(() => {
      void result.current.complete().then((o) => {
        first = o;
      });
    });
    // Wait for the in-flight state to be visible.
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    let second: { kind: string } | undefined;
    await act(async () => {
      second = await result.current.complete();
    });

    // The second call lands inside the cooldown window and resolves
    // to `cooldown` without invoking the service.
    expect(second?.kind).toBe('cooldown');
    expect(completeAttemptMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveService({
        attemptId: 'a1',
        status: 'completed',
        xpEarned: 0,
        finishedAt: '2026-08-01T00:00:00.000Z',
      });
    });

    expect(first?.kind).toBe('success');
  });
});

describe('useCompleteAttempt — broadcast integration', () => {
  beforeEach(() => {
    authedAs('user-1');
  });

  it('broadcasts once even if mutate fails (broadcast is fire-and-forget)', async () => {
    completeAttemptMock.mockResolvedValue({
      attemptId: 'a1',
      status: 'completed',
      xpEarned: 0,
      finishedAt: '2026-08-01T00:00:00.000Z',
    });
    mutateMock.mockRejectedValueOnce(new Error('cache invalidate failed'));

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    // The broadcast must still have been emitted even when a single
    // mutate rejects — the cross-tab reconciliation adapter is the
    // receiving side and is independent of SWR's invalidation.
    expect(broadcastAttemptsChangedMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT broadcast on failure outcomes', async () => {
    completeAttemptMock.mockRejectedValue(
      makeApiError(422, 'ATTEMPT_VALIDATION_FAILED', 'no answers'),
    );

    const { result } = renderHook(() =>
      useCompleteAttempt({ attemptId: 'a1', quizVersionId: 'qv1' }),
    );

    await act(async () => {
      await result.current.complete();
    });

    expect(broadcastAttemptsChangedMock).not.toHaveBeenCalled();
  });
});

// Re-export to ensure the imported helper is exercised at compile-time.
void broadcastAttemptsChanged;