// Bookmarks components - public API surface
export { default as BookmarkButton } from './BookmarkButton'
export { default as BookmarkedQuizCard } from './BookmarkedQuizCard'
export { default as BookmarkFilters } from './BookmarkFilters'
export { default as CollectionCard } from './CollectionCard'
export { default as CollectionDialog } from './CollectionDialog'
export { default as EmptyBookmarks } from './EmptyBookmarks'
export { default as CollectionGrid } from './CollectionGrid'
export { default as CollectionColorPicker } from './CollectionColorPicker'
export { default as CollectionCreateDialog } from './CollectionCreateDialog'
export { default as CollectionRenameDialog } from './CollectionRenameDialog'
export { default as CollectionDeleteConfirm } from './CollectionDeleteConfirm'
export { default as BookmarksDashboardPage } from './BookmarksDashboardPage'

// Story 3.10 / TKT-3.10.D3 — the reusable empty-collections content
// body used by the setup prompt (D2) and any future zero-collection
// surface.
export {
  default as BookmarksEmptyState,
  BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL,
  BOOKMARKS_NOT_NOW_LABEL,
} from './BookmarksEmptyState'
export type { BookmarksEmptyStateProps } from './BookmarksEmptyState'

// Story 3.10 / TKT-3.10.D2 — the controlled modal/dialog that wraps
// `<BookmarksEmptyState />`. Mounted by the slot (D4) when the
// mutation returns a `no_collection` outcome.
export { default as BookmarksSetupPrompt } from './BookmarksSetupPrompt'
export type { BookmarksSetupPromptProps } from './BookmarksSetupPrompt'

// Story 3.10 / TKT-3.10.E3 — the zero-DOM `'use client'` hydrator
// that pre-populates the bookmark membership SWR cache on the first
// authenticated render of any public route. Mounted by the public
// layout (E4) so cards and detail strips see a warm cache without a
// perceptible state swap.
export { BookmarksLookupHydrator } from './BookmarksLookupHydrator'
