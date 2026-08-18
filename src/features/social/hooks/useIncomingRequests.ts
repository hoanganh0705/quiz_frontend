"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { toFriendRequest } from "@/features/social/dto-adapters";
import { getPendingRequests } from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
type SocialFriendRequestDto,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseIncomingRequestsResult {
requests: readonly SocialFriendRequestDto[];
isLoading: boolean;
isStale: boolean;
hasMore: boolean;
loadMore: () => void;
error: ApiError | null;
retry: () => Promise<void>;
}

const EMPTY_PAGE = Object.freeze({
items: [] as readonly SocialFriendRequestDto[],
nextCursor: null as string | null,
hasNextPage: false,
limit: 0,
});

const PLACEHOLDER_RESULT: UseIncomingRequestsResult = Object.freeze({
requests: [],
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
});

export function useIncomingRequests(): UseIncomingRequestsResult {
const flagValue = getFeatureFlagValue("social_relationship_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
return SOCIAL_CACHE_KEYS.makeIncomingRequestsKey();
  }, [isFlagPlaceholder, isAuthenticated]);

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<Record<string, never>>): Promise<{
items: readonly SocialFriendRequestDto[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
      }> => {
if (isFlagPlaceholder || !isAuthenticated) {
return EMPTY_PAGE;
        }
try {
const wire = await getPendingRequests();
const items = (wire.data ?? []).map((row) => toFriendRequest(row));
const limit = items.length;
return {
items,
nextCursor: null,
hasNextPage: false,
limit,
          };
        } catch (err) {
const apiErr = err as Partial<ApiError> | null;
if (
apiErr &&
(apiErr.code === "GLOBAL_NOT_FOUND" ||
apiErr.status === 404)
          ) {
return EMPTY_PAGE;
          }
throw err;
        }
void cursor;
      },
[isFlagPlaceholder, isAuthenticated],
  );

const result = useCursorPaginated<SocialFriendRequestDto, Record<string, never>>({
key: key ?? [],
fetcher,
params: {},
paginationKind: "cursor",
  });

if (isFlagPlaceholder) return PLACEHOLDER_RESULT;
if (!isAuthenticated) return PLACEHOLDER_RESULT;

return {
requests: result.items,
isLoading: result.isLoading,
isStale: false,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
retry: result.refresh,
  };
}
