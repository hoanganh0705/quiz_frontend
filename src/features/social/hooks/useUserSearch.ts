"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";
import { getAuthToken } from "@/features/auth/utils/auth-cookies";

import { searchUsers } from "@/features/social/services/search.service";
import {
DEBOUNCE_WINDOW_MS,
SEARCH_MIN_QUERY_LENGTH,
SEARCH_MAX_QUERY_LENGTH,
SEARCH_PAGE_SIZE,
} from "@/features/social/discovery-invariants";
import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";

import type { SearchableUserDto } from "@/lib/api/generated/schemas";

interface SearchUserWithId {
readonly id: string;
readonly userId: string;
readonly username: string;
readonly displayName?: unknown;
readonly avatarUrl?: unknown;
readonly isFriend: boolean;
readonly hasPendingRequest: boolean;
readonly isBlocked: boolean;
}

const FALLBACK_RESULT = Object.freeze({
items: [] as readonly SearchableUserDto[],
total: 0,
isLoading: false,
isStale: false,
error: null,
wasStale: false,
loadMore: () => undefined,
hasMore: false,
rateLimitedUntil: null,
remainingSeconds: 0,
isRateLimited: false,
});

export interface UseUserSearchResult {

readonly items: readonly SearchableUserDto[];

readonly total: number;

readonly isLoading: boolean;

readonly isStale: boolean;

readonly error: ApiError | null;

readonly wasStale: boolean;

readonly loadMore: () => void;

readonly hasMore: boolean;

readonly rateLimitedUntil: number | null;

readonly remainingSeconds: number;

readonly isRateLimited: boolean;
}

export function useUserSearch(query: string): UseUserSearchResult {

const flagValue = getFeatureFlagValue("social_user_search_live");
const isFlagPlaceholder = flagValue === "placeholder";
const isAuthenticated = !!getAuthToken();

const normalisedQuery = useMemo(() => {
return query.trim().toLowerCase().normalize("NFC");
  }, [query]);

const isQueryTooShort =
normalisedQuery.length > 0 &&
normalisedQuery.length < SEARCH_MIN_QUERY_LENGTH;
const isQueryTooLong = normalisedQuery.length > SEARCH_MAX_QUERY_LENGTH;

const [debouncedQuery, setDebouncedQuery] = useState("");
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const lastQueryRef = useRef("");

const shouldDebounce =
!isFlagPlaceholder && isAuthenticated && !isQueryTooShort && !isQueryTooLong;

useEffect(() => {

if (timerRef.current) {
clearTimeout(timerRef.current);
timerRef.current = null;
    }

if (!shouldDebounce) {
setDebouncedQuery("");
lastQueryRef.current = "";
return;
    }

if (normalisedQuery === lastQueryRef.current) {
return;
    }

timerRef.current = setTimeout(() => {
setDebouncedQuery(normalisedQuery);
lastQueryRef.current = normalisedQuery;
    }, DEBOUNCE_WINDOW_MS);

return () => {
if (timerRef.current) {
clearTimeout(timerRef.current);
timerRef.current = null;
      }
    };
  }, [normalisedQuery, shouldDebounce]);

const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
const { rateLimitedUntil, remainingSeconds, isRateLimited, onCooldownComplete } =
useSearchRateLimit(cooldownSeconds);

useEffect(() => {
const cleanup = onCooldownComplete(() => {
setCooldownSeconds(null);
    });
return cleanup;
  }, [onCooldownComplete]);

const key = useMemo<readonly unknown[] | null>(() => {
if (debouncedQuery.length === 0) return null;
return ["social", "user-search", debouncedQuery] as const;
  }, [debouncedQuery]);

const wasStaleRef = useRef(false);
const [wasStale, setWasStale] = useState(false);

const fetcher = useMemo(
() =>
async ({
page,
      }: OffsetFetcherArgs<Record<string, never>>): Promise<{
items: readonly SearchUserWithId[];
page: number;
total: number;
hasMore: boolean;
limit: number;
      }> => {
wasStaleRef.current = true;

const result = await searchUsers(debouncedQuery, {
limit: SEARCH_PAGE_SIZE,
        });

wasStaleRef.current = false;
setCooldownSeconds(result.cooldownSeconds);

return {
items: result.items.map(
(item): SearchUserWithId => ({
id: item.userId,
userId: item.userId,
username: item.username,
displayName: item.displayName,
avatarUrl: item.avatarUrl,
isFriend: item.isFriend,
hasPendingRequest: item.hasPendingRequest,
isBlocked: item.isBlocked,
            }),
          ),
page,
total: result.total,
hasMore: result.items.length >= SEARCH_PAGE_SIZE,
limit: SEARCH_PAGE_SIZE,
        };
      },
[debouncedQuery],
  );

const shouldFetch =
!isFlagPlaceholder &&
isAuthenticated &&
!isQueryTooShort &&
!isQueryTooLong &&
debouncedQuery.length > 0;

const paginated = useCursorPaginated<SearchUserWithId, Record<string, never>>({
key: key ?? [],
fetcher,
params: {},
paginationKind: "offset",
enabled: shouldFetch
  });

useEffect(() => {
if (wasStaleRef.current) {
setWasStale(true);
    } else {
setWasStale(false);
    }
  }, [paginated.isLoading, paginated.error]);

const items = paginated.items as unknown as readonly SearchableUserDto[];

if (
isFlagPlaceholder ||
!isAuthenticated ||
isQueryTooShort ||
isQueryTooLong ||
debouncedQuery.length === 0
  ) {
return FALLBACK_RESULT;
  }

return {
items,
total: items.length,
isLoading: paginated.isLoading,
isStale: paginated.isLoading,
error: paginated.error,
wasStale,
loadMore: paginated.loadMore,
hasMore: paginated.hasMore,
rateLimitedUntil,
remainingSeconds,
isRateLimited,
  };
}
