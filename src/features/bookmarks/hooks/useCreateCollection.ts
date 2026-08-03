/**
 * `useCreateCollection` — optimistic collection creation hook.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-B3.
 *
 * ## What this hook owns
 *
 * The snapshot-and-revert dance for `POST /bookmarks/collections`:
 *
 *   1. Snapshot the current collections list from SWR cache.
 *   2. Apply an optimistic collection (with temp ID) to the list.
 *   3. Call `createCollection(payload)` from `bookmarks.service.ts`.
 *   4. On success → revalidate the collections list.
 *   5. On 409 `COLLECTION_CONFLICT` → revert to snapshot + surface error.
 *   6. On any other ApiError → revert to snapshot + surface error.
 *
 * ## 409 Conflict handling
 *
 * When the user tries to create a collection with a name that already
 * exists, the backend returns 409 `COLLECTION_CONFLICT`. The hook
 * catches this and sets `conflictError` so the form can display an
 * inline error: "You already have a collection named 'X'".
 *
 * The form stays open (epic spec: "on 409, the form remains open
 * with an inline name error").
 */

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

/**
 * Optimistic data shape for creating a collection.
 * We use a temporary ID prefix to identify optimistic entries.
 */
const OPTIMISTIC_ID_PREFIX = 'optimistic-';

/**
 * Generate a temporary ID for optimistic collections.
 */
function generateOptimisticId(): string {
  return `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if a collection ID is an optimistic (temporary) ID.
 */
function isOptimisticId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UseCreateCollectionOptions {
  /** Called after the server confirms the creation. */
  onSuccess?: (collection: BookmarkCollection) => void;
  /** Called when the server rejects the creation. */
  onError?: (code: string) => void;
}

export interface UseCreateCollectionReturn {
  /** Trigger the collection creation. */
  create: (payload: CreateCollectionDto) => Promise<OptimisticMutationResult<BookmarkCollection>>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** `true` after a successful mutation. */
  isSuccess: boolean;
  /** `true` after a rejected mutation. */
  isError: boolean;
  /** The typed user-copy entry for the last rejected error. `null` otherwise. */
  lastError: UserCopyEntry | null;
  /** The raw `ApiError` from the last rejected mutation. `null` otherwise. */
  lastApiError: ApiError | null;
  /** Specific error for name conflicts (409 COLLECTION_CONFLICT). */
  conflictError: UserCopyEntry | null;
  /** Clear `lastError` and reset the status to idle. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Optimistic collection creation hook.
 *
 * @example
 * ```ts
 * const { create, isPending, conflictError } = useCreateCollection({
 *   onSuccess: (collection) => toast.success('Collection created'),
 * });
 * await create({ name: 'My Favorites' });
 * ```
 */
export function useCreateCollection(
  options: UseCreateCollectionOptions = {},
): UseCreateCollectionReturn {
  const { onSuccess, onError } = options;

  const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
    useOptimisticMutation();

  /** Conflict error extracted from 409 responses. */
  const [conflictError, setConflictError] = useState<UserCopyEntry | null>(null);

  const create = useCallback(
    async (payload: CreateCollectionDto) => {
      // Clear previous conflict error.
      setConflictError(null);

      // Generate optimistic ID for this collection.
      const optimisticId = generateOptimisticId();

      const result = await mutate({
        key: BOOKMARK_COLLECTIONS_KEY,
        optimisticData: (current): BookmarkCollection[] => {
          // Create optimistic collection.
          const now = new Date().toISOString();
          const optimistic: BookmarkCollection = {
            collectionId: optimisticId,
            userId: '', // Will be filled by server response.
            name: payload.name,
            description: payload.description ?? null,
            color: (payload as unknown as { color?: string }).color ?? null,
            quizCount: 0,
            createdAt: now,
            updatedAt: now,
            // Extend with `id` alias for cursor pagination deduplication.
            id: optimisticId,
          };

          if (!current || !Array.isArray(current)) {
            return [optimistic];
          }
          return [...current, optimistic];
        },
        run: async () => {
          const sdkResult = await createCollection(payload);
          // Map response to BookmarkCollection.
          const data = (sdkResult as unknown as { data?: Record<string, unknown> })?.data;
          const collection: BookmarkCollection = {
            collectionId: (data?.collectionId as string) ?? optimisticId,
            id: (data?.collectionId as string) ?? optimisticId, // Alias for cursor pagination.
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
          // Revalidate to get the server's canonical data.
          void globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
          onSuccess?.(collection);
        },
        onError: (apiError: ApiError | unknown) => {
          // Check for 409 conflict.
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
