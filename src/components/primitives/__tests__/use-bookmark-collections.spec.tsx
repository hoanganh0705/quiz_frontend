/**
 * `use-bookmark-collections.spec.tsx` — locks the SWR-backed
 * collections-list contract.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B1.
 *
 * Five cases per the ticket AC #1–6:
 *
 *   (a) Unauthenticated state returns an empty array without firing
 *       a fetch — the SWR key resolves to `null` so SWR skips the
 *       fetch.
 *   (b) Authenticated happy path populates the collections array
 *       from `listCollections()`.
 *   (c) An empty server response is represented as an empty array,
 *       not an error.
 *   (d) A 401 response leaves the array empty and surfaces
 *       `error: ApiError` (the wrapper mock simulates a 401).
 *   (e) The SWR key is stable: `['bookmark-collections']`.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. We replicate the
 * setup locally with a `<SWRConfig>` wrapper that provides a fresh
 * in-memory cache per test.
 */

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import {
  bookmarkCollectionsKey,
  useBookmarkCollections,
} from '@/features/bookmarks/hooks/use-bookmark-collections';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const listCollectionsMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
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

function Probe() {
  const lookup = useBookmarkCollections();
  return (
    <div
      data-testid='probe'
      data-collections={JSON.stringify(
        lookup.collections.map((c) => c.collectionId),
      )}
      data-loading={String(lookup.isLoading)}
      data-has-error={String(lookup.error !== null)}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Unauthenticated state
// ---------------------------------------------------------------------------

describe('useBookmarkCollections — unauthenticated', () => {
  it('(a) returns an empty array without firing a fetch when isAuthenticated === false', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-collections')).toBe('[]');
      expect(probeEl.getAttribute('data-loading')).toBe('false');
      expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });
    expect(listCollectionsMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (b) Authenticated happy path
// ---------------------------------------------------------------------------

describe('useBookmarkCollections — authenticated happy path', () => {
  it('(b) populates the collections array from the listCollections endpoint', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });

    listCollectionsMock.mockResolvedValue({
      data: {
        items: [
          {
            collectionId: uuidV7(1),
            userId: uuidV7(2),
            name: 'Favourites',
            description: 'My favourite quizzes',
            quizCount: 5,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-01T00:00:00.000Z',
          },
          {
            collectionId: uuidV7(3),
            userId: uuidV7(2),
            name: 'History',
            description: null,
            quizCount: 2,
            createdAt: '2026-07-15T00:00:00.000Z',
            updatedAt: '2026-07-15T00:00:00.000Z',
          },
        ],
      },
    });

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      const collections = JSON.parse(
        probeEl.getAttribute('data-collections') ?? '[]',
      ) as string[];
      expect(collections).toEqual([uuidV7(1), uuidV7(3)]);
      expect(probeEl.getAttribute('data-loading')).toBe('false');
      expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });

    expect(listCollectionsMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// (c) Empty server response is represented as an empty array
// ---------------------------------------------------------------------------

describe('useBookmarkCollections — empty server response', () => {
  it('(c) returns an empty array for an empty server response, not an error', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    listCollectionsMock.mockResolvedValue({ data: { items: [] } });

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-collections')).toBe('[]');
      expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });
  });
});

// ---------------------------------------------------------------------------
// (d) Error response
// ---------------------------------------------------------------------------

describe('useBookmarkCollections — error', () => {
  it('(d) leaves the array empty and surfaces error when a fetch rejects', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    listCollectionsMock.mockRejectedValue(new Error('401 Unauthorized'));

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-collections')).toBe('[]');
      expect(probeEl.getAttribute('data-has-error')).toBe('true');
    });
  });
});

// ---------------------------------------------------------------------------
// (e) SWR key shape
// ---------------------------------------------------------------------------

describe('useBookmarkCollections — SWR key', () => {
  it('(e) the SWR key follows the documented shape', () => {
    expect(bookmarkCollectionsKey()).toEqual(['bookmark-collections']);
  });
});