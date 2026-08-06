"use client";

/**
 * `FriendRequestSkeleton` — Shared loading skeleton for both list
 * pages.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E8.
 *
 * ## What this component owns
 *
 * A configurable-row-count shimmer placeholder rendered by both
 * `IncomingRequestsListPage` and `OutgoingRequestsListPage` while
 * their initial loads are in flight. Mirrors the `FriendRequestItem`
 * layout (avatar circle + name placeholder + action placeholder)
 * so the page does not visually jump when the real rows appear.
 */

import { type ReactElement } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

export interface FriendRequestSkeletonProps {
  /**
   * Number of skeleton rows to render. Defaults to 5.
   */
  readonly count?: number;
}

/**
 * Skeleton placeholder for both friend-request list pages.
 */
export function FriendRequestSkeleton({
  count = 5,
}: FriendRequestSkeletonProps = {}): ReactElement {
  const rows = Array.from({ length: count });
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading friend requests"
      data-testid="friend-request-skeleton"
      data-row-count={count}
      className="flex flex-col gap-2 p-4"
    >
      {rows.map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
