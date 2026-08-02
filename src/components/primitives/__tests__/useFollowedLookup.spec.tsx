/**
 * `useFollowedLookup.spec.tsx` — locks the SWR-backed lookup contract.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B3.
 *
 * Five cases per the ticket AC #1–6:
 *
 *   (a) Unauthenticated state returns empty sets without firing
 *       fetches — the SWR keys resolve to `null` so SWR skips the
 *       fetch.
 *   (b) Authenticated happy path populates both sets from the
 *       `me/followed` endpoints.
 *   (c) 401 response leaves both sets empty and surfaces
 *       `error: ApiError` (the wrapper mock simulates a 401).
 *   (d) `mutate()` fans out to both SWR keys (categories + tags).
 *   (e) The SWR keys are stable: `['follow-lookup', 'categories',
 *       { limit: 500 }]` and `['follow-lookup', 'tags', { limit: 500 }]`.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile
 * registers `@testing-library/jest-dom` matchers and an `afterEach`
 * `cleanup`. SWR is given a fresh in-memory cache per test via a
 * local `<SWRConfig value={{ provider: () => new Map() }}>` wrapper
 * so cached entries from earlier tests do not leak.
 */

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import {
  FOLLOWED_LOOKUP_LIMIT,
  followedCategoriesKey,
  followedTagsKey,
  useFollowedLookup,
} from '@/features/tags/hooks/useFollowedLookup';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const followedCategoriesMock = vi.fn();
const followedTagsMock = vi.fn();

vi.mock('@/features/categories/wrappers/category.wrapper', () => ({
  followedCategories: (...args: unknown[]) => followedCategoriesMock(...args),
}));

vi.mock('@/features/tags/wrappers/tag.wrapper', () => ({
  followedTags: (...args: unknown[]) => followedTagsMock(...args),
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
  const lookup = useFollowedLookup();
  return (
    <div
      data-testid='probe'
      data-categories={JSON.stringify(Array.from(lookup.categories))}
      data-tags={JSON.stringify(Array.from(lookup.tags))}
      data-loading={String(lookup.isLoading)}
      data-has-error={String(lookup.error !== null)}
    />
  );
}

function CapturingProbe({ onCapture }: { onCapture: (lookup: ReturnType<typeof useFollowedLookup>) => void }) {
  const lookup = useFollowedLookup();
  onCapture(lookup);
  return <div data-testid='capture' />;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Unauthenticated state
// ---------------------------------------------------------------------------

describe('useFollowedLookup — unauthenticated', () => {
  it('(a) returns empty sets without firing fetches when isAuthenticated === false', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-categories')).toBe('[]');
      expect(probeEl.getAttribute('data-tags')).toBe('[]');
    });
    expect(followedCategoriesMock).not.toHaveBeenCalled();
    expect(followedTagsMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (b) Authenticated happy path
// ---------------------------------------------------------------------------

describe('useFollowedLookup — authenticated happy path', () => {
  it('(b) populates both sets from the me/followed endpoints', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });

    followedCategoriesMock.mockResolvedValue({
      data: [
        { categoryId: uuidV7(1), name: 'Science', slug: 'science', followedAt: '2026-07-01' },
        { categoryId: uuidV7(2), name: 'History', slug: 'history', followedAt: '2026-07-01' },
      ],
      meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

    followedTagsMock.mockResolvedValue({
      data: [
        { tagId: uuidV7(3), name: 'physics', slug: 'physics', followedAt: '2026-07-01' },
      ],
      meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      const categories = JSON.parse(probeEl.getAttribute('data-categories') ?? '[]') as string[];
      const tags = JSON.parse(probeEl.getAttribute('data-tags') ?? '[]') as string[];
      expect(categories).toEqual([uuidV7(1), uuidV7(2)]);
      expect(tags).toEqual([uuidV7(3)]);
      expect(probeEl.getAttribute('data-loading')).toBe('false');
    });

    expect(followedCategoriesMock).toHaveBeenCalled();
    // The fetcher adapter is a `(_key) => followedCategories({ limit: 500 })`
    // shim. SWR passes the resolved key tuple as the first arg and the
    // adapter ignores it — so the mock records a single positional
    // argument (the limit bag) when our hook invokes it.
    expect(followedCategoriesMock.mock.calls[0]?.[0]).toEqual({ limit: FOLLOWED_LOOKUP_LIMIT });
    expect(followedTagsMock).toHaveBeenCalled();
    expect(followedTagsMock.mock.calls[0]?.[0]).toEqual({ limit: FOLLOWED_LOOKUP_LIMIT });
  });
});

// ---------------------------------------------------------------------------
// (c) Error response leaves sets empty
// ---------------------------------------------------------------------------

describe('useFollowedLookup — error', () => {
  it('(c) leaves both sets empty and surfaces error when a fetch rejects', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });

    followedCategoriesMock.mockRejectedValue(new Error('401 Unauthorized'));
    followedTagsMock.mockResolvedValue({
      data: [],
      meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

    const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

    await waitFor(() => {
      const probeEl = getByTestId('probe');
      expect(probeEl.getAttribute('data-categories')).toBe('[]');
      expect(probeEl.getAttribute('data-tags')).toBe('[]');
      expect(probeEl.getAttribute('data-has-error')).toBe('true');
    });
  });
});

// ---------------------------------------------------------------------------
// (d) mutate() fans out to both SWR keys
// ---------------------------------------------------------------------------

describe('useFollowedLookup — mutate', () => {
  it('(d) exposes a mutate function that fans out to both keys', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });

    followedCategoriesMock.mockResolvedValue({
      data: [],
      meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });
    followedTagsMock.mockResolvedValue({
      data: [],
      meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

    let lookupRef: ReturnType<typeof useFollowedLookup> | null = null;
    const { getByTestId } = render(
      <CapturingProbe onCapture={(l) => { lookupRef = l; }} />,
      { wrapper: TestSwrProvider },
    );

    // Wait for both fetches to settle.
    await waitFor(() => {
      expect(followedCategoriesMock).toHaveBeenCalledTimes(1);
      expect(followedTagsMock).toHaveBeenCalledTimes(1);
    });

    expect(getByTestId('capture')).toBeInTheDocument();
    expect(lookupRef).not.toBeNull();
    const beforeCategoriesCalls = followedCategoriesMock.mock.calls.length;
    const beforeTagsCalls = followedTagsMock.mock.calls.length;

    await lookupRef!.mutate();

    expect(followedCategoriesMock.mock.calls.length).toBe(beforeCategoriesCalls + 1);
    expect(followedTagsMock.mock.calls.length).toBe(beforeTagsCalls + 1);
  });
});

// ---------------------------------------------------------------------------
// (e) SWR key shape
// ---------------------------------------------------------------------------

describe('useFollowedLookup — SWR keys', () => {
  it('(e) the SWR keys follow the documented shape', () => {
    expect(followedCategoriesKey()).toEqual([
      'follow-lookup',
      'categories',
      { limit: FOLLOWED_LOOKUP_LIMIT },
    ]);
    expect(followedTagsKey()).toEqual([
      'follow-lookup',
      'tags',
      { limit: FOLLOWED_LOOKUP_LIMIT },
    ]);
    expect(FOLLOWED_LOOKUP_LIMIT).toBe(500);
  });
});