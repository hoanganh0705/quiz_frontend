

import type {
AttemptControllerAbandonAttempt200,
AttemptControllerCompleteAttempt200,
AttemptControllerGetAttemptAnalytics200,
AttemptControllerGetAttemptAnswers200,
AttemptControllerGetAttemptById200,
AttemptControllerGetAttemptReview200,
AttemptControllerGetMyAttemptStats200,
AttemptControllerListMyAttempts200,
AttemptControllerListMyAttemptsParams,
AttemptControllerStartAttempt201,
AttemptControllerSubmitAnswer201,
AttemptControllerWithdrawAnswer200,
StartAttemptDto,
SubmitAnswerDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getAttempts = () => {

const attemptControllerStartAttempt = (
quizId: string,
startAttemptDto: StartAttemptDto,
 ) => {
return orvalCustomInstance<AttemptControllerStartAttempt201>(
{url: `/api/v1/quizzes/${quizId}/attempts`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: startAttemptDto
    },
      );
    }

const attemptControllerGetAttemptById = (
attemptId: string,
 ) => {
return orvalCustomInstance<AttemptControllerGetAttemptById200>(
{url: `/api/v1/attempts/${attemptId}`, method: 'GET'
    },
      );
    }

const attemptControllerSubmitAnswer = (
attemptId: string,
submitAnswerDto: SubmitAnswerDto,
 ) => {
return orvalCustomInstance<AttemptControllerSubmitAnswer201>(
{url: `/api/v1/attempts/${attemptId}/answers`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: submitAnswerDto
    },
      );
    }

const attemptControllerGetAttemptAnswers = (
attemptId: string,
 ) => {
return orvalCustomInstance<AttemptControllerGetAttemptAnswers200>(
{url: `/api/v1/attempts/${attemptId}/answers`, method: 'GET'
    },
      );
    }

const attemptControllerWithdrawAnswer = (
attemptId: string,
questionId: string,
 ) => {
return orvalCustomInstance<AttemptControllerWithdrawAnswer200>(
{url: `/api/v1/attempts/${attemptId}/answers/${questionId}`, method: 'DELETE'
    },
      );
    }

const attemptControllerAbandonAttempt = (
attemptId: string,
 ) => {
return orvalCustomInstance<AttemptControllerAbandonAttempt200>(
{url: `/api/v1/attempts/${attemptId}/abandon`, method: 'POST'
    },
      );
    }

const attemptControllerCompleteAttempt = (
attemptId: string,
 ) => {
return orvalCustomInstance<AttemptControllerCompleteAttempt200>(
{url: `/api/v1/attempts/${attemptId}/complete`, method: 'POST'
    },
      );
    }

const attemptControllerListMyAttempts = (
params?: AttemptControllerListMyAttemptsParams,
 ) => {
return orvalCustomInstance<AttemptControllerListMyAttempts200>(
{url: `/api/v1/users/me/attempts`, method: 'GET',
params
    },
      );
    }

const attemptControllerGetMyAttemptStats = (

 ) => {
return orvalCustomInstance<AttemptControllerGetMyAttemptStats200>(
{url: `/api/v1/users/me/attempts/stats`, method: 'GET'
    },
      );
    }

const attemptControllerGetAttemptAnalytics = (
attemptId: string,
 ) => {
return orvalCustomInstance<AttemptControllerGetAttemptAnalytics200>(
{url: `/api/v1/attempts/${attemptId}/analytics`, method: 'GET'
    },
      );
    }

const attemptControllerGetAttemptReview = (
attemptId: string,
 ) => {
return orvalCustomInstance<AttemptControllerGetAttemptReview200>(
{url: `/api/v1/attempts/${attemptId}/review`, method: 'GET'
    },
      );
    }
return {attemptControllerStartAttempt,attemptControllerGetAttemptById,attemptControllerSubmitAnswer,attemptControllerGetAttemptAnswers,attemptControllerWithdrawAnswer,attemptControllerAbandonAttempt,attemptControllerCompleteAttempt,attemptControllerListMyAttempts,attemptControllerGetMyAttemptStats,attemptControllerGetAttemptAnalytics,attemptControllerGetAttemptReview}};
export type AttemptControllerStartAttemptResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerStartAttempt']>>>
export type AttemptControllerGetAttemptByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerGetAttemptById']>>>
export type AttemptControllerSubmitAnswerResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerSubmitAnswer']>>>
export type AttemptControllerGetAttemptAnswersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerGetAttemptAnswers']>>>
export type AttemptControllerWithdrawAnswerResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerWithdrawAnswer']>>>
export type AttemptControllerAbandonAttemptResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerAbandonAttempt']>>>
export type AttemptControllerCompleteAttemptResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerCompleteAttempt']>>>
export type AttemptControllerListMyAttemptsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerListMyAttempts']>>>
export type AttemptControllerGetMyAttemptStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerGetMyAttemptStats']>>>
export type AttemptControllerGetAttemptAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerGetAttemptAnalytics']>>>
export type AttemptControllerGetAttemptReviewResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAttempts>['attemptControllerGetAttemptReview']>>>
