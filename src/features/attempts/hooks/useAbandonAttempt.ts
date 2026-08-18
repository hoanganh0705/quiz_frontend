'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { ApiError, isApiError } from '@/lib/api';

import {
abandonAttempt,
} from '@/features/attempts/services/attempts.service';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { ATTEMPT_CACHE_KEYS } from '@/features/attempts/types/attempt-runner.types';
import {
beginAbandon,
recordAbandonSuccess,
recordMutationFailure,
} from '@/features/attempts/stores/useAttemptsStore';
import {
broadcastAttemptsChanged,
} from '@/lib/api/core/attempts-broadcast-channel';

export interface UseAbandonAttemptParams {

attemptId: string | null;

quizVersionId: string | null;
}

export type AbandonAttemptOutcome =
| { kind: 'idle' }
  | { kind: 'abandoning' }
  | { kind: 'success' }
  | { kind: 'not_active'; currentStatus: 'completed' | 'abandoned' | 'unknown' }
  | { kind: 'completed_remote' }
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'retryable'; error: ApiError }
  | { kind: 'cooldown' };

export interface UseAbandonAttemptResult {

isPending: boolean;

isCoolingDown: boolean;

outcome: AbandonAttemptOutcome | null;

error: ApiError | null;

confirm: () => Promise<AbandonAttemptOutcome>;

reset: () => void;
}

const DEFAULT_COOLDOWN_MS = 500;

export function useAbandonAttempt(
params: UseAbandonAttemptParams,
): UseAbandonAttemptResult {
const { attemptId, quizVersionId } = params;

const { bootstrapState, currentUser } = useAuthSession();

const sessionId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const [outcome, setOutcome] = useState<AbandonAttemptOutcome | null>(null);
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

const confirm = useCallback(async (): Promise<AbandonAttemptOutcome> => {
if (
sessionId === null
|| attemptId === null
|| quizVersionId === null
    ) {
return { kind: 'idle' };
    }

const now = Date.now();
if (now - lastInvocationRef.current < DEFAULT_COOLDOWN_MS) {
const dropped: AbandonAttemptOutcome = { kind: 'cooldown' };
setOutcome(dropped);
return dropped;
    }
lastInvocationRef.current = now;

setIsPending(true);
setError(null);
setOutcome({ kind: 'abandoning' });
beginAbandon(attemptId, quizVersionId, sessionId);

try {
await abandonAttempt(attemptId);

recordAbandonSuccess(attemptId, quizVersionId, sessionId);

await Promise.all([
globalMutate(ATTEMPT_CACHE_KEYS.active(quizVersionId, sessionId)),
globalMutate(ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId)),
      ]);

broadcastAttemptsChanged({
userId: sessionId,
attemptId,
kind: 'abandon',
      });

const successOutcome: AbandonAttemptOutcome = { kind: 'success' };
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
&& cause.status === 409
&& cause.code === 'ATTEMPT_NOT_ACTIVE'
      ) {
await globalMutate(
ATTEMPT_CACHE_KEYS.detail(attemptId, sessionId),
        );
recordAbandonSuccess(attemptId, quizVersionId, sessionId);

const notActive: AbandonAttemptOutcome = {
kind: 'not_active',
currentStatus: 'unknown',
        };
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
const forbidden: AbandonAttemptOutcome = { kind: 'forbidden' };
setOutcome(forbidden);
setIsPending(false);
return forbidden;
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
const notFound: AbandonAttemptOutcome = { kind: 'not_found' };
setOutcome(notFound);
setIsPending(false);
return notFound;
      }

const apiError = isApiError(cause)
? cause
: new ApiError({ message: 'abandon_attempt_failed', status: 0 });
setError(apiError);
recordMutationFailure(
attemptId,
quizVersionId,
sessionId,
apiError,
'in_progress',
      );
const retryable: AbandonAttemptOutcome = {
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
  }, [sessionId, attemptId, quizVersionId]);

return {
isPending,
isCoolingDown,
outcome,
error,
confirm,
reset,
  };
}