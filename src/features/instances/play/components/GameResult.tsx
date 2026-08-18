"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstanceLifecycle, useLiveLeaderboard } from "@/features/instances/play/hooks";
import { useInstanceGameplayStore, selectGameplayProgress } from "@/features/instances/play/stores/instanceGameplay.store";

import { GameClosedSummary } from "./shared/GameClosedSummary";
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
const playerProgress = useInstanceGameplayStore((s) =>
selectGameplayProgress(s, instanceId),
  );

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
