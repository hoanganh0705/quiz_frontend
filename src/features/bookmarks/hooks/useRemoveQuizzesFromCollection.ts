"use client";

import { useCallback, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";
import { getUserCopy } from "@/lib/api/error-codes";
import { useOptimisticMutation } from "@/lib/api/useOptimisticMutation";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  BulkOperationValidationError,
  removeQuizzesFromCollectionBulk,
} from "@/features/bookmarks/services";

import { collectionQuizzesQueryKey } from "./useCollectionInvalidation";

import type {
  BulkOperationResult,
  BulkRemoveResult,
  CollectionQuiz,
} from "@/features/bookmarks/types";
import type { CursorPage } from "@/lib/api/use-cursor-paginated.types";
import type { OptimisticMutationResult } from "@/lib/api/useOptimisticMutation";

function filterRemovedQuizzes(
  current: unknown,
  removedSet: ReadonlySet<string>,
): unknown {
  if (Array.isArray(current)) {
    return (current as CollectionQuiz[]).filter(
      (quiz) => !removedSet.has(quiz.quizId),
    );
  }

  if (
    current &&
    typeof current === "object" &&
    "items" in current &&
    Array.isArray((current as CursorPage<CollectionQuiz>).items)
  ) {
    const page = current as CursorPage<CollectionQuiz>;
    return {
      ...page,
      items: page.items.filter((quiz) => !removedSet.has(quiz.quizId)),
    };
  }

  return current;
}

export interface UseRemoveQuizzesFromCollectionOptions {
  onSuccess?: (result: BulkRemoveResult, quizIds: string[]) => void;

  onError?: (code: string) => void;
}

export type RemoveQuizzesMutationResult =
  OptimisticMutationResult<BulkRemoveResult> & {
    results?: BulkOperationResult[];
  };

export interface UseRemoveQuizzesFromCollectionReturn {
  removeQuizzes: (quizIds: string[]) => Promise<RemoveQuizzesMutationResult>;

  results: BulkOperationResult[];

  isLoading: boolean;

  isRemoving: boolean;

  isSuccess: boolean;

  isError: boolean;

  lastError: ReturnType<typeof getUserCopy> | null;

  lastApiError: ApiError | null;

  reset: () => void;
}

export function useRemoveQuizzesFromCollection(
  collectionId: string,
  options: UseRemoveQuizzesFromCollectionOptions = {},
): UseRemoveQuizzesFromCollectionReturn {
  const { onSuccess, onError } = options;

  const {
    mutate,
    lastResult,
    reset: resetOptimistic,
  } = useOptimisticMutation();

  const [results, setResults] = useState<BulkOperationResult[]>([]);

  const [lastApiError, setLastApiError] = useState<ApiError | null>(null);

  const removeQuizzes = useCallback(
    async (quizIds: string[]): Promise<RemoveQuizzesMutationResult> => {
      setLastApiError(null);
      setResults([]);

      if (quizIds.length < 1) {
        const error = ApiError.fromInput({
          status: 400,
          code: "BOOKMARK_VALIDATION",
          message: "At least 1 quiz ID is required",
        });
        setLastApiError(error);
        onError?.("BOOKMARK_VALIDATION");
        return { status: "reverted", apiError: error };
      }

      if (quizIds.length > 100) {
        const error = ApiError.fromInput({
          status: 400,
          code: "BOOKMARK_VALIDATION",
          message: "Maximum 100 quiz IDs allowed per operation",
        });
        setLastApiError(error);
        onError?.("BOOKMARK_VALIDATION");
        return { status: "reverted", apiError: error };
      }

      let capturedResults: BulkOperationResult[] = [];

      try {
        const result = await mutate({
          key: collectionQuizzesQueryKey(collectionId),
          optimisticData: (current) =>
            filterRemovedQuizzes(current, new Set(quizIds)),
          run: async () => {
            const response = await removeQuizzesFromCollectionBulk(
              collectionId,
              quizIds,
            );
            capturedResults = response.results;
            return response.summary;
          },
          onSuccess: (summary) => {
            setResults(capturedResults);
            void getQueryClient().invalidateQueries({
              queryKey: collectionQuizzesQueryKey(collectionId),
            });
            onSuccess?.(summary, quizIds);
          },
          onError: (apiError: ApiError | unknown) => {
            void getQueryClient().invalidateQueries({
              queryKey: collectionQuizzesQueryKey(collectionId),
            });
            const code = isApiError(apiError)
              ? apiError.code
              : "GLOBAL_UNKNOWN";
            if (isApiError(apiError)) {
              setLastApiError(apiError);
            }
            onError?.(code);
          },
        });

        if (result.status === "success") {
          return { ...result, results: capturedResults };
        }

        return result;
      } catch (err) {
        if (err instanceof BulkOperationValidationError) {
          const error = ApiError.fromInput({
            status: 400,
            code: "BOOKMARK_VALIDATION",
            message: err.message,
          });
          setLastApiError(error);
          onError?.("BOOKMARK_VALIDATION");
          return { status: "reverted", apiError: error };
        }

        const code = isApiError(err) ? err.code : "GLOBAL_UNKNOWN";
        const error = isApiError(err)
          ? err
          : ApiError.fromInput({
              status: 0,
              code: "GLOBAL_UNKNOWN",
              message: err instanceof Error ? err.message : String(err),
            });
        setLastApiError(error);
        onError?.(code);
        return { status: "reverted", apiError: error };
      }
    },
    [collectionId, mutate, onSuccess, onError],
  );

  const isPending = lastResult !== null && lastResult.status === "pending";
  const isSuccess = lastResult !== null && lastResult.status === "success";
  const isError = lastResult !== null && lastResult.status === "reverted";
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
