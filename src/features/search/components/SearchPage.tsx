"use client";

/**
 * `SearchPage.tsx` — Story 5.6 search surface composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.F1.
 *
 * Composes:
 *   - `<SearchInput />` (TKT-5.6.D1) — at the top for re-submission.
 *   - `<SearchResults />` (TKT-5.6.D2) — grouped results below the input.
 *   - `<SearchGuard />` (TKT-5.6.E1) — gates the entire surface.
 *   - `<SocialSearchGroup />` (TKT-6.5.F4) — social search suggestions (TKT-6.5.G4).
 *
 * ## Feature flag gating (F1 AC #2)
 *
 * When `search_live === 'placeholder'`, the page renders `null` via
 * `SearchGuard`. This is a thin wrapper — the flag check lives in the
 * guard module so flag flips are a single-file edit.
 *
 * ## Social search integration (TKT-6.5.G4)
 *
 * When `social_user_search_live === 'live'`, the `SocialSearchGroup` is
 * rendered below the main search results. This allows users to see social
 * search suggestions alongside the main search results.
 *
 * ## URL state
 *
 * The page reads `q` and `kinds` from the URL via `useSearchUrlState`.
 * The `SearchInput` at the top re-uses `useSearchUrlState` for
 * submission so both the header input and the page input stay in sync.
 *
 * ## SSR
 *
 * The page uses `useSearchParams` so it must be wrapped in `<Suspense>`
 * by the route shell.
 */

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { isSearchSurfaceEnabled } from "@/features/search/flags";
import { SearchGuard } from "@/features/search/lib/guard";
import { SearchInput } from "@/features/search/components/SearchInput";
import { SearchResults } from "@/features/search/components/SearchResults";
import { SearchEmptyState } from "@/features/search/components/shared/SearchEmptyState";
import { useSearchUrlState, URL_PARAM_QUERY, URL_PARAM_KINDS } from "@/features/search/hooks/useSearchUrlState";
import type { SearchQueryParams } from "@/features/search/types/search.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { SocialSearchGroup } from "@/features/social/discovery/SocialSearchGroup";
import { SocialSearchPlaceholder } from "@/features/social/components/SocialSearchPlaceholder";

// ─── Sub-components ──────────────────────────────────────────────────────

/**
 * Inner client component that owns URL ↔ search state binding.
 *
 * Pulled out of the default export so `useSearchParams` runs inside
 * a `<Suspense>` boundary (Next.js requirement for client components
 * that read search params on a server-prerendered route).
 */
function SearchPageInner() {
  const searchParams = useSearchParams();
  const { query: urlQuery, kinds: urlKinds, setQuery, setKinds } = useSearchUrlState();

  // TKT-6.5.G4 — read the social search feature flag.
  const socialSearchFlag = useMemo(
    () => getFeatureFlagValue("social_user_search_live"),
    [],
  );

  // Re-parse from URL on every search param change (back/forward nav).
  const params: SearchQueryParams = React.useMemo(() => {
    const q = (searchParams.get(URL_PARAM_QUERY) ?? "").trim();
    const rawKinds = searchParams.get(URL_PARAM_KINDS);
    return {
      q,
      kinds: rawKinds ? rawKinds.split(",").filter(Boolean) as SearchQueryParams["kinds"] : undefined,
    };
  }, [searchParams]);

  // Determine if we have a valid query to display results.
  const hasQuery = params.q && params.q.length >= 2;

  // Handler for the on-page search input re-submission.
  const handleSubmit = React.useCallback(
    (q: string) => {
      setQuery(q);
    },
    [setQuery],
  );

  return (
    <main
      data-testid="search-page"
      className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8"
    >
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Discover quizzes, users, tournaments, and more.
        </p>
      </header>

      {/* Search input (for re-submission from the page) */}
      <div className="w-full max-w-2xl">
        <SearchInput
          onSubmit={handleSubmit}
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
            renderItem={(item) => {
              // Render item is provided by per-kind cards in SearchResults.
              // This is a pass-through; the actual rendering is done by
              // SearchResultGroup via its renderItem prop.
              return null;
            }}
          />

          {/* TKT-6.5.G4 — Social search group (conditionally rendered) */}
          {socialSearchFlag === "placeholder" && (
            <SocialSearchPlaceholder />
          )}
          {socialSearchFlag === "live" && (
            <section
              data-testid="social-search-group"
              aria-label="Social search suggestions"
            >
              <SocialSearchGroup query={urlQuery} />
            </section>
          )}
        </div>
      ) : (
        <SearchEmptyState variant="no-query" />
      )}
    </main>
  );
}

// ─── Default export ──────────────────────────────────────────────────────

/**
 * Render the Story 5.6 search page composition.
 *
 * Honours TKT-5.6.F1:
 *
 *   - F1 AC #2 — renders nothing when `search_live === 'placeholder'`.
 *   - F1 AC #3 — reads `q` and `kinds` from URL via `useSearchUrlState`.
 *   - F1 AC #4 — renders `SearchInput` at the top and `SearchResults` below.
 *   - F1 AC #5 — renders `SearchEmptyState` (`variant: 'no-query'`) when
 *     no query is present.
 *   - F1 AC #6 — hydrates the initial search from URL on mount.
 */
export function SearchPage() {
  const isLive = isSearchSurfaceEnabled();

  if (!isLive) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
