/**
 * `users.profile.service.ts` — User profile read-side service for Epic 4.5.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B0 (service infrastructure).
 *
 * Read endpoints for the user's personal profile data:
 * - Activity feed
 * - Badges
 * - Tournaments
 * - Tournament history
 * - Tournament analytics
 * - Ranking
 * - Analytics
 *
 * ## Badge normalization (master plan §1.3 warning line 61)
 *
 * `GET /users/me/badges` may return a bare array. The service wrapper
 * normalizes this to a wrapped `{ items }` shape and filters out
 * deferred badges before returning data to the hook layer.
 */

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

// ─── Activity ──────────────────────────────────────────────────────────────────

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

// ─── Badges ────────────────────────────────────────────────────────────────────

export type {
  UserControllerListMyBadgesParams,
} from "@/lib/api/generated/schemas";

/**
 * Wire envelope for badge list (handles bare array normalization).
 * Per master plan §1.3 warning line 61, the backend may return a bare array.
 */
type ListMyBadgesResponse = ListMyBadges200 &
  ListMyBadges200AllOf & {
    data?: MyBadgeItemDto[];
  };

/**
 * Normalized badge list with deferred badges filtered.
 */
export async function listMyBadges(): Promise<UserBadgeList> {
  const sdk = getUsers();
  const response = (await sdk.userControllerListMyBadges()) as ListMyBadgesResponse;

  // Handle bare array response (master plan §1.3 warning line 61)
  let badges: MyBadgeItemDto[] = [];

  if (Array.isArray(response)) {
    // Bare array response
    badges = response;
  } else if (response.data) {
    // Wrapped envelope response
    badges = response.data;
  }

  // Filter deferred badges client-side (master plan §1.3)
  const earnedBadges = filterEarnedBadges(badges);

  return {
    items: earnedBadges,
    total: earnedBadges.length,
  };
}

// ─── Tournaments ───────────────────────────────────────────────────────────────

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

// ─── Tournament History ────────────────────────────────────────────────────────

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

// ─── Tournament Analytics ───────────────────────────────────────────────────────

export async function getMyTournamentAnalytics(): Promise<MyTournamentAnalyticsResponseDto> {
  const sdk = getUsers();
  const response = await sdk.userControllerGetMyTournamentAnalytics();
  return response as unknown as MyTournamentAnalyticsResponseDto;
}

// ─── Ranking ───────────────────────────────────────────────────────────────────

export type { UserRankingResponseDto } from "@/lib/api/generated/schemas";

export async function getMyRanking(): Promise<UserRankingResponseDto> {
  const sdk = getUsers();
  const response = (await sdk.userControllerGetMyRanking()) as UserControllerGetMyRanking200;
  return response.data as unknown as UserRankingResponseDto;
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

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

export async function getMyAnalytics(): Promise<GetMyAnalyticsResult> {
  const sdk = getUsers();
  const response = await sdk.userControllerGetMyAnalytics();
  return response as GetMyAnalyticsResult;
}
