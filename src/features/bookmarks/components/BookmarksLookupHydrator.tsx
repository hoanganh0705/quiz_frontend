'use client';

/**
 * `<BookmarksLookupHydrator />` — a zero-DOM `'use client'` component
 * that pre-populates the bookmark membership SWR cache on the first
 * authenticated render of any public route, AND subscribes to remote
 * invalidation events so cross-tab mutations reflect immediately.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source tickets: TKT-3.10.E3, TKT-3.10.F3.
 *
 * ## Why this component exists
 *
 * Every public quiz surface (cards on `/quizzes`, cards on home rails,
 * the quiz detail CTA strip) consumes `useIsBookmarked` (B4), which
 * reads from `useBookmarkedQuizIds` (B3) — an SWR-backed cache. Without
 * pre-hydration, the very first render reads the membership `Set` as
 * empty and surfaces the unbookmarked branch (the loading branch on the
 * D1 primitive) until the SWR fetch lands; the buttons then swap to the
 * resolved state on a separate render. Story 3.10 AC for "membership
 * settled state" calls for the cache to be warm on first render so the
 * resolved branch is reachable on the very first paint.
 *
 * By mounting this hydrator at the top of the public-route layout
 * (E4), the membership SWR cache begins populating on the first render
 * of the route — in parallel with the route's other data — so by the
 * time a card is visible to the user, the cached `Set` has either
 * resolved or is still fetching with a sensible default.
 *
 * ## F3 — Cross-tab revalidation
 *
 * Story 3.10 AC for "cross-tab synchronization" requires that a
 * bookmark mutation in tab A surfaces in tab B within approximately
 * one second. The hydrator (mounted in the public layout — E4) is
 * the natural place to mount the listener: it is the singleton owner
 * of the membership SWR cache, and every consumer in tab B reads
 * from the same cache. When a remote `bookmarks/invalidated` event
 * arrives carrying the local user's `userId`, the hydrator
 * revalidates the membership + collection-summary SWR keys. SWR's
 * in-flight fan-out (B3) re-fetches `useBookmarkedQuizIds`, the
 * returned list is reshaped into a `Set<string>`, and every
 * `<BookmarkButtonSlot />` subscribed via `useIsBookmarked`
 * (B4) rerenders.
 *
 * The listener is scoped to the active user:
 *
 *   - Different-user events are ignored (a tab whose user is `A`
 *     must not revalidate on an event from user `B`).
 *   - Same-tab events are already filtered by the channel
 *     (`tabId` check in F1) — the hydrator does not need a
 *     second guard.
 *   - Unauthenticated tabs do not subscribe (the `userId === null`
 *     short-circuit prevents an empty scope from creating a
 *     subscription that would revalidate against `null`).
 *
 * The listener is registered exactly once per (userId, mount)
 * tuple: a `userId` change (login/logout/switch) tears down the
 * prior subscription and registers a new one with the new scope.
 *
 * ## What this component owns
 *
 *   - The decision to read `useBookmarkedQuizIds()` on the first
 *     authenticated render (the call IS the hydration — SWR's
 *     first `useSWR` invocation triggers the cache write).
 *   - The cross-tab subscription lifetime — the listener lives
 *     for as long as the user is the same and the hydrator is
 *     mounted; cleanup on unmount + user-change is owned by
 *     this component.
 *   - The membership + collection-summary SWR key invalidation
 *     on a matching-user remote event.
 *
 * ## What this component does NOT own
 *
 *   - The actual SWR cache write — `useBookmarkedQuizIds()` does
 *     that via its `useSWR` calls (the first invocation populates
 *     the cache).
 *   - The broadcast on the source tab — that's the F2 ticket;
 *     this ticket only consumes the events.
 *   - The bookmark button UI — those live in the
 *     `<BookmarkButtonSlot />` (D4) and the per-card / per-detail
 *     surfaces (E1 / E2).
 *
 * The hydrator lives under `features/bookmarks/components/`
 * because `useBookmarkedQuizIds` lives under
 * `features/bookmarks/hooks/`. The location mirrors how
 * `FollowedLookupHydrator` lives under `features/tags/components/`
 * (Story 3.9 D2).
 *
 * @see useBookmarkedQuizIds (B3 — the membership SWR cache)
 * @see useIsBookmarked (B4 — the per-quiz reader)
 * @see BookmarkButtonSlot (D4 — the per-surface composer)
 * @see bookmarks-broadcast-channel (F1 — the channel transport)
 */

import { useEffect } from 'react';
import { mutate as globalMutate } from 'swr';

import {
  subscribeToBookmarkEvents,
} from '@/lib/api/core/bookmarks-broadcast-channel';
import {
  bookmarkCollectionsKey,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
  bookmarkedQuizIdsKey,
  useBookmarkedQuizIds,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import { useUser } from '@/features/users/store/user-store';

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS = bookmarkCollectionsKey() as unknown as readonly unknown[];

export function BookmarksLookupHydrator(): null {
  // Reading the hook IS the hydration — SWR's first `useSWR` calls
  // trigger the cache writes for the membership Set (B3 fan-out).
  // The result is intentionally unused; the hook's only job here is
  // to mount the SWR subscriptions in parallel with the route's
  // other data so cards and detail strips see a warm cache.
  useBookmarkedQuizIds();

  // F3 — subscribe to remote-tab bookmark invalidation events.
  // The current user scopes the subscription: events whose
  // `userId` does not match the local user are ignored at the
  // handler here. The channel layer (F1) already filters same-tab
  // events via `tabId`.
  const currentUser = useUser();
  const currentUserId = currentUser?.userId ?? null;

  useEffect(() => {
    // No user → no subscription. The unauthenticated hydrator
    // does not need to revalidate anything (the membership cache
    // is empty and remains empty).
    if (currentUserId === null) {
      return undefined;
    }

    const unsubscribe = subscribeToBookmarkEvents((event) => {
      // Defensive narrowing — the channel's type union is
      // `bookmarks/invalidated` only at the moment, but
      // future event types (e.g. `bookmarks/collection-renamed`)
      // could be added and we want this handler to be a no-op
      // for them.
      if (event.type !== 'bookmarks/invalidated') {
        return;
      }
      // Different-user guard — even though the channel filters
      // same-tab events, a multi-account tab may receive events
      // for the wrong user. The userId payload is the only
      // authoritative scope.
      if (event.userId !== currentUserId) {
        return;
      }
      // Revalidate the membership + collection-summary caches.
      // SWR's fan-out will re-fetch `useBookmarkedQuizIds` and
      // any consumer via `useIsBookmarked` (B4) rerenders. We
      // do NOT pre-populate the cache with a specific value —
      // the server is the source of truth and a partial write
      // could leave the cache in a worse state than stale.
      void Promise.all([
        globalMutate(KEY_MEMBERSHIP, undefined, { revalidate: true }),
        globalMutate(KEY_COLLECTIONS, undefined, { revalidate: true }),
      ]);
    });

    return unsubscribe;
  }, [currentUserId]);

  return null;
}
