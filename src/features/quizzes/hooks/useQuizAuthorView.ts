"use client";

import { useCallback, useMemo } from "react";

import { ApiError, isApiError, useSingleWithRetry } from "@/lib/api";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";

import {
  quizAuthorKey,
  type QuizAuthorView,
} from "@/features/quizzes/types/quiz-version.types";

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
    () => (quizId === null ? null : quizAuthorKey(quizId)),
    [quizId],
  );

  const fetcher = useMemo<SingleFetcher<QuizAuthorView>>(
    () =>
      async ({ signal }) => {
        if (!quizId) {
          throw new DOMException("quizId is required", "AbortError");
        }

        const startedAt = Date.now();

        const { getQuizByIdOrSlug } =
          await import("@/features/quizzes/services/quizzes.service");

        try {
          const quiz = await getQuizByIdOrSlug(quizId);
          if (!quiz) {
            throw new Error("Unexpected response shape");
          }

          emitBreadcrumb("phase4:4.9:author-view", {
            status: "success",
            durationMs: Date.now() - startedAt,
          });

          return quiz as unknown as QuizAuthorView;
        } catch (err) {
          if (isApiError(err)) {
            emitBreadcrumb("phase4:4.9:author-view", {
              status: "error",
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            throw err;
          }
          emitBreadcrumb("phase4:4.9:author-view", {
            status: "error",
            durationMs: Date.now() - startedAt,
            code: "GLOBAL_UNKNOWN",
          });
          throw err;
        }
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

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  void category;
  void data;
}
