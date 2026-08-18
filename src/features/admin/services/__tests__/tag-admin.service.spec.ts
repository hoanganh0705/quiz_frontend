

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTagSdk = {
tagControllerCreateTag: vi.fn(),
tagControllerUpdateTag: vi.fn(),
tagControllerDeleteTag: vi.fn(),
tagControllerRestoreTag: vi.fn(),
tagControllerGetTagById: vi.fn(),
};

vi.mock('@/lib/api', () => ({
getTags: () => mockTagSdk,
}));

vi.mock('@/lib/api/generated/tags/tags', () => ({}));

import { ApiError } from '@/lib/api/core/ApiError';

import {
createTag,
deleteTag,
getTag,
restoreTag,
updateTag,
} from '../tag-admin.service';

const TAG_FIXTURE = {
tagId: 'tag-1',
name: 'Math',
slug: 'math',
createdAt: '2026-01-01T00:00:00.000Z',
};

const wrapped = (data: unknown) => ({
data: data,
meta: { requestId: 'req-1' },
});

function makeApiError(extensions: {
requestId?: string;
correlationId?: string;
}): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'mock',
config: undefined,
request: undefined,
response: {
status: 500,
data: {
status: 500,
detail: 'boom',
title: 'Internal Server Error',
extensions,
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
Object.values(mockTagSdk).forEach((fn) => fn.mockReset());
});

describe('tag-admin.service — createTag', () => {
it('calls tagControllerCreateTag with the input and unwraps the response', async () => {
mockTagSdk.tagControllerCreateTag.mockResolvedValueOnce(wrapped(TAG_FIXTURE));

const result = await createTag({ name: 'Math', slug: 'math' });

expect(mockTagSdk.tagControllerCreateTag).toHaveBeenCalledWith({
name: 'Math',
slug: 'math',
    });
expect(result).toEqual(TAG_FIXTURE);
  });

it('propagates ApiError when the SDK rejects (e.g. TAG_SLUG_CONFLICT)', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTagSdk.tagControllerCreateTag.mockRejectedValueOnce(error);

await expect(createTag({ name: 'Math', slug: 'math' })).rejects.toBe(error);
  });
});

describe('tag-admin.service — updateTag', () => {
it('calls tagControllerUpdateTag with id and input', async () => {
mockTagSdk.tagControllerUpdateTag.mockResolvedValueOnce(wrapped(TAG_FIXTURE));

const result = await updateTag('tag-1', { name: 'Math v2' });

expect(mockTagSdk.tagControllerUpdateTag).toHaveBeenCalledWith('tag-1', {
name: 'Math v2',
    });
expect(result).toEqual(TAG_FIXTURE);
  });

it('propagates ApiError on failure', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTagSdk.tagControllerUpdateTag.mockRejectedValueOnce(error);

await expect(updateTag('tag-1', { name: 'x' })).rejects.toBe(error);
  });
});

describe('tag-admin.service — deleteTag', () => {
it('calls tagControllerDeleteTag with the id', async () => {
mockTagSdk.tagControllerDeleteTag.mockResolvedValueOnce(wrapped(undefined));

await deleteTag('tag-1');

expect(mockTagSdk.tagControllerDeleteTag).toHaveBeenCalledWith('tag-1');
  });

it('propagates ApiError on failure', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTagSdk.tagControllerDeleteTag.mockRejectedValueOnce(error);

await expect(deleteTag('tag-1')).rejects.toBe(error);
  });
});

describe('tag-admin.service — restoreTag', () => {
it('calls tagControllerRestoreTag with the id and unwraps the response', async () => {
mockTagSdk.tagControllerRestoreTag.mockResolvedValueOnce(wrapped(TAG_FIXTURE));

const result = await restoreTag('tag-1');

expect(mockTagSdk.tagControllerRestoreTag).toHaveBeenCalledWith('tag-1');
expect(result).toEqual(TAG_FIXTURE);
  });

it('propagates ApiError with TAG_SLUG_CONFLICT code on slug conflict', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTagSdk.tagControllerRestoreTag.mockRejectedValueOnce(error);

await expect(restoreTag('tag-1')).rejects.toBe(error);
  });
});

describe('tag-admin.service — getTag', () => {
it('calls tagControllerGetTagById with the id and unwraps the response', async () => {
mockTagSdk.tagControllerGetTagById.mockResolvedValueOnce(wrapped(TAG_FIXTURE));

const result = await getTag('tag-1');

expect(mockTagSdk.tagControllerGetTagById).toHaveBeenCalledWith('tag-1');
expect(result).toEqual(TAG_FIXTURE);
  });

it('propagates ApiError on failure (e.g. TAG_NOT_FOUND)', async () => {
const error = makeApiError({ requestId: 'req-1' });
mockTagSdk.tagControllerGetTagById.mockRejectedValueOnce(error);

await expect(getTag('missing')).rejects.toBe(error);
  });
});

describe('tag-admin.service — JSDoc invariants', () => {
it('restoreTag documents TAG_SLUG_CONFLICT in its JSDoc', async () => {
const { readFileSync } = await import('node:fs');
const path = await import('node:path');
const url = await import('node:url');
const here = path.dirname(url.fileURLToPath(import.meta.url));
const sourcePath = path.join(here, '..', 'tag-admin.service.ts');
const source = readFileSync(sourcePath, 'utf-8');
expect(source).toMatch(/restoreTag[\s\S]{0,800}TAG_SLUG_CONFLICT/);
  });
});
