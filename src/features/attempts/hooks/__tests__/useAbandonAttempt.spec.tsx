

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
useAttemptsStore,
hydrateAttemptEntry,
} from '@/features/attempts/stores/useAttemptsStore';

const abandonAttemptMock = vi.hoisted(() => vi.fn());
const completeAttemptMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());
const mutateMock = vi.hoisted(() => vi.fn());
const broadcastAttemptsChangedMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/attempts/services/attempts.service', () => ({
abandonAttempt: abandonAttemptMock,
completeAttempt: completeAttemptMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
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

import { useAbandonAttempt } from '@/features/attempts/hooks/useAbandonAttempt';

const SESSION_ID = 'user-1';
const ATTEMPT_ID = 'attempt-1';
const QV_ID = 'qv-1';

function setBootstrapAuthenticated() {
useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: SESSION_ID, id: SESSION_ID },
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
abandonAttemptMock.mockResolvedValue({});
useAttemptsStore.setState(
{ attemptsById: {}, attemptsByQuizVersionId: {} },
true,
  );
});

afterEach(() => {
vi.useRealTimers();
});

describe('useAbandonAttempt — no mutation on mount', () => {
it('renders without firing the service', () => {
setBootstrapAuthenticated();
renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );
expect(abandonAttemptMock).not.toHaveBeenCalled();
expect(completeAttemptMock).not.toHaveBeenCalled();
  });
});

describe('useAbandonAttempt — happy path', () => {
it('forwards verified attemptId', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

await act(async () => {
await result.current.confirm();
    });

expect(abandonAttemptMock).toHaveBeenCalledTimes(1);
expect(abandonAttemptMock).toHaveBeenCalledWith(ATTEMPT_ID);
expect(completeAttemptMock).not.toHaveBeenCalled();
  });

it('converges the runner to terminal abandoned', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

await act(async () => {
await result.current.confirm();
    });

const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_ID];
expect(entry?.status).toBe('abandoned');
  });

it('revalidates active + detail caches and emits one broadcast', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

await act(async () => {
await result.current.confirm();
    });

expect(mutateMock).toHaveBeenCalledWith(
ATTEMPT_CACHE_KEYS.active(QV_ID, SESSION_ID),
    );
expect(mutateMock).toHaveBeenCalledWith(
ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
expect(broadcastAttemptsChangedMock).toHaveBeenCalledTimes(1);
expect(broadcastAttemptsChangedMock).toHaveBeenCalledWith({
userId: SESSION_ID,
attemptId: ATTEMPT_ID,
kind: 'abandon',
    });
  });
});

describe('useAbandonAttempt — 409 not_active', () => {
it('produces not_active and revalidates the detail cache', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
abandonAttemptMock.mockRejectedValueOnce(
makeApiError(409, 'ATTEMPT_NOT_ACTIVE'),
    );

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.confirm>>;
await act(async () => {
outcome = await result.current.confirm();
    });

expect(outcome.kind).toBe('not_active');
expect(mutateMock).toHaveBeenCalledWith(
ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
  });
});

describe('useAbandonAttempt — 403 forbidden', () => {
it('produces forbidden', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
abandonAttemptMock.mockRejectedValueOnce(
makeApiError(403, 'ATTEMPT_FORBIDDEN'),
    );

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.confirm>>;
await act(async () => {
outcome = await result.current.confirm();
    });

expect(outcome.kind).toBe('forbidden');
  });
});

describe('useAbandonAttempt — 404 not_found', () => {
it('produces not_found', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
abandonAttemptMock.mockRejectedValueOnce(
makeApiError(404, 'ATTEMPT_NOT_FOUND'),
    );

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.confirm>>;
await act(async () => {
outcome = await result.current.confirm();
    });

expect(outcome.kind).toBe('not_found');
  });
});

describe('useAbandonAttempt — retryable', () => {
it('surfaces 5xx as retryable with typed error', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });
abandonAttemptMock.mockRejectedValueOnce(makeApiError(500, 'INTERNAL'));

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let outcome!: Awaited<ReturnType<typeof result.current.confirm>>;
await act(async () => {
outcome = await result.current.confirm();
    });

expect(outcome.kind).toBe('retryable');
if (outcome.kind === 'retryable') {
expect(outcome.error.status).toBe(500);
    }
  });
});

describe('useAbandonAttempt — cooldown', () => {
it('drops a rapid duplicate confirm', async () => {
setBootstrapAuthenticated();
hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

const { result } = renderHook(() =>
useAbandonAttempt({ attemptId: ATTEMPT_ID, quizVersionId: QV_ID }),
    );

let first!: Awaited<ReturnType<typeof result.current.confirm>>;
await act(async () => {
first = await result.current.confirm();
    });

let second!: Awaited<ReturnType<typeof result.current.confirm>>;
await act(async () => {
second = await result.current.confirm();
    });

expect(first.kind).toBe('success');
expect(second.kind).toBe('cooldown');
expect(abandonAttemptMock).toHaveBeenCalledTimes(1);
  });
});