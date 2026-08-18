

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
import { createCollection } from '@/features/bookmarks/api';
import type { CreateCollectionDto } from '@/lib/api/generated/schemas';
import type { BookmarkCollection } from '@/features/bookmarks/types';
import { getCollectionColor } from '@/features/bookmarks/types';
import { BOOKMARK_COLLECTIONS_KEY } from './useCollections';

const OPTIMISTIC_ID_PREFIX = 'optimistic-';

function generateOptimisticId(): string {
return `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isOptimisticId(id: string): boolean {
return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

export interface UseCreateCollectionOptions {

onSuccess?: (collection: BookmarkCollection) => void;

onError?: (code: string) => void;
}

export interface UseCreateCollectionReturn {

create: (payload: CreateCollectionDto) => Promise<OptimisticMutationResult<BookmarkCollection>>;

isPending: boolean;

isSuccess: boolean;

isError: boolean;

lastError: UserCopyEntry | null;

lastApiError: ApiError | null;

conflictError: UserCopyEntry | null;

reset: () => void;
}

export function useCreateCollection(
options: UseCreateCollectionOptions = {},
): UseCreateCollectionReturn {
const { onSuccess, onError } = options;

const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
useOptimisticMutation();

const [conflictError, setConflictError] = useState<UserCopyEntry | null>(null);

const create = useCallback(
async (payload: CreateCollectionDto) => {

setConflictError(null);

const optimisticId = generateOptimisticId();

const result = await mutate({
key: BOOKMARK_COLLECTIONS_KEY,
optimisticData: (current): BookmarkCollection[] => {

const now = new Date().toISOString();
const optimistic: BookmarkCollection = {
collectionId: optimisticId,
userId: '',
name: payload.name,
description: payload.description ?? null,
color: (payload as unknown as { color?: string }).color ?? null,
quizCount: 0,
createdAt: now,
updatedAt: now,

id: optimisticId,
          };

if (!current || !Array.isArray(current)) {
return [optimistic];
          }
return [...current, optimistic];
        },
run: async () => {
const sdkResult = await createCollection(payload);

const data = (sdkResult as unknown as { data?: Record<string, unknown> })?.data;
const collection: BookmarkCollection = {
collectionId: (data?.collectionId as string) ?? optimisticId,
id: (data?.collectionId as string) ?? optimisticId,
userId: (data?.userId as string) ?? '',
name: (data?.name as string) ?? payload.name,
description: (data?.description as string | null | undefined) ?? payload.description ?? null,
color: (data?.color as string | null | undefined) ?? (payload as unknown as { color?: string }).color ?? null,
quizCount: 0,
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
create,
isPending,
isSuccess,
isError,
lastError,
lastApiError,
conflictError,
reset,
  };
}
