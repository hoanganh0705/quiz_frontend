"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";

import type { QuizAuthorView } from "@/features/quizzes/types/quiz-version.types";

export interface UseQuizAuthorViewResult {
  data: QuizAuthorView | null;

  isLoading: boolean;

  error: ApiError | null;

  notFound: boolean;

  retry: () => Promise<void>;
}

export function useQuizAuthorView(
  quizId: string | null,
): UseQuizAuthorViewResult {
  const key = useMemo(
    () => (quizId === null ? null : QUIZ_KEYS.author(quizId)),
    [quizId],
  );

  const fetcher = useMemo<SingleFetcher<QuizAuthorView>>(
    () => async () => {
      if (!quizId) {
        throw new DOMException("quizId is required", "AbortError");
      }

      const { getQuizByIdOrSlug } =
        await import("@/features/quizzes/services/quizzes.service");

      const quiz = await getQuizByIdOrSlug(quizId);
      if (!quiz) {
        throw new Error("Unexpected response shape");
      }

      return quiz as unknown as QuizAuthorView;
    },
    [quizId],
  );

  const query = useSingleWithRetry<QuizAuthorView>({
    key,
    fetcher,
  });

  const retry = useCallback(async () => {
    await query.retry();
  }, [query]);

  const isNotFoundError = query.error !== null && query.error.status === 404;

  const isForbiddenError = query.error !== null && query.error.status === 403;

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error:
      isForbiddenError || (query.error !== null && !isNotFoundError)
        ? query.error
        : null,
    notFound: isNotFoundError,
    retry,
  };
}
