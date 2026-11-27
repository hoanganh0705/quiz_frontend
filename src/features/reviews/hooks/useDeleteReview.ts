"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";

import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import { invalidateReviewCaches } from "@/features/reviews/query-keys";
import { deleteReview } from "@/features/reviews/services/reviews.service";

export type DeleteReviewOutcomeKind =
  | "success"
  | "not-found"
  | "forbidden"
  | "reverted";

export interface DeleteReviewOutcome {
  kind: DeleteReviewOutcomeKind;
  cause: ApiError | null;
}

export interface UseDeleteReviewOptions {
  onSuccess?: () => void;
  onError?: (outcome: DeleteReviewOutcome) => void;
}

export interface UseDeleteReviewResult {
  remove: () => Promise<boolean>;
  isLoading: boolean;
  error: ApiError | null;
  lastOutcome: DeleteReviewOutcome | null;
  reset: () => void;
}

export function useDeleteReview(
  quizId: string,
  options: UseDeleteReviewOptions = {},
): UseDeleteReviewResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] = useState<DeleteReviewOutcome | null>(
    null,
  );

  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const sessionId = useAuthSessionId();

  const handleRemove = useCallback(async (): Promise<boolean> => {
    if (!quizId) {
      const validationError = ApiError.fromInput({
        status: 0,
        code: "REVIEW_VALIDATION",
        message: "quizId is required to delete a review",
      });
      setError(validationError);
      const outcome: DeleteReviewOutcome = {
        kind: "reverted",
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
        await deleteReview(quizId);

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
          const outcome: DeleteReviewOutcome = {
            kind: "reverted",
            cause: unknownError,
          };
          setLastOutcome(outcome);
          onError?.(outcome);
          return false;
        }

        switch (cause.code) {
          case "GLOBAL_NOT_FOUND": {
            await invalidateReviewCaches({
              quizId,
              sessionId,
            });
            setLastOutcome({ kind: "not-found", cause });
            onError?.({ kind: "not-found", cause });
            return false;
          }
          case "REVIEW_FORBIDDEN": {
            setError(cause);
            const outcome: DeleteReviewOutcome = {
              kind: "forbidden",
              cause,
            };
            setLastOutcome(outcome);
            onError?.(outcome);
            return false;
          }
          default: {
            setError(cause);
            const outcome: DeleteReviewOutcome = {
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
  }, [quizId, sessionId, onSuccess, onError]);

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
  }, []);

  return {
    remove: handleRemove,
    isLoading,
    error,
    lastOutcome,
    reset,
  };
}
