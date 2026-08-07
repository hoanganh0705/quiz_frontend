"use client";

/**
 * `FeedSkeleton` — Loading skeleton for the Story 6.9 global feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.F1.
 *
 * ## What this component owns
 *
 * The feed-specific loading skeleton. The component:
 *
 *   - Renders a configurable number of skeleton rows (default
 *     `FEED_DEFAULT_LIMIT`, 20).
 *   - Sets `aria-busy="true"` on the root so screen readers
 *     announce the loading state.
 *   - Uses the Phase 4 design-system `Skeleton` primitive (no
 *     inline shimmer CSS).
 *   - Does NOT use the existing `SocialListSkeleton`
 *     (TKT-6.2.C2) because the feed row layout differs from the
 *     list row layout (avatar + name + timestamp + content body,
 *     vs. avatar + name only).
 *
 * ## Why a Client Component
 *
 * The component is marked `"use client"` for parity with the
 * other list primitives (`SocialListSkeleton`,
 * `ActivitySkeleton`). The component is purely presentational;
 * no hooks are called.
 *
 * ## SSR-safety
 *
 * The component renders identical markup on the server and the
 * client. The `aria-busy` attribute is a static attribute.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { FEED_DEFAULT_LIMIT } from "@/features/social/feed-pagination-invariants";

export interface FeedSkeletonProps {
  /** Number of feed row placeholders to render. Defaults to
   *  `FEED_DEFAULT_LIMIT` (20) — the first-page length. */
  readonly rowCount?: number;
}

/**
 * Loading skeleton for the global feed surface.
 */
export function FeedSkeleton({
  rowCount = FEED_DEFAULT_LIMIT,
}: FeedSkeletonProps = {}): ReactElement {
  const rows = Array.from({ length: rowCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading feed"
      data-testid="feed-skeleton"
      data-row-count={rowCount}
      className="flex flex-col gap-3 p-4"
    >
      {rows.map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-2 rounded-md border border-border"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-3 w-4/12" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}