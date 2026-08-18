

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useUpdateTag } from '../useUpdateTag';

const mockMutate = vi.hoisted(() => vi.fn());
const mockUpdateTag = vi.hoisted(() => vi.fn());
const mockBroadcastTagAdminInvalidate = vi.hoisted(() => vi.fn());

vi.mock('swr', () => ({
mutate: mockMutate,
}));

vi.mock('@/features/admin/services/tag-admin.service', () => ({
updateTag: mockUpdateTag,
}));

vi.mock('@/features/admin/tag-admin/cache/tag-cross-tab', () => ({
broadcastTagAdminInvalidate: mockBroadcastTagAdminInvalidate,
}));

afterEach(() => {
vi.restoreAllMocks();
mockMutate.mockClear();
mockBroadcastTagAdminInvalidate.mockClear();
});

describe('useUpdateTag', () => {
it('update() returns the updated tag on success', async () => {
const updatedTag = {
tagId: 'tag-1',
name: 'TypeScript',
slug: 'typescript',
createdAt: '2024-01-01T00:00:00.000Z',
updatedAt: '2024-01-02T00:00:00.000Z',
    };

mockUpdateTag.mockResolvedValue(updatedTag);

const { result } = renderHook(() => useUpdateTag());

await expect(
result.current.update('tag-1', { name: 'TypeScript' }),
    ).resolves.toMatchObject({ tagId: 'tag-1', name: 'TypeScript' });

expect(result.current.isPending).toBe(false);
expect(result.current.error).toBeNull();
  });

it('propagates TAG_NOT_FOUND as ApiError', async () => {
mockUpdateTag.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 404,
data: { extensions: { code: 'TAG_NOT_FOUND' } },
        },
      } as never),
    );

const { result } = renderHook(() => useUpdateTag());

await expect(
result.current.update('missing', { name: 'Test' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

it('propagates TAG_SLUG_CONFLICT on rename', async () => {
mockUpdateTag.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 409,
data: { extensions: { code: 'TAG_SLUG_CONFLICT' } },
        },
      } as never),
    );

const { result } = renderHook(() => useUpdateTag());

await expect(
result.current.update('tag-1', { slug: 'taken' }),
    ).rejects.toBeInstanceOf(ApiError);
  });

it('reset() clears the error', async () => {
mockUpdateTag.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 500,
data: { extensions: { code: 'GLOBAL_INTERNAL_ERROR' } },
        },
      } as never),
    );

const { result } = renderHook(() => useUpdateTag());

await expect(
result.current.update('tag-1', { name: 'Test' }),
    ).rejects.toBeDefined();

result.current.reset();
expect(result.current.error).toBeNull();
  });

it('invalidates admin and slug-specific caches on success with slug change', async () => {
mockUpdateTag.mockResolvedValue({
tagId: 'tag-1',
name: 'TS',
slug: 'ts-new',
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useUpdateTag());

await result.current.update('tag-1', { slug: 'ts-new' });

expect(mockMutate).toHaveBeenCalledWith('tag-admin:list');
expect(mockMutate).toHaveBeenCalledWith('tags:slug:ts-new');
  });

it('broadcasts tag admin invalidation on success', async () => {
mockUpdateTag.mockResolvedValue({
tagId: 'tag-1',
name: 'TS',
slug: 'ts-new',
createdAt: '',
updatedAt: '',
    });

const { result } = renderHook(() => useUpdateTag());

await result.current.update('tag-1', { slug: 'ts-new' });

expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('update', 'tag-1');
  });

it('does not broadcast on failure', async () => {
mockUpdateTag.mockRejectedValue(
new ApiError({
isAxiosError: true,
response: {
status: 409,
data: { extensions: { code: 'TAG_SLUG_CONFLICT' } },
        },
      } as never),
    );

const { result } = renderHook(() => useUpdateTag());

await expect(
result.current.update('tag-1', { slug: 'taken' }),
    ).rejects.toBeInstanceOf(ApiError);

expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalled();
  });
});
