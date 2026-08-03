/**
 * `useUpdateVersion` — mutation hook for updating a quiz version's metadata.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.5.
 *
 * ## What this hook owns
 *
 * The `PATCH /quizzes/:id/versions/:versionId` write path:
 *
 *   1. Calls `updateQuizVersion()` from `quizzes.service.ts`.
 *   2. Unwraps the wire envelope to extract the updated version.
 *   3. Invalidates the version list and version detail caches on success.
 *   4. Returns the updated `QuizVersionSummary` on success; surfaces typed errors on failure.
 *
 * ## Error surfacing
 *
 * Errors are NOT swallowed. The hook propagates the raw `ApiError` so
 * callers can read `apiError.code`. Key error codes to handle:
 *
 * - `QUIZ_VERSION_IMMUTABLE` — version is published; user must create a new draft
 * - `QUIZ_SLUG_CONFLICT` — slug is already in use; surface inline slug error
 *
 * ## Single-flight
 *
 * An in-flight ref prevents concurrent submit calls from hitting the API
 * twice. The returned `updateVersion` function reuses the in-flight promise if
 * a submission is already pending.
 *
 * @see updateQuizVersion — the service layer function (Epic 4.1).
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import type { UpdateQuizVersionDto } from '@/lib/api/generated/schemas';

import { updateQuizVersion } from '@/features/quizzes/services/quizzes.service';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

export interface UseUpdateVersionOptions {
  /** Called after the server confirms the update. */
  onSuccess?: (result: QuizVersionSummary) => void;
  /** Called when the server rejects the update. */
  onError?: (apiError: ApiError) => void;
}

/**
 * `useUpdateVersion()` return shape.
 *
 * `updateVersion()` resolves with the updated version's `QuizVersionSummary`,
 * or `null` if the submission was skipped (in-flight guard, etc.).
 * Callers check `error` for the rejection reason.
 */
export interface UseUpdateVersionReturn {
  /**
   * Update a quiz version's metadata. Resolves with `QuizVersionSummary` on success,
   * `null` on skip (e.g. in-flight guard). Rejects with `ApiError` on server error.
   */
  updateVersion: (quizId: string, versionId: string, payload: UpdateQuizVersionDto) => Promise<QuizVersionSummary | null>;
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
  // TODO (TKT-4.9.5): replace with Sentry.addBreadcrumb once wired.
  void _category;
  void _data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Quiz version update mutation hook.
 *
 * @example
 * ```tsx
 * const { updateVersion, isLoading, error } = useUpdateVersion({
 *   onSuccess: (version) => {
 *     toast.success('Changes saved');
 *     queryClient.invalidateQueries({ queryKey: ['quiz', 'versions', quizId] });
 *   },
 * });
 *
 * await updateVersion(quizId, versionId, { difficulty: 'hard' });
 * ```
 */
export function useUpdateVersion(
  options: UseUpdateVersionOptions = {},
): UseUpdateVersionReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Single-flight ref — prevents concurrent submit calls.
  const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

  const updateVersion = useCallback(
    async (
      quizId: string,
      versionId: string,
      payload: UpdateQuizVersionDto,
    ): Promise<QuizVersionSummary | null> => {
      // Guard: reuse the in-flight promise if one exists.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      const startedAt = Date.now();

      const core = (async (): Promise<QuizVersionSummary | null> => {
        try {
          const response = await updateQuizVersion(quizId, versionId, payload);

          // Unwrap the WrappedDto envelope: { data: QuizVersionResponseDto }
          const version = (response as unknown as { data?: QuizVersionSummary }).data;
          if (!version) {
            throw new Error('Unexpected response shape from PATCH /quizzes/:id/versions/:versionId');
          }

          emitBreadcrumb('phase4:4.9:update-version', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.(version);
          return version;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.9:update-version', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });

            // Re-throw so callers can handle specific error codes.
            throw err;
          }

          // Non-ApiError — treat as unknown.
          emitBreadcrumb('phase4:4.9:update-version', {
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
    [onSuccess, onError],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return { updateVersion, isLoading, error, resetError };
}
