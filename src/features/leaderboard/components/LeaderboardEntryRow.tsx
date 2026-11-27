"use client";

import { ChevronRight, Crown } from "lucide-react";

import { getRankColor } from "@/features/leaderboard/lib/leaderboard-presentation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";

import { cn } from "@/shared/utils/merge-class-names";

import type { LeaderboardEntryWithId } from "@/features/leaderboard/hooks/useLeaderboard";
import type { SelectedPlayerPreview } from "@/features/leaderboard/hooks/usePlayerDossier";

export interface LeaderboardEntryRowProps {
  entry: LeaderboardEntryWithId;
  isAuthenticated: boolean;
  leaderXp?: number | null;
  onSelectPlayer?: (player: SelectedPlayerPreview) => void;
  className?: string;
}

function getMedallionClasses(rankNum: number): string | null {
  if (rankNum === 1) {
    return "border-amber-400/55 bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  if (rankNum === 2) {
    return "border-slate-400/50 bg-slate-500/12 text-slate-700 dark:text-slate-200";
  }
  if (rankNum === 3) {
    return "border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-amber-400";
  }
  return null;
}

export function LeaderboardEntryRow({
  entry,
  isAuthenticated,
  leaderXp = null,
  onSelectPlayer,
  className,
}: LeaderboardEntryRowProps) {
  const isSelfEntry = isAuthenticated && entry.isCurrentUser === true;
  const rankNum = Number(entry.rank);
  const avatarFallbackLetter = entry.displayName?.[0]?.toUpperCase() ?? "?";
  const medallionClass = getMedallionClasses(rankNum);

  const pacePercent =
    leaderXp !== null && leaderXp > 0
      ? Math.min(100, Math.max(4, Math.round((entry.xp / leaderXp) * 100)))
      : null;

  const xpGap =
    leaderXp !== null && rankNum > 1 && leaderXp > entry.xp
      ? leaderXp - entry.xp
      : null;

  const rowInner = (
    <div className="flex w-full items-center justify-between gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div className="flex w-14 sm:w-16 shrink-0 flex-col items-end justify-center">
          {medallionClass ? (
            <span
              className={cn(
                "inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-full border px-2 font-mono text-xs sm:text-sm font-bold tabular-nums",
                medallionClass,
              )}
              aria-label={`Rank ${entry.rank}`}
            >
              {rankNum === 1 ? (
                <Crown
                  className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500/30"
                  aria-hidden="true"
                />
              ) : null}
              #{entry.rank}
            </span>
          ) : (
            <span
              className={cn(
                "font-mono text-sm sm:text-base font-bold tabular-nums",
                getRankColor(rankNum),
              )}
              aria-label={`Rank ${entry.rank}`}
            >
              #{entry.rank}
            </span>
          )}

          <span
            className={
              entry.isTied
                ? "mt-0.5 font-mono text-xs text-muted-foreground tabular-nums"
                : "sr-only"
            }
            aria-label={`Dense rank ${entry.denseRank}`}
          >
            {entry.isTied ? `Tie #${entry.denseRank}` : `d#${entry.denseRank}`}
          </span>
        </div>

        <Avatar
          className={cn(
            "h-9 w-9 sm:h-10 sm:w-10 shrink-0 border",
            isSelfEntry
              ? "border-brand/60 ring-2 ring-brand/20"
              : rankNum === 1
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
          <AvatarFallback className="text-xs font-semibold">
            {avatarFallbackLetter}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            title={
              entry.displayName.length > 24 ? entry.displayName : undefined
            }
            className={cn(
              "truncate text-sm sm:text-base",
              rankNum <= 3
                ? "font-bold text-foreground"
                : isSelfEntry
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground",
            )}
          >
            {entry.displayName}
          </span>
          {isSelfEntry ? (
            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
              (you)
            </span>
          ) : null}
          {rankNum === 1 && leaderXp !== null ? (
            <span className="hidden sm:inline-flex shrink-0 rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Leader
            </span>
          ) : null}
          {entry.isTied ? (
            <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              Tied
            </span>
          ) : null}
        </div>
      </div>

      {pacePercent !== null ? (
        <div className="hidden @lg:flex w-28 @2xl:w-36 shrink-0 flex-col gap-1">
          <span className="font-mono text-xs tabular-nums text-muted-foreground text-right leading-none">
            {xpGap !== null ? `-${xpGap.toLocaleString()} XP` : "100% pace"}
          </span>
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
                  isSelfEntry
                    ? "fill-brand"
                    : rankNum === 1
                      ? "fill-amber-500"
                      : rankNum === 2
                        ? "fill-slate-400"
                        : rankNum === 3
                          ? "fill-orange-400 dark:fill-amber-600"
                          : rankNum <= 10
                            ? "fill-brand/65"
                            : "fill-muted-foreground/45"
                }
              />
            </svg>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-[5.5rem] sm:min-w-[6.75rem] shrink-0 items-center justify-end gap-1.5 text-right">
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            isSelfEntry
              ? "text-brand font-bold"
              : rankNum === 1
                ? "text-amber-600 dark:text-amber-400 font-bold"
                : "text-foreground",
          )}
          aria-label={`${entry.xp} XP`}
        >
          {entry.xp.toLocaleString()} XP
        </span>
        {onSelectPlayer ? (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <li
      aria-current={isSelfEntry ? "true" : undefined}
      data-leaderboard-row={entry.userId}
      className={cn(
        "transition-colors duration-150",
        isSelfEntry
          ? "bg-brand/10 ring-1 ring-inset ring-brand/40"
          : rankNum === 1
            ? "bg-amber-500/5 hover:bg-amber-500/10"
            : "hover:bg-accent/50",
        !onSelectPlayer && "px-3 py-3 sm:px-4",
        className,
      )}
    >
      {onSelectPlayer ? (
        <button
          type="button"
          onClick={() =>
            onSelectPlayer({
              userId: entry.userId,
              displayName: entry.displayName,
              avatarUrl: entry.avatarUrl,
              rank: rankNum,
              xp: entry.xp,
              isCurrentUser: isSelfEntry,
            })
          }
          className="group block w-full px-3 py-3 sm:px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring cursor-pointer"
        >
          {rowInner}
        </button>
      ) : (
        rowInner
      )}
    </li>
  );
}
