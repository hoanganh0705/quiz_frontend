

'use client';

import { useCallback, useMemo } from 'react';
import { mutate as globalMutate } from 'swr';

import {
myQuizReviewKey,
reviewQuizAttemptKey,
type ReviewGateState,
type ReviewGateResult,
} from '@/features/reviews/types';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

import { useMyQuizReview } from './useMyQuizReview';
import { useCompletedQuizAttempt } from './useCompletedQuizAttempt';

export interface UseReviewGateParams {

quizId: string | null;
}

function resolveGateState(
bootstrapState: 'idle' | 'bootstrapping' | 'authenticated' | 'unauthenticated' | 'error',
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

if (
bootstrapState === 'idle' ||
bootstrapState === 'bootstrapping'
  ) {
return { kind: 'loading' };
  }

if (bootstrapState === 'unauthenticated') {
return { kind: 'unauthenticated' };
  }

if (my.isLoading) {
return { kind: 'loading' };
  }

if (my.error) {
return { kind: 'error', error: my.error };
  }

if (my.hasResolved && my.review !== null) {

return {
kind: 'existing-review',
review: my.review as Extract<ReviewGateState, { kind: 'existing-review' }>['review'],
    };
  }

if (attempt.error) {
return { kind: 'error', error: attempt.error };
  }

if (attempt.hasResolved && attempt.hasCompletedAttempt === false) {
return { kind: 'attempt-required' };
  }

if (attempt.hasResolved && attempt.hasCompletedAttempt === true) {
return { kind: 'eligible' };
  }

return { kind: 'loading' };
}

export function useReviewGate(
params: UseReviewGateParams,
): ReviewGateResult {
const { quizId } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const my = useMyQuizReview({ quizId });
const attempt = useCompletedQuizAttempt({ quizId });

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
hasResolved:
!attempt.isLoading &&
attempt.error === null,
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

const isLoading = state.kind === 'loading';

const revalidate = useCallback(async (): Promise<void> => {
if (quizId === null || sessionId === null) return;
await Promise.all([
globalMutate(myQuizReviewKey(quizId, sessionId), undefined, {
revalidate: true,
      }),
globalMutate(reviewQuizAttemptKey(quizId, sessionId), undefined, {
revalidate: true,
      }),
    ]);
  }, [quizId, sessionId]);

return { state, isLoading, revalidate };
}
