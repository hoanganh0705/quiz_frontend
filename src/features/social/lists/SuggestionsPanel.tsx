"use client";

/**
 * `SuggestionsPanel` — Suggestions list page component with privacy-aware
 * rendering.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.E1.
 *
 * ## What this component owns
 *
 * The social suggestions surface. The component:
 *
 *   - Reads suggestions from `useSuggestions(targetUserId)`.
 *   - Renders privacy-aware visibility (privacy notice for blocked /
 *     not-found / forbidden viewers).
 *   - Renders loading skeleton, empty / error / stale states.
 *   - Renders offset pagination via `loadMore()`.
 *
 * ## SSR-safety
 *
 * The component uses hooks (`useSuggestions`) that read from SWR.
 * Server rendering would miss the SWR cache. Marked `"use client"`
 * to be consistent with other list components.
 */

import { type ReactElement } from "react";

import { useSuggestions } from "@/features/social/hooks/useSuggestions";

import { SearchEmptyState } from "../components/SearchEmptyState";
import { SearchErrorState } from "../components/SearchErrorState";
import { SearchResultSkeleton } from "../components/SearchResultSkeleton";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { SocialListRow } from "../components/SocialListRow";
import { BlockedContentGate } from "../components/BlockedContentGate";

import type { SocialListVisibility } from "../social-list-visibility";
import type { SocialSuggestionItemDto } from "../types";

/**
 * Maps a `SocialListVisibility` value to the appropriate
 * `PrivacyRestrictedNotice` variant. Unknown / error visibility
 * maps to the generic `not_available` variant.
 */
function toPrivacyVariant(
  visibility: SocialListVisibility,
): "not_available" | "friends_only" {
  if (visibility === "private") return "friends_only";
  return "not_available";
}

interface SuggestionsPanelProps {
  /**
   * The target user whose suggestions to show. Defaults to the
   * current viewer when omitted.
   */
  targetUserId?: string | null;
}

/**
 * Render the social suggestions panel.
 */
export function SuggestionsPanel({
  targetUserId,
}: SuggestionsPanelProps): ReactElement {
  const {
    items,
    visibility,
    isLoading,
    hasMore,
    loadMore,
    error,
    retry,
  } = useSuggestions(targetUserId ?? null);

  // Pagination footer: load more when the user clicks the button.
  const handleLoadMore = (): void => {
    loadMore();
  };

  // 1. Privacy gate: render the notice before the data hook fires.
  if (visibility !== "visible") {
    return (
      <PrivacyRestrictedNotice
        variant={toPrivacyVariant(visibility)}
        resourceKind="friends"
      />
    );
  }

  // 2. Loading state (no cached data).
  if (isLoading && items.length === 0) {
    return <SearchResultSkeleton kind="suggestions" />;
  }

  // 3. Error state (no cached data).
  if (error !== null && items.length === 0) {
    return (
      <SearchErrorState
        errorCode={(error.code as "GLOBAL_INTERNAL_ERROR") ?? "GLOBAL_INTERNAL_ERROR"}
        onRetry={retry}
      />
    );
  }

  // 4. Empty state.
  if (items.length === 0) {
    return <SearchEmptyState kind="empty-query" />;
  }

  // 5. Populated state.
  return (
    <section
      data-testid="suggestions-panel"
      aria-label="Social suggestions"
      className="flex flex-col gap-2"
    >
      <ul className="flex flex-col gap-1">
        {items.map((item: SocialSuggestionItemDto) => (
          <li key={item.id}>
            <BlockedContentGate targetUserId={item.user.userId}>
              <SocialListRow user={item.user} variant="summary" />
            </BlockedContentGate>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          data-testid="suggestions-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
          Load more
        </button>
      )}
    </section>
  );
}
