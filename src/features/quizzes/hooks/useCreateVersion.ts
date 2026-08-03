/**
 * `useCreateVersion` — mutation hook for creating a new quiz version.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.4.
 *
 * ## What this hook owns
 *
 * The `POST /quizzes/:id/versions` write path:
 *
 *   1. Calls `createQuizVersion()` from `quizzes.service.ts`.
 *   2. Unwraps the wire envelope to extract the created version.
 *   3. Invalidates the version list cache on success.
 *   4. Returns the created `QuizVersionSummary` on success; surfaces typed errors on failure.
 *
 * ## Error surfacing
 *
 * Errors are NOT swallowed. The hook propagates the raw `ApiError` so
 * callers can read `apiError.code`. The caller uses `error.code` to
 * display user-friendly messages.
 *
 * ## Single-flight
 *
 * An in-flight ref prevents concurrent submit calls from hitting the API
 * twice. The returned `createVersion` function reuses the in-flight promise if
 * a submission is already pending.
 *
 * @see createQuizVersion — the service layer function (Epic 4.1).
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import type { CreateQuizVersionDto } from '@/lib/api/generated/schemas';

import { createQuizVersion } from '@/features/quizzes/services/quizzes.service';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';

export interface UseCreateVersionOptions {
  /** Called after the server confirms creation. */
  onSuccess?: (result: QuizVersionSummary) => void;
  /** Called when the server rejects the creation. */
  onError?: (apiError: ApiError) => void;
}

/**
 * `useCreateVersion()` return shape.
 *
 * `createVersion()` resolves with the created version's `QuizVersionSummary`,
 * or `null` if the submission was skipped (in-flight guard, etc.).
 * Callers check `error` for the rejection reason.
 */
export interface UseCreateVersionReturn {
  /**
   * Create a new quiz version. Resolves with `QuizVersionSummary` on success,
   * `null` on skip (e.g. in-flight guard). Rejects with `ApiError` on server error.
   */
  createVersion: (quizId: string, payload: CreateQuizVersionDto) => Promise<QuizVersionSummary | null>;
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
  // TODO (TKT-4.9.4): replace with Sentry.addBreadcrumb once wired.
  void _category;
  void _data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Quiz version creation mutation hook.
 *
 * @example
 * ```tsx
 * const { createVersion, isLoading, error } = useCreateVersion({
 *   onSuccess: (version) => router.push(`/my-quizzes/${quizId}/edit?version=${version.quizVersionId}`),
 * });
 *
 * await createVersion(quizId, { difficulty: 'medium', durationMs: 300000, passingScorePercent: 70, rewardXp: 100 });
 * ```
 */
export function useCreateVersion(
  options: UseCreateVersionOptions = {},
): UseCreateVersionReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Single-flight ref — prevents concurrent submit calls.
  const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

  const createVersion = useCallback(
    async (quizId: string, payload: CreateQuizVersionDto): Promise<QuizVersionSummary | null> => {
      // Guard: reuse the in-flight promise if one exists.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      const startedAt = Date.now();

      const core = (async (): Promise<QuizVersionSummary | null> => {
        try {
          const response = await createQuizVersion(quizId, payload);

          // Unwrap the WrappedDto envelope: { data: QuizVersionResponseDto }
          const version = (response as unknown as { data?: QuizVersionSummary }).data;
          if (!version) {
            throw new Error('Unexpected response shape from POST /quizzes/:id/versions');
          }

          emitBreadcrumb('phase4:4.9:create-version', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          onSuccess?.(version);
          return version;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.9:create-version', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });

            // Re-throw so callers can handle specific error codes.
            throw err;
          }

          // Non-ApiError — treat as unknown.
          emitBreadcrumb('phase4:4.9:create-version', {
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

  return { createVersion, isLoading, error, resetError };
}
