/**
 * Single source of truth for Bookmark TanStack Query cache keys.
 * Prefixing all bookmark keys under `"bookmark-collections"` ensures
 * `invalidateQueries({ queryKey: BOOKMARK_KEYS.all })` cleanly invalidates
 * both summary collections (`useBookmarkCollections`), paginated lists
 * (`useCollections`), and collection details (`useCollection`).
 */
export const BOOKMARK_KEYS = {
  all: ["bookmark-collections"] as const,
  list: () => ["bookmark-collections", "list"] as const,
  detail: (collectionId: string) =>
    ["bookmark-collections", "detail", collectionId] as const,
  quizzes: (collectionId: string) =>
    ["bookmark-collections", "quizzes", collectionId] as const,
  analytics: (collectionId: string) =>
    ["bookmark-collections", "analytics", collectionId] as const,
} as const;
