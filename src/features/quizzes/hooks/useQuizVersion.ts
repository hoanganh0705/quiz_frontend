"use client";

import { useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";
import type { SingleFetcher } from "@/lib/api/use-single-with-retry";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { getQuizVersionDetail } from "@/features/quizzes/services/quizzes.service";

import type { QuizVersionDetail } from "@/features/quizzes/types/quiz-version.types";

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
        ? QUIZ_KEYS.version(quizId, versionId)
        : null,
    [quizId, versionId],
  );

  const fetcher = useMemo<SingleFetcher<QuizVersionDetail>>(
    () => async () => {
      if (!quizId || !versionId) {
        throw new DOMException(
          "quizId and versionId are required",
          "AbortError",
        );
      }

      const response = await getQuizVersionDetail(quizId, versionId);
      const unwrapped = inspectEnvelope<QuizVersionDetail>(response);
      const data = unwrapped.kind === "envelope" ? unwrapped.value : null;
      if (!data) {
        throw new Error("Unexpected response shape");
      }
      return data;
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
