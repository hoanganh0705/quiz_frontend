/**
 * `useHelpfulReview` — optimistic helpful-review toggle hook.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.11.
 *
 * ## What this hook owns
 *
 * - Toggle a non-owned review's helpful state through
 *   `markReviewHelpful` / `unmarkReviewHelpful` (T-4.13.1).
 * - Optimistically flip the viewer state AND adjust every cached
 *   page of the quiz's review list (`useQuizReviews`) — the
 *   `helpfulCount` on the matching `ReviewDto` increments by 1
 *   (or decrements, clamped at 0) before the network call
 *   resolves.
 * - 500 ms cooldown (matches `useOptimisticToggle`'s standard,
 *   see Story 3.9 line 999) — rapid clicks are dropped, not
 *   queued.
 * - Defensive `REVIEW_FORBIDDEN` rollback — the button is hidden
 *   for own reviews (T-4.13.14), but if a viewer bypasses the
 *   gate the server may still reject with 403 (e.g. the viewer
 *   IS the author of a review they somehow clicked). The hook
 *   rolls back the optimistic update safely.
 *
 * ## State model
 *
 * The hook holds the viewer's `marked` state in local state
 * (the SDK's `ReviewResponseDto` does not include
 * `viewerMarkedHelpful`; the consumer passes the initial value
 * and the hook owns the transitions after that). The
 * `helpfulCount` lives on the cached `ReviewDto` items.
 *
 * ## Return shape
 *
 *   `{ toggle, isPending, viewerMarkedHelpful, lastError, reset }`.
 *   - `toggle()` flips the viewer state and dispatches the
 *     mark/unmark call.
 *   - `isPending: true` while the request is in flight; the
 *     consumer disables the control.
 *   - `viewerMarkedHelpful`: the latest local state. Flips
 *     synchronously before the network call resolves.
 *   - `lastError`: typed `ApiError` for non-success outcomes;
 *     `null` on success or after `reset()`.
 *   - `reset()` clears `lastError`.
 *
 * ## Why not `useOptimisticToggle` directly
 *
 * The primitive flips a boolean and invalidates keys. The
 * helpful toggle needs MORE: it must (a) increment or decrement
 * the `helpfulCount` on every cached page item, (b) clamp at 0,
 * (c) preserve the viewer-marked boolean across re-renders
 * without going through SWR. The primitive would require
 * pre-filtering all cached keys and the count update is best
 * expressed inline. This hook mirrors the primitive's 500 ms
 * cooldown discipline.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { isApiError, ApiError } from '@/lib/api';

import {
  markReviewHelpful,
  unmarkReviewHelpful,
} from '@/features/reviews/services/reviews.service';
import type { ReviewDto } from '@/features/reviews/types';

import type { CursorPage } from '@/lib/api/use-cursor-paginated.types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseHelpfulReviewParams {
  /** Quiz ID — scopes the cache invalidation to the right list pages. */
  quizId: string;
  /** The review being toggled. */
  reviewId: string;
  /** Initial viewer-helpful state. The hook owns subsequent transitions. */
  initialViewerMarkedHelpful: boolean;
}

export interface UseHelpfulReviewResult {
  /**
   * Flip the viewer-helpful state. The local state flips
   * synchronously; the network call fires after the flip.
   * Returns `void` — outcomes surface via `lastError` / `isPending`.
   * Calls within the 500 ms cooldown are dropped silently.
   */
  toggle: () => Promise<void>;
  /** `true` while a mark / unmark is in flight. */
  isPending: boolean;
  /**
   * The viewer's current helpful state. Mirrors the optimistic
   * flip so the consumer can render the correct `aria-pressed`
   * value without waiting for the network.
   */
  viewerMarkedHelpful: boolean;
  /**
   * Typed `ApiError` from the most recent rejected toggle. `null`
   * on success or after `reset()`.
   */
  lastError: ApiError | null;
  /** Clear `lastError` and return to the idle state. */
  reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * 500 ms cooldown between toggles. Matches `useOptimisticToggle`'s
 * Story 3.9 default and the project's standard optimistic
 * mutation policy.
 */
const COOLDOWN_MS = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Predicate matching every cached review-list page for `quizId`.
 * The list pages are keyed by `['reviews', 'quiz', quizId, ...filter]`
 * (T-4.13.2); we match the first three segments so every loaded
 * page is updated.
 */
function isReviewListPageForQuiz(
  key: readonly unknown[],
  quizId: string,
): boolean {
  if (!Array.isArray(key)) return false;
  if (key[0] !== 'reviews' || key[1] !== 'quiz') return false;
  return key[2] === quizId;
}

/**
 * Return a fresh `CursorPage` whose items have the new
 * `helpfulCount` for the matching review. Other items and the
 * cursor metadata are left untouched.
 */
function applyCountDeltaToPage(
  page: CursorPage<ReviewDto>,
  reviewId: string,
  delta: number,
): CursorPage<ReviewDto> {
  let touched = false;
  const nextItems = page.items.map((item): ReviewDto => {
    if (item.reviewId !== reviewId) return item;
    touched = true;
    const next = Math.max(0, item.helpfulCount + delta);
    return { ...item, helpfulCount: next };
  });
  // If the page did not contain the review (e.g. the review
  // belongs to a different quiz, which the predicate should
  // prevent), return the same reference so SWR's identity
  // comparison skips the re-render.
  if (!touched) return page;
  return { ...page, items: nextItems };
}

/**
 * Apply the count delta to every cached page for `quizId`. The
 * optimistic update happens synchronously from the consumer's
 * perspective — `mutate(updater)` populates the cache before the
 * promise settles, so subsequent `useQuizReviews` renders see
 * the new counts.
 */
async function applyOptimisticCountDelta(
  quizId: string,
  reviewId: string,
  delta: number,
): Promise<void> {
  await globalMutate(
    (key: readonly unknown[]) => isReviewListPageForQuiz(key, quizId),
    (current: unknown): unknown => {
      if (!current) return current;
      const page = current as CursorPage<ReviewDto> | undefined;
      if (!page || !Array.isArray(page.items)) return current;
      return applyCountDeltaToPage(page, reviewId, delta);
    },
    { revalidate: false, populateCache: true },
  );
}

/**
 * Roll back the optimistic update by revalidating every cached
 * page for `quizId`. SWR refetches the canonical counts from the
 * server so any drift between the optimistic state and the
 * authoritative count is resolved.
 */
async function revalidateReviewListPages(quizId: string): Promise<void> {
  await globalMutate(
    (key: readonly unknown[]) => isReviewListPageForQuiz(key, quizId),
    undefined,
    { revalidate: true },
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Optimistic helpful-review toggle hook.
 *
 * @example
 * ```tsx
 * const {
 *   toggle,
 *   isPending,
 *   viewerMarkedHelpful,
 *   lastError,
 * } = useHelpfulReview({
 *   quizId: review.quizId,
 *   reviewId: review.reviewId,
 *   initialViewerMarkedHelpful: false,
 * });
 *
 * <ReviewHelpfulButton
 *   reviewId={review.reviewId}
 *   helpfulCount={review.helpfulCount}
 *   viewerMarkedHelpful={viewerMarkedHelpful}
 *   isPending={isPending}
 *   onClick={toggle}
 * />
 * ```
 */
export function useHelpfulReview(
  params: UseHelpfulReviewParams,
): UseHelpfulReviewResult {
  const { quizId, reviewId, initialViewerMarkedHelpful } = params;

  // Local state — the viewer's `marked` boolean. Source of truth
  // for the optimistic flip.
  const [viewerMarkedHelpful, setViewerMarkedHelpful] = useState<boolean>(
    initialViewerMarkedHelpful,
  );
  const [isPending, setIsPending] = useState(false);
  const [lastError, setLastError] = useState<ApiError | null>(null);

  // Cooldown enforcement. Mirrors `useOptimisticToggle`'s
  // `lastInvocationRef` discipline.
  const lastInvocationRef = useRef<number>(0);

  // Snapshot the previous viewer state for rollback. The
  // optimistic flip happens BEFORE the network call; on failure
  // we restore this value.
  const previousMarkedRef = useRef<boolean>(initialViewerMarkedHelpful);

  const handleToggle = useCallback(async (): Promise<void> => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastInvocationRef.current < COOLDOWN_MS) {
      // Drop — within the cooldown window. The cooldown is NOT
      // lifted on rejection (matches `useOptimisticToggle`'s
      // Story 3.9 AC #5).
      return;
    }
    lastInvocationRef.current = now;

    if (!quizId || !reviewId) {
      // Defensive — without these the cache predicate cannot
      // scope and the service call would 404. Bail out without
      // throwing so the consumer's disabled state is preserved.
      return;
    }

    previousMarkedRef.current = viewerMarkedHelpful;
    const nextMarked = !viewerMarkedHelpful;

    setViewerMarkedHelpful(nextMarked);
    setLastError(null);
    setIsPending(true);

    const delta = nextMarked ? 1 : -1;
    await applyOptimisticCountDelta(quizId, reviewId, delta);

    try {
      if (nextMarked) {
        await markReviewHelpful(reviewId, { helpful: true });
      } else {
        await unmarkReviewHelpful(reviewId);
      }
    } catch (cause: unknown) {
      // Roll back the optimistic flip and the cached counts.
      setViewerMarkedHelpful(previousMarkedRef.current);
      await revalidateReviewListPages(quizId);
      if (isApiError(cause)) {
        setLastError(cause);
      } else {
        setLastError(
          makeSyntheticApiError(0, 'GLOBAL_UNKNOWN', String(cause)),
        );
      }
    } finally {
      setIsPending(false);
    }
  }, [quizId, reviewId, viewerMarkedHelpful]);

  const reset = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    toggle: handleToggle,
    isPending,
    viewerMarkedHelpful,
    lastError,
    reset,
  };
}

// ─── Helpers (module-private) ────────────────────────────────────────────────

function makeSyntheticApiError(
  status: number,
  code: string,
  message: string,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: 'https://api.quiz.local/problems/synthetic',
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: 'req-synthetic' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}
