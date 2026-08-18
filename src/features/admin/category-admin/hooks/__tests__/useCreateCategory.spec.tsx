

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useCreateCategory } from '../useCreateCategory';

const mockMutate = vi.hoisted(() => vi.fn());
const mockCreateCategory = vi.hoisted(() => vi.fn());
const mockBroadcastCategoryAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({ mutate: mockMutate }));

vi.mock('@/features/admin/services/category-admin.service', () => ({
createCategory: mockCreateCategory,
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

describe('useCreateCategory', () => {
it('create() returns the new category and clears isPending on success', async () => {
const newCategory = {
categoryId: 'cat-new',
name: 'Rust',
slug: 'rust',
description: null,
imageUrl: null,
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
    };

mockCreateCategory.mockResolvedValue(newCategory);

const { result } = renderHook(() => useCreateCategory());

await expect(
result.current.create({ name: 'Rust' }),
    ).resolves.toMatchObject({ categoryId: 'cat-new' });

expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
  });

it('propagates CATEGORY_SLUG_CONFLICT as ApiError', async () => {
mockCreateCategory.mockRejectedValue(
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

const { result } = renderHook(() => useCreateCategory());

await expect(
result.current.create({ name: 'Rust', slug: 'taken' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

it('reset() clears the error', async () => {
mockCreateCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 500,
data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

const { result } = renderHook(() => useCreateCategory());

await expect(result.current.create({ name: 'Rust' })).rejects.toBeDefined();

result.current.reset();
expect(result.current.error).toBeNull();
  });

it('invalidates admin and public SWR caches on success', async () => {
mockCreateCategory.mockResolvedValue({
categoryId: 'cat-1',
name: 'Rust',
slug: 'rust',
description: null,
imageUrl: null,
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useCreateCategory());

await result.current.create({ name: 'Rust' });

expect(mockMutate).toHaveBeenCalledWith('category-admin:list');
expect(mockMutate).toHaveBeenCalledWith(publicMatcher);
  });

it('broadcasts category admin invalidation on success', async () => {
mockCreateCategory.mockResolvedValue({
categoryId: 'cat-1',
name: 'Rust',
slug: 'rust',
description: null,
imageUrl: null,
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useCreateCategory());

await result.current.create({ name: 'Rust' });

expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith(
'create',
'cat-1',
    );
  });

it('does not broadcast on failure', async () => {
mockCreateCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 409,
data: { extensions: { code: 'CATEGORY_SLUG_CONFLICT' } },
        },
      } as never),
    );

const { result } = renderHook(() => useCreateCategory());

await expect(
result.current.create({ name: 'Rust' }),
    ).rejects.toBeInstanceOf(ApiError);

expect(mockBroadcastCategoryAdminInvalidate).not.toHaveBeenCalled();
  });
});