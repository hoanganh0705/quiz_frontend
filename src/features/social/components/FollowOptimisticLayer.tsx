"use client";

/**
 * `FollowOptimisticLayer` — Transient optimistic display for in-flight mutations.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.E5.
 *
 * ## Purpose
 *
 * Renders a transient "Following..." / "Unfollowing..." indicator for the
 * duration of an in-flight follow or unfollow request. This is the display
 * surface used by `FollowButton` during optimistic updates.
 *
 * ## Transient-only invariant
 *
 * **This component is NOT authoritative.** It exists only to provide
 * immediate visual feedback during the optimistic window. It must be
 * discarded when:
 *
 *   - The server confirms the request → real state takes over.
 *   - The server rejects the request → `FollowErrorBanner` shows.
 *   - The component unmounts for any reason.
 *
 * State management is owned entirely by `useFollow` / `useUnfollow`.
 * This component only consumes `FollowPendingIndicator`.
 */

import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

export interface FollowOptimisticLayerProps {
  /**
   * The direction of the in-flight mutation.
   *
   *   - `"following"`   → shows "Following..."
   *   - `"unfollowing"` → shows "Unfollowing..."
   */
  variant: "following" | "unfollowing";
}

/**
 * Transient optimistic layer for social follow/unfollow mutations.
 *
 * **Not authoritative** — discard on server confirmation or unmount.
 *
 * @example
 *   {isPending && (
 *     <FollowOptimisticLayer variant={relationship === 'following' ? 'unfollowing' : 'following'} />
 *   )}
 */
export function FollowOptimisticLayer({
  variant,
}: FollowOptimisticLayerProps) {
  const label = variant === "following" ? "Following..." : "Unfollowing...";
  return <FollowPendingIndicator text={label} size="md" />;
}
