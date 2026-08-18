

'use client';

import { useCallback } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';
import type { UserCopyEntry } from '@/lib/api/error-codes';
import {
useOptimisticMutation,
type OptimisticMutationResult,
} from '@/lib/api/useOptimisticMutation';
import { deleteCollection } from '@/features/bookmarks/api';
import type { BookmarkCollection } from '@/features/bookmarks/types';
import { BOOKMARK_COLLECTIONS_KEY } from './useCollections';

export interface UseDeleteCollectionOptions {

onSuccess?: () => void;

onError?: (code: string) => void;
}

export interface UseDeleteCollectionReturn {

remove: (collectionId: string) => Promise<OptimisticMutationResult<void>>;

isPending: boolean;

isSuccess: boolean;

isError: boolean;

lastError: UserCopyEntry | null;

lastApiError: ApiError | null;

reset: () => void;
}

export function useDeleteCollection(
options: UseDeleteCollectionOptions = {},
): UseDeleteCollectionReturn {
const { onSuccess, onError } = options;

const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
useOptimisticMutation();

const remove = useCallback(
async (collectionId: string) => {
const result = await mutate<BookmarkCollection[], void>({
key: BOOKMARK_COLLECTIONS_KEY,
optimisticData: (current): BookmarkCollection[] => {
if (!current || !Array.isArray(current)) {
return current ?? [];
          }

return current.filter((c: BookmarkCollection) => c.collectionId !== collectionId);
        },
run: async () => {

await deleteCollection(collectionId);
        },
onSuccess: () => {

void globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
onSuccess?.();
        },
onError: (apiError: ApiError | unknown) => {

if (isApiError(apiError) && apiError.status === 404) {

void globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });

return;
          }
const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
onError?.(code);
        },
      });

return result;
    },
[mutate, onSuccess, onError],
  );

const isPending = lastResult !== null && lastResult.status === 'pending';
const isSuccess = lastResult !== null && lastResult.status === 'success';
const isError = lastResult !== null && lastResult.status === 'reverted';

const lastApiError: ApiError | null =
isError && isApiError(lastResult.apiError)
? (lastResult.apiError as ApiError)
: null;

const lastError: UserCopyEntry | null =
lastApiError !== null ? getUserCopy(lastApiError.code) : null;

const reset = useCallback(() => {
resetOptimistic();
  }, [resetOptimistic]);

return {
remove,
isPending,
isSuccess,
isError,
lastError,
lastApiError,
reset,
  };
}
