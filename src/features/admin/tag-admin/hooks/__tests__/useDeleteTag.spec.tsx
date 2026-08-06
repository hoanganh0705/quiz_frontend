/**
 * `__tests__/useDeleteTag.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C4.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useDeleteTag } from '../useDeleteTag';

const mockMutate = vi.hoisted(() => vi.fn());
const mockDeleteTag = vi.hoisted(() => vi.fn());
const mockAddTagAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastTagAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({ mutate: mockMutate }));

vi.mock('@/features/admin/services/tag-admin.service', () => ({
  deleteTag: mockDeleteTag,
}));

vi.mock('@/lib/admin/phase7_admin_sentry', () => ({
  addTagAdminBreadcrumb: mockAddTagAdminBreadcrumb,
}));

vi.mock('@/features/admin/tag-admin/cache/tag-cross-tab', () => ({
  broadcastTagAdminInvalidate: mockBroadcastTagAdminInvalidate,
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockMutate.mockClear();
  mockAddTagAdminBreadcrumb.mockClear();
  mockBroadcastTagAdminInvalidate.mockClear();
});

describe('useDeleteTag', () => {
  it('remove() resolves on success', async () => {
    mockDeleteTag.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTag());

    await expect(result.current.remove('tag-1')).resolves.toBeUndefined();
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('propagates TAG_NOT_FOUND on failure', async () => {
    mockDeleteTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 404,
          data: { extensions: { code: 'TAG_NOT_FOUND' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useDeleteTag());

    await expect(result.current.remove('missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('emits audit breadcrumbs on success', async () => {
    mockDeleteTag.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTag());

    await result.current.remove('tag-1');

    expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag.delete', status: 'started' }),
    );
    expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag.delete', status: 'success' }),
    );
  });

  it('emits audit breadcrumbs on failure', async () => {
    mockDeleteTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 404,
          data: { extensions: { code: 'TAG_NOT_FOUND' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useDeleteTag());

    await expect(result.current.remove('tag-1')).rejects.toBeDefined();
  });

  it('invalidates caches on success', async () => {
    mockDeleteTag.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTag());

    await result.current.remove('tag-1');

    expect(mockMutate).toHaveBeenCalledWith('tag-admin:list');
    expect(mockMutate).toHaveBeenCalledWith('tags:directory');
  });

  it('broadcasts tag admin invalidation on success', async () => {
    mockDeleteTag.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTag());

    await result.current.remove('tag-1');

    expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('delete', 'tag-1');
  });

  it('does not broadcast on failure', async () => {
    mockDeleteTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 404,
          data: { extensions: { code: 'TAG_NOT_FOUND' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useDeleteTag());

    await expect(result.current.remove('tag-1')).rejects.toBeDefined();

    expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalled();
  });

  it('reset() clears error', async () => {
    mockDeleteTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 500,
          data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useDeleteTag());

    await expect(result.current.remove('tag-1')).rejects.toBeDefined();

    result.current.reset();
    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
  });
});
