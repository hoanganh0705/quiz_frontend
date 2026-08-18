

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useDeleteCategory } from '../useDeleteCategory';

const mockMutate = vi.hoisted(() => vi.fn());
const mockDeleteCategory = vi.hoisted(() => vi.fn());
const mockAddCategoryAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastCategoryAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({ mutate: mockMutate }));

vi.mock('@/features/admin/services/category-admin.service', () => ({
deleteCategory: mockDeleteCategory,
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

describe('useDeleteCategory', () => {
it('remove() resolves on success', async () => {
mockDeleteCategory.mockResolvedValue(undefined);

const { result } = renderHook(() => useDeleteCategory());

await expect(result.current.remove('cat-1')).resolves.toBeUndefined();
expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
  });

it('propagates CATEGORY_NOT_FOUND on failure', async () => {
mockDeleteCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 404,
data: { extensions: { code: 'CATEGORY_NOT_FOUND' } },
        },
      } as never),
    );

const { result } = renderHook(() => useDeleteCategory());

await expect(
result.current.remove('missing'),
    ).rejects.toBeInstanceOf(ApiError);
  });

it('emits audit breadcrumbs on success', async () => {
mockDeleteCategory.mockResolvedValue(undefined);

const { result } = renderHook(() => useDeleteCategory());

await result.current.remove('cat-1');

expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'category.delete',
status: 'started',
      }),
    );
expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'category.delete',
status: 'success',
targetId: 'cat-1',
      }),
    );
  });

it('emits audit breadcrumbs on failure', async () => {
mockDeleteCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 404,
data: {
extensions: {
code: 'CATEGORY_NOT_FOUND',
requestId: 'req-123',
            },
          },
        },
      } as never),
    );

const { result } = renderHook(() => useDeleteCategory());

await expect(result.current.remove('cat-1')).rejects.toBeDefined();

expect(mockAddCategoryAdminBreadcrumb).toHaveBeenCalledWith(
expect.objectContaining({
action: 'category.delete',
status: 'failure',
code: 'CATEGORY_NOT_FOUND',
requestId: 'req-123',
      }),
    );
  });

it('invalidates caches on success', async () => {
mockDeleteCategory.mockResolvedValue(undefined);

const { result } = renderHook(() => useDeleteCategory());

await result.current.remove('cat-1');

expect(mockMutate).toHaveBeenCalledWith('category-admin:list');
expect(mockMutate).toHaveBeenCalledWith(publicMatcher);
  });

it('broadcasts category admin invalidation on success', async () => {
mockDeleteCategory.mockResolvedValue(undefined);

const { result } = renderHook(() => useDeleteCategory());

await result.current.remove('cat-1');

expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith(
'delete',
'cat-1',
    );
  });

it('does not broadcast on failure', async () => {
mockDeleteCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 404,
data: { extensions: { code: 'CATEGORY_NOT_FOUND' } },
        },
      } as never),
    );

const { result } = renderHook(() => useDeleteCategory());

await expect(result.current.remove('cat-1')).rejects.toBeDefined();

expect(mockBroadcastCategoryAdminInvalidate).not.toHaveBeenCalled();
  });

it('exposes audit before/after snapshot', async () => {
mockDeleteCategory.mockResolvedValue(undefined);

const { result } = renderHook(() => useDeleteCategory());

expect(result.current.audit).toEqual({
beforeCategoryId: null,
afterCategoryId: null,
    });

await result.current.remove('cat-1');

await waitFor(() =>
expect(result.current.audit).toEqual({
beforeCategoryId: 'cat-1',
afterCategoryId: 'cat-1',
      }),
    );
  });

it('reset() clears error and audit snapshot', async () => {
mockDeleteCategory.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 500,
data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

const { result } = renderHook(() => useDeleteCategory());

await expect(result.current.remove('cat-1')).rejects.toBeDefined();

result.current.reset();
expect(result.current.error).toBeNull();
expect(result.current.isPending).toBe(false);
expect(result.current.audit).toEqual({
beforeCategoryId: null,
afterCategoryId: null,
    });
  });
});