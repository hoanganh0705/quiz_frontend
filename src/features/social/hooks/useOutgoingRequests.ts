"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { toFriendRequest } from "@/features/social/dto-adapters";
import { getSentRequests } from "@/features/social/services";
import {
SOCIAL_CACHE_KEYS,
type SocialFriendRequestDto,
} from "@/features/social/types";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseOutgoingRequestsResult {
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

const PLACEHOLDER_RESULT: UseOutgoingRequestsResult = Object.freeze({
requests: [],
isLoading: false,
isStale: false,
hasMore: false,
loadMore: () => undefined,
error: null,
retry: () => Promise.resolve(),
});

export function useOutgoingRequests(): UseOutgoingRequestsResult {
const flagValue = getFeatureFlagValue("social_relationship_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;
return SOCIAL_CACHE_KEYS.makeOutgoingRequestsKey();
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
const wire = await getSentRequests();
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
requests: dedupeByAddressee(result.items),
isLoading: result.isLoading,
isStale: false,
hasMore: result.hasMore,
loadMore: result.loadMore,
error: result.error,
retry: result.refresh,
  };
}

/**
 * The Sent list should show one row per recipient. If the backend
 * returns more than one pending friendship for the same addressee
 * (for example, a legacy row that survived an early bug where the
 * cancel endpoint was a no-op), collapse them down to the most
 * recently created one so the UI does not render duplicate rows.
 */
function dedupeByAddressee(
items: readonly SocialFriendRequestDto[],
): readonly SocialFriendRequestDto[] {
  const byAddressee = new Map<string, SocialFriendRequestDto>();
  for (const item of items) {
    if (!item.addresseeId) {
      byAddressee.set(item.id, item);
      continue;
    }
    const existing = byAddressee.get(item.addresseeId);
    if (
      !existing ||
      Date.parse(item.createdAt) > Date.parse(existing.createdAt)
    ) {
      byAddressee.set(item.addresseeId, item);
    }
  }
  return Array.from(byAddressee.values());
}
