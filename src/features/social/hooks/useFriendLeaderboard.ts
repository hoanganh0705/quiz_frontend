"use client";

import { useCallback, useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
toFriendLeaderboardFromEnvelope,
} from "@/features/social/dto-adapters-analytics";
import { getFriendLeaderboard } from "@/features/social/services";
import {
type AnalyticsPeriod,
type FriendLeaderboardDto,
type FriendLeaderboardEntryDto,
type FriendLeaderboardPeriod,
mapAnalyticsPeriodToLeaderboardPeriod,
} from "@/features/social/types";
import { useEventuallyConsistentQuery } from "@/features/social/hooks/useEventuallyConsistentQuery";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { useCursorPaginated } from "@/lib/api/use-cursor-paginated";
import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "@/features/social/pagination-invariants";

import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";
import type { ApiError } from "@/lib/api";

export interface UseFriendLeaderboardResult {
entries: readonly FriendLeaderboardEntryDto[];
currentUserRank: { rank: number; xp: number } | null;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
retry: () => void;
hasMore: boolean;
loadMore: () => void;
staleness: ConsistencyStaleness;
}

const SAFE_FALLBACK: UseFriendLeaderboardResult = Object.freeze({
entries: [],
currentUserRank: null,
isLoading: false,
isStale: false,
error: null,
retry: () => undefined,
hasMore: false,
loadMore: () => undefined,
staleness: "fresh",
});

function toBackendPeriod(
period: AnalyticsPeriod,
): FriendLeaderboardPeriod {
return mapAnalyticsPeriodToLeaderboardPeriod(period);
}

type EntryWithId = FriendLeaderboardEntryDto & { id: string };

export function useFriendLeaderboard(
period: AnalyticsPeriod,
): UseFriendLeaderboardResult {
const flagValue = getFeatureFlagValue("social_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const backendPeriod = toBackendPeriod(period);
const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
return ["social", "v1", "friend-leaderboard", backendPeriod] as const;
  }, [isFlagPlaceholder, isAuthenticated, backendPeriod]);

const firstPageFetcher = useCallback(
async (): Promise<FriendLeaderboardDto> => {
const envelope = await getFriendLeaderboard({
period: backendPeriod,
limit: SOCIAL_GRAPH_DEFAULT_LIMIT,
      });
return toFriendLeaderboardFromEnvelope(envelope);
    },
[backendPeriod],
  );

const firstPage = useEventuallyConsistentQuery<FriendLeaderboardDto>(
key,
firstPageFetcher,
  );

const paginatedKey = key ?? ["social", "v1", "friend-leaderboard-disabled"];

const paginated = useCursorPaginated<EntryWithId, { period: FriendLeaderboardPeriod; limit: number }>({
key: paginatedKey,
paginationKind: "offset",
fetcher: useCallback(
async ({ page, params }) => {
if (key === null) {
return {
items: [],
page,
total: 0,
hasMore: false,
limit: params.limit,
          };
        }
const envelope = await getFriendLeaderboard({
period: params.period,
limit: params.limit,
        });
const dto = toFriendLeaderboardFromEnvelope(envelope);
const entries: EntryWithId[] = dto.entries.map((e) => ({
...e,
id: `${e.userId}-${e.rank}-${page}`,
        }));
return {
items: entries,
page,
total: dto.totalParticipants,
hasMore: page * params.limit < dto.totalParticipants,
limit: params.limit,
        };
      },
[key],
    ),
params: { period: backendPeriod, limit: SOCIAL_GRAPH_DEFAULT_LIMIT },
  });

if (isFlagPlaceholder) return SAFE_FALLBACK;
if (!isAuthenticated) return SAFE_FALLBACK;

if (firstPage.isLoading && firstPage.data === null) {
return {
entries: [],
currentUserRank: null,
isLoading: true,
isStale: false,
error: null,
retry: firstPage.retry,
hasMore: false,
loadMore: () => undefined,
staleness: "fresh",
    };
  }

const entries = paginated.items.length > 0
? paginated.items
: (firstPage.data?.entries ?? []);

return {
entries,

currentUserRank: firstPage.data?.currentUserRank ?? null,
isLoading: paginated.isLoading,
isStale: firstPage.isStale || paginated.isLoading,
error: firstPage.error,
retry: firstPage.retry,
hasMore: paginated.hasMore,
loadMore: paginated.loadMore,
staleness: firstPage.staleness,
  };
}