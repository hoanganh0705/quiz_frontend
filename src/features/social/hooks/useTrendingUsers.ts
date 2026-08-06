"use client";

/**
 * `useTrendingUsers` — Story 6.5 read hook for the trending users
 * surface.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.C4.
 *
 * ## What this hook owns
 *
 * The single read hook the trending users page (`TKT-6.5.E2`) calls to
 * fetch the list of trending users. The hook:
 *
 *   - Calls the verified service wrapper `getTrendingUsers`
 *     (TKT-6.5.C1).
 *   - Uses `useCursorPaginated` with `paginationKind: 'offset'`
 *     (the SDK returns offset-paginated responses for trending)
 *     and `pageSize: TRENDING_PAGE_SIZE`.
 *   - Maps the documented privacy codes
 *     (`SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`,
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN`, `SOCIAL_USER_NOT_FOUND`) to
 *     the documented `visibility` field so the UI primitives
 *     (`TrendingUsersList`, `TrendingUsersEmptyState`) can render the
 *     privacy notice without branching on raw HTTP status.
 *   - Never throws for privacy reasons: a non-visible viewer
 *     receives `{ items: [], total: 0, visibility }`.
 *   - Short-circuits to the safe fallback when the feature
 *     flag is `'placeholder'` or the viewer is unauthenticated.
 *
 * ## Why a client hook
 *
 * The SWR cache is client-side. Server-rendered shells receive
 * the `SocialDiscoveryPlaceholder` (TKT-6.5.B5) until the client
 * takes over.
 *
 * ## Server authority
 *
 * The list is server-authoritative. The hook never reads from
 * local state to populate the projection; the cache is the only
 * state. The `visibility` field is computed from the server-
 * surfaced `ApiError.code`.
 */

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

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

// ─── Public surface ──────────────────────────────────────────────────────

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

// ─── Internal constants ──────────────────────────────────────────────────

/**
 * Internal shape that satisfies the `useCursorPaginated` constraint
 * `T extends { id: string }`. The `id` is derived from `userId` so
 * SWR's deduplication works correctly.
 */
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

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Read the list of trending users. The hook is privacy-aware:
 * a non-visible viewer receives an empty list and the corresponding
 * `visibility` value. The hook never throws for privacy reasons.
 */
export function useTrendingUsers(): UseTrendingUsersResult {
  const flagValue = getFeatureFlagValue("phase6_social_discovery");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  // Trending is a global surface — no per-user keying.
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

  // Privacy branches: the hook returns the safe fallback shape
  // (`{ items: [], total: 0, visibility }`); the consumer renders
  // the privacy notice instead of an error.
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

// ─── Visibility resolver ─────────────────────────────────────────────────

/**
 * Pure resolver — exposed so the spec can pin the privacy mapping
 * without mocking the hook.
 *
 * The mapping follows the documented Story 6.5 contract:
 *
 *   - `SOCIAL_USER_BLOCKED`        → `blocked_by_viewer`
 *   - `SOCIAL_BLOCKED_USER`        → `blocked_viewer`
 *   - `SOCIAL_FRIEND_LIST_FORBIDDEN` → `private`
 *   - `SOCIAL_USER_NOT_FOUND`      → `not_found`
 *   - Anything else (success + unknown codes) → `visible`
 */
export function resolveTrendingVisibility(
  code: string | undefined,
): SocialListVisibility {
  if (code === "SOCIAL_USER_BLOCKED") return "blocked_by_viewer";
  if (code === "SOCIAL_BLOCKED_USER") return "blocked_viewer";
  if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
  if (code === "SOCIAL_USER_NOT_FOUND") return "not_found";
  return "visible";
}

