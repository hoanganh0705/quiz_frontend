"use client";

/**
 * `InstanceClosedSummary` — host-side closed/cancelled summary for the game view.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E5.
 *
 * Renders when the instance is `'closed'` or `'cancelled'`. This is the
 * host-facing variant of the closed summary — it composes `GameClosedSummary`
 * (shared primitive, TKT-5.8.D1) and overlays the final leaderboard and
 * result summary. The component intentionally exposes no further CTAs.
 * Mirrors `InstanceClosedState` (Epic 5.7 TKT-5.7.C1).
 */

import { useInstanceLifecycle } from "@/features/instances/play/hooks";
import { useInstanceGameplayStore, selectGameplayProgress } from "@/features/instances/play/stores/instanceGameplay.store";

import { GameClosedSummary } from "./shared/GameClosedSummary";
import { GameResultSummary } from "./shared/GameResultSummary";

interface InstanceClosedSummaryProps {
  instanceId: string;
  currentPlayerId?: string | null;
  className?: string;
}

export function InstanceClosedSummary({
  instanceId,
  currentPlayerId = null,
  className,
}: InstanceClosedSummaryProps) {
  const { closure } = useInstanceLifecycle(instanceId);
  const playerProgress = useInstanceGameplayStore((s) =>
    selectGameplayProgress(s, instanceId),
  );

  // Only render when a closure event has been received.
  if (!closure) return null;

  return (
    <div
      className={className}
      data-testid="instance-closed-summary"
      role="region"
      aria-label="Instance closed"
    >
      {/* Generic closed/cancelled chrome */}
      <GameClosedSummary closure={closure} />

      {/* Final leaderboard + player result overlay */}
      {closure.finalLeaderboard && (
        <div className="mt-6">
          <GameResultSummary
            finalLeaderboard={closure.finalLeaderboard}
            playerProgress={playerProgress}
            currentPlayerId={currentPlayerId}
          />
        </div>
      )}
    </div>
  );
}
