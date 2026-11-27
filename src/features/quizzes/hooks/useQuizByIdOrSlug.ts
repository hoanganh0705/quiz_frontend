"use client";

import { useMemo } from "react";

import {
  ApiError,
  coerceToApiError,
  isApiError,
  useSingleWithRetry,
} from "@/lib/api";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { getQuizByIdOrSlug } from "@/features/quizzes/services/quizzes.service";
import {
  projectQuizToPlayerView,
  type PlayerQuizDetail,
} from "@/features/quizzes/lib/quiz-player-view";
import type { QuizResponseDto } from "@/lib/api/generated/schemas/quizResponseDto";

export interface UseQuizByIdOrSlugResult {
  quiz: PlayerQuizDetail | null;
  notFound: boolean;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
  if (!isApiError(err)) return false;
  return err.status === 404;
}

export function useQuizByIdOrSlug(
  idOrSlug: string | null,
): UseQuizByIdOrSlugResult {
  const key = useMemo(
    () => (idOrSlug === null ? null : QUIZ_KEYS.detail(idOrSlug)),
    [idOrSlug],
  );

  const fetcher = useMemo<SingleFetcher<PlayerQuizDetail>>(
    () =>
      async ({ signal }) => {
        let response: QuizResponseDto | null;
        try {
          response = await getQuizByIdOrSlug(idOrSlug!);
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
            new Error("[useQuizByIdOrSlug] malformed quiz detail envelope"),
          );
        }
        return projectQuizToPlayerView(response);
      },
    [idOrSlug],
  );

  const query = useSingleWithRetry<PlayerQuizDetail>({ key, fetcher });

  const notFound =
    !query.isLoading && query.error !== null && isNotFoundError(query.error);

  const error =
    query.error && !isNotFoundError(query.error) ? query.error : null;

  return {
    quiz: query.data ?? null,
    notFound,
    isLoading: query.isLoading,
    error,
    retry: query.retry,
    isRetrying: query.isRetrying,
  };
}
