"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Zap } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

export interface InstanceCountdownBannerProps {
  countdownStartedAt?: string | null;
  durationSeconds?: number;
  onComplete?: () => void;
  className?: string;
}

function computeSecondsRemaining(
  countdownStartedAt: string | null | undefined,
  durationSeconds: number,
): number {
  if (countdownStartedAt) {
    const elapsed = (Date.now() - new Date(countdownStartedAt).getTime()) / 1000;
    return Math.max(0, Math.ceil(durationSeconds - elapsed));
  }
  return durationSeconds;
}

export function InstanceCountdownBanner({
  countdownStartedAt = null,
  durationSeconds = 5,
  onComplete,
  className,
}: InstanceCountdownBannerProps) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    computeSecondsRemaining(countdownStartedAt, durationSeconds),
  );
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = countdownStartedAt
      ? new Date(countdownStartedAt).getTime()
      : (startTimeRef.current ?? Date.now());
    startTimeRef.current = startTime;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const left = Math.max(0, Math.ceil(durationSeconds - elapsed));
      setSecondsRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [countdownStartedAt, durationSeconds]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-6 shadow-lg shadow-amber-500/10 dark:border-amber-400/40",
        className,
      )}
      data-testid="instance-countdown-banner"
      role="status"
      aria-live="assertive"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
            <Timer className="h-8 w-8 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Match is starting soon!
              </h3>
              <Zap className="h-5 w-5 text-amber-500 animate-bounce" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Get ready! The quiz will begin automatically when the timer reaches zero.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl bg-card/80 border border-border/60 px-6 py-3 shadow-inner">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Starting in
          </span>
          <span className="font-mono text-4xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400 animate-pulse">
            {secondsRemaining}s
          </span>
        </div>
      </div>
    </div>
  );
}
