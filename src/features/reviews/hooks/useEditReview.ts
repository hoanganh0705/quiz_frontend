

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { updateReview } from '@/features/reviews/services/reviews.service';
import {
invalidateReviewCaches,
} from '@/features/reviews/types';

import type { UpdateReviewDto } from '@/lib/api/generated/schemas';

export type EditReviewOutcomeKind =
| 'success'
  | 'forbidden'
  | 'validation'
  | 'stale'
  | 'reverted';

export interface EditReviewOutcome {
kind: EditReviewOutcomeKind;

cause: ApiError | null;
}

export interface UseEditReviewOptions {

onSuccess?: () => void;

onError?: (outcome: EditReviewOutcome) => void;
}

export interface UseEditReviewResult {

update: (payload: UpdateReviewDto) => Promise<boolean>;

isLoading: boolean;

error: ApiError | null;

lastOutcome: EditReviewOutcome | null;

reset: () => void;
}

function makeSyntheticApiError(
status: number,
code: string,
message: string,
): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message,
code,
config: undefined,
request: undefined,
response: {
status,
statusText: message,
data: {
type: 'https://api.quiz.local/problems/synthetic',
title: message,
status,
detail: message,
extensions: { code, requestId: 'req-synthetic' },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

async function invalidateAllReviewKeysForQuiz(
mutate: typeof globalMutate,
quizId: string,
): Promise<void> {
await mutate(
(key: readonly unknown[]) =>
Array.isArray(key) && key[0] === 'reviews' && key[2] === quizId,
undefined,
{ revalidate: true },
  );
}

export function useEditReview(
quizId: string,
options: UseEditReviewOptions = {},
): UseEditReviewResult {
const { onSuccess, onError } = options;

const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [lastOutcome, setLastOutcome] =
useState<EditReviewOutcome | null>(null);

const inFlightRef = useRef<Promise<boolean> | null>(null);

const { currentUser } = useAuthSession();
const sessionId = useMemo<string | null>(() => {
const u = currentUser as { id?: string; userId?: string } | null;
if (!u) return null;
return u.id ?? u.userId ?? null;
  }, [currentUser]);

const handleUpdate = useCallback(
async (payload: UpdateReviewDto): Promise<boolean> => {
if (!quizId) {
const synthetic = makeSyntheticApiError(
0,
'REVIEW_VALIDATION',
'quizId is required to edit a review',
        );
setError(synthetic);
setLastOutcome({ kind: 'validation', cause: synthetic });
onError?.({ kind: 'validation', cause: synthetic });
return false;
      }

if (inFlightRef.current) {
return inFlightRef.current;
      }

setIsLoading(true);
setError(null);
setLastOutcome(null);

const core = (async (): Promise<boolean> => {
try {
await updateReview(quizId, payload);

if (sessionId) {
await invalidateReviewCaches(globalMutate as never, {
quizId,
sessionId,
            });
          } else {
await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
          }

setLastOutcome({ kind: 'success', cause: null });
onSuccess?.();
return true;
        } catch (cause: unknown) {
if (!isApiError(cause)) {
const synthetic = makeSyntheticApiError(
0,
'GLOBAL_UNKNOWN',
String(cause),
            );
setError(synthetic);
const outcome: EditReviewOutcome = {
kind: 'reverted',
cause: synthetic,
            };
setLastOutcome(outcome);
onError?.(outcome);
return false;
          }

switch (cause.code) {
case 'REVIEW_FORBIDDEN': {

setError(cause);
const outcome: EditReviewOutcome = {
kind: 'forbidden',
cause,
              };
setLastOutcome(outcome);
onError?.(outcome);
return false;
            }
case 'REVIEW_VALIDATION': {
setError(cause);
const outcome: EditReviewOutcome = {
kind: 'validation',
cause,
              };
setLastOutcome(outcome);
onError?.(outcome);
return false;
            }
case 'GLOBAL_NOT_FOUND': {

if (sessionId) {
await invalidateReviewCaches(globalMutate as never, {
quizId,
sessionId,
                });
              } else {
await invalidateAllReviewKeysForQuiz(globalMutate, quizId);
              }
setError(cause);
const outcome: EditReviewOutcome = {
kind: 'stale',
cause,
              };
setLastOutcome(outcome);
onError?.(outcome);
return false;
            }
default: {
setError(cause);
const outcome: EditReviewOutcome = {
kind: 'reverted',
cause,
              };
setLastOutcome(outcome);
onError?.(outcome);
return false;
            }
          }
        }
      })();

inFlightRef.current = core;
try {
return await core;
      } finally {
setIsLoading(false);
inFlightRef.current = null;
      }
    },
[quizId, sessionId, onSuccess, onError],
  );

const reset = useCallback(() => {
setError(null);
setLastOutcome(null);
  }, []);

return {
update: handleUpdate,
isLoading,
error,
lastOutcome,
reset,
  };
}
