"use client";

/**
 * `CompetitionStats` — live card showing the current viewer's
 * ranking profile.
 *
 * All metrics are derived from the live API:
 *
 *   - Active participants: `useLeaderboardSummary().totalParticipants`
 *   - Your Rank: `useMyRanking().global.weekly.rank`
 *   - Your XP: `useMyRanking().global.weekly.xp`
 *   - XP to next rank: `useMyRanking().global.weekly.xpToNextRank`
 *   - Next-rank XP: `useMyRanking().global.weekly.nextRankXp`
 *   - Badges: `useMyRanking().badges`
 *
 * When the viewer is anonymous, the card renders a graceful "sign in
 * to see your ranking" message instead of fake numbers.
 *
 * ## Why this lives in the leaderboard feature
 *
 * The card is part of the `/leaderboard` page chrome. It is a
 * pure projection of the live ranking hooks — no extra fetches.
 */

import { memo } from "react";
import { Card } from "@/components/ui/Card";
import { CardContent } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { CardTitle } from "@/components/ui/Card";
import { CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Medal, Trophy, Users, Link2 } from "lucide-react";

import {
  getWeeklyPosition,
  getBadges,
} from "@/features/leaderboard/hooks/useMyRanking";
import { useMyRanking } from "@/features/leaderboard/hooks/useMyRanking";
import { useLeaderboardSummary } from "@/features/leaderboard/hooks/useLeaderboardSummary";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

export const CompetitionStats = memo(function CompetitionStats() {
  const { data: myRanking, isAuthenticated } = useMyRanking();
  const { totalParticipants } = useLeaderboardSummary("weekly");

  const weekly = getWeeklyPosition(myRanking);
  const badges = getBadges(myRanking);

  if (!isAuthenticated) {
    return (
      <Card className="col-span-1 p-5 sm:p-6 bg-card/80 border-border/70 rounded-2xl shadow-xs backdrop-blur-xs">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-foreground text-lg sm:text-xl font-bold">
            <h2>Competition Stats</h2>
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Sign in to see your ranking and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-2 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              {totalParticipants !== null
                ? `${totalParticipants.toLocaleString()} active participants this week`
                : "Active participants loading…"}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const xp = weekly?.xp ?? 0;
  const xpToNext = weekly?.xpToNextRank ?? null;
  const nextRankXp = weekly?.nextRankXp ?? null;
  const rank = weekly?.rank ?? null;

  // Progress toward the next rank, expressed as a percentage of the
  // gap between the current XP and the next-rank XP. The backend
  // already returns `xpToNextRank` (the absolute XP delta), so we
  // fall back to the next-rank XP when the delta is missing.
  const progressPercent =
    nextRankXp !== null && nextRankXp > 0
      ? Math.min(100, Math.max(0, Math.round((xp / nextRankXp) * 100)))
      : 0;

  const activeUserLabel = badges?.isActive
    ? "Active player"
    : badges?.isNew
      ? "New player (≤ 7 days)"
      : badges?.isRisingStar
        ? "Rising star"
        : "Inactive";

  return (
    <Card className="col-span-1 p-5 sm:p-6 bg-card/80 border-border/70 rounded-2xl shadow-xs backdrop-blur-xs flex flex-col justify-between">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-foreground text-lg sm:text-xl font-bold">
          <h2>Competition Stats</h2>
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Current season statistics and your ranking
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-2 space-y-4 sm:space-y-5">
        {/* Active Participants */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Active Participants
          </span>
          <span className="text-foreground font-bold font-mono tabular-nums">
            {totalParticipants !== null
              ? totalParticipants.toLocaleString()
              : "—"}
          </span>
        </div>

        {/* Top Badge */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <div className="flex items-center gap-1.5">
            <Medal
              size={15}
              className="text-amber-500"
              aria-hidden="true"
            />
            <span className="text-foreground font-medium text-xs sm:text-sm">
              {activeUserLabel}
            </span>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Your Rank */}
          <div className="flex items-center bg-muted/40 border border-border/60 flex-col w-full p-4 rounded-xl gap-2.5">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="text-muted-foreground text-xs font-medium">Your Rank</span>
              </div>
              <Badge
                className={`text-xs font-mono font-bold tabular-nums px-2.5 py-0.5 ${rank !== null ? getRankColor(rank) : ""}`}
              >
                {rank !== null ? `#${rank}` : "—"}
              </Badge>
            </div>

            {/* Progress Info */}
            <div className="flex flex-row justify-between text-xs text-muted-foreground w-full font-mono tabular-nums">
              <span>Next Level</span>
              <span className="text-foreground">
                {xpToNext !== null
                  ? `${xp.toLocaleString()} / ${(xp + xpToNext).toLocaleString()} XP`
                  : `${xp.toLocaleString()} XP`}
              </span>
            </div>

            {/* Progress Bar */}
            <div
              className="w-full bg-muted-foreground/15 rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress to next rank"
            >
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
                aria-hidden="true"
              />
            </div>

            {/* Next Level Info */}
            <div className="flex items-center justify-between w-full text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy
                  className="w-3.5 h-3.5 text-amber-500"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground text-xs font-medium">
                  {weekly?.percentileLabel ?? "Top —"}
                </span>
              </div>
              <span className="text-foreground text-xs font-mono tabular-nums">
                {xpToNext !== null
                  ? `${xpToNext.toLocaleString()} XP to next rank`
                  : "Max rank"}
              </span>
            </div>

            {/* Trend */}
            {weekly?.trend && weekly.trend !== "same" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full pt-2 border-t border-border/40 font-mono tabular-nums">
                <Link2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>
                  Trend: {weekly.trend}
                  {weekly.trendAmount !== null &&
                  weekly.trendAmount !== undefined &&
                  weekly.trendAmount > 0
                    ? ` (${weekly.trendAmount} positions)`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
