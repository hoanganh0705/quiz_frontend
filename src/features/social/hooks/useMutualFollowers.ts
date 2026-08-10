"use client";

/**
 * `useMutualFollowers` — Story 6.4 read hook for the mutual-followers
 * surface.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.C3.
 *
 * ## What this hook owns
 *
 * The single read hook the mutual-followers page
 * (`/social/users/:id/mutual-followers`, Batch F) calls to fetch
 * the viewer ↔ target mutual followers. The hook is structurally
 * identical to `useMutualFriends` (TKT-6.4.C2) — the same privacy
 * mapping, the same offset/cursor pagination, the same fallback
 * shape, the same SWR key conventions — only the endpoint and
 * the service call differ.
 *
 * The shared visibility resolver lives in
 * `@/features/social/hooks/useMutualFriends` and is re-exported
 * here for the spec.
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

// ─── Public surface ──────────────────────────────────────────────────────

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

// Re-export the shared visibility resolver so the spec can pin
// the mapping without mocking the hook.
export { resolveMutualVisibility } from "@/features/social/hooks/useMutualFriends";

// ─── Internal constants ──────────────────────────────────────────────────

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

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Read the viewer ↔ target mutual followers. The hook is
 * privacy-aware: a non-visible viewer receives an empty list and
 * the corresponding `visibility` value. The hook never throws
 * for privacy reasons.
 */
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
          // Privacy / block / 403 / 429 / 404 — rethrow; the hook
          // visibility resolver maps the error code to the
          // documented privacy branch.
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

  // Resolve the visibility through the shared resolver (no shadow
  // copy here — the resolver lives in `useMutualFriends.ts` and
  // is re-exported from there so the consumer primitives branch
  // on a single mapping).
  const code = result.error?.code;
  const visibility = resolveMutualVisibility(code);

  // Privacy branches: the hook returns the safe fallback shape
  // (`{ items: [], total: 0, visibility }`); the consumer renders
  // the privacy notice instead of an error.
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
