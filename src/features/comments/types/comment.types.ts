/**
 * Comment Types — Epic 4.12.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz (read + write + reply cap + 2-level + vote + report).
 * Source ticket: T-4.12.1.
 *
 * ## DTO mappings
 *
 * | API response                       | Type alias          | Notes                              |
 * |------------------------------------|---------------------|------------------------------------|
 * | GET /quizzes/:quizId/comments      | `CommentThreadItem` | Top-level + first page of replies  |
 * | CommentDto (single)                | `CommentItem`       | A single comment (top or reply)    |
 * | ListQuizCommentsParams             | `CommentFilters`    | Cursor, limit, parentId            |
 *
 * ## Threading model
 *
 * Per master plan §76 (default 100 replies per thread, 2-level nesting):
 *
 *   - Depth 0 = top-level comment (parentCommentId is null).
 *   - Depth 1 = reply (parentCommentId references a top-level comment).
 *   - There is no depth 2 — replies to replies are rejected by the
 *     backend with `COMMENT_PARENT_COMMENT_CROSS_THREAD`.
 *
 * ## SWR Key Factories
 *
 * `commentsKey(quizId, filters?)` is the canonical SWR cache key for the
 * thread list. The second element (filters) is itself a tuple of
 * `parentId + cursor + limit` so the cursor-paginated primitive can
 * differentiate top-level loads from reply loads.
 *
 * `commentThreadKey(quizId)` is the cache key for the per-quiz
 * `useCommentThreadLookup` store (T-4.12.3).
 */

import type {
  CommentDto,
  CommentWithRepliesDto,
} from '@/lib/api/generated/schemas';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum number of replies allowed per top-level comment thread.
 *
 * Mirrors the backend cap (master plan line 76 default 100). The client
 * uses this to disable the Reply button before the user attempts a 101st
 * reply — the server `COMMENT_REPLY_LIMIT_EXCEEDED` (422) is defense in
 * depth.
 */
export const REPLY_CAP = 100;

/**
 * Default page size for top-level comment fetches.
 *
 * Per Epic 4.12 — the player-facing read path loads 20 top-level
 * comments per page; deeper pages are cursor-paginated.
 */
export const TOP_LEVEL_DEFAULT_LIMIT = 20;

/**
 * Default page size for reply fetches under a thread.
 */
export const REPLY_DEFAULT_LIMIT = 50;

// ─── SWR Key Factories ────────────────────────────────────────────────────────

/**
 * SWR key for a quiz's comment thread list (or reply list, when
 * `filters.parentId` is set).
 *
 * The `filters` element is normalized into a tuple so two calls with
 * semantically equivalent filters produce the same cache key — i.e.
 * `{ cursor: undefined, limit: undefined, parentId: undefined }` and
 * `{ parentId: undefined }` both yield `['comments', quizId, [undefined, undefined, undefined]]`.
 */
export function commentsKey(
  quizId: string,
  filters?: CommentFilters,
): ['comments', string, ReadonlyArray<string | number | undefined>] {
  return [
    'comments',
    quizId,
    [
      filters?.parentId ?? undefined,
      filters?.cursor ?? undefined,
      filters?.limit ?? undefined,
    ],
  ];
}

/**
 * SWR key for the thread-lookup cache (id → reply count, gating the
 * Reply button).
 */
export function commentThreadKey(quizId: string): ['comments', 'thread', string] {
  return ['comments', 'thread', quizId];
}

// ─── Type Aliases ────────────────────────────────────────────────────────────

/**
 * Cursor-paginated filters for the comments list endpoint.
 *
 * - `cursor`: opaque cursor from the previous page's `meta.pagination.nextCursor`.
 * - `limit`: max items per page (1–100). Defaults differ for top-level
 *   vs replies (see `TOP_LEVEL_DEFAULT_LIMIT` / `REPLY_DEFAULT_LIMIT`).
 * - `parentId`: when set, the endpoint returns replies under this
 *   comment; when unset, it returns top-level comments.
 */
export interface CommentFilters {
  cursor?: string;
  limit?: number;
  parentId?: string;
}

/**
 * Single comment shape used in the UI. Aliases `CommentDto` from the
 * generated SDK with an `id` alias so it satisfies the
 * `useCursorPaginated<T extends { id: string }>` constraint.
 */
export type CommentItem = CommentDto & { id: string };

/**
 * A top-level comment with the first page of replies inlined.
 *
 * The backend's `GET /quizzes/:quizId/comments` returns this shape —
 * the first N replies are embedded so the player view can render the
 * thread without a separate fetch.
 */
export type CommentThreadItem = CommentWithRepliesDto & { id: string };

/**
 * Vote value the backend accepts on `VoteDto.value`. Mirrors
 * `VoteDtoValue` from the generated SDK (`'upvote' | 'downvote'`)
 * so the optimistic cache value matches the wire response on
 * revalidation.
 */
export type CommentVoteDirection = 'upvote' | 'downvote';

/**
 * Vote state for the authenticated viewer of a comment. `null` means
 * no vote (or the viewer is unauthenticated). Mirrors the
 * `CommentWithRepliesDto.userVote` field from the SDK.
 */
export type CommentUserVote = CommentVoteDirection | null;

/**
 * Reply cap state for a single thread.
 *
 * The `useCommentThreadLookup` store (T-4.12.3) populates this map;
 * the reply form (T-4.12.14) consumes `isAtReplyCap` to disable the
 * Reply button before the user attempts a 101st reply.
 */
export interface ThreadLookupEntry {
  /** Current reply count (the server-reported value, possibly mutated optimistically). */
  repliesCount: number;
  /** Cap for this thread. Constant today (`REPLY_CAP`); kept on the entry for future per-thread overrides. */
  replyCap: number;
}
