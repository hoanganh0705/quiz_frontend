"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, isApiError } from "@/lib/api";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { getActiveAttempt } from "@/features/attempts/services/attempts.service";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

import type { ActiveAttemptView } from "@/features/attempts/types/attempt-runner.types";

import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

export interface UseActiveAttemptParams {
  quizId: string | null;
}

export function useActiveAttempt(
  params: UseActiveAttemptParams,
): ActiveAttemptView {
  const { quizId } = params;

  const sessionId = useAuthSessionId();

  const key = useMemo(
    () =>
      quizId === null || sessionId === null
        ? null
        : ATTEMPT_KEYS.active(quizId, sessionId),
    [quizId, sessionId],
  );

  const fetcher =
    useCallback(async (): Promise<AttemptSummaryResponseDto | null> => {
      if (quizId === null) return null;
      return await getActiveAttempt(quizId);
    }, [quizId]);

  const {
    data,
    error: queryError,
    isLoading,
    refetch,
  } = useQuery<AttemptSummaryResponseDto | null, ApiError>(
    {
      queryKey: key ?? (["attempts", "active", "disabled"] as const),
      queryFn: fetcher,
      enabled: key !== null,
      refetchOnWindowFocus: false,
      retry: false,
    },
    getQueryClient(),
  );

  const stableRetry = useCallback(async (): Promise<void> => {
    if (key === null) return;
    try {
      await refetch();
    } catch {}
  }, [key, refetch]);

  const error: ApiError | null = queryError
    ? isApiError(queryError)
      ? queryError
      : new ApiError({
          message: "useActiveAttempt_unexpected_error",
          status: 0,
        })
    : null;

  return {
    attempt: key === null ? null : (data ?? null),
    isLoading: key !== null && isLoading && data === undefined,
    error,
    retry: stableRetry,
  };
}

export type { ActiveAttemptView };
export { ApiError };
