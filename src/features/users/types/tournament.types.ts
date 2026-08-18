

import type {
MyTournamentItemDto,
MyTournamentHistoryItemDto,
MyTournamentAnalyticsResponseDto,
UserControllerListMyTournaments200,
UserControllerListMyTournaments200AllOf,
UserControllerListMyTournamentHistory200,
UserControllerListMyTournamentHistory200AllOf,
UserControllerGetMyTournamentAnalytics200,
UserControllerGetMyTournamentAnalytics200AllOf,
} from "@/lib/api/generated/schemas";

export type { MyTournamentItemDto };
export type { MyTournamentHistoryItemDto };
export type { MyTournamentAnalyticsResponseDto };

export type UserTournament = MyTournamentItemDto & { id: string };

export type UserTournamentHistoryItem = MyTournamentHistoryItemDto & {
id: string;
};

export type ListMyTournamentsResponse = UserControllerListMyTournaments200 &
UserControllerListMyTournaments200AllOf & {
data?: MyTournamentItemDto[];
  };

export type ListMyTournamentHistoryResponse =
UserControllerListMyTournamentHistory200 &
UserControllerListMyTournamentHistory200AllOf & {
data?: MyTournamentHistoryItemDto[];
    };

export type GetMyTournamentAnalyticsResponse =
UserControllerGetMyTournamentAnalytics200 &
UserControllerGetMyTournamentAnalytics200AllOf;

export interface TournamentSparklineData {
tournamentsPlayed: number;
wins: number;
winRate: number;
averageRank: number | null;
}

export function isSparklineEmpty(data: TournamentSparklineData): boolean {
return data.tournamentsPlayed === 0 && data.wins === 0 && data.winRate === 0;
}

export function myTournamentsKey(): readonly ["users", "me", "tournaments"] {
return ["users", "me", "tournaments"];
}

export function myTournamentHistoryKey(): readonly [
"users",
"me",
"tournament-history"
] {
return ["users", "me", "tournament-history"];
}

export function myTournamentAnalyticsKey(): readonly [
"users",
"me",
"tournaments",
"analytics"
] {
return ["users", "me", "tournaments", "analytics"];
}
