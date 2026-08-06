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
 * ## Why a client hook
 *
 * Debouncing, `AbortController` lifecycle, and the rate-limit
 * countdown are client-side concerns.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import {
  useSearchRateLimit,
  type UseSearchRateLimitResult,
} from "@/features/social/hooks/useSearchRateLimit";

import type { SearchableUserDto } from "@/lib/api/generated/schemas";

// ─── Internal constants ─────────────────────────────────────────────────

/**
 * Internal shape that satisfies the `useCursorPaginated` constraint
 * `T extends { id: string }`. The `id` is derived from `userId` so
 * SWR's deduplication works correctly.
 */
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

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

// ─── Public surface ──────────────────────────────────────────────────────

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

// ─── Safe fallback result ───────────────────────────────────────────────

const FALLBACK_RESULT: UseUserSearchResult = Object.freeze({
  items: [],
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

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * Read social user search results with debouncing, rate-limit surfacing,
 * and offset pagination.
 *
 * @param query — The raw search input string from the search bar.
 * @returns `{ items, total, isLoading, isStale, error, wasStale,
 *            loadMore, hasMore, rateLimitedUntil, remainingSeconds,
 *            isRateLimited }`.
 */
export function useUserSearch(
  query: string,
): UseUserSearchResult {
  // ── Auth / flag gating ─────────────────────────────────────────────
  const flagValue = getFeatureFlagValue("phase6_social_search");
  const isFlagPlaceholder = flagValue === "placeholder";

  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  if (isFlagPlaceholder || !isAuthenticated) {
    return FALLBACK_RESULT;
  }

  // ── Query normalisation ──────────────────────────────────────────
  // Normalise the raw query once per render so the normalised form is
  // stable across hook calls.
  const normalisedQuery = useMemo(() => {
    return query.trim().toLowerCase().normalize("NFC");
  }, [query]);

  // Short-circuit: normalised query too short or too long → safe fallback.
  if (
    normalisedQuery.length < SEARCH_MIN_QUERY_LENGTH ||
    normalisedQuery.length > SEARCH_MAX_QUERY_LENGTH
  ) {
    return FALLBACK_RESULT;
  }

  // ── Debouncing ───────────────────────────────────────────────────
  const { debouncedValue: debouncedQuery } = useMemo(() => {
    // Import the hook at call time so the mock in the spec works.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useDebouncedValue } = require("@/features/social/hooks/useDebouncedValue");
    return useDebouncedValue(normalisedQuery, DEBOUNCE_WINDOW_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SWR key ─────────────────────────────────────────────────────
  // Empty normalised query is NOT keyed — this path should be unreachable
  // due to the early-return above, but the guard keeps the type narrow.
  const key = useMemo<readonly unknown[] | null>(() => {
    if (normalisedQuery.length === 0) return null;
    return ["social", "user-search", normalisedQuery] as const;
  }, [normalisedQuery]);

  // ── Stale tracking ───────────────────────────────────────────────
  // `wasStaleRef` is a mutable ref (not state) so it can be read
  // inside the fetcher closure without triggering a re-render.
  const wasStaleRef = useRef(false);

  // ── Cooldown tracking ────────────────────────────────────────────
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const { rateLimitedUntil, remainingSeconds, isRateLimited, onCooldownComplete } =
    useSearchRateLimit(cooldownSeconds);

  // Register a revalidation callback when the cooldown expires.
  useEffect(() => {
    onCooldownComplete(() => {
      setCooldownSeconds(null);
    });
  }, [onCooldownComplete]);

  // ── Fetcher ─────────────────────────────────────────────────────
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
        // Mark previous results as stale when a new query arrives.
        wasStaleRef.current = true;

        const result = await searchUsers(debouncedQuery, {
          limit: SEARCH_PAGE_SIZE,
        });

        // Clear the stale flag now that a fresh result has arrived.
        wasStaleRef.current = false;

        // Surface the rate-limit cooldown from the service.
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

  // ── Pagination primitive ─────────────────────────────────────────
  const paginated = useCursorPaginated<SearchUserWithId, Record<string, never>>({
    key: key ?? [],
    fetcher,
    params: {},
    paginationKind: "offset",
  });

  // ── wasStale state ───────────────────────────────────────────────
  // Lift the ref to state so React re-renders when a response
  // is superseded.
  const [wasStale, setWasStale] = useState(false);
  useEffect(() => {
    if (wasStaleRef.current) {
      setWasStale(true);
    } else {
      setWasStale(false);
    }
  }, [paginated.isLoading, paginated.error]);

  // Map the internal paginated items back to the public type.
  const items = paginated.items as unknown as readonly SearchableUserDto[];

  return {
    items,
    total: paginated.items.length,
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
