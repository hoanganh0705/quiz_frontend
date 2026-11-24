"use client";

import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import type { LeaderboardEntryWithId } from "@/features/leaderboard/hooks/useLeaderboard";
import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

export interface LeaderboardEntryRowProps {
  entry: LeaderboardEntryWithId;

  isAuthenticated: boolean;

  className?: string;
}

export function LeaderboardEntryRow({
  entry,
  isAuthenticated,
  className,
}: LeaderboardEntryRowProps) {
  const isSelfEntry = isAuthenticated && entry.isCurrentUser === true;
  const rankNum = Number(entry.rank);

  const avatarFallbackLetter = entry.displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <li
      aria-current={isSelfEntry ? "true" : undefined}
      data-leaderboard-row={entry.userId}
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl p-3 sm:px-4",
        "border transition-all duration-150 shadow-2xs",
        isSelfEntry
          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/40 shadow-xs"
          : rankNum === 1
            ? "bg-amber-500/5 border-amber-500/35 hover:bg-amber-500/10 shadow-xs"
            : rankNum === 2
              ? "bg-slate-400/5 border-slate-400/35 hover:bg-slate-400/10"
              : rankNum === 3
                ? "bg-amber-700/5 border-amber-700/35 hover:bg-amber-700/10"
                : "bg-card/80 border-border/70 hover:bg-muted/40",
        className,
      )}
    >
      {/* Left cluster: rank, dense rank, avatar, display name */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div className="flex min-w-[3.25rem] shrink-0 flex-col items-center">
          <div className="flex items-center gap-1">
            {rankNum === 1 ? (
              <Crown
                className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30 shrink-0"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                "text-base sm:text-lg font-bold font-mono tabular-nums",
                getRankColor(entry.rank),
              )}
              aria-label={`Rank ${entry.rank}`}
            >
              #{entry.rank}
            </span>
          </div>
          <span
            className="text-xs font-mono text-muted-foreground tabular-nums"
            aria-label={`Dense rank ${entry.denseRank}`}
          >
            d#{entry.denseRank}
          </span>
        </div>

        <Avatar
          className={cn(
            "h-10 w-10 shrink-0 border",
            rankNum === 1
              ? "border-amber-500/60 ring-2 ring-amber-500/20"
              : rankNum === 2
                ? "border-slate-400/60 ring-2 ring-slate-400/20"
                : rankNum === 3
                  ? "border-amber-700/60 ring-2 ring-amber-700/20"
                  : "border-border/60",
          )}
        >
          {entry.avatarUrl ? (
            <AvatarImage src={entry.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{avatarFallbackLetter}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm sm:text-base font-medium",
              isSelfEntry
                ? "text-primary font-semibold"
                : rankNum === 1
                  ? "font-semibold text-foreground"
                  : "text-foreground",
            )}
          >
            {entry.displayName}
            {isSelfEntry ? (
              <span className="ml-2 text-xs font-medium text-primary">
                (you)
              </span>
            ) : null}
          </p>
          {entry.isTied ? (
            <p className="text-xs text-muted-foreground">Tied</p>
          ) : null}
        </div>
      </div>

      {/* Right cluster: XP with thousands separators */}
      <div className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold font-mono tabular-nums",
            rankNum === 1
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
              : rankNum === 2
                ? "bg-slate-400/10 border-slate-400/30 text-slate-700 dark:text-slate-300 font-bold"
                : rankNum === 3
                  ? "bg-amber-700/10 border-amber-700/30 text-amber-700 dark:text-amber-400 font-bold"
                  : "bg-primary/10 border-primary/20 text-primary",
          )}
          aria-label={`${entry.xp} XP`}
        >
          {entry.xp.toLocaleString()} XP
        </span>
      </div>
    </li>
  );
}
