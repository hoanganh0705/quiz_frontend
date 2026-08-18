

import type {
CreateComment201,
CreateCommentDto,
CreateQuizDto,
CreateQuizQuestionDto,
CreateQuizQuestionsDto,
CreateQuizVersionDto,
CreateReviewDto,
ListQuizComments200,
ListQuizCommentsParams,
QuizControllerCreateQuiz201,
QuizControllerCreateQuizQuestion201,
QuizControllerCreateQuizQuestions201,
QuizControllerCreateQuizVersion201,
QuizControllerDeleteQuiz200,
QuizControllerGetFeaturedQuizzes200,
QuizControllerGetFeaturedQuizzesParams,
QuizControllerGetMyQuizAnalytics200,
QuizControllerGetPopularQuizzes200,
QuizControllerGetPopularQuizzesParams,
QuizControllerGetQuizAggregate200,
QuizControllerGetQuizById200,
QuizControllerGetQuizPreview200,
QuizControllerGetQuizStats200,
QuizControllerGetQuizStatsHistory200,
QuizControllerGetQuizStatsHistoryParams,
QuizControllerGetQuizVersionDetail200,
QuizControllerGetRelatedQuizzes200,
QuizControllerGetRelatedQuizzesParams,
QuizControllerGetTrendingQuizzes200,
QuizControllerGetTrendingQuizzesParams,
QuizControllerListMyDraftQuizzes200,
QuizControllerListMyDraftQuizzesParams,
QuizControllerListMyPublishedQuizzes200,
QuizControllerListMyPublishedQuizzesParams,
QuizControllerListMyQuizzes200,
QuizControllerListMyQuizzesParams,
QuizControllerListQuizVersions200,
QuizControllerListQuizVersionsParams,
QuizControllerListQuizzes200,
QuizControllerListQuizzesParams,
QuizControllerPublishQuizVersion200,
QuizControllerUpdateQuiz200,
QuizControllerUpdateQuizVersion200,
QuizReviewControllerCreateReview201,
QuizReviewControllerGetCreatorQuizReviewAnalytics200,
QuizReviewControllerGetQuizReviewStats200,
QuizReviewControllerListReviews200,
QuizReviewControllerListReviewsParams,
QuizReviewControllerUpdateReview200,
UpdateQuizDto,
UpdateQuizVersionDto,
UpdateReviewDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getQuizzes = () => {

const quizControllerCreateQuiz = (
createQuizDto: CreateQuizDto,
 ) => {
return orvalCustomInstance<QuizControllerCreateQuiz201>(
{url: `/api/v1/quizzes`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createQuizDto
    },
      );
    }

const quizControllerListQuizzes = (
params?: QuizControllerListQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerListQuizzes200>(
{url: `/api/v1/quizzes`, method: 'GET',
params
    },
      );
    }

const quizControllerListMyQuizzes = (
params?: QuizControllerListMyQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerListMyQuizzes200>(
{url: `/api/v1/quizzes/me`, method: 'GET',
params
    },
      );
    }

const quizControllerListMyDraftQuizzes = (
params?: QuizControllerListMyDraftQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerListMyDraftQuizzes200>(
{url: `/api/v1/quizzes/me/drafts`, method: 'GET',
params
    },
      );
    }

const quizControllerListMyPublishedQuizzes = (
params?: QuizControllerListMyPublishedQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerListMyPublishedQuizzes200>(
{url: `/api/v1/quizzes/me/published`, method: 'GET',
params
    },
      );
    }

const quizControllerGetTrendingQuizzes = (
params?: QuizControllerGetTrendingQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerGetTrendingQuizzes200>(
{url: `/api/v1/quizzes/trending`, method: 'GET',
params
    },
      );
    }

const quizControllerGetPopularQuizzes = (
params?: QuizControllerGetPopularQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerGetPopularQuizzes200>(
{url: `/api/v1/quizzes/popular`, method: 'GET',
params
    },
      );
    }

const quizControllerGetMyQuizAnalytics = (

 ) => {
return orvalCustomInstance<QuizControllerGetMyQuizAnalytics200>(
{url: `/api/v1/quizzes/me/analytics`, method: 'GET'
    },
      );
    }

const quizControllerGetFeaturedQuizzes = (
params?: QuizControllerGetFeaturedQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerGetFeaturedQuizzes200>(
{url: `/api/v1/quizzes/featured`, method: 'GET',
params
    },
      );
    }

const quizControllerGetQuizById = (
id: string,
 ) => {
return orvalCustomInstance<QuizControllerGetQuizById200>(
{url: `/api/v1/quizzes/${id}`, method: 'GET'
    },
      );
    }

const quizControllerUpdateQuiz = (
id: string,
updateQuizDto: UpdateQuizDto,
 ) => {
return orvalCustomInstance<QuizControllerUpdateQuiz200>(
{url: `/api/v1/quizzes/${id}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateQuizDto
    },
      );
    }

const quizControllerDeleteQuiz = (
id: string,
 ) => {
return orvalCustomInstance<QuizControllerDeleteQuiz200>(
{url: `/api/v1/quizzes/${id}`, method: 'DELETE'
    },
      );
    }

const quizControllerGetQuizStats = (
id: string,
 ) => {
return orvalCustomInstance<QuizControllerGetQuizStats200>(
{url: `/api/v1/quizzes/${id}/stats`, method: 'GET'
    },
      );
    }

const quizControllerGetQuizStatsHistory = (
id: string,
params?: QuizControllerGetQuizStatsHistoryParams,
 ) => {
return orvalCustomInstance<QuizControllerGetQuizStatsHistory200>(
{url: `/api/v1/quizzes/${id}/stats/history`, method: 'GET',
params
    },
      );
    }

const quizControllerGetQuizPreview = (
id: string,
 ) => {
return orvalCustomInstance<QuizControllerGetQuizPreview200>(
{url: `/api/v1/quizzes/${id}/preview`, method: 'GET'
    },
      );
    }

const quizControllerGetQuizAggregate = (
id: string,
 ) => {
return orvalCustomInstance<QuizControllerGetQuizAggregate200>(
{url: `/api/v1/quizzes/${id}/aggregate`, method: 'GET'
    },
      );
    }

const quizControllerGetRelatedQuizzes = (
slug: string,
params?: QuizControllerGetRelatedQuizzesParams,
 ) => {
return orvalCustomInstance<QuizControllerGetRelatedQuizzes200>(
{url: `/api/v1/quizzes/${slug}/related`, method: 'GET',
params
    },
      );
    }

const quizControllerCreateQuizVersion = (
id: string,
createQuizVersionDto: CreateQuizVersionDto,
 ) => {
return orvalCustomInstance<QuizControllerCreateQuizVersion201>(
{url: `/api/v1/quizzes/${id}/versions`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createQuizVersionDto
    },
      );
    }

const quizControllerListQuizVersions = (
id: string,
params?: QuizControllerListQuizVersionsParams,
 ) => {
return orvalCustomInstance<QuizControllerListQuizVersions200>(
{url: `/api/v1/quizzes/${id}/versions`, method: 'GET',
params
    },
      );
    }

const quizControllerGetQuizVersionDetail = (
id: string,
versionId: string,
 ) => {
return orvalCustomInstance<QuizControllerGetQuizVersionDetail200>(
{url: `/api/v1/quizzes/${id}/versions/${versionId}`, method: 'GET'
    },
      );
    }

const quizControllerUpdateQuizVersion = (
id: string,
versionId: string,
updateQuizVersionDto: UpdateQuizVersionDto,
 ) => {
return orvalCustomInstance<QuizControllerUpdateQuizVersion200>(
{url: `/api/v1/quizzes/${id}/versions/${versionId}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateQuizVersionDto
    },
      );
    }

const quizControllerPublishQuizVersion = (
id: string,
versionId: string,
 ) => {
return orvalCustomInstance<QuizControllerPublishQuizVersion200>(
{url: `/api/v1/quizzes/${id}/versions/${versionId}/publish`, method: 'POST'
    },
      );
    }

const quizControllerCreateQuizQuestion = (
id: string,
versionId: string,
createQuizQuestionDto: CreateQuizQuestionDto,
 ) => {
return orvalCustomInstance<QuizControllerCreateQuizQuestion201>(
{url: `/api/v1/quizzes/${id}/versions/${versionId}/questions`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createQuizQuestionDto
    },
      );
    }

const quizControllerCreateQuizQuestions = (
id: string,
versionId: string,
createQuizQuestionsDto: CreateQuizQuestionsDto,
 ) => {
return orvalCustomInstance<QuizControllerCreateQuizQuestions201>(
{url: `/api/v1/quizzes/${id}/versions/${versionId}/questions/bulk`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createQuizQuestionsDto
    },
      );
    }

const quizReviewControllerCreateReview = (
quizId: string,
createReviewDto: CreateReviewDto,
 ) => {
return orvalCustomInstance<QuizReviewControllerCreateReview201>(
{url: `/api/v1/quizzes/${quizId}/reviews`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createReviewDto
    },
      );
    }

const quizReviewControllerListReviews = (
quizId: string,
params?: QuizReviewControllerListReviewsParams,
 ) => {
return orvalCustomInstance<QuizReviewControllerListReviews200>(
{url: `/api/v1/quizzes/${quizId}/reviews`, method: 'GET',
params
    },
      );
    }

const quizReviewControllerUpdateReview = (
quizId: string,
updateReviewDto: UpdateReviewDto,
 ) => {
return orvalCustomInstance<QuizReviewControllerUpdateReview200>(
{url: `/api/v1/quizzes/${quizId}/reviews`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateReviewDto
    },
      );
    }

const quizReviewControllerDeleteReview = (
quizId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/quizzes/${quizId}/reviews`, method: 'DELETE'
    },
      );
    }

const quizReviewControllerGetQuizReviewStats = (
quizId: string,
 ) => {
return orvalCustomInstance<QuizReviewControllerGetQuizReviewStats200>(
{url: `/api/v1/quizzes/${quizId}/reviews/stats`, method: 'GET'
    },
      );
    }

const quizReviewControllerGetCreatorQuizReviewAnalytics = (
quizId: string,
 ) => {
return orvalCustomInstance<QuizReviewControllerGetCreatorQuizReviewAnalytics200>(
{url: `/api/v1/quizzes/${quizId}/reviews/analytics`, method: 'GET'
    },
      );
    }

const listQuizComments = (
quizId: string,
params?: ListQuizCommentsParams,
 ) => {
return orvalCustomInstance<ListQuizComments200>(
{url: `/api/v1/quizzes/${quizId}/comments`, method: 'GET',
params
    },
      );
    }

const createComment = (
quizId: string,
createCommentDto: CreateCommentDto,
 ) => {
return orvalCustomInstance<CreateComment201>(
{url: `/api/v1/quizzes/${quizId}/comments`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createCommentDto
    },
      );
    }
return {quizControllerCreateQuiz,quizControllerListQuizzes,quizControllerListMyQuizzes,quizControllerListMyDraftQuizzes,quizControllerListMyPublishedQuizzes,quizControllerGetTrendingQuizzes,quizControllerGetPopularQuizzes,quizControllerGetMyQuizAnalytics,quizControllerGetFeaturedQuizzes,quizControllerGetQuizById,quizControllerUpdateQuiz,quizControllerDeleteQuiz,quizControllerGetQuizStats,quizControllerGetQuizStatsHistory,quizControllerGetQuizPreview,quizControllerGetQuizAggregate,quizControllerGetRelatedQuizzes,quizControllerCreateQuizVersion,quizControllerListQuizVersions,quizControllerGetQuizVersionDetail,quizControllerUpdateQuizVersion,quizControllerPublishQuizVersion,quizControllerCreateQuizQuestion,quizControllerCreateQuizQuestions,quizReviewControllerCreateReview,quizReviewControllerListReviews,quizReviewControllerUpdateReview,quizReviewControllerDeleteReview,quizReviewControllerGetQuizReviewStats,quizReviewControllerGetCreatorQuizReviewAnalytics,listQuizComments,createComment}};
export type QuizControllerCreateQuizResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerCreateQuiz']>>>
export type QuizControllerListQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerListQuizzes']>>>
export type QuizControllerListMyQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerListMyQuizzes']>>>
export type QuizControllerListMyDraftQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerListMyDraftQuizzes']>>>
export type QuizControllerListMyPublishedQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerListMyPublishedQuizzes']>>>
export type QuizControllerGetTrendingQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetTrendingQuizzes']>>>
export type QuizControllerGetPopularQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetPopularQuizzes']>>>
export type QuizControllerGetMyQuizAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetMyQuizAnalytics']>>>
export type QuizControllerGetFeaturedQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetFeaturedQuizzes']>>>
export type QuizControllerGetQuizByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetQuizById']>>>
export type QuizControllerUpdateQuizResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerUpdateQuiz']>>>
export type QuizControllerDeleteQuizResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerDeleteQuiz']>>>
export type QuizControllerGetQuizStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetQuizStats']>>>
export type QuizControllerGetQuizStatsHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetQuizStatsHistory']>>>
export type QuizControllerGetQuizPreviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetQuizPreview']>>>
export type QuizControllerGetQuizAggregateResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetQuizAggregate']>>>
export type QuizControllerGetRelatedQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetRelatedQuizzes']>>>
export type QuizControllerCreateQuizVersionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerCreateQuizVersion']>>>
export type QuizControllerListQuizVersionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerListQuizVersions']>>>
export type QuizControllerGetQuizVersionDetailResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerGetQuizVersionDetail']>>>
export type QuizControllerUpdateQuizVersionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerUpdateQuizVersion']>>>
export type QuizControllerPublishQuizVersionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerPublishQuizVersion']>>>
export type QuizControllerCreateQuizQuestionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerCreateQuizQuestion']>>>
export type QuizControllerCreateQuizQuestionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizControllerCreateQuizQuestions']>>>
export type QuizReviewControllerCreateReviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizReviewControllerCreateReview']>>>
export type QuizReviewControllerListReviewsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizReviewControllerListReviews']>>>
export type QuizReviewControllerUpdateReviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizReviewControllerUpdateReview']>>>
export type QuizReviewControllerDeleteReviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizReviewControllerDeleteReview']>>>
export type QuizReviewControllerGetQuizReviewStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizReviewControllerGetQuizReviewStats']>>>
export type QuizReviewControllerGetCreatorQuizReviewAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['quizReviewControllerGetCreatorQuizReviewAnalytics']>>>
export type ListQuizCommentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['listQuizComments']>>>
export type CreateCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getQuizzes>['createComment']>>>
