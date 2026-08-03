/**
 * `useRemoveQuizzesFromCollection.ts` — bulk remove quizzes from a collection with optimistic updates.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B2-3.
 *
 * ## What this hook owns
 *
 *   - Bulk remove operation with optimistic updates.
 *   - Input validation (1-100 quiz IDs).
 *   - Immediate UI update (optimistic) followed by server confirmation.
 *   - Rollback on failure.
 *   - Cache invalidation after successful mutation.
 *   - Cross-tab broadcast for real-time sync.
 *
 * ## API
 *
 *   - `removeQuizzes(quizIds)` — triggers the bulk remove mutation with optimistic update.
 *   - `results` — per-item results after a successful mutation.
 *   - `isLoading` — true while the mutation is in flight.
 *   - `isRemoving` — true while the optimistic update is being applied.
 *   - `error` — any error that occurred.
 *
 * ## Optimistic Update Flow
 *
 *   1. User clicks remove → immediately remove quizzes from UI (optimistic).
 *   2. Server confirms → invalidate cache.
 *   3. Server rejects → rollback: re-add quizzes to UI.
 *
 * ## Validation
 *
 *   - Minimum 1 quiz ID required.
 *   - Maximum 100 quiz IDs allowed per Epic 4.7 spec.
 */

'use client';

import { useCallback, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';
import {
  useOptimisticMutation,
  type OptimisticMutationResult,
} from '@/lib/api/useOptimisticMutation';
import { removeQuizzesFromCollectionBulk, BulkOperationValidationError } from '@/features/bookmarks/services';
import type { BulkOperationResult, BulkRemoveResult, CollectionQuiz } from '@/features/bookmarks/types';
import { collectionQuizzesSWRKey } from './useCollectionInvalidation';

// ─── Public types ───────────────────────────────────────────────────────────────

export interface UseRemoveQuizzesFromCollectionOptions {
  /** Called after the server confirms the removal. */
  onSuccess?: (result: BulkRemoveResult, quizIds: string[]) => void;
  /** Called when the server rejects the removal. */
  onError?: (code: string) => void;
}

export interface UseRemoveQuizzesFromCollectionReturn {
  /** Trigger the bulk remove operation with optimistic update. */
  removeQuizzes: (quizIds: string[]) => Promise<OptimisticMutationResult<BulkRemoveResult>>;
  /** Per-item results from the last bulk remove. */
  results: BulkOperationResult[];
  /** `true` while a mutation is in flight. */
  isLoading: boolean;
  /** `true` while the optimistic update is being applied. */
  isRemoving: boolean;
  /** `true` after a successful mutation. */
  isSuccess: boolean;
  /** `true` after a rejected mutation (with rollback). */
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
 * Bulk remove quizzes from a collection with optimistic updates.
 *
 * @param collectionId - The collection UUID to remove quizzes from.
 * @param options - Callbacks for success/error.
 *
 * @example
 * ```tsx
 * const { removeQuizzes, results, isLoading } = useRemoveQuizzesFromCollection(collectionId, {
 *   onSuccess: (result) => toast.success(`Removed ${result.removedCount} quizzes`),
 * });
 *
 * await removeQuizzes(['quiz-1', 'quiz-2']);
 * ```
 */
export function useRemoveQuizzesFromCollection(
  collectionId: string,
  options: UseRemoveQuizzesFromCollectionOptions = {},
): UseRemoveQuizzesFromCollectionReturn {
  const { onSuccess, onError } = options;

  const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
    useOptimisticMutation();

  /** Per-item results from the last bulk remove. */
  const [results, setResults] = useState<BulkOperationResult[]>([]);

  /** Raw error from the last failed mutation. */
  const [lastApiError, setLastApiError] = useState<ApiError | null>(null);

  const removeQuizzes = useCallback(
    async (quizIds: string[]): Promise<OptimisticMutationResult<BulkRemoveResult>> => {
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
          // Optimistic data: remove the quizzes from the list immediately
          key: collectionQuizzesSWRKey(collectionId),
          optimisticData: (current): CollectionQuiz[] => {
            const quizzes = (current as CollectionQuiz[]) ?? [];
            // Filter out the quizzes being removed
            const removedSet = new Set(quizIds);
            return quizzes.filter((quiz) => !removedSet.has(quiz.quizId));
          },
          run: async () => {
            const response = await removeQuizzesFromCollectionBulk(collectionId, quizIds);
            return response.summary;
          },
          onSuccess: (summary) => {
            // Get the per-item results
            removeQuizzesFromCollectionBulk(collectionId, quizIds).then((response) => {
              setResults(response.results);
            });
            // Revalidate the cache
            void globalMutate(collectionQuizzesSWRKey(collectionId), undefined, { revalidate: true });
            onSuccess?.(summary, quizIds);
          },
          onError: (apiError: ApiError | unknown) => {
            // Rollback: re-fetch the data
            void globalMutate(collectionQuizzesSWRKey(collectionId), undefined, { revalidate: true });
            const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
            if (isApiError(apiError)) {
              setLastApiError(apiError);
            }
            onError?.(code);
          },
        });

        // Get the per-item results after successful mutation
        if (result.status === 'success' && result.data) {
          const response = await removeQuizzesFromCollectionBulk(collectionId, quizIds);
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
    [collectionId, mutate, onSuccess, onError],
  );

  const isPending = lastResult !== null && lastResult.status === 'pending';
  const isSuccess = lastResult !== null && lastResult.status === 'success';
  const isError = lastResult !== null && lastResult.status === 'reverted';
  const isRemoving = isPending;

  const lastError: ReturnType<typeof getUserCopy> | null =
    lastApiError !== null ? getUserCopy(lastApiError.code) : null;

  const reset = useCallback(() => {
    resetOptimistic();
    setLastApiError(null);
    setResults([]);
  }, [resetOptimistic]);

  return {
    removeQuizzes,
    results,
    isLoading: isPending,
    isRemoving,
    isSuccess,
    isError,
    lastError,
    lastApiError,
    reset,
  };
}
