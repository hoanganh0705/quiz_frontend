

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

export async function listReviews(
quizId: string,
params?: { limit?: number },
) {
return listQuizReviews(quizId, params as ListReviewsParams | undefined);
}
