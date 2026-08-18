"use client";

import { type ReactElement } from "react";

interface SearchEmptyStateProps {

kind: "empty-query" | "query-too-short" | "no-results" | "no-trending";

query?: string;
}

function buildCopy(
kind: SearchEmptyStateProps["kind"],
query: string | undefined,
): { title: string; body: string } {
switch (kind) {
case "empty-query":
return {
title: "Start typing to search",
body: "Enter at least 2 characters to search for people.",
      };
case "query-too-short":
return {
title: "Query too short",
body:
query
? `"${query}" needs at least 2 characters. Keep typing!`
: "Enter at least 2 characters to search.",
      };
case "no-results":
return {
title: "No results found",
body:
query
? `We couldn't find anyone matching "${query}". Try a different search.`
: "We couldn't find any results. Try a different search.",
      };
case "no-trending":
return {
title: "No trending users right now",
body: "Check back soon for trending users.",
      };
  }
}

export function SearchEmptyState({
kind,
query,
}: SearchEmptyStateProps): ReactElement {
const copy = buildCopy(kind, query);
return (
<div
role="status"
aria-live="polite"
data-testid="search-empty-state"
data-kind={kind}
className="flex flex-col gap-2 p-6 text-center"
    >
<p className="text-base font-semibold">{copy.title}</p>
<p className="text-sm text-muted-foreground">{copy.body}</p>
</div>
  );
}
