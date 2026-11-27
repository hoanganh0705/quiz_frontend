"use client";

import { useCallback, useRef, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { isApiError, type ApiError } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import { publishQuizVersion } from "@/features/quizzes/services/quizzes.service";

import type { QuizVersionSummary } from "@/features/quizzes/types/quiz-version.types";

export interface UsePublishVersionOptions {
  onSuccess?: (result: QuizVersionSummary) => void;
  onError?: (apiError: ApiError) => void;
}

export interface UsePublishVersionReturn {
  publishVersion: (
    quizId: string,
    versionId: string,
  ) => Promise<QuizVersionSummary | null>;
  isLoading: boolean;
  error: ApiError | null;
  resetError: () => void;
}

export function usePublishVersion(
  options: UsePublishVersionOptions = {},
): UsePublishVersionReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

  const publishVersion = useCallback(
    async (
      quizId: string,
      versionId: string,
    ): Promise<QuizVersionSummary | null> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);

      const core = (async (): Promise<QuizVersionSummary | null> => {
        try {
          const response = await publishQuizVersion(quizId, versionId);
          const unwrapped = inspectEnvelope<QuizVersionSummary>(response);
          const version =
            unwrapped.kind === "envelope" ? unwrapped.value : null;
          if (!version) {
            throw new Error(
              "Unexpected response shape from POST /quizzes/:id/versions/:versionId/publish",
            );
          }

          const queryClient = getQueryClient();
          void queryClient.invalidateQueries({
            queryKey: QUIZ_KEYS.versions(quizId),
          });
          void queryClient.invalidateQueries({
            queryKey: QUIZ_KEYS.version(quizId, versionId),
          });
          void queryClient.invalidateQueries({
            queryKey: QUIZ_KEYS.author(quizId),
          });
          void queryClient.invalidateQueries({
            queryKey: QUIZ_KEYS.mineAll(),
          });
          void queryClient.invalidateQueries({
            queryKey: QUIZ_KEYS.detail(quizId),
          });
          void queryClient.invalidateQueries({
            queryKey: QUIZ_KEYS.aggregate(quizId),
          });

          onSuccess?.(version);
          return version;
        } catch (err) {
          if (isApiError(err)) {
            setError(err);
            onError?.(err);
            throw err;
          }
          throw err;
        }
      })();

      inFlightRef.current = core;

      try {
        return await core;
      } finally {
        inFlightRef.current = null;
        setIsLoading(false);
      }
    },
    [onSuccess, onError],
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return { publishVersion, isLoading, error, resetError };
}
