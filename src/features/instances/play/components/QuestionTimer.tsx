"use client";

import { Clock } from "lucide-react";

import {
  useInstanceGameSocket,
  useQuestionTimer,
} from "@/features/instances/play/hooks";

import { cn } from "@/shared/utils/merge-class-names";

import { GameConnectionStatus } from "./shared/GameConnectionStatus";

interface QuestionTimerProps {
  instanceId: string;
  className?: string;
}

export function formatBattleCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function QuestionTimer({ instanceId, className }: QuestionTimerProps) {
  const { remainingMs, totalMs, isWindowOpen } = useQuestionTimer(instanceId);
  const { connectionState } = useInstanceGameSocket(instanceId);

  const isConnected = connectionState === "connected";
  const progress = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
  const isCritical = isWindowOpen && remainingMs <= 10_000;
  const isWarning = isWindowOpen && !isCritical && remainingMs <= 30_000;

  return (
    <div
      className={cn("space-y-1.5", className)}
      data-testid="question-timer"
      role="timer"
      aria-label="Battle time remaining"
      aria-live="off"
    >
      {!isConnected && connectionState !== "idle" ? (
        <div className="mb-2">
          <GameConnectionStatus connectionState={connectionState} />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
          <Clock
            className={cn(
              "h-4 w-4 shrink-0",
              isCritical
                ? "text-destructive"
                : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-brand",
            )}
            aria-hidden="true"
          />
          <span>{isWindowOpen ? "Time left" : "Time's up"}</span>
        </span>
        <span
          className={cn(
            "font-mono text-base font-bold tabular-nums",
            isCritical
              ? "text-destructive"
              : isWarning
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground",
          )}
          data-testid="timer-remaining"
          aria-label={`${formatBattleCountdown(remainingMs)} remaining`}
        >
          {formatBattleCountdown(remainingMs)}
        </span>
      </div>

      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={remainingMs}
        aria-valuemin={0}
        aria-valuemax={totalMs}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-150",
            isCritical
              ? "bg-destructive"
              : isWarning
                ? "bg-amber-500"
                : isWindowOpen
                  ? "bg-brand"
                  : "bg-muted-foreground/30",
          )}
          data-testid="timer-progress"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
}
