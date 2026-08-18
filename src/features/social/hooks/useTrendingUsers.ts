"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
getTrendingUsers,
type TrendingUsersServiceResult,
} from "@/features/social/services/discovery.service";
import {
TRENDING_PAGE_SIZE,
} from "@/features/social/discovery-invariants";
import type {
SocialListVisibility,
} from "@/features/social/social-list-visibility";

import type {
TrendingUserResponseDto,
TrendingUserResponseDtoTrendReason,
} from "@/lib/api/generated/schemas";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseTrendingUsersResult {
readonly items: readonly TrendingUserResponseDto[];
readonly total: number;
readonly visibility: SocialListVisibility;
readonly isLoading: boolean;
readonly isStale: boolean;
readonly error: ApiError | null;
readonly loadMore: () => void;
readonly hasMore: boolean;
readonly retry: () => Promise<void>;
}

interface TrendingUserWithId {
readonly id: string;
readonly userId: string;
readonly username: string;
readonly avatarUrl?: unknown;
readonly followers: number;
readonly trendScore: number;
readonly trendReason: TrendingUserResponseDtoTrendReason;
}

const EMPTY_PAGE = Object.freeze({
items: [] as readonly TrendingUserWithId[],
page: 0,
total: 0,
hasMore: false,
limit: TRENDING_PAGE_SIZE,
});

const FALLBACK_RESULT: UseTrendingUsersResult = Object.freeze({
items: [] as readonly TrendingUserResponseDto[],
total: 0,
visibility: "not_found",
isLoading: false,
isStale: false,
error: null,
hasMore: false,
loadMore: () => undefined,
retry: () => Promise.resolve(),
});

export function useTrendingUsers(): UseTrendingUsersResult {
const flagValue = getFeatureFlagValue("social_discovery_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
return ["social", "trending"] as const;
  }, [isFlagPlaceholder, isAuthenticated]);

const fetcher = useMemo(
() =>
async (): Promise<{
items: readonly TrendingUserWithId[];
page: number;
total: number;
hasMore: boolean;
limit: number;
      }> => {
if (isFlagPlaceholder || !isAuthenticated) {
return EMPTY_PAGE;
        }
try {
const result: TrendingUsersServiceResult = await getTrendingUsers({
limit: TRENDING_PAGE_SIZE,
          });
return {
items: result.items.map((item): TrendingUserWithId => ({
id: item.userId,
userId: item.userId,
username: item.username,
avatarUrl: item.avatarUrl,
followers: item.followers,
trendScore: item.trendScore,
trendReason: item.trendReason,
            })),
page: 0,
total: result.total,
hasMore: result.items.length >= TRENDING_PAGE_SIZE,
limit: TRENDING_PAGE_SIZE,
          };
        } catch (err) {
throw err;
        }
      },
[isFlagPlaceholder, isAuthenticated],
  );

const result = useCursorPaginated<TrendingUserWithId, Record<string, never>>({
key: key ?? [],
fetcher,
params: {},
paginationKind: "offset",
  });

if (isFlagPlaceholder) return FALLBACK_RESULT;
if (!isAuthenticated) return FALLBACK_RESULT;

const code = result.error?.code;
const visibility = resolveTrendingVisibility(code);

const rawItems = visibility !== "visible" ? [] : result.items;
const items = rawItems as unknown as readonly TrendingUserResponseDto[];
const total = visibility !== "visible" ? 0 : result.items.length;
const error =
visibility !== "visible" && result.error !== null ? null : result.error;

return {
items,
total,
visibility,
isLoading: result.isLoading,
isStale: false,
error,
hasMore: result.hasMore,
loadMore: result.loadMore,
retry: result.refresh,
  };
}

export function resolveTrendingVisibility(
code: string | undefined,
): SocialListVisibility {
if (code === "SOCIAL_USER_BLOCKED") return "blocked_by_viewer";
if (code === "SOCIAL_BLOCKED_USER") return "blocked_viewer";
if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
if (code === "SOCIAL_USER_NOT_FOUND") return "not_found";
return "visible";
}

