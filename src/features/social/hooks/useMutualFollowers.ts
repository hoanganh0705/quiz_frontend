"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { getMutualFollowers } from "@/features/social/services/mutuals.service";
import { MUTUAL_LIST_PAGE_SIZE } from "@/features/social/mutual-count-invariants";
import { resolveMutualVisibility } from "@/features/social/hooks/useMutualFriends";
import type {
SocialMutualDto,
} from "@/features/social/types";
import type {
SocialListVisibility,
} from "@/features/social/social-list-visibility";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseMutualFollowersResult {
items: readonly SocialMutualDto[];
total: number;
visibility: SocialListVisibility;
isLoading: boolean;
isStale: boolean;
error: ApiError | null;
loadMore: () => void;
hasMore: boolean;
retry: () => Promise<void>;
}

export { resolveMutualVisibility } from "@/features/social/hooks/useMutualFriends";

const EMPTY_PAGE = Object.freeze({
items: [] as readonly SocialMutualDto[],
nextCursor: null as string | null,
hasNextPage: false,
limit: 0,
});

const PLACEHOLDER_RESULT: UseMutualFollowersResult = Object.freeze({
items: [],
total: 0,
visibility: "not_found",
isLoading: false,
isStale: false,
error: null,
hasMore: false,
loadMore: () => undefined,
retry: () => Promise.resolve(),
});

const FALLBACK_RESULT: UseMutualFollowersResult = Object.freeze({
items: [],
total: 0,
visibility: "not_found",
isLoading: false,
isStale: false,
error: null,
hasMore: false,
loadMore: () => undefined,
retry: () => Promise.resolve(),
});

export function useMutualFollowers(
targetUserId: string | null,
): UseMutualFollowersResult {
const flagValue = getFeatureFlagValue("social_mutuals_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
if (targetUserId === null) return null;
return ["social", "mutual-followers", targetUserId] as const;
  }, [isFlagPlaceholder, isAuthenticated, targetUserId]);

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<Record<string, never>>): Promise<{
items: readonly SocialMutualDto[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
      }> => {
if (
isFlagPlaceholder ||
!isAuthenticated ||
targetUserId === null
        ) {
return EMPTY_PAGE;
        }
try {
const result = await getMutualFollowers(targetUserId, {
...(cursor ? { cursor } : {}),
limit: MUTUAL_LIST_PAGE_SIZE,
          });
return {
items: result.items,
nextCursor: null,
hasNextPage: false,
limit: MUTUAL_LIST_PAGE_SIZE,
          };
        } catch (err) {

throw err;
        }
      },
[isFlagPlaceholder, isAuthenticated, targetUserId],
  );

const result = useCursorPaginated<SocialMutualDto, Record<string, never>>({
key: key ?? [],
fetcher,
params: {},
paginationKind: "cursor",
  });

if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
if (!isAuthenticated) return FALLBACK_RESULT;
if (targetUserId === null) return FALLBACK_RESULT;

const code = result.error?.code;
const visibility = resolveMutualVisibility(code);

const items = visibility !== "visible" ? [] : result.items;
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
