/**
 * `features/admin/review-moderation/cache/review-moderation-cache-keys.ts`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.G1.
 *
 * ## Purpose
 *
 * Single source of truth for the SWR cache keys that every review
 * moderation hook (read + mutation) participates in, plus the
 * invalidation helpers that consumer hooks call. The keys cover:
 *
 *   - the admin offset list (`reviewReports:list:<show>` / array form
 *     `['admin', 'review-reports', 'list', show]`)
 *   - the offending-review single read (`review:<id>` / array form
 *     `['admin', 'review-moderation', 'review', reviewId]`)
 *   - the Phase 4 public review reads (`reviews:*` array form
 *     `['reviews', ...]`)
 *
 * Every mutation hook (`useResolveReviewReport` / TKT-7.5.C2) imports
 * the keys from here so the contract is consistent across the hook
 * surface. TKT-7.5.G2 builds on this file to add cross-tab
 * invalidation broadcasts.
 *
 * ## Re-exports
 *
 * `reviewReportsKeyMatcher` is re-exported from
 * `hooks/useReviewReports.ts` so a single import line on the consumer
 * side gives callers everything they need to invalidate every page of
 * the queue. `REVIEW_READ_KEY` is re-exported from
 * `hooks/useReview.ts` for the same reason.
 *
 * Both helpers originate in the hook files because they were authored
 * as part of those hooks (TKT-7.5.C1 / TKT-7.5.C3) and are tested in
 * the per-hook specs. This module centralizes the invalidation calls
 * without duplicating the matcher logic.
 *
 * ## Public-coverage matcher semantics
 *
 * `publicReviewsKeyMatcher` is the predicate SWR's
 * `mutate(matcher)` form accepts; it covers every Phase 4 public
 * review read (`['reviews', ...]`), matching the
 * `invalidateReviewCaches` predicate documented in
 * `features/reviews/types/review.types.ts`. The `useResolveReviewReport`
 * hook calls `invalidateReviewById(reviewId)` after a resolve so the
 * public list, the my-review key, and the eligibility key all refresh
 * on the next visit.
 *
 * ## Multi-key shape divergence note
 *
 * The planning document originally specified a single
 * `reviewReports:list:<show>:<page>` string key, but the actual
 * implementation uses the SWR array form
 * `['admin', 'review-reports', 'list', show]`. The matcher is
 * shape-agnostic — it tests the leading tuple segments so a future
 * switch to a `cursor`-keyed form would still be invalidated by a
 * single helper call.
 */

import { mutate as globalMutate, type ScopedMutator } from 'swr';

import {
  reviewReportsKeyMatcher,
} from '../hooks/useReviewReports';
import { REVIEW_READ_KEY } from '../hooks/useReview';

// ─── Re-exports ─────────────────────────────────────────────────────────────

/**
 * Re-export the queue matcher. The matcher lives in `useReviewReports.ts`
 * because it was authored as part of TKT-7.5.C1; this module centralizes
 * the consumer-facing invalidation API.
 */
export { reviewReportsKeyMatcher };

// ─── Per-review key ─────────────────────────────────────────────────────────

/**
 * Build the SWR cache key for the offending-review single read.
 *
 * The key is the `REVIEW_READ_KEY` shape produced by the
 * `useReview` hook (TKT-7.5.C3) — a tuple whose leading segments
 * isolate the admin namespace. The helper is a thin alias so
 * consumers do not need to import `REVIEW_READ_KEY` directly.
 */
export function reviewKey(
  reviewId: string,
): ['admin', 'review-moderation', 'review', string] {
  // `REVIEW_READ_KEY` accepts `string | null`; the public surface here
  // is non-nullable because cache invalidation always targets a
  // known id.
  return REVIEW_READ_KEY(reviewId) as ['admin', 'review-moderation', 'review', string];
}

// ─── Public-coverage matcher ────────────────────────────────────────────────

/**
 * Predicate matched against each cache key. Returns `true` for every
 * entry whose key belongs to the public Phase 4 review namespace —
 * i.e. the leading segment is `'reviews'` and the second segment is
 * one of the documented discriminators (`'quiz'`, `'my'`,
 * `'eligibility'`).
 *
 * The matcher mirrors the predicate embedded in
 * `invalidateReviewCaches(quizId, sessionId)` so a single global call
 * to `invalidateReviewById` (which doesn't know the quiz id) covers
 * every entry — including the my-review key for an arbitrary session.
 */
export function publicReviewsKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  if (key[0] !== 'reviews') return false;
  const segment = key[1];
  return (
    segment === 'quiz' ||
    segment === 'my' ||
    segment === 'eligibility'
  );
}

// ─── Invalidation helpers ───────────────────────────────────────────────────

/**
 * Revalidate every SWR cache entry belonging to the review moderation
 * queue.
 *
 * Calls `mutate(reviewReportsKeyMatcher)` so a single mutation
 * revalidates every `show` variant (`'pending'`, `'resolved'`) of
 * the list. The helper is the one consumers call — they never need
 * to import the matcher directly.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateReviewReportsList(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  return (mutate(reviewReportsKeyMatcher) as unknown) as Promise<unknown[]>;
}

/**
 * Revalidate the SWR cache entries tied to a single offending review.
 *
 * Calls `mutate` against:
 *   - `reviewKey(reviewId)` — the admin side-panel fallback read
 *     (TKT-7.5.C3).
 *   - `publicReviewsKeyMatcher` — every Phase 4 public review read
 *     (`['reviews', 'quiz', ...]`, `['reviews', 'my', ...]`,
 *     `['reviews', 'eligibility', ...]`). The matcher is
 *     intentionally permissive: a `hide_review` action can affect
 *     every list the review is a member of, and a `delete_review`
 *     action removes the review entirely.
 *
 * @param reviewId — the offending review id.
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateReviewById(
  reviewId: string,
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  if (!reviewId || typeof reviewId !== 'string') {
    return Promise.resolve([]);
  }
  const promises: unknown[] = [];
  promises.push(mutate(reviewKey(reviewId)));
  promises.push(
    (mutate(publicReviewsKeyMatcher) as unknown) as Promise<unknown[]>,
  );
  return Promise.all(promises) as Promise<unknown[]>;
}
