"use client";

import { useCallback, useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { getAttemptResult } from "@/features/attempts/services/attempts.service";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

import type { AttemptResultDto } from "@/features/attempts/types/attempt-result.types";

export interface UseAttemptResultParams {
  attemptId: string | null;
}

export interface AttemptResultView {
  result: AttemptResultDto | null;

  isLoading: boolean;

  hasResolved: boolean;

  error: ApiError | null;

  refresh: () => Promise<void>;
}

export function useAttemptResult(
  params: UseAttemptResultParams,
): AttemptResultView {
  const { attemptId } = params;

  const { bootstrapState } = useAuthSession();
  const sessionId = useAuthSessionId();

  const key = useMemo(
    () =>
      attemptId === null || sessionId === null
        ? null
        : ATTEMPT_KEYS.result(attemptId, sessionId),
    [attemptId, sessionId],
  );

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<AttemptResultDto | null> => {
        if (attemptId === null) return null;
        const wire = await getAttemptResult(attemptId);
        if (signal.aborted) return wire;
        return wire;
      },
    [attemptId],
  );

  const single = useSingleWithRetry<AttemptResultDto | null>({
    key,
    fetcher,
  });

  const hasResolved =
    (attemptId !== null && bootstrapState === "unauthenticated") ||
    (!single.isLoading && (single.data !== undefined || single.error !== null));

  const refresh = useCallback(async () => {
    await single.retry();
  }, [single.retry]);

  return {
    result: single.data ?? null,
    isLoading: single.isLoading,
    hasResolved,
    error: single.error,
    refresh,
  };
}
