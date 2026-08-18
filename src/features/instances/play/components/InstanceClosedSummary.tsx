"use client";

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
