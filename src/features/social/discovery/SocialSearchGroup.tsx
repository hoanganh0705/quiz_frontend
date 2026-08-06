"use client";

/**
 * `SocialSearchGroup` — Social search suggestions group inside the global search bar.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.F4.
 *
 * ## What this component owns
 *
 * The social group inside the global search bar, rendering grouped
 * search suggestions by kind:
 *
 *   - `user` → user profile link.
 *   - `quiz` → quiz link.
 *   - `tag` → tag search link.
 *   - `group` → group link.
 *   - `unsupported` → defensive fallback with `DEFENSIVE_FALLBACK_TESTID`.
 *
 * ## SSR-safety
 *
 * The component uses hooks (`useSearchSuggestions`) that read from SWR.
 * Marked `"use client"` to be consistent with other search components.
 */

import { type ReactElement } from "react";
import Link from "next/link";

import { useSearchSuggestions } from "@/features/social/hooks/useSearchSuggestions";
import { SearchEmptyState } from "../components/SearchEmptyState";
import { SearchErrorState } from "../components/SearchErrorState";
import { SearchResultSkeleton } from "../components/SearchResultSkeleton";
import { SearchRateLimitNotice } from "../components/SearchRateLimitNotice";

import {
  type SocialSearchSuggestionKind,
  DEFENSIVE_FALLBACK_TESTID,
} from "../discovery-discriminator";
import { SEARCH_MIN_QUERY_LENGTH } from "../discovery-invariants";

// Rate limit error codes that trigger the rate-limit notice.
const RATE_LIMIT_CODES = new Set<string>([
  "GLOBAL_RATE_LIMITED",
  "SOCIAL_SEARCH_RATE_LIMITED",
]);

interface SocialSearchGroupProps {
  /**
   * The search query (already URL-owned via the global search bar).
   */
  query: string;
}

/**
 * Maps each suggestion kind to its display label.
 */
function getKindLabel(kind: SocialSearchSuggestionKind): string {
  switch (kind) {
    case "user":
      return "People";
    case "quiz":
      return "Quizzes";
    case "tag":
      return "Tags";
    case "group":
      return "Groups";
    case "unsupported":
      return "Results";
    default:
      return "Results";
  }
}

/**
 * Render the social search suggestions group inside the global search bar.
 */
export function SocialSearchGroup({
  query,
}: SocialSearchGroupProps): ReactElement {
  const { groups, isLoading, error } = useSearchSuggestions(query);

  const trimmedQuery = query.trim();
  const isTooShort = trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH;

  // Below-minimum query: render nothing.
  if (isTooShort) {
    return <></>;
  }

  // Rate-limit: special notice.
  const errorCode = error?.code ?? "";
  if (RATE_LIMIT_CODES.has(errorCode)) {
    return (
      <div
        data-testid="social-search-group"
        data-mode="rate-limit"
      >
        <SearchRateLimitNotice
          cooldownSeconds={null}
          surface="global-search-bar"
        />
      </div>
    );
  }

  // Loading state.
  if (isLoading) {
    return (
      <div
        data-testid="social-search-group"
        data-mode="loading"
      >
        <SearchResultSkeleton kind="suggestions" />
      </div>
    );
  }

  // Error state.
  if (error !== null) {
    return (
      <div
        data-testid="social-search-group"
        data-mode="error"
      >
        <SearchErrorState
          errorCode={(error.code as "GLOBAL_INTERNAL_ERROR") ?? "GLOBAL_INTERNAL_ERROR"}
        />
      </div>
    );
  }

  // No groups: empty state.
  const hasGroups = Object.values(groups).some(
    (group) => group !== undefined && group.length > 0,
  );
  if (!hasGroups) {
    return (
      <div
        data-testid="social-search-group"
        data-mode="empty"
      >
        <SearchEmptyState kind="empty-query" />
      </div>
    );
  }

  // Render grouped suggestions.
  return (
    <div
      data-testid="social-search-group"
      data-mode="results"
      className="flex flex-col gap-3"
    >
      {(Object.entries(groups) as [SocialSearchSuggestionKind, readonly string[]][]).map(
        ([kind, items]) => {
          if (items.length === 0) return null;

          if (kind === "unsupported") {
            // Defensive fallback for unknown discriminator values.
            return (
              <div key={kind} data-testid={DEFENSIVE_FALLBACK_TESTID}>
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                  {getKindLabel(kind)}
                </p>
                <ul className="flex flex-col">
                  {items.map((item, index) => (
                    <li key={`${item}-${index}`} className="px-3 py-2 text-sm text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <div key={kind}>
              <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {getKindLabel(kind)}
              </p>
              <ul className="flex flex-col">
                {items.map((item, index) => {
                  // For user items, render as profile links.
                  if (kind === "user") {
                    return (
                      <li key={`${item}-${index}`}>
                        <Link
                          href={`/users/${encodeURIComponent(item)}`}
                          className="block px-3 py-2 text-sm hover:bg-accent"
                          data-testid={`social-search-group-${kind}-item`}
                        >
                          {item}
                        </Link>
                      </li>
                    );
                  }

                  // For other kinds, render as search links.
                  return (
                    <li key={`${item}-${index}`}>
                      <Link
                        href={`/search?q=${encodeURIComponent(item)}`}
                        className="block px-3 py-2 text-sm hover:bg-accent"
                        data-testid={`social-search-group-${kind}-item`}
                      >
                        {item}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        },
      )}
    </div>
  );
}
