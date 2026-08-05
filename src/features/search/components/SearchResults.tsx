"use client";

/**
 * `SearchResults.tsx` — composed results container for the search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.D2.
 *
 * ## What this component owns
 *
 * - Renders grouped search results by consuming `useSearch`.
 * - Renders `SearchResultSkeleton` while `isLoading && !groups`.
 * - Preserves previous `groups` when `isLoading && groups` (revalidation).
 * - Skips empty groups (no header rendered for groups with zero items).
 * - Shows `SearchEmptyState` when groups are empty and no error.
 * - Shows `SearchErrorState` for typed errors.
 * - Shows `SearchRateLimitState` for `SEARCH_RATE_LIMITED`.
 * - Shows a stale-result label when `isStale` is true.
 * - Provides a load-more affordance for unbounded groups (users, tournaments).
 *
 * ## What this component does NOT own
 *
 * - The `SearchInput` (mounted separately by `GlobalSearch`).
 * - Feature flag gating (checked by the parent page).
 * - Individual card rendering (delegated to `SearchResultGroup` via `renderItem`).
 *
 * ## SSR
 *
 * This is a client component (uses auth context, hook, router).
 * Components that wrap this must provide a `<Suspense>` boundary.
 */

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import {
  SearchResultSkeleton,
  SearchEmptyState,
  SearchErrorState,
  SearchRateLimitState,
} from "./shared";

import { SearchResultGroup } from "./SearchResultGroup";
import type {
  SearchGroup,
  SearchResultKind,
  SearchResultDto,
  SearchQueryParams,
} from "@/features/search/types/search.types";
import { useSearch } from "@/features/search/hooks/useSearch";
import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Result kinds that support pagination (unbounded groups).
 * These groups render a "load more" button instead of showing all items.
 */
const PAGINATABLE_KINDS: Set<SearchResultKind> = new Set(["user", "tournament"]);

// ─── Public types ─────────────────────────────────────────────────────────

export interface SearchResultsProps {
  /** Search query parameters. */
  params: SearchQueryParams;
  /**
   * Render function for each result kind's items.
   * Receives the flattened item (one of the discriminated union members).
   */
  renderItem: (item: SearchResultDto) => React.ReactNode;
  /** Additional class names to apply to the root container. */
  className?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────

/** Stale-result label shown when a newer query has started fetching. */
function StaleBanner({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
      role="status"
      aria-live="polite"
    >
      <span>Results may be outdated — a new search is in progress.</span>
      {onRefresh && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRefresh}>
          <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
          Refresh
        </Button>
      )}
    </div>
  );
}

/** "Load more" button for a paginatable group. */
function LoadMoreButton({
  kind,
  onClick,
  isLoading,
}: {
  kind: SearchResultKind;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? "Loading…" : `Load more ${kind}s`}
    </Button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────

export function SearchResults({
  params,
  renderItem,
  className,
}: SearchResultsProps) {
  const { bootstrapState } = useAuthBootstrap();
  const isAuthenticated = bootstrapState === "authenticated";

  const {
    groups,
    isLoading,
    isStale,
    error,
    state,
    retry,
    cancel,
  } = useSearch(params);

  // ── Error + rate-limit ────────────────────────────────────────────────
  if (error) {
    // Check the error code via the public `code` getter.
    // TypeScript doesn't know that `SEARCH_RATE_LIMITED` is in `ErrorCode`
    // (it's not yet mirrored in the global registry), so we use a
    // type assertion for the comparison.
    const isRateLimited = error.code === ("SEARCH_RATE_LIMITED" as string);

    if (isRateLimited) {
      return (
        <div className={className}>
          <SearchRateLimitState onRetry={retry} />
        </div>
      );
    }

    return (
      <div className={className}>
        <SearchErrorState error={error} onRetry={retry} />
      </div>
    );
  }

  // ── Initial loading (no cached data) ────────────────────────────────
  if (isLoading && !groups) {
    return (
      <div className={cn("space-y-4", className)}>
        <SearchResultSkeleton />
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────
  if (state === "empty") {
    // Only show "no results" if there was actually a query.
    const hasQuery = params.q && params.q.trim().length > 0;
    return (
      <div className={className}>
        <SearchEmptyState variant={hasQuery ? "no-results" : "no-query"} />
      </div>
    );
  }

  // ── Normal render ──────────────────────────────────────────────────
  if (!groups) return null;

  const presentKinds = Object.keys(groups) as SearchResultKind[];
  if (presentKinds.length === 0) {
    return (
      <div className={className}>
        <SearchEmptyState variant="no-results" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stale banner */}
      {isStale && (
        <StaleBanner
          onRefresh={async () => {
            cancel();
            await retry();
          }}
        />
      )}

      {/* Loading overlay (revalidation — skeleton rows on top) */}
      {isLoading && (
        <div aria-busy="true" aria-label="Updating results">
          <SearchResultSkeleton count={2} />
        </div>
      )}

      {/* Result groups */}
      {presentKinds.map((kind) => {
        const group = groups[kind];
        if (!group || group.items.length === 0) return null;

        const isPaginatable = PAGINATABLE_KINDS.has(kind);
        const showLoadMore = isPaginatable; // pagination is future work

        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <SearchResultGroup<any>
            key={kind}
            group={group as any}
            renderItem={renderItem as any}
            isAuthenticated={isAuthenticated}
            footer={
              showLoadMore ? (
                <LoadMoreButton kind={kind} isLoading={false} />
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
