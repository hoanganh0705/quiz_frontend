"use client";

/**
 * `GameSkeleton` — deterministic skeleton for the gameplay surface.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.D1.
 *
 * The skeleton mirrors the shape of the real game layout so swapping the
 * placeholder for live content does not cause layout shift. It does not
 * advance any lifecycle state, start timers, or call the service layer —
 * it is a presentational primitive only.
 *
 * Layout (mirrors `InstanceGameView` composition):
 *   ┌──────────────────────────────────────────┐
 *   │ ConnectionStatus (if not connected)        │
 *   │ ProgressPanel  Leaderboard                │
 *   │ ──────────────────────────────────────── │
 *   │ QuestionCard (skeleton)                  │
 *   │ AnswerOptions (4 options skeleton)         │
 *   │ ──────────────────────────────────────── │
 *   │ Timer + SubmissionState                   │
 *   └──────────────────────────────────────────┘
 */

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

// ─── Question card skeleton ─────────────────────────────────────────────────

interface GameQuestionSkeletonProps {
  className?: string;
}

/**
 * Skeleton matching the `QuestionCard` layout: question text, metadata
 * row (category, difficulty, points), and option count.
 */
export function GameQuestionSkeleton({ className }: GameQuestionSkeletonProps) {
  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="game-question-skeleton"
    >
      {/* Metadata row */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Question text */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
    </div>
  );
}

// ─── Answer options skeleton ────────────────────────────────────────────────

interface GameOptionsSkeletonProps {
  /** Number of options to render. Default: 4. */
  count?: number;
  className?: string;
}

/**
 * Skeleton matching the `AnswerOptions` layout: a list of option rows,
 * each with a radio-style indicator and text.
 */
export function GameOptionsSkeleton({
  count = 4,
  className,
}: GameOptionsSkeletonProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      data-testid="game-options-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-lg border"
        >
          {/* Radio indicator */}
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          {/* Option text */}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Timer + submission skeleton ────────────────────────────────────────────

interface GameTimerSkeletonProps {
  className?: string;
}

export function GameTimerSkeleton({ className }: GameTimerSkeletonProps) {
  return (
    <div
      className={cn("flex items-center gap-4", className)}
      data-testid="game-timer-skeleton"
    >
      {/* Timer bar */}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      {/* Submission state indicator */}
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
  );
}

// ─── Progress panel skeleton ─────────────────────────────────────────────

interface GameProgressPanelSkeletonProps {
  className?: string;
}

export function GameProgressPanelSkeleton({
  className,
}: GameProgressPanelSkeletonProps) {
  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="game-progress-skeleton"
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// ─── Leaderboard skeleton ──────────────────────────────────────────────────

interface GameLeaderboardSkeletonProps {
  /** Number of rows to render. Default: 5. */
  rows?: number;
  className?: string;
}

export function GameLeaderboardSkeleton({
  rows = 5,
  className,
}: GameLeaderboardSkeletonProps) {
  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="game-leaderboard-skeleton"
    >
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          {/* Rank badge */}
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          {/* Avatar */}
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          {/* Name */}
          <Skeleton className="h-4 flex-1 max-w-32" />
          {/* Score */}
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

// ─── Full game skeleton (composes all parts) ────────────────────────────────

interface GameSkeletonProps {
  className?: string;
}

/**
 * Full game layout skeleton. Composes all sub-skeletons in the same
 * grid layout as `InstanceGameView`.
 */
export function GameSkeleton({ className }: GameSkeletonProps) {
  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="game-skeleton"
    >
      {/* Top row: progress + leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GameProgressPanelSkeleton />
        <GameLeaderboardSkeleton />
      </div>

      {/* Question */}
      <GameQuestionSkeleton />

      {/* Options */}
      <GameOptionsSkeleton />

      {/* Timer + submission */}
      <GameTimerSkeleton />
    </div>
  );
}
