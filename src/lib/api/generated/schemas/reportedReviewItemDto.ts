

import type { ReportedReviewItemDtoQuizId } from './reportedReviewItemDtoQuizId';
import type { ReportedReviewItemDtoQuizTitle } from './reportedReviewItemDtoQuizTitle';
import type { ReportedReviewItemDtoReviewerUsername } from './reportedReviewItemDtoReviewerUsername';
import type { ReportedReviewItemDtoRating } from './reportedReviewItemDtoRating';
import type { ReportedReviewItemDtoReason } from './reportedReviewItemDtoReason';
import type { ReportedReviewItemDtoStatus } from './reportedReviewItemDtoStatus';

export interface ReportedReviewItemDto {

reportId: string;

reviewId: string;

quizId: ReportedReviewItemDtoQuizId;

quizTitle: ReportedReviewItemDtoQuizTitle;

reviewerUsername: ReportedReviewItemDtoReviewerUsername;

rating: ReportedReviewItemDtoRating;

comment?: string | null;

reason: ReportedReviewItemDtoReason;

details?: string | null;

status: ReportedReviewItemDtoStatus;

createdAt: string;

updatedAt?: string | null;
}
