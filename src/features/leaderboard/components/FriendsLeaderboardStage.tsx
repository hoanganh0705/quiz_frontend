"use client";

import Link from "next/link";
import { memo } from "react";

import {
  AlertCircle,
  ChevronRight,
  Crown,
  LogIn,
  RotateCcw,
  UserPlus,
  Users,
} from "lucide-react";

import { useArenaFriendsLeaderboard } from "@/features/leaderboard/hooks/useArenaFriendsLeaderboard";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

import { cn } from "@/shared/utils/merge-class-names";

import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";

export interface FriendsLeaderboardStageProps {
  readonly period: LeaderboardPeriod;
  readonly onOpenFindFriends: () => void;
  readonly onSelectPlayer?: (player: SelectedPlayerPreview) => void;
}

export const FriendsLeaderboardStage = memo(function FriendsLeaderboardStage({
  period,
  onOpenFindFriends,
  onSelectPlayer,
}: FriendsLeaderboardStageProps) {
  const {
    isAuthenticated,
    entries,
    currentUserRank,
    totalParticipants,
    isStale,
    isLoading,
    error,
    retry,
  } = useArenaFriendsLeaderboard(period, true);

  if (!isAuthenticated) {
    return (
      <section
        aria-label="Friends leaderboard"
        data-testid="friends-leaderboard-stage"
        className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs"
      >
        <EmptyState
          icon={Users}
          title="Compare XP with your friends"
          description="Sign in to unlock your personal friends standings, track head-to-head weekly races, and add quiz rivals."
          actions={[
            {
              label: "Sign in to view friends",
              href: "/login",
              variant: "default",
              icon: LogIn,
            },
          ]}
        />
      </section>
    );
  }

  if (isLoading) {
    return <LeaderboardSkeleton count={8} />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Could not load your friends standings right now.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void retry();
          }}
          className="border-destructive/50 text-destructive hover:bg-destructive/20"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <section
        aria-label="Friends leaderboard"
        data-testid="friends-leaderboard-stage"
        className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs"
      >
        <EmptyState
          icon={UserPlus}
          title="No friends ranked in this period yet"
          description="Connect with fellow quiz players to turn every weekly and monthly reset into a friendly rivalry."
          actions={[
            {
              label: "Find Friends",
              variant: "default",
              icon: UserPlus,
              onClick: onOpenFindFriends,
            },
          ]}
        />
      </section>
    );
  }

  const leaderXp = Math.max(1, entries[0]?.xp ?? 1);

  return (
    <section
      aria-label="Friends leaderboard"
      data-testid="friends-leaderboard-stage"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Circle standing
          </span>
          {currentUserRank ? (
            <>
              <span
                className={cn(
                  "font-mono text-base font-bold tabular-nums",
                  getRankColor(currentUserRank.rank),
                )}
              >
                #{currentUserRank.rank}
              </span>
              <span className="font-mono text-xs sm:text-sm tabular-nums text-foreground font-semibold">
                {currentUserRank.xp.toLocaleString()} XP
              </span>
            </>
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {totalParticipants.toLocaleString()} friends competing
            </span>
          )}
          {isStale ? (
            <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              Syncing latest XP…
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenFindFriends}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add Friends
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/friends">Manage</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div
          aria-hidden="true"
          className="grid grid-cols-[3.5rem_1fr_auto] sm:grid-cols-[4rem_1fr_8rem_7rem] items-center gap-3 border-b border-border/70 bg-muted/40 px-3 py-2.5 sm:px-4 text-xs font-medium text-muted-foreground"
        >
          <span className="text-right">Rank</span>
          <span>Friend</span>
          <span className="hidden sm:block">Pace</span>
          <span className="text-right">XP</span>
        </div>

        <ol className="divide-y divide-border/50 list-none">
          {entries.map((friend) => {
            const isSelf =
              currentUserRank !== null &&
              friend.rank === currentUserRank.rank &&
              friend.xp === currentUserRank.xp;
            const pacePercent = Math.min(
              100,
              Math.max(4, Math.round((friend.xp / leaderXp) * 100)),
            );
            const initial = friend.displayName[0]?.toUpperCase() ?? "?";

            return (
              <li
                key={friend.userId}
                aria-current={isSelf ? "true" : undefined}
                className={cn(
                  isSelf && "bg-brand/10 ring-1 ring-inset ring-brand/40",
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectPlayer?.({
                      userId: friend.userId,
                      displayName: friend.displayName,
                      username: friend.username,
                      avatarUrl: friend.avatarUrl,
                      rank: friend.rank,
                      xp: friend.xp,
                      isCurrentUser: isSelf,
                    })
                  }
                  className="grid w-full grid-cols-[3.5rem_1fr_auto] sm:grid-cols-[4rem_1fr_8rem_7rem] items-center gap-3 px-3 py-3 sm:px-4 text-left transition-colors duration-150 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring cursor-pointer"
                >
                  <div className="flex items-center justify-end gap-1">
                    {friend.rank === 1 ? (
                      <Crown
                        className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500/30"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "font-mono text-sm sm:text-base font-bold tabular-nums",
                        getRankColor(friend.rank),
                      )}
                    >
                      #{friend.rank}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0 border border-border/70">
                      {friend.avatarUrl ? (
                        <AvatarImage src={friend.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xs font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {friend.displayName}
                        </span>
                        {isSelf ? (
                          <span className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-xs font-semibold text-brand">
                            (you)
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{friend.username}
                        {friend.friendSince
                          ? ` · Since ${new Date(
                              friend.friendSince,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              year: "numeric",
                            })}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <svg
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        className="block h-full w-full"
                        aria-hidden="true"
                      >
                        <rect
                          x="0"
                          y="0"
                          width={pacePercent}
                          height="6"
                          className={
                            friend.rank === 1
                              ? "fill-amber-500"
                              : isSelf
                                ? "fill-brand"
                                : "fill-muted-foreground/45"
                          }
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {friend.xp.toLocaleString()} XP
                    </span>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
});
