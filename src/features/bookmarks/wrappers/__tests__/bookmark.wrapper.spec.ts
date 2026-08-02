/**
 * `bookmark.wrapper.spec.ts` — locks the bookmark wrapper contract.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.A2.
 *
 * Five cases per the ticket AC #1–6:
 *
 *   (a) `listCollections` is a thin pass-through to the SDK.
 *   (b) `listBookmarksInCollection` is a thin pass-through to the SDK.
 *   (c) `getBookmarkStatus` is a thin pass-through to the SDK.
 *   (d) `addBookmark` and `removeBookmark` are thin pass-throughs to the SDK.
 *   (e) Generated SDK failures propagate unchanged as `ApiError`.
 *
 * Test-environment notes: the file lives under
 * src/features/bookmarks/wrappers/__tests__/. The vitest.config.ts
 * node project picks up the pattern src/** /__tests__/*.spec.ts;
 * no jsdom setup is needed (the wrapper functions are pure
 * module-level pass-throughs).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  addBookmark,
  getBookmarkStatus,
  listBookmarksInCollection,
  listCollections,
  removeBookmark,
} from '@/features/bookmarks/wrappers/bookmark.wrapper';
import { ApiError } from '@/lib/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const bookmarkControllerListCollectionsMock = vi.fn();
const bookmarkControllerListBookmarksInCollectionMock = vi.fn();
const bookmarkControllerGetBookmarkStatusMock = vi.fn();
const bookmarkControllerAddBookmarkMock = vi.fn();
const bookmarkControllerRemoveBookmarkMock = vi.fn();

vi.mock('@/lib/api/generated/bookmarks/bookmarks', () => ({
  getBookmarks: () => ({
    bookmarkControllerListCollections: bookmarkControllerListCollectionsMock,
    bookmarkControllerListBookmarksInCollection:
      bookmarkControllerListBookmarksInCollectionMock,
    bookmarkControllerGetBookmarkStatus: bookmarkControllerGetBookmarkStatusMock,
    bookmarkControllerAddBookmark: bookmarkControllerAddBookmarkMock,
    bookmarkControllerRemoveBookmark: bookmarkControllerRemoveBookmarkMock,
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) listCollections
// ---------------------------------------------------------------------------

describe('bookmark.wrapper — listCollections', () => {
  it('(a) is a thin pass-through that calls bookmarkControllerListCollections with no params', async () => {
    const expected = {
      data: {
        items: [
          {
            collectionId: '0192f4d8-0000-7000-8000-000000000001',
            userId: '0192f4d8-0000-7000-8000-000000000002',
            name: 'Favourites',
            description: null,
            quizCount: 3,
            createdAt: '2026-07-01T00:00:00.000Z',
            updatedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      },
    };
    bookmarkControllerListCollectionsMock.mockResolvedValue(expected);

    const result = await listCollections();

    expect(bookmarkControllerListCollectionsMock).toHaveBeenCalledTimes(1);
    expect(bookmarkControllerListCollectionsMock).toHaveBeenCalledWith(undefined);
    expect(result).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// (b) listBookmarksInCollection
// ---------------------------------------------------------------------------

describe('bookmark.wrapper — listBookmarksInCollection', () => {
  it('(b) is a thin pass-through that forwards collectionId and optional params', async () => {
    const expected = {
      data: {
        items: [
          {
            bookmarkId: '0192f4d8-0000-7000-8000-000000000003',
            quizId: '0192f4d8-0000-7000-8000-000000000010',
            quizTitle: 'Science 101',
            quizSlug: 'science-101',
            quizImageUrl: null,
            quizIsFeatured: false,
            notes: null,
            bookmarkedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      },
    };
    bookmarkControllerListBookmarksInCollectionMock.mockResolvedValue(expected);

    const params = { cursor: 'abc', limit: 50 };
    const result = await listBookmarksInCollection(
      '0192f4d8-0000-7000-8000-000000000001',
      params,
    );

    expect(bookmarkControllerListBookmarksInCollectionMock).toHaveBeenCalledTimes(1);
    expect(bookmarkControllerListBookmarksInCollectionMock).toHaveBeenCalledWith(
      '0192f4d8-0000-7000-8000-000000000001',
      params,
    );
    expect(result).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// (c) getBookmarkStatus
// ---------------------------------------------------------------------------

describe('bookmark.wrapper — getBookmarkStatus', () => {
  it('(c) is a thin pass-through that forwards quizId to the SDK', async () => {
    const expected = {
      bookmarked: true,
      collections: [
        { collectionId: '0192f4d8-0000-7000-8000-000000000001', name: 'Favourites' },
      ],
    };
    bookmarkControllerGetBookmarkStatusMock.mockResolvedValue(expected);

    const result = await getBookmarkStatus('0192f4d8-0000-7000-8000-000000000010');

    expect(bookmarkControllerGetBookmarkStatusMock).toHaveBeenCalledTimes(1);
    expect(bookmarkControllerGetBookmarkStatusMock).toHaveBeenCalledWith(
      '0192f4d8-0000-7000-8000-000000000010',
    );
    expect(result).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// (d) addBookmark + removeBookmark
// ---------------------------------------------------------------------------

describe('bookmark.wrapper — addBookmark', () => {
  it('(d1) forwards collectionId and { quizId } exactly once', async () => {
    const expected = {
      bookmarkId: '0192f4d8-0000-7000-8000-000000000003',
      collectionId: '0192f4d8-0000-7000-8000-000000000001',
      quizId: '0192f4d8-0000-7000-8000-000000000010',
      notes: null,
      bookmarkedAt: '2026-07-01T00:00:00.000Z',
    };
    bookmarkControllerAddBookmarkMock.mockResolvedValue(expected);

    const result = await addBookmark(
      '0192f4d8-0000-7000-8000-000000000001',
      { quizId: '0192f4d8-0000-7000-8000-000000000010' },
    );

    expect(bookmarkControllerAddBookmarkMock).toHaveBeenCalledTimes(1);
    expect(bookmarkControllerAddBookmarkMock).toHaveBeenCalledWith(
      '0192f4d8-0000-7000-8000-000000000001',
      { quizId: '0192f4d8-0000-7000-8000-000000000010' },
    );
    expect(result).toBe(expected);
  });
});

describe('bookmark.wrapper — removeBookmark', () => {
  it('(d2) forwards collectionId and quizId exactly once', async () => {
    bookmarkControllerRemoveBookmarkMock.mockResolvedValue(undefined);

    await removeBookmark(
      '0192f4d8-0000-7000-8000-000000000001',
      '0192f4d8-0000-7000-8000-000000000010',
    );

    expect(bookmarkControllerRemoveBookmarkMock).toHaveBeenCalledTimes(1);
    expect(bookmarkControllerRemoveBookmarkMock).toHaveBeenCalledWith(
      '0192f4d8-0000-7000-8000-000000000001',
      '0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

// ---------------------------------------------------------------------------
// (e) ApiError propagation
// ---------------------------------------------------------------------------

describe('bookmark.wrapper — ApiError propagation', () => {
  it('(e) propagates generated failures unchanged', async () => {
    // The wrapper does NOT interpret 4xx / 5xx — failures from the
    // SDK pass through to the caller. We use a real `ApiError` to
    // mirror the wire path; the wrapper must not swallow it.
    const apiError = new ApiError({
      config: undefined,
      request: undefined,
      response: undefined,
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Bookmark conflict',
      code: 'BOOKMARK_CONFLICT',
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

    bookmarkControllerAddBookmarkMock.mockRejectedValue(apiError);

    await expect(
      addBookmark('0192f4d8-0000-7000-8000-000000000001', {
        quizId: '0192f4d8-0000-7000-8000-000000000010',
      }),
    ).rejects.toBe(apiError);
  });
});