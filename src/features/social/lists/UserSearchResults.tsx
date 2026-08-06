"use client";

/**
 * `UserSearchResults` — Standalone social user-search page component.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.F3.
 *
 * ## What this component owns
 *
 * The standalone social-user-search page with:
 *
 *   - URL-owned query state (read via `useSearchUrlState`).
 *   - Debounced input via `SocialSearchInput`.
 *   - Virtualized result window via `UserSearchResultWindow`.
 *   - No-results / query-too-short states.
 *   - Error / rate-limit states.
 *   - Privacy-aware visibility.
 *
 * ## SSR-safety
 *
 * The component uses hooks (`useUserSearch`, etc.) that read from SWR.
 * Marked `"use client"` to be consistent with other list components.
 */

import { type ReactElement } from "react";

import { useUserSearch } from "@/features/social/hooks/useUserSearch";
import { SocialSearchInput } from "../components/SocialSearchInput";
import { UserSearchResultWindow } from "../components/UserSearchResultWindow";
import { SearchResultSkeleton } from "../components/SearchResultSkeleton";
import { SearchEmptyState } from "../components/SearchEmptyState";
import { SearchErrorState } from "../components/SearchErrorState";
import { SearchRateLimitNotice } from "../components/SearchRateLimitNotice";
import { SocialListRow } from "../components/SocialListRow";
import { BlockedContentGate } from "../components/BlockedContentGate";

import type { SocialUserSummaryDto } from "../types";
import type { SearchableUserDto } from "@/lib/api/generated/schemas";
import {
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
} from "../discovery-invariants";

// Rate limit error codes that trigger the rate-limit notice.
const RATE_LIMIT_CODES = new Set<string>([
  "GLOBAL_RATE_LIMITED",
  "SOCIAL_SEARCH_RATE_LIMITED",
]);

/**
 * Convert SearchableUserDto to SocialUserSummaryDto for rendering.
 */
function toSocialUserSummary(item: SearchableUserDto): SocialUserSummaryDto {
  const displayName =
    typeof item.displayName === "string"
      ? item.displayName
      : null;
  const avatarUrl =
    typeof item.avatarUrl === "string"
      ? item.avatarUrl
      : null;

  return {
    id: item.userId, // Use userId as id for rendering
    userId: item.userId,
    userName: item.username,
    displayName,
    avatarUrl,
    isPrivate: false,
    createdAt: "",
  };
}

interface UserSearchResultsProps {
  /**
   * The current search query from URL state.
   */
  query: string;
  /**
   * Callback to update the URL query state.
   */
  onQueryChange: (next: string) => void;
}

/**
 * Render the standalone social user-search page.
 */
export function UserSearchResults({
  query,
  onQueryChange,
}: UserSearchResultsProps): ReactElement {
  const {
    items,
    isLoading,
    hasMore,
    loadMore,
    error,
    remainingSeconds,
    rateLimitedUntil,
  } = useUserSearch(query);

  const trimmedQuery = query.trim();
  const isTooShort = trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH;
  const isTooLong = trimmedQuery.length > SEARCH_MAX_QUERY_LENGTH;

  // Determine cooldown in seconds
  const cooldownSeconds =
    rateLimitedUntil !== null
      ? Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000))
      : null;

  // 1. Rate-limit state: special notice, no results rendered.
  if (error !== null && RATE_LIMIT_CODES.has(error.code as string)) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <SearchRateLimitNotice
          cooldownSeconds={cooldownSeconds}
          surface="social-search-page"
        />
      </div>
    );
  }

  // 2. Below minimum query length.
  if (isTooShort) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <SearchEmptyState kind="query-too-short" query={query} />
      </div>
    );
  }

  // 3. Above maximum query length.
  if (isTooLong) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <SearchEmptyState kind="no-results" query={query} />
      </div>
    );
  }

  // 4. Loading state (no cached data).
  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <SearchResultSkeleton kind="search" />
      </div>
    );
  }

  // 5. Error state.
  if (error !== null && items.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <SearchErrorState
          errorCode={(error.code as "GLOBAL_INTERNAL_ERROR") ?? "GLOBAL_INTERNAL_ERROR"}
        />
      </div>
    );
  }

  // 6. Empty results.
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <SearchEmptyState kind="no-results" query={query} />
      </div>
    );
  }

  // 7. Populated state: virtualized list with pagination.
  const renderRow = ({ user, index }: { user: SocialUserSummaryDto; index: number }) => (
    <BlockedContentGate targetUserId={user.userId}>
      <SocialListRow user={user} variant="summary" />
    </BlockedContentGate>
  );

  // Convert SearchableUserDto[] to SocialUserSummaryDto[] for UserSearchResultWindow
  const socialItems: readonly SocialUserSummaryDto[] = items.map(toSocialUserSummary);

  return (
    <div className="flex flex-col gap-4 p-4">
      <section
        data-testid="user-search-results"
        aria-label="Search results"
        className="flex flex-col gap-2"
      >
        <UserSearchResultWindow items={socialItems} row={renderRow} />
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            data-testid="user-search-load-more"
            className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
          >
            Load more
          </button>
        )}
      </section>
    </div>
  );
}
