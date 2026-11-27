"use client";

import * as React from "react";

import { RefreshCw } from "lucide-react";

import {
  SearchEmptyState,
  SearchErrorState,
  SearchRateLimitState,
  SearchResultSkeleton,
} from "@/shared/ui/search";
import { cn } from "@/shared/utils/merge-class-names";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useSearch } from "@/features/search/hooks/useSearch";

import { Button } from "@/components/ui/Button";

import { SearchResultGroup } from "./SearchResultGroup";

import type {
  BaseSearchResult,
  SearchGroup,
  SearchQueryParams,
  SearchResultKind,
} from "@/features/search/types/search.types";

export interface SearchResultsProps {
  params: SearchQueryParams;

  renderItem: (item: BaseSearchResult) => React.ReactNode;

  className?: string;
}

function StaleBanner({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
      role="status"
      aria-live="polite"
    >
      <span>Results may be outdated — a new search is in progress.</span>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onRefresh}
        >
          <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
          Refresh
        </Button>
      )}
    </div>
  );
}

export function SearchResults({
  params,
  renderItem,
  className,
}: SearchResultsProps) {
  const { bootstrapState } = useAuthSession();
  const isAuthenticated = bootstrapState === "authenticated";

  const { groups, isLoading, isStale, error, state, retry, cancel } =
    useSearch(params);

  if (error) {
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

  if (isLoading && !groups) {
    return (
      <div className={cn("space-y-4", className)}>
        <SearchResultSkeleton />
      </div>
    );
  }

  if (state === "empty") {
    const hasQuery = params.q && params.q.trim().length > 0;
    return (
      <div className={className}>
        <SearchEmptyState variant={hasQuery ? "no-results" : "no-query"} />
      </div>
    );
  }

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

        return (
          <SearchResultGroup<BaseSearchResult>
            key={kind}
            group={group as SearchGroup<BaseSearchResult>}
            renderItem={renderItem}
            isAuthenticated={isAuthenticated}
          />
        );
      })}
    </div>
  );
}
