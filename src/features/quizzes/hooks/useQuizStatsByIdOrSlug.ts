/**
 * `useQuizStatsByIdOrSlug` — the independently retryable quiz-stats hook.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B3.
 *
 * Fetches live stats independently from the detail hook and maps
 * stats-only 404 to a documented no-stats state. Detailed design:
 *
 *   1. Calls the wrapper from TKT-3.6.A2 (`getQuizStatsByIdOrSlug`).
 *   2. Inherits 429 backoff and 5xx retry from `useSingleWithRetry`
 *      (TKT-3.6.B1) — never adds another retry loop.
 *   3. Maps stats 404 to `{ stats: null, noStats: true, error: null }`
 *      (B3 AC #2) so the panel can render the zero state without
 *      inspecting the raw `ApiError`.
 *   4. Stats 5xx remains an inline-panel error and never sets the
 *      primary quiz's `notFound` state — this hook does NOT touch
 *      the detail hook (B3 AC #3).
 *   5. Uses a SWR key that includes `idOrSlug` and is namespaced
 *      separately from the detail hook (B3 AC #4).
 *   6. Returns the generated `QuizStatsResponseDto` typing directly
 *      (B3 AC #1) — no speculative field renames.
 *
 * The hook is the only intended consumer of the wrapper's
 * `getQuizStatsByIdOrSlug`. Components and tests must NOT import
 * the generated SDK directly.
 */

'use client';

import { useMemo } from 'react';

import { ApiError, coerceToApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';

import { getQuizStatsByIdOrSlug } from '@/features/quizzes/services/quizzes.service';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

export interface UseQuizStatsByIdOrSlugResult {
  stats: QuizStatsResponseDto | null;
  isLoading: boolean;
  noStats: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
  if (!isApiError(err)) return false;
  return err.status === 404;
}

function wrapAsApiError(err: unknown): ApiError {
  if (isApiError(err)) return err;
  if (err instanceof Error) {
    return ApiError.fromInput({
      status: 500,
      code: 'QUIZ_STATS_MALFORMED',
      message: err.message,
    });
  }
  return coerceToApiError(err);
}

/**
 * Hook entrypoint.
 *
 * Pass `idOrSlug` as `null` to disable the fetch (e.g. while the
 * parent route hasn't resolved the segment yet). The hook will
 * return a disabled state with `isLoading: false`, `stats: null`,
 * and `noStats: false`.
 */
export function useQuizStatsByIdOrSlug(
  idOrSlug: string | null,
): UseQuizStatsByIdOrSlugResult {
  const key = useMemo(
    () =>
      idOrSlug === null
        ? null
        : (['useQuizStatsByIdOrSlug', idOrSlug] as const),
    [idOrSlug],
  );

  const fetcher = useMemo<SingleFetcher<QuizStatsResponseDto>>(
    () => async ({ signal }) => {
      let response: QuizStatsResponseDto;
      try {
        response = await getQuizStatsByIdOrSlug(idOrSlug!);
      } catch (err) {
        if (isApiError(err)) {
          throw err;
        }
        throw wrapAsApiError(err);
      }
      if (signal.aborted) {
        throw new DOMException('aborted', 'AbortError');
      }
      if (
        response === null ||
        typeof response !== 'object' ||
        !('quizId' in response)
      ) {
        throw wrapAsApiError(
          new Error('[useQuizStatsByIdOrSlug] malformed stats envelope'),
        );
      }
      return response;
    },
    [idOrSlug],
  );

  const swr = useSingleWithRetry<QuizStatsResponseDto>({ key, fetcher });

  const noStats =
    !swr.isLoading && swr.error !== null && isNotFoundError(swr.error);

  const error = swr.error && !isNotFoundError(swr.error) ? swr.error : null;

  return {
    stats: swr.data ?? null,
    isLoading: swr.isLoading,
    noStats,
    error,
    retry: swr.retry,
    isRetrying: swr.isRetrying,
  };
}
