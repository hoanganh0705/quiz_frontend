"use client";

import { useCallback, useRef, useState } from "react";

import { isApiError, type ApiError } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";
import type { UpdateQuizVersionDto } from "@/lib/api/generated/schemas";

import { updateQuizVersion } from "@/features/quizzes/services/quizzes.service";
import type { QuizVersionSummary } from "@/features/quizzes/types/quiz-version.types";

export interface UseUpdateVersionOptions {
  onSuccess?: (result: QuizVersionSummary) => void;

  onError?: (apiError: ApiError) => void;
}

export interface UseUpdateVersionReturn {
  updateVersion: (
    quizId: string,
    versionId: string,
    payload: UpdateQuizVersionDto,
  ) => Promise<QuizVersionSummary | null>;

  isLoading: boolean;

  error: ApiError | null;

  resetError: () => void;
}

export function useUpdateVersion(
  options: UseUpdateVersionOptions = {},
): UseUpdateVersionReturn {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const inFlightRef = useRef<Promise<QuizVersionSummary | null> | null>(null);

  const updateVersion = useCallback(
    async (
      quizId: string,
      versionId: string,
      payload: UpdateQuizVersionDto,
    ): Promise<QuizVersionSummary | null> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);

      const core = (async (): Promise<QuizVersionSummary | null> => {
        try {
          const response = await updateQuizVersion(quizId, versionId, payload);
          const unwrapped = inspectEnvelope<QuizVersionSummary>(response);
          const version =
            unwrapped.kind === "envelope" ? unwrapped.value : null;
          if (!version) {
            throw new Error(
              "Unexpected response shape from PATCH /quizzes/:id/versions/:versionId",
            );
          }

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

  return { updateVersion, isLoading, error, resetError };
}
