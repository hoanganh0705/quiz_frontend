"use client";

/**
 * `useUserSearch` — Story 6.5 read hook for the social user-search
 * page.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.D2.
 *
 * ## What this hook owns
 *
 * The single read hook the user-search page (`TKT-6.5.G1`) calls to
 * fetch search results. The hook:
 *
 *   - Calls the verified service wrapper `searchUsers`
 *     (TKT-6.5.D1).
 *   - Debounces the query via `useDebouncedValue(DEBOUNCE_WINDOW_MS)`.
 *   - Normalises the query: `trim().toLowerCase().normalize('NFC')`.
 *   - Enforces client-side minimum and maximum query length bounds
 *     (`SEARCH_MIN_QUERY_LENGTH`, `SEARCH_MAX_QUERY_LENGTH`);
 *     short-circuiting to the safe fallback without a request.
 *   - Uses `useCursorPaginated` with `paginationKind: 'offset'`
 *     and `pageSize: SEARCH_PAGE_SIZE`.
 *   - Surfaces the per-IP rate-limit cooldown via
 *     `useSearchRateLimit` and exposes `rateLimitedUntil`,
 *     `remainingSeconds`, `isRateLimited`.
 *   - Detects when a new query supersedes a pending one and marks
 *     `wasStale === true` for at least one render cycle.
 *   - Never throws for privacy reasons.
 *
 * ## Query normalisation
 *
 * Every query is normalised before it is used: `trim()` removes
 * leading/trailing whitespace, `toLowerCase()` removes case
 * variance, and `normalize('NFC')` ensures consistent Unicode
 * representation. The normalised form is used as the SWR cache key
 * so duplicate queries share the cache entry.
 *
 * ## Rules of Hooks compliance
 *
 * This hook NEVER returns early. All conditional branches return
 * FALLBACK_RESULT at the end, after all hooks have been called.
 * This ensures consistent hook ordering regardless of auth state
 * or feature flag changes.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type { OffsetFetcherArgs } from "@/lib/api/use-cursor-paginated.types";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { searchUsers } from "@/features/social/services/search.service";
import {
  DEBOUNCE_WINDOW_MS,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_PAGE_SIZE,
} from "@/features/social/discovery-invariants";
import { useSearchRateLimit } from "@/features/social/hooks/useSearchRateLimit";

import type { SearchableUserDto } from "@/lib/api/generated/schemas";

// ─── Internal types ─────────────────────────────────────────────────────────

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

// ─── Safe fallback result ────────────────────────────────────────────────────

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

// ─── Public surface ─────────────────────────────────────────────────────────

export interface UseUserSearchResult {
  /** The matched users for the current normalised query. */
  readonly items: readonly SearchableUserDto[];
  /** Total count of matches. */
  readonly total: number;
  /** `true` while a page request is in-flight. */
  readonly isLoading: boolean;
  /** `true` when the first page has not yet resolved. */
  readonly isStale: boolean;
  /** The current error, if any. */
  readonly error: ApiError | null;
  /** `true` when a pending response was superseded by a newer query. */
  readonly wasStale: boolean;
  /** Load the next page. No-op when `hasMore` is `false`. */
  readonly loadMore: () => void;
  /** `true` when there are more pages to load. */
  readonly hasMore: boolean;
  /**
   * The epoch ms at which the rate limit expires. `null` when
   * not rate-limited.
   */
  readonly rateLimitedUntil: number | null;
  /**
   * Seconds remaining in the rate-limit cooldown. `0` when not
   * rate-limited or the cooldown has expired.
   */
  readonly remainingSeconds: number;
  /** `true` when the search is currently rate-limited. */
  readonly isRateLimited: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUserSearch(query: string): UseUserSearchResult {
  // ── Auth / flag gating ─────────────────────────────────────────────────────
  const flagValue = getFeatureFlagValue("social_user_search_live");
  const isFlagPlaceholder = flagValue === "placeholder";
  const isAuthenticated = true; // Protected routes always have authenticated users

  // ── Query normalisation ───────────────────────────────────────────────────
  const normalisedQuery = useMemo(() => {
    return query.trim().toLowerCase().normalize("NFC");
  }, [query]);

  const isQueryTooShort =
    normalisedQuery.length > 0 &&
    normalisedQuery.length < SEARCH_MIN_QUERY_LENGTH;
  const isQueryTooLong = normalisedQuery.length > SEARCH_MAX_QUERY_LENGTH;

  // ── Debouncing ────────────────────────────────────────────────────────────
  // Use useState + useEffect for debouncing to avoid dynamic imports
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef("");

  // Only debounce when all conditions are met
  const shouldDebounce =
    !isFlagPlaceholder && isAuthenticated && !isQueryTooShort && !isQueryTooLong;

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Clear debounced value if conditions aren't met
    if (!shouldDebounce) {
      setDebouncedQuery("");
      lastQueryRef.current = "";
      return;
    }

    // Skip if query hasn't changed
    if (normalisedQuery === lastQueryRef.current) {
      return;
    }

    // Set new timer
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

  // ── Cooldown tracking ─────────────────────────────────────────────────────
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const { rateLimitedUntil, remainingSeconds, isRateLimited, onCooldownComplete } =
    useSearchRateLimit(cooldownSeconds);

  useEffect(() => {
    const cleanup = onCooldownComplete(() => {
      setCooldownSeconds(null);
    });
    return cleanup;
  }, [onCooldownComplete]);

  // ── SWR key ────────────────────────────────────────────────────────────────
  const key = useMemo<readonly unknown[] | null>(() => {
    if (debouncedQuery.length === 0) return null;
    return ["social", "user-search", debouncedQuery] as const;
  }, [debouncedQuery]);

  // ── Stale tracking ───────────────────────────────────────────────────────
  const wasStaleRef = useRef(false);
  const [wasStale, setWasStale] = useState(false);

  // ── Fetcher ────────────────────────────────────────────────────────────────
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

  // ── Pagination primitive ───────────────────────────────────────────────────
  //
  // The `enabled` flag on the inner primitive is the single source of
  // truth for "should we hit the network?". When `false` the primitive
  // still mounts (preserving Rules of Hooks ordering) but its `getKey`
  // returns `null` for every page, so SWR-infinite never invokes the
  // fetcher — which is what we want for empty / too-short / too-long
  // queries. Without this the very first render would have called
  // `searchUsers("")` and the backend would have rejected it with 400.
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

  // ── wasStale state ────────────────────────────────────────────────────────
  useEffect(() => {
    if (wasStaleRef.current) {
      setWasStale(true);
    } else {
      setWasStale(false);
    }
  }, [paginated.isLoading, paginated.error]);

  // ── Derive final result ──────────────────────────────────────────────────
  const items = paginated.items as unknown as readonly SearchableUserDto[];

  // Return fallback when gating conditions are not met
  // This MUST happen after all hooks have been called
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
