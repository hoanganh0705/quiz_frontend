"use client";

import { useCallback, useMemo } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import { useHasCompletedQuizAttempt } from "@/features/attempts/hooks/useHasCompletedQuizAttempt";
import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";
import { REVIEW_KEYS } from "@/features/reviews/query-keys";

import type {
  ReviewGateResult,
  ReviewGateState,
} from "@/features/reviews/types";

import { useMyQuizReview } from "./useMyQuizReview";

export interface UseReviewGateParams {
  quizId: string | null;
}

function resolveGateState(
  bootstrapState:
    "idle" | "bootstrapping" | "authenticated" | "unauthenticated" | "error",
  my: {
    review: unknown;
    hasResolved: boolean;
    isLoading: boolean;
    error: unknown;
  },
  attempt: {
    hasCompletedAttempt: boolean;
    hasResolved: boolean;
    error: unknown;
  },
): ReviewGateState {
  if (bootstrapState === "idle" || bootstrapState === "bootstrapping") {
    return { kind: "loading" };
  }

  if (bootstrapState === "unauthenticated") {
    return { kind: "unauthenticated" };
  }

  if (my.isLoading) {
    return { kind: "loading" };
  }

  if (my.error) {
    return { kind: "error", error: my.error };
  }

  if (my.hasResolved && my.review !== null) {
    return {
      kind: "existing-review",
      review: my.review as Extract<
        ReviewGateState,
        { kind: "existing-review" }
      >["review"],
    };
  }

  if (attempt.error) {
    return { kind: "error", error: attempt.error };
  }

  if (attempt.hasResolved && attempt.hasCompletedAttempt === false) {
    return { kind: "attempt-required" };
  }

  if (attempt.hasResolved && attempt.hasCompletedAttempt === true) {
    return { kind: "eligible" };
  }

  return { kind: "loading" };
}

export function useReviewGate(params: UseReviewGateParams): ReviewGateResult {
  const { quizId } = params;

  const { bootstrapState } = useAuthSession();
  const sessionId = useAuthSessionId();

  const my = useMyQuizReview({ quizId });
  const attempt = useHasCompletedQuizAttempt({ quizId });

  const state = useMemo<ReviewGateState>(
    () =>
      resolveGateState(
        bootstrapState,
        {
          review: my.review,
          hasResolved: my.hasResolved,
          isLoading: my.isLoading,
          error: my.error,
        },
        {
          hasCompletedAttempt: attempt.hasCompletedAttempt,
          hasResolved: !attempt.isLoading && attempt.error === null,
          error: attempt.error,
        },
      ),
    [
      bootstrapState,
      my.review,
      my.hasResolved,
      my.isLoading,
      my.error,
      attempt.hasCompletedAttempt,
      attempt.isLoading,
      attempt.error,
    ],
  );

  const isLoading = state.kind === "loading";

  const revalidate = useCallback(async (): Promise<void> => {
    if (quizId === null || sessionId === null) return;
    try {
      const qc = getQueryClient();
      await qc.invalidateQueries({
        queryKey: REVIEW_KEYS.mine(quizId, sessionId),
      });
      await qc.invalidateQueries({
        queryKey: ATTEMPT_KEYS.completedCheck(quizId, sessionId),
      });
    } catch {}
  }, [quizId, sessionId]);

  return { state, isLoading, revalidate };
}
