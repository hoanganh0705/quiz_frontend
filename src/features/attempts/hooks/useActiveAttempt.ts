"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import { ApiError, isApiError } from "@/lib/api";

import { getActiveAttempt } from "@/features/attempts/services/attempts.service";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
ATTEMPT_CACHE_KEYS,
type ActiveAttemptView,
} from "@/features/attempts/types/attempt-runner.types";

import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

export interface UseActiveAttemptParams {

quizId: string | null;
}

export function useActiveAttempt(
params: UseActiveAttemptParams,
): ActiveAttemptView {
const { quizId } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== "authenticated") return null;
if (!currentUser) return null;
const id =
(currentUser as { id?: string; userId?: string }).id ??
(currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const key = useMemo(
() =>
quizId === null || sessionId === null
? null
: ATTEMPT_CACHE_KEYS.active(quizId, sessionId),
[quizId, sessionId],
  );

const fetcher = useMemo(
() =>
async (
_args: readonly unknown[],
      ): Promise<AttemptSummaryResponseDto | null> => {
if (quizId === null) return null;
return await getActiveAttempt(quizId);
      },
[quizId],
  );

const swrConfig = useMemo(
() =>
({
revalidateOnFocus: false,

dedupingInterval: 0,
errorRetryInterval: 250,
      }) as const,
[],
  );

const swr = useSWR<AttemptSummaryResponseDto | null>(key, fetcher, swrConfig);

const stableRetry = useCallback(async (): Promise<void> => {
if (key === null) return;
await globalMutate(key);
  }, [key]);

const error: ApiError | null = swr.error
? isApiError(swr.error)
? swr.error
: new ApiError({
message: "useActiveAttempt_unexpected_error",
status: 0,
        })
: null;

return {
attempt: swr.data ?? null,
isLoading: swr.isLoading,
error,
retry: stableRetry,
  };
}

export type { ActiveAttemptView };
export { ApiError };
