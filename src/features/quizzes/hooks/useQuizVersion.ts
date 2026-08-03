/**
 * `useQuizVersion` — fetch a single quiz version detail.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.3.
 *
 * Fetches a single quiz version with its questions (author view — includes
 * `isCorrect` on answer options).
 *
 * ## Computed fields
 *
 * - `isDraft` — `true` when `status === 'draft'`
 * - `isPublished` — `true` when `status === 'published'`
 *
 * ## Error handling
 *
 * - `404 QUIZ_VERSION_NOT_FOUND` → returns `null` (caller handles NotFound)
 * - Other errors → returns `error`
 *
 * ## SWR key
 *
 * `['quiz', 'version', quizId, versionId]`
 *
 * ## Telemetry
 *
 * Emits a Sentry breadcrumb on every fetch (success or error).
 */

'use client';

import { useMemo } from 'react';

import { ApiError, isApiError, useSingleWithRetry } from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';

import { getQuizVersionDetail } from '@/features/quizzes/services/quizzes.service';
import {
  quizVersionKey,
  type QuizVersionDetail,
} from '@/features/quizzes/types/quiz-version.types';

export interface UseQuizVersionResult {
  /** The quiz version detail, or `null` if not found. */
  data: QuizVersionDetail | null;
  /** `true` while the initial fetch is in flight. */
  isLoading: boolean;
  /** Error if the fetch failed (excludes 404). */
  error: ApiError | null;
  /** `true` if the version does not exist (404). */
  notFound: boolean;
  /** `true` if the version is a draft. */
  isDraft: boolean;
  /** `true` if the version is published. */
  isPublished: boolean;
  /** Retry after a server error. */
  retry: () => Promise<void>;
}

/**
 * Fetch a single quiz version detail.
 *
 * @example
 * ```tsx
 * const { data: version, notFound, error, isDraft, isPublished } = useQuizVersion(quizId, versionId);
 *
 * if (notFound) return <VersionNotFound />;
 * if (!version) return <Skeleton />;
 *
 * return (
 *   <>
 *     <VersionMetadata version={version} />
 *     {isDraft && <EditForm version={version} />}
 *     <VersionQuestions questions={version.questions} />
 *   </>
 * );
 * ```
 */
export function useQuizVersion(
  quizId: string | null,
  versionId: string | null,
): UseQuizVersionResult {
  const key = useMemo(
    () =>
      quizId !== null && versionId !== null
        ? quizVersionKey(quizId, versionId)
        : null,
    [quizId, versionId],
  );

  const fetcher = useMemo<SingleFetcher<QuizVersionDetail>>(
    () => async ({ signal }) => {
      if (!quizId || !versionId) {
        throw new DOMException('quizId and versionId are required', 'AbortError');
      }

      const startedAt = Date.now();

      try {
        const response = await getQuizVersionDetail(quizId, versionId);

        emitBreadcrumb('phase4:4.9:version-detail', {
          status: 'success',
          durationMs: Date.now() - startedAt,
        });

        // The response is the wire envelope { data: QuizVersionDetailResponseDto }
        const data = (response as unknown as { data?: QuizVersionDetail }).data;
        if (!data) {
          throw new Error('Unexpected response shape');
        }
        return data;
      } catch (err) {
        if (isApiError(err)) {
          emitBreadcrumb('phase4:4.9:version-detail', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: err.code,
          });
          throw err;
        }
        emitBreadcrumb('phase4:4.9:version-detail', {
          status: 'error',
          durationMs: Date.now() - startedAt,
          code: 'GLOBAL_UNKNOWN',
        });
        throw err;
      }
    },
    [quizId, versionId],
  );

  const swr = useSingleWithRetry<QuizVersionDetail>({
    key,
    fetcher,
  });

  // Check for 404
  const isNotFoundError =
    swr.error !== null && swr.error.status === 404;

  return {
    data: swr.data ?? null,
    isLoading: swr.isLoading,
    error: swr.error !== null && !isNotFoundError ? swr.error : null,
    notFound: isNotFoundError,
    isDraft: swr.data?.status === 'draft',
    isPublished: swr.data?.status === 'published',
    retry: swr.retry,
  };
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (TKT-4.9.3): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}
