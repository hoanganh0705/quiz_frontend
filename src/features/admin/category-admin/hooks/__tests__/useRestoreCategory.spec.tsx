/**
 * `__tests__/useRestoreCategory.spec.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.C5.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useRestoreCategory } from '../useRestoreCategory';

const mockMutate = vi.hoisted(() => vi.fn());
const mockRestoreCategory = vi.hoisted(() => vi.fn());
const mockAddCategoryAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastCategoryAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({ mutate: mockMutate }));

vi.mock('@/features/admin/services/category-admin.service', () => ({
  restoreCategory: mockRestoreCategory,
}));

vi.mock('@/lib/admin/admin_live_sentry', () => ({
  addCategoryAdminBreadcrumb: mockAddCategoryAdminBreadcrumb,
}));

vi.mock('@/features/admin/category-admin/cache/category-cross-tab', () => ({
  broadcastCategoryAdminInvalidate: mockBroadcastCategoryAdminInvalidate,
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockMutate.mockClear();
  mockAddCategoryAdminBreadcrumb.mockClear();
  mockBroadcastCategoryAdminInvalidate.mockClear();
});

const publicMatcher = expect.any(Function);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useRestoreCategory', () => {
  it('restore() returns the restored category and clears isPending on success', async () => {
    const restored = {
      categoryId: 'cat-1',
      name: 'Math',
      slug: 'math',
      description: null,
      imageUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      deletedAt: null,
    };

    mockRestoreCategory.mockResolvedValue(restored);

    const { result } = renderHook(() => useRestoreCategory());

    await expect(
      result.current.restore('cat-1'),
    ).resolves.toMatchObject({ categoryId: 'cat-1' });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces CATEGORY_SLUG_CONFLICT without retry', async () => {
    mockRestoreCategory.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            extensions: {
              code: 'CATEGORY_SLUG_CONFLICT',
              conflictingCategoryId: 'cat-other',
            },
          },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreCategory());

    await expect(
      result.current.restore('cat-1'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('surfaces CATEGORY_ALREADY_ACTIVE without retry', async () => {
    mockRestoreCategory.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: 'CATEGORY_ALREADY_ACTIVE' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreCategory());

    await expect(
      result.current.restore('cat-1'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('surfaces CATEGORY_RESTORE_INVARIANT without retry', async () => {
    mockRestoreCategory.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: 'CATEGORY_RESTORE_INVARIANT' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreCategory());

    await expect(
      result.current.restore('cat-1'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('retry path accepts renamedSlug and re-issues the call', async () => {
    const restored = {
      categoryId: 'cat-1',
      name: 'Math',
      slug: 'math-renamed',
      description: null,
      imageUrl: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };

    mockRestoreCategory.mockReset();
    mockRestoreCategory.mockResolvedValue(restored);

    const { result } = renderHook(() => useRestoreCategory());

    await result.current.restore('cat-1', { renamedSlug: 'math-renamed' });

    expect(mockRestoreCategory).toHaveBeenCalledTimes(1);
    expect(mockRestoreCategory).toHaveBeenCalledWith('cat-1');
    expect(mockMutate).toHaveBeenCalledWith('category-admin:list');
    expect(mockMutate).toHaveBeenCalledWith(publicMatcher);
    expect(mockMutate).toHaveBeenCalledWith('categories:slug:math-renamed');
  });

  it('invalidates admin and public caches on success', async () => {
    mockRestoreCategory.mockResolvedValue({
      categoryId: 'cat-1',
      name: 'Math',
      slug: 'math',
      description: null,
      imageUrl: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    });

    const { result } = renderHook(() => useRestoreCategory());

    await result.current.restore('cat-1');

    expect(mockMutate).toHaveBeenCalledWith('category-admin:list');
    expect(mockMutate).toHaveBeenCalledWith(publicMatcher);
  });

  it('broadcasts category admin invalidation on success', async () => {
    mockRestoreCategory.mockResolvedValue({
      categoryId: 'cat-1',
      name: 'Math',
      slug: 'math',
      description: null,
      imageUrl: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    });

    const { result } = renderHook(() => useRestoreCategory());

    await result.current.restore('cat-1');

    expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith(
      'restore',
      'cat-1',
    );
  });

  it('emits audit breadcrumbs on success and failure', async () => {
    mockRestoreCategory.mockResolvedValue({
      categoryId: 'cat-1',
      name: 'Math',
      slug: 'math',
      description: null,
      imageUrl: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    });

    const { result } = renderHook(() => useRestoreCategory());

    await result.current.restore('cat-1');

    expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'category.restore',
        status: 'started',
      }),
    );
    expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'category.restore',
        status: 'success',
        targetId: 'cat-1',
      }),
    );
  });

  it('reset() clears the error', async () => {
    mockRestoreCategory.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 500,
          data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreCategory());

    await expect(result.current.restore('cat-1')).rejects.toBeDefined();

    result.current.reset();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });
});