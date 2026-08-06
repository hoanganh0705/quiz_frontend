'use client';

/**
 * `useReview` — single-review read hook for the offending-review
 * side panel.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.C3.
 *
 * ## What this hook owns
 *
 * - Fetches a single review by id via `getReviewById` from the
 *   reviews service (Phase 4 / TKT-4.1.F3). The endpoint is public
 *   to authenticated viewers; the queue calls it with the offending
 *   review id surfaced on `AdminReportDto.reviewId` (TKT-7.5.B1).
 * - Wraps `useSWR` (the canonical single-resource reader).
 * - Returns `{ review, isLoading, error }`. The hook is a thin
 *   shim — the embedded-snapshot fallback (when
 *   `report.reviewSnapshot` is present) is the caller's choice:
 *   `ReviewReportDetailPanel` reads `report.reviewSnapshot` first
 *   and only falls back to this hook when the snapshot is missing.
 *
 * ## Disabled state
 *
 * Passing `null` disables the fetcher cleanly: the hook returns
 *   `{ isLoading: false, review: null, error: null }`
 * with no network request issued. This matches the documented
 * pattern from `useQuizReviews` (T-4.13.4) for nullable ids.
 *
 * ## Idempotency
 *
 * SWR's `useSWR` deduplicates re-renders with the same key, so the
 * hook never fetches the same id twice in a row. The contract is
 * inherited from SWR; `useReview` does not introduce custom
 * deduping beyond passing `reviewId` as the cache key element.
 *
 * ## Error classification
 *
 * The hook surfaces the typed `ApiError` from `getReviewById`. The
 * documented `REVIEW_NOT_FOUND` (404) propagates as `ApiError.code
 * === 'REVIEW_NOT_FOUND'` — the side panel (D2 consumer) maps
 * this branch to its "review no longer exists" copy.
 */

import useSWR from 'swr';

import { ApiError } from '@/lib/api';

import {
  getReviewById,
  type ReviewControllerGetReviewByIdResult,
} from '@/features/reviews/services/reviews.service';
import type { ReviewDetailResponseDto } from '@/lib/api/generated/schemas';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseReviewResult {
  /** The review payload (post-unwrap). `null` when disabled or while the first fetch is in flight. */
  review: ReviewDetailResponseDto | null;
  /** True while the first fetch for the active id is in flight. */
  isLoading: boolean;
  /** The typed `ApiError` from the most recent failed fetch. `null` until a failure occurs. */
  error: ApiError | null;
}

// ─── Fetcher helper ─────────────────────────────────────────────────────────

/**
 * Fetcher wrapper. Reads the wrapped payload, returns the unwrapped
 * `ReviewDetailResponseDto`, or `null` when the backend omits the
 * row. The wrapping mirrors what every Phase 4 review read does —
 * never re-implement the unwrap logic.
 */
async function fetchReview(reviewId: string): Promise<ReviewDetailResponseDto | null> {
  const wrapped: ReviewControllerGetReviewByIdResult =
    await getReviewById(reviewId);
  const envelope = wrapped as unknown as {
    data?: ReviewDetailResponseDto;
  };
  return envelope.data ?? null;
}

/**
 * Stable SWR cache key for the offending-review read. The leading
 * `['admin', 'review-moderation', 'review']` namespace isolates
 * this read from public `['reviews', ...]` keys (Phase 4) and from
 * other admin review-moderation surfaces.
 */
export const REVIEW_READ_KEY = (
  reviewId: string | null,
): ['admin', 'review-moderation', 'review', string | null] => [
  'admin',
  'review-moderation',
  'review',
  reviewId,
];

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Single-review read hook for the offending-review side panel.
 *
 * @example
 *   const { review, isLoading, error } = useReview(report.reviewId ?? null);
 *
 *   if (review !== null) { /* render *\/ }
 *   if (isLoading)        { /* render skeleton *\/ }
 *   if (error !== null)  { /* render error state *\/ }
 */
export function useReview(reviewId: string | null): UseReviewResult {
  // SWR's key is `null` when the hook is disabled; SWR treats a
  // `null` key as "do not fetch" and returns `data: undefined,
  // isLoading: false, error: undefined`. We forward this through.
  const { data, isLoading, error } = useSWR<ReviewDetailResponseDto | null, ApiError>(
    REVIEW_READ_KEY(reviewId),
    async () => {
      if (reviewId === null) {
        return null;
      }
      return fetchReview(reviewId);
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
    },
  );

  return {
    review: data ?? null,
    isLoading: reviewId === null ? false : isLoading,
    error: error instanceof ApiError ? error : null,
  };
}
