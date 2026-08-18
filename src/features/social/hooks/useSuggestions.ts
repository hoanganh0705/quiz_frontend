"use client";

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
getSuggestions,
type SuggestionsServiceResult,
} from "@/features/social/services/discovery.service";
import {
SUGGESTIONS_PAGE_SIZE,
} from "@/features/social/discovery-invariants";
import type {
SocialSuggestionItemDto,
} from "@/features/social/types";
import type {
SocialListVisibility,
} from "@/features/social/social-list-visibility";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export interface UseSuggestionsResult {
readonly items: readonly SocialSuggestionItemDto[];
readonly total: number;
readonly visibility: SocialListVisibility;
readonly isLoading: boolean;
readonly isStale: boolean;
readonly error: ApiError | null;
readonly loadMore: () => void;
readonly hasMore: boolean;
readonly retry: () => Promise<void>;
}

export function resolveSuggestionsVisibility(
code: string | undefined,
status?: number,
): SocialListVisibility {
if (code === "SOCIAL_USER_BLOCKED") return "blocked_by_viewer";
if (code === "SOCIAL_BLOCKED_USER") return "blocked_viewer";
if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
if (code === "SOCIAL_USER_NOT_FOUND") return "not_found";
if (typeof status === "number" && status >= 500) return "not_found";
return "visible";
}

const EMPTY_PAGE = Object.freeze({
items: [] as readonly SocialSuggestionItemDto[],
page: 0,
total: 0,
hasMore: false,
limit: SUGGESTIONS_PAGE_SIZE,
});

const FALLBACK_RESULT: UseSuggestionsResult = Object.freeze({
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

export function useSuggestions(
targetUserId: string | null,
): UseSuggestionsResult {
const flagValue = getFeatureFlagValue("social_discovery_live");
const isFlagPlaceholder = flagValue === "placeholder";

const auth = useAuthSession();
const isAuthenticated = auth.isAuthenticated;

const key = useMemo<readonly unknown[] | null>(() => {
if (isFlagPlaceholder) return null;
if (!isAuthenticated) return null;

return ["social", "suggestions", targetUserId ?? "me"] as const;
  }, [isFlagPlaceholder, isAuthenticated, targetUserId]);

const fetcher = useMemo(
() =>
async ({
page,
      }: OffsetFetcherArgs<Record<string, never>>): Promise<{
items: readonly SocialSuggestionItemDto[];
page: number;
total: number;
hasMore: boolean;
limit: number;
      }> => {
if (isFlagPlaceholder || !isAuthenticated || targetUserId === null) {
return EMPTY_PAGE;
        }
try {
const result: SuggestionsServiceResult = await getSuggestions({
limit: SUGGESTIONS_PAGE_SIZE,
          });
return {
items: result.items,
page: 0,
total: result.total,
hasMore: result.items.length >= SUGGESTIONS_PAGE_SIZE,
limit: SUGGESTIONS_PAGE_SIZE,
          };
        } catch (err) {
throw err;
        }
      },
[isFlagPlaceholder, isAuthenticated, targetUserId],
  );

const result = useCursorPaginated<SocialSuggestionItemDto, Record<string, never>>({
key: key ?? [],
fetcher,
params: {},
paginationKind: "offset",
  });

if (isFlagPlaceholder) return FALLBACK_RESULT;
if (!isAuthenticated) return FALLBACK_RESULT;
if (targetUserId === null) return FALLBACK_RESULT;

const code = result.error?.code;
const status = result.error?.status;
const visibility = resolveSuggestionsVisibility(code, status);

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
