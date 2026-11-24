"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export interface RankingCooldownNoticeProps {
  cooldownRemaining: number | null;
}

function formatCountdown(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function RankingCooldownNotice({
  cooldownRemaining,
}: RankingCooldownNoticeProps) {
  const [prevCooldown, setPrevCooldown] = useState(cooldownRemaining);
  const [secondsRemaining, setSecondsRemaining] = useState(cooldownRemaining);

  if (cooldownRemaining !== prevCooldown) {
    setPrevCooldown(cooldownRemaining);
    setSecondsRemaining(cooldownRemaining);
  }

  useEffect(() => {
    if (cooldownRemaining === null || cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) =>
        prev !== null && prev > 0 ? prev - 1 : 0,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  if (cooldownRemaining === null) {
    return null;
  }

  const displaySeconds = Math.max(0, secondsRemaining ?? cooldownRemaining);

  return (
    <div
      data-testid="ranking-cooldown-notice"
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 dark:bg-warning/15 px-3 py-2 text-sm text-foreground"
    >
      <Clock className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        Cooldown active. You can retry in{" "}
        <span
          data-testid="ranking-cooldown-countdown"
          className="font-mono font-semibold tabular-nums text-warning"
        >
          {formatCountdown(displaySeconds)}
        </span>
        .
      </span>
    </div>
  );
}
