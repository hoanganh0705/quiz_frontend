

import type {
ListMyComments200,
ListMyCommentsParams,
ListUserComments200,
ListUserCommentsParams,
QuizHistoryControllerExportMyQuizHistoryParams,
QuizHistoryControllerListMyQuizHistoryParams,
QuizHistoryResponseDto,
UpdateMeDto,
UpdateMeSettingsDto,
UserAttemptStatsResponseDto,
UserCategoryControllerListFollowedCategories200,
UserCategoryControllerListFollowedCategoriesParams,
UserControllerGetMyAnalytics200,
UserControllerGetMyProfileBundle200,
UserControllerGetMyRanking200,
UserControllerGetMySummary200,
UserControllerGetMyTournamentAnalytics200,
UserControllerGetPublicTournamentProfile200,
UserControllerGetRecentlyPlayedQuizzes200,
UserControllerGetRecentlyPlayedQuizzesParams,
UserControllerGetRecommendedQuizzes200,
UserControllerGetRecommendedQuizzesParams,
UserControllerGetUserByUsername200,
UserControllerGetUserProfileBundle200,
UserControllerGetUserQuizAnalytics200,
UserControllerGetUserTournamentHistory200,
UserControllerGetUserTournamentHistoryParams,
UserControllerListBadgesByUserId200,
UserControllerListBadgesByUserIdParams,
UserControllerListMyActivity200,
UserControllerListMyActivityParams,
UserControllerListMyBadges200,
UserControllerListMyBadgesParams,
UserControllerListMyTournamentHistory200,
UserControllerListMyTournamentHistoryParams,
UserControllerListMyTournaments200,
UserControllerListMyTournamentsParams,
UserControllerListUserQuizzes200,
UserControllerListUserQuizzesParams,
UserControllerMe200,
UserControllerUpdateMe200,
UserControllerUpdateMeSettings200,
UserReviewControllerGetMyReviewForQuiz200,
UserReviewControllerListMyReportedReviews200,
UserReviewControllerListMyReportedReviewsParams,
UserReviewControllerListMyReviews200,
UserReviewControllerListMyReviewsParams,
UserReviewControllerListReviewsByUser200,
UserReviewControllerListReviewsByUserParams
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getUsers = () => {

const userControllerGetRecommendedQuizzes = (
params?: UserControllerGetRecommendedQuizzesParams,
 ) => {
return orvalCustomInstance<UserControllerGetRecommendedQuizzes200>(
{url: `/api/v1/users/me/recommended-quizzes`, method: 'GET',
params
    },
      );
    }

const userControllerGetRecentlyPlayedQuizzes = (
params?: UserControllerGetRecentlyPlayedQuizzesParams,
 ) => {
return orvalCustomInstance<UserControllerGetRecentlyPlayedQuizzes200>(
{url: `/api/v1/users/me/recently-played-quizzes`, method: 'GET',
params
    },
      );
    }

const userControllerMe = (

 ) => {
return orvalCustomInstance<UserControllerMe200>(
{url: `/api/v1/users/me`, method: 'GET'
    },
      );
    }

const userControllerUpdateMe = (
updateMeDto: UpdateMeDto,
 ) => {
return orvalCustomInstance<UserControllerUpdateMe200>(
{url: `/api/v1/users/me`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateMeDto
    },
      );
    }

const userControllerGetUserByUsername = (
username: string,
 ) => {
return orvalCustomInstance<UserControllerGetUserByUsername200>(
{url: `/api/v1/users/by-username/${username}`, method: 'GET'
    },
      );
    }

const userControllerGetMySummary = (

 ) => {
return orvalCustomInstance<UserControllerGetMySummary200>(
{url: `/api/v1/users/me/summary`, method: 'GET'
    },
      );
    }

const userControllerGetMyProfileBundle = (

 ) => {
return orvalCustomInstance<UserControllerGetMyProfileBundle200>(
{url: `/api/v1/users/me/profile`, method: 'GET'
    },
      );
    }

const userControllerListMyBadges = (
params?: UserControllerListMyBadgesParams,
 ) => {
return orvalCustomInstance<UserControllerListMyBadges200>(
{url: `/api/v1/users/me/badges`, method: 'GET',
params
    },
      );
    }

const userControllerListMyActivity = (
params?: UserControllerListMyActivityParams,
 ) => {
return orvalCustomInstance<UserControllerListMyActivity200>(
{url: `/api/v1/users/me/activity`, method: 'GET',
params
    },
      );
    }

const userControllerListMyTournaments = (
params?: UserControllerListMyTournamentsParams,
 ) => {
return orvalCustomInstance<UserControllerListMyTournaments200>(
{url: `/api/v1/users/me/tournaments`, method: 'GET',
params
    },
      );
    }

const userControllerListMyTournamentHistory = (
params?: UserControllerListMyTournamentHistoryParams,
 ) => {
return orvalCustomInstance<UserControllerListMyTournamentHistory200>(
{url: `/api/v1/users/me/tournament-history`, method: 'GET',
params
    },
      );
    }

const userControllerGetMyTournamentAnalytics = (

 ) => {
return orvalCustomInstance<UserControllerGetMyTournamentAnalytics200>(
{url: `/api/v1/users/me/tournaments/analytics`, method: 'GET'
    },
      );
    }

const userControllerGetMyRanking = (

 ) => {
return orvalCustomInstance<UserControllerGetMyRanking200>(
{url: `/api/v1/users/me/ranking`, method: 'GET'
    },
      );
    }

const userControllerGetMyAnalytics = (

 ) => {
return orvalCustomInstance<UserControllerGetMyAnalytics200>(
{url: `/api/v1/users/me/analytics`, method: 'GET'
    },
      );
    }

const userControllerUpdateMeSettings = (
updateMeSettingsDto: UpdateMeSettingsDto,
 ) => {
return orvalCustomInstance<UserControllerUpdateMeSettings200>(
{url: `/api/v1/users/me/settings`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateMeSettingsDto
    },
      );
    }

const userControllerGetUserQuizAnalytics = (
userId: string,
 ) => {
return orvalCustomInstance<UserControllerGetUserQuizAnalytics200>(
{url: `/api/v1/users/${userId}/quizzes/analytics`, method: 'GET'
    },
      );
    }

const userControllerListUserQuizzes = (
userId: string,
params?: UserControllerListUserQuizzesParams,
 ) => {
return orvalCustomInstance<UserControllerListUserQuizzes200>(
{url: `/api/v1/users/${userId}/quizzes`, method: 'GET',
params
    },
      );
    }

const userControllerGetUserProfileBundle = (
userId: string,
 ) => {
return orvalCustomInstance<UserControllerGetUserProfileBundle200>(
{url: `/api/v1/users/${userId}/profile`, method: 'GET'
    },
      );
    }

const userControllerListBadgesByUserId = (
userId: string,
params?: UserControllerListBadgesByUserIdParams,
 ) => {
return orvalCustomInstance<UserControllerListBadgesByUserId200>(
{url: `/api/v1/users/${userId}/badges`, method: 'GET',
params
    },
      );
    }

const userControllerGetUserTournamentHistory = (
userId: string,
params?: UserControllerGetUserTournamentHistoryParams,
 ) => {
return orvalCustomInstance<UserControllerGetUserTournamentHistory200>(
{url: `/api/v1/users/${userId}/tournament-history`, method: 'GET',
params
    },
      );
    }

const userControllerGetPublicTournamentProfile = (
userId: string,
 ) => {
return orvalCustomInstance<UserControllerGetPublicTournamentProfile200>(
{url: `/api/v1/users/${userId}/tournaments`, method: 'GET'
    },
      );
    }

const quizHistoryControllerListMyQuizHistory = (
params?: QuizHistoryControllerListMyQuizHistoryParams,
 ) => {
return orvalCustomInstance<QuizHistoryResponseDto>(
{url: `/api/v1/users/me/quiz-history`, method: 'GET',
params
    },
      );
    }

const quizHistoryControllerGetMyQuizHistoryStats = (

 ) => {
return orvalCustomInstance<UserAttemptStatsResponseDto>(
{url: `/api/v1/users/me/quiz-history/stats`, method: 'GET'
    },
      );
    }

const quizHistoryControllerExportMyQuizHistory = (
params?: QuizHistoryControllerExportMyQuizHistoryParams,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/users/me/quiz-history/export`, method: 'GET',
params
    },
      );
    }

const userReviewControllerListMyReportedReviews = (
params?: UserReviewControllerListMyReportedReviewsParams,
 ) => {
return orvalCustomInstance<UserReviewControllerListMyReportedReviews200>(
{url: `/api/v1/users/me/reported-reviews`, method: 'GET',
params
    },
      );
    }

const userReviewControllerListMyReviews = (
params?: UserReviewControllerListMyReviewsParams,
 ) => {
return orvalCustomInstance<UserReviewControllerListMyReviews200>(
{url: `/api/v1/users/me/reviews`, method: 'GET',
params
    },
      );
    }

const userReviewControllerGetMyReviewForQuiz = (
quizId: string,
 ) => {
return orvalCustomInstance<UserReviewControllerGetMyReviewForQuiz200>(
{url: `/api/v1/users/me/reviews/${quizId}`, method: 'GET'
    },
      );
    }

const userReviewControllerListReviewsByUser = (
userId: string,
params?: UserReviewControllerListReviewsByUserParams,
 ) => {
return orvalCustomInstance<UserReviewControllerListReviewsByUser200>(
{url: `/api/v1/users/${userId}/reviews`, method: 'GET',
params
    },
      );
    }

const listMyComments = (
params?: ListMyCommentsParams,
 ) => {
return orvalCustomInstance<ListMyComments200>(
{url: `/api/v1/users/me/comments`, method: 'GET',
params
    },
      );
    }

const listUserComments = (
userId: string,
params?: ListUserCommentsParams,
 ) => {
return orvalCustomInstance<ListUserComments200>(
{url: `/api/v1/users/${userId}/comments`, method: 'GET',
params
    },
      );
    }

const userCategoryControllerListFollowedCategories = (
params?: UserCategoryControllerListFollowedCategoriesParams,
 ) => {
return orvalCustomInstance<UserCategoryControllerListFollowedCategories200>(
{url: `/api/v1/users/me/followed-categories`, method: 'GET',
params
    },
      );
    }
return {userControllerGetRecommendedQuizzes,userControllerGetRecentlyPlayedQuizzes,userControllerMe,userControllerUpdateMe,userControllerGetUserByUsername,userControllerGetMySummary,userControllerGetMyProfileBundle,userControllerListMyBadges,userControllerListMyActivity,userControllerListMyTournaments,userControllerListMyTournamentHistory,userControllerGetMyTournamentAnalytics,userControllerGetMyRanking,userControllerGetMyAnalytics,userControllerUpdateMeSettings,userControllerGetUserQuizAnalytics,userControllerListUserQuizzes,userControllerGetUserProfileBundle,userControllerListBadgesByUserId,userControllerGetUserTournamentHistory,userControllerGetPublicTournamentProfile,quizHistoryControllerListMyQuizHistory,quizHistoryControllerGetMyQuizHistoryStats,quizHistoryControllerExportMyQuizHistory,userReviewControllerListMyReportedReviews,userReviewControllerListMyReviews,userReviewControllerGetMyReviewForQuiz,userReviewControllerListReviewsByUser,listMyComments,listUserComments,userCategoryControllerListFollowedCategories}};
export type UserControllerGetRecommendedQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetRecommendedQuizzes']>>>
export type UserControllerGetRecentlyPlayedQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetRecentlyPlayedQuizzes']>>>
export type UserControllerMeResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerMe']>>>
export type UserControllerUpdateMeResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerUpdateMe']>>>
export type UserControllerGetUserByUsernameResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetUserByUsername']>>>
export type UserControllerGetMySummaryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetMySummary']>>>
export type UserControllerGetMyProfileBundleResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetMyProfileBundle']>>>
export type UserControllerListMyBadgesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerListMyBadges']>>>
export type UserControllerListMyActivityResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerListMyActivity']>>>
export type UserControllerListMyTournamentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerListMyTournaments']>>>
export type UserControllerListMyTournamentHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerListMyTournamentHistory']>>>
export type UserControllerGetMyTournamentAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetMyTournamentAnalytics']>>>
export type UserControllerGetMyRankingResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetMyRanking']>>>
export type UserControllerGetMyAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetMyAnalytics']>>>
export type UserControllerUpdateMeSettingsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerUpdateMeSettings']>>>
export type UserControllerGetUserQuizAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetUserQuizAnalytics']>>>
export type UserControllerListUserQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerListUserQuizzes']>>>
export type UserControllerGetUserProfileBundleResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetUserProfileBundle']>>>
export type UserControllerListBadgesByUserIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerListBadgesByUserId']>>>
export type UserControllerGetUserTournamentHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetUserTournamentHistory']>>>
export type UserControllerGetPublicTournamentProfileResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userControllerGetPublicTournamentProfile']>>>
export type QuizHistoryControllerListMyQuizHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['quizHistoryControllerListMyQuizHistory']>>>
export type QuizHistoryControllerGetMyQuizHistoryStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['quizHistoryControllerGetMyQuizHistoryStats']>>>
export type QuizHistoryControllerExportMyQuizHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['quizHistoryControllerExportMyQuizHistory']>>>
export type UserReviewControllerListMyReportedReviewsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userReviewControllerListMyReportedReviews']>>>
export type UserReviewControllerListMyReviewsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userReviewControllerListMyReviews']>>>
export type UserReviewControllerGetMyReviewForQuizResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userReviewControllerGetMyReviewForQuiz']>>>
export type UserReviewControllerListReviewsByUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userReviewControllerListReviewsByUser']>>>
export type ListMyCommentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['listMyComments']>>>
export type ListUserCommentsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['listUserComments']>>>
export type UserCategoryControllerListFollowedCategoriesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getUsers>['userCategoryControllerListFollowedCategories']>>>
