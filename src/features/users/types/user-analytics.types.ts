

import type {
UserRankingResponseDto,
UserControllerGetMyAnalytics200,
UserControllerGetMyAnalytics200AllOf,
AttemptSummaryResponseDto,
AttemptControllerListMyAttempts200,
AttemptControllerListMyAttempts200AllOf,
AttemptControllerListMyAttempts200AllOfMeta,
} from "@/lib/api/generated/schemas";

export type { UserRankingResponseDto };

export interface UserRankingData {
userId: string;
globalRank: number | null;
totalScore: number;
level: number;
updatedAt: string;
isRanked: boolean;
}

export function extractRankingData(
response: UserRankingResponseDto | undefined
): UserRankingData | null {
if (!response) return null;

return {
userId: response.userId,
globalRank: response.globalRank ?? null,
totalScore: response.totalScore ?? 0,
level: response.level ?? 1,
updatedAt: response.updatedAt ?? "",
isRanked: response.globalRank !== null && response.globalRank !== undefined,
  };
}

export type GetMyAnalyticsResponse = UserControllerGetMyAnalytics200 &
UserControllerGetMyAnalytics200AllOf;

export type ListMyAttemptsResponse = AttemptControllerListMyAttempts200 &
AttemptControllerListMyAttempts200AllOf & {
data?: AttemptSummaryResponseDto[];
meta?: AttemptControllerListMyAttempts200AllOfMeta;
  };

export type UserAttempt = AttemptSummaryResponseDto & { id: string };

export function myRankingKey(): readonly ["users", "me", "ranking"] {
return ["users", "me", "ranking"];
}

export function myAnalyticsKey(): readonly ["users", "me", "analytics"] {
return ["users", "me", "analytics"];
}

export function myAttemptsKey(): readonly ["attempts", "me"] {
return ["attempts", "me"];
}
