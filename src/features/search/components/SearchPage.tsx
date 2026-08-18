"use client";

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

function SearchPageInner() {
const searchParams = useSearchParams();
const { query: urlQuery, kinds: urlKinds, setQuery, setKinds } = useSearchUrlState();

const socialSearchFlag = useMemo(
() => getFeatureFlagValue("social_user_search_live"),
[],
  );

const params: SearchQueryParams = React.useMemo(() => {
const q = (searchParams.get(URL_PARAM_QUERY) ?? "").trim();
const rawKinds = searchParams.get(URL_PARAM_KINDS);
return {
q,
kinds: rawKinds ? rawKinds.split(",").filter(Boolean) as SearchQueryParams["kinds"] : undefined,
    };
  }, [searchParams]);

const hasQuery = params.q && params.q.length >= 2;

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
