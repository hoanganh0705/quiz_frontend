"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";
import { getUserActivity } from "@/features/social/services/activity.service";
import type {
SocialActivityItemDto,
} from "@/features/social/types";
import type {
SocialListVisibility,
} from "@/features/social/social-list-visibility";
import {
decodeRateLimit,
isRateLimitErrorCode,
} from "@/features/social/rate-limit-decoder";
import { resolveMutualVisibility } from "@/features/social/hooks/useMutualFriends";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export const ACTIVITY_PAGE_SIZE = 20;

export interface UseUserActivityResult {
items: readonly SocialActivityItemDto[];
total: number;
visibility: SocialListVisibility;
isLoading: boolean;
isStale: boolean;

staleness: ConsistencyStaleness;
error: ApiError | null;
loadMore: () => void;
hasMore: boolean;
retry: () => Promise<void>;

rateLimitedUntil: number | null;
}

const EMPTY_PAGE = Object.freeze({
items: [] as readonly SocialActivityItemDto[],
nextCursor: null as string | null,
hasNextPage: false,
limit: 0,
});

const PLACEHOLDER_RESULT: UseUserActivityResult = Object.freeze({
items: [],
total: 0,
visibility: "not_found",
isLoading: false,
isStale: false,
staleness: "fresh",
error: null,
hasMore: false,
loadMore: () => undefined,
retry: () => Promise.resolve(),
rateLimitedUntil: null,
});

const FALLBACK_RESULT: UseUserActivityResult = Object.freeze({
items: [],
total: 0,
visibility: "not_found",
isLoading: false,
isStale: false,
staleness: "fresh",
error: null,
hasMore: false,
loadMore: () => undefined,
retry: () => Promise.resolve(),
rateLimitedUntil: null,
});

export function useUserActivity(
targetUserId: string | null,
): UseUserActivityResult {
const flagValue = getFeatureFlagValue("social_activity_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
if (targetUserId === null) return null;
return ["social", "user-activity", targetUserId] as const;
  }, [isFlagPlaceholder, isAuthenticated, targetUserId]);

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<Record<string, never>>): Promise<{
items: readonly SocialActivityItemDto[];
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
const result = await getUserActivity(targetUserId, {
...(cursor ? { cursor } : {}),
limit: ACTIVITY_PAGE_SIZE,
          });
return {
items: result.items,
nextCursor: null,
hasNextPage: false,
limit: ACTIVITY_PAGE_SIZE,
          };
        } catch (err) {

throw err;
        }
      },
[isFlagPlaceholder, isAuthenticated, targetUserId],
  );

const result = useCursorPaginated<
SocialActivityItemDto,
Record<string, never>
  >({
key: key ?? [],
fetcher,
params: {},
paginationKind: "cursor",
  });

const code = result.error?.code;
const visibility = resolveMutualVisibility(code);

const cooldownSeconds = useMemo<number | null>(() => {
if (result.error === null) return null;
if (!isRateLimitErrorCode(result.error.code)) return null;
const { cooldownSeconds: decoded } = decodeRateLimit(result.error);
if (decoded === null || decoded <= 0) return null;
return decoded;
  }, [result.error]);

const [rateLimitAnchorMs, setRateLimitAnchorMs] = useState<
number | null
  >(null);
useEffect(() => {

setRateLimitAnchorMs(
cooldownSeconds === null ? null : Date.now(),
    );
  }, [cooldownSeconds]);

const rateLimitedUntil: number | null =
cooldownSeconds !== null && rateLimitAnchorMs !== null
? rateLimitAnchorMs + cooldownSeconds * 1000
: null;

const staleness: ConsistencyStaleness =
result.isLoading && result.items.length > 0 ? "stale" : "fresh";

if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
if (!isAuthenticated) return FALLBACK_RESULT;
if (targetUserId === null) return FALLBACK_RESULT;

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
staleness,
error,
hasMore: result.hasMore,
loadMore: result.loadMore,
retry: result.refresh,
rateLimitedUntil,
  };
}
