"use client";

/**
 * `SearchEmptyState` — Empty-state component for the social discovery
 * and user-search surfaces.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B3.
 *
 * ## What this component owns
 *
 * The empty-state copy for the social discovery and user-search surfaces.
 * The component accepts a `kind` that drives the copy and (optionally)
 * a `query` that is shown for the "no results" variants so the user
 * can see what they searched for.
 *
 * ## SSR-safety
 *
 * The component is purely presentational and uses no browser-only API.
 */

import { type ReactElement } from "react";

interface SearchEmptyStateProps {
  /**
   * The kind of empty state to render.
   *
   *   - `empty-query`      — no query entered yet; no copy is shown.
   *   - `query-too-short`  — query is shorter than the minimum length;
   *                           `query` is shown in the copy.
   *   - `no-results`        — query was valid but no results were found;
   *                           `query` is shown in the copy.
   *   - `no-trending`       — trending list is empty.
   */
  kind: "empty-query" | "query-too-short" | "no-results" | "no-trending";
  /**
   * The search query. Shown only for the `query-too-short` and
   * `no-results` variants so the user can see what they searched for.
   */
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
