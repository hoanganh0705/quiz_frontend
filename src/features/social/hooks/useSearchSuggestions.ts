"use client";

/**
 * `useSearchSuggestions` — Story 6.5 read hook for the social
 * search-suggestions group inside the global search bar.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.C3.
 *
 * ## What this hook owns
 *
 * The single read hook the global search bar's social group
 * (`TKT-6.5.F3`) calls to fetch search suggestions. The hook:
 *
 *   - Calls the verified service wrapper `getSearchSuggestions`
 *     (TKT-6.5.C1).
 *   - Debounces the query via `useDebouncedValue(DEBOUNCE_WINDOW_MS)`.
 *   - Detects when a new query supersedes a pending one and marks
 *     the previous response as stale (`wasStale === true`) for at
 *     least one render cycle.
 *   - Short-circuits to the safe empty state when the normalised
 *     query is shorter than `SEARCH_MIN_QUERY_LENGTH`.
 *   - Never returns stale groups for a superseded query.
 *
 * ## N+1 defence
 *
 * The debounce window (300ms default) is the primary N+1 defence.
 * Rapid keystrokes are coalesced into a single request per unique
 * debounced query value. The `wasStale` flag informs the consumer
 * that a superseded response arrived and should be visually discounted.
 *
 * ## Why a client hook
 *
 * Debouncing is a client-side concern. The hook is `"use client"`
 * so it can safely call `useDebouncedValue` which uses
 * `useEffect` / `setTimeout`.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";

import { getSearchSuggestions } from "@/features/social/services/discovery.service";
import {
  DEBOUNCE_WINDOW_MS,
  SEARCH_MIN_QUERY_LENGTH,
} from "@/features/social/discovery-invariants";
import {
  type SocialSearchSuggestionKind,
} from "@/features/social/discovery-discriminator";

import { useDebouncedValue } from "@/features/social/hooks/useDebouncedValue";

// ─── Public surface ──────────────────────────────────────────────────────

export interface UseSearchSuggestionsResult {
  /**
   * Groups keyed by `SocialSearchSuggestionKind`. Only groups that
   * contain at least one item are present as keys. Unknown backend
   * discriminator values are routed to the `unsupported` key.
   */
  readonly groups: Readonly<
    Partial<Record<SocialSearchSuggestionKind, readonly string[]>>
  >;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  /**
   * `true` when a pending request was superseded by a newer query.
   * The consumer can use this flag to show a stale-data notice while
   * the fresh response is loading.
   */
  readonly wasStale: boolean;
}

// ─── Safe empty state ───────────────────────────────────────────────────

const EMPTY_GROUPS: UseSearchSuggestionsResult["groups"] = Object.freeze({});

const EMPTY_RESULT: UseSearchSuggestionsResult = Object.freeze({
  groups: EMPTY_GROUPS,
  isLoading: false,
  error: null,
  wasStale: false,
});

// ─── Hook ───────────────────────────────────────────────────────────────

/**
 * Read social search suggestions for the global search bar.
 *
 * @param query — The raw search input string from the search bar.
 * @returns `{ groups, isLoading, error, wasStale }`.
 */
export function useSearchSuggestions(
  query: string,
): UseSearchSuggestionsResult {
  // Debounce the raw query so rapid keystrokes do not hammer the API.
  const { debouncedValue: debouncedQuery } = useDebouncedValue(
    query,
    DEBOUNCE_WINDOW_MS,
  );

  // Normalise the raw query: trim whitespace and lowercase.
  const normalisedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  // Short-circuit when the normalised query is too short.
  if (normalisedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
    return EMPTY_RESULT;
  }

  // Use the debounced query for the API call.
  const apiQuery = debouncedQuery.trim().toLowerCase();

  // Track the stale flag: set to true when the debounced query
  // changes while a request is in-flight, reset when a fresh
  // response arrives.
  const [wasStale, setWasStale] = useState(false);
  const [groups, setGroups] = useState<
    UseSearchSuggestionsResult["groups"]
  >(EMPTY_GROUPS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Track whether the current request is stale so the effect body
  // can distinguish a superseded request from a normal completion.
  const isStaleRef = useRef(false);

  useEffect(() => {
    // Skip when the normalised query is too short.
    if (apiQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      setGroups(EMPTY_GROUPS);
      setIsLoading(false);
      setError(null);
      setWasStale(false);
      isStaleRef.current = false;
      return;
    }

    // A new query has arrived — mark the previous response as stale.
    setWasStale(true);
    isStaleRef.current = true;
    setIsLoading(true);

    let cancelled = false;

    getSearchSuggestions(apiQuery)
      .then((result) => {
        if (cancelled) return;
        // Only apply the result if it is not stale.
        if (!isStaleRef.current) return;
        setGroups(result.groups);
        setError(null);
        setWasStale(false);
        isStaleRef.current = false;
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (!isStaleRef.current) return;
        if (err instanceof ApiError) {
          setError(err);
        } else {
          setError(
            new ApiError({
              status: 0,
              code: "GLOBAL_INTERNAL_ERROR",
              message: err instanceof Error ? err.message : "Unknown error",
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
        }
        isStaleRef.current = false;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiQuery, isStaleRef]);

  return {
    groups,
    isLoading,
    error,
    wasStale,
  };
}
