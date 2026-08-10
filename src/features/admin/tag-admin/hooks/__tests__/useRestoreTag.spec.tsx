/**
 * `__tests__/useRestoreTag.spec.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.C5.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useRestoreTag } from '../useRestoreTag';

const mockMutate = vi.hoisted(() => vi.fn());
const mockRestoreTag = vi.hoisted(() => vi.fn());
const mockAddTagAdminBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastTagAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({
  mutate: mockMutate,
}));

vi.mock('@/features/admin/services/tag-admin.service', () => ({
  restoreTag: mockRestoreTag,
}));

vi.mock('@/lib/admin/admin_live_sentry', () => ({
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

const restoredTag = {
  tagId: 'tag-deleted',
  name: 'Rust',
  slug: 'rust',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
};

describe('useRestoreTag', () => {
  it('restore() returns the restored tag on success', async () => {
    mockRestoreTag.mockResolvedValue(restoredTag);

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-deleted'),
    ).resolves.toMatchObject({ tagId: 'tag-deleted' });

    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('propagates TAG_SLUG_CONFLICT as ApiError', async () => {
    mockRestoreTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            extensions: {
              code: 'TAG_SLUG_CONFLICT',
              conflictingTagId: 'tag-other',
            },
          },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-deleted'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('propagates TAG_ALREADY_ACTIVE as ApiError', async () => {
    mockRestoreTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: 'TAG_ALREADY_ACTIVE' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-active'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('propagates TAG_RESTORE_INVARIANT as ApiError', async () => {
    mockRestoreTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: 'TAG_RESTORE_INVARIANT' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-deleted'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('emits audit breadcrumbs on success', async () => {
    mockRestoreTag.mockResolvedValue(restoredTag);

    const { result } = renderHook(() => useRestoreTag());

    await result.current.restore('tag-deleted');

    expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag.restore', status: 'started' }),
    );
    expect(mockAddTagAdminBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tag.restore', status: 'success' }),
    );
  });

  it('emits audit breadcrumbs on failure', async () => {
    mockRestoreTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: 'TAG_SLUG_CONFLICT' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-deleted'),
    ).rejects.toBeDefined();
  });

  it('invalidates caches on success', async () => {
    mockRestoreTag.mockResolvedValue(restoredTag);

    const { result } = renderHook(() => useRestoreTag());

    await result.current.restore('tag-deleted');

    expect(mockMutate).toHaveBeenCalledWith('tag-admin:list');
    expect(mockMutate).toHaveBeenCalledWith('tags:directory');
  });

  it('broadcasts tag admin invalidation on success', async () => {
    mockRestoreTag.mockResolvedValue(restoredTag);

    const { result } = renderHook(() => useRestoreTag());

    await result.current.restore('tag-deleted');

    expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith(
      'restore',
      'tag-deleted',
    );
  });

  it('does not broadcast on failure', async () => {
    mockRestoreTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { extensions: { code: 'TAG_ALREADY_ACTIVE' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-deleted'),
    ).rejects.toBeDefined();

    expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalled();
  });

  it('reset() clears error', async () => {
    mockRestoreTag.mockRejectedValue(
      new ApiError({
        isAxiosError: true,
        response: {
          status: 500,
          data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

    const { result } = renderHook(() => useRestoreTag());

    await expect(
      result.current.restore('tag-deleted'),
    ).rejects.toBeDefined();

    result.current.reset();
    expect(result.current.error).toBeNull();
  });
});
