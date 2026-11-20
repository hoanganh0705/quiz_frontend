"use client";

import { useMemo } from "react";

import {
  ApiError,
  coerceToApiError,
  isApiError,
  useSingleWithRetry,
} from "@/lib/api";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";

import { getQuizStatsByIdOrSlug } from "@/features/quizzes/services/quizzes.service";
import type { QuizStatsResponseDto } from "@/lib/api/generated/schemas/quizStatsResponseDto";

export interface UseQuizStatsByIdOrSlugResult {
  stats: QuizStatsResponseDto | null;
  isLoading: boolean;
  noStats: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
  if (!isApiError(err)) return false;
  return err.status === 404;
}

export function useQuizStatsByIdOrSlug(
  idOrSlug: string | null,
): UseQuizStatsByIdOrSlugResult {
  const key = useMemo(
    () =>
      idOrSlug === null
        ? null
        : (["useQuizStatsByIdOrSlug", idOrSlug] as const),
    [idOrSlug],
  );

  const fetcher = useMemo<SingleFetcher<QuizStatsResponseDto>>(
    () =>
      async ({ signal }) => {
        let response: QuizStatsResponseDto | null;
        try {
          response = await getQuizStatsByIdOrSlug(idOrSlug!);
        } catch (err) {
          if (isApiError(err)) {
            throw err;
          }
          throw coerceToApiError(err);
        }
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        if (
          response === null ||
          typeof response !== "object" ||
          !("quizId" in response)
        ) {
          throw coerceToApiError(
            new Error("[useQuizStatsByIdOrSlug] malformed stats envelope"),
          );
        }
        return response;
      },
    [idOrSlug],
  );

  const query = useSingleWithRetry<QuizStatsResponseDto>({ key, fetcher });

  const noStats =
    !query.isLoading && query.error !== null && isNotFoundError(query.error);

  const error =
    query.error && !isNotFoundError(query.error) ? query.error : null;

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    noStats,
    error,
    retry: query.retry,
    isRetrying: query.isRetrying,
  };
}
