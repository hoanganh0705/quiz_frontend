

'use client';

import { useCallback, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';
import type { UserCopyEntry } from '@/lib/api/error-codes';
import {
useOptimisticMutation,
type OptimisticMutationResult,
} from '@/lib/api/useOptimisticMutation';
import { updateCollection } from '@/features/bookmarks/api';
import type { UpdateCollectionDto } from '@/lib/api/generated/schemas';
import type { BookmarkCollection } from '@/features/bookmarks/types';
import { BOOKMARK_COLLECTIONS_KEY } from './useCollections';

export interface UseUpdateCollectionOptions {

onSuccess?: (collection: BookmarkCollection) => void;

onError?: (code: string) => void;
}

export interface UseUpdateCollectionReturn {

update: (
collectionId: string,
payload: UpdateCollectionDto,
  ) => Promise<OptimisticMutationResult<BookmarkCollection>>;

isPending: boolean;

isSuccess: boolean;

isError: boolean;

lastError: UserCopyEntry | null;

lastApiError: ApiError | null;

conflictError: UserCopyEntry | null;

reset: () => void;
}

export function useUpdateCollection(
options: UseUpdateCollectionOptions = {},
): UseUpdateCollectionReturn {
const { onSuccess, onError } = options;

const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
useOptimisticMutation();

const [conflictError, setConflictError] = useState<UserCopyEntry | null>(null);

const update = useCallback(
async (collectionId: string, payload: UpdateCollectionDto) => {

setConflictError(null);

const result = await mutate<BookmarkCollection[], BookmarkCollection>({
key: BOOKMARK_COLLECTIONS_KEY,
optimisticData: (current): BookmarkCollection[] => {
if (!current || !Array.isArray(current)) {
return current ?? [];
          }

return current.map((collection: BookmarkCollection) => {
if (collection.collectionId !== collectionId) {
return collection;
            }

const now = new Date().toISOString();
return {
...collection,
name: payload.name ?? collection.name,
description: 'description' in payload ? payload.description : collection.description,
color: 'color' in payload ? payload.color : collection.color,
updatedAt: now,
            } as BookmarkCollection;
          });
        },
run: async () => {
const sdkResult = await updateCollection(collectionId, payload);

const data = (sdkResult as unknown as { data?: Record<string, unknown> })?.data;
const collection: BookmarkCollection = {
collectionId: (data?.collectionId as string) ?? collectionId,
id: (data?.collectionId as string) ?? collectionId,
userId: (data?.userId as string) ?? '',
name: (data?.name as string) ?? (payload.name ?? ''),
description: (data?.description as string | null | undefined) ?? null,
color: (data?.color as string | null | undefined) ?? null,
quizCount: (data?.quizCount as number) ?? 0,
createdAt: (data?.createdAt as string) ?? new Date().toISOString(),
updatedAt: (data?.updatedAt as string) ?? new Date().toISOString(),
          };
return collection;
        },
onSuccess: (collection) => {

void globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
onSuccess?.(collection);
        },
onError: (apiError: ApiError | unknown) => {

if (isApiError(apiError) && apiError.status === 409) {
const copy = getUserCopy('COLLECTION_CONFLICT');
setConflictError(copy);
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
setConflictError(null);
  }, [resetOptimistic]);

return {
update,
isPending,
isSuccess,
isError,
lastError,
lastApiError,
conflictError,
reset,
  };
}
