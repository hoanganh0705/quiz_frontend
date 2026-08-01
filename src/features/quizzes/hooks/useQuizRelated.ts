'use client';

/**
 * `useQuizRelated` — non-paginated `useSWR` hook against
 * `getQuizzesRelated` for the quiz detail page's related-quizzes block.
 *
 * Source epic: Story 3.8 — Related quizzes block.
 * Source ticket: TKT-3.8.B1.
 *
 * The endpoint `/quizzes/:idOrSlug/related` is a non-paginated,
 * limit-bounded discovery hint (`TKT-3.8.A1` §2) — it returns
 * `{ data?: QuizListItemDto[] }` (a plain array, no `meta.pagination`,
 * no `cursor`). The hook uses `useSWR` directly (mirroring
 * `useFeaturedQuizzes` from TKT-3.7.C1).
 *
 * The hook maps three outcomes from the wrapper / SDK into the
 * component-friendly result shape:
 *
 *   1. `ApiError(404)` → `{ items: [], isLoading: false, error: null,
 *      notFound: true }` — the soft-deleted / unknown-id case. The
 *      live component (B2) hides the block identically to the
 *      empty-items case (Story 3.8 lines 880, 884).
 *   2. Other `ApiError` (5xx, 422, 429-after-retries) → `{ items: [],
 *      isLoading: false, error: <ApiError>, notFound: false }` — the
 *      component hides the block silently (Story 3.8 lines 884–885:
 *      "swallowed silently", "does not blank the detail page").
 *   3. Successful response → `{ items: <list>, isLoading: false,
 *      error: null, notFound: false }`.
 *
 * The hook is intentionally non-noisy: silent failure is the
 * contract. The component, not the hook, decides whether to hide the
 * block. The hook does NOT call `captureException` (Story 3.8 line
 * 885 — "swallowed silently"); it surfaces the typed error so the
 * consumer can log if they ever choose to.
 *
 * SWR-key stability (Story 3.6's "no stale content from previous
 * quiz shows as new route's resolved content" invariant at line 707,
 * mirrored to B1):
 *
 *   - Key: `['useQuizRelated', idOrSlug, { limit: 4 }]`. The `limit`
 *     is part of the key so a future change to the limit does NOT
 *     silently inherit stale cache entries from the previous key.
 *   - When `idOrSlug === null` the hook disables the fetch and
 *     returns `{ items: [], isLoading: false, error: null,
 *     notFound: false }` (mirrors `useQuizByIdOrSlug` TKT-3.6.B2
 *     disabled-state convention — useful while the route segment is
 *     still resolving).
 *   - The key is stable across re-renders with the same `idOrSlug`;
 *     SWR's deduping collapses two concurrent calls into one fetch.
 */

import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import type { QuizListItemDto } from '@/lib/api/generated/schemas';

import { getQuizzesRelated } from '@/features/quizzes/api/quizzes.wrapper';

/**
 * Baseline of 4 related quizzes, matching Story 3.8 line 878
 * "Skeleton grid × 4". Exported so the live component (B2) can
 * share the same constant for the resolved grid count, locking the
 * CLS-zero invariant.
 */
export const QUIZ_RELATED_LIMIT = 4 as const;

export interface UseQuizRelatedResult {
  items: readonly QuizListItemDto[];
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
}

const DISABLED_RESULT: UseQuizRelatedResult = Object.freeze({
  items: Object.freeze([]) as readonly QuizListItemDto[],
  isLoading: false,
  error: null,
  notFound: false,
});

export function useQuizRelated(
  idOrSlug: string | null,
): UseQuizRelatedResult {
  const key =
    idOrSlug === null
      ? null
      : (['useQuizRelated', idOrSlug, { limit: QUIZ_RELATED_LIMIT }] as const);

  const { data, error, isLoading } = useSWR<readonly QuizListItemDto[]>(
    key,
    async () => {
      const result = await getQuizzesRelated(idOrSlug as string, {
        limit: QUIZ_RELATED_LIMIT,
      });
      // `result.data` after the orvalCustomInstance unwrap is
      // `QuizListItemDto[] | undefined` (TKT-3.8.A1 §2). A missing
      // `data` key is treated as an empty list — the live component
      // hides the block identically to the empty case.
      return (result.data ?? []) as readonly QuizListItemDto[];
    },
    {
      // Inherit the global SwrProvider defaults
      // (`revalidateOnFocus: false`, `dedupingInterval: 2_000`,
      // `errorRetryCount: 3`). No per-call overrides — silent
      // failure is the contract.
    },
  );

  if (idOrSlug === null) return DISABLED_RESULT;

  // Map an ApiError 404 to `notFound: true` (Story 3.8 §5).
  // 5xx / 422 / 429-after-retries keep the error populated and the
  // items list empty.
  const notFound = !isLoading && isApiError(error) && error.status === 404;
  const surfacedError =
    !isLoading && error && !(isApiError(error) && error.status === 404)
      ? (error as ApiError)
      : null;

  return {
    items: data ?? ([] as readonly QuizListItemDto[]),
    isLoading,
    error: surfacedError,
    notFound,
  };
}
