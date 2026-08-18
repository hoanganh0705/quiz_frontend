

'use client';

import { useCallback, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';
import {
useOptimisticMutation,
type OptimisticMutationResult,
} from '@/lib/api/useOptimisticMutation';
import { removeQuizzesFromCollectionBulk, BulkOperationValidationError } from '@/features/bookmarks/services';
import type { BulkOperationResult, BulkRemoveResult, CollectionQuiz } from '@/features/bookmarks/types';
import { collectionQuizzesSWRKey } from './useCollectionInvalidation';

export interface UseRemoveQuizzesFromCollectionOptions {

onSuccess?: (result: BulkRemoveResult, quizIds: string[]) => void;

onError?: (code: string) => void;
}

export interface UseRemoveQuizzesFromCollectionReturn {

removeQuizzes: (quizIds: string[]) => Promise<OptimisticMutationResult<BulkRemoveResult>>;

results: BulkOperationResult[];

isLoading: boolean;

isRemoving: boolean;

isSuccess: boolean;

isError: boolean;

lastError: ReturnType<typeof getUserCopy> | null;

lastApiError: ApiError | null;

reset: () => void;
}

export function useRemoveQuizzesFromCollection(
collectionId: string,
options: UseRemoveQuizzesFromCollectionOptions = {},
): UseRemoveQuizzesFromCollectionReturn {
const { onSuccess, onError } = options;

const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
useOptimisticMutation();

const [results, setResults] = useState<BulkOperationResult[]>([]);

const [lastApiError, setLastApiError] = useState<ApiError | null>(null);

const removeQuizzes = useCallback(
async (quizIds: string[]): Promise<OptimisticMutationResult<BulkRemoveResult>> => {

setLastApiError(null);
setResults([]);

if (quizIds.length < 1) {
const error = ApiError.fromInput({
status: 400,
code: 'BOOKMARK_VALIDATION',
message: 'At least 1 quiz ID is required',
        });
setLastApiError(error);
onError?.('BOOKMARK_VALIDATION');
return { status: 'reverted', apiError: error };
      }

if (quizIds.length > 100) {
const error = ApiError.fromInput({
status: 400,
code: 'BOOKMARK_VALIDATION',
message: 'Maximum 100 quiz IDs allowed per operation',
        });
setLastApiError(error);
onError?.('BOOKMARK_VALIDATION');
return { status: 'reverted', apiError: error };
      }

try {
const result = await mutate({

key: collectionQuizzesSWRKey(collectionId),
optimisticData: (current): CollectionQuiz[] => {
const quizzes = (current as CollectionQuiz[]) ?? [];

const removedSet = new Set(quizIds);
return quizzes.filter((quiz) => !removedSet.has(quiz.quizId));
          },
run: async () => {
const response = await removeQuizzesFromCollectionBulk(collectionId, quizIds);
return response.summary;
          },
onSuccess: (summary) => {

removeQuizzesFromCollectionBulk(collectionId, quizIds).then((response) => {
setResults(response.results);
            });

void globalMutate(collectionQuizzesSWRKey(collectionId), undefined, { revalidate: true });
onSuccess?.(summary, quizIds);
          },
onError: (apiError: ApiError | unknown) => {

void globalMutate(collectionQuizzesSWRKey(collectionId), undefined, { revalidate: true });
const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
if (isApiError(apiError)) {
setLastApiError(apiError);
            }
onError?.(code);
          },
        });

if (result.status === 'success' && result.result) {
const response = await removeQuizzesFromCollectionBulk(collectionId, quizIds);
setResults(response.results);
        }

return result;
      } catch (err) {

if (err instanceof BulkOperationValidationError) {
const error = ApiError.fromInput({
status: 400,
code: 'BOOKMARK_VALIDATION',
message: err.message,
          });
setLastApiError(error);
onError?.('BOOKMARK_VALIDATION');
return { status: 'reverted', apiError: error };
        }

const code = isApiError(err) ? err.code : 'GLOBAL_UNKNOWN';
const error = isApiError(err) ? err : ApiError.fromInput({
status: 0,
code: 'GLOBAL_UNKNOWN',
message: err instanceof Error ? err.message : String(err),
        });
setLastApiError(error);
onError?.(code);
return { status: 'reverted', apiError: error };
      }
    },
[collectionId, mutate, onSuccess, onError],
  );

const isPending = lastResult !== null && lastResult.status === 'pending';
const isSuccess = lastResult !== null && lastResult.status === 'success';
const isError = lastResult !== null && lastResult.status === 'reverted';
const isRemoving = isPending;

const lastError: ReturnType<typeof getUserCopy> | null =
lastApiError !== null ? getUserCopy(lastApiError.code) : null;

const reset = useCallback(() => {
resetOptimistic();
setLastApiError(null);
setResults([]);
  }, [resetOptimistic]);

return {
removeQuizzes,
results,
isLoading: isPending,
isRemoving,
isSuccess,
isError,
lastError,
lastApiError,
reset,
  };
}
