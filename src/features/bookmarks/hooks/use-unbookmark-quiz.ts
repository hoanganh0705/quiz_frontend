'use client';

/**
 * `useUnbookmarkQuiz` — Story 3.10's remove-bookmark action hook.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.C2.
 *
 * A thin wrapper around `useOptimisticToggle` (Story 3.9 B1) that
 * removes a quiz from the collection that currently supplies its
 * bookmarked state, with optimistic update + rollback on failure
 * and multi-collection reconciliation on success.
 *
 * ## Why the targeted-status lookup
 *
 * The membership is denormalized across owned collections — the same
 * quiz can live in multiple collections. `removeBookmark` on the wire
 * requires a specific `collectionId` (the A2 wrapper's signature is
 * `removeBookmark(collectionId, quizId)`), so this hook:
 *
 *   1. Calls `getBookmarkStatus(quizId)` first to identify which
 *      owned collection(s) currently contain the quiz.
 *   2. If the status returns zero owned collections, the request is
 *      a no-op followed by membership revalidation (the local cache
 *      is already correct; we just want the server to confirm).
 *   3. If the status returns one collection, the hook issues the
 *      `DELETE /api/v1/bookmarks/collections/:collectionId/quizzes/:quizId`
 *      against that collection.
 *   4. If the status returns more than one owned collection, the
 *      hook picks the deterministic "first" collection (`[0]`) so
 *      multi-collection users still get an actionable remove path;
 *      the membership revalidation will rerun the fan-out so any
 *      other collection's membership survives as a true positive.
 *
 * The targeted status response is the canonical source of truth
 * for "which owned collection currently contains this quiz" — it
 * never returns 404 (verified at TKT-3.10.A1 §4).
 *
 * ## Optimistic + rollback
 *
 * The hook pushes the optimistic membership Set without the target
 * `quizId` BEFORE the network promise settles. On any non-success
 * outcome the local cache is rolled back; on success the SWR cache
 * is invalidated for the membership, status, and collection-summary
 * keys so every consumer rerenders.
 *
 * ## Auth gate
 *
 * When the user is unauthenticated, `unbookmark()` short-circuits to
 * a no-op and records `lastOutcome.kind === 'unauthenticated'` so
 * the slot (D4) can branch on it.
 *
 * ## Outcome model
 *
 * Same as `useBookmarkQuiz` — see C1 for the discriminated union.
 * Subset that applies to unbookmark:
 *   - `success` — server confirmed the deletion; membership refreshed.
 *   - `already_unbookmarked` — status reported no membership; nothing
 *     to remove; membership revalidation triggered.
 *   - `reverted` — 4xx / 429 / 5xx / network failure; the optimistic
 *     write is rolled back.
 *   - `unauthenticated` — no-op; the slot ignores the click.
 *
 * @see useOptimisticToggle (Story 3.9 B1)
 * @see useBookmarkedQuizIds (B3)
 * @see getBookmarkStatus (A2 wrapper)
 * @see removeBookmark (A2 wrapper)
 * @see BookmarkButtonSlot (D4)
 */

import { useCallback, useState } from 'react';
import { mutate as globalMutate } from 'swr';

import {
  type OptimisticToggleError,
  isApiError,
  useOptimisticToggle,
} from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { broadcastBookmarksInvalidated } from '@/lib/api/core/bookmarks-broadcast-channel';
import {
  getBookmarkStatus,
  removeBookmark,
} from '@/features/bookmarks/api';
import {
  bookmarkCollectionsKey,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
  bookmarkedQuizIdsKey,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import { useUser } from '@/features/users/store/user-store';

export type UnbookmarkMutationOutcomeKind =
  | 'success'
  | 'already_unbookmarked'
  | 'reverted'
  | 'unauthenticated';

export interface UnbookmarkMutationOutcome {
  /**
   * The discriminated outcome kind. See `UnbookmarkMutationOutcomeKind`.
   */
  kind: UnbookmarkMutationOutcomeKind;
  /**
   * The HTTP / network cause for `reverted` outcomes. Otherwise
   * `null`.
   */
  cause: unknown;
}

export interface UseUnbookmarkQuizResult {
  /**
   * `true` while the unbookmark mutation is in-flight.
   */
  isPending: boolean;
  /**
   * The latest error from a reverted toggle, or `null`.
   */
  lastError: OptimisticToggleError | null;
  /**
   * The discriminated outcome. `null` while no call has been issued.
   */
  lastOutcome: UnbookmarkMutationOutcome | null;
  /**
   * Fire the unbookmark action.
   */
  unbookmark: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS = bookmarkCollectionsKey() as unknown as readonly unknown[];

/**
 * Push the optimistic membership payload into SWR's cache, with the
 * target `quizId` removed. We compute a fresh `Set` from the prior
 * cache payload, drop the `quizId`, and serialize it back to the
 * canonical `BookmarkedQuizResponseDto[]` shape so
 * `useBookmarkedQuizIds` re-derives the same `Set` on its next render.
 *
 * Replace, never mutate — the same discipline
 * `useBookmarkedQuizIds` follows on read (B3 AC #6).
 */
async function pushOptimisticBookmarkedQuizIdRemoval(
  quizId: string,
): Promise<void> {
  const current = (await globalMutate(
    KEY_MEMBERSHIP,
    undefined,
    { revalidate: false },
  )) as unknown;

  const priorList: ReadonlyArray<{ quizId: string }> = Array.isArray(current)
    ? (current as ReadonlyArray<{ quizId: string }>)
    : [];

  const nextList = priorList.filter(
    (item) => item && item.quizId !== quizId,
  );

  await globalMutate(KEY_MEMBERSHIP, nextList, {
    revalidate: false,
    populateCache: true,
  });
}

/**
 * Roll back the optimistic removal pushed by
 * `pushOptimisticBookmarkedQuizIdRemoval`. A real revalidation so SWR
 * refetches the canonical membership snapshot.
 */
async function rollbackOptimisticBookmarkedQuizIdRemoval(): Promise<void> {
  await globalMutate(KEY_MEMBERSHIP, undefined, {
    revalidate: true,
  });
}

export function useUnbookmarkQuiz(quizId: string): UseUnbookmarkQuizResult {
  const { isAuthenticated } = useAuthState();
  // The current user is the broadcast scope for F2. See
  // `useBookmarkQuiz` for the rationale on lazy reads.
  const currentUser = useUser();

  const [lastOutcome, setLastOutcome] =
    useState<UnbookmarkMutationOutcome | null>(null);

  // Keys to invalidate on success / 404. Same as C1's set, since
  // the membership + status + collection-summary caches all need
  // to refresh after a successful remove.
  const keysToInvalidate: readonly unknown[] = isAuthenticated && quizId
    ? [
        KEY_MEMBERSHIP,
        KEY_COLLECTIONS,
        ['bookmark-status', quizId],
      ]
    : [];

  // The wrapped toggle: look up the targeted status, pick the
  // first owned collection, fire the deletion. Catch 404 (the
  // collection was deleted server-side) and reconcile as success,
  // matching C1's 409 reconciliation.
  const wrappedToggle = useCallback(async (): Promise<void> => {
    // Auth gate.
    if (!isAuthenticated || !quizId) {
      setLastOutcome({ kind: 'unauthenticated', cause: null });
      return;
    }

    // Step 1 — targeted status. This endpoint never returns 404,
    // so we only handle non-success outcomes via the primitive's
    // classification.
    let statusCollections: ReadonlyArray<{ collectionId: string }> = [];
    try {
      const status = await getBookmarkStatus(quizId);
      // The wrapper returns the same `WrappedDto & { data? }` shape
      // as the other bookmark wrappers; `data?.collections` is the
      // canonical list of owned collections that currently contain
      // the quiz.
      const data = (status as unknown as { data?: { collections?: Array<{ collectionId: string }> } })?.data;
      statusCollections = data?.collections ?? [];
    } catch {
      // Status fetch failed (network / 5xx). Treat as reverted so
      // the primitive classifies + surfaces. We DON'T push an
      // optimistic write because the membership may legitimately
      // still include the quiz.
      setLastOutcome({ kind: 'reverted', cause: undefined });
      throw new Error('status fetch failed');
    }

    // Step 2 — no-op when the quiz is not currently in any owned
    // collection. The local membership cache may be stale; we
    // revalidate and report success.
    if (statusCollections.length === 0) {
      await Promise.all(
        keysToInvalidate.map((key) =>
          globalMutate(key, undefined, { revalidate: true }),
        ),
      );
      // F2 — publish a cross-tab invalidation so any tab whose
      // local cache is stale (or has just been opened) reflects
      // the canonical "not bookmarked" state. Receiving tabs
      // scope the revalidation to `currentUser.userId` (F3).
      if (currentUser?.userId) {
        broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
      setLastOutcome({ kind: 'already_unbookmarked', cause: null });
      return;
    }

    // Step 3 — pick the deterministic first collection. The wire
    // endpoint requires ONE `collectionId`; for multi-collection
    // membership we remove from the first and rely on the membership
    // revalidation to refresh the cached Set (other collections'
    // memberships survive as true positives via B3's `quizIds.has(id)`
    // check).
    const targetCollectionId = statusCollections[0]!.collectionId;

    // Step 4 — optimistic removal BEFORE the network call.
    await pushOptimisticBookmarkedQuizIdRemoval(quizId);

    try {
      await removeBookmark(targetCollectionId, quizId);
      // Success — the primitive invalidates the cached keys via
      // its `keysToInvalidate` policy. F2 — publish a cross-tab
      // invalidation so other tabs refresh their membership cache.
      if (currentUser?.userId) {
        broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
      setLastOutcome({ kind: 'success', cause: null });
      return;
    } catch (cause: unknown) {
      // 404 reconciliation — the collection was deleted server-side.
      // The local optimistic removal is correct (the collection is
      // gone), so we record success-equivalent + let the primitive
      // invalidate the cache. We also publish a cross-tab
      // invalidation because the membership IS in the unbookmarked
      // state (the collection just disappeared).
      if (isApiError(cause) && cause.status === 404) {
        if (currentUser?.userId) {
          broadcastBookmarksInvalidated({ userId: currentUser.userId });
        }
        setLastOutcome({ kind: 'success', cause });
        return;
      }
      // Any other failure — revert the optimistic write and let
      // the primitive classify + surface. NO broadcast.
      await rollbackOptimisticBookmarkedQuizIdRemoval();
      setLastOutcome({ kind: 'reverted', cause });
      throw cause;
    }
  }, [isAuthenticated, quizId, keysToInvalidate, currentUser]);

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: true,
    toggle: wrappedToggle,
    keysToInvalidate,
  });

  const unbookmark = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !quizId) {
      setLastOutcome({ kind: 'unauthenticated', cause: null });
      return NOOP();
    }
    await toggle();
  }, [isAuthenticated, quizId, toggle]);

  return {
    isPending: status === 'pending',
    lastError,
    lastOutcome,
    unbookmark,
  };
}