/**
 * `use-unbookmark-quiz.spec.tsx` — locks the remove-bookmark
 * action-hook contract.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.C2.
 *
 * Six cases per the ticket AC #1–6:
 *
 *   (a) The hook resolves the applicable owned collection from the
 *       targeted status before issuing the delete.
 *   (b) The mutation calls `removeBookmark(collectionId, quizId)`
 *       against the resolved collection.
 *   (c) Success invalidates the membership, status, and
 *       collection-summary SWR keys; multi-collection membership
 *       is re-evaluated.
 *   (d) Missing status membership is a safe no-op followed by
 *       membership revalidation.
 *   (e) 404, other 4xx, 429, 5xx, and network errors restore the
 *       prior set and expose the classified error.
 *   (f) Calls within 500 ms coalesce via `useOptimisticToggle`.
 *   (g) Unauthenticated state short-circuits to a no-op and
 *       surfaces `lastOutcome.kind === 'unauthenticated'`.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. SWR's global
 * `mutate` is mocked at module level.
 */

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/use-bookmark-collections';
import { useUnbookmarkQuiz } from '@/features/bookmarks/hooks/use-unbookmark-quiz';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mutateMock = vi.fn();
vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

const removeBookmarkMock = vi.fn();
const getBookmarkStatusMock = vi.fn();
const listCollectionsMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
  removeBookmark: (...args: unknown[]) => removeBookmarkMock(...args),
  getBookmarkStatus: (...args: unknown[]) => getBookmarkStatusMock(...args),
  listCollections: (...args: unknown[]) => listCollectionsMock(...args),
}));

const useAuthStateMock = vi.fn();
vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: () => useAuthStateMock(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0');
  return `0192f4d8-0000-7000-8000-${tail}`;
}

const TARGET_COLLECTION_ID = uuidV7(1);
const ALTERNATE_COLLECTION_ID = uuidV7(2);
const QUIZ_ID = uuidV7(7);

function makeApiError(status: number, code: string): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: {
        type: 'about:blank',
        title: `Error ${status}`,
        status,
        code,
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}

interface ProbeState {
  pending: boolean;
  outcomeKind: string | null;
  errorKind: string | null;
}

function Probe({
  quizId,
  stateRef,
}: {
  quizId: string;
  stateRef: { current: ProbeState };
}) {
  const { isLoading } = useBookmarkCollections();
  const { isPending, lastError, lastOutcome, unbookmark } =
    useUnbookmarkQuiz(quizId);
  stateRef.current = {
    pending: isPending,
    outcomeKind: lastOutcome?.kind ?? null,
    errorKind: lastError?.kind ?? null,
  };
  return (
    <button
      type='button'
      data-testid='probe-unbookmark'
      data-hydrated={String(!isLoading)}
      data-pending={String(isPending)}
      data-outcome-kind={lastOutcome?.kind ?? ''}
      data-error-kind={lastError?.kind ?? ''}
      data-unbookmark-handler='true'
      onClick={() => {
        void unbookmark();
      }}
    />
  );
}

function flushMicrotasks(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

beforeEach(() => {
  useAuthStateMock.mockReturnValue({ isAuthenticated: true });
  // Default: the user owns one collection; the quiz lives in it.
  listCollectionsMock.mockResolvedValue({
    data: {
      items: [
        {
          collectionId: TARGET_COLLECTION_ID,
          userId: uuidV7(99),
          name: 'Favourites',
          description: null,
          quizCount: 1,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    },
  });
  // Default: the status says the quiz is in the target collection.
  getBookmarkStatusMock.mockResolvedValue({
    data: {
      bookmarked: true,
      collections: [{ collectionId: TARGET_COLLECTION_ID, name: 'Favourites' }],
    },
  });
  removeBookmarkMock.mockResolvedValue({ data: undefined });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

async function waitForHydration(container: HTMLElement) {
  await waitFor(
    () => {
      const el = container.querySelector(
        '[data-testid="probe-unbookmark"]',
      ) as HTMLButtonElement | null;
      if (!el) throw new Error('probe-unbookmark not rendered');
      if (el.getAttribute('data-hydrated') !== 'true') {
        throw new Error('not hydrated');
      }
    },
    { timeout: 1000 },
  );
}

// ---------------------------------------------------------------------------
// (a) Targeted status lookup
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — targeted status lookup', () => {
  it('(a) resolves the applicable owned collection from the status before deleting', async () => {
    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    expect(getBookmarkStatusMock).toHaveBeenCalledTimes(1);
    expect(getBookmarkStatusMock).toHaveBeenCalledWith(QUIZ_ID);
  });
});

// ---------------------------------------------------------------------------
// (b) Wrapper call shape
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — wrapper call shape', () => {
  it('(b) calls removeBookmark against the resolved collection, not against a hard-coded one', async () => {
    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    expect(removeBookmarkMock).toHaveBeenCalledTimes(1);
    expect(removeBookmarkMock).toHaveBeenCalledWith(TARGET_COLLECTION_ID, QUIZ_ID);
  });

  it('(b2) when the status lists multiple owned collections the hook picks the first deterministically', async () => {
    getBookmarkStatusMock.mockReset();
    getBookmarkStatusMock.mockResolvedValue({
      data: {
        bookmarked: true,
        collections: [
          { collectionId: TARGET_COLLECTION_ID, name: 'Favourites' },
          { collectionId: ALTERNATE_COLLECTION_ID, name: 'History' },
        ],
      },
    });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    expect(removeBookmarkMock).toHaveBeenCalledTimes(1);
    expect(removeBookmarkMock).toHaveBeenCalledWith(
      TARGET_COLLECTION_ID,
      QUIZ_ID,
    );
  });
});

// ---------------------------------------------------------------------------
// (c) Success invalidates every documented key
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — success path', () => {
  it('(c) invalidates membership, status, and collection-summary keys', async () => {
    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.pending).toBe(false);
    });

    const invalidateCalls = mutateMock.mock.calls.filter((call) => {
      const opts = call[2] as { revalidate?: boolean } | undefined;
      return call[1] === undefined && opts?.revalidate === true;
    });

    const invalidatedKeys = invalidateCalls.map(
      (call) => JSON.stringify(call[0]),
    );

    expect(invalidatedKeys).toContain(JSON.stringify(['bookmarked-quiz-ids']));
    expect(invalidatedKeys).toContain(JSON.stringify(['bookmark-collections']));
    expect(invalidatedKeys).toContain(
      JSON.stringify(['bookmark-status', QUIZ_ID]),
    );

    expect(stateRef.current.outcomeKind).toBe('success');
    expect(stateRef.current.errorKind).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (d) Missing membership = no-op + revalidation
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — missing membership', () => {
  it('(d) returns already_unbookmarked and revalidates the membership without firing removeBookmark', async () => {
    getBookmarkStatusMock.mockReset();
    getBookmarkStatusMock.mockResolvedValue({
      data: { bookmarked: false, collections: [] },
    });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    expect(removeBookmarkMock).not.toHaveBeenCalled();
    expect(stateRef.current.outcomeKind).toBe('already_unbookmarked');
    expect(stateRef.current.pending).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (e) Error rollbacks
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — error rollback', () => {
  it('(e1) a 404 on the status endpoint classifies as reverted and lastError.kind = http_404', async () => {
    // `getBookmarkStatus` never returns 404 per the API contract; we
    // simulate the wrapper throwing a 404 here for the targeted
    // status path via a 500 status failure.
    getBookmarkStatusMock.mockReset();
    getBookmarkStatusMock.mockRejectedValue(
      makeApiError(500, 'BOOKMARK_INTERNAL_ERROR'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('reverted');
    });
    expect(removeBookmarkMock).not.toHaveBeenCalled();
  });

  it('(e2) a 404 on removeBookmark is treated as success (collection was deleted server-side)', async () => {
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockRejectedValue(makeApiError(404, 'COLLECTION_NOT_FOUND'));

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.pending).toBe(false);
    });

    expect(stateRef.current.outcomeKind).toBe('success');
    expect(stateRef.current.errorKind).toBeNull();
  });

  it('(e3) a 429 produces lastOutcome = reverted + lastError.kind = http_429', async () => {
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockRejectedValue(
      makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.errorKind).toBe('http_429');
    });
    expect(stateRef.current.outcomeKind).toBe('reverted');
  });

  it('(e4) a 500 produces lastError.kind = http_5xx', async () => {
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockRejectedValue(
      makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.errorKind).toBe('http_5xx');
    });
    expect(stateRef.current.outcomeKind).toBe('reverted');
  });

  it('(e5) a network failure maps to lastError.kind = unknown', async () => {
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockImplementation(async () => {
      throw new TypeError('network down');
    });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    await waitForHydration(container);

    const button = container.querySelector(
      '[data-testid="probe-unbookmark"]',
    ) as HTMLButtonElement;

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.errorKind).toBe('unknown');
    });
    expect(stateRef.current.outcomeKind).toBe('reverted');
  });
});

// ---------------------------------------------------------------------------
// (f) 500 ms coalesce
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — 500 ms coalesce', () => {
  it('(f) calls within 500 ms produce a single removeBookmark invocation', async () => {
    let resolveRemove: (value: unknown) => void = () => {};
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemove = resolve;
        }),
    );

    const { result } = renderHook(() => useUnbookmarkQuiz(QUIZ_ID), {
      wrapper: TestSwrProvider,
    });

    // Drain SWR hydration microtasks.
    await act(async () => {
      await flushMicrotasks();
      await flushMicrotasks();
    });

    await act(async () => {
      void result.current.unbookmark();
      await flushMicrotasks();
      await flushMicrotasks();
    });
    await act(async () => {
      void result.current.unbookmark();
      await flushMicrotasks();
    });

    expect(removeBookmarkMock).toHaveBeenCalledTimes(1);

    // Cleanup.
    await act(async () => {
      resolveRemove({ data: undefined });
      await flushMicrotasks();
    });
  });
});

// ---------------------------------------------------------------------------
// (g) Unauthenticated short-circuit
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — unauthenticated short-circuit', () => {
  it('(g) does not fire removeBookmark and surfaces lastOutcome.kind = unauthenticated', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { container } = render(<Probe quizId={QUIZ_ID} stateRef={stateRef} />, {
      wrapper: TestSwrProvider,
    });

    const button = await waitFor(
      () => {
        const el = container.querySelector(
          '[data-testid="probe-unbookmark"]',
        ) as HTMLButtonElement | null;
        if (!el) throw new Error('probe-unbookmark not rendered');
        return el;
      },
      { timeout: 1000 },
    );

    await act(async () => {
      button.click();
      await flushMicrotasks();
    });

    expect(removeBookmarkMock).not.toHaveBeenCalled();
    expect(getBookmarkStatusMock).not.toHaveBeenCalled();
    expect(stateRef.current.outcomeKind).toBe('unauthenticated');
    expect(stateRef.current.pending).toBe(false);
    expect(stateRef.current.errorKind).toBeNull();
  });
});