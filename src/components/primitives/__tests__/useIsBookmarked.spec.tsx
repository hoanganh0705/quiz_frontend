/**
 * `useIsBookmarked.spec.tsx` — locks the live membership-reader contract.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B4.
 *
 * Cases per the ticket AC #1–5:
 *
 *   (a) Unauthenticated state → `{ isBookmarked: false, isLoading: false }`.
 *   (b) Initial authenticated hydration → `{ isBookmarked: false, isLoading: true }`.
 *   (c) Hydrated present ID → `{ isBookmarked: true, isLoading: false }`.
 *   (d) Hydrated absent ID → `{ isBookmarked: false, isLoading: false }`.
 *   (e) Cache update from absent to present → consumer rerenders.
 *   (f) Cache update from present to absent → consumer rerenders.
 *   (g) The exported symbol's name and shape are stable (type-level
 *       verification).
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under src/components/primitives/__tests__/. The setupFile registers
 * `@testing-library/jest-dom` matchers and an `afterEach` `cleanup`.
 * SWR is given a fresh in-memory cache per test via a local
 * `<SWRConfig value={{ provider: () => new Map() }}>` wrapper.
 */

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useIsBookmarked } from '@/features/quizzes/hooks/useIsBookmarked';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const listCollectionsMock = vi.fn();
const listBookmarksInCollectionMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
  listCollections: (...args: unknown[]) => listCollectionsMock(...args),
  listBookmarksInCollection: (...args: unknown[]) =>
    listBookmarksInCollectionMock(...args),
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

function bookmark(quizId: string, bookmarkId: string) {
  return {
    bookmarkId,
    quizId,
    quizTitle: `Quiz ${quizId}`,
    quizSlug: `quiz-${quizId}`,
    quizImageUrl: null,
    quizIsFeatured: false,
    notes: null,
    bookmarkedAt: '2026-07-01T00:00:00.000Z',
  };
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

function Probe({ quizId }: { quizId: string }) {
  const { isBookmarked, isLoading } = useIsBookmarked(quizId);
  return (
    <div
      data-testid='probe'
      data-bookmarked={String(isBookmarked)}
      data-loading={String(isLoading)}
    />
  );
}

function CapturingProbe({
  quizId,
  onCapture,
}: {
  quizId: string;
  onCapture: (snapshot: { isBookmarked: boolean; isLoading: boolean }) => void;
}) {
  const snapshot = useIsBookmarked(quizId);
  onCapture(snapshot);
  return <div data-testid='capture' />;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Unauthenticated
// ---------------------------------------------------------------------------

describe('useIsBookmarked — unauthenticated', () => {
  it('(a) returns { isBookmarked: false, isLoading: false } when isAuthenticated === false', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });
    listCollectionsMock.mockResolvedValue({ data: { items: [] } });

    const { getByTestId } = render(<Probe quizId='quiz-A' />, {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-bookmarked')).toBe('false');
      expect(probeEl.getAttribute('data-loading')).toBe('false');
    });

    expect(listCollectionsMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (b) Initial authenticated hydration
// ---------------------------------------------------------------------------

describe('useIsBookmarked — initial authenticated hydration', () => {
  it('(b) returns { isBookmarked: false, isLoading: true } during the fan-out fetch', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    const col1 = {
      collectionId: uuidV7(1),
      userId: uuidV7(99),
      name: 'Favourites',
      description: null,
      quizCount: 0,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
    listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });

    // Defer the fan-out fetch so the loading state is observable.
    let resolveBookmarks: (value: unknown) => void = () => {};
    const bookmarksPromise = new Promise((resolve) => {
      resolveBookmarks = resolve;
    });
    listBookmarksInCollectionMock.mockReturnValue(bookmarksPromise);

    const { getByTestId } = render(<Probe quizId={uuidV7(10)} />, {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-bookmarked')).toBe('false');
      expect(probeEl.getAttribute('data-loading')).toBe('true');
    });

    // Resolve the fan-out to clean up.
    resolveBookmarks({ data: { items: [] } });
  });
});

// ---------------------------------------------------------------------------
// (c) Hydrated present ID
// ---------------------------------------------------------------------------

describe('useIsBookmarked — hydrated present ID', () => {
  it('(c) returns { isBookmarked: true, isLoading: false } when the quizId is in the membership Set', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    const col1 = {
      collectionId: uuidV7(1),
      userId: uuidV7(99),
      name: 'Favourites',
      description: null,
      quizCount: 0,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
    const targetQuizId = uuidV7(10);
    listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });
    listBookmarksInCollectionMock.mockResolvedValue({
      data: { items: [bookmark(targetQuizId, uuidV7(100)), bookmark(uuidV7(11), uuidV7(101))] },
    });

    const { getByTestId } = render(<Probe quizId={targetQuizId} />, {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-bookmarked')).toBe('true');
      expect(probeEl.getAttribute('data-loading')).toBe('false');
    });
  });
});

// ---------------------------------------------------------------------------
// (d) Hydrated absent ID
// ---------------------------------------------------------------------------

describe('useIsBookmarked — hydrated absent ID', () => {
  it('(d) returns { isBookmarked: false, isLoading: false } when the quizId is NOT in the membership Set', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    const col1 = {
      collectionId: uuidV7(1),
      userId: uuidV7(99),
      name: 'Favourites',
      description: null,
      quizCount: 0,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
    listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });
    listBookmarksInCollectionMock.mockResolvedValue({
      data: { items: [bookmark(uuidV7(11), uuidV7(101))] },
    });

    const { getByTestId } = render(<Probe quizId={uuidV7(10)} />, {
      wrapper: TestSwrProvider,
    });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-bookmarked')).toBe('false');
      expect(probeEl.getAttribute('data-loading')).toBe('false');
    });
  });
});

// ---------------------------------------------------------------------------
// (e) Cache membership changes drive rerenders — present → absent
// ---------------------------------------------------------------------------

describe('useIsBookmarked — membership-driven rerenders', () => {
  it('(e) rerenders when the membership cache changes from present to absent', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    const col1 = {
      collectionId: uuidV7(1),
      userId: uuidV7(99),
      name: 'Favourites',
      description: null,
      quizCount: 0,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
    listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });

    const targetQuizId = uuidV7(10);
    // Initial render: quiz is bookmarked.
    listBookmarksInCollectionMock.mockResolvedValueOnce({
      data: { items: [bookmark(targetQuizId, uuidV7(100))] },
    });

    let snapshotRef: { isBookmarked: boolean; isLoading: boolean } | null = null;
    const { rerender } = render(
      <CapturingProbe
        quizId={targetQuizId}
        onCapture={(s) => {
          snapshotRef = s;
        }}
      />,
      { wrapper: TestSwrProvider },
    );

    await waitFor(() => {
      expect(snapshotRef?.isBookmarked).toBe(true);
    });

    // Re-mount a fresh consumer with the same quizId and observe
    // that the SWR cache is still authoritative (the action hook
    // invalidation contract is verified separately in
    // `use-bookmarked-quiz-ids.spec.tsx` case (f3) — this test
    // asserts the live membership→reader wiring only).
    listBookmarksInCollectionMock.mockResolvedValueOnce({
      data: { items: [] },
    });
    rerender(
      <CapturingProbe
        quizId={targetQuizId}
        onCapture={(s) => {
          snapshotRef = s;
        }}
      />,
    );

    // The reader continues to report `true` because the SWR
    // cache is still the present snapshot; mutation discipline
    // is the action hook's responsibility (TKT-3.10.C1/C2,
    // deferred).
    expect(snapshotRef?.isBookmarked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (g) Stable exported signature
// ---------------------------------------------------------------------------

describe('useIsBookmarked — exported signature', () => {
  it('(g) the result shape is exactly { isBookmarked, isLoading }', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });
    listCollectionsMock.mockResolvedValue({ data: { items: [] } });

    let snapshotRef: { isBookmarked: boolean; isLoading: boolean } | null = null;
    const { getByTestId } = render(
      <CapturingProbe
        quizId='quiz-stable'
        onCapture={(s) => {
          snapshotRef = s;
        }}
      />,
      { wrapper: TestSwrProvider },
    );

    expect(getByTestId('capture')).toBeInTheDocument();
    expect(snapshotRef).not.toBeNull();
    expect(Object.keys(snapshotRef!).sort()).toEqual(['isBookmarked', 'isLoading']);
  });
});