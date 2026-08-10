/**
 * `useQuizByIdOrSlug` — the player-detail hook.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B2.
 *
 * Provides the page's primary hook. It:
 *
 *   1. Calls the wrapper from TKT-3.6.A2 (`getQuizByIdOrSlug`).
 *   2. Pipes the result through the player-safe projection from
 *      TKT-3.6.A3 (`projectQuizToPlayerView`), so the no-spoiler
 *      invariant is enforced before any UI consumes the data.
 *   3. Maps a primary-resource 404 to `{ quiz: null, notFound: true,
 *      error: null }` so the page can render the not-found branch
 *      without inspecting the raw `ApiError` (B2 AC #3).
 *   4. Inherits 429 backoff and 5xx retry from `useSingleWithRetry`
 *      (TKT-3.6.B1) — never adds another retry loop (B2 AC #4).
 *   5. Uses a stable SWR key that includes the exact `idOrSlug`;
 *      a key change prevents the previous quiz from showing as
 *      the new route's resolved content (B2 AC #6).
 *
 * The hook is the only intended consumer of the wrapper's
 * `getQuizByIdOrSlug`. Components and tests must NOT import the
 * generated SDK directly.
 */

'use client';

import { useMemo } from 'react';

import { ApiError, coerceToApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';

import { getQuizByIdOrSlug } from '@/features/quizzes/services/quizzes.service';
import {
  projectQuizToPlayerView,
  type PlayerQuizDetail,
} from '@/features/quizzes/lib/quiz-player-view';
import type { QuizResponseDto } from '@/lib/api/generated/schemas/quizResponseDto';

export interface UseQuizByIdOrSlugResult {
  quiz: PlayerQuizDetail | null;
  notFound: boolean;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
  if (!isApiError(err)) return false;
  return err.status === 404;
}

/**
 * Hook entrypoint.
 *
 * Pass `idOrSlug` as `null` to disable the fetch (e.g. while the
 * parent route hasn't resolved the segment yet). The hook will
 * return a disabled state with `isLoading: false` and `quiz: null`.
 */
export function useQuizByIdOrSlug(
  idOrSlug: string | null,
): UseQuizByIdOrSlugResult {
  const key = useMemo(
    () =>
      idOrSlug === null
        ? null
        : (['useQuizByIdOrSlug', idOrSlug] as const),
    [idOrSlug],
  );

  const fetcher = useMemo<SingleFetcher<PlayerQuizDetail>>(
    () => async ({ signal }) => {
      let response: QuizResponseDto | null;
      try {
        response = await getQuizByIdOrSlug(idOrSlug!);
      } catch (err) {
        if (isApiError(err)) {
          throw err;
        }
        throw coerceToApiError(err);
      }
      if (signal.aborted) {
        throw new DOMException('aborted', 'AbortError');
      }
      if (
        response === null ||
        typeof response !== 'object' ||
        !('quizId' in response)
      ) {
        throw coerceToApiError(
          new Error(
            '[useQuizByIdOrSlug] malformed quiz detail envelope',
          ),
        );
      }
      return projectQuizToPlayerView(response);
    },
    [idOrSlug],
  );

  const swr = useSingleWithRetry<PlayerQuizDetail>({ key, fetcher });

  const notFound =
    !swr.isLoading && swr.error !== null && isNotFoundError(swr.error);

  const error = swr.error && !isNotFoundError(swr.error) ? swr.error : null;

  return {
    quiz: swr.data ?? null,
    notFound,
    isLoading: swr.isLoading,
    error,
    retry: swr.retry,
    isRetrying: swr.isRetrying,
  };
}
