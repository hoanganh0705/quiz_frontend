/**
 * `useCreateQuiz` — quiz creation mutation hook.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-B1.
 *
 * ## What this hook owns
 *
 * The `POST /quizzes` write path:
 *
 *   1. Transforms `QuizCreateFormValues` (with `tagSlugs`) into
 *      `CreateQuizDto` (with `tagIds`).
 *   2. Calls `createQuiz()` from `quizzes.service.ts`.
 *   3. Unwraps the `WrappedDto` envelope to extract the `QuizResponseDto`.
 *   4. Returns `{ id, slug }` on success; surfaces typed errors on failure.
 *
 * ## Error surfacing
 *
 * Errors are NOT swallowed. The hook propagates the raw `ApiError` so
 * callers can read `apiError.code`. The caller (typically `CreateQuizForm`)
 * uses `useQuizForm`'s `lastError` mechanism to surface inline field
 * errors (e.g. `QUIZ_SLUG_CONFLICT` → slug field error).
 *
 * ## Tag resolution
 *
 * The hook accepts pre-resolved `tagIds` from `useTagSlugsToIds` to avoid
 * the complexity of async resolution inside the submit handler. If callers
 * prefer inline resolution, they can call `useTagSlugsToIds().resolve(slugs)`
 * before calling `submit()`.
 *
 * ## Single-flight
 *
 * An in-flight ref prevents concurrent submit calls from hitting the API
 * twice. The returned `submit` function reuses the in-flight promise if
 * a submission is already pending.
 *
 * @see useQuizForm — the form primitive that owns submission orchestration.
 * @see createQuiz — the service layer function (Epic 4.1).
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import type { CreateQuizDto } from '@/lib/api/generated/schemas';

import { createQuiz } from '@/features/quizzes/services/quizzes.service';
import type { QuizCreateFormValues } from '@/lib/forms';
import type {
  CreateQuizSuccessResult,
  SlugAvailabilityResult,
  TagResolutionResult,
} from '@/features/quizzes/types/quiz-create-form.types';

// ─── Public types ───────────────────────────────────────────────────────────────

export interface UseCreateQuizOptions {
  /** Called after the server confirms creation. */
  onSuccess?: (result: CreateQuizSuccessResult) => void;
  /** Called when the server rejects the creation. */
  onError?: (apiError: ApiError) => void;
}

/**
 * `useCreateQuiz()` return shape.
 *
 * `submit()` resolves with the created quiz's `id` and `slug`, or `null`
 * if the submission was skipped (in-flight guard, readonly mode, etc.).
 * Callers check `error` for the rejection reason.
 */
export interface UseCreateQuizReturn {
  /**
   * Submit the form. Resolves with `{ id, slug }` on success, `null` on
   * skip (e.g. in-flight guard). Rejects with `ApiError` on server error.
   */
  submit: (
    values: QuizCreateFormValues,
    options?: {
      /**
       * Pre-resolved tag UUIDs. If omitted, `tagSlugs` from `values`
       * is used as-is (callers should resolve slugs beforehand via
       * `useTagSlugsToIds`).
       */
      resolvedTagIds?: string[];
      /** Skip the acknowledgement check. Defaults to `false`. */
      skipAcknowledgements?: boolean;
    },
  ) => Promise<CreateQuizSuccessResult | null>;
  /** `true` while a submission is in flight. */
  isSubmitting: boolean;
  /** The most recent `ApiError` from the last submission. `null` otherwise. */
  error: ApiError | null;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ───────────────────────────────────────────────────────────────

function emitBreadcrumb(
  _category: string,
  _data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (TKT-4.8-B1): replace with Sentry.addBreadcrumb once wired.
  void _category;
  void _data;
}

// ─── Submit payload builder ─────────────────────────────────────────────────

/**
 * Build the `CreateQuizDto` payload from form values.
 *
 * Strips the form-only fields (`tagSlugs`, `acknowledgements`) and
 * injects the resolved `tagIds`.
 *
 * Note: `imageUrl` is expected to be a pre-signed URL or the final
 * CDN URL. `<ImageUploadField />` stores a data URL in the form; the
 * submit handler is responsible for swapping it for a signed URL before
 * calling this function. For Phase 4, we accept the data URL as-is
 * (the backend may accept data URLs in early iterations).
 */
function buildPayload(
  values: QuizCreateFormValues,
  resolvedTagIds?: string[],
): CreateQuizDto {
  return {
    title: values.title,
    description: values.description ?? undefined,
    slug: values.slug ?? undefined,
    requirements: values.requirements ?? undefined,
    imageUrl: values.imageUrl ?? undefined,
    isFeatured: values.isFeatured ?? undefined,
    isHidden: values.isHidden ?? undefined,
    categoryId: values.categoryId ?? undefined,
    tagIds: resolvedTagIds ?? undefined,
    initialVersion: values.initialVersion,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Quiz creation mutation hook.
 *
 * @example
 * ```tsx
 * const { submit, isSubmitting, error } = useCreateQuiz({
 *   onSuccess: (result) => router.push(`/my-quizzes/${result.id}/edit`),
 * });
 *
 * await submit(values, { resolvedTagIds: ['uuid-1', 'uuid-2'] });
 * ```
 */
export function useCreateQuiz(
  options: UseCreateQuizOptions = {},
): UseCreateQuizReturn {
  const { onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Single-flight ref — prevents concurrent submit calls.
  const inFlightRef = useRef<Promise<CreateQuizSuccessResult | null> | null>(null);

  const submit = useCallback(
    async (
      values: QuizCreateFormValues,
      opts?: {
        resolvedTagIds?: string[];
        skipAcknowledgements?: boolean;
      },
    ): Promise<CreateQuizSuccessResult | null> => {
      // Guard: reuse the in-flight promise if one exists.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Guard: acknowledgement check (form-only safeguard).
      if (
        !opts?.skipAcknowledgements &&
        !values.acknowledgements
      ) {
        // This should not happen if the form validates before calling submit.
        // Treat as a no-op success to avoid surfacing a confusing error.
        return null;
      }

      setIsSubmitting(true);
      setError(null);
      const startedAt = Date.now();

      const core = (async (): Promise<CreateQuizSuccessResult | null> => {
        try {
          const payload = buildPayload(values, opts?.resolvedTagIds);
          const response = await createQuiz(payload);

          // Unwrap the WrappedDto envelope: { data: QuizResponseDto, meta: … }
          const quiz = (response as unknown as { data?: { quizId: string; slug: string } }).data;
          if (!quiz?.quizId) {
            // Malformed response — surface as an unknown error.
            throw new Error('Unexpected response shape from POST /quizzes');
          }

          const result: CreateQuizSuccessResult = {
            id: quiz.quizId,
            slug: quiz.slug,
          };

          onSuccess?.(result);

          emitBreadcrumb('phase4:4.8:create-quiz', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });

          return result;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.8:create-quiz', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });

            // Re-throw so the form's submit handler can classify via
            // useQuizForm's error surfacing mechanism.
            throw err;
          }

          // Non-ApiError — treat as unknown.
          const unknownErr = err instanceof Error ? err.message : 'Unknown error';
          emitBreadcrumb('phase4:4.8:create-quiz', {
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
        setIsSubmitting(false);
      }
    },
    [onSuccess, onError],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return { submit, isSubmitting, error, resetError };
}

// Re-export types for convenience in tests and consumers.
export type { SlugAvailabilityResult, TagResolutionResult };
