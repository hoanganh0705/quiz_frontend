"use client";

/**
 * `TrendingUserCard` — Single trending user card component.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.E2.
 *
 * ## What this component owns
 *
 * A card-per-row rendering for the trending users list. The component:
 *
 *   - Displays avatar + display name + rank number.
 *   - Shows an optional trend chip (e.g. follower delta, rank change).
 *   - Links to `/users/:userId` on click.
 *
 * ## Why a Client Component
 *
 * The analytics wrapper requires the client-side analytics context.
 */

import { type ReactElement } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type { TrendingUserResponseDto } from "@/lib/api/generated/schemas";

export interface TrendingUserCardProps {
  /**
   * The trending user data.
   */
  user: TrendingUserResponseDto;
  /**
   * The user's current rank in the trending list.
   */
  rank: number;
  /**
   * Optional trend signal showing additional context (e.g. follower delta).
   */
  trendSignal?: {
    followerDelta?: number;
    rankDelta?: number;
  };
  /** Optional CSS class override. */
  className?: string;
}

/**
 * Render a single trending user card.
 */
export function TrendingUserCard({
  user,
  rank,
  trendSignal,
  className,
}: TrendingUserCardProps): ReactElement {
  const href = `/users/${encodeURIComponent(user.userId)}`;

  const avatarSrc = typeof user.avatarUrl === "string" ? user.avatarUrl : null;

  return (
    <Link
      href={href}
      data-testid="trending-user-card"
      data-user-id={user.userId}
      data-rank={rank}
      aria-label={`View profile for ${user.username}, ranked #${rank}`}
      className={cn(
        "flex items-center gap-3 rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        className="w-6 text-center text-sm font-mono font-semibold text-muted-foreground"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>
      <Avatar>
        {avatarSrc !== null && (
          <AvatarImage src={avatarSrc} alt={`${user.username}'s avatar`} />
        )}
        <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="flex flex-col flex-1 min-w-0">
        <span className="font-medium leading-none truncate">{user.username}</span>
        {trendSignal?.followerDelta !== undefined && (
          <span className="text-xs text-muted-foreground">
            {trendSignal.followerDelta > 0 ? "+" : ""}
            {trendSignal.followerDelta} followers
          </span>
        )}
        {trendSignal?.rankDelta !== undefined && (
          <span className="text-xs text-muted-foreground">
            {trendSignal.rankDelta > 0 ? "+" : ""}
            {trendSignal.rankDelta} rank
          </span>
        )}
      </span>
    </Link>
  );
}
