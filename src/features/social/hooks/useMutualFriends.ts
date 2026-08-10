"use client";

/**
 * `useMutualFriends` — Story 6.4 read hook for the mutual-friends
 * surface.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.C2.
 *
 * ## What this hook owns
 *
 * The single read hook the mutual-friends page
 * (`/social/users/:id/mutual-friends`, Batch F) calls to fetch
 * the viewer ↔ target mutual friends. The hook:
 *
 *   - Calls the verified service wrapper `getMutualFriends`
 *     (TKT-6.4.C1).
 *   - Uses `useCursorPaginated` with `paginationKind: 'cursor'`
 *     (the SDK emits cursor pagination for the endpoint) and
 *     `pageSize: MUTUAL_LIST_PAGE_SIZE`.
 *   - Maps the documented privacy codes
 *     (`SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`,
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN`, `SOCIAL_USER_NOT_FOUND`) to
 *     the documented `visibility` field so the UI primitives
 *     (`MutualPreview`, `MutualEmptyState`, `MutualErrorState`)
 *     can render the privacy notice without branching on raw
 *     HTTP status.
 *   - Never throws for privacy reasons: a non-visible viewer
 *     receives `{ items: [], total: 0, visibility }`.
 *   - Short-circuits to the safe placeholder when the feature
 *     flag is `'placeholder'` or the viewer is unauthenticated.
 *
 * ## Why a client hook
 *
 * The SWR cache is client-side. Server-rendered shells receive
 * the `SocialMutualsPlaceholder` (TKT-6.4.B5) until the client
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
import type { CursorFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { getMutualFriends } from "@/features/social/services/mutuals.service";
import { MUTUAL_LIST_PAGE_SIZE } from "@/features/social/mutual-count-invariants";
import type {
  SocialMutualDto,
} from "@/features/social/types";
import type {
  SocialListVisibility,
} from "@/features/social/social-list-visibility";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseMutualFriendsResult {
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

// ─── Visibility resolver ─────────────────────────────────────────────────

/**
 * Pure resolver — exposed so the spec can pin the privacy mapping
 * without mocking the hook.
 *
 * The mapping follows the documented Story 6.4 contract:
 *
 *   - `SOCIAL_USER_BLOCKED`        → `blocked_by_viewer`
 *   - `SOCIAL_BLOCKED_USER`        → `blocked_viewer`
 *   - `SOCIAL_FRIEND_LIST_FORBIDDEN` → `private`
 *   - `SOCIAL_USER_NOT_FOUND`      → `not_found`
 *   - Anything else (success + unknown codes) → `visible`
 */
export function resolveMutualVisibility(
  code: string | undefined,
): SocialListVisibility {
  if (code === "SOCIAL_USER_BLOCKED") return "blocked_by_viewer";
  if (code === "SOCIAL_BLOCKED_USER") return "blocked_viewer";
  if (code === "SOCIAL_FRIEND_LIST_FORBIDDEN") return "private";
  if (code === "SOCIAL_USER_NOT_FOUND") return "not_found";
  return "visible";
}

// ─── Internal constants ──────────────────────────────────────────────────

const EMPTY_PAGE = Object.freeze({
  items: [] as readonly SocialMutualDto[],
  nextCursor: null as string | null,
  hasNextPage: false,
  limit: 0,
});

const PLACEHOLDER_RESULT: UseMutualFriendsResult = Object.freeze({
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

const FALLBACK_RESULT: UseMutualFriendsResult = Object.freeze({
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
 * Read the viewer ↔ target mutual friends. The hook is
 * privacy-aware: a non-visible viewer receives an empty list and
 * the corresponding `visibility` value. The hook never throws
 * for privacy reasons.
 */
export function useMutualFriends(
  targetUserId: string | null,
): UseMutualFriendsResult {
  const flagValue = getFeatureFlagValue("social_mutuals_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    if (targetUserId === null) return null;
    return ["social", "mutual-friends", targetUserId] as const;
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
          const result = await getMutualFriends(targetUserId, {
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
          // documented privacy branch. We never silently absorb a
          // server error here so the privacy notice is always
          // surfaceable.
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
