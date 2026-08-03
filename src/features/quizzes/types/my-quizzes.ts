/**
 * My Quizzes types — aligned with backend DTOs for the author's dashboard.
 *
 * Source epic: Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.A1.
 *
 * Re-exports the generated DTOs with frontend-friendly names and adds the
 * synthesised `id` alias for cursor deduplication, plus the SWR key factory.
 *
 * ## `MyQuizListItem` — id aliasing
 *
 * `QuizListItemDto` carries `quizId` (not `id`). The cursor pagination
 * primitive (`useCursorPaginated`) requires `T extends { id: string }` so
 * `appendUniqueById` deduplication works. This file synthesises `id` from
 * `quizId` in every hook's fetcher; components read `quizId` directly.
 *
 * ## `MyQuizzesAnalytics` — flat aggregate stats
 *
 * `CreatorQuizAnalyticsDto` is a flat object with all the aggregate counts
 * the analytics tab needs. No further mapping is required.
 *
 * ## SWR key factory
 *
 * `myQuizzesKey(tab)` is the single source of truth for all SWR cache keys
 * in the my-quizzes feature. Every hook calls this function so the keys
 * stay consistent and tab-switching resets pagination.
 */

import type {
  QuizListItemDto,
  CreatorQuizAnalyticsDto,
} from "@/lib/api/generated/schemas";

/**
 * The tab discriminator for the author's dashboard.
 * Mirrored in `MyQuizzesTabStore` and `MyQuizzesTabs`.
 */
export type MyQuizzesTab = "all" | "drafts" | "published" | "analytics";

/**
 * `QuizListItemDto` with a synthesised `id` field.
 *
 * The `id` field is an alias of `quizId` so `appendUniqueById` deduplication
 * in `useCursorPaginated` works. Downstream components read `quizId` directly
 * (never `id`).
 *
 * ## Soft-delete field
 *
 * `QuizListItemDto` does NOT carry `deletedAt` — the backend filters
 * soft-deleted quizzes from `me/published` and `me/analytics`. The `me/all`
 * endpoint surfaces soft-deleted quizzes with an `isHidden: true` flag.
 * `MyQuizzesTableRow` checks `isHidden` to render the "Deleted" badge.
 */
export type MyQuizListItem = QuizListItemDto & { id: string };

/**
 * Flat aggregate analytics for the author's dashboard.
 * Returned by `GET /quizzes/me/analytics`.
 *
 * All numeric fields default to `0` when the user has no published quizzes.
 */
export type MyQuizzesAnalytics = CreatorQuizAnalyticsDto;

/**
 * SWR cache key factory for the my-quizzes feature.
 *
 * Every hook in Epic 4.4 uses this function to build its SWR key so
 * tab-switching correctly invalidates the previous tab's cache.
 *
 * @example
 * ```ts
 * useSWR(myQuizzesKey('all'), fetcher)
 * useSWRInfinite(myQuizzesKey('drafts'), fetcher)
 * useSWR(myQuizzesKey('analytics'), fetcher)
 * ```
 */
export function myQuizzesKey(tab: MyQuizzesTab): readonly ["quizzes", "me", MyQuizzesTab] {
  return ["quizzes", "me", tab];
}
