"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";

import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import { invalidateReviewCaches } from "@/features/reviews/query-keys";
import { updateReview } from "@/features/reviews/services/reviews.service";

import type { UpdateReviewDto } from "@/lib/api/generated/schemas";

export type EditReviewOutcomeKind =
  | "success"
  | "forbidden"
  | "validation"
  | "stale"
  | "reverted";

export interface EditReviewOutcome {
  kind: EditReviewOutcomeKind;
  cause: ApiError | null;
}

export interface UseEditReviewOptions {
  onSuccess?: () => void;
  onError?: (outcome: EditReviewOutcome) => void;
}

export interface UseEditReviewResult {
  update: (payload: UpdateReviewDto) => Promise<boolean>;
  isLoading: boolean;
  error: ApiError | null;
  lastOutcome: EditReviewOutcome | null;
  reset: () => void;
}

export function useEditReview(
  quizId: string,
  options: UseEditReviewOptions = {},
): UseEditReviewResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] = useState<EditReviewOutcome | null>(
    null,
  );

  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const sessionId = useAuthSessionId();

  const handleUpdate = useCallback(
    async (payload: UpdateReviewDto): Promise<boolean> => {
      if (!quizId) {
        const validationError = ApiError.fromInput({
          status: 0,
          code: "REVIEW_VALIDATION",
          message: "quizId is required to edit a review",
        });
        setError(validationError);
        const outcome: EditReviewOutcome = {
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
          await updateReview(quizId, payload);

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
            const outcome: EditReviewOutcome = {
              kind: "reverted",
              cause: unknownError,
            };
            setLastOutcome(outcome);
            onError?.(outcome);
            return false;
          }

          switch (cause.code) {
            case "REVIEW_FORBIDDEN": {
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: "forbidden",
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case "REVIEW_VALIDATION": {
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: "validation",
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            case "GLOBAL_NOT_FOUND": {
              await invalidateReviewCaches({
                quizId,
                sessionId,
              });
              setError(cause);
              const outcome: EditReviewOutcome = {
                kind: "stale",
                cause,
              };
              setLastOutcome(outcome);
              onError?.(outcome);
              return false;
            }
            default: {
              setError(cause);
              const outcome: EditReviewOutcome = {
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
    update: handleUpdate,
    isLoading,
    error,
    lastOutcome,
    reset,
  };
}
