

'use client';

import { useCallback, useMemo } from 'react';

import { useSingleWithRetry } from '@/lib/api';

import { getMyQuizReview } from '@/features/reviews/services/reviews.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
myQuizReviewKey,
type MyReviewDto,
} from '@/features/reviews/types';

export interface UseMyQuizReviewResult {

review: MyReviewDto | null;

isLoading: boolean;

hasResolved: boolean;

error: import('@/lib/api').ApiError | null;

retry: () => Promise<void>;
}

export interface UseMyQuizReviewParams {

quizId: string | null;
}

export function useMyQuizReview(
params: UseMyQuizReviewParams,
): UseMyQuizReviewResult {
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
: myQuizReviewKey(quizId, sessionId),
[quizId, sessionId],
  );

const fetcher = useMemo(
() =>
async ({
signal,
      }: {
signal: AbortSignal;
      }): Promise<MyReviewDto | null> => {
if (quizId === null) {

return null;
        }
const result = await getMyQuizReview(quizId);
if (signal.aborted) {

return result ? { ...result, id: result.reviewId } : null;
        }
return result ? { ...result, id: result.reviewId } : null;
      },
[quizId],
  );

const { data, isLoading, error, retry } = useSingleWithRetry<
MyReviewDto | null
  >({
key,
fetcher,
  });

const hasResolved = !isLoading && (data !== undefined || error !== null);

const stableRetry = useCallback(async () => {
await retry();
  }, [retry]);

return {
review: data ?? null,
isLoading,
hasResolved,
error,
retry: stableRetry,
  };
}
