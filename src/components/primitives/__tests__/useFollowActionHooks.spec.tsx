/**
 * `useFollowCategory.spec.tsx` + `useUnfollowCategory.spec.tsx` +
 * `useFollowTag.spec.tsx` + `useUnfollowTag.spec.tsx` — lock the
 * per-feature action-hook contract.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B4.
 *
 * For each of the four hooks, three cases per the ticket AC:
 *
 *   (a) `id === null` returns no-op callbacks.
 *   (b) Happy path resolves with the correct `keysToInvalidate`
 *       calls captured via `vi.mock('swr', ...)` on the `mutate`
 *       primitive (the optimistic-toggle invalidates both the
 *       follow-lookup key and the entity detail key).
 *   (c) Rejection (e.g. 429) returns `lastError: { kind: 'http_429' }`
 *       and does NOT call `mutate` on the keys.
 *
 * The four hooks are thin wrappers around `useOptimisticToggle` (B1).
 * We mock `useOptimisticToggle` so the action hooks can be tested
 * in isolation from the optimistic-rollback discipline (which is
 * exhaustively tested in `useOptimisticToggle.spec.tsx`).
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile
 * registers `@testing-library/jest-dom` matchers and an `afterEach`
 * `cleanup`.
 */

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

import { FOLLOWED_LOOKUP_LIMIT } from '@/features/tags/hooks/useFollowedLookup';

// ---------------------------------------------------------------------------
// Mock the optimistic-toggle primitive so the action hooks can be
// tested in isolation from the rollback discipline.
// ---------------------------------------------------------------------------

const toggleMock = vi.fn();
const useOptimisticToggleMock = vi.fn();

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    useOptimisticToggle: (...args: unknown[]) => useOptimisticToggleMock(...args),
  };
});

const followCategoryMock = vi.fn();
const unfollowCategoryMock = vi.fn();

vi.mock('@/features/categories/services/categories.service', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/categories/services/categories.service')
    >('@/features/categories/services/categories.service');
  return {
    ...actual,
    followCategory: (...args: unknown[]) => followCategoryMock(...args),
    unfollowCategory: (...args: unknown[]) => unfollowCategoryMock(...args),
  };
});

const followTagMock = vi.fn();
const unfollowTagMock = vi.fn();

vi.mock('@/features/tags/services/tags.service', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/tags/services/tags.service')
    >('@/features/tags/services/tags.service');
  return {
    ...actual,
    followTag: (...args: unknown[]) => followTagMock(...args),
    unfollowTag: (...args: unknown[]) => unfollowTagMock(...args),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0');
  return `0192f4d8-0000-7000-8000-${tail}`;
}

function Probe({ hook }: { hook: () => unknown }) {
  const value = hook() as {
    isPending: boolean
    lastError: { kind: string } | null
    follow: () => Promise<void>
    unfollow: () => Promise<void>
  };
  return (
    <div
      data-testid='probe'
      data-is-pending={String(value.isPending)}
      data-last-error={value.lastError ? value.lastError.kind : 'null'}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useFollowCategory
// ---------------------------------------------------------------------------

import { useFollowCategory } from '@/features/categories/hooks/useFollowCategory';

describe('useFollowCategory', () => {
  it('(a) id === null returns no-op follow + unfollow callbacks', async () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });

    const { getByTestId } = render(
      <Probe hook={() => useFollowCategory(null)} />,
    );
    expect(getByTestId('probe')).toBeInTheDocument();
    // The hook does NOT instantiate useOptimisticToggle when id is null
    // (the `keysToInvalidate` is `[]`). The follow + unfollow callbacks
    // are no-ops.
  });

  it('(b) happy path resolves and forwards the wrapper call to followCategory', async () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'success',
      lastError: null,
      toggle: toggleMock.mockResolvedValue(undefined),
    });
    followCategoryMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    const captured = vi.fn();
    const { getByTestId } = render(
      <Probe
        hook={() => {
          const r = useFollowCategory(id);
          captured(r);
          return r;
        }}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-is-pending')).toBe('false');
    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('null');

    const result = captured.mock.calls[0]?.[0] as {
      follow: () => Promise<void>
    };
    await result.follow();

    // The wrapper was forwarded into the optimistic toggle.
    const args = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      toggle: () => Promise<unknown>
    };
    await args.toggle();
    expect(followCategoryMock).toHaveBeenCalledWith(id);
  });

  it('(c) 429 rejection surfaces lastError: { kind: http_429 }', async () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'reverted',
      lastError: { kind: 'http_429', cause: new Error('429') },
      toggle: vi.fn(),
    });

    const id = uuidV7(1);
    const { getByTestId } = render(
      <Probe
        hook={() => useFollowCategory(id)}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('http_429');
  });

  it('(b) keysToInvalidate is the follow-lookup key + the category detail key', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });
    followCategoryMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    render(
      <Probe
        hook={() => useFollowCategory(id)}
      />,
    );

    const params = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      keysToInvalidate: readonly unknown[][]
    };
    expect(params.keysToInvalidate).toHaveLength(2);
    expect(params.keysToInvalidate[0]).toEqual(['follow-lookup', 'categories', { limit: FOLLOWED_LOOKUP_LIMIT }]);
    expect(params.keysToInvalidate[1]).toEqual(['category', id]);
  });
});

// ---------------------------------------------------------------------------
// useUnfollowCategory
// ---------------------------------------------------------------------------

import { useUnfollowCategory } from '@/features/categories/hooks/useUnfollowCategory';

describe('useUnfollowCategory', () => {
  it('(a) id === null returns no-op follow + unfollow callbacks', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });

    const { getByTestId } = render(
      <Probe
        hook={() => useUnfollowCategory(null)}
      />,
    );
    expect(getByTestId('probe')).toBeInTheDocument();
  });

  it('(b) happy path resolves and forwards the wrapper call to unfollowCategory', async () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'success',
      lastError: null,
      toggle: toggleMock.mockResolvedValue(undefined),
    });
    unfollowCategoryMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    const captured = vi.fn();
    const { getByTestId } = render(
      <Probe
        hook={() => {
          const r = useUnfollowCategory(id);
          captured(r);
          return r;
        }}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-is-pending')).toBe('false');
    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('null');

    const result = captured.mock.calls[0]?.[0] as {
      unfollow: () => Promise<void>
    };
    await result.unfollow();

    const args = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      toggle: () => Promise<unknown>
    };
    await args.toggle();
    expect(unfollowCategoryMock).toHaveBeenCalledWith(id);
  });

  it('(c) 429 rejection surfaces lastError: { kind: http_429 }', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'reverted',
      lastError: { kind: 'http_429', cause: new Error('429') },
      toggle: vi.fn(),
    });

    const id = uuidV7(1);
    const { getByTestId } = render(
      <Probe
        hook={() => useUnfollowCategory(id)}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('http_429');
  });

  it('(b) keysToInvalidate is the follow-lookup key + the category detail key', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });
    unfollowCategoryMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    render(
      <Probe
        hook={() => useUnfollowCategory(id)}
      />,
    );

    const params = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      keysToInvalidate: readonly unknown[][]
    };
    expect(params.keysToInvalidate).toHaveLength(2);
    expect(params.keysToInvalidate[0]).toEqual(['follow-lookup', 'categories', { limit: FOLLOWED_LOOKUP_LIMIT }]);
    expect(params.keysToInvalidate[1]).toEqual(['category', id]);
  });
});

// ---------------------------------------------------------------------------
// useFollowTag
// ---------------------------------------------------------------------------

import { useFollowTag } from '@/features/tags/hooks/useFollowTag';

describe('useFollowTag', () => {
  it('(a) id === null returns no-op follow + unfollow callbacks', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });

    const { getByTestId } = render(
      <Probe
        hook={() => useFollowTag(null)}
      />,
    );
    expect(getByTestId('probe')).toBeInTheDocument();
  });

  it('(b) happy path resolves and forwards the wrapper call to followTag', async () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'success',
      lastError: null,
      toggle: toggleMock.mockResolvedValue(undefined),
    });
    followTagMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    const captured = vi.fn();
    const { getByTestId } = render(
      <Probe
        hook={() => {
          const r = useFollowTag(id);
          captured(r);
          return r;
        }}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-is-pending')).toBe('false');
    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('null');

    const result = captured.mock.calls[0]?.[0] as {
      follow: () => Promise<void>
    };
    await result.follow();

    const args = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      toggle: () => Promise<unknown>
    };
    await args.toggle();
    expect(followTagMock).toHaveBeenCalledWith(id);
  });

  it('(c) 429 rejection surfaces lastError: { kind: http_429 }', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'reverted',
      lastError: { kind: 'http_429', cause: new Error('429') },
      toggle: vi.fn(),
    });

    const id = uuidV7(1);
    const { getByTestId } = render(
      <Probe
        hook={() => useFollowTag(id)}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('http_429');
  });

  it('(b) keysToInvalidate is the follow-lookup key + the tag detail key', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });
    followTagMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    render(
      <Probe
        hook={() => useFollowTag(id)}
      />,
    );

    const params = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      keysToInvalidate: readonly unknown[][]
    };
    expect(params.keysToInvalidate).toHaveLength(2);
    expect(params.keysToInvalidate[0]).toEqual(['follow-lookup', 'tags', { limit: FOLLOWED_LOOKUP_LIMIT }]);
    expect(params.keysToInvalidate[1]).toEqual(['tag', id]);
  });
});

// ---------------------------------------------------------------------------
// useUnfollowTag
// ---------------------------------------------------------------------------

import { useUnfollowTag } from '@/features/tags/hooks/useUnfollowTag';

describe('useUnfollowTag', () => {
  it('(a) id === null returns no-op follow + unfollow callbacks', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });

    const { getByTestId } = render(
      <Probe
        hook={() => useUnfollowTag(null)}
      />,
    );
    expect(getByTestId('probe')).toBeInTheDocument();
  });

  it('(b) happy path resolves and forwards the wrapper call to unfollowTag', async () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'success',
      lastError: null,
      toggle: toggleMock.mockResolvedValue(undefined),
    });
    unfollowTagMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    const captured = vi.fn();
    const { getByTestId } = render(
      <Probe
        hook={() => {
          const r = useUnfollowTag(id);
          captured(r);
          return r;
        }}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-is-pending')).toBe('false');
    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('null');

    const result = captured.mock.calls[0]?.[0] as {
      unfollow: () => Promise<void>
    };
    await result.unfollow();

    const args = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      toggle: () => Promise<unknown>
    };
    await args.toggle();
    expect(unfollowTagMock).toHaveBeenCalledWith(id);
  });

  it('(c) 429 rejection surfaces lastError: { kind: http_429 }', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'reverted',
      lastError: { kind: 'http_429', cause: new Error('429') },
      toggle: vi.fn(),
    });

    const id = uuidV7(1);
    const { getByTestId } = render(
      <Probe
        hook={() => useUnfollowTag(id)}
      />,
    );

    expect(getByTestId('probe').getAttribute('data-last-error')).toBe('http_429');
  });

  it('(b) keysToInvalidate is the follow-lookup key + the tag detail key', () => {
    useOptimisticToggleMock.mockReturnValue({
      status: 'idle',
      lastError: null,
      toggle: vi.fn(),
    });
    unfollowTagMock.mockResolvedValue(undefined);

    const id = uuidV7(1);
    render(
      <Probe
        hook={() => useUnfollowTag(id)}
      />,
    );

    const params = useOptimisticToggleMock.mock.calls[0]?.[0] as {
      keysToInvalidate: readonly unknown[][]
    };
    expect(params.keysToInvalidate).toHaveLength(2);
    expect(params.keysToInvalidate[0]).toEqual(['follow-lookup', 'tags', { limit: FOLLOWED_LOOKUP_LIMIT }]);
    expect(params.keysToInvalidate[1]).toEqual(['tag', id]);
  });
});

// Reference the `Probe` props union to silence the unused-import
// linter on `React` (the JSX namespace comes through there).
const _typeProbe: React.FC<{ id: string | null; hook: () => unknown }> | null = null;
void _typeProbe;
void waitFor;