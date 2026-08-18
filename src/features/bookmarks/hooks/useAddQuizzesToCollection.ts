

'use client';

import { useCallback, useState } from 'react';

import { isApiError, ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';
import {
useOptimisticMutation,
type OptimisticMutationResult,
type OptimisticMutationSWRKey,
} from '@/lib/api/useOptimisticMutation';
import { addQuizzesToCollectionBulk, BulkOperationValidationError } from '@/features/bookmarks/services';
import type { BulkOperationResult, BulkAddResult } from '@/features/bookmarks/types';
import {
useCollectionInvalidation,
} from './useCollectionInvalidation';

export interface UseAddQuizzesToCollectionOptions {

onSuccess?: (result: BulkAddResult, quizIds: string[]) => void;

onError?: (code: string) => void;
}

export interface UseAddQuizzesToCollectionReturn {

addQuizzes: (quizIds: string[]) => Promise<OptimisticMutationResult<BulkAddResult>>;

results: BulkOperationResult[];

isLoading: boolean;

isSuccess: boolean;

isError: boolean;

lastError: ReturnType<typeof getUserCopy> | null;

lastApiError: ApiError | null;

reset: () => void;
}

export function useAddQuizzesToCollection(
collectionId: string,
options: UseAddQuizzesToCollectionOptions = {},
): UseAddQuizzesToCollectionReturn {
const { onSuccess, onError } = options;

const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
useOptimisticMutation();

const { invalidateQuizzes } = useCollectionInvalidation(collectionId);

const [results, setResults] = useState<BulkOperationResult[]>([]);

const [lastApiError, setLastApiError] = useState<ApiError | null>(null);

const addQuizzes = useCallback(
async (quizIds: string[]): Promise<OptimisticMutationResult<BulkAddResult>> => {

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

key: null as unknown as OptimisticMutationSWRKey,
optimisticData: (cur) => cur,
run: async () => {
const response = await addQuizzesToCollectionBulk(collectionId, quizIds);
return response.summary;
          },
onSuccess: (summary) => {

invalidateQuizzes();

addQuizzesToCollectionBulk(collectionId, quizIds).then((response) => {
setResults(response.results);
            });
onSuccess?.(summary, quizIds);
          },
onError: (apiError: ApiError | unknown) => {
const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
if (isApiError(apiError)) {
setLastApiError(apiError);
            }
onError?.(code);
          },
        });

if (result.status === 'success' && result.result) {
const response = await addQuizzesToCollectionBulk(collectionId, quizIds);
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
[collectionId, mutate, onSuccess, onError, invalidateQuizzes],
  );

const isPending = lastResult !== null && lastResult.status === 'pending';
const isSuccess = lastResult !== null && lastResult.status === 'success';
const isError = lastResult !== null && lastResult.status === 'reverted';

const lastError: ReturnType<typeof getUserCopy> | null =
lastApiError !== null ? getUserCopy(lastApiError.code) : null;

const reset = useCallback(() => {
resetOptimistic();
setLastApiError(null);
setResults([]);
  }, [resetOptimistic]);

return {
addQuizzes,
results,
isLoading: isPending,
isSuccess,
isError,
lastError,
lastApiError,
reset,
  };
}
