

import { getUsers } from "@/lib/api";

import type {
UserControllerListMyActivityParams,
UserControllerListMyBadgesParams,
UserControllerListMyTournamentsParams,
UserControllerListMyTournamentHistoryParams,
UserActivityItemDto,
MyBadgeItemDto,
MyTournamentItemDto,
MyTournamentHistoryItemDto,
MyTournamentAnalyticsResponseDto,
UserRankingResponseDto,
UserControllerGetMyRanking200,
} from "@/lib/api/generated/schemas";

import type {
ListMyBadges200,
ListMyBadges200AllOf,
} from "@/lib/api/generated/schemas";

import type {
UserBadgeList,
EarnedUserBadge,
} from "@/features/users/types/badge.types";

import { filterEarnedBadges } from "@/features/users/types/badge.types";

export type {
UserControllerListMyActivityParams,
} from "@/lib/api/generated/schemas";

export type ListMyActivityResult = {
data?: UserActivityItemDto[];
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export async function listMyActivity(
params?: UserControllerListMyActivityParams
): Promise<ListMyActivityResult> {
const sdk = getUsers();
const response = await sdk.userControllerListMyActivity(params);
return response as ListMyActivityResult;
}

export type {
UserControllerListMyBadgesParams,
} from "@/lib/api/generated/schemas";

type ListMyBadgesResponse = ListMyBadges200 &
ListMyBadges200AllOf & {
data?: MyBadgeItemDto[];
  };

export async function listMyBadges(): Promise<UserBadgeList> {
const sdk = getUsers();
const response = (await sdk.userControllerListMyBadges()) as ListMyBadgesResponse;

let badges: MyBadgeItemDto[] = [];

if (Array.isArray(response)) {

badges = response;
  } else if (response.data) {

badges = response.data;
  }

const earnedBadges = filterEarnedBadges(badges);

return {
items: earnedBadges,
total: earnedBadges.length,
  };
}

export type {
UserControllerListMyTournamentsParams,
} from "@/lib/api/generated/schemas";

export type ListMyTournamentsResult = {
data?: MyTournamentItemDto[];
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export async function listMyTournaments(
params?: UserControllerListMyTournamentsParams
): Promise<ListMyTournamentsResult> {
const sdk = getUsers();
const response = await sdk.userControllerListMyTournaments(params);
return response as ListMyTournamentsResult;
}

export type {
UserControllerListMyTournamentHistoryParams,
} from "@/lib/api/generated/schemas";

export type ListMyTournamentHistoryResult = {
data?: MyTournamentHistoryItemDto[];
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export async function listMyTournamentHistory(
params?: UserControllerListMyTournamentHistoryParams
): Promise<ListMyTournamentHistoryResult> {
const sdk = getUsers();
const response = await sdk.userControllerListMyTournamentHistory(params);
return response as ListMyTournamentHistoryResult;
}

export async function getMyTournamentAnalytics(): Promise<MyTournamentAnalyticsResponseDto> {
const sdk = getUsers();
const wire = await sdk.userControllerGetMyTournamentAnalytics();

const data = (wire as { data?: MyTournamentAnalyticsResponseDto }).data;
return data as MyTournamentAnalyticsResponseDto;
}

export type { UserRankingResponseDto } from "@/lib/api/generated/schemas";

export async function getMyRanking(): Promise<UserRankingResponseDto> {
const sdk = getUsers();
const response = (await sdk.userControllerGetMyRanking()) as UserControllerGetMyRanking200;
return response.data as unknown as UserRankingResponseDto;
}

export type GetMyAnalyticsResult = {
xpTotal?: number;
quizzesCompleted?: number;
averageScore?: number;
totalTimeSpentMinutes?: number;
currentStreak?: number;
longestStreak?: number;
tournamentsPlayed?: number;
tournamentsWon?: number;
};

export type { UserControllerListUserQuizzesParams } from '@/lib/api/generated/schemas';

export interface ListUserQuizzesResult {
data?: import('@/lib/api/generated/schemas').QuizListItemDto[];
meta?: {
pagination?: {
kind: 'cursor';
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
}

export interface ListUserQuizzesParams {
cursor?: string;
limit?: number;

status?: 'draft' | 'published';
}

export async function listUserQuizzes(
userId: string,
params?: ListUserQuizzesParams,
): Promise<ListUserQuizzesResult> {
const sdk = getUsers();
const forwarded: Record<string, unknown> = {};
if (params?.cursor !== undefined) forwarded.cursor = params.cursor;
if (params?.limit !== undefined) forwarded.limit = params.limit;
if (params?.status !== undefined) forwarded.status = params.status;
const response = await sdk.userControllerListUserQuizzes(
userId,
forwarded as Parameters<typeof sdk.userControllerListUserQuizzes>[1],
  );
return response as ListUserQuizzesResult;
}

export interface CreatorQuizAnalytics {
userId: string;
totalQuizzes: number;
draftQuizzes: number;
publishedQuizzes: number;
totalAttempts: number;
uniquePlayers: number;
averageScore: number;
averageRating: number;
totalBookmarks: number;
totalReviews: number;
lastUpdated: string;
}

export async function getUserQuizAnalytics(
userId: string,
): Promise<CreatorQuizAnalytics | null> {
const sdk = getUsers();
const envelope = await sdk.userControllerGetUserQuizAnalytics(userId);
const data = (envelope as { data?: CreatorQuizAnalytics }).data;
return data ?? null;
}

export async function getMyAnalytics(): Promise<GetMyAnalyticsResult> {
const sdk = getUsers();
const response = await sdk.userControllerGetMyAnalytics();
return response as GetMyAnalyticsResult;
}
