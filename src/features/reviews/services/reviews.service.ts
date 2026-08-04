/**
 * `reviews.service.ts` — Phase 4 review write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F3.
 *
 * The single import surface for every Phase 4 review mutation
 * consumed by story 4.13.
 *
 * ## SDK placement (TKT-4.1.A1 drift)
 *
 * Review CRUD lives on the **quizzes** tag
 * (`getQuizzes().quizReviewController*`) per the backend's
 * `QuizReviewController`. Helpful / report / dashboard operations live
 * on the **reviews** tag (`getReviews().reviewController*`). The
 * authenticated "my review for this quiz" lookup lives on the
 * **users** tag (`getUsers().userReviewControllerGetMyReviewForQuiz`)
 * per the backend's `UserReviewController` — the parent route is
 * `/api/v1/users/me/reviews/:quizId`. This service unifies all three
 * controllers behind the planning-intent names from master plan lines
 * 302–304 so the drift is invisible to feature hooks.
 *
 * ## Code exposure
 *
 * Per the cross-story contract rule, `createReview` may surface:
 *   - `REVIEW_ATTEMPT_REQUIRED` (403) — user has no completed attempt
 *     for the quiz. UI: render "complete an attempt first" notice.
 *   - `REVIEW_CONFLICT` (409) — user already has a review; either
 *     edit or delete the existing one.
 *   - `REVIEW_FORBIDDEN` (403) — admin/mod-only operations.
 *
 * These are surfaced through the `ApiError.code` thrown from the
 * service; the spec in F7 asserts the typed contract.
 *
 * ## Story 4.13 read additions (T-4.13.1)
 *
 * `getMyQuizReview(quizId)` is the single authenticated lookup
 * consumed by the gate hook. The endpoint returns
 * `WrappedDto<ReviewDetailResponseDto>`; a "no review yet" state
 * surfaces as HTTP 404 (the backend omits the row rather than
 * returning `{ data: null }`). To keep feature hooks from branching
 * on raw HTTP statuses, the wrapper normalises 404 to a typed
 * `null` return — but only when the call returns 404 cleanly. Any
 * other failure (401, 403, 429, 5xx) propagates as a typed
 * `ApiError` so the gate hook can map it to its `error` state.
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { ApiError, getQuizzes, getReviews, getUsers } from '@/lib/api';

import type {
  CreateReviewDto,
  UpdateReviewDto,
  HelpfulReviewDto,
  ReportReviewDto,
  ReviewDetailResponseDto,
} from '@/lib/api/generated/schemas';

export type {
  QuizReviewControllerCreateReviewResult,
  QuizReviewControllerListReviewsResult,
  QuizReviewControllerUpdateReviewResult,
  QuizReviewControllerDeleteReviewResult,
  QuizReviewControllerGetQuizReviewStatsResult,
  QuizReviewControllerGetCreatorQuizReviewAnalyticsResult,
} from '@/lib/api/generated/quizzes/quizzes';

export type {
  ReviewControllerMarkReviewHelpfulResult,
  ReviewControllerRemoveHelpfulVoteResult,
  ReviewControllerReportReviewResult,
  ReviewControllerGetReviewByIdResult,
  ReviewControllerGetMyReviewDashboardResult,
} from '@/lib/api/generated/reviews/reviews';

export type { UserReviewControllerGetMyReviewForQuizResult } from '@/lib/api/generated/users/users';

export interface ListReviewsParams {
  cursor?: string;
  limit?: number;
}

// ─── Review CRUD (quizzes tag) ─────────────────────────────────────────

export async function listQuizReviews(quizId: string, params?: ListReviewsParams) {
  const sdk = getQuizzes();
  return sdk.quizReviewControllerListReviews(quizId, params);
}

export async function createReview(quizId: string, payload: CreateReviewDto) {
  const sdk = getQuizzes();
  return sdk.quizReviewControllerCreateReview(quizId, payload);
}

export async function updateReview(
  quizId: string,
  payload: UpdateReviewDto,
) {
  const sdk = getQuizzes();
  return sdk.quizReviewControllerUpdateReview(quizId, payload);
}

export async function deleteReview(quizId: string) {
  const sdk = getQuizzes();
  return sdk.quizReviewControllerDeleteReview(quizId);
}

export async function getQuizReviewStats(quizId: string) {
  const sdk = getQuizzes();
  return sdk.quizReviewControllerGetQuizReviewStats(quizId);
}

export async function getCreatorQuizReviewAnalytics(quizId: string) {
  const sdk = getQuizzes();
  return sdk.quizReviewControllerGetCreatorQuizReviewAnalytics(quizId);
}

// ─── Authenticated my-review lookup (users tag) ────────────────────────

/**
 * Authenticated "my review for this quiz" lookup.
 *
 * Returns the authenticated user's `ReviewDetailResponseDto` when one
 * exists. The backend returns HTTP 404 when the user has not yet
 * reviewed the quiz; in that case this wrapper resolves to `null`
 * so the gate hook can map the result to its `existing-review` vs
 * `eligible` branches without inspecting `ApiError`. All other
 * errors (401, 403, 429, 5xx) propagate as typed `ApiError`
 * rejections.
 *
 * The deployed contract for the gate relies on this normalisation;
 * a follow-up ticket in `EPIC_4_13_TICKETS.md` documents the
 * `REVIEW_NOT_FOUND` branch in case the backend switches from a 404
 * to a typed error code in a future release.
 */
export async function getMyQuizReview(
  quizId: string,
): Promise<ReviewDetailResponseDto | null> {
  const sdk = getUsers();
  try {
    const result = await sdk.userReviewControllerGetMyReviewForQuiz(quizId);
    const envelope = result as unknown as {
      data?: ReviewDetailResponseDto;
    };
    return envelope.data ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

// ─── Helpful / report (reviews tag) ────────────────────────────────────

export async function markReviewHelpful(
  reviewId: string,
  payload: HelpfulReviewDto,
) {
  const sdk = getReviews();
  return sdk.reviewControllerMarkReviewHelpful(reviewId, payload);
}

export async function unmarkReviewHelpful(reviewId: string) {
  const sdk = getReviews();
  return sdk.reviewControllerRemoveHelpfulVote(reviewId);
}

export async function reportReview(reviewId: string, payload: ReportReviewDto) {
  const sdk = getReviews();
  return sdk.reviewControllerReportReview(reviewId, payload);
}

export async function getReviewById(reviewId: string) {
  const sdk = getReviews();
  return sdk.reviewControllerGetReviewById(reviewId);
}

export async function getMyReviewDashboard() {
  const sdk = getReviews();
  return sdk.reviewControllerGetMyReviewDashboard();
}
