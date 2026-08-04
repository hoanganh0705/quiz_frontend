/**
 * Review Types — Epic 4.13.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz (read, write, edit, delete,
 *               helpful, gate).
 * Source ticket: T-4.13.2.
 *
 * ## DTO mappings
 *
 * | Wire shape                                | Type alias          | Notes                                  |
 * |-------------------------------------------|---------------------|----------------------------------------|
 * | `ReviewResponseDto` (list item)           | `ReviewDto`         | Aliased with `id = reviewId`           |
 * | `ReviewDetailResponseDto` (single review) | `MyReviewDto`       | The authenticated my-review projection |
 * | `QuizReviewControllerListReviewsParams`    | `ReviewFilters`     | Cursor + limit only (subset)           |
 * | Wire envelope `data + meta.pagination`    | `ReviewPage`        | Cursor-paginated page                  |
 *
 * `ReviewDto` and `MyReviewDto` are feature-level aliases of the
 * generated DTOs — never a field-for-field re-declaration. The
 * generated DTOs remain the single source of truth for wire fields.
 *
 * ## Gate state
 *
 * `ReviewGateState` is the discriminated union consumed by the
 * `useReviewGate` hook (T-4.13.7). Every branch is enumerated so
 * the gate consumers can switch exhaustively.
 *
 * ## SWR Key Factories
 *
 * Three keys are exposed:
 *
 *   - `quizReviewsKey(quizId, filters?)` — the public list read.
 *   - `myQuizReviewKey(quizId, sessionId)` — the authenticated
 *     "my review for this quiz" lookup. Scoped by an opaque session
 *     marker so a cross-tab login swap invalidates the entry.
 *   - `reviewQuizAttemptKey(quizId, sessionId)` — the eligibility
 *     read (T-4.13.6). Same session-scoping rationale.
 *
 * `invalidateReviewCaches(quizId, ...)` revalidates every page of
 * the quiz review list and revalidates the my-review cache for one
 * quiz in a single `mutate` call. Mutations (create / edit / delete)
 * call this helper so list and detail caches stay in lockstep.
 */

import type {
  ReviewResponseDto,
  ReviewDetailResponseDto,
} from '@/lib/api/generated/schemas';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Default page size for the public quiz review list.
 *
 * Sits well within the backend's `@maximum 100` for
 * `QuizReviewControllerListReviewsParams.limit`. Callers can
 * override per-call; the Stories that load 10 most-recent reviews on
 * the player view can pass `limit: 10` directly.
 */
export const REVIEWS_DEFAULT_LIMIT = 20;

// ─── Public type aliases ──────────────────────────────────────────────────────

/**
 * Feature-level alias for a single review in the public list.
 *
 * Adds the `id` projection (`reviewId`) so items satisfy the
 * `useCursorPaginated<T extends { id: string }>` constraint.
 */
export type ReviewDto = ReviewResponseDto & { id: string };

/**
 * Feature-level alias for the authenticated my-review projection.
 *
 * `ReviewDetailResponseDto` already includes `reviewId`; the alias
 * keeps the gate hook's signal types uniform with `ReviewDto`.
 */
export type MyReviewDto = ReviewDetailResponseDto & { id: string };

/**
 * Cursor-paginated filters for the public review list.
 *
 * Only the filters Story 4.13 actually passes are exposed here. The
 * backend also accepts `rating` and `sort`; the feature surface for
 * the player view starts with the simplest contract and expands
 * later if the UI grows.
 */
export interface ReviewFilters {
  cursor?: string;
  limit?: number;
}

/**
 * Single page of reviews.
 *
 * `items` are deduplicated by `id` (the cursor primitive's
 * `appendUniqueById` helper) so cross-page overlap is harmless.
 */
export interface ReviewPage {
  items: readonly ReviewDto[];
  /** Opaque cursor for the next page. `null` when this is the last page. */
  nextCursor: string | null;
  /** Mirrors the backend's `hasNextPage`. */
  hasNextPage: boolean;
  /** Number of items in this page. */
  limit: number;
}

// ─── Gate state ───────────────────────────────────────────────────────────────

/**
 * Discriminated union the `useReviewGate` hook returns. Each branch
 * is a single, deterministic resolution of the gate inputs.
 *
 * - `loading`              — auth bootstrap or initial review fetch
 *                            has not resolved yet.
 * - `unauthenticated`      — no session; private queries are not fired.
 * - `existing-review`      — the viewer already has a review; render
 *                            the inline editor.
 * - `eligible`             — no review yet AND a completed attempt
 *                            exists; render the create form.
 * - `attempt-required`     — no review yet AND no completed attempt;
 *                            render the "complete a quiz first" notice.
 * - `error`                — one of the gate queries failed; the UI
 *                            renders the error banner and exposes a
 *                            retry.
 */
export type ReviewGateState =
  | { kind: 'loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'existing-review'; review: MyReviewDto }
  | { kind: 'eligible' }
  | { kind: 'attempt-required' }
  | { kind: 'error'; error: unknown };

/**
 * Returned by `useReviewGate` so consumers can revalidate the gate
 * after a mutation completes (create / edit / delete).
 */
export interface ReviewGateResult {
  state: ReviewGateState;
  /** True only while at least one gate input is still loading. */
  isLoading: boolean;
  /** Manual revalidation across the gate inputs. */
  revalidate: () => Promise<void>;
}

// ─── SWR Key Factories ────────────────────────────────────────────────────────

/**
 * SWR key for the public quiz review list.
 *
 * The second element is the normalized filter tuple so two calls with
 * semantically equivalent filters produce the same cache key —
 * matching the `commentsKey` convention from Epic 4.12.
 */
export function quizReviewsKey(
  quizId: string,
  filters?: ReviewFilters,
): ['reviews', 'quiz', string, ReadonlyArray<string | number | undefined>] {
  return [
    'reviews',
    'quiz',
    quizId,
    [filters?.cursor ?? undefined, filters?.limit ?? undefined],
  ];
}

/**
 * SWR key for the authenticated my-review lookup.
 *
 * `sessionId` is the opaque session marker (the backend `userId` or
 * the auth bootstrap's `currentUser.userId`). A change in session
 * (login / logout / cross-tab user swap) creates a new key, which
 * SWR treats as a fresh cache entry. The id is wrapped in a tuple
 * so the `mutate` filter in `invalidateReviewCaches` can target
 * every session's entry by the `quizId` segment only.
 */
export function myQuizReviewKey(
  quizId: string,
  sessionId: string,
): ['reviews', 'my', string, string] {
  return ['reviews', 'my', quizId, sessionId];
}

/**
 * SWR key for the completed-attempt eligibility read.
 *
 * Sessions-scoped for the same reason as `myQuizReviewKey`: a
 * cross-tab user swap must not let the previous user's eligibility
 * bleed into the new session's gate.
 */
export function reviewQuizAttemptKey(
  quizId: string,
  sessionId: string,
): ['reviews', 'eligibility', string, string] {
  return ['reviews', 'eligibility', quizId, sessionId];
}

// ─── Invalidation helper ─────────────────────────────────────────────────────

/**
 * Argument shape accepted by `invalidateReviewCaches`. The helper
 * uses `globalMutate` with a predicate filter so it does not depend
 * on a `useSWRConfig` instance.
 */
export interface InvalidateReviewCachesArgs {
  quizId: string;
  sessionId: string;
}

/**
 * Invalidate every cache key associated with one quiz's review
 * surface. Callers run this in the onSuccess of every review
 * mutation (create / edit / delete) so the list and the
 * my-review/eligibility keys refresh in lockstep.
 *
 * The helper revalidates the list under any filter, the my-review
 * key for the current session, and the eligibility key for the
 * current session. Other sessions' entries are left to expire
 * naturally (they cannot show stale user-specific data because the
 * session is part of the key).
 */
export async function invalidateReviewCaches(
  mutate: (
    key: readonly unknown[] | ((k: readonly unknown[]) => boolean),
    data: unknown,
    opts?: { revalidate?: boolean },
  ) => Promise<unknown>,
  args: InvalidateReviewCachesArgs,
): Promise<void> {
  const { quizId, sessionId } = args;

  // Revalidate every page of the public list for this quiz. The
  // list cache key has the shape `['reviews', 'quiz', quizId, ...]`;
  // a predicate on the leading segments reaches every loaded page.
  await mutate(
    (k) =>
      Array.isArray(k) &&
      k[0] === 'reviews' &&
      k[1] === 'quiz' &&
      k[2] === quizId,
    undefined,
    { revalidate: true },
  );

  // Revalidate the session-scoped my-review and eligibility keys.
  await mutate(myQuizReviewKey(quizId, sessionId), undefined, {
    revalidate: true,
  });
  await mutate(reviewQuizAttemptKey(quizId, sessionId), undefined, {
    revalidate: true,
  });
}
