"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { SearchEmptyState, SearchResultSkeleton } from "@/shared/ui/search";

import { SearchInput } from "@/features/search/components/SearchInput";
import { SearchResultRow } from "@/features/search/components/SearchResultRow";
import { SearchResults } from "@/features/search/components/SearchResults";
import { useSearchHistory } from "@/features/search/hooks/useSearchHistory";
import {
  URL_PARAM_KINDS,
  URL_PARAM_QUERY,
  useSearchUrlState,
} from "@/features/search/hooks/useSearchUrlState";
import { SocialSearchGroup } from "@/features/social/discovery/SocialSearchGroup";

import type { SearchQueryParams } from "@/features/search/types/search.types";

function SearchPageInner() {
  const searchParams = useSearchParams();
  const { query: urlQuery, setQuery, reset } = useSearchUrlState();
  const { push: pushSearchHistory } = useSearchHistory();
  const [draftQuery, setDraftQuery] = React.useState<string>(urlQuery);

  React.useEffect(() => {
    setDraftQuery(urlQuery);
  }, [urlQuery]);

  const params: SearchQueryParams = React.useMemo(() => {
    const q = (searchParams.get(URL_PARAM_QUERY) ?? "").trim();
    const rawKinds = searchParams.get(URL_PARAM_KINDS);
    return {
      q,
      kinds: rawKinds
        ? (rawKinds.split(",").filter(Boolean) as SearchQueryParams["kinds"])
        : undefined,
    };
  }, [searchParams]);

  const hasQuery = params.q && params.q.length >= 2;

  const handleSubmit = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setQuery(trimmed);
      if (trimmed.length >= 2) {
        pushSearchHistory(trimmed);
      }
    },
    [setQuery, pushSearchHistory],
  );

  const handleClear = React.useCallback(() => {
    setDraftQuery("");
    reset();
  }, [reset]);

  return (
    <main
      data-testid="search-page"
      className={`${PAGE_CONTAINER_CLASS} space-y-6`}
    >
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Search
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Discover quizzes, users, tournaments, and more.
        </p>
      </header>

      {/* Search input (for re-submission from the page) */}
      <div className="w-full max-w-2xl">
        <SearchInput
          value={draftQuery}
          onChange={setDraftQuery}
          onSubmit={handleSubmit}
          onClear={handleClear}
          placeholder="Search quizzes, users, tournaments…"
          className="w-full"
        />
      </div>

      {/* Results or empty state */}
      {hasQuery ? (
        <div className="flex flex-col gap-6">
          {/* Main search results */}
          <SearchResults
            params={params}
            renderItem={(item) => <SearchResultRow item={item} />}
          />

          {/* Social search group */}
          <section aria-label="Social search suggestions">
            <SocialSearchGroup query={urlQuery} />
          </section>
        </div>
      ) : (
        <SearchEmptyState variant="no-query" />
      )}
    </main>
  );
}

function SearchPageFallback() {
  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      aria-busy="true"
      aria-label="Loading search"
    >
      <SearchResultSkeleton />
    </div>
  );
}

export function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageInner />
    </Suspense>
  );
}
