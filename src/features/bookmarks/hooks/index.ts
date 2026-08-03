// Bookmarks hooks
export { useBookmarks, useBookmarkedQuizzes } from './use-bookmarks'
export { useBookmarksPage } from './use-bookmarks-page'

// Story 3.10 / TKT-3.10.B1 — the auth-gated SWR-backed read of the
// authenticated user's bookmark collection summaries. The hook is
// the source-of-truth read consumed by `useDefaultCollectionId` (B2),
// `useBookmarkedQuizIds` (B3), and the mutation action hooks (C1, C2).
export {
  useBookmarkCollections,
  bookmarkCollectionsKey,
} from './use-bookmark-collections'
export type { UseBookmarkCollectionsResult } from './use-bookmark-collections'

// Story 3.10 / TKT-3.10.B2 — the deterministic default-collection
// selector used by the bookmark-add action hook.
export {
  useDefaultCollectionId,
  selectDefaultCollectionId,
} from './use-default-collection-id'
export type { UseDefaultCollectionIdResult } from './use-default-collection-id'

// Story 3.10 / TKT-3.10.B3 — the SWR-backed membership cache shared
// by every consumer of `useIsBookmarked` (B4) and the cross-tab
// invalidator (F3).
export {
  useBookmarkedQuizIds,
  bookmarkedQuizIdsKey,
} from './use-bookmarked-quiz-ids'
export type { UseBookmarkedQuizIdsResult } from './use-bookmarked-quiz-ids'

// Story 3.10 / TKT-3.10.C1 — the optimistic add-bookmark action hook.
// Wraps `useOptimisticToggle` (Story 3.9 B1) and adds the optimistic
// membership write + 409 reconciliation + `no_collection` outcome.
export { useBookmarkQuiz } from './use-bookmark-quiz'
export type {
  BookmarkMutationOutcome,
  BookmarkMutationOutcomeKind,
  UseBookmarkQuizResult,
} from './use-bookmark-quiz'

// Story 3.10 / TKT-3.10.C2 — the optimistic remove-bookmark action
// hook. Resolves the applicable owned collection from the targeted
// status response so multi-collection membership reconciles correctly.
export { useUnbookmarkQuiz } from './use-unbookmark-quiz'
export type {
  UseUnbookmarkQuizResult,
} from './use-unbookmark-quiz'

// Epic 4.6 / T-4.6-B1 — cursor-paginated collections list with Map-based lookup.
export {
  useCollections,
  invalidateCollections,
  BOOKMARK_COLLECTIONS_KEY,
} from './useCollections'
export type { UseCollectionsResult } from './useCollections'

// Epic 4.6 / T-4.6-B2 — single collection fetch by ID.
export {
  useCollection,
  bookmarkCollectionKey,
} from './useCollection'
export type { UseCollectionResult } from './useCollection'

// Epic 4.6 / T-4.6-B3 — optimistic collection creation with 409 conflict handling.
export { useCreateCollection } from './useCreateCollection'
export type {
  UseCreateCollectionOptions,
  UseCreateCollectionReturn,
} from './useCreateCollection'

// Epic 4.6 / T-4.6-B4 (update) — optimistic collection update with partial PATCH.
export { useUpdateCollection } from './useUpdateCollection'
export type {
  UseUpdateCollectionOptions,
  UseUpdateCollectionReturn,
} from './useUpdateCollection'

// Epic 4.6 / T-4.6-B4 (delete) — optimistic collection deletion with 404 mute.
export { useDeleteCollection } from './useDeleteCollection'
export type {
  UseDeleteCollectionOptions,
  UseDeleteCollectionReturn,
} from './useDeleteCollection'
