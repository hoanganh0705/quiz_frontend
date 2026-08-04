/**
 * `useAttemptCrossTabSync.spec.tsx` — locks the Story 4.14 cross-tab
 * cache reconciliation adapter and the Story 4.15 completion
 * reconciliation extension.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.8.
 * Extended for Story 4.15: T-4.15.7.
 *
 * Coverage contract:
 *
 *   - Subscription is registered on mount when authenticated, and
 *     removed on unmount.
 *   - Subscription is not registered when the bootstrap is loading
 *     or the viewer is unauthenticated.
 *   - Source-tab and other-user events are ignored.
 *   - `start` revalidates the active + detail + answers caches for
 *     the receiving tab's quiz version.
 *   - `submit` / `withdraw` revalidate the matching detail + answers
 *     caches.
 *   - `abandon` revalidates active + detail caches and converges the
 *     runner to `abandoned`.
 *   - `complete` (Story 4.15, T-4.15.7) revalidates detail + answers
 *     + result + history list pages + history stats for the affected
 *     attempt, but never calls `completeAttempt` and never
 *     auto-navigates.
 *   - Missing `BroadcastChannel` does not crash the hook.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import {
  subscribeToAttemptEvents,
  type AttemptsChangedEvent,
} from '@/lib/api/core/attempts-broadcast-channel';

import { useAttemptCrossTabSync } from '@/features/attempts/hooks/useAttemptCrossTabSync';
import {
  useAttemptsStore,
  hydrateAttemptEntry,
} from '@/features/attempts/stores/useAttemptsStore';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';

const mutateMock = vi.hoisted(() => vi.fn());

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: mutateMock,
  };
});

const useAuthBootstrapMock = vi.hoisted(() => vi.fn());
const subscribeMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: useAuthBootstrapMock,
}));

vi.mock('@/lib/api/core/attempts-broadcast-channel', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/core/attempts-broadcast-channel')>(
      '@/lib/api/core/attempts-broadcast-channel',
    );
  return {
    ...actual,
    subscribeToAttemptEvents: subscribeMock,
  };
});

const SESSION_ID = 'user-1';
const SESSION_OTHER = 'user-2';
const ATTEMPT_ID = 'attempt-1';
const QV_ID = 'qv-1';
const MY_TAB_ID = 'tab-mine';

function setBootstrapAuthenticated(sessionId: string = SESSION_ID) {
  useAuthBootstrapMock.mockReturnValue({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: sessionId, id: sessionId },
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

function makeEvent(
  kind: AttemptsChangedEvent['kind'],
  overrides: Partial<AttemptsChangedEvent> = {},
): AttemptsChangedEvent {
  return {
    type: 'attempts/changed',
    tabId: overrides.tabId ?? 'tab-other',
    timestamp: Date.now(),
    userId: overrides.userId ?? SESSION_ID,
    attemptId: overrides.attemptId ?? ATTEMPT_ID,
    kind,
  };
}

let capturedHandlers: Array<(event: AttemptsChangedEvent) => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  capturedHandlers = [];
  subscribeMock.mockImplementation((handler: (event: AttemptsChangedEvent) => void) => {
    capturedHandlers.push(handler);
    return () => {
      const idx = capturedHandlers.indexOf(handler);
      if (idx >= 0) capturedHandlers.splice(idx, 1);
    };
  });
  useAttemptsStore.setState(
    { attemptsById: {}, attemptsByQuizVersionId: {} },
    true,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAttemptCrossTabSync — lifecycle', () => {
  it('subscribes on mount when authenticated', () => {
    setBootstrapAuthenticated();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when the bootstrap is loading', () => {
    setBootstrapLoading();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('does not subscribe when the viewer is unauthenticated', () => {
    setBootstrapUnauthenticated();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    setBootstrapAuthenticated();
    const { unmount } = renderHook(() =>
      useAttemptCrossTabSync({ quizVersionId: QV_ID }),
    );
    expect(capturedHandlers.length).toBe(1);
    unmount();
    expect(capturedHandlers.length).toBe(0);
  });

  it('re-subscribes when the session id changes', () => {
    useAuthBootstrapMock.mockReturnValue({
      bootstrapState: 'authenticated',
      isAuthenticated: true,
      currentUser: { userId: SESSION_ID, id: SESSION_ID },
    });
    const { rerender } = renderHook(() =>
      useAttemptCrossTabSync({ quizVersionId: QV_ID }),
    );
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    useAuthBootstrapMock.mockReturnValue({
      bootstrapState: 'authenticated',
      isAuthenticated: true,
      currentUser: { userId: SESSION_OTHER, id: SESSION_OTHER },
    });
    rerender();
    expect(subscribeMock).toHaveBeenCalledTimes(2);
  });
});

describe('useAttemptCrossTabSync — event filtering', () => {
  it('ignores events from another user', () => {
    setBootstrapAuthenticated(SESSION_ID);
    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    const otherUserEvent = makeEvent('start', {
      userId: SESSION_OTHER,
      attemptId: 'attempt-other',
    });
    for (const handler of capturedHandlers) {
      handler(otherUserEvent);
    }

    // No SWR mutate call expected for an other-user event.
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('processes events from the current user', () => {
    setBootstrapAuthenticated();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    const myEvent = makeEvent('start');
    expect(() => {
      for (const handler of capturedHandlers) {
        handler(myEvent);
      }
    }).not.toThrow();
  });
});

describe('useAttemptCrossTabSync — kind dispatch', () => {
  it('start revalidates the active, detail, and answers caches', () => {
    setBootstrapAuthenticated();
    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(makeEvent('start'));
    }

    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.active(QV_ID, SESSION_ID),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
  });

  it('submit revalidates the matching detail and answers caches', () => {
    setBootstrapAuthenticated();
    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(makeEvent('submit'));
    }

    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
    // Submit must NOT revalidate the active cache — the runner
    // does not change its start-vs-resume decision.
    expect(mutateMock).not.toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.active(QV_ID, SESSION_ID),
    );
  });

  it('withdraw revalidates the matching detail and answers caches', () => {
    setBootstrapAuthenticated();
    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(makeEvent('withdraw'));
    }

    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
  });

  it('abandon revalidates active + detail and converges the runner to abandoned', () => {
    setBootstrapAuthenticated();
    hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, { status: 'in_progress' });

    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(makeEvent('abandon'));
    }

    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.active(QV_ID, SESSION_ID),
    );

    const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_ID];
    expect(entry?.status).toBe('abandoned');
  });

  it('complete (T-4.15.7) revalidates detail + answers + result + history list pages + history stats', () => {
    setBootstrapAuthenticated();
    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(makeEvent('complete'));
    }

    // Story 4.14 reserved semantics: detail cache revalidated.
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.detail(ATTEMPT_ID, SESSION_ID),
    );
    // Story 4.15 T-4.15.7 extension: answers + result revalidated.
    expect(mutateMock).toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.answers(ATTEMPT_ID, SESSION_ID),
    );
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'result',
      SESSION_ID,
      ATTEMPT_ID,
    ]);
    // History list predicate match.
    const historyPredicateCall = mutateMock.mock.calls.find(
      (args) =>
        typeof args[0] === 'function' &&
        typeof args[2] === 'object' &&
        args[2] !== null &&
        'revalidate' in args[2],
    );
    expect(historyPredicateCall).toBeDefined();
    // History stats cache.
    expect(mutateMock).toHaveBeenCalledWith([
      'attempts',
      'history',
      'stats',
      SESSION_ID,
    ]);
    // The active cache is NOT revalidated — the runner stays where
    // it is until the Story 4.15 handoff.
    expect(mutateMock).not.toHaveBeenCalledWith(
      ATTEMPT_CACHE_KEYS.active(QV_ID, SESSION_ID),
    );
  });

  it('complete (T-4.15.7) does NOT call completeAttempt on the receiving tab', async () => {
    setBootstrapAuthenticated();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    // The receiving adapter must be read-only — the completion
    // mutation is owned by the source tab via `useCompleteAttempt`
    // (T-4.15.5).
    const { completeAttempt } = await import(
      '@/features/attempts/services/attempts.service'
    );
    expect(completeAttempt).toBeDefined();
    // Capture call count by spying on the service module.
    const spy = vi.spyOn(
      await import('@/features/attempts/services/attempts.service'),
      'completeAttempt',
    );
    for (const handler of capturedHandlers) {
      handler(makeEvent('complete'));
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('complete (T-4.15.16) converges the runner status to `completed` when an entry is known', () => {
    setBootstrapAuthenticated();
    hydrateAttemptEntry(ATTEMPT_ID, QV_ID, SESSION_ID, {
      status: 'in_progress',
    });

    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(makeEvent('complete'));
    }

    const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_ID];
    expect(entry?.status).toBe('completed');
    // Player-DTO invariant: the convergence snapshot carries no
    // correctness metadata.
    expect(entry?.completedSnapshot?.scorePercent).toBeNull();
    expect(entry?.completedSnapshot?.correctCount).toBeNull();
  });

  it('complete (T-4.15.16) does not throw when the reverse index has no entry', () => {
    setBootstrapAuthenticated();
    // No hydration — the receiving tab does not know this attempt id.
    expect(() => {
      for (const handler of capturedHandlers) {
        handler(makeEvent('complete', { attemptId: 'attempt-unknown' }));
      }
    }).not.toThrow();
  });

  it('complete (T-4.15.7) ignores events from another user', () => {
    setBootstrapAuthenticated(SESSION_ID);
    mutateMock.mockClear();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    for (const handler of capturedHandlers) {
      handler(
        makeEvent('complete', {
          userId: SESSION_OTHER,
          attemptId: 'attempt-other',
        }),
      );
    }

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('abandon event for an unknown attempt does not throw', () => {
    setBootstrapAuthenticated();
    renderHook(() => useAttemptCrossTabSync({ quizVersionId: QV_ID }));

    // The receiving tab has no hydrated entry for this attempt id.
    expect(() => {
      for (const handler of capturedHandlers) {
        handler(makeEvent('abandon', { attemptId: 'attempt-unknown' }));
      }
    }).not.toThrow();
  });
});

describe('useAttemptCrossTabSync — BroadcastChannel availability', () => {
  it('does not crash when BroadcastChannel is unavailable', () => {
    setBootstrapAuthenticated();
    // subscribeMock returns a noop unsubscribe; the hook should
    // mount and unmount cleanly.
    subscribeMock.mockImplementation(() => () => {});
    expect(() => {
      const { unmount } = renderHook(() =>
        useAttemptCrossTabSync({ quizVersionId: QV_ID }),
      );
      unmount();
    }).not.toThrow();
  });
});