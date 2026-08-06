"use client";

/**
 * `SocialCountsCard` — Social counts card with privacy-aware chip
 * hiding and revalidation indicator.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.E2.
 *
 * ## What this component owns
 *
 * The single counts card used by the Social Hub landing page
 * (`SocialHubPage`, TKT-6.3.E1) and any future per-user surface
 * that needs to display the followers / following / friends /
 * pending counts. The card:
 *
 *   - Reads counts via `useSocialCounts(targetUserId)` from
 *     Epic 6.1 / TKT-6.1.D3. **This epic does not introduce a
 *     second counts hook** — the cross-batch invariant
 *     ("Counts ownership via the Epic 6.1 `useSocialCounts`
 *     hook") is enforced by importing only from that primitive.
 *   - Hides the "Friends" chip when
 *     `useSocialListVisibility(targetUserId).canViewFriends
 *     === false`. The friends count is private (visible only to
 *     the owner and mutual friends); surfacing the chip to a
 *     non-permitted viewer would leak the relationship state
 *     (the same rationale as `SocialCountsBadge`).
 *   - Renders a subtle "Updating…" indicator while `isStale`
 *     is true (a background revalidation is in flight). The
 *     `isLoading` indicator is owned by the parent — the
 *     `SocialHubPage` renders a skeleton while the initial load
 *     is in flight rather than a card with zeros.
 *
 * ## Variants
 *
 *   - `variant: 'hub'` — the canonical Social Hub layout. The
 *     card sits at the top of the Hub with the entry tiles
 *     below. The card uses a slightly larger visual weight
 *     (`p-4` vs `p-3`).
 *   - `variant: 'badge'` — a smaller variant for surfaces that
 *     need a compact chip strip. Mirrors the Epic 6.2
 *     `SocialCountsBadge` visual vocabulary so the two
 *     components can be swapped in/out without a visual
 *     regression.
 *
 * ## Why the Friends chip is conditional
 *
 * Phase 6 Risks line 49–54: the friends list is the
 * most-leaked surface. Telling a non-permitted viewer that the
 * user has N friends is a privacy leak. The chip is hidden via
 * the same visibility hook that drives the friends list privacy
 * gate (`useSocialListVisibility`).
 *
 * ## Server authority
 *
 * The counts are server-derived. The card never reads from
 * local state; the SWR cache (via `useSocialCounts`) is the
 * only state. Pending counts (`pendingIncomingCount`,
 * `pendingOutgoingCount`) are viewer-only — they are
 * intentionally not surfaced on a per-user card.
 */

import Link from "next/link";
import { type ReactElement } from "react";

import { useSocialCounts } from "@/features/social/hooks/useSocialCounts";
import { useSocialListVisibility } from "@/features/social/hooks/useSocialListVisibility";

import type { SocialCountsDto } from "../types";

export type SocialCountsCardVariant = "hub" | "badge";

interface SocialCountsCardProps {
  /** The target user id whose counts are being shown. */
  targetUserId: string;
  /**
   * Visual variant. Defaults to `'hub'`. `'badge'` is a compact
   * variant for surfaces that need a chip strip.
   */
  variant?: SocialCountsCardVariant;
}

interface CountChipConfig {
  label: string;
  testId: string;
  getValue: (counts: SocialCountsDto) => number;
  href: (targetUserId: string) => string;
  /** Whether the chip is gated by `canViewFriends`. */
  friendsGated: boolean;
}

const CHIPS: readonly CountChipConfig[] = [
  {
    label: "Followers",
    testId: "social-counts-card-followers",
    getValue: (c) => c.followers,
    href: (id) => `/social/users/${encodeURIComponent(id)}/followers`,
    friendsGated: false,
  },
  {
    label: "Following",
    testId: "social-counts-card-following",
    getValue: (c) => c.following,
    href: (id) => `/social/users/${encodeURIComponent(id)}/following`,
    friendsGated: false,
  },
  {
    label: "Friends",
    testId: "social-counts-card-friends",
    getValue: (c) => c.friends,
    href: (id) => `/social/users/${encodeURIComponent(id)}/friends`,
    friendsGated: true,
  },
];

/**
 * Render the social counts card for a target user.
 *
 * The component returns `null` when the counts hook has no data
 * and is not loading — the page (typically the Social Hub)
 * renders its own skeleton / empty state in that case.
 */
export function SocialCountsCard({
  targetUserId,
  variant = "hub",
}: SocialCountsCardProps): ReactElement | null {
  const { counts, isLoading, isStale } = useSocialCounts(targetUserId);
  const visibility = useSocialListVisibility(targetUserId);

  // Suppress the card entirely when the hook has nothing to show
  // and is not in a loading state. The page renders its own
  // skeleton for the initial load.
  if (counts === null && !isLoading) {
    return null;
  }

  const showFriends = visibility.canViewFriends;
  const visibleChips = CHIPS.filter((c) =>
    c.friendsGated ? showFriends : true,
  );

  const containerClass =
    variant === "hub"
      ? "rounded-md border border-border p-4"
      : "rounded-full border border-border bg-background px-3 py-1 text-sm";

  return (
    <div
      data-testid="social-counts-card"
      data-variant={variant}
      data-is-stale={isStale ? "true" : "false"}
      aria-label="Social counts"
      className="flex flex-wrap items-center gap-2"
    >
      <div className={containerClass}>
        <ul className="flex flex-wrap gap-2">
          {visibleChips.map((chip) => {
            const value = counts !== null ? chip.getValue(counts) : 0;
            return (
              <li key={chip.testId}>
                <Link
                  href={chip.href(targetUserId)}
                  data-testid={chip.testId}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
                >
                  <span className="font-medium tabular-nums">{value}</span>{" "}
                  <span className="text-muted-foreground">{chip.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {isStale ? (
        <span
          data-testid="social-counts-card-stale-indicator"
          aria-label="Updating"
          className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
        >
          Updating…
        </span>
      ) : null}
    </div>
  );
}