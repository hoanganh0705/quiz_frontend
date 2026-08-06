"use client";

/**
 * `GameStaleState` — amber stale-data banner for gameplay surfaces.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.D1.
 *
 * Mirrors `InstanceStaleState` (Epic 5.7 TKT-5.7.C1) and
 * `TournamentStaleState` (Epic 5.2 TKT-5.2.C1). Renders above cached
 * content when revalidation fails. Does not obstruct the stale cached
 * content — the game surface remains visible underneath.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

interface GameStaleStateProps {
  /** Optional retry CTA. */
  onRetry?: () => void;
  className?: string;
}

export function GameStaleState({
  onRetry,
  className,
}: GameStaleStateProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg",
        "bg-amber-50 dark:bg-amber-950/30",
        "border border-amber-200 dark:border-amber-800",
        "text-amber-800 dark:text-amber-200",
        className,
      )}
      role="alert"
      data-testid="game-stale-state"
    >
      <AlertTriangle
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm">
        This data may be outdated. The latest information could not be loaded.
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="gap-1.5 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
