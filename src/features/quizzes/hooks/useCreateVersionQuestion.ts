"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";

import { useCooldownTimer } from "@/shared/hooks/use-cooldown-timer";

import { getQuestionEditorCopy } from "@/features/quizzes/constants/question-errors";
import { createVersionQuestion } from "@/features/quizzes/services/quizzes.service";

import type { UserCopyEntry } from "@/lib/api/error-codes";
import type {
  CreateQuestionDto,
  QuizAuthorQuestionDto,
} from "@/features/quizzes/types/author-dtos";

export interface UseCreateVersionQuestionOptions {
  onSuccess?: (question: QuizAuthorQuestionDto) => void;
  onError?: (error: ApiError) => void;
  onRateLimit?: (seconds: number) => void;
}

export interface UseCreateVersionQuestionReturn {
  createQuestion: (
    quizId: string,
    versionId: string,
    payload: CreateQuestionDto,
  ) => Promise<QuizAuthorQuestionDto | null>;
  isSubmitting: boolean;
  error: ApiError | null;
  errorCopy: UserCopyEntry | null;
  fieldErrors: Record<string, string>;
  cooldownSeconds: number | null;
  resetError: () => void;
}

const RATE_LIMIT_SECONDS = 60;

export function useCreateVersionQuestion(
  options: UseCreateVersionQuestionOptions = {},
): UseCreateVersionQuestionReturn {
  const { onSuccess, onError, onRateLimit } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const cooldown = useCooldownTimer();
  const inFlightRef = useRef<Promise<QuizAuthorQuestionDto | null> | null>(
    null,
  );

  const cooldownSeconds = cooldown.isActive ? cooldown.remainingSeconds : null;
  const errorCopy = error ? getQuestionEditorCopy(error.code) : null;

  const createQuestion = useCallback(
    async (
      quizId: string,
      versionId: string,
      payload: CreateQuestionDto,
    ): Promise<QuizAuthorQuestionDto | null> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      if (cooldown.isActive) {
        return null;
      }

      setIsSubmitting(true);
      setError(null);
      setFieldErrors({});

      const core = (async (): Promise<QuizAuthorQuestionDto | null> => {
        try {
          const question = await createVersionQuestion(
            quizId,
            versionId,
            payload,
          );
          onSuccess?.(question);
          return question;
        } catch (err) {
          if (isApiError(err)) {
            if (err.status === 429) {
              cooldown.start(RATE_LIMIT_SECONDS * 1000);
              onRateLimit?.(RATE_LIMIT_SECONDS);
              return null;
            }

            if (err.status === 422) {
              const errors: Record<string, string> = {};
              const detail = err.detail as unknown;

              if (typeof detail === "string") {
                if (detail.toLowerCase().includes("questiontext")) {
                  errors.questionText = detail;
                } else if (detail.toLowerCase().includes("position")) {
                  errors.position = detail;
                } else {
                  errors._general = detail;
                }
              } else if (Array.isArray(detail)) {
                for (const item of detail) {
                  if (typeof item === "object" && item !== null) {
                    const d = item as Record<string, unknown>;
                    const field = String(d.field ?? d.path ?? "_general");
                    const message = String(d.message ?? "Validation error");
                    errors[field] = message;
                  }
                }
              } else {
                errors._general = "Please check your answers";
              }

              setFieldErrors(errors);
            }

            setError(err);
            onError?.(err);
            throw err;
          }

          const apiErr = coerceToApiError(err);
          setError(apiErr);
          onError?.(apiErr);
          throw apiErr;
        }
      })();

      inFlightRef.current = core;

      try {
        return await core;
      } finally {
        inFlightRef.current = null;
        setIsSubmitting(false);
      }
    },
    [cooldown, onSuccess, onError, onRateLimit],
  );

  const resetError = useCallback(() => {
    setError(null);
    setFieldErrors({});
    cooldown.stop();
  }, [cooldown]);

  return {
    createQuestion,
    isSubmitting,
    error,
    errorCopy,
    fieldErrors,
    cooldownSeconds,
    resetError,
  };
}
