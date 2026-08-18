'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
withdrawAnswer,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
recordMutationFailure,
recordWithdrawSuccess,
} from '@/features/attempts/stores/useAttemptsStore';
import {
broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

export interface UseDeleteAnswerParams {

attemptId: string | null;

quizVersionId: string | null;
}

export type DeleteAnswerOutcome =
| { kind: 'idle' }
  | { kind: 'withdrawing' }
  | { kind: 'success'; questionId: string }
  | { kind: 'already_missing'; questionId: string }
  | { kind: 'not_found' }
  | { kind: 'not_active' }
  | { kind: 'forbidden' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseDeleteAnswerResult {

isPending: boolean;

isCoolingDown: boolean;

outcome: DeleteAnswerOutcome | null;

error: ApiError | null;

withdraw: (questionId: string) => Promise<DeleteAnswerOutcome>;

reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

export function useDeleteAnswer(
params: UseDeleteAnswerParams,
): UseDeleteAnswerResult {
const { attemptId, quizVersionId } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const [outcome, setOutcome] = useState<DeleteAnswerOutcome | null>(null);
const [error, setError] = useState<ApiError | null>(null);
const [isPending, setIsPending] = useState<boolean>(false);
const [isCoolingDown, setIsCoolingDown] = useState<boolean>(false);

const lastInvocationRef = useRef<number>(0);
const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const reset = useCallback(() => {
setOutcome(null);
setError(null);
setIsPending(false);
setIsCoolingDown(false);
  }, []);

const withdraw = useCallback(
async (questionId: string): Promise<DeleteAnswerOutcome> => {
if (
sessionId === null
|| attemptId === null
|| quizVersionId === null
|| !questionId
      ) {
return { kind: 'idle' };
      }

const now = Date.now();
if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
const dropped: DeleteAnswerOutcome = { kind: 'cooldown' };
setOutcome(dropped);
return dropped;
      }
lastInvocationRef.current = now;

setIsPending(true);
setError(null);
setOutcome({ kind: 'withdrawing' });

try {
await withdrawAnswer(attemptId, questionId);

recordWithdrawSuccess(
attemptId,
quizVersionId,
sessionId,
questionId,
        );

await globalMutate(
ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
        );

broadcastAttemptsChanged({
userId: sessionId,
attemptId,
kind: 'withdraw',
        });

const successOutcome: DeleteAnswerOutcome = {
kind: 'success',
questionId,
        };
setOutcome(successOutcome);
setIsPending(false);
setIsCoolingDown(true);
if (cooldownTimerRef.current !== null) {
clearTimeout(cooldownTimerRef.current);
        }
cooldownTimerRef.current = setTimeout(() => {
setIsCoolingDown(false);
        }, DEFAULT_COOLDOWN_MS);
return successOutcome;
      } catch (cause: unknown) {

if (
isApiError(cause)
&& cause.status === 404
&& cause.code === 'ATTEMPT_ANSWER_NOT_FOUND'
        ) {
recordWithdrawSuccess(
attemptId,
quizVersionId,
sessionId,
questionId,
          );
await globalMutate(
ATTEMPT_CACHE_KEYS.answers(attemptId, sessionId),
          );
const silent: DeleteAnswerOutcome = {
kind: 'already_missing',
questionId,
          };
setOutcome(silent);
setIsPending(false);
return silent;
        }

if (
isApiError(cause)
&& cause.status === 404
&& cause.code === 'ATTEMPT_NOT_FOUND'
        ) {
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
cause,
'idle',
          );
const notFound: DeleteAnswerOutcome = { kind: 'not_found' };
setOutcome(notFound);
setIsPending(false);
return notFound;
        }

if (
isApiError(cause)
&& cause.status === 409
&& cause.code === 'ATTEMPT_NOT_ACTIVE'
        ) {
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
cause,
'in_progress',
          );
const notActive: DeleteAnswerOutcome = { kind: 'not_active' };
setOutcome(notActive);
setIsPending(false);
return notActive;
        }

if (isApiError(cause) && cause.status === 403) {
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
cause,
'in_progress',
          );
const forbidden: DeleteAnswerOutcome = { kind: 'forbidden' };
setOutcome(forbidden);
setIsPending(false);
return forbidden;
        }

const apiError = isApiError(cause)
? cause
: new ApiError({ message: 'withdraw_answer_failed', status: 0 });
setError(apiError);
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
apiError,
'in_progress',
        );
const retryable: DeleteAnswerOutcome = {
kind: 'retryable',
error: apiError,
        };
setOutcome(retryable);
setIsPending(false);
setIsCoolingDown(true);
if (cooldownTimerRef.current !== null) {
clearTimeout(cooldownTimerRef.current);
        }
cooldownTimerRef.current = setTimeout(() => {
setIsCoolingDown(false);
        }, DEFAULT_COOLDOWN_MS);
return retryable;
      }
    },
[sessionId, attemptId, quizVersionId],
  );

return {
isPending,
isCoolingDown,
outcome,
error,
withdraw,
reset,
  };
}