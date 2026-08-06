"use client";

/**
 * `GameResult` — post-game result view.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E4 + TKT-5.8.G2.
 *
 * Renders only when `closure !== null` and `finalLeaderboard !== null`,
 * otherwise renders nothing. Composes `GameClosedSummary` for the closed-state
 * chrome, overlays the final leaderboard with the current player's rank, and
 * provides a "Return to instance" CTA back to `/instances/[id]`.
 * No client-side ranking or scoring.
 */

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstanceLifecycle, useLiveLeaderboard } from "@/features/instances/play/hooks";
import { useInstanceGameplayStore, selectGameplayProgress } from "@/features/instances/play/stores/instanceGameplay.store";

import { GameClosedSummary } from "./shared/GameClosedSummary";
import { GameResultSummary as SharedGameResultSummary } from "./shared/GameResultSummary";

interface GameResultProps {
  instanceId: string;
  /** Highlight the current player's entry. */
  currentPlayerId?: string | null;
  className?: string;
}

export function GameResult({
  instanceId,
  currentPlayerId = null,
  className,
}: GameResultProps) {
  const { closure } = useInstanceLifecycle(instanceId);
  const { final } = useLiveLeaderboard(instanceId);
  const playerProgress = useInstanceGameplayStore((s) =>
    selectGameplayProgress(s, instanceId),
  );

  // Only render when both closure and final leaderboard are available.
  if (!closure || !final) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="game-result">
      {/* Closed-state chrome */}
      <GameClosedSummary closure={closure} />

      {/* Final leaderboard */}
      <SharedGameResultSummary
        finalLeaderboard={final}
        playerProgress={playerProgress}
        currentPlayerId={currentPlayerId}
      />

      {/* Return-to-instance CTA */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          asChild
          className="w-full gap-2"
          data-testid="return-to-instance"
        >
          <a href={`/instances/${instanceId}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to instance lobby
          </a>
        </Button>
      </div>
    </div>
  );
}
