"use client";

import { Trophy, Medal, TrendingUp } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
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
className?: string;
}

function RankMedal({ rank }: { rank: number }) {
if (rank === 1) {
return (
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
<Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
</div>
    );
  }
if (rank === 2) {
return (
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
<Medal className="h-5 w-5 text-slate-400 dark:text-slate-300" aria-hidden="true" />
</div>
    );
  }
if (rank === 3) {
return (
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
<Medal className="h-5 w-5 text-orange-500 dark:text-orange-400" aria-hidden="true" />
</div>
    );
  }
return (
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
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
return (
<div
className={cn(
"flex items-center gap-3 p-3 rounded-lg",
isCurrentPlayer
? "bg-primary/5 border border-primary/20"
: "border border-transparent",
      )}
data-testid="result-row"
data-current-player={isCurrentPlayer}
    >
<RankMedal rank={rank} />
<div className="flex-1 min-w-0">
<p className={cn(
"text-sm font-medium truncate",
isCurrentPlayer && "text-primary",
        )}>
{entry.displayName ?? entry.playerId}
{isCurrentPlayer && (
<span className="ml-2 text-xs font-normal text-muted-foreground">
(you)
            </span>
          )}
</p>
<p className="text-xs text-muted-foreground">
{entry.answeredCount} answered
        </p>
</div>
<div className="text-right">
<p className="text-sm font-semibold tabular-nums">
{entry.score.toLocaleString()}
</p>
<p className="text-xs text-muted-foreground">pts</p>
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
}): React.ReactNode {
if (rank === null) {
return (
<p className="text-sm text-muted-foreground text-center">
Thanks for playing!
      </p>
    );
  }
if (rank === 1) {
return (
<p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 text-center">
Congratulations! You finished in 1st place!
      </p>
    );
  }
if (rank <= Math.ceil(total / 3)) {
return (
<p className="text-sm font-medium text-primary text-center">
Great job! You placed in the top third.
      </p>
    );
  }
return (
<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
<TrendingUp className="h-4 w-4" aria-hidden="true" />
<span>You placed {rank} of {total}. Keep practicing!</span>
</div>
  );
}

export function GameResultSummary({
finalLeaderboard,
playerProgress,
currentPlayerId,
className,
}: GameResultSummaryProps) {
if (!finalLeaderboard) {
return (
<div
className={cn("space-y-4", className)}
data-testid="game-result-summary-loading"
      >
{/* Top player summary skeleton */}
<div className="flex items-center gap-4 p-4 rounded-lg border">
<Skeleton className="h-14 w-14 rounded-full" />
<div className="space-y-2">
<Skeleton className="h-5 w-40" />
<Skeleton className="h-4 w-24" />
</div>
</div>
{/* Leaderboard skeleton */}
<div className="space-y-2">
{Array.from({ length: 3 }).map((_, i) => (
<div key={i} className="flex items-center gap-3 p-3">
<Skeleton className="h-10 w-10 rounded-full" />
<Skeleton className="h-4 flex-1 max-w-32" />
<Skeleton className="h-4 w-14" />
</div>
          ))}
</div>
</div>
    );
  }

const { entries, totalQuestions } = finalLeaderboard;
const playerRank = playerProgress?.rank ?? null;

return (
<div
className={cn("space-y-4", className)}
data-testid="game-result-summary"
aria-label="Game results"
    >
{/* Summary message */}
<div className="text-center">
<ResultMessage rank={playerRank} total={entries.length} />
</div>

{/* Top 3 highlight */}
{entries.length > 0 && (
<div className="p-4 rounded-lg border bg-muted/20">
<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
Final Standings
          </p>
<div className="space-y-1">
{entries.slice(0, Math.min(5, entries.length)).map((entry, idx) => (
<PlayerResultRow
key={entry.playerId}
entry={entry}
isCurrentPlayer={entry.playerId === currentPlayerId}
rank={idx + 1}
              />
            ))}
</div>
{entries.length > 5 && (
<p className="text-xs text-muted-foreground text-center mt-2">
+{entries.length - 5} more players
            </p>
          )}
</div>
      )}

{/* Total questions played */}
<p className="text-xs text-muted-foreground text-center">
{totalQuestions} question{totalQuestions !== 1 ? "s" : ""} total
      </p>
</div>
  );
}
