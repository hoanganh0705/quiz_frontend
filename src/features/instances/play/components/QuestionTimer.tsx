"use client";

import { useQuestionTimer } from "@/features/instances/play/hooks";
import { useInstanceGameSocket } from "@/features/instances/play/hooks";

import { GameStaleState } from "./shared/GameStaleState";
import { GameConnectionStatus } from "./shared/GameConnectionStatus";

interface QuestionTimerProps {
instanceId: string;
className?: string;
}

function formatDuration(ms: number): string {
if (ms <= 0) return "0s";
const totalSeconds = Math.ceil(ms / 1000);
const minutes = Math.floor(totalSeconds / 60);
const seconds = totalSeconds % 60;
if (minutes > 0) {
return `${minutes}m ${seconds}s`;
  }
return `${seconds}s`;
}

export function QuestionTimer({ instanceId, className }: QuestionTimerProps) {
const { remainingMs, totalMs, isWindowOpen } = useQuestionTimer(instanceId);
const { connectionState } = useInstanceGameSocket(instanceId);

const isConnected = connectionState === "connected";
const progress = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;

return (
<div
className={className}
data-testid="question-timer"
role="timer"
aria-label="Answer window countdown"
aria-live="off"
    >
{/* Connection status overlay */}
{!isConnected && (
<div className="mb-3">
<GameConnectionStatus connectionState={connectionState} />
</div>
      )}

{/* Stale banner */}
{isConnected && remainingMs > 0 && (
<GameStaleState className="mb-3" />
      )}

{/* Timer display */}
<div className="space-y-1.5">
<div className="flex items-center justify-between text-sm">
<span className="font-medium text-foreground">
{isWindowOpen ? "Time remaining" : "Window closed"}
</span>
<span
className="font-mono tabular-nums font-semibold"
data-testid="timer-remaining"
aria-label={`${formatDuration(remainingMs)} remaining`}
          >
{formatDuration(remainingMs)}
</span>
</div>

{/* Progress bar */}
<div
className="h-2 w-full rounded-full bg-muted overflow-hidden"
role="progressbar"
aria-valuenow={remainingMs}
aria-valuemin={0}
aria-valuemax={totalMs}
        >
<div
className={`h-full rounded-full transition-all duration-100 ${
isWindowOpen
? "bg-primary"
: "bg-muted-foreground/30"
}`}
data-testid="timer-progress"
style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
</div>

{/* Window status indicator */}
<p
className="text-xs text-muted-foreground text-right"
data-testid="timer-status"
        >
{isWindowOpen
? `Window open · ${formatDuration(totalMs)} total`
: "Answer window has closed"}
</p>
</div>
</div>
  );
}
