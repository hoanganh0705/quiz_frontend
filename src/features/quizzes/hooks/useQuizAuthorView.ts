/**
 * `useQuizAuthorView` — fetch quiz details for the edit page.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.1.
 *
 * Fetches the quiz detail for the authenticated author.
 *
 * ## Error handling
 *
 * - `404 QUIZ_NOT_FOUND` → returns `null` (caller handles NotFound redirect)
 * - `403 QUIZ_FORBIDDEN` → returns `error` (caller handles redirect to public view)
 * - `5xx` → returns `error` with retry capability
 *
 * ## SWR key
 *
 * `['quiz', 'author', quizId]`
 *
 * ## Telemetry
 *
 * Emits a Sentry breadcrumb on every fetch (success or error).
 */

'use client';

import { useCallback, useMemo } from 'react';

import { ApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';

import {
  quizAuthorKey,
  type QuizAuthorView,
} from '@/features/quizzes/types/quiz-version.types';

export interface UseQuizAuthorViewResult {
  /** The quiz author view, or `null` if not found. */
  data: QuizAuthorView | null;
  /** `true` while the initial fetch is in flight. */
  isLoading: boolean;
  /** Error if the fetch failed (excludes 404). */
  error: ApiError | null;
  /** `true` if the quiz does not exist (404). */
  notFound: boolean;
  /** Retry after a server error. */
  retry: () => Promise<void>;
}

/**
 * Fetch quiz details for the author edit page.
 *
 * @example
 * ```tsx
 * const { data: quiz, notFound, error } = useQuizAuthorView(quizId);
 *
 * if (notFound) return <NotFound />;
 * if (error) return <ErrorView error={error} />;
 * if (!quiz) return <Skeleton />;
 *
 * return <QuizEditPage quiz={quiz} />;
 * ```
 */
export function useQuizAuthorView(
  quizId: string | null,
): UseQuizAuthorViewResult {
  const key = useMemo(
    () => (quizId === null ? null : quizAuthorKey(quizId)),
    [quizId],
  );

  const fetcher = useMemo<SingleFetcher<QuizAuthorView>>(
    () => async ({ signal }) => {
      if (!quizId) {
        throw new DOMException('quizId is required', 'AbortError');
      }

      const startedAt = Date.now();

      // Use the existing quiz service to fetch the quiz detail.
      const { getQuizByIdOrSlug } = await import(
        '@/features/quizzes/services/quizzes.service'
      );

      try {
        // `getQuizByIdOrSlug` already unwraps the backend's
        // `{ data: QuizResponseDto, meta }` envelope and returns the
        // inner `QuizResponseDto`. The author view is the same wire
        // shape as the player view for the fields we read below.
        const quiz = await getQuizByIdOrSlug(quizId);
        if (!quiz) {
          throw new Error('Unexpected response shape');
        }

        emitBreadcrumb('phase4:4.9:author-view', {
          status: 'success',
          durationMs: Date.now() - startedAt,
        });

        return quiz as unknown as QuizAuthorView;
      } catch (err) {
        if (isApiError(err)) {
          emitBreadcrumb('phase4:4.9:author-view', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: err.code,
          });
          throw err;
        }
        emitBreadcrumb('phase4:4.9:author-view', {
          status: 'error',
          durationMs: Date.now() - startedAt,
          code: 'GLOBAL_UNKNOWN',
        });
        throw err;
      }
    },
    [quizId],
  );

  const swr = useSingleWithRetry<QuizAuthorView>({
    key,
    fetcher,
  });

  const retry = useCallback(async () => {
    await swr.retry();
  }, [swr]);

  // Check for 404 - the error code depends on backend implementation
  const isNotFoundError =
    swr.error !== null && swr.error.status === 404;

  const isForbiddenError =
    swr.error !== null && swr.error.status === 403;

  return {
    data: swr.data ?? null,
    isLoading: swr.isLoading,
    error: isForbiddenError || (swr.error !== null && !isNotFoundError)
      ? swr.error
      : null,
    notFound: isNotFoundError,
    retry,
  };
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (TKT-4.9.1): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}
