

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
addBookmarksBulk,
createCollection,
deleteCollection,
removeBookmarksBulk,
} from '@/features/bookmarks/services/bookmarks.service';

const bookmarkControllerCreateCollectionMock = vi.fn();
const bookmarkControllerDeleteCollectionMock = vi.fn();
const bookmarkControllerAddBookmarksBulkMock = vi.fn();
const bookmarkControllerRemoveBookmarksBulkMock = vi.fn();

vi.mock('@/lib/api', async () => {
const actual =
await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
return {
...actual,
getBookmarks: () => ({
bookmarkControllerCreateCollection: bookmarkControllerCreateCollectionMock,
bookmarkControllerDeleteCollection: bookmarkControllerDeleteCollectionMock,
bookmarkControllerAddBookmarksBulk: bookmarkControllerAddBookmarksBulkMock,
bookmarkControllerRemoveBookmarksBulk:
bookmarkControllerRemoveBookmarksBulkMock,
    }),
  };
});

afterEach(() => {
vi.clearAllMocks();
});

describe('bookmarks.service — pass-through', () => {
it('createCollection forwards the payload and returns the SDK result', async () => {
const expected = {
collectionId: '0192f4d8-0000-7000-8000-000000000001',
userId: '0192f4d8-0000-7000-8000-000000000002',
name: 'Favourites',
description: null,
quizCount: 0,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
    };
bookmarkControllerCreateCollectionMock.mockResolvedValue(expected);

const result = await createCollection({
name: 'Favourites',
    } as Parameters<typeof createCollection>[0]);

expect(bookmarkControllerCreateCollectionMock).toHaveBeenCalledTimes(1);
expect(result).toBe(expected);
  });
});

describe('bookmarks.service — ApiError propagation', () => {
it('deleteCollection propagates a 404 BOOKMARK_COLLECTION_NOT_FOUND as ApiError', async () => {
const apiError = new ApiError({
name: 'AxiosError',
message: 'collection not found',
isAxiosError: true,
response: {
status: 404,
statusText: 'Not Found',
data: {
type: 'https://api.quiz.local/problems/not-found',
title: 'Not Found',
status: 404,
detail: 'Bookmark collection not found',
instance: '/api/v1/bookmarks/collections/missing',
extensions: {
code: 'BOOKMARK_COLLECTION_NOT_FOUND',
requestId: 'req-test',
          },
        },
headers: {},
config: undefined as never,
      },
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

bookmarkControllerDeleteCollectionMock.mockRejectedValue(apiError);

await expect(deleteCollection('missing')).rejects.toMatchObject({
code: 'BOOKMARK_COLLECTION_NOT_FOUND',
status: 404,
    });
  });
});

describe('bookmarks.service — bulk endpoints per-item shape', () => {
it('addBookmarksBulk returns the SDK bulk-count envelope', async () => {

const expected = {
data: { addedCount: 3 },
    };
bookmarkControllerAddBookmarksBulkMock.mockResolvedValue(expected);

const result = await addBookmarksBulk('c1', {
quizIds: [],
    } as Parameters<typeof addBookmarksBulk>[1]);

expect(result).toBe(expected);
expect(result.data?.addedCount).toBe(3);
  });

it('removeBookmarksBulk returns the SDK bulk-count envelope', async () => {
const expected = {
data: { removedCount: 2 },
    };
bookmarkControllerRemoveBookmarksBulkMock.mockResolvedValue(expected);

const result = await removeBookmarksBulk('c1', {
quizIds: [],
    } as Parameters<typeof removeBookmarksBulk>[1]);

expect(result).toBe(expected);
expect(result.data?.removedCount).toBe(2);
  });
});