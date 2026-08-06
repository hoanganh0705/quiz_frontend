"use client";

/**
 * `FriendLeaderboardRow` — Single row primitive for the Friend
 * Leaderboard page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.G1.
 *
 * ## What this component owns
 *
 * The single visual vocabulary for a Friend Leaderboard row. The
 * component:
 *
 *   - Renders a `FriendLeaderboardEntryDto` (rank, avatar,
 *     username, display name, XP) as a Next.js `Link` to
 *     `/users/:userId`.
 *   - **Never** serialises `followId` / `friendshipId` into the
 *     navigation URL, the analytics payload, or any DOM
 *     attribute. The cross-batch invariant (Phase 6 Risks
 *     line 49–54) is enforced by import-only-from-this-module:
 *     the row component owns exactly one href generation site
 *     and one analytics emission site.
 *   - On tap, fires the centralised analytics wrapper with
 *     `userId` only (and the active period, which is a public
 *     URL discriminator).
 *   - Renders rank (decorative for screen readers via
 *     `aria-label` on the badge), username, display name,
 *     and XP. Rank decreases after a period reset are
 *     rendered correctly (rank may move down without
 *     animation; the badge reflects the canonical rank).
 *
 * ## Why a new row component (rather than reusing `SocialListRow`)
 *
 * The Friend Leaderboard row adds two fields `SocialListRow`
 * does not own: rank and XP. Adding the rank chip and XP
 * badge to `SocialListRow` would complicate a primitive that is
 * intentionally minimal. A focused row component is the
 * documented Epic 6.3 plan.
 *
 * ## Why a Client Component
 *
 * The analytics wrapper reads `window.analytics` and only works
 * in client components. Server rendering would lose the click →
 * analytics emission. The rendered `<Link>` markup is identical
 * on server and client; only the click handler is client-only.
 */

import Link from "next/link";
import { type ReactElement, type MouseEvent } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type { AnalyticsPeriod, FriendLeaderboardEntryDto } from "../types";
import { trackFriendLeaderboardRowTapped } from "../utils/friend-leaderboard-analytics";

export interface FriendLeaderboardRowProps {
  /** The leaderboard entry this row represents. */
  entry: FriendLeaderboardEntryDto;
  /**
   * The active analytics period. Required so the analytics
   * payload can include the period the leaderboard was loaded
   * for — `userId` + `period` are the only two fields surfaced.
   */
  period: AnalyticsPeriod;
  /**
   * Optional analytics callback fired alongside the default
   * `trackFriendLeaderboardRowTapped` emission. Useful for tests
   * that want to assert navigation side-effects without spying on
   * the analytics module.
   */
  onNavigate?: (userId: string) => void;
  /** Optional CSS class override. */
  className?: string;
}

/**
 * Render a single Friend Leaderboard row.
 *
 * The link target is always `/users/:userId`; no internal id is
 * appended as a query string or path segment.
 */
export function FriendLeaderboardRow(
  props: FriendLeaderboardRowProps,
): ReactElement {
  const { entry, period, onNavigate, className } = props;
  const href = `/users/${encodeURIComponent(entry.userId)}`;

  const handleClick = (): void => {
    trackFriendLeaderboardRowTapped({
      userId: entry.userId,
      period,
    });
    onNavigate?.(entry.userId);
  };

  return (
    <Link
      href={href}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        // Run the analytics emission synchronously on click; the
        // `<Link>` will navigate normally after.
        handleClick();
        // The click event itself is intentionally not prevented
        // — the navigation must proceed.
        void e;
      }}
      data-testid="friend-leaderboard-row"
      data-rank={entry.rank}
      data-user-id={entry.userId}
      data-period={period}
      aria-label={`View profile for ${entry.username}, rank ${entry.rank}`}
      className={cn(
        "flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        data-testid="friend-leaderboard-row-rank"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground"
        aria-hidden="true"
      >
        {entry.rank}
      </span>
      <Avatar>
        {entry.avatarUrl !== null ? (
          <AvatarImage
            src={entry.avatarUrl}
            alt={`${entry.username}'s avatar`}
          />
        ) : null}
        <AvatarFallback>
          {entry.username.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="flex flex-1 flex-col">
        <span className="font-medium leading-none">{entry.username}</span>
        {entry.displayName !== null ? (
          <span className="text-sm text-muted-foreground">
            {entry.displayName}
          </span>
        ) : null}
      </span>
      <span
        data-testid="friend-leaderboard-row-xp"
        className="text-sm font-semibold tabular-nums"
      >
        {entry.xp} XP
      </span>
    </Link>
  );
}