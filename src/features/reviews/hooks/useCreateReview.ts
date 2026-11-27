"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";

import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import { invalidateReviewCaches } from "@/features/reviews/query-keys";
import { createReview } from "@/features/reviews/services/reviews.service";

import type { CreateReviewDto } from "@/lib/api/generated/schemas";

export type CreateReviewOutcomeKind =
  | "success"
  | "attempt-required"
  | "conflict"
  | "validation"
  | "reverted";

export interface CreateReviewOutcome {
  kind: CreateReviewOutcomeKind;
  cause: ApiError | null;
}

export interface UseCreateReviewOptions {
  onSuccess?: () => void;
  onError?: (outcome: CreateReviewOutcome) => void;
}

export interface UseCreateReviewResult {
  submit: (payload: CreateReviewDto) => Promise<boolean>;
  isLoading: boolean;
  error: ApiError | null;
  lastOutcome: CreateReviewOutcome | null;
  reset: () => void;
}

export function useCreateReview(
  quizId: string,
  options: UseCreateReviewOptions = {},
): UseCreateReviewResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] = useState<CreateReviewOutcome | null>(
    null,
  );

  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const sessionId = useAuthSessionId();

  const handleSubmit = useCallback(
    async (payload: CreateReviewDto): Promise<boolean> => {
      if (!quizId) {
        const validationError = ApiError.fromInput({
          status: 0,
          code: "REVIEW_VALIDATION",
          message: "quizId is required to submit a review",
        });
        setError(validationError);
        const outcome: CreateReviewOutcome = {
          kind: "validation",
          cause: validationError,
        };
        setLastOutcome(outcome);
        onError?.(outcome);
        return false;
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      setLastOutcome(null);

      const core = (async (): Promise<boolean> => {
        try {
          await createReview(quizId, payload);

          await invalidateReviewCaches({
            quizId,
            sessionId,
          });

          setLastOutcome({ kind: "success", cause: null });
          onSuccess?.();
          return true;
        } catch (cause: unknown) {
          if (!isApiError(cause)) {
            const unknownError = ApiError.fromInput({
              status: 0,
              code: "GLOBAL_UNKNOWN",
              message: cause instanceof Error ? cause.message : String(cause),
            });
            setError(unknownError);
            const outcome: CreateReviewOutcome = {
              kind: "reverted",
              cause: unknownError,
            };
            setLastOutcome(outcome);
            onError?.(outcome);
            return false;
          }

          switch (cause.code) {
            case "REVIEW_ATTEMPT_REQUIRED": {
              await invalidateReviewCaches({
                quizId,
                sessionId,
              });
              setError(cause);
              const outcome: CreateReviewOutcome = {
                kind: "attempt-required",
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case "REVIEW_CONFLICT": {
              await invalidateReviewCaches({
                quizId,
                sessionId,
              });
              setError(cause);
              const outcome: CreateReviewOutcome = { kind: "conflict", cause };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case "REVIEW_VALIDATION": {
              setError(cause);
              const outcome: CreateReviewOutcome = {
                kind: "validation",
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            default: {
              setError(cause);
              const outcome: CreateReviewOutcome = {
                kind: "reverted",
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
          }
        }
      })();

      inFlightRef.current = core;
      try {
        return await core;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    },
    [quizId, sessionId, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
  }, []);

  return {
    submit: handleSubmit,
    isLoading,
    error,
    lastOutcome,
    reset,
  };
}
