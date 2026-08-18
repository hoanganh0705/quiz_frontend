

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useUpdateCategory } from '../useUpdateCategory';

const mockMutate = vi.hoisted(() => vi.fn());
const mockUpdateCategory = vi.hoisted(() => vi.fn());
const mockBroadcastCategoryAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({ mutate: mockMutate }));

vi.mock('@/features/admin/services/category-admin.service', () => ({
updateCategory: mockUpdateCategory,
}));

vi.mock('@/features/admin/category-admin/cache/category-cross-tab', () => ({
broadcastCategoryAdminInvalidate: mockBroadcastCategoryAdminInvalidate,
}));

afterEach(() => {
vi.restoreAllMocks();
mockMutate.mockClear();
mockBroadcastCategoryAdminInvalidate.mockClear();
});

const publicMatcher = expect.any(Function);

describe('useUpdateCategory', () => {
it('update() returns the updated category and clears isPending on success', async () => {
const updated = {
categoryId: 'cat-1',
name: 'Math (renamed)',
slug: 'mathematics',
description: null,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-02-01T00:00:00.000Z',
    };

mockUpdateCategory.mockResolvedValue(updated);

const { result } = renderHook(() => useUpdateCategory());

await expect(
result.current.update('cat-1', { name: 'Math (renamed)' }),
    ).resolves.toMatchObject({ categoryId: 'cat-1' });

expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
  });

it('propagates CATEGORY_SLUG_CONFLICT on rename', async () => {
mockUpdateCategory.mockRejectedValue(
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

const { result } = renderHook(() => useUpdateCategory());

await expect(
result.current.update('cat-1', { slug: 'taken' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

it('propagates CATEGORY_NOT_FOUND', async () => {
mockUpdateCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 404,
data: { extensions: { code: 'CATEGORY_NOT_FOUND' } },
        },
      } as never),
    );

const { result } = renderHook(() => useUpdateCategory());

await expect(
result.current.update('missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

it('invalidates admin, public, and per-slug caches on success when slug is supplied', async () => {
mockUpdateCategory.mockResolvedValue({
categoryId: 'cat-1',
name: 'Math',
slug: 'math-renamed',
description: null,
imageUrl: null,
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useUpdateCategory());

await result.current.update('cat-1', { slug: 'math-renamed' });

expect(mockMutate).toHaveBeenCalledWith('category-admin:list');
expect(mockMutate).toHaveBeenCalledWith(publicMatcher);
expect(mockMutate).toHaveBeenCalledWith('categories:slug:math-renamed');
  });

it('does not invalidate per-slug when slug is not supplied', async () => {
mockUpdateCategory.mockResolvedValue({
categoryId: 'cat-1',
name: 'Math',
slug: 'math',
description: null,
imageUrl: null,
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useUpdateCategory());

await result.current.update('cat-1', { name: 'Math' });

expect(mockMutate).toHaveBeenCalledWith('category-admin:list');
expect(mockMutate).toHaveBeenCalledWith(publicMatcher);
expect(mockMutate).not.toHaveBeenCalledWith('categories:slug:math');
  });

it('broadcasts category admin invalidation on success', async () => {
mockUpdateCategory.mockResolvedValue({
categoryId: 'cat-1',
name: 'Math',
slug: 'math',
description: null,
imageUrl: null,
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useUpdateCategory());

await result.current.update('cat-1', { name: 'Math' });

expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith(
'update',
'cat-1',
    );
  });

it('reset() clears the error', async () => {
mockUpdateCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 500,
data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

const { result } = renderHook(() => useUpdateCategory());

await expect(
result.current.update('cat-1', { name: 'X' }),
    ).rejects.toBeDefined();

result.current.reset();
expect(result.current.error).toBeNull();
expect(result.current.isPending).toBe(false);
  });
});