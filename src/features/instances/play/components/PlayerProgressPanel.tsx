"use client";

/**
 * `PlayerProgressPanel` — current player's progress display.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E3.
 *
 * Renders the current player's progress exclusively from the server-emitted
 * `PlayerProgressDto` (via the per-instance gameplay store). The component
 * never computes score, rank, or answered count locally and never displays
 * another player's progress.
 */

import { TrendingUp, Hash, Trophy } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import {
  useInstanceGameplayStore,
  selectGameplayProgress,
} from "@/features/instances/play/stores/instanceGameplay.store";

import { GameSkeleton } from "./shared/GameSkeleton";
import { GameStaleState } from "./shared/GameStaleState";

interface PlayerProgressPanelProps {
  instanceId: string;
  className?: string;
}

export function PlayerProgressPanel({
  instanceId,
  className,
}: PlayerProgressPanelProps) {
  const progress = useInstanceGameplayStore((s) =>
    selectGameplayProgress(s, instanceId),
  );

  // No question revealed yet — show skeleton.
  if (progress === null) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBadge />
            <SkeletonText className="w-20" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBadge />
            <SkeletonText className="w-16" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBadge />
            <SkeletonText className="w-24" />
          </div>
        </div>
      </div>
    );
  }

  // Empty progress: nothing to render yet.
  if (progress.answeredCount === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground italic", className)}>
        Your progress will appear here after you answer your first question.
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-3", className)}
      data-testid="player-progress-panel"
      role="region"
      aria-label="Your progress"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Your Progress</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Questions answered */}
        <StatBadge
          icon={Hash}
          label="Answered"
          value={`${progress.answeredCount} / ${progress.totalQuestions}`}
          testId="stat-answered"
        />

        {/* Current score */}
        <StatBadge
          icon={Trophy}
          label="Score"
          value={progress.currentScore.toLocaleString()}
          testId="stat-score"
        />

        {/* Current rank */}
        <div className="col-span-2">
          <StatBadge
            icon={Trophy}
            label="Rank"
            value={progress.rank !== null ? `#${progress.rank}` : "—"}
            highlight={progress.rank !== null && progress.rank <= 3}
            testId="stat-rank"
          />
        </div>
      </div>

      {/* Stale indicator */}
      {/* TODO: expose isStale from the progress stream — tracked separately */}
    </div>
  );
}

// ─── Stat badge ────────────────────────────────────────────────────────────

interface StatBadgeProps {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  highlight?: boolean;
  testId: string;
}

function StatBadge({
  icon: Icon,
  label,
  value,
  highlight = false,
  testId,
}: StatBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border",
        highlight
          ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
          : "bg-muted/30 border-border",
      )}
      data-testid={testId}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          highlight
            ? "text-yellow-600 dark:text-yellow-400"
            : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p
          className={cn(
            "text-sm font-semibold mt-0.5 leading-none",
            highlight
              ? "text-yellow-700 dark:text-yellow-300"
              : "text-foreground",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton helpers ───────────────────────────────────────────────────────

function SkeletonBadge() {
  return (
    <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
  );
}

function SkeletonText({ className }: { className?: string }) {
  return (
    <div className={cn("h-4 rounded bg-muted animate-pulse", className)} />
  );
}
