/**
 * `useAddQuizzesToCollection.ts` — bulk add quizzes to a collection.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B2-2.
 *
 * ## What this hook owns
 *
 *   - Bulk add operation with per-item result handling.
 *   - Input validation (1-100 quiz IDs).
 *   - Cache invalidation after successful mutation.
 *   - Cross-tab broadcast for real-time sync.
 *
 * ## API
 *
 *   - `addQuizzes(quizIds)` — triggers the bulk add mutation.
 *   - `results` — per-item results after a successful mutation.
 *   - `isLoading` — true while the mutation is in flight.
 *   - `error` — any error that occurred.
 *
 * ## Validation
 *
 *   - Minimum 1 quiz ID required.
 *   - Maximum 100 quiz IDs allowed per Epic 4.7 spec.
 *
 * ## Cache Invalidation
 *
 *   - Invalidates `collectionQuizzesSWRKey(collectionId)` after success.
 *   - Broadcasts to other tabs via `broadcastCollectionQuizzesInvalidated`.
 */

'use client';

import { useCallback, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';
import {
  useOptimisticMutation,
  type OptimisticMutationResult,
} from '@/lib/api/useOptimisticMutation';
import { addQuizzesToCollectionBulk, BulkOperationValidationError } from '@/features/bookmarks/services';
import type { BulkOperationResult, BulkAddResult } from '@/features/bookmarks/types';
import {
  useCollectionInvalidation,
} from './useCollectionInvalidation';

// ─── Public types ───────────────────────────────────────────────────────────────

export interface UseAddQuizzesToCollectionOptions {
  /** Called after the server confirms the addition. */
  onSuccess?: (result: BulkAddResult, quizIds: string[]) => void;
  /** Called when the server rejects the addition. */
  onError?: (code: string) => void;
}

export interface UseAddQuizzesToCollectionReturn {
  /** Trigger the bulk add operation. */
  addQuizzes: (quizIds: string[]) => Promise<OptimisticMutationResult<BulkAddResult>>;
  /** Per-item results from the last bulk add. */
  results: BulkOperationResult[];
  /** `true` while a mutation is in flight. */
  isLoading: boolean;
  /** `true` after a successful mutation. */
  isSuccess: boolean;
  /** `true` after a rejected mutation. */
  isError: boolean;
  /** The typed user-copy entry for the last rejected error. `null` otherwise. */
  lastError: ReturnType<typeof getUserCopy> | null;
  /** The raw `ApiError` from the last rejected mutation. `null` otherwise. */
  lastApiError: ApiError | null;
  /** Clear `lastError` and reset the status to idle. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Bulk add quizzes to a collection.
 *
 * @param collectionId - The collection UUID to add quizzes to.
 * @param options - Callbacks for success/error.
 *
 * @example
 * ```tsx
 * const { addQuizzes, results, isLoading } = useAddQuizzesToCollection(collectionId, {
 *   onSuccess: (result) => toast.success(`Added ${result.addedCount} quizzes`),
 * });
 *
 * await addQuizzes(['quiz-1', 'quiz-2', 'quiz-3']);
 * ```
 */
export function useAddQuizzesToCollection(
  collectionId: string,
  options: UseAddQuizzesToCollectionOptions = {},
): UseAddQuizzesToCollectionReturn {
  const { onSuccess, onError } = options;

  const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
    useOptimisticMutation();

  const { invalidateQuizzes } = useCollectionInvalidation(collectionId);

  /** Per-item results from the last bulk add. */
  const [results, setResults] = useState<BulkOperationResult[]>([]);

  /** Raw error from the last failed mutation. */
  const [lastApiError, setLastApiError] = useState<ApiError | null>(null);

  const addQuizzes = useCallback(
    async (quizIds: string[]): Promise<OptimisticMutationResult<BulkAddResult>> => {
      // Clear previous state
      setLastApiError(null);
      setResults([]);

      // Validate input
      if (quizIds.length < 1) {
        const error: ApiError = {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'At least 1 quiz ID is required',
        };
        setLastApiError(error);
        onError?.('VALIDATION_ERROR');
        return { status: 'reverted', apiError: error };
      }

      if (quizIds.length > 100) {
        const error: ApiError = {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Maximum 100 quiz IDs allowed per operation',
        };
        setLastApiError(error);
        onError?.('VALIDATION_ERROR');
        return { status: 'reverted', apiError: error };
      }

      try {
        const result = await mutate({
          // No optimistic data needed for bulk add (it doesn't affect the list view directly)
          key: null,
          run: async () => {
            const response = await addQuizzesToCollectionBulk(collectionId, quizIds);
            return response.summary;
          },
          onSuccess: (summary) => {
            // Invalidate the quizzes cache to refresh the list
            invalidateQuizzes();
            // Get the per-item results from the service
            addQuizzesToCollectionBulk(collectionId, quizIds).then((response) => {
              setResults(response.results);
            });
            onSuccess?.(summary, quizIds);
          },
          onError: (apiError: ApiError | unknown) => {
            const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
            if (isApiError(apiError)) {
              setLastApiError(apiError);
            }
            onError?.(code);
          },
        });

        // Get the per-item results after successful mutation
        if (result.status === 'success' && result.data) {
          const response = await addQuizzesToCollectionBulk(collectionId, quizIds);
          setResults(response.results);
        }

        return result;
      } catch (err) {
        // Handle validation errors (synchronous throws)
        if (err instanceof BulkOperationValidationError) {
          const error: ApiError = {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: err.message,
          };
          setLastApiError(error);
          onError?.('VALIDATION_ERROR');
          return { status: 'reverted', apiError: error };
        }

        // Handle other errors
        const code = isApiError(err) ? err.code : 'GLOBAL_UNKNOWN';
        const error = isApiError(err) ? err : {
          status: 0,
          code: 'GLOBAL_UNKNOWN',
          message: err instanceof Error ? err.message : String(err),
        } as ApiError;
        setLastApiError(error);
        onError?.(code);
        return { status: 'reverted', apiError: error };
      }
    },
    [collectionId, mutate, onSuccess, onError, invalidateQuizzes],
  );

  const isPending = lastResult !== null && lastResult.status === 'pending';
  const isSuccess = lastResult !== null && lastResult.status === 'success';
  const isError = lastResult !== null && lastResult.status === 'reverted';

  const lastError: ReturnType<typeof getUserCopy> | null =
    lastApiError !== null ? getUserCopy(lastApiError.code) : null;

  const reset = useCallback(() => {
    resetOptimistic();
    setLastApiError(null);
    setResults([]);
  }, [resetOptimistic]);

  return {
    addQuizzes,
    results,
    isLoading: isPending,
    isSuccess,
    isError,
    lastError,
    lastApiError,
    reset,
  };
}
