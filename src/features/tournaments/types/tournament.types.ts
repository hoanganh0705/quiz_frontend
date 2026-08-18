

import type {
TournamentDetailResponseDto,
TournamentLeaderboardEntryDto,
TournamentParticipantListItemDto,
} from "@/lib/api/generated/schemas";

import type { TournamentResponseDto } from "@/lib/api/generated/schemas/tournamentResponseDto";

export type TournamentStatus =
| "upcoming"
  | "registration"
  | "ongoing"
  | "finished"
  | "cancelled";

export interface TournamentListFilters {

status?: TournamentStatus;

search: string;

cursor?: string;

limit?: number;
}

export interface TournamentParticipantsFilters {

page?: number;

limit?: number;
}

export interface TournamentLeaderboardFilters {

page?: number;

limit?: number;
}

export const DEFAULT_TOURNAMENT_LIST_FILTERS: TournamentListFilters = {
status: undefined,
search: "",
cursor: undefined,
limit: undefined,
};

export interface TournamentListPage {
items: readonly TournamentSummary[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
}

export interface TournamentParticipantsPage {
items: readonly TournamentParticipant[];
page: number;
total: number;
hasMore: boolean;
limit: number;
}

export interface TournamentLeaderboardPage {
items: readonly TournamentLeaderboardEntry[];
page: number;
total: number;
hasMore: boolean;
limit: number;
}

export type TournamentSummary = TournamentResponseDto & {

id: string;
};

export type TournamentDetail = TournamentDetailResponseDto & {

id: string;
};

export type TournamentParticipant = TournamentParticipantListItemDto & {

id: string;
};

export type TournamentLeaderboardEntry = TournamentLeaderboardEntryDto & {

id: string;

score: number;
};

export function serializeTournamentFilters(
filters: TournamentListFilters,
): string {
const parts: string[] = [];

if (filters.status !== undefined) {
parts.push(`status=${filters.status}`);
  }
if (filters.search.trim().length > 0) {
parts.push(`q=${filters.search.trim().toLowerCase()}`);
  }
if (filters.cursor !== undefined) {
parts.push(`cursor=${filters.cursor}`);
  }
if (typeof filters.limit === "number") {
parts.push(`limit=${filters.limit}`);
  }

return parts.join("|");
}

export const TOURNAMENT_CACHE_KEYS = {

list(filters: TournamentListFilters) {
return [
"tournaments",
"list",
serializeTournamentFilters(filters),
    ] as const;
  },

detail(tournamentId: string) {
return ["tournaments", "detail", tournamentId] as const;
  },

participants(tournamentId: string, filters: TournamentParticipantsFilters) {
return [
"tournaments",
"participants",
tournamentId,
`page=${filters.page ?? 1}`,
`limit=${filters.limit ?? 20}`,
    ] as const;
  },

leaderboard(
tournamentId: string,
filters: TournamentLeaderboardFilters,
  ) {
return [
"tournaments",
"leaderboard",
tournamentId,
`page=${filters.page ?? 1}`,
`limit=${filters.limit ?? 20}`,
    ] as const;
  },
} as const;
