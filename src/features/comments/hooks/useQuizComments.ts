/**
 * `useQuizComments` — cursor-paginated read hook for quiz comments.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.4.
 *
 * ## What this hook owns
 *
 * - Fetches `GET /quizzes/:quizId/comments?cursor=…&limit=…&parentId=…`
 *   via the comments service (Epic 4.1 / TKT-4.1.F4).
 * - Wraps `useCursorPaginated` (Epic 3.2) for the cursor-pagination
 *   mechanics: 429 backoff, 5xx banner, abort-on-unmount, dedup-across-pages.
 * - Synthesizes an `id` alias on each thread item so the items
 *   satisfy the `useCursorPaginated<T extends { id: string }>`
 *   constraint.
 * - On each successful page load, hydrates the per-quiz thread map
 *   (`useCommentThreadLookup`, T-4.12.3) so the Reply button can gate
 *   on the reply cap without an extra fetch.
 *
 * ## Modes
 *
 * - **Top-level (default):** `filters.parentId === undefined` →
 *   returns threads (top-level comments with first page of replies
 *   inlined).
 * - **Replies:** `filters.parentId` set → returns replies under that
 *   comment (used by `CommentThread` when the user expands "Show N
 *   more replies").
 *
 * The two modes use different default `limit` values
 * (`TOP_LEVEL_DEFAULT_LIMIT=20`, `REPLY_DEFAULT_LIMIT=50`) but the
 * caller can override either.
 *
 * ## Public read
 *
 * `GET /quizzes/:quizId/comments` is public — the backend attaches
 * the viewer's `userVote` only when a Bearer token is present. The
 * hook fires the same way regardless of auth state; the SDK adds the
 * Authorization header when a token is in the SWR provider's auth
 * context.
 *
 * ## Return shape
 *
 *   `{ items, isLoading, isLoadingMore, hasMore, loadMore, error,
 *      refresh }` — see `UseCursorPaginatedResult<CommentThreadItem>`.
 *
 * The hook is safe to call with `quizId: null` — it returns a
 * disabled state (`isLoading: false`, `items: []`, no fetcher runs).
 */

'use client';

import { useMemo } from 'react';

import { ApiError, useCursorPaginated } from '@/lib/api';
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import { listQuizComments } from '@/features/comments/services/comments.service';
import { useCommentThreadLookup } from '@/features/comments/stores/useCommentThreadLookup';
import {
  REPLY_DEFAULT_LIMIT,
  TOP_LEVEL_DEFAULT_LIMIT,
  commentsKey,
  type CommentFilters,
  type CommentThreadItem,
} from '@/features/comments/types';

// ─── Wire shape (post-unwrap) ────────────────────────────────────────────────

/**
 * Subset of the SDK response shape that the fetcher reads. We do not
 * import `ListQuizComments200` directly because the SDK's `WrappedPaginatedDto`
 * types it generically; the runtime data we need is just `data` (the
 * comments array) and `meta.pagination` (the cursor envelope).
 */
type ListQuizCommentsResponse = {
  data?: Array<CommentThreadItem>;
  meta?: {
    pagination?: {
      kind: string;
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

// ─── Public types ────────────────────────────────────────────────────────────

/** Public return type — the cursor-paginated result specialized to comments. */
export type UseQuizCommentsResult = UseCursorPaginatedResult<CommentThreadItem>;

export interface UseQuizCommentsParams {
  /** Quiz ID to fetch comments for. Pass `null` to disable the fetch. */
  quizId: string | null;
  /** Cursor-paginated filters. */
  filters?: CommentFilters;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Cursor-paginated list of quiz comments (or replies under a parent).
 *
 * @example
 *   // Top-level threads on a quiz
 *   const { items, loadMore, hasMore, isLoading } = useQuizComments({
 *     quizId: 'uuid',
 *   });
 *
 * @example
 *   // Replies under a top-level comment
 *   const { items, loadMore } = useQuizComments({
 *     quizId: 'uuid',
 *     filters: { parentId: 'comment-uuid' },
 *   });
 */
export function useQuizComments(
  params: UseQuizCommentsParams,
): UseQuizCommentsResult {
  const { quizId, filters } = params;

  const lookup = useCommentThreadLookup(quizId);

  const key = useMemo(
    () => (quizId === null ? null : commentsKey(quizId, filters)),
    [quizId, filters],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseQuizCommentsParams>): Promise<
        CursorPage<CommentThreadItem>
      > => {
        // Disabled state: caller passed `quizId: null`. `useCursorPaginated`
        // still calls the fetcher once for the first page; short-circuit
        // with an empty result so no service call is made.
        if (quizId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const startedAt = Date.now();

        // Honor `filters.cursor` on the first page (the caller-supplied
        // starting cursor); on subsequent pages, use the cursor returned
        // by the previous page.
        const effectiveCursor = cursor ?? filters?.cursor ?? undefined;

        try {
          const result = (await listQuizComments(
            quizId,
            {
              cursor: effectiveCursor,
              limit: filters?.limit ?? defaultLimitFor(filters),
              // The generated SDK's `ListQuizCommentsParams` does not
              // include `parentId` (the orval regeneration captured the
              // endpoint before the reply-mode query parameter was
              // added to the backend OpenAPI spec). The runtime axios
              // request does forward unknown params, so we cast through
              // `unknown` to keep the type-check green until the SDK
              // is regenerated. The backend rejects reply-to-reply with
              // `COMMENT_PARENT_COMMENT_CROSS_THREAD` (422) when misused.
              parentId: filters?.parentId,
            } as unknown as Parameters<typeof listQuizComments>[1],
          )) as unknown as ListQuizCommentsResponse;

          const items: readonly CommentThreadItem[] = (result.data ?? []).map(
            (item) => ({ ...item, id: item.id }) as CommentThreadItem,
          );

          // Hydrate the per-thread reply-count map so the Reply-cap
          // gate has authoritative numbers without a second fetch.
          for (const item of items) {
            lookup.setRepliesCount(item.id, item.repliesCount);
          }

          const pagination = result.meta?.pagination;
          return {
            items,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? items.length,
          };
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            throw err;
          }
          // Other errors propagate so `useCursorPaginated` can apply
          // 429 backoff and surface 5xx as the banner.
          emitBreadcrumb('phase4:4.12:comments-list', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: err instanceof ApiError ? err.code : 'GLOBAL_UNKNOWN',
          });
          throw err;
        }
      },
    [quizId, filters, lookup],
  );

  return useCursorPaginated<CommentThreadItem, UseQuizCommentsParams>({
    key: key ?? ['comments', 'disabled'],
    fetcher,
    params,
    paginationKind: 'cursor',
  });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function defaultLimitFor(filters: CommentFilters | undefined): number {
  if (filters?.limit !== undefined) return filters.limit;
  if (filters?.parentId !== undefined) return REPLY_DEFAULT_LIMIT;
  return TOP_LEVEL_DEFAULT_LIMIT;
}

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (T-4.12.4): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}
