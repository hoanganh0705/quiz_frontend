"use client";

import { useCallback } from "react";

import { useQuery } from "@tanstack/react-query";

import { ApiError, coerceToApiError } from "@/lib/api";
import { unwrapEnvelope as inspectEnvelope } from "@/lib/api/core/unwrap";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { listMyAttempts } from "@/features/attempts/services/attempts.service";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

export interface UseHasCompletedQuizAttemptResult {
  hasCompletedAttempt: boolean;
  isLoading: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

export interface UseHasCompletedQuizAttemptParams {
  quizId: string | null;
}

export function useHasCompletedQuizAttempt(
  params: UseHasCompletedQuizAttemptParams,
): UseHasCompletedQuizAttemptResult {
  const { quizId } = params;

  const sessionId = useAuthSessionId();

  const enabled = quizId !== null && sessionId !== null;

  const query = useQuery<boolean, ApiError>({
    queryKey: enabled
      ? ATTEMPT_KEYS.completedCheck(quizId, sessionId)
      : ["attempts", "completed-check", "disabled"],
    queryFn: async () => {
      if (!quizId) return false;
      try {
        const raw = await listMyAttempts({
          quizId,
          status: "completed",
          limit: 1,
        });
        const unwrapped = inspectEnvelope<AttemptSummaryResponseDto[]>(raw);
        const items =
          unwrapped.kind === "envelope" && Array.isArray(unwrapped.value)
            ? unwrapped.value
            : [];
        return items.length > 0;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return false;
        }
        throw err;
      }
    },
    enabled,
    retry: false,
  });

  const isLoading = enabled ? query.isPending : false;
  const error =
    enabled && query.error ? coerceToApiError(query.error) : null;

  const stableRetry = useCallback(async () => {
    if (!enabled) return;
    await query.refetch();
  }, [enabled, query]);

  return {
    hasCompletedAttempt: enabled ? query.data === true : false,
    isLoading,
    error,
    retry: stableRetry,
  };
}
