"use client";

import {
  useInstanceLifecycle,
  useLiveLeaderboard,
} from "@/features/instances/play/hooks";
import {
  useInstanceGameplayStore,
  selectGameplayProgress,
  selectGameplayFinalLeaderboard,
} from "@/features/instances/play/stores/instanceGameplay.store";

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
  const { final: hookFinalLeaderboard } = useLiveLeaderboard(instanceId);
  const storeFinalLeaderboard = useInstanceGameplayStore((s) =>
    selectGameplayFinalLeaderboard(s, instanceId),
  );
  const playerProgress = useInstanceGameplayStore((s) =>
    selectGameplayProgress(s, instanceId),
  );

  if (!closure) return null;

  const finalLeaderboard =
    closure.finalLeaderboard ?? storeFinalLeaderboard ?? hookFinalLeaderboard;

  const isCompletedGame =
    closure.status === "finished" ||
    closure.reason === "normal" ||
    closure.reason === "completed" ||
    finalLeaderboard !== null;

  return (
    <div
      className={className}
      data-testid="instance-closed-summary"
      role="region"
      aria-label="Instance closed"
    >
      {isCompletedGame ? (
        <GameResultSummary
          instanceId={instanceId}
          finalLeaderboard={finalLeaderboard}
          playerProgress={playerProgress}
          currentPlayerId={currentPlayerId}
        />
      ) : (
        <GameClosedSummary closure={closure} instanceId={instanceId} />
      )}
    </div>
  );
}
