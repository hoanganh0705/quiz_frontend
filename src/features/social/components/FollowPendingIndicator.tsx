"use client";

/**
 * `FollowPendingIndicator` — Inline loading indicator for follow/unfollow mutations.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.E2.
 *
 * ## Purpose
 *
 * Renders a spinner with an optional label to indicate that a follow or
 * unfollow request is in-flight. A pure presentation component used by:
 *
 *   - `FollowButton` — shows "Following..." or "Unfollowing..." inline
 *                      on the CTA button during the request.
 *   - `FollowOptimisticLayer` — shows "Following..." / "Unfollowing..."
 *                               in the transient optimistic overlay.
 *   - `UnfollowConfirmDialog` — replaces the confirm button with the
 *                               spinner during the in-flight request.
 *
 * ## Props
 *
 *   - `label`  — Text shown beside the spinner. Defaults to
 *                 `"Following..."` if omitted.
 *   - `size`   — `"sm"` (small) or `"md"` (medium, default).
 */

import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";

export interface FollowPendingIndicatorProps {
  /** Label text shown beside the spinner. Defaults to `"Following..."`. */
  text?: string;
  /**
   * Visual size variant. `"sm"` renders a compact row; `"md"` (default)
   * renders a larger, more prominent row.
   */
  size?: "sm" | "md";
}

/**
 * Inline loading indicator for in-flight social mutations.
 *
 * @example
 *   // Default (medium, "Following...")
 *   <FollowPendingIndicator />
 *
 *   // Small variant with custom label
 *   <FollowPendingIndicator text="Unfollowing..." size="sm" />
 */
export function FollowPendingIndicator({
  text = "Following...",
  size = "md",
}: FollowPendingIndicatorProps) {
  return (
    <LoadingSpinner
      size={size}
      variant="secondary"
      text={text}
      aria-label={text}
    />
  );
}
