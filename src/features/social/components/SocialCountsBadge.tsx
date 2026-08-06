"use client";

/**
 * `SocialCountsBadge` — Cross-list counts badge for the user
 * profile header.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views.
 * Source ticket: TKT-6.2.F4.
 * Source ticket: TKT-6.2.H2 — emits a `phase6:6.2` Sentry breadcrumb
 *                on every fetch-state transition via the centralised
 *                helper.
 *
 * ## What this component owns
 *
 * A single badge that displays the followers / following / friends
 * counts for a target user. The badge:
 *
 *   - Reads counts via `useSocialCountsBadge(targetUserId)`
 *     (TKT-6.2.D3), which revalidates after a `list.loaded` event
 *     or a `relationship.changed` event from the broadcast
 *     channels.
 *
 *   - Renders a chip per count. Each chip is a link to the
 *     corresponding list route (`/social/users/:id/followers` …
 *     `/social/users/:id/friends`).
 *
 *   - Hides the "Friends" chip when
 *     `useSocialListVisibility(targetUserId).canViewFriends === false`.
 *     The friends count is private (visible only to the owner and
 *     mutual friends); surfacing the chip to a non-permitted
 *     viewer would leak the relationship state.
 *
 *   - Renders a subtle "updating" indicator while `isLoading`
 *     is true OR while `isStale` is true (revalidation in flight).
 *
 * ## Why hide the Friends chip
 *
 * Phase 6 Risks line 49–54: the friends list is the most-leaked
 * surface. Telling a non-permitted viewer that the user has N
 * friends is a privacy leak. The chip is hidden via the same
 * visibility hook that drives the friends list privacy gate.
 */

import { type ReactElement, useEffect, useRef } from "react";
import Link from "next/link";

import { useSocialCountsBadge } from "@/features/social/hooks/useSocialCountsBadge";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import { addSocialCountsBadgeBreadcrumb } from "@/lib/social/phase6_6_2_sentry";

import { type SocialCountsDto } from "../types";

interface SocialCountsBadgeProps {
  targetUserId: string;
}

interface CountChipConfig {
  label: string;
  testId: string;
  getValue: (counts: SocialCountsDto) => number;
  href: (targetUserId: string) => string;
}

const CHIPS: readonly CountChipConfig[] = [
  {
    label: "Followers",
    testId: "social-counts-badge-followers",
    getValue: (c) => c.followers,
    href: (id) => `/social/users/${encodeURIComponent(id)}/followers`,
  },
  {
    label: "Following",
    testId: "social-counts-badge-following",
    getValue: (c) => c.following,
    href: (id) => `/social/users/${encodeURIComponent(id)}/following`,
  },
  {
    label: "Friends",
    testId: "social-counts-badge-friends",
    getValue: (c) => c.friends,
    href: (id) => `/social/users/${encodeURIComponent(id)}/friends`,
  },
];

export function SocialCountsBadge({
  targetUserId,
}: SocialCountsBadgeProps): ReactElement | null {
  const { counts, isLoading, isStale } = useSocialCountsBadge(targetUserId);
  const visibility = useSocialListVisibility(targetUserId);

  // TKT-6.2.H2 — emit a single `phase6:6.2` breadcrumb per fetch
  // transition. `error` is intentionally not in the dependency
  // list: the badge does not surface errors visually (it returns
  // null), so emitting an error breadcrumb would be noisy.
  const prevFetchStateRef = useRef<"loading" | "ready">(
    counts === null && isLoading ? "loading" : "ready",
  );
  useEffect(() => {
    const next: "loading" | "ready" =
      counts === null && isLoading ? "loading" : "ready";
    if (prevFetchStateRef.current === next) return;
    prevFetchStateRef.current = next;
    addSocialCountsBadgeBreadcrumb({
      targetUserId,
      status: counts === null ? 0 : 200,
    });
  }, [counts, isLoading, targetUserId]);

  const showFriends = visibility.canViewFriends;

  if (counts === null && !isLoading) {
    return null;
  }

  const visible = CHIPS.filter((c) =>
    c.testId === "social-counts-badge-friends" ? showFriends : true,
  );

  return (
    <div
      data-testid="social-counts-badge"
      data-is-stale={isStale ? "true" : "false"}
      data-is-loading={isLoading ? "true" : "false"}
      aria-label="Social counts"
      className="flex flex-wrap gap-2"
    >
      {visible.map((chip) => {
        const value = counts !== null ? chip.getValue(counts) : 0;
        return (
          <Link
            key={chip.testId}
            href={chip.href(targetUserId)}
            data-testid={chip.testId}
            className="rounded-full border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
          >
            <span className="font-medium">{value}</span>{" "}
            <span className="text-muted-foreground">{chip.label}</span>
          </Link>
        );
      })}
      {(isLoading || isStale) && (
        <span
          data-testid="social-counts-badge-stale-indicator"
          aria-label="Updating"
          className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
        >
          Updating…
        </span>
      )}
    </div>
  );
}