"use client";

import { cn } from "@/shared/utils/merge-class-names";

import {
  useInstanceLifecycle,
  useLiveLeaderboard,
} from "@/features/instances/play/hooks";
import {
  useInstanceGameplayStore,
  selectGameplayProgress,
  selectGameplayFinalLeaderboard,
} from "@/features/instances/play/stores/instanceGameplay.store";

import { GameResultSummary as SharedGameResultSummary } from "./shared/GameResultSummary";

interface GameResultProps {
  instanceId: string;
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
  const storeFinal = useInstanceGameplayStore((s) =>
    selectGameplayFinalLeaderboard(s, instanceId),
  );
  const playerProgress = useInstanceGameplayStore((s) =>
    selectGameplayProgress(s, instanceId),
  );

  const finalLeaderboard =
    final ?? storeFinal ?? closure?.finalLeaderboard ?? null;

  if (!closure && !finalLeaderboard) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="game-result">
      {/* Final leaderboard and victory summary */}
      <SharedGameResultSummary
        instanceId={instanceId}
        finalLeaderboard={finalLeaderboard}
        playerProgress={playerProgress}
        currentPlayerId={currentPlayerId}
      />
    </div>
  );
}
