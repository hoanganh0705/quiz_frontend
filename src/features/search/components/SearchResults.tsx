"use client";

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
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

const PAGINATABLE_KINDS: Set<SearchResultKind> = new Set(["user", "tournament"]);

export interface SearchResultsProps {

params: SearchQueryParams;

renderItem: (item: SearchResultDto) => React.ReactNode;

className?: string;
}

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

export function SearchResults({
params,
renderItem,
className,
}: SearchResultsProps) {
const { bootstrapState } = useAuthSession();
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

const isPaginatable = PAGINATABLE_KINDS.has(kind);
const showLoadMore = isPaginatable;

return (

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
