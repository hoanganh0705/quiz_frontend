"use client";

/**
 * `TrendingUsersList` — Trending users list page component with privacy-aware
 * rendering.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.E2.
 *
 * ## What this component owns
 *
 * The trending users list surface. The component:
 *
 *   - Reads trending users from `useTrendingUsers()`.
 *   - Renders privacy-aware visibility (privacy notice for blocked /
 *     not-found / forbidden viewers).
 *   - Renders loading skeleton, empty / error states.
 *   - Renders offset pagination via `loadMore()`.
 *
 * ## SSR-safety
 *
 * The component uses hooks (`useTrendingUsers`) that read from SWR.
 * Server rendering would miss the SWR cache. Marked `"use client"`
 * to be consistent with other list components.
 */

import { type ReactElement } from "react";

import { useTrendingUsers } from "@/features/social/hooks/useTrendingUsers";

import { SearchEmptyState } from "../components/SearchEmptyState";
import { SearchErrorState } from "../components/SearchErrorState";
import { SearchResultSkeleton } from "../components/SearchResultSkeleton";
import { PrivacyRestrictedNotice } from "../components/PrivacyRestrictedNotice";
import { TrendingUserCard } from "../components/TrendingUserCard";
import { BlockedContentGate } from "../components/BlockedContentGate";

import type { SocialListVisibility } from "../social-list-visibility";
import type { TrendingUserResponseDto } from "@/lib/api/generated/schemas";

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

/**
 * Render the trending users list.
 */
export function TrendingUsersList(): ReactElement {
  const { items, visibility, isLoading, hasMore, loadMore, error, retry } =
    useTrendingUsers();

  // Pagination footer: load more when the user clicks the button.
  const handleLoadMore = (): void => {
    loadMore();
  };

  // 1. Privacy gate: render the notice before the data hook fires.
  if (visibility !== "visible") {
    return (
      <PrivacyRestrictedNotice
        variant={toPrivacyVariant(visibility)}
        resourceKind="followers"
      />
    );
  }

  // 2. Loading state (no cached data).
  if (isLoading && items.length === 0) {
    return <SearchResultSkeleton kind="trending" />;
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
    return <SearchEmptyState kind="no-trending" />;
  }

  // 5. Populated state: numbered list of TrendingUserCard.
  return (
    <section
      data-testid="trending-users-list"
      aria-label="Trending users"
      className="flex flex-col gap-2"
    >
      <ol className="flex flex-col gap-1" aria-label="Trending users ranked list">
        {items.map((item: TrendingUserResponseDto, index: number) => {
          const rank = index + 1;
          return (
            <li key={item.userId}>
              <BlockedContentGate targetUserId={item.userId}>
                <TrendingUserCard user={item} rank={rank} />
              </BlockedContentGate>
            </li>
          );
        })}
      </ol>
      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          data-testid="trending-users-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
        >
          Load more
        </button>
      )}
    </section>
  );
}
