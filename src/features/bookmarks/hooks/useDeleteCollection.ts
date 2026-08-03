/**
 * `useDeleteCollection` — optimistic collection deletion hook.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-B4 (delete part).
 *
 * ## What this hook owns
 *
 * The snapshot-and-revert dance for `DELETE /bookmarks/collections/:id`:
 *
 *   1. Snapshot the current collections list from SWR cache.
 *   2. Apply an optimistic removal (filter out the collection).
 *   3. Call `deleteCollection(id)` from `bookmarks.service.ts`.
 *   4. On success → revalidate the collections list + broadcast invalidation.
 *   5. On 404 → mute error (already removed from UI cache).
 *   6. On any other ApiError → revert + surface error.
 *
 * ## 404 handling
 *
 * If the collection was already deleted (e.g., by another tab), the
 * backend returns 404. The UI has already optimistically removed the
 * collection from the cache, so we mute the error — no user-visible
 * error is shown.
 *
 * ## Typed-confirm integration
 *
 * This hook is designed to be used with `<ConfirmDialog kind="destructive-permanent" />`.
 * The caller should render the dialog and call `remove()` only after the user
 * confirms via typed-confirm.
 */

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

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UseDeleteCollectionOptions {
  /** Called after the server confirms the deletion. */
  onSuccess?: () => void;
  /** Called when the server rejects the deletion. */
  onError?: (code: string) => void;
}

export interface UseDeleteCollectionReturn {
  /** Trigger the collection deletion. Call this after user confirms via typed-confirm. */
  remove: (collectionId: string) => Promise<OptimisticMutationResult<void>>;
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
  /** Clear `lastError` and reset the status to idle. */
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Optimistic collection deletion hook.
 *
 * @example
 * ```tsx
 * const { remove, isPending } = useDeleteCollection({
 *   onSuccess: () => toast.success('Collection deleted'),
 * });
 *
 * // In render:
 * <ConfirmDialog
 *   kind="destructive-permanent"
 *   onConfirm={() => remove(collectionId)}
 * >
 *   Delete
 * </ConfirmDialog>
 * ```
 */
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
          // Optimistically remove the collection.
          return current.filter((c: BookmarkCollection) => c.collectionId !== collectionId);
        },
        run: async () => {
          // The SDK returns void for DELETE.
          await deleteCollection(collectionId);
        },
        onSuccess: () => {
          // Revalidate to sync with server.
          void globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
          onSuccess?.();
        },
        onError: (apiError: ApiError | unknown) => {
          // 404 is muted — the collection is already removed from UI.
          if (isApiError(apiError) && apiError.status === 404) {
            // Still revalidate to be safe.
            void globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
            // Don't call onError for 404.
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
