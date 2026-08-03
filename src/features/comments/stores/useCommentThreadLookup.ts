/**
 * `useCommentThreadLookup` — SWR-backed per-quiz thread map.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.3.
 *
 * Holds `{ commentId → { repliesCount, replyCap } }` for one quiz. The
 * store is the canonical source of the reply-cap gate (`isAtReplyCap`)
 * that the Reply button in `CommentReplyForm` (T-4.12.14) consults.
 *
 * ## Why a separate store
 *
 * - The thread-list fetch (`useQuizComments`, T-4.12.4) returns the
 *   first page of replies per thread, so `repliesCount` is available
 *   without an extra round-trip. We cache it here.
 * - Mutations (`useCreateComment`, `useDeleteComment` — T-4.12.6 /
 *   T-4.12.8) optimistically `increment` / `decrement` the count so the
 *   cap gate updates without waiting for a refetch.
 * - The cap gate is critical UX: the server `COMMENT_REPLY_LIMIT_EXCEEDED`
 *   (422) is **defense in depth only** — the UI must disable Reply
 *   before the user attempts the 101st reply.
 *
 * ## Cross-tab invalidation
 *
 * The store uses a global SWR cache key (`commentThreadKey(quizId)`).
 * Mutations broadcast a SWR `mutate` on this key. Two open reply forms
 * across two tabs would otherwise race the count; the global cache
 * ensures both forms read the same source of truth.
 *
 * ## Public contract
 *
 *   `useCommentThreadLookup(quizId)` returns:
 *     - `getRepliesCount(commentId)` — number (0 if absent)
 *     - `isAtReplyCap(commentId)` — boolean (true when count >= REPLY_CAP)
 *     - `setRepliesCount(commentId, count)` — write
 *     - `incrementRepliesCount(commentId)` — +1
 *     - `decrementRepliesCount(commentId)` — -1 (floored at 0)
 *
 *   The hook never throws. A `quizId: null` argument disables the
 * store (no fetcher runs, all helpers are no-ops returning safe
 * defaults).
 */

'use client';

import { useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import {
  REPLY_CAP,
  commentThreadKey,
  type ThreadLookupEntry,
} from '@/features/comments/types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Internal mutable view of a quiz's thread map. Persisted in the SWR
 * global cache via `commentThreadKey(quizId)` so concurrent readers
 * (multiple reply forms in the same or different tabs) share state.
 */
type ThreadMap = Readonly<Record<string, ThreadLookupEntry>>;

/**
 * Identity fetcher — SWR requires a fetcher to enable caching. The
 * lookup store does not fetch anything; it only reads/writes the
 * SWR cache via `mutate`. The fetcher returns the seed value (empty
 * map) on first read so SWR populates the cache.
 */
function readOrSeed(
  _key: readonly unknown[],
  seed: ThreadMap,
): ThreadMap {
  return seed;
}

function emptyMap(): ThreadMap {
  return Object.freeze({});
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseCommentThreadLookup {
  /** Read the current reply count for `commentId`. Returns 0 if absent. */
  getRepliesCount: (commentId: string) => number;
  /** True when the thread is at or above the reply cap (default 100). */
  isAtReplyCap: (commentId: string) => boolean;
  /** Replace the reply count for `commentId` (used after a fetch). */
  setRepliesCount: (commentId: string, count: number) => void;
  /** Increment the reply count for `commentId` by 1. */
  incrementRepliesCount: (commentId: string) => void;
  /** Decrement the reply count for `commentId` by 1 (floored at 0). */
  decrementRepliesCount: (commentId: string) => void;
}

/**
 * Per-quiz SWR-backed thread map.
 *
 * Pass `quizId: null` to disable the store (all helpers become no-ops
 * returning 0 / false). The hook is safe to call from many components
 * — they all share the same global cache entry.
 *
 * @example
 *   const lookup = useCommentThreadLookup(quizId);
 *
 *   // Disable the Reply button when the thread is full:
 *   <Button disabled={lookup.isAtReplyCap(parentId)}>Reply</Button>
 */
export function useCommentThreadLookup(
  quizId: string | null,
): UseCommentThreadLookup {
  const key = useMemo(
    () => (quizId === null ? null : commentThreadKey(quizId)),
    [quizId],
  );

  // Local SWR instance for reads. The fetcher is a seed; the real
  // values are written via `mutate` from `useSWRConfig` below.
  const { data } = useSWR<ThreadMap>(
    key,
    readOrSeed as never,
    {
      fallbackData: emptyMap(),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    } as never,
  );

  const { mutate: globalMutate } = useSWRConfig();

  const write = useCallback(
    (updater: (prev: ThreadMap) => ThreadMap) => {
      if (key === null) return;
      void globalMutate(
        key,
        (current: ThreadMap | undefined): ThreadMap => {
          const prev: ThreadMap = current ?? emptyMap();
          return updater(prev);
        },
        { revalidate: false },
      );
    },
    [globalMutate, key],
  );

  const setRepliesCount = useCallback(
    (commentId: string, count: number) => {
      const safeCount = Math.max(0, Math.floor(count));
      write((prev) =>
        Object.freeze({
          ...prev,
          [commentId]: Object.freeze({
            repliesCount: safeCount,
            replyCap: prev[commentId]?.replyCap ?? REPLY_CAP,
          }),
        }),
      );
    },
    [write],
  );

  const incrementRepliesCount = useCallback(
    (commentId: string) => {
      write((prev) => {
        const existing = prev[commentId];
        const currentCount = existing?.repliesCount ?? 0;
        return Object.freeze({
          ...prev,
          [commentId]: Object.freeze({
            repliesCount: currentCount + 1,
            replyCap: existing?.replyCap ?? REPLY_CAP,
          }),
        });
      });
    },
    [write],
  );

  const decrementRepliesCount = useCallback(
    (commentId: string) => {
      write((prev) => {
        const existing = prev[commentId];
        const currentCount = existing?.repliesCount ?? 0;
        return Object.freeze({
          ...prev,
          [commentId]: Object.freeze({
            repliesCount: Math.max(0, currentCount - 1),
            replyCap: existing?.replyCap ?? REPLY_CAP,
          }),
        });
      });
    },
    [write],
  );

  const getRepliesCount = useCallback(
    (commentId: string) => data?.[commentId]?.repliesCount ?? 0,
    [data],
  );

  const isAtReplyCap = useCallback(
    (commentId: string) => {
      const entry = data?.[commentId];
      const count = entry?.repliesCount ?? 0;
      const cap = entry?.replyCap ?? REPLY_CAP;
      return count >= cap;
    },
    [data],
  );

  return {
    getRepliesCount,
    isAtReplyCap,
    setRepliesCount,
    incrementRepliesCount,
    decrementRepliesCount,
  };
}
