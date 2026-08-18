'use client';

import { useCallback, useMemo } from 'react';

import { ApiError, useSingleWithRetry } from '@/lib/api';

import {
getAttemptResult,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
ATTEMPT_RESULT_CACHE_KEYS,
type AttemptResultDto,
} from '@/features/attempts/types/attempt-result.types';

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

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const key = useMemo(
() =>
attemptId === null || sessionId === null
? null
: ATTEMPT_RESULT_CACHE_KEYS.result(attemptId, sessionId),
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
!single.isLoading &&
(single.data !== undefined || single.error !== null);

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