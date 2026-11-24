"use client";

import { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { FindFriendsPopup } from "./FindFriendsPopup";
import { YourRankingPopup } from "./YourRankingPopup";
import { Trophy, Star, Users, Crown, Calendar } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import {
  useMyRanking,
  getWeeklyPosition,
} from "@/features/leaderboard/hooks/useMyRanking";
import { useLeaderboardSummary } from "@/features/leaderboard/hooks/useLeaderboardSummary";
import {
  getRankColor,
  formatPeriodReset,
} from "@/features/leaderboard/lib/leaderboard-presentation";

export const LeaderboardHeader = memo(function LeaderboardHeader() {
  const [showFindFriends, setShowFindFriends] = useState(false);
  const [showYourRanking, setShowYourRanking] = useState(false);

  const { isAuthenticated } = useAuthState();
  const { data: myRanking } = useMyRanking();
  const { totalParticipants, period } = useLeaderboardSummary("weekly");

  const weekly = getWeeklyPosition(myRanking);
  const userRank = weekly?.rank ?? null;
  const userPoints = weekly?.xp ?? null;

  const handleShowFindFriends = useCallback(() => {
    setShowFindFriends(true);
  }, []);
  const handleCloseFindFriends = useCallback(() => {
    setShowFindFriends(false);
  }, []);
  const handleShowYourRanking = useCallback(() => {
    setShowYourRanking(true);
  }, []);
  const handleCloseYourRanking = useCallback(() => {
    setShowYourRanking(false);
  }, []);

  const seasonResetLabel =
    period?.resetInSeconds !== undefined && period?.resetInSeconds !== null
      ? formatPeriodReset(period.resetInSeconds)
      : "—";

  return (
    <>
      <div className="space-y-6">
        {/* Main Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Crown
                className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500"
                aria-hidden="true"
              />
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              See who&apos;s leading the pack in our global quiz rankings.
            </p>
          </div>

          <div
            className="flex flex-wrap gap-2.5 items-center"
            role="toolbar"
            aria-label="Leaderboard actions"
          >
            <Button
              variant="outline"
              size="sm"
              className="border-border/80 text-foreground hover:bg-muted/60 text-xs sm:text-sm px-3.5 py-2 flex items-center gap-2"
              onClick={handleShowFindFriends}
              aria-label="Find friends on leaderboard"
            >
              <Users className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              Find Friends
            </Button>
            {isAuthenticated ? (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm px-3.5 py-2 flex items-center gap-2 shadow-xs"
                onClick={handleShowYourRanking}
                aria-label="View your ranking details"
              >
                <Trophy className="w-4 h-4" aria-hidden="true" />
                Your Ranking
              </Button>
            ) : null}
          </div>
        </header>

        {/* Stats Overview */}
        <section
          className={cn(
            "grid gap-4",
            isAuthenticated
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
              : "grid-cols-1 sm:grid-cols-2",
          )}
          aria-label="Leaderboard statistics overview"
        >
          {/* Total Participants */}
          <div className="bg-card/80 p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs backdrop-blur-xs flex items-center justify-between transition-colors hover:border-border">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Participants</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {totalParticipants !== null
                  ? totalParticipants.toLocaleString()
                  : "—"}
              </p>
            </div>
            <div
              className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>

          {/* Season End */}
          <div className="bg-card/80 p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs backdrop-blur-xs flex items-center justify-between transition-colors hover:border-border">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Season Ends</p>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                {seasonResetLabel}
              </p>
            </div>
            <div
              className="w-11 h-11 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Your Rank (auth-only) */}
          {isAuthenticated ? (
            <div className="bg-card/80 p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs backdrop-blur-xs flex items-center justify-between transition-colors hover:border-border">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Rank</p>
                <p
                  className={`font-bold text-2xl font-mono tabular-nums mt-1 ${userRank !== null ? getRankColor(userRank) : "text-foreground"}`}
                >
                  {userRank !== null ? `#${userRank}` : "—"}
                </p>
              </div>
              <div
                className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          ) : null}

          {/* Your Points (auth-only) */}
          {isAuthenticated ? (
            <div className="bg-card/80 p-4 sm:p-5 rounded-2xl border border-border/70 shadow-xs backdrop-blur-xs flex items-center justify-between transition-colors hover:border-border">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Points</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                  {userPoints !== null ? userPoints.toLocaleString() : "—"}
                </p>
              </div>
              <div
                className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Star className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* Popups */}
      <FindFriendsPopup
        isOpen={showFindFriends}
        onClose={handleCloseFindFriends}
      />

      <YourRankingPopup
        isOpen={showYourRanking}
        onClose={handleCloseYourRanking}
      />
    </>
  );
});
