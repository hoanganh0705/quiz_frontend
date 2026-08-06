"use client";

/**
 * `SocialListSkeleton` — Loading placeholder for the four list pages.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.C2.
 *
 * ## What this component owns
 *
 * A configurable-row-count shimmer placeholder rendered by every
 * list page while its initial load is in flight. The component:
 *
 *   - Defaults to `SOCIAL_GRAPH_PAGINATION_INVARIANTS.defaultLimit`
 *     (20) rows.
 *   - Accepts an explicit `rowCount` prop that overrides the
 *     default.
 *   - Sets `aria-busy="true"` on the root so screen readers
 *     announce the loading state.
 *   - Uses the Phase 4 design-system `Skeleton` primitive (a single
 *     rounded `div` with a pulse animation).
 *
 * ## Why this exists
 *
 * The cross-batch invariant for Story 6.2 is "Consistent list UX":
 * every list surface must show the same loading / empty / error /
 * placeholder vocabulary. Centralising the skeleton here ensures
 * the loading state stays in sync with the eventual live list page
 * in Batch E / F.
 *
 * ## Accessibility
 *
 * The root element is `aria-busy="true"`. There is no separate
 * `<output>` or live-region markup because the actual list rows
 * will replace the skeleton once loaded; the busy attribute is the
 * correct aria affordance for a "loading then content" pattern.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { SOCIAL_GRAPH_DEFAULT_LIMIT } from "../pagination-invariants";

interface SocialListSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to
   * `SOCIAL_GRAPH_DEFAULT_LIMIT` (20).
   */
  rowCount?: number;
}

/**
 * Skeleton placeholder for a list page.
 */
export function SocialListSkeleton({
  rowCount = SOCIAL_GRAPH_DEFAULT_LIMIT,
}: SocialListSkeletonProps = {}): ReactElement {
  const rows = Array.from({ length: rowCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading list"
      data-testid="social-list-skeleton"
      data-row-count={rowCount}
      className="flex flex-col gap-2 p-4"
    >
      {rows.map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}