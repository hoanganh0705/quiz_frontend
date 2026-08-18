

'use client';

import { useCallback, useMemo } from 'react';

import { ApiError, useSingleWithRetry } from '@/lib/api';

import { listMyAttempts } from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
reviewQuizAttemptKey,
} from '@/features/reviews/types';

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

type ListMyAttemptsResponse = {
data?: AttemptSummaryResponseDto[];
};

export interface UseCompletedQuizAttemptResult {

hasCompletedAttempt: boolean;

isLoading: boolean;

error: ApiError | null;

retry: () => Promise<void>;
}

export interface UseCompletedQuizAttemptParams {

quizId: string | null;
}

export function useCompletedQuizAttempt(
params: UseCompletedQuizAttemptParams,
): UseCompletedQuizAttemptResult {
const { quizId } = params;

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
quizId === null || sessionId === null
? null
: reviewQuizAttemptKey(quizId, sessionId),
[quizId, sessionId],
  );

const fetcher = useMemo(
() =>
async ({
signal,
      }: {
signal: AbortSignal;
      }): Promise<boolean> => {
if (quizId === null) {
return false;
        }

let raw: unknown;
try {
raw = await listMyAttempts({
quizId,
status: 'completed',
limit: 1,
          });
        } catch (err) {

if (err instanceof ApiError && err.status === 404) {
return false;
          }
throw err;
        }

if (signal.aborted) {
return false;
        }

const envelope = raw as unknown as ListMyAttemptsResponse;
const items = envelope.data ?? [];
return items.length > 0;
      },
[quizId],
  );

const { data, isLoading, error, retry } = useSingleWithRetry<boolean>({
key,
fetcher,
  });

const hasCompletedAttempt = data === true;

const stableRetry = useCallback(async () => {
await retry();
  }, [retry]);

return {
hasCompletedAttempt,
isLoading,
error,
retry: stableRetry,
  };
}
