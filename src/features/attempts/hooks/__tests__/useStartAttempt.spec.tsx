/**
 * `useStartAttempt.spec.tsx` — locks the start-attempt mutation hook.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.9.
 *
 * Coverage contract:
 *
 *   - Auth gate: unauthenticated, bootstrap-loading, and `quizId: null`
 *     callers never fire a request and resolve to `idle`.
 *   - Service receives the verified `quizId` and body.
 *   - Success hydrates the runner store and emits one cross-tab
 *     `attempts/changed { kind: 'start' }` event.
 *   - 409 `ATTEMPT_ALREADY_STARTED` produces an `already_started`
 *     outcome (not an error), and revalidates the active lookup.
 *   - 422 `ATTEMPT_QUIZ_NOT_PUBLISHED` produces a `quiz_unpublished`
 *     outcome.
 *   - 429 / 5xx surface as `retryable` outcomes with the typed error.
 *   - Rapid double click is blocked by the 500 ms cooldown.
 *   - No client-generated attempt identity is stored before server
 *     success.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
  useAttemptsStore,
  hydrateAttemptEntry,
} from '@/features/attempts/stores/useAttemptsStore';

const startAttemptMock = vi.hoisted(() => vi.fn());
const useAuthBootstrapMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());
const broadcastAttemptsChangedMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/services/attempts.service', () => ({
  startAttempt: startAttemptMock,
}));

vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: useAuthBootstrapMock,
}));

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return { ...actual, mutate: mutateMock };
});

vi.mock('@/lib/api/core/attempts-broadcast-channel', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/core/attempts-broadcast-channel')>(
      '@/lib/api/core/attempts-broadcast-channel',
    );
  return { ...actual, broadcastAttemptsChanged: broadcastAttemptsChangedMock };
});

import { useStartAttempt } from '@/features/attempts/hooks/useStartAttempt';

const SESSION_ID = 'user-1';
const QUIZ_ID = 'quiz-1';
const ATTEMPT_ID = 'attempt-1';

function setBootstrapAuthenticated() {
  useAuthBootstrapMock.mockReturnValue({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: SESSION_ID, id: SESSION_ID },
  });
}

function setBootstrapUnauthenticated() {
  useAuthBootstrapMock.mockReturnValue({
    bootstrapState: 'unauthenticated',
    isAuthenticated: false,
    currentUser: null,
  });
}

function setBootstrapLoading() {
  useAuthBootstrapMock.mockReturnValue({
    bootstrapState: 'bootstrapping',
    isAuthenticated: false,
    currentUser: null,
  });
}

function makeApiError(
  status: number,
  code: string,
  message = `Mock ${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: 'https://api.quiz.local/problems/x',
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: 'req-test' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateMock.mockResolvedValue(undefined);
  broadcastAttemptsChangedMock.mockReturnValue(undefined);
  startAttemptMock.mockResolvedValue({ data: { attemptId: ATTEMPT_ID } });
  useAttemptsStore.setState(
    { attemptsById: {}, attemptsByQuizVersionId: {} },
    true,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useStartAttempt — auth gate', () => {
  it('returns idle when bootstrap is loading', async () => {
    setBootstrapLoading();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('idle');
    expect(startAttemptMock).not.toHaveBeenCalled();
  });

  it('returns idle when the viewer is unauthenticated', async () => {
    setBootstrapUnauthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('idle');
    expect(startAttemptMock).not.toHaveBeenCalled();
  });

  it('returns idle when quizId is null', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: null }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('idle');
    expect(startAttemptMock).not.toHaveBeenCalled();
  });
});

describe('useStartAttempt — happy path', () => {
  it('forwards quizId and the verified payload to the service', async () => {
    setBootstrapAuthenticated();
    const payload = { contextType: 'solo' as const };
    const { result } = renderHook(() =>
      useStartAttempt({ quizId: QUIZ_ID, payload }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(startAttemptMock).toHaveBeenCalledTimes(1);
    expect(startAttemptMock).toHaveBeenCalledWith(QUIZ_ID, payload);
  });

  it('hydrates the runner store with the server-confirmed attempt id', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    await act(async () => {
      await result.current.start();
    });

    const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_ID];
    expect(entry).toBeDefined();
    expect(entry?.status).toBe('in_progress');
    expect(entry?.sessionId).toBe(SESSION_ID);
  });

  it('revalidates the active-attempt cache on success', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    await act(async () => {
      await result.current.start();
    });

    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.active(QUIZ_ID, SESSION_ID),
    );
  });

  it('emits one cross-tab broadcast with kind=start', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    await act(async () => {
      await result.current.start();
    });

    expect(broadcastAttemptsChangedMock).toHaveBeenCalledTimes(1);
    expect(broadcastAttemptsChangedMock).toHaveBeenCalledWith({
      userId: SESSION_ID,
      attemptId: ATTEMPT_ID,
      kind: 'start',
    });
  });

  it('exposes success outcome with the server-confirmed attempt id', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.attemptId).toBe(ATTEMPT_ID);
    }
    expect(result.current.isPending).toBe(false);
  });
});

describe('useStartAttempt — already_started (409)', () => {
  it('produces an already_started outcome and revalidates the active lookup', async () => {
    setBootstrapAuthenticated();
    startAttemptMock.mockRejectedValueOnce(
      makeApiError(409, 'ATTEMPT_ALREADY_STARTED'),
    );

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('already_started');
    expect(result.current.error).toBeNull();
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.active(QUIZ_ID, SESSION_ID),
    );
  });
});

describe('useStartAttempt — quiz_unpublished (422)', () => {
  it('produces a quiz_unpublished outcome', async () => {
    setBootstrapAuthenticated();
    startAttemptMock.mockRejectedValueOnce(
      makeApiError(422, 'ATTEMPT_QUIZ_NOT_PUBLISHED'),
    );

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('quiz_unpublished');
    expect(result.current.error).toBeNull();
  });
});

describe('useStartAttempt — retryable failures', () => {
  it('surfaces 5xx as retryable with the typed error', async () => {
    setBootstrapAuthenticated();
    const apiErr = makeApiError(500, 'INTERNAL');
    startAttemptMock.mockRejectedValueOnce(apiErr);

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('retryable');
    if (outcome.kind === 'retryable') {
      expect(outcome.error.status).toBe(500);
    }
    expect(result.current.error).toBe(apiErr);
  });

  it('surfaces 429 as retryable with the typed error', async () => {
    setBootstrapAuthenticated();
    const apiErr = makeApiError(429, 'RATE_LIMITED');
    startAttemptMock.mockRejectedValueOnce(apiErr);

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let outcome!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      outcome = await result.current.start();
    });

    expect(outcome.kind).toBe('retryable');
    if (outcome.kind === 'retryable') {
      expect(outcome.error.status).toBe(429);
    }
  });
});

describe('useStartAttempt — cooldown', () => {
  it('drops a rapid second click inside the cooldown window', async () => {
    setBootstrapAuthenticated();
    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    let first!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      first = await result.current.start();
    });

    let second!: Awaited<ReturnType<typeof result.current.start>>;
    await act(async () => {
      second = await result.current.start();
    });

    expect(first.kind).toBe('success');
    expect(second.kind).toBe('cooldown');
    expect(startAttemptMock).toHaveBeenCalledTimes(1);
  });
});

describe('useStartAttempt — no client-generated identity', () => {
  it('does not write a placeholder attemptId before server success', async () => {
    setBootstrapAuthenticated();
    startAttemptMock.mockResolvedValueOnce(
      new Promise(() => {
        /* never resolves */
      }) as unknown as Awaited<ReturnType<typeof startAttemptMock>>,
    );

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    act(() => {
      void result.current.start();
    });

    // While pending, the store must not have a new entry.
    expect(useAttemptsStore.getState().attemptsById).toEqual({});
  });
});

describe('useStartAttempt — reset', () => {
  it('clears outcome and error after reset', async () => {
    setBootstrapAuthenticated();
    const apiErr = makeApiError(500, 'INTERNAL');
    startAttemptMock.mockRejectedValueOnce(apiErr);

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.error).toBe(apiErr);

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.outcome).toBeNull();
  });
});

describe('useStartAttempt — hydration guard', () => {
  it('does not clobber an existing hydrated entry from another session', async () => {
    setBootstrapAuthenticated();
    hydrateAttemptEntry(ATTEMPT_ID, QUIZ_ID, 'user-other', {
      status: 'in_progress',
    });

    const { result } = renderHook(() => useStartAttempt({ quizId: QUIZ_ID }));

    await act(async () => {
      await result.current.start();
    });

    const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_ID];
    expect(entry?.sessionId).toBe('user-other');
  });
});