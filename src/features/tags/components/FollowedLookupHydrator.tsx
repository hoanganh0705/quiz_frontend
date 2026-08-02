'use client';

/**
 * `<FollowedLookupHydrator />` — a zero-DOM `'use client'` component
 * that pre-populates the `useFollowedLookup` SWR cache on the first
 * authenticated render of any public route.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.D2.
 *
 * ## Why this component exists
 *
 * The follow button surface (B5) reads its initial state from
 * `useFollowedLookup()`. Without pre-hydration, the very first render
 * shows `<FollowButtonSkeleton />` while the lookup fetches both
 * `me/followed` endpoints — the button briefly swaps to the resolved
 * state once the lookup lands. Story 3.9 AC #1 calls for "reloading
 * the page preserves the followed state via SWR", and Story 3.9
 * line 975 calls for "Hydrated on first authenticated render
 * (backed by SWR `fallback`)".
 *
 * By mounting this hydrator at the top of the public-route layout,
 * the lookup begins fetching on the first render of the route —
 * the SWR cache is populated in parallel with the route's other
 * data, and the button surface can resolve without a perceptible
 * swap (or, if F3 wires SWR `fallback`, with no swap at all).
 *
 * ## What this component owns
 *
 *   - The decision to read `useFollowedLookup()` on the first
 *     authenticated render (the call IS the hydration — SWR's
 *     first `useSWR` invocation triggers the cache write).
 *   - The unauthenticated short-circuit — the hook itself returns
 *     empty sets when the auth gate is closed (B3), so the
 *     hydrator does NOT need to guard against unauthenticated
 *     access; calling `useFollowedLookup()` unconditionally is
 *     safe.
 *
 * ## What this component does NOT own
 *
 *   - The actual SWR cache write — `useFollowedLookup()` does that
 *     via its `useSWR` calls (the first invocation populates the
 *     cache).
 *   - The SWR `fallbackData` wiring — that's the F3 hardening
 *     ticket; this ticket only ensures the cache is queried on the
 *     first render so a fallback (when present) can short-circuit
 *     the fetch.
 *   - The follow-count / follow-button UI — those live in the
 *     `<CategoryFollowButtonSlot />` and `<TagFollowButtonSlot />`
 *     components (B5).
 *
 * The hydrator lives under `features/tags/` because `useFollowedLookup`
 * lives under `tags/hooks/` (B3) — the lookup is a user-scoped read
 * shared by both categories and tags. The cross-feature shared
 * location mirrors how `useAuthState` lives in `features/auth/`.
 */

import { useFollowedLookup } from '@/features/tags/hooks/useFollowedLookup';

export function FollowedLookupHydrator(): null {
  // Reading the hook IS the hydration — SWR's first `useSWR` call
  // triggers the cache write for the two `me/followed` SWR keys.
  // The result is intentionally unused; the hook's only job here
  // is to mount the SWR subscriptions in parallel with the route's
  // other data.
  useFollowedLookup();
  return null;
}