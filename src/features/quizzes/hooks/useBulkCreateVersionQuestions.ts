/**
 * `useBulkCreateVersionQuestions` — bulk create questions mutation hook.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.7.
 *
 * ## What this hook owns
 *
 * - Creates multiple questions via `POST /quizzes/:id/versions/:versionId/questions/bulk`.
 * - Returns per-item results including successes and failures.
 * - Tracks progress during bulk creation.
 * - Handles partial success (some fail, some succeed).
 *
 * ## Error handling
 *
 * - Partial failure: Returns `results[]` with per-item status codes
 * - Full success: Returns `ok: true` with all created question IDs
 * - Full failure: Returns `ok: false` with all error results
 * - 429: Triggers cooldown on submit
 *
 * ## Progress tracking
 *
 * - `progress.current` and `progress.total` are updated during bulk creation
 * - The progress format is "Adding X of Y..."
 *
 * @see `bulkCreateVersionQuestions` — service layer function
 * @see `BulkQuestionResultItem` — per-item result type
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';

import { bulkCreateVersionQuestions } from '@/features/quizzes/services/question-service';
import type {
  BulkCreateQuestionsDto,
  BulkQuestionResultItem,
  QuizAuthorQuestionDto,
} from '@/features/quizzes/types/author-dtos';

// ─── Public types ─────────────────────────────────────────────────────────

export interface BulkProgress {
  /** Current item being processed (1-based). */
  current: number;
  /** Total items in the bulk request. */
  total: number;
  /** Human-readable progress string. */
  label: string;
}

export interface BulkCreateResult {
  /** `true` if all questions were created successfully. */
  ok: boolean;
  /** Successfully created questions. */
  questions: QuizAuthorQuestionDto[];
  /** Per-item results (includes failures). */
  results: BulkQuestionResultItem[];
}

export interface UseBulkCreateVersionQuestionsOptions {
  /** Callback when bulk creation completes (any outcome). */
  onComplete?: (result: BulkCreateResult) => void;
  /** Callback when creation fails. */
  onError?: (error: ApiError) => void;
  /** Callback when rate limited (429). */
  onRateLimit?: (seconds: number) => void;
}

export interface UseBulkCreateVersionQuestionsReturn {
  /**
   * Bulk create questions. Resolves with per-item results on completion.
   */
  bulkCreate: (
    quizId: string,
    versionId: string,
    payload: BulkCreateQuestionsDto,
  ) => Promise<BulkCreateResult>;
  /** `true` while bulk creation is in flight. */
  isLoading: boolean;
  /** Current progress of the bulk operation. */
  progress: BulkProgress | null;
  /** Most recent bulk result. */
  result: BulkCreateResult | null;
  /** Rate limit cooldown seconds remaining. */
  cooldownSeconds: number | null;
  /** Clear the current result. */
  clearResult: () => void;
}

// ─── Telemetry ───────────────────────────────────────────────────────────

function emitBreadcrumb(
  _category: string,
  _data: {
    status: string;
    durationMs: number;
    code?: string;
    itemCount?: number;
    successCount?: number;
  },
): void {
  // TODO: Replace with Sentry.addBreadcrumb once wired
  void _category;
  void _data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Bulk create questions for a quiz version.
 *
 * @example
 * ```tsx
 * const { bulkCreate, isLoading, progress, result, clearResult } = useBulkCreateVersionQuestions({
 *   onComplete: (result) => {
 *     if (result.ok) {
 *       toast.success(`Added ${result.questions.length} questions`);
 *     } else {
 *       toast.error(`${result.results.filter(r => r.status !== 201).length} questions failed`);
 *     }
 *     queryClient.invalidateQueries({ queryKey: ['quiz', 'version', quizId, versionId, 'questions'] });
 *   },
 * });
 *
 * const handleBulkAdd = async (rows) => {
 *   const result = await bulkCreate(quizId, versionId, { questions: rows });
 *   // Handle per-item results...
 * };
 * ```
 */
export function useBulkCreateVersionQuestions(
  options: UseBulkCreateVersionQuestionsOptions = {},
): UseBulkCreateVersionQuestionsReturn {
  const { onComplete, onError, onRateLimit } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  // Single-flight ref
  const inFlightRef = useRef<Promise<BulkCreateResult> | null>(null);

  const bulkCreate = useCallback(
    async (
      quizId: string,
      versionId: string,
      payload: BulkCreateQuestionsDto,
    ): Promise<BulkCreateResult> => {
      // Guard: reuse the in-flight promise
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Guard: cooldown active
      if (cooldownSeconds !== null) {
        return {
          ok: false,
          questions: [],
          results: payload.questions.map((_, i) => ({
            index: i,
            status: 429,
            code: 'GLOBAL_RATE_LIMITED',
            message: 'Rate limited. Please wait before trying again.',
          })),
        };
      }

      setIsLoading(true);
      setProgress({
        current: 0,
        total: payload.questions.length,
        label: `Adding 0 of ${payload.questions.length}...`,
      });

      const startedAt = Date.now();
      const total = payload.questions.length;

      const core = (async (): Promise<BulkCreateResult> => {
        try {
          // Update progress to show starting
          setProgress({
            current: 0,
            total,
            label: `Adding 0 of ${total}...`,
          });

          const response = await bulkCreateVersionQuestions(quizId, versionId, payload);

          // Build the result
          const successCount = response.questions.length;
          const failedCount = total - successCount;

          const bulkResult: BulkCreateResult = {
            ok: failedCount === 0,
            questions: response.questions,
            results: response.results,
          };

          // Update progress to show completion
          setProgress({
            current: total,
            total,
            label: `Added ${successCount} of ${total} questions`,
          });

          setResult(bulkResult);
          onComplete?.(bulkResult);

          emitBreadcrumb('phase4:4.10:bulk-create-questions', {
            status: bulkResult.ok ? 'success' : 'partial',
            durationMs: Date.now() - startedAt,
            itemCount: total,
            successCount,
          });

          return bulkResult;
        } catch (err) {
          if (isApiError(err)) {
            // Handle rate limiting
            if (err.status === 429) {
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

              const rateLimitResult: BulkCreateResult = {
                ok: false,
                questions: [],
                results: payload.questions.map((_, i) => ({
                  index: i,
                  status: 429,
                  code: 'GLOBAL_RATE_LIMITED',
                  message: `Rate limited. Please wait ${seconds} seconds.`,
                })),
              };

              setResult(rateLimitResult);
              onComplete?.(rateLimitResult);

              emitBreadcrumb('phase4:4.10:bulk-create-questions', {
                status: 'cooldown',
                durationMs: Date.now() - startedAt,
                code: err.code,
              });

              return rateLimitResult;
            }

            // Build error result for all items
            const errorResult: BulkCreateResult = {
              ok: false,
              questions: [],
              results: payload.questions.map((_, i) => ({
                index: i,
                status: err.status,
                code: err.code,
                message: err.detail ?? err.message,
              })),
            };

            setResult(errorResult);
            onError?.(err);
            onComplete?.(errorResult);

            emitBreadcrumb('phase4:4.10:bulk-create-questions', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
              itemCount: total,
            });

            return errorResult;
          }

          // Non-ApiError
          const errorResult: BulkCreateResult = {
            ok: false,
            questions: [],
            results: payload.questions.map((_, i) => ({
              index: i,
              status: 0,
              code: 'GLOBAL_UNKNOWN',
              message: err instanceof Error ? err.message : 'Unknown error',
            })),
          };

          setResult(errorResult);
          onComplete?.(errorResult);

          emitBreadcrumb('phase4:4.10:bulk-create-questions', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
            itemCount: total,
          });

          return errorResult;
        }
      })();

      inFlightRef.current = core;

      try {
        return await core;
      } finally {
        inFlightRef.current = null;
        setIsLoading(false);
        setProgress(null);
      }
    },
    [cooldownSeconds, onComplete, onError, onRateLimit],
  );

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    bulkCreate,
    isLoading,
    progress,
    result,
    cooldownSeconds,
    clearResult,
  };
}
