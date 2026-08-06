"use client";

/**
 * `ActivityEmptyState` — Empty-state component for the Story 6.4
 * per-user activity stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  Story 6.4.
 * Source ticket: TKT-6.4.B4.
 *
 * ## What this component owns
 *
 * The empty-state copy for the activity stream. The component
 * accepts an optional `blocked` flag so the copy can acknowledge
 * the "activity is hidden because of a block" case (the privacy
 * boundary is preserved — the copy does not leak the blocked user's
 * identity, only the relationship state).
 *
 * ## Why a Client Component
 *
 * Marked `"use client"` for parity with the other activity
 * primitives. The component is purely presentational; no hooks are
 * called.
 */

import { type ReactElement } from "react";

interface ActivityEmptyStateProps {
  /**
   * When `true`, the empty state is rendered because the viewer
   * is blocked by the target user (or vice versa). The copy
   * acknowledges the relationship state without leaking the
   * blocked user's identity.
   */
  isBlocked?: boolean;
}

export function ActivityEmptyState({
  isBlocked = false,
}: ActivityEmptyStateProps = {}): ReactElement {
  const copy = isBlocked
    ? {
        title: "Activity is hidden",
        body: "Activity is hidden because of a block between you and this user.",
      }
    : {
        title: "No activity yet",
        body: "When this user is active on the platform, their activity will land here.",
      };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="activity-empty-state"
      data-blocked={isBlocked ? "true" : "false"}
      className="flex flex-col gap-2 p-6 text-center"
    >
      <p className="text-base font-semibold">{copy.title}</p>
      <p className="text-sm text-muted-foreground">{copy.body}</p>
    </div>
  );
}
