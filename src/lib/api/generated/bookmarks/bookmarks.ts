

import type {
AddBookmarkDto,
BookmarkControllerAddBookmark201,
BookmarkControllerAddBookmarksBulk200,
BookmarkControllerCreateCollection201,
BookmarkControllerGetBookmarkStatus200,
BookmarkControllerGetCollectionAnalytics200,
BookmarkControllerGetMyBookmarkStats200,
BookmarkControllerGetRecentBookmarks200,
BookmarkControllerGetRecentBookmarksParams,
BookmarkControllerListBookmarksInCollection200,
BookmarkControllerListCollections200,
BookmarkControllerMoveBookmark200,
BookmarkControllerRemoveBookmarksBulk200,
BookmarkControllerSearchBookmarks200,
BookmarkControllerSearchBookmarksParams,
BookmarkControllerUpdateBookmark200,
BookmarkControllerUpdateCollection200,
BulkAddBookmarksDto,
BulkRemoveBookmarksDto,
CreateCollectionDto,
MoveBookmarkDto,
UpdateBookmarkDto,
UpdateCollectionDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getBookmarks = () => {

const bookmarkControllerSearchBookmarks = (
params: BookmarkControllerSearchBookmarksParams,
 ) => {
return orvalCustomInstance<BookmarkControllerSearchBookmarks200>(
{url: `/api/v1/bookmarks/search`, method: 'GET',
params
    },
      );
    }

const bookmarkControllerGetRecentBookmarks = (
params?: BookmarkControllerGetRecentBookmarksParams,
 ) => {
return orvalCustomInstance<BookmarkControllerGetRecentBookmarks200>(
{url: `/api/v1/bookmarks/recent`, method: 'GET',
params
    },
      );
    }

const bookmarkControllerGetBookmarkStatus = (
quizId: string,
 ) => {
return orvalCustomInstance<BookmarkControllerGetBookmarkStatus200>(
{url: `/api/v1/bookmarks/quizzes/${quizId}/status`, method: 'GET'
    },
      );
    }

const bookmarkControllerListCollections = (

 ) => {
return orvalCustomInstance<BookmarkControllerListCollections200>(
{url: `/api/v1/bookmarks/collections`, method: 'GET'
    },
      );
    }

const bookmarkControllerCreateCollection = (
createCollectionDto: CreateCollectionDto,
 ) => {
return orvalCustomInstance<BookmarkControllerCreateCollection201>(
{url: `/api/v1/bookmarks/collections`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createCollectionDto
    },
      );
    }

const bookmarkControllerListBookmarksInCollection = (
collectionId: string,
 ) => {
return orvalCustomInstance<BookmarkControllerListBookmarksInCollection200>(
{url: `/api/v1/bookmarks/collections/${collectionId}`, method: 'GET'
    },
      );
    }

const bookmarkControllerUpdateCollection = (
collectionId: string,
updateCollectionDto: UpdateCollectionDto,
 ) => {
return orvalCustomInstance<BookmarkControllerUpdateCollection200>(
{url: `/api/v1/bookmarks/collections/${collectionId}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateCollectionDto
    },
      );
    }

const bookmarkControllerDeleteCollection = (
collectionId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/bookmarks/collections/${collectionId}`, method: 'DELETE'
    },
      );
    }

const bookmarkControllerGetCollectionAnalytics = (
collectionId: string,
 ) => {
return orvalCustomInstance<BookmarkControllerGetCollectionAnalytics200>(
{url: `/api/v1/bookmarks/collections/${collectionId}/analytics`, method: 'GET'
    },
      );
    }

const bookmarkControllerAddBookmark = (
collectionId: string,
addBookmarkDto: AddBookmarkDto,
 ) => {
return orvalCustomInstance<BookmarkControllerAddBookmark201>(
{url: `/api/v1/bookmarks/collections/${collectionId}/quizzes`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: addBookmarkDto
    },
      );
    }

const bookmarkControllerAddBookmarksBulk = (
collectionId: string,
bulkAddBookmarksDto: BulkAddBookmarksDto,
 ) => {
return orvalCustomInstance<BookmarkControllerAddBookmarksBulk200>(
{url: `/api/v1/bookmarks/collections/${collectionId}/quizzes/bulk`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: bulkAddBookmarksDto
    },
      );
    }

const bookmarkControllerRemoveBookmarksBulk = (
collectionId: string,
bulkRemoveBookmarksDto: BulkRemoveBookmarksDto,
 ) => {
return orvalCustomInstance<BookmarkControllerRemoveBookmarksBulk200>(
{url: `/api/v1/bookmarks/collections/${collectionId}/quizzes/bulk`, method: 'DELETE',
headers: {'Content-Type': 'application/json', },
data: bulkRemoveBookmarksDto
    },
      );
    }

const bookmarkControllerRemoveBookmark = (
collectionId: string,
quizId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/bookmarks/collections/${collectionId}/quizzes/${quizId}`, method: 'DELETE'
    },
      );
    }

const bookmarkControllerUpdateBookmark = (
collectionId: string,
quizId: string,
updateBookmarkDto: UpdateBookmarkDto,
 ) => {
return orvalCustomInstance<BookmarkControllerUpdateBookmark200>(
{url: `/api/v1/bookmarks/collections/${collectionId}/quizzes/${quizId}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateBookmarkDto
    },
      );
    }

const bookmarkControllerMoveBookmark = (
collectionId: string,
moveBookmarkDto: MoveBookmarkDto,
 ) => {
return orvalCustomInstance<BookmarkControllerMoveBookmark200>(
{url: `/api/v1/bookmarks/collections/${collectionId}/move`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: moveBookmarkDto
    },
      );
    }

const bookmarkControllerGetMyBookmarkStats = (

 ) => {
return orvalCustomInstance<BookmarkControllerGetMyBookmarkStats200>(
{url: `/api/v1/bookmarks/me/stats`, method: 'GET'
    },
      );
    }
return {bookmarkControllerSearchBookmarks,bookmarkControllerGetRecentBookmarks,bookmarkControllerGetBookmarkStatus,bookmarkControllerListCollections,bookmarkControllerCreateCollection,bookmarkControllerListBookmarksInCollection,bookmarkControllerUpdateCollection,bookmarkControllerDeleteCollection,bookmarkControllerGetCollectionAnalytics,bookmarkControllerAddBookmark,bookmarkControllerAddBookmarksBulk,bookmarkControllerRemoveBookmarksBulk,bookmarkControllerRemoveBookmark,bookmarkControllerUpdateBookmark,bookmarkControllerMoveBookmark,bookmarkControllerGetMyBookmarkStats}};
export type BookmarkControllerSearchBookmarksResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerSearchBookmarks']>>>
export type BookmarkControllerGetRecentBookmarksResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerGetRecentBookmarks']>>>
export type BookmarkControllerGetBookmarkStatusResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerGetBookmarkStatus']>>>
export type BookmarkControllerListCollectionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerListCollections']>>>
export type BookmarkControllerCreateCollectionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerCreateCollection']>>>
export type BookmarkControllerListBookmarksInCollectionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerListBookmarksInCollection']>>>
export type BookmarkControllerUpdateCollectionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerUpdateCollection']>>>
export type BookmarkControllerDeleteCollectionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerDeleteCollection']>>>
export type BookmarkControllerGetCollectionAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerGetCollectionAnalytics']>>>
export type BookmarkControllerAddBookmarkResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerAddBookmark']>>>
export type BookmarkControllerAddBookmarksBulkResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerAddBookmarksBulk']>>>
export type BookmarkControllerRemoveBookmarksBulkResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerRemoveBookmarksBulk']>>>
export type BookmarkControllerRemoveBookmarkResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerRemoveBookmark']>>>
export type BookmarkControllerUpdateBookmarkResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerUpdateBookmark']>>>
export type BookmarkControllerMoveBookmarkResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerMoveBookmark']>>>
export type BookmarkControllerGetMyBookmarkStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getBookmarks>['bookmarkControllerGetMyBookmarkStats']>>>
