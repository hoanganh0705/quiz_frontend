"use client";

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

const RATE_LIMIT_CODES = new Set<string>([
"GLOBAL_RATE_LIMITED",
"SOCIAL_SEARCH_RATE_LIMITED",
]);

interface SocialSearchGroupProps {

query: string;
}

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

export function SocialSearchGroup({
query,
}: SocialSearchGroupProps): ReactElement {
const { groups, isLoading, error } = useSearchSuggestions(query);

const trimmedQuery = query.trim();
const isTooShort = trimmedQuery.length < SEARCH_MIN_QUERY_LENGTH;

if (isTooShort) {
return <></>;
  }

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
