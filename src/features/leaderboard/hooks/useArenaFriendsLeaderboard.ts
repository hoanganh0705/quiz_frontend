"use client";

import { useMemo } from "react";

import { ApiError, useSingleWithRetry } from "@/lib/api";
import { getSocial } from "@/lib/api/generated/social/social";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";

import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";
import type { FriendLeaderboardDto } from "@/lib/api/generated/schemas";

export interface ArenaFriendEntry {
  readonly rank: number;
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly xp: number;
  readonly friendSince: string | null;
}

export interface ArenaFriendCurrentUserRank {
  readonly rank: number;
  readonly xp: number;
  readonly totalParticipants: number;
}

interface NormalizedFriendLeaderboard {
  readonly entries: readonly ArenaFriendEntry[];
  readonly currentUserRank: ArenaFriendCurrentUserRank | null;
  readonly totalParticipants: number;
  readonly isStale: boolean;
}

export interface UseArenaFriendsLeaderboardResult extends NormalizedFriendLeaderboard {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly retry: () => Promise<void>;
}

const DEFAULT_FRIENDS_LIMIT = 50;

export function useArenaFriendsLeaderboard(
  period: LeaderboardPeriod,
  enabled = true,
): UseArenaFriendsLeaderboardResult {
  const { isAuthenticated } = useAuthState();
  const active = enabled && isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!active) return null;
    return ["leaderboard", "friends", period, DEFAULT_FRIENDS_LIMIT] as const;
  }, [active, period]);

  const fetcher = useMemo(
    () =>
      async ({
        signal,
      }: {
        signal: AbortSignal;
      }): Promise<NormalizedFriendLeaderboard> => {
        const result = await getSocial().socialControllerGetFriendLeaderboard({
          period,
          limit: DEFAULT_FRIENDS_LIMIT,
        });
        if (signal.aborted) {
          throw new DOMException("aborted", "AbortError");
        }
        const wire = result as unknown as { data?: FriendLeaderboardDto };
        const data = wire.data;
        if (!data) {
          return {
            entries: [],
            currentUserRank: null,
            totalParticipants: 0,
            isStale: false,
          };
        }

        const entries: ArenaFriendEntry[] = Array.isArray(data.entries)
          ? data.entries.map((rawEntry) => {
              const entry = rawEntry as unknown as Record<string, unknown>;
              const rawDisplayName = entry.displayName;
              const display =
                typeof rawDisplayName === "string" &&
                rawDisplayName.trim().length > 0
                  ? rawDisplayName
                  : String(entry.username ?? "Friend");
              return {
                rank: Number(entry.rank ?? 0),
                userId: String(entry.userId ?? ""),
                username: String(entry.username ?? "friend"),
                displayName: display,
                avatarUrl:
                  typeof entry.avatarUrl === "string" ? entry.avatarUrl : null,
                xp: Number(entry.xp ?? 0),
                friendSince:
                  typeof entry.friendSince === "string"
                    ? entry.friendSince
                    : null,
              };
            })
          : [];

        const rawMe = data.currentUserRank as unknown as Record<
          string,
          unknown
        > | null;
        const currentUserRank: ArenaFriendCurrentUserRank | null =
          rawMe && typeof rawMe === "object" && rawMe.rank !== undefined
            ? {
                rank: Number(rawMe.rank),
                xp: Number(rawMe.xp ?? 0),
                totalParticipants: Number(
                  rawMe.totalParticipants ?? data.totalParticipants ?? 0,
                ),
              }
            : null;

        return {
          entries,
          currentUserRank,
          totalParticipants: Number(data.totalParticipants ?? entries.length),
          isStale: Boolean(data.isStale),
        };
      },
    [period],
  );

  const single = useSingleWithRetry<NormalizedFriendLeaderboard>({
    key,
    fetcher,
  });

  if (!active) {
    return {
      isAuthenticated,
      entries: [],
      currentUserRank: null,
      totalParticipants: 0,
      isStale: false,
      isLoading: false,
      error: null,
      retry: () => Promise.resolve(),
    };
  }

  return {
    isAuthenticated,
    entries: single.data?.entries ?? [],
    currentUserRank: single.data?.currentUserRank ?? null,
    totalParticipants: single.data?.totalParticipants ?? 0,
    isStale: single.data?.isStale ?? false,
    isLoading: single.isLoading,
    error: single.error,
    retry: single.retry,
  };
}
