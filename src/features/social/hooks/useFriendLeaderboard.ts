"use client";

/**
 * `useFriendLeaderboard` — Friend leaderboard read hook with offset
 * pagination and eventual-consistency mapping.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.D3.
 *
 * ## What this hook owns
 *
 * The single read hook the `FriendLeaderboardPage` (TKT-6.3.G2)
 * calls to fetch the friend leaderboard. The hook:
 *
 *   - Calls the verified service wrapper `getFriendLeaderboard`
 *     (added to `services/social.service.ts` alongside this hook).
 *   - Uses `useCursorPaginated({ paginationKind: 'offset', ... })`
 *     from Phase 3 so the future cursor migration does not break
 *     consumers — the primitive is the same one the four Epic 6.2
 *     list pages use.
 *   - Maps the analytics frontend period (`'week' | 'month' | 'all'`)
 *     to the backend's leaderboard period
 *     (`'weekly' | 'monthly' | 'all_time'`).
 *   - Surfaces `staleness` from the first page's freshness envelope
 *     via the `useEventuallyConsistentQuery` primitive
 *     (TKT-6.3.D4). The hook uses the eventual-consistency primitive
 *     for the **first** page so the page can render the
 *     `ConsistencyNotice` from TKT-6.3.C1; subsequent pages go
 *     through the paginated primitive without per-page staleness
 *     (the freshness copy is owned by the first-page header).
 *
 * ## Privacy contract
 *
 *   - Unauthenticated viewer → safe fallback.
 *   - `social_live === 'placeholder'` → safe fallback.
 *   - Backend "no friends" → `entries: []` with `hasMore: false`
 *     (NOT an error).
 *   - `SOCIAL_FRIEND_LIST_FORBIDDEN` → `entries: []` and the typed
 *     `error` (the page renders the privacy notice variant).
 *
 * ## Why two primitives
 *
 *   - The eventual-consistency primitive (D4) gives us `staleness`
 *     for the first page so the page can render
 *     `ConsistencyNotice`. The primitive does not paginate.
 *   - The cursor-paginated primitive (Phase 3) gives us
 *     `loadMore` / `hasMore` for the second page onward.
 *
 *   The hook composes both: the first page goes through D4 (so
 *   `staleness` is accurate) and additional pages go through
 *   `useCursorPaginated` (so the pagination state is correct).
 *
 *   The two SWR caches share the same key prefix so a
 *   `revalidate()` on one invalidates the other.
 */

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

/**
 * The frontend entry type must include an `id` so it satisfies
 * `useCursorPaginated`'s `T extends { id: string }` constraint.
 * The leaderboard `rank` is unique within a period, so it is the
 * right id to use.
 */
type EntryWithId = FriendLeaderboardEntryDto & { id: string };

/**
 * Read the friend leaderboard for the given period.
 */
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

  // First-page fetcher — returns the full envelope so the eventual
  // consistency primitive can read the freshness signal.
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

  // Skip the paginated primitive entirely when gated. The hook
  // returns the safe fallback before this point in the production
  // code path, but the primitive below is still invoked because
  // hooks must be called unconditionally; we guard the fetcher
  // itself with the key check instead.
  const paginatedKey = key ?? ["social", "v1", "friend-leaderboard-disabled"];

  // Subsequent pages — go through useCursorPaginated so the future
  // cursor migration is non-breaking. The paginated fetcher is a
  // thin wrapper that calls the same service wrapper with a
  // page-sized limit. When the gate is closed, the fetcher returns
  // an empty page so the primitive does not fire a service call.
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

  // While the first page is loading, the paginated primitive has
  // not yet been called. Surface the first page's loading state and
  // empty entries so the page renders the skeleton.
  if (firstPage.isLoading && firstPage.data === null) {
    return {
      entries: [],
      isLoading: true,
      isStale: false,
      error: null,
      retry: firstPage.retry,
      hasMore: false,
      loadMore: () => undefined,
      staleness: "fresh",
    };
  }

  // Merge the first page's entries with the paginated primitive's
  // accumulated entries. The paginated primitive's `items` already
  // includes the first page (SWR-infinite semantics) when the
  // fetcher has run, so we prefer it once it has content.
  const entries = paginated.items.length > 0
    ? paginated.items
    : (firstPage.data?.entries ?? []);

  return {
    entries,
    isLoading: paginated.isLoading,
    isStale: firstPage.isStale || paginated.isLoading,
    error: firstPage.error,
    retry: firstPage.retry,
    hasMore: paginated.hasMore,
    loadMore: paginated.loadMore,
    staleness: firstPage.staleness,
  };
}