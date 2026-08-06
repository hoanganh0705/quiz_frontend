"use client";

/**
 * `LiveLeaderboard` — deduplicated, ordered live leaderboard.
 *
 * Source epic:   Phase 5 — Realtime, Tournimes, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E4.
 *
 * Renders entries ordered by `rank` ascending; ties broken deterministically
 * (score desc, then `playerId` asc). Duplicate `playerId` entries collapse
 * to a single row. Shows skeleton, empty state, stale banner, or error state
 * as appropriate. Does not require a full-page reload.
 */

import { Trophy } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import { useLiveLeaderboard } from "@/features/instances/play/hooks";

import { GameLeaderboardSkeleton } from "./shared/GameSkeleton";
import { GameEmptyState } from "./shared/GameEmptyState";
import { GameStaleState } from "./shared/GameStaleState";
import { GameErrorState } from "./shared/GameErrorState";

interface LiveLeaderboardProps {
  instanceId: string;
  /** Highlight the current player's entry. */
  currentPlayerId?: string | null;
  className?: string;
}

export function LiveLeaderboard({
  instanceId,
  currentPlayerId = null,
  className,
}: LiveLeaderboardProps) {
  const {
    entries,
    isLoading,
    isStale,
    error,
    retry,
  } = useLiveLeaderboard(instanceId);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          Leaderboard
        </p>
        <GameLeaderboardSkeleton rows={5} />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          Leaderboard
        </p>
        <GameErrorState error={error} onRetry={retry} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          Leaderboard
        </p>
        <GameEmptyState />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
        Leaderboard
        <span className="text-xs font-normal text-muted-foreground ml-auto">
          {entries.length} player{entries.length !== 1 ? "s" : ""}
        </span>
      </p>

      {/* Stale banner */}
      {isStale && (
        <GameStaleState onRetry={retry} />
      )}

      {/* Entries */}
      <ol
        className="space-y-1.5"
        aria-label="Leaderboard standings"
        data-testid="leaderboard-entries"
      >
        {entries.map((entry) => {
          const isCurrentPlayer = entry.playerId === currentPlayerId;
          return (
            <LeaderboardRow
              key={entry.playerId}
              entry={entry}
              isCurrentPlayer={isCurrentPlayer}
            />
          );
        })}
      </ol>
    </div>
  );
}

// ─── Leaderboard row ───────────────────────────────────────────────────────

interface LeaderboardRowProps {
  entry: {
    playerId: string;
    displayName: string;
    avatarUrl?: string;
    score: number;
    rank: number;
    answeredCount: number;
  };
  isCurrentPlayer: boolean;
}

function LeaderboardRow({ entry, isCurrentPlayer }: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        isCurrentPlayer
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/30",
      )}
      data-testid="leaderboard-row"
      data-rank={entry.rank}
      data-player-id={entry.playerId}
      data-current-player={isCurrentPlayer}
    >
      {/* Rank badge */}
      <RankBadge rank={entry.rank} isTop3={isTop3} />

      {/* Avatar */}
      {entry.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={entry.avatarUrl}
          alt=""
          className="h-7 w-7 rounded-full shrink-0 object-cover"
          data-testid="row-avatar"
        />
      ) : (
        <div
          className="h-7 w-7 rounded-full bg-muted shrink-0"
          data-testid="row-avatar-placeholder"
        />
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate font-medium leading-none",
            isCurrentPlayer
              ? "text-primary"
              : "text-foreground",
          )}
          data-testid="row-name"
        >
          {entry.displayName}
          {isCurrentPlayer && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (you)
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.answeredCount} answered
        </p>
      </div>

      {/* Score */}
      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums leading-none",
            isCurrentPlayer ? "text-primary" : "text-foreground",
          )}
          data-testid="row-score"
        >
          {entry.score.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">pts</p>
      </div>
    </li>
  );
}

// ─── Rank badge ────────────────────────────────────────────────────────────

function RankBadge({ rank, isTop3 }: { rank: number; isTop3: boolean }) {
  if (rank === 1) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30"
        data-testid="rank-badge"
        aria-label="1st place"
      >
        <Trophy className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
        data-testid="rank-badge"
        aria-label="2nd place"
      >
        <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
          2
        </span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30"
        data-testid="rank-badge"
        aria-label="3rd place"
      >
        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
          3
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
      data-testid="rank-badge"
      aria-label={`${rank}th place`}
    >
      {rank}
    </div>
  );
}
