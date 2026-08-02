/**
 * `useBookmarkQuiz` + `useUnbookmarkQuiz` — Story 3.10 / TKT-3.10.F2
 * cross-tab broadcast tests.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.F2.
 *
 * Cases per the ticket AC #1–5:
 *
 *   (a) Successful add publishes exactly one event.
 *   (b) 409-as-success publishes exactly one event.
 *   (c) Successful remove publishes exactly one event.
 *   (d) Rollback, no-collection, and no-op paths publish no event.
 *   (e) Event `userId` is the authenticated owner and is never omitted.
 *
 * The tests mock the broadcast function (from F1) at the
 * `lib/api/core/bookmarks-broadcast-channel` module level. The unit
 * under test is the action hook's call to that function — the channel
 * itself is covered by `<bookmarks-broadcast-channel.spec.ts>`.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. SWR's global
 * `mutate` is mocked at module level so the test captures
 * invalidation calls without spinning up a real SWR cache.
 */

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/use-bookmark-collections';
import { useBookmarkQuiz } from '@/features/bookmarks/hooks/use-bookmark-quiz';
import { useUnbookmarkQuiz } from '@/features/bookmarks/hooks/use-unbookmark-quiz';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const broadcastBookmarksInvalidatedMock = vi.fn();
const subscribeToBookmarkEventsMock = vi.fn(
  (_handler: unknown): (() => void) => () => {},
);

vi.mock('@/lib/api/core/bookmarks-broadcast-channel', () => ({
  broadcastBookmarksInvalidated: (
    ...args: unknown[]
  ): unknown => broadcastBookmarksInvalidatedMock(...args),
  subscribeToBookmarkEvents: (
    handler: unknown,
  ): (() => void) => subscribeToBookmarkEventsMock(handler),
}));

const mutateMock = vi.fn();
vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

const addBookmarkMock = vi.fn();
const removeBookmarkMock = vi.fn();
const getBookmarkStatusMock = vi.fn();
const listCollectionsMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
  addBookmark: (...args: unknown[]) => addBookmarkMock(...args),
  removeBookmark: (...args: unknown[]) => removeBookmarkMock(...args),
  getBookmarkStatus: (...args: unknown[]) => getBookmarkStatusMock(...args),
  listCollections: (...args: unknown[]) => listCollectionsMock(...args),
}));

const useAuthStateMock = vi.fn();
vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: () => useAuthStateMock(),
}));

const useUserMock = vi.fn();
vi.mock('@/features/users/store/user-store', () => ({
  useUser: () => useUserMock(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0');
  return `0192f4d8-0000-7000-8000-${tail}`;
}

const COLLECTION_ID = uuidV7(1);
const QUIZ_ID = uuidV7(7);
const USER_ID = uuidV7(2);

function favouriteCollection() {
  return {
    collectionId: COLLECTION_ID,
    userId: USER_ID,
    name: 'Favourites',
    description: null,
    quizCount: 0,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

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

function BookmarkProbe({
  quizId,
  stateRef,
}: {
  quizId: string;
  stateRef: { current: ProbeState };
}): React.JSX.Element {
  const { isLoading } = useBookmarkCollections();
  const { isPending, lastError, lastOutcome, bookmark } =
    useBookmarkQuiz(quizId);
  stateRef.current = {
    pending: isPending,
    outcomeKind: lastOutcome?.kind ?? null,
    errorKind: lastError?.kind ?? null,
  };
  return (
    <button
      type='button'
      data-testid='probe-bookmark'
      data-hydrated={String(!isLoading)}
      data-pending={String(isPending)}
      data-outcome-kind={lastOutcome?.kind ?? ''}
      data-error-kind={lastError?.kind ?? ''}
      onClick={() => {
        void bookmark();
      }}
    />
  );
}

function UnbookmarkProbe({
  quizId,
  stateRef,
}: {
  quizId: string;
  stateRef: { current: ProbeState };
}): React.JSX.Element {
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
      data-pending={String(isPending)}
      data-outcome-kind={lastOutcome?.kind ?? ''}
      data-error-kind={lastError?.kind ?? ''}
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
  broadcastBookmarksInvalidatedMock.mockReset();
  subscribeToBookmarkEventsMock.mockClear();
  useAuthStateMock.mockReturnValue({ isAuthenticated: true });
  useUserMock.mockReturnValue({
    userId: USER_ID,
    username: 'tester',
    email: 'tester@example.com',
    role: 'user',
    isVerified: true,
  });
  listCollectionsMock.mockResolvedValue({
    data: { items: [favouriteCollection()] },
  });
  getBookmarkStatusMock.mockResolvedValue({
    data: { bookmarked: true, collections: [{ collectionId: COLLECTION_ID }] },
  });
  addBookmarkMock.mockResolvedValue({
    data: {
      bookmarkId: uuidV7(99),
      quizId: QUIZ_ID,
      quizTitle: 'Quiz',
      quizSlug: 'quiz',
      quizImageUrl: null,
      quizIsFeatured: false,
      notes: null,
      bookmarkedAt: '2026-07-01T00:00:00.000Z',
      collectionId: COLLECTION_ID,
    },
  });
  removeBookmarkMock.mockResolvedValue({ data: undefined });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

async function waitForHydration(getByTestId: (id: string) => HTMLElement) {
  await waitFor(() => {
    const probeEl = getByTestId('probe-bookmark');
    expect(probeEl.getAttribute('data-hydrated')).toBe('true');
  });
}

// ---------------------------------------------------------------------------
// (a) Successful add publishes exactly one event
// ---------------------------------------------------------------------------

describe('useBookmarkQuiz — broadcast on success', () => {
  it('(a) successful add publishes exactly one bookmarks/invalidated event with the user id', async () => {
    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.pending).toBe(false);
    });

    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });
});

// ---------------------------------------------------------------------------
// (b) 409-as-success publishes exactly one event
// ---------------------------------------------------------------------------

describe('useBookmarkQuiz — broadcast on 409 reconciliation', () => {
  it('(b) 409 BOOKMARK_CONFLICT publishes exactly one event (the membership is canonical)', async () => {
    addBookmarkMock.mockReset();
    addBookmarkMock.mockRejectedValueOnce(
      makeApiError(409, 'BOOKMARK_CONFLICT'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('already_bookmarked');
    });

    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });
});

// ---------------------------------------------------------------------------
// (c) Successful remove publishes exactly one event
// ---------------------------------------------------------------------------

describe('useUnbookmarkQuiz — broadcast on success', () => {
  it('(c) successful remove publishes exactly one event', async () => {
    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <UnbookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );

    await act(async () => {
      getByTestId('probe-unbookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('success');
    });

    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });

  it('(c2) 404 (collection deleted server-side) publishes exactly one event', async () => {
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockRejectedValueOnce(
      makeApiError(404, 'NOT_FOUND'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <UnbookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );

    await act(async () => {
      getByTestId('probe-unbookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('success');
    });

    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });

  it('(c3) already-unbookmarked (status reports no collections) publishes exactly one event', async () => {
    getBookmarkStatusMock.mockReset();
    getBookmarkStatusMock.mockResolvedValue({
      data: { bookmarked: false, collections: [] },
    });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <UnbookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );

    await act(async () => {
      getByTestId('probe-unbookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('already_unbookmarked');
    });

    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });
});

// ---------------------------------------------------------------------------
// (d) Rollback / no-collection / no-op paths publish NO event
// ---------------------------------------------------------------------------

describe('useBookmarkQuiz — no broadcast on rollback or no-op', () => {
  it('(d1) a 4xx (other than 409) rollback publishes no event', async () => {
    addBookmarkMock.mockReset();
    addBookmarkMock.mockRejectedValueOnce(
      makeApiError(400, 'BAD_REQUEST'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('reverted');
    });

    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });

  it('(d2) a 429 rate-limit rollback publishes no event', async () => {
    addBookmarkMock.mockReset();
    addBookmarkMock.mockRejectedValueOnce(
      makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('reverted');
    });

    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });

  it('(d3) a 5xx rollback publishes no event', async () => {
    addBookmarkMock.mockReset();
    addBookmarkMock.mockRejectedValueOnce(
      makeApiError(500, 'INTERNAL'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('reverted');
    });

    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });

  it('(d4) the no-collection path publishes no event (no HTTP call was made)', async () => {
    listCollectionsMock.mockReset();
    listCollectionsMock.mockResolvedValue({ data: { items: [] } });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );

    // Wait for the collections list to resolve (empty).
    await waitFor(() => {
      const probe = getByTestId('probe-bookmark');
      // Probe is hydrated once `useBookmarkCollections` has settled.
      // The data-hydrated flag flips when `useBookmarkCollections`
      // reports `isLoading === false`; for an empty list that's
      // `data-hydrated="true"`.
      expect(probe.getAttribute('data-hydrated')).toBe('true');
    });

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('no_collection');
    });

    expect(addBookmarkMock).not.toHaveBeenCalled();
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });

  it('(d5) the unauthenticated path publishes no event', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('unauthenticated');
    });

    expect(addBookmarkMock).not.toHaveBeenCalled();
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});

describe('useUnbookmarkQuiz — no broadcast on rollback or no-op', () => {
  it('(d6) a 5xx rollback publishes no event', async () => {
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockRejectedValueOnce(
      makeApiError(500, 'INTERNAL'),
    );

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <UnbookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );

    await act(async () => {
      getByTestId('probe-unbookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('reverted');
    });

    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });

  it('(d7) the unauthenticated path publishes no event', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <UnbookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );

    await act(async () => {
      getByTestId('probe-unbookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('unauthenticated');
    });

    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (e) Event userId payload contract
// ---------------------------------------------------------------------------

describe('useBookmarkQuiz — broadcast payload user id', () => {
  it('(e1) the event always carries the authenticated user id (never empty or undefined)', async () => {
    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('success');
    });

    // Capture the call argument and assert the userId is a non-empty
    // string equal to the auth store's userId.
    const args = broadcastBookmarksInvalidatedMock.mock.calls[0];
    expect(args).toBeDefined();
    const payload = args?.[0] as { userId: string };
    expect(typeof payload.userId).toBe('string');
    expect(payload.userId.length).toBeGreaterThan(0);
    expect(payload.userId).toBe(USER_ID);
  });

  it('(e2) when the auth store is mid-bootstrap and the userId is unavailable, no event is published', async () => {
    // Simulate the edge case: the user is authenticated (so the
    // mutation IS allowed) but the user-store hasn't populated yet.
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useUserMock.mockReturnValue(null);

    const stateRef: { current: ProbeState } = {
      current: { pending: false, outcomeKind: null, errorKind: null },
    };

    const { getByTestId } = render(
      <BookmarkProbe quizId={QUIZ_ID} stateRef={stateRef} />,
      { wrapper: TestSwrProvider },
    );
    await waitForHydration(getByTestId);

    await act(async () => {
      getByTestId('probe-bookmark').click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(stateRef.current.outcomeKind).toBe('success');
    });

    // The local optimistic + server-valid flow is intact — the
    // local tab already invalidated the cache via SWR — but the
    // cross-tab broadcast is suppressed because the userId source
    // is empty. The local mutation's SWR invalidation is the
    // authoritative same-tab state (F2 AC #5 says the userId is
    // never omitted; an empty userId is treated as "no broadcast"
    // to avoid mistagging the event with another user's id).
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});
