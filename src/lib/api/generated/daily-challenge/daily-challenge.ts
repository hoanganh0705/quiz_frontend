

import type {
DailyChallengeAnswerDto,
DailyChallengeControllerGetHistory200,
DailyChallengeControllerGetHistoryParams,
DailyChallengeControllerGetLeaderboard200,
DailyChallengeControllerGetLeaderboardParams,
DailyChallengeControllerGetToday200,
DailyChallengeControllerSubmitAnswer200
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getDailyChallenge = () => {

const dailyChallengeControllerGetToday = (

 ) => {
return orvalCustomInstance<DailyChallengeControllerGetToday200>(
{url: `/api/v1/daily-challenge/today`, method: 'GET'
    },
      );
    }

const dailyChallengeControllerGetHistory = (
params?: DailyChallengeControllerGetHistoryParams,
 ) => {
return orvalCustomInstance<DailyChallengeControllerGetHistory200>(
{url: `/api/v1/daily-challenge/history`, method: 'GET',
params
    },
      );
    }

const dailyChallengeControllerGetLeaderboard = (
params?: DailyChallengeControllerGetLeaderboardParams,
 ) => {
return orvalCustomInstance<DailyChallengeControllerGetLeaderboard200>(
{url: `/api/v1/daily-challenge/leaderboard`, method: 'GET',
params
    },
      );
    }

const dailyChallengeControllerSubmitAnswer = (
dailyChallengeAnswerDto: DailyChallengeAnswerDto,
 ) => {
return orvalCustomInstance<DailyChallengeControllerSubmitAnswer200>(
{url: `/api/v1/daily-challenge/answer`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: dailyChallengeAnswerDto
    },
      );
    }
return {dailyChallengeControllerGetToday,dailyChallengeControllerGetHistory,dailyChallengeControllerGetLeaderboard,dailyChallengeControllerSubmitAnswer}};
export type DailyChallengeControllerGetTodayResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getDailyChallenge>['dailyChallengeControllerGetToday']>>>
export type DailyChallengeControllerGetHistoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getDailyChallenge>['dailyChallengeControllerGetHistory']>>>
export type DailyChallengeControllerGetLeaderboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getDailyChallenge>['dailyChallengeControllerGetLeaderboard']>>>
export type DailyChallengeControllerSubmitAnswerResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getDailyChallenge>['dailyChallengeControllerSubmitAnswer']>>>
