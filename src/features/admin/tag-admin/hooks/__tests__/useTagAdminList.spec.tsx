/**
 * `__tests__/useTagAdminList.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C1.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import type { TagResponseDto } from '@/lib/api/generated/schemas';

import { useTagAdminList } from '../useTagAdminList';

// ─── Mock data ─────────────────────────────────────────────────────────────

const makeTag = (overrides: Partial<TagResponseDto> = {}): TagResponseDto =>
  ({
    tagId: 'tag-1',
    name: 'JavaScript',
    slug: 'javascript',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as TagResponseDto);

// ─── Service mock ─────────────────────────────────────────────────────────

const mockListTags = vi.hoisted(() => vi.fn());

vi.mock('@/features/tags/services/tags.service', () => ({
  listTags: (...args: unknown[]) => mockListTags(...args),
}));

vi.mock('@/lib/api', () => ({
  ApiError: class extends Error {
    code = 'MOCK_ERROR';
    constructor() { super('mock'); }
  },
}));

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  mockListTags.mockReset();
});

// ─── Tests ──────────────────────────────────────────────────────────────────
// Each renderHook is wrapped in SWRConfig with a fresh Map() provider.
// This is the established project pattern (see useMyQuizzes.spec.tsx) and
// ensures SWR's in-memory cache is isolated per test, preventing bleed.

describe('useTagAdminList', () => {
  const render = () =>
    renderHook(() => useTagAdminList(), {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          {children}
        </SWRConfig>
      ),
    });

  it('splits active and soft-deleted rows by deletedAt', async () => {
    const listData: TagResponseDto[] = [
      makeTag({ tagId: 'tag-active', name: 'Active', slug: 'active' }),
      makeTag({
        tagId: 'tag-deleted',
        name: 'Deleted',
        slug: 'deleted',
        deletedAt: '2024-06-01T00:00:00.000Z' as never,
      }),
    ];

    mockListTags.mockResolvedValue({ data: listData });

    const { result } = render();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.active).toHaveLength(1);
    expect(result.current.active[0]!.tagId).toBe('tag-active');

    expect(result.current.softDeleted).toHaveLength(1);
    expect(result.current.softDeleted[0]!.tagId).toBe('tag-deleted');

    expect(result.current.all).toHaveLength(2);
  });

  it('treats rows with null deletedAt as active', async () => {
    const listData: TagResponseDto[] = [
      makeTag({ tagId: 'tag-1', deletedAt: null as never }),
      makeTag({ tagId: 'tag-2', deletedAt: null as never }),
    ];

    mockListTags.mockResolvedValue({ data: listData });

    const { result } = render();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.active).toHaveLength(2);
    expect(result.current.softDeleted).toHaveLength(0);
  });

  it('surfaces an error when the request fails', async () => {
    // Pass an object with a 'code' property so the hook's 'code' in error guard
    // correctly identifies it as an ApiError.
    mockListTags.mockRejectedValue(
      Object.assign(new Error('network failure'), { code: 'NETWORK_ERROR' }),
    );

    const { result } = render();

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.active).toEqual([]);
    expect(result.current.softDeleted).toEqual([]);
  });
});
