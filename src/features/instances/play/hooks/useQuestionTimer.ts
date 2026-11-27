"use client";

import { useEffect, useState } from "react";

import { useInstanceLifecycle } from "./useInstanceLifecycle";
import { useQuestionRevealed } from "./useQuestionRevealed";

export interface UseQuestionTimerResult {
  remainingMs: number;
  totalMs: number;
  isWindowOpen: boolean;
  serverDriftMs: number;
}

const TICK_INTERVAL_MS = 250;

export function useQuestionTimer(
  instanceId: string | null,
): UseQuestionTimerResult {
  const { timing } = useQuestionRevealed(instanceId);
  const { isClosed } = useInstanceLifecycle(instanceId);

  const [tick, setTick] = useState<{ now: number; driftMs: number }>(() => {
    const now = Date.now();
    const serverNowMs = timing ? new Date(timing.serverNow).getTime() : NaN;
    return {
      now,
      driftMs: !Number.isNaN(serverNowMs) ? serverNowMs - now : 0,
    };
  });

  useEffect(() => {
    if (!timing || isClosed) return;

    const serverNowMs = new Date(timing.serverNow).getTime();
    const anchorNow = Date.now();
    const driftMs = !Number.isNaN(serverNowMs) ? serverNowMs - anchorNow : 0;

    const intervalId = setInterval(() => {
      setTick({ now: Date.now(), driftMs });
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [timing, isClosed]);

  if (!timing) {
    return {
      remainingMs: 0,
      totalMs: 0,
      isWindowOpen: false,
      serverDriftMs: 0,
    };
  }

  if (isClosed) {
    return {
      remainingMs: 0,
      totalMs: timing.durationMs,
      isWindowOpen: false,
      serverDriftMs: tick.driftMs,
    };
  }

  const startMs = new Date(timing.startsAt).getTime();
  const endMs = startMs + timing.durationMs;
  const effectiveNow = tick.now + tick.driftMs;

  const remainingMs = Math.min(
    timing.durationMs,
    Math.max(0, endMs - effectiveNow),
  );
  const isWindowOpen = remainingMs > 0;

  return {
    remainingMs,
    totalMs: timing.durationMs,
    isWindowOpen,
    serverDriftMs: tick.driftMs,
  };
}
