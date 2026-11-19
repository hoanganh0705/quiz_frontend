"use client";

import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

import { getQuizzesRelated } from "@/features/quizzes/services/quizzes.service";

export const QUIZ_RELATED_LIMIT = 4 as const;

export interface UseQuizRelatedResult {
  items: readonly QuizListItemDto[];
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
}

const DISABLED_RESULT: UseQuizRelatedResult = Object.freeze({
  items: Object.freeze([]) as readonly QuizListItemDto[],
  isLoading: false,
  error: null,
  notFound: false,
});

export function useQuizRelated(idOrSlug: string | null): UseQuizRelatedResult {
  const key =
    idOrSlug === null
      ? null
      : (["useQuizRelated", idOrSlug, { limit: QUIZ_RELATED_LIMIT }] as const);

  const { data, error, isLoading } = useQuery<readonly QuizListItemDto[]>(
    {
      queryKey: key ?? ["useQuizRelated", "disabled"],
      queryFn: async () => {
        const result = await getQuizzesRelated(idOrSlug as string, {
          limit: QUIZ_RELATED_LIMIT,
        });

        return (result.data ?? []) as readonly QuizListItemDto[];
      },
      enabled: idOrSlug !== null,
    },
    getQueryClient(),
  );

  if (idOrSlug === null) return DISABLED_RESULT;

  const notFound = !isLoading && isApiError(error) && error.status === 404;
  const surfacedError =
    !isLoading && error && !(isApiError(error) && error.status === 404)
      ? (error as ApiError)
      : null;

  return {
    items: data ?? ([] as readonly QuizListItemDto[]),
    isLoading,
    error: surfacedError,
    notFound,
  };
}
