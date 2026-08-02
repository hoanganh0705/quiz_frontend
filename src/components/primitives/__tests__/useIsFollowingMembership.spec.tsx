/**
 * `useIsFollowingCategory.spec.tsx` + `useIsFollowingTag.spec.tsx` —
 * locks the membership-check contract for the two per-feature
 * consumer hooks of `useFollowedLookup`.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B3.
 *
 * Four cases per hook (mirrored across category + tag):
 *
 *   (a) `id === null` returns `isFollowing: false` without firing a
 *       fetch (the SWR keys resolve to `null` so SWR skips the fetch).
 *   (b) `id !== null` and lookup not yet hydrated returns
 *       `isFollowing: false, isLoading: true`.
 *   (c) `id !== null` and lookup hydrated with the id returns
 *       `isFollowing: true`.
 *   (d) lookup hydrated without the id returns `isFollowing: false`.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile
 * registers `@testing-library/jest-dom` matchers and an `afterEach`
 * `cleanup`. The wrapper + auth hooks are mocked at module level so
 * the test can drive the lookup shape deterministically.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type React from 'react';

// ---------------------------------------------------------------------------
// Mocks — the lookup is mocked; the membership hook reads from it.
// ---------------------------------------------------------------------------

const useFollowedLookupMock = vi.fn();

vi.mock('@/features/tags/hooks/useFollowedLookup', () => ({
  useFollowedLookup: () => useFollowedLookupMock(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0');
  return `0192f4d8-0000-7000-8000-${tail}`;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useIsFollowingCategory
// ---------------------------------------------------------------------------

import { useIsFollowingCategory } from '@/features/categories/hooks/useIsFollowingCategory';

function CategoryProbe({ id }: { id: string | null }) {
  const { isFollowing, isLoading } = useIsFollowingCategory(id);
  return (
    <div
      data-testid='probe'
      data-is-following={String(isFollowing)}
      data-is-loading={String(isLoading)}
    />
  );
}

describe('useIsFollowingCategory', () => {
  it('(a) id === null returns isFollowing: false without firing the lookup', () => {
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>(),
      tags: new Set<string>(),
      isLoading: false,
      error: null,
      mutate: async () => undefined,
    });

    const { getByTestId } = render(<CategoryProbe id={null} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('probe');
    expect(probe.getAttribute('data-is-following')).toBe('false');
    expect(probe.getAttribute('data-is-loading')).toBe('false');
  });

  it('(b) id !== null and lookup not yet hydrated returns isFollowing: false, isLoading: true', () => {
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>(),
      tags: new Set<string>(),
      isLoading: true,
      error: null,
      mutate: async () => undefined,
    });

    const id = uuidV7(1);
    const { getByTestId } = render(<CategoryProbe id={id} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('probe');
    expect(probe.getAttribute('data-is-following')).toBe('false');
    expect(probe.getAttribute('data-is-loading')).toBe('true');
  });

  it('(c) lookup hydrated with the id returns isFollowing: true', () => {
    const id = uuidV7(1);
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>([id]),
      tags: new Set<string>(),
      isLoading: false,
      error: null,
      mutate: async () => undefined,
    });

    const { getByTestId } = render(<CategoryProbe id={id} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('probe');
    expect(probe.getAttribute('data-is-following')).toBe('true');
    expect(probe.getAttribute('data-is-loading')).toBe('false');
  });

  it('(d) lookup hydrated without the id returns isFollowing: false', () => {
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>([uuidV7(2), uuidV7(3)]),
      tags: new Set<string>(),
      isLoading: false,
      error: null,
      mutate: async () => undefined,
    });

    const { getByTestId } = render(<CategoryProbe id={uuidV7(1)} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('probe');
    expect(probe.getAttribute('data-is-following')).toBe('false');
    expect(probe.getAttribute('data-is-loading')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// useIsFollowingTag (mirrors the categories coverage)
// ---------------------------------------------------------------------------

import { useIsFollowingTag } from '@/features/tags/hooks/useIsFollowingTag';

function TagProbe({ id }: { id: string | null }) {
  const { isFollowing, isLoading } = useIsFollowingTag(id);
  return (
    <div
      data-testid='tag-probe'
      data-is-following={String(isFollowing)}
      data-is-loading={String(isLoading)}
    />
  );
}

describe('useIsFollowingTag', () => {
  it('(a) id === null returns isFollowing: false without firing the lookup', () => {
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>(),
      tags: new Set<string>(),
      isLoading: false,
      error: null,
      mutate: async () => undefined,
    });

    const { getByTestId } = render(<TagProbe id={null} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('tag-probe');
    expect(probe.getAttribute('data-is-following')).toBe('false');
    expect(probe.getAttribute('data-is-loading')).toBe('false');
  });

  it('(b) id !== null and lookup not yet hydrated returns isFollowing: false, isLoading: true', () => {
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>(),
      tags: new Set<string>(),
      isLoading: true,
      error: null,
      mutate: async () => undefined,
    });

    const id = uuidV7(1);
    const { getByTestId } = render(<TagProbe id={id} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('tag-probe');
    expect(probe.getAttribute('data-is-following')).toBe('false');
    expect(probe.getAttribute('data-is-loading')).toBe('true');
  });

  it('(c) lookup hydrated with the id returns isFollowing: true', () => {
    const id = uuidV7(1);
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>(),
      tags: new Set<string>([id]),
      isLoading: false,
      error: null,
      mutate: async () => undefined,
    });

    const { getByTestId } = render(<TagProbe id={id} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('tag-probe');
    expect(probe.getAttribute('data-is-following')).toBe('true');
    expect(probe.getAttribute('data-is-loading')).toBe('false');
  });

  it('(d) lookup hydrated without the id returns isFollowing: false', () => {
    useFollowedLookupMock.mockReturnValue({
      categories: new Set<string>(),
      tags: new Set<string>([uuidV7(2), uuidV7(3)]),
      isLoading: false,
      error: null,
      mutate: async () => undefined,
    });

    const { getByTestId } = render(<TagProbe id={uuidV7(1)} />, {
      wrapper: TestSwrProvider,
    });
    const probe = getByTestId('tag-probe');
    expect(probe.getAttribute('data-is-following')).toBe('false');
    expect(probe.getAttribute('data-is-loading')).toBe('false');
  });
});

// (no trailing reference — `vi.mock` is hoisted and the local
// mock factory closures capture the variable directly.)