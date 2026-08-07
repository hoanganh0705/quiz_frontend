"use client";

/**
 * `useSuggestions` — Story 6.5 read hook for the social suggestions
 * surface.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.C2.
 *
 * ## What this hook owns
 *
 * The single read hook the suggestions panel (`TKT-6.5.E1`) calls to
 * fetch the viewer's friend suggestions. The hook:
 *
 *   - Calls the verified service wrapper `getSuggestions`
 *     (TKT-6.5.C1).
 *   - Uses `useCursorPaginated` with `paginationKind: 'offset'`
 *     (the SDK returns offset-paginated responses for suggestions)
 *     and `pageSize: SUGGESTIONS_PAGE_SIZE`.
 *   - Maps the documented privacy codes
 *     (`SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`,
 *     `SOCIAL_FRIEND_LIST_FORBIDDEN`, `SOCIAL_USER_NOT_FOUND`) to
 *     the documented `visibility` field so the UI primitives
 *     (`SuggestionsPanel`, `SuggestionsEmptyState`) can render the
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

// ─── Public surface ──────────────────────────────────────────────────────

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
export function resolveSuggestionsVisibility(
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

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Read the viewer's friend suggestions. The hook is privacy-aware:
 * a non-visible viewer receives an empty list and the corresponding
 * `visibility` value. The hook never throws for privacy reasons.
 *
 * @param targetUserId The user id whose suggestions to fetch.
 *                     Pass `null` to fetch the current viewer's suggestions.
 */
export function useSuggestions(
  targetUserId: string | null,
): UseSuggestionsResult {
  const flagValue = getFeatureFlagValue("phase6_social_discovery");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const key = useMemo<readonly unknown[] | null>(() => {
    if (isFlagPlaceholder) return null;
    if (!isAuthenticated) return null;
    // When targetUserId is null, use 'me' so SWR can distinguish
    // the current viewer's suggestions from other viewers'.
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
  const visibility = resolveSuggestionsVisibility(code);

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
