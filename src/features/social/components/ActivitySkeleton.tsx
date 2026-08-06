"use client";

/**
 * `ActivitySkeleton` — Loading placeholder for the per-user
 * activity stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B3.
 *
 * ## What this component owns
 *
 * A vertical activity-item skeleton with avatar + content + meta
 * placeholder, matching the shape of the eventual
 * `UserActivityStream` page. The default row count is 10 so the
 * skeleton size matches the eventual first page length.
 *
 * `aria-busy="true"` on the root.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

const DEFAULT_ACTIVITY_ROW_COUNT = 10;

interface ActivitySkeletonProps {
  /** Number of activity row placeholders to render. Defaults to
   *  10 (the first-page length). */
  rowCount?: number;
}

export function ActivitySkeleton({
  rowCount = DEFAULT_ACTIVITY_ROW_COUNT,
}: ActivitySkeletonProps = {}): ReactElement {
  const rows = Array.from({ length: rowCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading activity stream"
      data-testid="activity-skeleton"
      data-row-count={rowCount}
      className="flex flex-col gap-3 p-4"
    >
      {rows.map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-2 rounded-md border border-border"
        >
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
