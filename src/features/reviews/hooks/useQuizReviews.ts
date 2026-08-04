/**
 * `useQuizReviews` — cursor-paginated read hook for quiz reviews.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.4.
 *
 * ## What this hook owns
 *
 * - Fetches `GET /quizzes/:quizId/reviews?cursor=…&limit=…` via the
 *   reviews service (T-4.13.1). Public — no auth required.
 * - Wraps `useCursorPaginated` (Epic 3.2) for the cursor-pagination
 *   mechanics: 429 backoff, 5xx banner, abort-on-unmount, dedup-across-pages.
 * - Synthesizes an `id` alias on each review so the items satisfy
 *   the `useCursorPaginated<T extends { id: string }>` constraint.
 *
 * ## Public read
 *
 * `GET /quizzes/:quizId/reviews` is public. The hook fires the same
 * way regardless of auth state; the SDK adds the Authorization
 * header when a token is in the SWR provider's auth context, which
 * the backend uses to attach the viewer's `userVote` if exposed.
 *
 * ## Default page size
 *
 * `REVIEWS_DEFAULT_LIMIT = 20` (defined in `review.types.ts`). The
 * player-view surface (Story 4.13, T-4.13.13) can pass an explicit
 * `limit: 10` if it wants a smaller first page; otherwise the
 * default is used.
 *
 * ## Return shape
 *
 *   `{ items, isLoading, isLoadingMore, hasMore, loadMore, error,
 *      refresh }` — see `UseCursorPaginatedResult<ReviewDto>`. The
 *   alias `reviews` is provided on top of `items` so consumers can
 *   read naturally; both refer to the same deduped list.
 *
 * The hook is safe to call with `quizId: null` — it returns a
 * disabled state (`isLoading: false`, `reviews: []`, no fetcher
 * runs). This matches the `useQuizComments` disabled pattern.
 */

'use client';

import { useMemo } from 'react';

import { useCursorPaginated } from '@/lib/api';
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from '@/lib/api/use-cursor-paginated.types';

import { listQuizReviews } from '@/features/reviews/services/reviews.service';
import {
  REVIEWS_DEFAULT_LIMIT,
  quizReviewsKey,
  type ReviewDto,
  type ReviewFilters,
  type ReviewPage,
} from '@/features/reviews/types';

// ─── Wire shape (post-unwrap) ────────────────────────────────────────────────

/**
 * Subset of the SDK response shape that the fetcher reads. We do
 * not import the generated `QuizReviewControllerListReviews200`
 * directly because the SDK's `WrappedPaginatedDto` types it
 * generically; the runtime data we need is just `data` (the
 * reviews array) and `meta.pagination` (the cursor envelope).
 */
type ListQuizReviewsResponse = {
  data?: ReviewDto[];
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

export type UseQuizReviewsResult = UseCursorPaginatedResult<ReviewDto>;

export interface UseQuizReviewsParams {
  /** Quiz ID to fetch reviews for. Pass `null` to disable the fetch. */
  quizId: string | null;
  /** Cursor-paginated filters. */
  filters?: ReviewFilters;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Cursor-paginated list of public reviews for one quiz.
 *
 * @example
 *   const { reviews, loadMore, hasMore, isLoading } = useQuizReviews({
 *     quizId: 'uuid',
 *   });
 *
 * @example
 *   // First page only, then disable further fetches.
 *   const { reviews } = useQuizReviews({
 *     quizId: 'uuid',
 *     filters: { limit: 10 },
 *   });
 */
export function useQuizReviews(
  params: UseQuizReviewsParams,
): UseQuizReviewsResult {
  const { quizId, filters } = params;

  const key = useMemo(
    () => (quizId === null ? null : quizReviewsKey(quizId, filters)),
    [quizId, filters],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseQuizReviewsParams>): Promise<
        CursorPage<ReviewDto>
      > => {
        // Disabled state: caller passed `quizId: null`. Short-circuit
        // with an empty result so no service call is made.
        if (quizId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        // Honor `filters.cursor` on the first page (the caller-supplied
        // starting cursor); on subsequent pages, use the cursor
        // returned by the previous page.
        const effectiveCursor = cursor ?? filters?.cursor ?? undefined;

        const result = (await listQuizReviews(
          quizId,
          {
            cursor: effectiveCursor,
            limit: filters?.limit ?? REVIEWS_DEFAULT_LIMIT,
          },
        )) as unknown as ListQuizReviewsResponse;

        const items: readonly ReviewDto[] = (result.data ?? []).map(
          (item) => ({ ...item, id: item.reviewId }) as ReviewDto,
        );

        const pagination = result.meta?.pagination;
        const page: ReviewPage = {
          items,
          nextCursor: pagination?.nextCursor ?? null,
          hasNextPage: pagination?.hasNextPage ?? false,
          limit: pagination?.limit ?? items.length,
        };
        return page;
      },
    [quizId, filters],
  );

  return useCursorPaginated<ReviewDto, UseQuizReviewsParams>({
    key: key ?? ['reviews', 'disabled'],
    fetcher,
    params,
    paginationKind: 'cursor',
  });
}
