"use client";

import { useSyncExternalStore, useMemo } from "react";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useQuestionRevealed } from "./useQuestionRevealed";
import { useInstanceLifecycle } from "./useInstanceLifecycle";

export interface UseQuestionTimerResult {
  remainingMs: number;
  totalMs: number;
  isWindowOpen: boolean;
  serverDriftMs: number;
}

const TICK_INTERVAL_MS = 50;

let currentClock = typeof window !== "undefined" ? Date.now() : 0;
const clockListeners = new Set<() => void>();
let clockInterval: ReturnType<typeof setInterval> | null = null;

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (clockListeners.size === 1) {
    currentClock = Date.now();
    clockInterval = setInterval(() => {
      currentClock = Date.now();
      clockListeners.forEach((l) => l());
    }, TICK_INTERVAL_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockInterval !== null) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  };
}

function getClockSnapshot(): number {
  return currentClock;
}

function getClockServerSnapshot(): number {
  return 0;
}

export function useQuestionTimer(
  instanceId: string | null,
): UseQuestionTimerResult {
  const flagValue = getFeatureFlagValue("multiplayer_play_live");
  const isPlaceholder = flagValue === "placeholder";

  const { timing } = useQuestionRevealed(instanceId);
  const { isClosed } = useInstanceLifecycle(instanceId);

  const clockNow = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );

  const serverDriftMs = useMemo(() => {
    if (!timing || clockNow === 0) return 0;
    const serverNowMs = new Date(timing.serverNow).getTime();
    return serverNowMs - clockNow;
  }, [timing, clockNow]);

  if (isPlaceholder || !timing) {
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
      serverDriftMs,
    };
  }

  const startMs = new Date(timing.startsAt).getTime();
  const endMs = startMs + timing.durationMs;
  const effectiveNow = clockNow > 0 ? clockNow + serverDriftMs : startMs;

  const remainingMs = Math.max(0, endMs - effectiveNow);
  const isWindowOpen = effectiveNow >= startMs && effectiveNow < endMs;

  return {
    remainingMs,
    totalMs: timing.durationMs,
    isWindowOpen,
    serverDriftMs,
  };
}
