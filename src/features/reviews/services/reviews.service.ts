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
 * on the **reviews** tag (`getReviews().reviewController*`). This
 * service unifies both behind the planning-intent names from master
 * plan lines 302–304 so the drift is invisible to feature hooks.
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
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { getQuizzes, getReviews } from '@/lib/api';

import type {
  CreateReviewDto,
  UpdateReviewDto,
  HelpfulReviewDto,
  ReportReviewDto,
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