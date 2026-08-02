'use client';

/**
 * `useBookmarkQuiz` — Story 3.10's optimistic add-bookmark action hook.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.C1.
 *
 * A thin wrapper around `useOptimisticToggle` (Story 3.9 B1) that:
 *
 *   - Optimistically adds `quizId` to a fresh `Set<string>` and pushes
 *     the optimistic value into the membership cache BEFORE the
 *     network promise settles.
 *   - Calls `addBookmark(defaultCollectionId, { quizId })` from the
 *     A3 wrapper.
 *   - Reconciles a `409 BOOKMARK_CONFLICT` as a bookmarked success
 *     (the source epic line 1105 records this — the optimistic flip
 *     stays in place and the response code is treated as success).
 *   - Invalidates the membership, collection-summary, and targeted
 *     status SWR keys on success / 404 so every consumer rerenders.
 *   - Returns a typed `no_collection` outcome when the user owns zero
 *     collections, so the slot (D4) can open the setup prompt without
 *     firing an HTTP mutation.
 *   - Calls within 500 ms coalesce via `useOptimisticToggle` (Story
 *     3.9 line 999).
 *
 * ## Why a wrapper around `useOptimisticToggle`
 *
 * Story 3.9 introduced the canonical primitive for Phase 3 optimistic
 * mutations. Story 3.10 reuses it verbatim — no Story 3.10 modification
 * of the primitive. The 500 ms cooldown, the SWR cache invalidation
 * policy, and the error-kind classification all live in the primitive.
 * This hook adds ONLY the bookmark-specific wiring:
 *
 *   1. The optimistic `Set<string>` write against the membership
 *      cache (B3) BEFORE the network call settles.
 *   2. The 409 → bookmarked reconciliation BEFORE handing the
 *      promise to the primitive (the primitive classifies 409 as
 *      `http_4xx` and reverts, so this hook intercepts the path).
 *   3. The typed `no_collection` outcome (no HTTP call at all when
 *      the user owns zero collections).
 *
 * ## Auth gate (AC #7)
 *
 * When the user is unauthenticated, the hook short-circuits to a
 * no-op `bookmark()` callback so the slot (D4) can never fire an
 * HTTP mutation against a logged-out session. `isAuthenticated === false`
 * is also the documented state where `useDefaultCollectionId` returns
 * `null`, so this gate composes deterministically.
 *
 * ## Outcome model (AC #6, lastOutcome)
 *
 * The `lastOutcome` discriminated union is the slot's (D4) signal to
 * open `<BookmarksSetupPrompt />` without firing a mutation. The
 * primitive's `status` field surfaces the network result; this hook's
 * local React state surfaces the no-collection outcome that the
 * primitive cannot represent. They are deliberately separate —
 * `status` reflects the network outcome, `lastOutcome` reflects the
 * user-facing outcome.
 *
 * @see useOptimisticToggle (Story 3.9 B1)
 * @see useBookmarkedQuizIds (B3 — membership cache)
 * @see useDefaultCollectionId (B2 — collection selection)
 * @see addBookmark (A3 wrapper)
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
import { addBookmark } from '@/features/bookmarks/api';
import {
  bookmarkCollectionsKey,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
  buildBookmarkedQuizIdSet,
  bookmarkedQuizIdsKey,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import { useDefaultCollectionId } from '@/features/bookmarks/hooks/use-default-collection-id';
import { useUser } from '@/features/users/store/user-store';

/**
 * The discriminated outcome of a `bookmark()` call. The slot (D4)
 * branches on `kind`:
 *
 *   - `success` → optimistic add confirmed by the server.
 *   - `already_bookmarked` → server returned 409; reconciled as a
 *     success (no rollback, no error notice).
 *   - `no_collection` → user owns zero collections; the slot opens
 *     `BookmarksSetupPrompt` without firing any HTTP mutation.
 *   - `reverted` → 4xx (other than 409) / 429 / 5xx / network
 *     failure; the slot surfaces the inline error notice.
 *   - `unauthenticated` → no-op; the slot treats the user as if
 *     they hadn't clicked.
 */
export type BookmarkMutationOutcomeKind =
  | 'success'
  | 'already_bookmarked'
  | 'no_collection'
  | 'reverted'
  | 'unauthenticated';

export interface BookmarkMutationOutcome {
  /**
   * The discriminated outcome kind. See `BookmarkMutationOutcomeKind`.
   */
  kind: BookmarkMutationOutcomeKind;
  /**
   * The HTTP / network cause for `reverted` outcomes; otherwise
   * `null`. The slot (D4) uses this only for diagnostic logging; the
   * user-facing copy lives in the C3 mapper.
   */
  cause: unknown;
}

export interface UseBookmarkQuizResult {
  /**
   * `true` while the in-flight bookmark mutation is pending. The
   * slot (D4) wires this to `<BookmarkButton />`'s `isPending`
   * prop (D1) so the button renders the busy state.
   */
  isPending: boolean;
  /**
   * The latest error from a reverted toggle, or `null`. The slot
   * wires this to the bookmark error mapper (C3) which produces
   * the user-facing copy. `null` whenever the most recent call was
   * `success`, `already_bookmarked`, `no_collection`, or
   * `unauthenticated`.
   */
  lastError: OptimisticToggleError | null;
  /**
   * The discriminated outcome of the most recent `bookmark()` call.
   * `null` while no call has been issued yet. The slot (D4)
   * branches on `kind === 'no_collection'` to open the setup prompt
   * without firing a mutation.
   */
  lastOutcome: BookmarkMutationOutcome | null;
  /**
   * Fire the bookmark action. The parent calls this from
   * `<BookmarkButton onBookmark={bookmark} />`. The promise resolves
   * synchronously to `void` — outcomes surface via `lastOutcome` /
   * `lastError`.
   */
  bookmark: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
  return;
};

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS = bookmarkCollectionsKey() as unknown as readonly unknown[];

/**
 * Push the optimistic membership payload into SWR's cache. We
 * compute a fresh `Set<string>` that is a copy of the prior cache
 * plus the new id, then serialize it back to the canonical
 * `BookmarkedQuizResponseDto[]` shape so `useBookmarkedQuizIds`
 * re-derives the same `Set` on its next render.
 *
 * Replace, never mutate — the same discipline `useBookmarkedQuizIds`
 * follows on read (B3 AC #6). An optimistic placeholder
 * `BookmarkedQuizResponseDto` carries the canonical field set with
 * `bookmarkId` prefixed `optimistic-` so a future C1 success
 * replacement (B-keyed fetch) supersedes it cleanly.
 */
async function pushOptimisticBookmarkedQuizIds(
  quizId: string,
): Promise<void> {
  const current = (await globalMutate(
    KEY_MEMBERSHIP,
    undefined,
    { revalidate: false },
  )) as unknown;

  const priorList: ReadonlyArray<{
    bookmarkId: string;
    quizId: string;
    quizTitle: string;
    quizSlug: string;
    quizImageUrl: string | null;
    quizIsFeatured: boolean;
    notes: string | null;
    bookmarkedAt: string;
  }> = Array.isArray(current)
    ? (current as ReadonlyArray<{
        bookmarkId: string;
        quizId: string;
        quizTitle: string;
        quizSlug: string;
        quizImageUrl: string | null;
        quizIsFeatured: boolean;
        notes: string | null;
        bookmarkedAt: string;
      }>)
    : [];

  const nextList = [
    ...priorList,
    {
      bookmarkId: `optimistic-${quizId}`,
      quizId,
      quizTitle: '',
      quizSlug: '',
      quizImageUrl: null,
      quizIsFeatured: false,
      notes: null,
      bookmarkedAt: new Date().toISOString(),
    },
  ];

  await globalMutate(KEY_MEMBERSHIP, nextList, {
    revalidate: false,
    populateCache: true,
  });
}

/**
 * Roll back the optimistic write pushed by
 * `pushOptimisticBookmarkedQuizIds`. We trigger a real revalidation
 * so SWR refetches the canonical membership snapshot — the
 * `useOptimisticToggle` primitive owns the cache invalidation on the
 * success / 404 path; this rollback owns the failure path.
 */
async function rollbackOptimisticBookmarkedQuizIds(): Promise<void> {
  await globalMutate(KEY_MEMBERSHIP, undefined, {
    revalidate: true,
  });
}

export function useBookmarkQuiz(quizId: string): UseBookmarkQuizResult {
  const { isAuthenticated } = useAuthState();
  const { defaultCollectionId, isLoading: defaultCollectionLoading } =
    useDefaultCollectionId();
  // The current user is the broadcast scope. We read it lazily at the
  // moment a terminal outcome is reached; reading it on every render
  // would be wasteful (the store rarely changes once the user is
  // authenticated) and the broadcast only needs the userId once per
  // mutation. The `useUser` selector is reference-stable (it returns
  // the same `null` or user object until the store updates).
  const currentUser = useUser();

  // The `lastOutcome` state is local React state — the
  // `useOptimisticToggle` primitive represents the network outcome
  // (`success` / `reverted` / `pending` / `idle`); this hook adds
  // the `no_collection` outcome that the primitive cannot represent
  // because no HTTP call is ever fired.
  const [lastOutcome, setLastOutcome] =
    useState<BookmarkMutationOutcome | null>(null);

  // Keys to invalidate on success / 404. The C1 hook invalidates:
  //   - the membership cache (B3) — every `useIsBookmarked`
  //     consumer rerenders.
  //   - the collections summary (B1) — `useDefaultCollectionId`
  //     rerenders and any future `createCollection` reflects
  //     updated `quizCount` totals.
  //   - the targeted status key (`['bookmark-status', quizId]`) —
  //     future per-quiz status reads get the canonical 200 reply.
  const keysToInvalidate: readonly unknown[] = isAuthenticated && quizId
    ? [
        KEY_MEMBERSHIP,
        KEY_COLLECTIONS,
        ['bookmark-status', quizId],
      ]
    : [];

  // The toggle function the primitive will invoke. We wrap the
  // wrapper call so we can intercept the 409 path BEFORE handing
  // the promise to `useOptimisticToggle` — the primitive classifies
  // 409 as `http_4xx` and reverts, which is the wrong behavior for
  // bookmarks (the source epic reconciles 409 as bookmarked success
  // at line 1105).
  const wrappedToggle = useCallback(async (): Promise<void> => {
    // Auth gate (AC #7) — never fire when unauthenticated.
    if (!isAuthenticated || !quizId) {
      // Mark the outcome so the slot (D4) sees the reason.
      setLastOutcome({ kind: 'unauthenticated', cause: null });
      // Returning without throwing lets the primitive resolve to
      // `status: 'success'` — but the slot reads `lastOutcome`
      // instead, which says `unauthenticated`. We do NOT mark
      // `lastError`, so the error notice stays hidden.
      return;
    }

    // Zero-collection outcome (AC #6) — the user owns no
    // collections; the setup prompt must render BEFORE any HTTP
    // call. We skip the network call entirely, set the outcome,
    // and return so the primitive sees `status: 'success'`.
    if (!defaultCollectionLoading && defaultCollectionId === null) {
      setLastOutcome({ kind: 'no_collection', cause: null });
      return;
    }

    // Defensive — while the collections list is hydrating we do
    // not yet know the default. Mark `no_collection` so the slot
    // opens the prompt and waits for hydration. This avoids a
    // race where a click during hydration fires before the
    // default is available.
    if (defaultCollectionLoading || defaultCollectionId === null) {
      setLastOutcome({ kind: 'no_collection', cause: null });
      return;
    }

    // Optimistic push BEFORE the network call (AC #1). The cache
    // mutation is synchronous from the consumer's perspective
    // because SWR's `mutate` is `Promise`-returning but
    // populates the cache before it settles.
    await pushOptimisticBookmarkedQuizIds(quizId);

    try {
      await addBookmark(defaultCollectionId, { quizId });
      // Success — the primitive invalidates the membership + status
      // keys via its `keysToInvalidate` policy. We additionally
      // publish a cross-tab invalidation (F2) so other tabs refresh
      // their membership cache without a stale window. The broadcast
      // carries the userId so the receiving tabs (F3) can scope
      // the revalidation to the same user.
      if (currentUser?.userId) {
        broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
      setLastOutcome({ kind: 'success', cause: null });
      return;
    } catch (cause: unknown) {
      // 409 reconciliation (AC #4). The wrapper propagates the
      // `ApiError` unchanged; we surface it as a no-throw so the
      // primitive records a successful toggle and invalidates the
      // cache. The slot renders no error. We still publish the
      // cross-tab invalidation because the membership IS in the
      // bookmarked state (the server just reported a duplicate).
      if (isApiError(cause) && cause.status === 409) {
        if (currentUser?.userId) {
          broadcastBookmarksInvalidated({ userId: currentUser.userId });
        }
        setLastOutcome({ kind: 'already_bookmarked', cause: null });
        return;
      }
      // Any other failure — revert the optimistic write and let
      // the primitive classify + surface. NO broadcast: a failed
      // mutation must not propagate to sibling tabs (F2 AC #4).
      await rollbackOptimisticBookmarkedQuizIds();
      setLastOutcome({ kind: 'reverted', cause });
      throw cause;
    }
  }, [isAuthenticated, quizId, defaultCollectionId, defaultCollectionLoading, currentUser]);

  const { status, lastError, toggle } = useOptimisticToggle({
    currentValue: false,
    toggle: wrappedToggle,
    keysToInvalidate,
  });

  const bookmark = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !quizId) {
      // Record the outcome before returning the no-op so the slot
      // (D4) can branch on it without needing to inspect auth state.
      // The primitive's toggle is intentionally NOT called — there is
      // no network promise to settle and no cooldown to enforce.
      setLastOutcome({ kind: 'unauthenticated', cause: null });
      return NOOP();
    }
    await toggle();
  }, [isAuthenticated, quizId, toggle]);

  return {
    isPending: status === 'pending',
    lastError,
    lastOutcome,
    bookmark,
  };
}

/**
 * Re-export the B3 helper so the slot (D4) can derive the same
 * canonical `Set<string>` membership representation without
 * importing from the hooks barrel. Mirrors `useIsBookmarked.ts`'s
 * re-export pattern (B4).
 */
export { buildBookmarkedQuizIdSet };
