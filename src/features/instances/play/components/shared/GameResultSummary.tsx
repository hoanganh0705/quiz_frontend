"use client";

import Link from "next/link";
import {
  Trophy,
  Medal,
  Crown,
  ArrowLeft,
  Gamepad2,
  TrendingUp,
  Award,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  FinalLeaderboardDto,
  LeaderboardEntryDto,
  PlayerProgressDto,
} from "@/features/instances/play/types";

interface GameResultSummaryProps {
  finalLeaderboard: FinalLeaderboardDto | null;
  playerProgress: PlayerProgressDto | null;
  currentPlayerId: string | null;
  instanceId?: string;
  className?: string;
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/50">
        <Trophy className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-400/20 text-slate-300 ring-2 ring-slate-400/50">
        <Medal className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-700/20 text-amber-500 ring-2 ring-amber-700/50">
        <Medal className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground text-sm font-semibold font-mono border border-border/60">
      #{rank}
    </div>
  );
}

interface PlayerResultRowProps {
  entry: LeaderboardEntryDto;
  isCurrentPlayer: boolean;
  rank: number;
}

function PlayerResultRow({
  entry,
  isCurrentPlayer,
  rank,
}: PlayerResultRowProps) {
  const initial = (entry.displayName || entry.playerId).charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 sm:p-4 rounded-xl transition-all duration-150 border",
        isCurrentPlayer
          ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-xs"
          : "bg-card/40 border-border/60 hover:bg-card/70",
      )}
      data-testid="result-row"
      data-current-player={isCurrentPlayer}
    >
      <RankMedal rank={rank} />

      <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/80">
        <AvatarImage src={entry.avatarUrl} alt={entry.displayName} />
        <AvatarFallback className="font-semibold text-xs">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm font-semibold truncate",
              isCurrentPlayer ? "text-primary" : "text-foreground",
            )}
          >
            {entry.displayName || entry.playerId}
          </p>
          {isCurrentPlayer && (
            <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.answeredCount} answered
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm sm:text-base font-bold font-mono tabular-nums text-foreground">
          {entry.score.toLocaleString()}
        </p>
        <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
          pts
        </p>
      </div>
    </div>
  );
}

function ResultMessage({
  rank,
  total,
}: {
  rank: number | null;
  total: number;
}) {
  if (rank === null) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        Thanks for playing! Here are the final match results.
      </p>
    );
  }
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-amber-500">
        <Crown className="w-5 h-5 fill-amber-500/20" aria-hidden="true" />
        <span>Champion! You finished in 1st place!</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-slate-300">
        <Award className="w-5 h-5 text-slate-300" aria-hidden="true" />
        <span>Runner-up! Outstanding 2nd place performance!</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-semibold text-amber-600">
        <Award className="w-5 h-5 text-amber-600" aria-hidden="true" />
        <span>Podium finish! You took 3rd place!</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <TrendingUp className="h-4 w-4" aria-hidden="true" />
      <span>
        You placed #{rank} of {total} players. Well played!
      </span>
    </div>
  );
}

interface PodiumProps {
  entries: LeaderboardEntryDto[];
  currentPlayerId: string | null;
}

function BattlePodium({ entries, currentPlayerId }: PodiumProps) {
  if (entries.length === 0) return null;

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  return (
    <div className="flex items-end justify-center gap-2.5 sm:gap-4 my-6 pt-6">
      {/* 2nd Place */}
      {second ? (
        <div
          className={cn(
            "flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-400/10 via-slate-400/5 to-transparent border border-slate-400/20 shadow-xs",
            second.playerId === currentPlayerId && "ring-2 ring-primary/40",
          )}
        >
          <div className="relative mb-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-slate-400/60 ring-offset-2 ring-offset-card shadow-sm">
              <Avatar className="w-full h-full">
                <AvatarImage src={second.avatarUrl} alt={second.displayName} />
                <AvatarFallback className="font-bold text-sm bg-slate-800 text-slate-200">
                  {second.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-400 text-slate-950 font-mono font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">
              #2
            </div>
          </div>
          <h3 className="text-foreground font-semibold text-xs sm:text-sm text-center truncate w-full mt-1">
            {second.displayName}
            {second.playerId === currentPlayerId && " (You)"}
          </h3>
          <p className="text-muted-foreground text-xs font-mono font-medium tabular-nums mt-0.5">
            {second.score.toLocaleString()} pts
          </p>
        </div>
      ) : null}

      {/* 1st Place */}
      {first ? (
        <div
          className={cn(
            "flex-1 max-w-[140px] sm:max-w-[180px] flex flex-col items-center p-3.5 sm:p-5 rounded-2xl bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 shadow-md -mt-4 sm:-mt-6 relative",
            first.playerId === currentPlayerId && "ring-2 ring-amber-500",
          )}
        >
          <Crown
            className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-500/30 mb-1 filter drop-shadow-xs"
            aria-hidden="true"
          />
          <div className="relative mb-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-amber-500 ring-offset-2 ring-offset-card shadow-sm">
              <Avatar className="w-full h-full">
                <AvatarImage src={first.avatarUrl} alt={first.displayName} />
                <AvatarFallback className="font-bold text-base bg-amber-950 text-amber-200">
                  {first.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-500 text-amber-950 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
              #1
            </div>
          </div>
          <h3 className="text-foreground font-bold text-sm sm:text-base text-center truncate w-full mt-1">
            {first.displayName}
            {first.playerId === currentPlayerId && " (You)"}
          </h3>
          <p className="text-amber-500 dark:text-amber-400 text-xs sm:text-sm font-mono font-bold tabular-nums mt-0.5">
            {first.score.toLocaleString()} pts
          </p>
        </div>
      ) : null}

      {/* 3rd Place */}
      {third ? (
        <div
          className={cn(
            "flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-700/10 via-amber-700/5 to-transparent border border-amber-700/20 shadow-xs mt-2 sm:mt-4",
            third.playerId === currentPlayerId && "ring-2 ring-primary/40",
          )}
        >
          <div className="relative mb-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-amber-700/60 ring-offset-2 ring-offset-card shadow-sm">
              <Avatar className="w-full h-full">
                <AvatarImage src={third.avatarUrl} alt={third.displayName} />
                <AvatarFallback className="font-bold text-sm bg-amber-950/60 text-amber-300">
                  {third.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-700 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-full shadow-xs">
              #3
            </div>
          </div>
          <h3 className="text-foreground font-semibold text-xs sm:text-sm text-center truncate w-full mt-1">
            {third.displayName}
            {third.playerId === currentPlayerId && " (You)"}
          </h3>
          <p className="text-muted-foreground text-xs font-mono font-medium tabular-nums mt-0.5">
            {third.score.toLocaleString()} pts
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function GameResultSummary({
  finalLeaderboard,
  playerProgress,
  currentPlayerId,
  instanceId,
  className,
}: GameResultSummaryProps) {
  if (!finalLeaderboard) {
    return (
      <div
        className={cn("space-y-4 max-w-3xl mx-auto", className)}
        data-testid="game-result-summary-loading"
      >
        <div className="flex items-center gap-4 p-5 rounded-2xl border bg-card/60">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 rounded-xl border bg-card/40"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 flex-1 max-w-40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { entries, totalQuestions } = finalLeaderboard;

  // Determine current player's rank and score
  const matchedEntry = entries.find((e) => e.playerId === currentPlayerId);
  const playerRank =
    matchedEntry?.rank ??
    playerProgress?.rank ??
    (entries.findIndex((e) => e.playerId === currentPlayerId) !== -1
      ? entries.findIndex((e) => e.playerId === currentPlayerId) + 1
      : null);
  const playerScore =
    matchedEntry?.score ?? playerProgress?.currentScore ?? 0;
  const playerAnswered =
    matchedEntry?.answeredCount ??
    playerProgress?.answeredCount ??
    totalQuestions;
  const totalQuestionsCount =
    totalQuestions > 0
      ? totalQuestions
      : playerProgress?.totalQuestions ?? playerAnswered;

  return (
    <Card
      className={cn(
        "bg-card/90 border-border/70 rounded-3xl p-5 sm:p-8 shadow-xl backdrop-blur-md max-w-3xl mx-auto space-y-6",
        className,
      )}
      data-testid="game-result-summary"
      aria-label="Game results"
    >
      <CardContent className="p-0 space-y-6">
        {/* Celebration Hero Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 shadow-lg">
            <Trophy
              className="h-8 w-8 text-amber-500 filter drop-shadow-sm"
              aria-hidden="true"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              Battle Complete!
            </h1>
            <div className="mt-1.5">
              <ResultMessage rank={playerRank} total={entries.length} />
            </div>
          </div>
        </div>

        {/* Player Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-card/60 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center shadow-2xs">
            <p className="text-lg sm:text-xl font-bold font-mono text-primary">
              {playerRank !== null ? `#${playerRank}` : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Your Rank</p>
          </div>
          <div className="bg-card/60 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center shadow-2xs">
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
              {playerScore.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Your Score</p>
          </div>
          <div className="bg-card/60 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center shadow-2xs">
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
              {playerAnswered}/{totalQuestionsCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Answered</p>
          </div>
          <div className="bg-card/60 border border-border/60 p-3 sm:p-3.5 rounded-xl text-center shadow-2xs">
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-foreground">
              {entries.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Players</p>
          </div>
        </div>

        {/* Top 3 Visual Podium */}
        {entries.length >= 2 && (
          <BattlePodium
            entries={entries}
            currentPlayerId={currentPlayerId}
          />
        )}

        {/* Final Standings List */}
        {entries.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Final Standings
              </h2>
              <span className="text-xs text-muted-foreground">
                {entries.length} {entries.length === 1 ? "player" : "players"}
              </span>
            </div>
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <PlayerResultRow
                  key={entry.playerId}
                  entry={entry}
                  isCurrentPlayer={entry.playerId === currentPlayerId}
                  rank={idx + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-center gap-3">
          {instanceId && (
            <Button
              variant="default"
              asChild
              className="w-full sm:w-auto gap-2"
              data-testid="return-to-instance"
            >
              <Link href={`/instances/${instanceId}`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Return to Lobby
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto gap-2"
          >
            <Link href="/instances">
              <Gamepad2 className="h-4 w-4" aria-hidden="true" />
              Explore Battles
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="w-full sm:w-auto gap-2"
          >
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Leaderboard
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
