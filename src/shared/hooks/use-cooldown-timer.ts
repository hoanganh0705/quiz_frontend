"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCooldownTimerOptions {
  /** Tick granularity in milliseconds (defaults to 1000ms). */
  intervalMs?: number;
  /** Invoked when a running cooldown naturally reaches 0. */
  onExpire?: () => void;
}

export interface UseCooldownTimerResult {
  /** Remaining duration in milliseconds (0 when inactive). */
  remainingMs: number;
  /** Remaining duration rounded up to whole seconds (0 when inactive). */
  remainingSeconds: number;
  /** Whether the cooldown is currently active. */
  isActive: boolean;
  /** Start or restart the cooldown for `durationMs` milliseconds. */
  start: (durationMs: number) => void;
  /** Immediately cancel any running cooldown without firing `onExpire`. */
  stop: () => void;
}

export function useCooldownTimer(
  options: UseCooldownTimerOptions = {},
): UseCooldownTimerResult {
  const { intervalMs = 1000, onExpire } = options;

  const [remainingMs, setRemainingMs] = useState(0);
  const endsAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endsAtRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setRemainingMs(0);
  }, [clearTimer]);

  const start = useCallback(
    (durationMs: number) => {
      clearTimer();
      const safeDuration = Math.max(0, Math.floor(durationMs));
      if (safeDuration <= 0) {
        setRemainingMs(0);
        return;
      }

      const endsAt = Date.now() + safeDuration;
      endsAtRef.current = endsAt;
      setRemainingMs(safeDuration);

      intervalRef.current = setInterval(() => {
        if (endsAtRef.current === null) return;
        const nextRemaining = endsAtRef.current - Date.now();
        if (nextRemaining <= 0) {
          clearTimer();
          setRemainingMs(0);
          onExpireRef.current?.();
          return;
        }
        setRemainingMs(nextRemaining);
      }, intervalMs);
    },
    [clearTimer, intervalMs],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return {
    remainingMs,
    remainingSeconds: remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0,
    isActive: remainingMs > 0,
    start,
    stop,
  };
}
