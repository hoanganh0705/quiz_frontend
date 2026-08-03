/**
 * `usePublishVersion` — mutation hook for publishing a quiz version.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.5.
 *
 * ## What this hook owns
 *
 * The `POST /quizzes/:id/versions/:versionId/publish` write path:
 *
 *   1. Calls `publishQuizVersion()` from `quizzes.service.ts`.
 *   2. Unwraps the wire envelope to extract the published version.
 *   3. Invalidates version list + author view caches on success.
 *   4. Returns the published `QuizVersionSummary` on success; surfaces typed errors on failure.
 *
 * ## Error surfacing
 *
 * Errors are NOT swallowed. The hook propagates the raw `ApiError` so
 * callers can read `apiError.code`. The caller uses `error.code` to
 * display user-friendly messages (e.g. QUIZ_INSUFFICIENT_QUESTIONS,
 * QUIZ_VERSION_IMMUTABLE).
 *
 * ## Single-flight
 *
 * An in-flight ref prevents concurrent submit calls from hitting the API
 * twice. The returned `publishVersion` function reuses the in-flight promise if
 * a submission is already pending.
 *
 * @see publishQuizVersion — the service layer function (Epic 4.1 / T-4.11.1).
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { useSWRConfig } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';

import { publishQuizVersion } from '@/features/quizzes/services/quizzes.service';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';
import {
  quizAuthorKey,
  quizVersionsKey,
} from '@/features/quizzes/types/quiz-version.types';

export interface UsePublishVersionOptions {
  /** Called after the server confirms publish. */
  onSuccess?: (result: QuizVersionSummary) => void;
  /** Called when the server rejects the publish. */
  onError?: (apiError: ApiError) => void;
}

/**
 * `usePublishVersion()` return shape.
 *
 * `publishVersion()` resolves with the published version's `QuizVersionSummary`,
 * or `null` if the submission was skipped (in-flight guard, etc.).
 * Callers check `error` for the rejection reason.
 */
export interface UsePublishVersionReturn {
  /**
   * Publish a quiz version. Resolves with `QuizVersionSummary` on success,
   * `null` on skip (e.g. in-flight guard). Rejects with `ApiError` on server error.
   */
  publishVersion: (quizId: string, versionId: string) => Promise<QuizVersionSummary | null>;
  /** `true` while a submission is in flight. */
  isLoading: boolean;
  /** The most recent `ApiError` from the last submission. `null` otherwise. */
  error: ApiError | null;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

function emitBreadcrumb(
  _category: string,
  _data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (T-4.11.5): replace with Sentry.addBreadcrumb once wired.
  void _category;
  void _data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Quiz version publish mutation hook.
 *
 * @example
 * ```tsx
 * const { publishVersion, isLoading, error } = usePublishVersion({
 *   onSuccess: (version) => router.push(`/quizzes/${quiz.slug}`),
 * });
 *
 * await publishVersion(quizId, versionId);
 * ```
 */
export function usePublishVersion(
  options: UsePublishVersionOptions = {},
): UsePublishVersionReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Single-flight ref — prevents concurrent submit calls.
  const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

  // SWR cache for invalidation on success.
  const { mutate } = useSWRConfig();

  const publishVersion = useCallback(
    async (quizId: string, versionId: string): Promise<QuizVersionSummary | null> => {
      // Guard: reuse the in-flight promise if one exists.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      const startedAt = Date.now();

      const core = (async (): Promise<QuizVersionSummary | null> => {
        try {
          const response = await publishQuizVersion(quizId, versionId);

          // Unwrap the WrappedDto envelope: { data: QuizVersionResponseDto }
          const version = (response as unknown as { data?: QuizVersionSummary }).data;
          if (!version) {
            throw new Error('Unexpected response shape from POST /quizzes/:id/versions/:versionId/publish');
          }

          emitBreadcrumb('phase4:4.11:publish-version', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          // Invalidate caches so version list and author view refetch.
          void mutate(quizVersionsKey(quizId));
          void mutate(quizAuthorKey(quizId));

          onSuccess?.(version);
          return version;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.11:publish-version', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });

            // Re-throw so callers can handle specific error codes.
            throw err;
          }

          // Non-ApiError — treat as unknown.
          emitBreadcrumb('phase4:4.11:publish-version', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
          });
          throw err;
        }
      })();

      inFlightRef.current = core;

      try {
        return await core;
      } finally {
        inFlightRef.current = null;
        setIsLoading(false);
      }
    },
    [mutate, onSuccess, onError],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return { publishVersion, isLoading, error, resetError };
}
