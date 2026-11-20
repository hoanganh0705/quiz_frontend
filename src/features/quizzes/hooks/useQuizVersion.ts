"use client";

import { useMemo } from "react";

import { ApiError, isApiError, useSingleWithRetry } from "@/lib/api";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";

import { getQuizVersionDetail } from "@/features/quizzes/services/quizzes.service";
import {
  quizVersionKey,
  type QuizVersionDetail,
} from "@/features/quizzes/types/quiz-version.types";

export interface UseQuizVersionResult {
  data: QuizVersionDetail | null;

  isLoading: boolean;

  error: ApiError | null;

  notFound: boolean;

  isDraft: boolean;

  isPublished: boolean;

  retry: () => Promise<void>;
}

export function useQuizVersion(
  quizId: string | null,
  versionId: string | null,
): UseQuizVersionResult {
  const key = useMemo(
    () =>
      quizId !== null && versionId !== null
        ? quizVersionKey(quizId, versionId)
        : null,
    [quizId, versionId],
  );

  const fetcher = useMemo<SingleFetcher<QuizVersionDetail>>(
    () =>
      async ({ signal }) => {
        if (!quizId || !versionId) {
          throw new DOMException(
            "quizId and versionId are required",
            "AbortError",
          );
        }

        const startedAt = Date.now();

        try {
          const response = await getQuizVersionDetail(quizId, versionId);

          emitBreadcrumb("phase4:4.9:version-detail", {
            status: "success",
            durationMs: Date.now() - startedAt,
          });

          const data = (response as unknown as { data?: QuizVersionDetail })
            .data;
          if (!data) {
            throw new Error("Unexpected response shape");
          }
          return data;
        } catch (err) {
          if (isApiError(err)) {
            emitBreadcrumb("phase4:4.9:version-detail", {
              status: "error",
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            throw err;
          }
          emitBreadcrumb("phase4:4.9:version-detail", {
            status: "error",
            durationMs: Date.now() - startedAt,
            code: "GLOBAL_UNKNOWN",
          });
          throw err;
        }
      },
    [quizId, versionId],
  );

  const query = useSingleWithRetry<QuizVersionDetail>({
    key,
    fetcher,
  });

  const isNotFoundError = query.error !== null && query.error.status === 404;

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error !== null && !isNotFoundError ? query.error : null,
    notFound: isNotFoundError,
    isDraft: query.data?.status === "draft",
    isPublished: query.data?.status === "published",
    retry: query.retry,
  };
}

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  void category;
  void data;
}
