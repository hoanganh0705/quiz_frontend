/**
 * `useCreateVersionQuestion` — create a single question mutation hook.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.6.
 *
 * ## What this hook owns
 *
 * - Creates a single question via `POST /quizzes/:id/versions/:versionId/questions`.
 * - Returns the created question (author view with `isCorrect`).
 * - Classifies errors via `getQuestionEditorCopy` for user-facing messages.
 * - Handles 429 rate limiting with cooldown callback.
 *
 * ## Error handling
 *
 * - `422 QUIZ_VALIDATION_FAILED` → per-field errors via `fieldErrors`
 * - `409 QUIZ_QUESTION_POSITION_CONFLICT` → position conflict error
 * - `409 QUIZ_ANSWER_OPTION_POSITION_CONFLICT` → option position conflict
 * - `409 QUIZ_MULTIPLE_CORRECT_OPTIONS` → too many correct answers
 * - `429` → triggers `onRateLimit` callback with cooldown seconds
 * - `5xx` → generic error with retry available
 *
 * @see `createVersionQuestion` — service layer function
 * @see `getQuestionEditorCopy` — error message classification
 */

"use client";

import { useCallback, useRef, useState } from "react";

import { isApiError, ApiError } from "@/lib/api";

import { createVersionQuestion } from "@/features/quizzes/services/question-service";
import { getQuestionEditorCopy } from "@/features/quizzes/constants/question-errors";
import type {
  QuizAuthorQuestionDto,
  CreateQuestionDto,
} from "@/features/quizzes/types/author-dtos";
import type { UserCopyEntry } from "@/lib/api/error-codes";

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseCreateVersionQuestionOptions {
  /** Callback when question is created successfully. */
  onSuccess?: (question: QuizAuthorQuestionDto) => void;
  /** Callback when creation fails. */
  onError?: (error: ApiError) => void;
  /** Callback when rate limited (429). */
  onRateLimit?: (seconds: number) => void;
}

export interface UseCreateVersionQuestionReturn {
  /**
   * Create a question. Resolves with the created question on success,
   * `null` if skipped (e.g. in-flight guard), or throws `ApiError`.
   */
  createQuestion: (
    quizId: string,
    versionId: string,
    payload: CreateQuestionDto,
  ) => Promise<QuizAuthorQuestionDto | null>;
  /** `true` while a creation is in flight. */
  isSubmitting: boolean;
  /** The most recent error from the last submission. */
  error: ApiError | null;
  /** Classified error message for display. */
  errorCopy: UserCopyEntry | null;
  /** Field-level errors from 422 validation failures. */
  fieldErrors: Record<string, string>;
  /** Rate limit cooldown seconds remaining. */
  cooldownSeconds: number | null;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ───────────────────────────────────────────────────────────

function emitBreadcrumb(
  _category: string,
  _data: { status: string; durationMs: number; code?: string },
): void {
  // TODO: Replace with Sentry.addBreadcrumb once wired
  void _category;
  void _data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Create a single question for a quiz version.
 *
 * @example
 * ```tsx
 * const { createQuestion, isSubmitting, error, errorCopy, resetError } = useCreateVersionQuestion({
 *   onSuccess: (question) => {
 *     toast.success('Question added');
 *     queryClient.invalidateQueries({ queryKey: ['quiz', 'version', quizId, versionId, 'questions'] });
 *   },
 *   onError: (error) => {
 *     toast.error(errorCopy.body);
 *   },
 * });
 *
 * await createQuestion(quizId, versionId, { position: 5, questionText: '...', ... });
 * ```
 */
export function useCreateVersionQuestion(
  options: UseCreateVersionQuestionOptions = {},
): UseCreateVersionQuestionReturn {
  const { onSuccess, onError, onRateLimit } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  // Single-flight ref
  const inFlightRef = useRef<Promise<QuizAuthorQuestionDto | null> | null>(
    null,
  );

  // Classify error for user display
  const errorCopy = error ? getQuestionEditorCopy(error.code) : null;

  const createQuestion = useCallback(
    async (
      quizId: string,
      versionId: string,
      payload: CreateQuestionDto,
    ): Promise<QuizAuthorQuestionDto | null> => {
      // Guard: reuse the in-flight promise
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Guard: cooldown active
      if (cooldownSeconds !== null) {
        return null;
      }

      setIsSubmitting(true);
      setError(null);
      setFieldErrors({});
      const startedAt = Date.now();

      const core = (async (): Promise<QuizAuthorQuestionDto | null> => {
        try {
          const question = await createVersionQuestion(
            quizId,
            versionId,
            payload,
          );

          onSuccess?.(question);

          emitBreadcrumb("phase4:4.10:create-question", {
            status: "success",
            durationMs: Date.now() - startedAt,
          });

          return question;
        } catch (err) {
          if (isApiError(err)) {
            // Handle rate limiting
            if (err.status === 429) {
              // 60 second cooldown (standard)
              const seconds = 60;
              setCooldownSeconds(seconds);

              // Countdown timer
              const interval = setInterval(() => {
                setCooldownSeconds((prev) => {
                  if (prev === null || prev <= 1) {
                    clearInterval(interval);
                    return null;
                  }
                  return prev - 1;
                });
              }, 1000);

              onRateLimit?.(seconds);

              emitBreadcrumb("phase4:4.10:create-question", {
                status: "cooldown",
                durationMs: Date.now() - startedAt,
                code: err.code,
              });

              return null;
            }

            // Handle 422 validation errors
            if (err.status === 422) {
              // Extract field errors from the error response
              const errors: Record<string, string> = {};
              const detail = err.detail as unknown;

              // Try to parse field errors from the error detail
              if (typeof detail === "string") {
                // Simple case: single error message
                // Map common fields
                if (detail.toLowerCase().includes("questiontext")) {
                  errors.questionText = detail;
                } else if (detail.toLowerCase().includes("position")) {
                  errors.position = detail;
                } else {
                  errors._general = detail;
                }
              } else if (Array.isArray(detail)) {
                // Array of field errors
                for (const item of detail) {
                  if (typeof item === "object" && item !== null) {
                    const d = item as Record<string, unknown>;
                    const field = String(d.field ?? d.path ?? "_general");
                    const message = String(d.message ?? "Validation error");
                    errors[field] = message;
                  }
                }
              } else {
                errors._general = "Please check your answers";
              }

              setFieldErrors(errors);
            }

            setError(err);
            onError?.(err);

            emitBreadcrumb("phase4:4.10:create-question", {
              status: "error",
              durationMs: Date.now() - startedAt,
              code: err.code,
            });

            throw err;
          }

          // Non-ApiError
          const unknownErr =
            err instanceof Error ? err.message : "Unknown error";
          const apiErr = new ApiError({
            status: 0,
            code: "GLOBAL_UNKNOWN",
            message: unknownErr,
          });

          setError(apiErr);
          onError?.(apiErr);

          emitBreadcrumb("phase4:4.10:create-question", {
            status: "error",
            durationMs: Date.now() - startedAt,
            code: "GLOBAL_UNKNOWN",
          });

          throw apiErr;
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
    [cooldownSeconds, onSuccess, onError, onRateLimit],
  );

  const resetError = useCallback(() => {
    setError(null);
    setFieldErrors({});
    setCooldownSeconds(null);
  }, []);

  return {
    createQuestion,
    isSubmitting,
    error,
    errorCopy,
    fieldErrors,
    cooldownSeconds,
    resetError,
  };
}
