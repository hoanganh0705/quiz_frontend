"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
useInstanceLifecycle,
useReconnectReconciliation,
} from "@/features/instances/play/hooks";

import { GameConnectionStatus } from "./shared/GameConnectionStatus";
import { GameSkeleton } from "./shared/GameSkeleton";
import { GameEmptyState } from "./shared/GameEmptyState";

import { QuestionCard } from "./QuestionCard";
import { AnswerOptions } from "./AnswerOptions";
import { QuestionTimer } from "./QuestionTimer";
import { GameAnswerSubmissionState } from "./AnswerSubmissionState";
import { PlayerProgressPanel } from "./PlayerProgressPanel";
import { LiveLeaderboard } from "./LiveLeaderboard";
import { GameResult } from "./GameResult";
import { InstanceClosedSummary } from "./InstanceClosedSummary";
import { ReconnectDuringGameNotice } from "./ReconnectDuringGameNotice";

interface InstanceGameViewProps {
instanceId: string;
className?: string;
}

function PlaceholderView({ className }: { className?: string }) {
return (
<div
className={className}
data-testid="game-placeholder"
role="status"
    >
<GameEmptyState />
<p className="text-xs text-muted-foreground text-center mt-4">
Gameplay features are currently under development.
      </p>
</div>
  );
}

export function InstanceGameView({ instanceId, className }: InstanceGameViewProps) {
const { currentUser } = useAuth();
const currentPlayerId = currentUser?.userId ?? null;

const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";

const { closure } = useInstanceLifecycle(instanceId);
const { isReconciling } = useReconnectReconciliation(instanceId);

const isClosed =
closure !== null &&
(closure.status === "closed" || closure.status === "cancelled");

if (isPlaceholder) {
return (
<div className={className}>
<PlaceholderView />
</div>
    );
  }

if (isClosed) {
return (
<div className={className} data-testid="instance-game-view">
{/* Connection status */}
<div className="mb-4">
<GameConnectionStatus connectionState="disconnected" />
</div>

<InstanceClosedSummary
instanceId={instanceId}
currentPlayerId={currentPlayerId}
        />
</div>
    );
  }

return (
<div
className={className}
data-testid="instance-game-view"
role="main"
aria-label="Game session"
    >
{/* Connection status */}
<div className="mb-4">
<GameConnectionStatus connectionState="connected" />
</div>

{/* Reconnect notice */}
<div className="mb-4">
<ReconnectDuringGameNotice instanceId={instanceId} />
</div>

{/* Two-column layout: main content + sidebar */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
{/* Main column: question + options + timer + submission */}
<div className="lg:col-span-2 space-y-6">
{/* Question */}
<section aria-label="Question">
<QuestionCard instanceId={instanceId} />
</section>

{/* Options */}
<section aria-label="Answer options">
<AnswerOptions instanceId={instanceId} />
</section>

{/* Timer */}
<section aria-label="Timer">
<QuestionTimer instanceId={instanceId} />
</section>

{/* Submission state */}
<section aria-label="Submission status">
<GameAnswerSubmissionState instanceId={instanceId} />
</section>
</div>

{/* Sidebar: progress + leaderboard */}
<div className="space-y-6">
{/* Player progress */}
<section aria-label="Your progress">
<PlayerProgressPanel instanceId={instanceId} />
</section>

{/* Live leaderboard */}
<section aria-label="Leaderboard">
<LiveLeaderboard
instanceId={instanceId}
currentPlayerId={currentPlayerId}
            />
</section>
</div>
</div>

{/* Post-game result overlay (when closure received) */}
{closure && !isClosed && closure.finalLeaderboard && (
<div className="mt-6 pt-6 border-t">
<GameResult
instanceId={instanceId}
currentPlayerId={currentPlayerId}
          />
</div>
      )}
</div>
  );
}
