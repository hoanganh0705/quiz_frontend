"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  ApiError,
  useCursorPaginated,
  type CursorFetcher,
  type CursorPage,
  type UseCursorPaginatedResult,
} from "@/lib/api";


import { getFeed } from "@/features/social/services/feed.service";
import type { SocialFeedItemDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";
import { SOCIAL_CACHE_KEYS } from "@/features/social/types/relationship";
import {
  decodeRateLimit,
  isRateLimitErrorCode,
} from "@/features/social/rate-limit-decoder";
import type { ConsistencyStaleness } from "@/features/social/components/ConsistencyNotice";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

export const FEED_PAGE_SIZE = 20;

export function resolveFeedVisibility(
  code: string | undefined,
): SocialListVisibility {
  if (code === "USER_PROFILE_PRIVATE") return "private";
  if (code === "SOCIAL_USER_BLOCKED") return "blocked_viewer";
  if (code === "SOCIAL_BLOCKED_USER") return "blocked_by_viewer";
  if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
  return "visible";
}

export interface UseFeedResult {
  readonly items: readonly SocialFeedItemDto[];
  readonly hasMore: boolean;
  readonly loadMore: () => void;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: ApiError | null;
  readonly refresh: () => Promise<void>;
  readonly staleness: ConsistencyStaleness;
  readonly visibility: SocialListVisibility;

  readonly rateLimitedUntil: number | null;

  readonly cooldownSeconds?: number;
}

const UNAUTHENTICATED_RESULT: UseFeedResult = Object.freeze({
  items: [],
  hasMore: false,
  loadMore: () => undefined,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  refresh: () => Promise.resolve(),
  staleness: "fresh",
  visibility: "not_found",
  rateLimitedUntil: null,
  cooldownSeconds: undefined,
});

const AUTH_STATE_EVENT = "auth-state-change";

export function useFeed(viewerUserId: string | null): UseFeedResult {
    const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!isAuthenticated) return null;
    if (viewerUserId === null) return null;
    return SOCIAL_CACHE_KEYS.makeFeedKey(viewerUserId);
  }, [isAuthenticated, viewerUserId]);

  const fetcher = useMemo<
    CursorFetcher<SocialFeedItemDto, { readonly limit: number }>
  >(
    () =>
      async ({ cursor, params, signal }) => {
        if (!isAuthenticated || viewerUserId === null) {
          return {
            items: [] as readonly SocialFeedItemDto[],
            nextCursor: null,
            hasNextPage: false,
            limit: params.limit,
          };
        }
        const result = await getFeed({
          ...(cursor ? { cursor } : {}),
          limit: params.limit,
        });
        return {
          items: result.items,
          nextCursor: result.nextCursor,
          hasNextPage: result.hasMore,
          limit: params.limit,
        };
      },
    [isAuthenticated, viewerUserId],
  );

  const paginated: UseCursorPaginatedResult<SocialFeedItemDto> =
    useCursorPaginated<SocialFeedItemDto, { readonly limit: number }>({
      key: key ?? [],
      fetcher,
      params: { limit: FEED_PAGE_SIZE },
      paginationKind: "cursor",
    });

  const code = paginated.error?.code;
  const visibility = resolveFeedVisibility(code);

  const cooldownSeconds = useMemo<number | null>(() => {
    if (paginated.error === null) return null;
    if (!isRateLimitErrorCode(paginated.error.code)) return null;
    const { cooldownSeconds: decoded } = decodeRateLimit(paginated.error);
    if (decoded === null || decoded <= 0) return null;
    return decoded;
  }, [paginated.error]);

  const [rateLimitAnchorMs, setRateLimitAnchorMs] = useState<number | null>(
    null,
  );
  useEffect(() => {
    setRateLimitAnchorMs(cooldownSeconds === null ? null : Date.now());
  }, [cooldownSeconds]);

  const rateLimitedUntil: number | null =
    cooldownSeconds !== null && rateLimitAnchorMs !== null
      ? rateLimitAnchorMs + cooldownSeconds * 1000
      : null;

  const staleness: ConsistencyStaleness =
    paginated.isLoading && paginated.items.length > 0 ? "stale" : "fresh";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthStateChange = () => {
      getQueryClient().removeQueries({
        predicate: (query) => {
          const cacheKey = query.queryKey;
          return (
            Array.isArray(cacheKey) &&
            cacheKey[0] === "social" &&
            cacheKey[1] === "v1" &&
            cacheKey[2] === "feed"
          );
        },
      });
    };
    window.addEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    };
  }, []);

  const refresh = useCallback(async () => {
    await paginated.refresh();
  }, [paginated]);

  if (!isAuthenticated) return UNAUTHENTICATED_RESULT;
  if (viewerUserId === null) return UNAUTHENTICATED_RESULT;

  const items = visibility !== "visible" ? [] : paginated.items;
  const error =
    visibility !== "visible" && paginated.error !== null
      ? null
      : paginated.error;

  return {
    items,
    hasMore: paginated.hasMore,
    loadMore: paginated.loadMore,
    isLoading: paginated.isLoading,
    isLoadingMore: paginated.isLoadingMore,
    error,
    refresh,
    staleness,
    visibility,
    rateLimitedUntil,
    cooldownSeconds: cooldownSeconds !== null ? cooldownSeconds : undefined,
  };
}
