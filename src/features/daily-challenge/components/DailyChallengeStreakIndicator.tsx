import { Flame } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

export interface DailyChallengeStreakIndicatorProps {
  streak: number;
  className?: string;
}

export function DailyChallengeStreakIndicator({
  streak,
  className,
}: DailyChallengeStreakIndicatorProps) {
  return (
    <span
      data-testid="daily-challenge-streak-indicator"
      aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning shadow-2xs font-mono tabular-nums",
        className,
      )}
    >
      <Flame className="h-3.5 w-3.5 text-warning fill-warning" aria-hidden="true" />
      <span aria-hidden="true">
        {streak} {streak === 1 ? "day" : "days"} streak
      </span>
    </span>
  );
}
