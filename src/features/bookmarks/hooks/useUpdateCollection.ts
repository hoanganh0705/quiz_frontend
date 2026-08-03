/**
 * `useUpdateCollection` — optimistic collection update hook.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-B4 (update part).
 *
 * ## What this hook owns
 *
 * The snapshot-and-revert dance for `PATCH /bookmarks/collections/:id`:
 *
 *   1. Snapshot the current collections list from SWR cache.
 *   2. Apply an optimistic update to the specific collection.
 *   3. Call `updateCollection(id, payload)` from `bookmarks.service.ts`.
 *   4. On success → revalidate the collections list + broadcast invalidation.
 *   5. On 409 `COLLECTION_CONFLICT` → revert + surface conflict error.
 *   6. On any other ApiError → revert + surface error.
 *
 * ## Partial updates
 *
 * The hook supports partial PATCH semantics — name OR color OR both
 * can be updated independently.
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
import { updateCollection } from '@/features/bookmarks/api';
import type { UpdateCollectionDto } from '@/lib/api/generated/schemas';
import type { BookmarkCollection } from '@/features/bookmarks/types';
import { BOOKMARK_COLLECTIONS_KEY } from './useCollections';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UseUpdateCollectionOptions {
  /** Called after the server confirms the update. */
  onSuccess?: (collection: BookmarkCollection) => void;
  /** Called when the server rejects the update. */
  onError?: (code: string) => void;
}

export interface UseUpdateCollectionReturn {
  /** Trigger the collection update. */
  update: (
    collectionId: string,
    payload: UpdateCollectionDto,
  ) => Promise<OptimisticMutationResult<BookmarkCollection>>;
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
 * Optimistic collection update hook.
 *
 * @example
 * ```ts
 * const { update, isPending, conflictError } = useUpdateCollection({
 *   onSuccess: (collection) => toast.success('Collection updated'),
 * });
 * await update(collectionId, { name: 'New Name' });
 * ```
 */
export function useUpdateCollection(
  options: UseUpdateCollectionOptions = {},
): UseUpdateCollectionReturn {
  const { onSuccess, onError } = options;

  const { mutate, lastResult, lastError: rawLastError, reset: resetOptimistic } =
    useOptimisticMutation();

  /** Conflict error extracted from 409 responses. */
  const [conflictError, setConflictError] = useState<UserCopyEntry | null>(null);

  const update = useCallback(
    async (collectionId: string, payload: UpdateCollectionDto) => {
      // Clear previous conflict error.
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
            // Apply the optimistic update.
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
          // Map response to BookmarkCollection.
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
