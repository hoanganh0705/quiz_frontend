"use client";

/**
 * `SearchResultSkeleton` — Loading placeholder for the social discovery
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
 * A skeleton placeholder used across the social discovery and search
 * surfaces. The skeleton renders an animated list of avatar + name rows,
 * with the row count and shape varying by the `kind` prop:
 *
 *   - `suggestions` — 5 rows; a compact suggestion row shape.
 *   - `search`      — 5 rows; a compact user-search result row shape.
 *   - `trending`    — 5 rows; a numbered trending-user row shape.
 *
 * `aria-busy="true"` on the root.
 *
 * ## SSR-safety
 *
 * The component uses no `window`, `localStorage`, or other browser-only
 * API. It is safe to import from Server Components and from the App
 * Router's route modules.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_ROW_COUNT = 5;

type SearchResultSkeletonKind = "suggestions" | "search" | "trending";

interface SearchResultSkeletonProps {
  /**
   * The surface the skeleton is for. Controls the row shape.
   *
   *   - `suggestions` — compact suggestion row (avatar + text).
   *   - `search`      — compact search-result row (avatar + text).
   *   - `trending`    — numbered trending row (rank number + avatar + text).
   */
  kind: SearchResultSkeletonKind;
  /**
   * Number of row placeholders to render. Defaults to 5.
   */
  rowCount?: number;
}

function renderRow(
  kind: SearchResultSkeletonKind,
  index: number,
): ReactElement {
  if (kind === "trending") {
    return (
      <div key={index} className="flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded text-xs font-mono text-center" />
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-col gap-1 flex-1">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2 w-1/4" />
        </div>
      </div>
    );
  }
  return (
    <div key={index} className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-col gap-1 flex-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2 w-1/4" />
      </div>
    </div>
  );
}

export function SearchResultSkeleton({
  kind,
  rowCount = DEFAULT_ROW_COUNT,
}: SearchResultSkeletonProps): ReactElement {
  const rows = Array.from({ length: rowCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={`Loading ${kind} results`}
      data-testid={"search-result-skeleton-" + kind}
      data-row-count={rowCount}
      className="flex flex-col gap-3 p-4"
    >
      {rows.map((_, i) => renderRow(kind, i))}
    </div>
  );
}
