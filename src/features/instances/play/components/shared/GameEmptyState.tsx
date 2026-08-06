"use client";

/**
 * `GameEmptyState` — empty-state for the gameplay surface.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.D1.
 *
 * Renders when no question has been revealed yet. Purely presentational;
 * never starts a timer or advances lifecycle state.
 */

import { HelpCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

interface GameEmptyStateProps {
  className?: string;
}

export function GameEmptyState({ className }: GameEmptyStateProps) {
  return (
    <EmptyState
      icon={HelpCircle}
      title="Waiting for the next question"
      description="The next question will appear here as soon as the host reveals it. Stay tuned!"
      size="md"
      className={className}
      data-testid="game-empty-state"
    />
  );
}
