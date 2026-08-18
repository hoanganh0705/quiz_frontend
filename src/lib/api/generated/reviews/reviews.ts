

import type {
AdminReviewControllerListPlatformReports200,
AdminReviewControllerListPlatformReportsParams,
AdminReviewControllerUpdateReportStatus200,
HelpfulReviewDto,
ReportReviewDto,
ReviewControllerGetMyReviewDashboard200,
ReviewControllerGetReviewById200,
ReviewControllerMarkReviewHelpful200,
ReviewControllerReportReview200,
UpdateReportStatusDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getReviews = () => {

const reviewControllerGetMyReviewDashboard = (

 ) => {
return orvalCustomInstance<ReviewControllerGetMyReviewDashboard200>(
{url: `/api/v1/reviews/me`, method: 'GET'
    },
      );
    }

const reviewControllerMarkReviewHelpful = (
reviewId: string,
helpfulReviewDto: HelpfulReviewDto,
 ) => {
return orvalCustomInstance<ReviewControllerMarkReviewHelpful200>(
{url: `/api/v1/reviews/${reviewId}/helpful`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: helpfulReviewDto
    },
      );
    }

const reviewControllerRemoveHelpfulVote = (
reviewId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/reviews/${reviewId}/helpful`, method: 'DELETE'
    },
      );
    }

const reviewControllerReportReview = (
reviewId: string,
reportReviewDto: ReportReviewDto,
 ) => {
return orvalCustomInstance<ReviewControllerReportReview200>(
{url: `/api/v1/reviews/${reviewId}/report`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: reportReviewDto
    },
      );
    }

const reviewControllerGetReviewById = (
reviewId: string,
 ) => {
return orvalCustomInstance<ReviewControllerGetReviewById200>(
{url: `/api/v1/reviews/${reviewId}`, method: 'GET'
    },
      );
    }

const adminReviewControllerListPlatformReports = (
params?: AdminReviewControllerListPlatformReportsParams,
 ) => {
return orvalCustomInstance<AdminReviewControllerListPlatformReports200>(
{url: `/api/v1/admin/reviews/reports`, method: 'GET',
params
    },
      );
    }

const adminReviewControllerUpdateReportStatus = (
reportId: string,
updateReportStatusDto: UpdateReportStatusDto,
 ) => {
return orvalCustomInstance<AdminReviewControllerUpdateReportStatus200>(
{url: `/api/v1/admin/reviews/reports/${reportId}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateReportStatusDto
    },
      );
    }

const adminReviewControllerAdminDeleteReview = (
reviewId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/admin/reviews/${reviewId}`, method: 'DELETE'
    },
      );
    }
return {reviewControllerGetMyReviewDashboard,reviewControllerMarkReviewHelpful,reviewControllerRemoveHelpfulVote,reviewControllerReportReview,reviewControllerGetReviewById,adminReviewControllerListPlatformReports,adminReviewControllerUpdateReportStatus,adminReviewControllerAdminDeleteReview}};
export type ReviewControllerGetMyReviewDashboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['reviewControllerGetMyReviewDashboard']>>>
export type ReviewControllerMarkReviewHelpfulResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['reviewControllerMarkReviewHelpful']>>>
export type ReviewControllerRemoveHelpfulVoteResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['reviewControllerRemoveHelpfulVote']>>>
export type ReviewControllerReportReviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['reviewControllerReportReview']>>>
export type ReviewControllerGetReviewByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['reviewControllerGetReviewById']>>>
export type AdminReviewControllerListPlatformReportsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['adminReviewControllerListPlatformReports']>>>
export type AdminReviewControllerUpdateReportStatusResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['adminReviewControllerUpdateReportStatus']>>>
export type AdminReviewControllerAdminDeleteReviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getReviews>['adminReviewControllerAdminDeleteReview']>>>
