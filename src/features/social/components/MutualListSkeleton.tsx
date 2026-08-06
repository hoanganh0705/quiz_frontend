"use client";

/**
 * `MutualListSkeleton` — Loading placeholder for the
 * `MutualFriendsList` / `MutualFollowersList` vertical list pages.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B3.
 *
 * ## What this component owns
 *
 * A vertical list skeleton matching the shape of the eventual
 * `MutualFriendsList` / `MutualFollowersList` pages. The default
 * row count mirrors `MUTUAL_LIST_PAGE_SIZE` (20) so the skeleton
 * size matches the eventual list length.
 *
 * `aria-busy="true"` on the root.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { MUTUAL_LIST_PAGE_SIZE } from "@/features/social/mutual-count-invariants";

interface MutualListSkeletonProps {
  /** Number of row placeholders to render. Defaults to
   *  `MUTUAL_LIST_PAGE_SIZE` (20). */
  rowCount?: number;
}

export function MutualListSkeleton({
  rowCount = MUTUAL_LIST_PAGE_SIZE,
}: MutualListSkeletonProps = {}): ReactElement {
  const rows = Array.from({ length: rowCount });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading mutual list"
      data-testid="mutual-list-skeleton"
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
