/**
 * Tournament Types — aligned with backend DTOs.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-A3.
 *
 * Re-exports generated DTOs for:
 * - Active tournaments: `MyTournamentItemDto`
 * - Tournament history: `MyTournamentHistoryItemDto`
 * - Tournament analytics: `MyTournamentAnalyticsResponseDto`
 *
 * ## Per-user analytics sparkline (master plan §1.3)
 *
 * The analytics sparkline should be hidden if all values are zero for
 * 30 consecutive days. This is a Phase 4 client-side concern handled
 * by the TournamentsTab component.
 */

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

// Re-export generated DTOs
export type { MyTournamentItemDto };
export type { MyTournamentHistoryItemDto };
export type { MyTournamentAnalyticsResponseDto };

// ─── Tournament with id alias ─────────────────────────────────────────────────

/**
 * `MyTournamentItemDto` with a synthesised `id` field.
 *
 * The `id` field is an alias of `tournamentId` so `appendUniqueById`
 * deduplication in `useCursorPaginated` works.
 */
export type UserTournament = MyTournamentItemDto & { id: string };

/**
 * `MyTournamentHistoryItemDto` with a synthesised `id` field.
 */
export type UserTournamentHistoryItem = MyTournamentHistoryItemDto & {
  id: string;
};

// ─── Response envelopes ───────────────────────────────────────────────────────

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

// ─── Sparkline type ───────────────────────────────────────────────────────────

/**
 * Simplified analytics for the sparkline display.
 * Derived from `MyTournamentAnalyticsResponseDto`.
 */
export interface TournamentSparklineData {
  tournamentsPlayed: number;
  wins: number;
  winRate: number;
  averageRank: number | null;
}

/**
 * Checks if all sparkline values are zero (30-day check would be server-side).
 */
export function isSparklineEmpty(data: TournamentSparklineData): boolean {
  return data.tournamentsPlayed === 0 && data.wins === 0 && data.winRate === 0;
}

// ─── SWR key factories ────────────────────────────────────────────────────────

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
