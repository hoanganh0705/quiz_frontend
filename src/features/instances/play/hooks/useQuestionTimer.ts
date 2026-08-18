"use client";

import { useEffect, useRef, useState } from "react";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { type QuestionTimingDto } from "../types/gameplay.types";
import { useQuestionRevealed } from "./useQuestionRevealed";
import { useInstanceLifecycle } from "./useInstanceLifecycle";

export interface UseQuestionTimerResult {

remainingMs: number;

totalMs: number;

isWindowOpen: boolean;

serverDriftMs: number;
}

const TICK_INTERVAL_MS = 50;

export function useQuestionTimer(
instanceId: string | null,
): UseQuestionTimerResult {
const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";

const { timing } = useQuestionRevealed(instanceId);
const { isClosed } = useInstanceLifecycle(instanceId);

const serverDriftMsRef = useRef(0);
const lastServerNowMsRef = useRef(0);

useEffect(() => {
if (!timing) return;

const serverNowMs = new Date(timing.serverNow).getTime();
const clientNowMs = Date.now();

if (serverNowMs > lastServerNowMsRef.current) {
serverDriftMsRef.current = serverNowMs - clientNowMs;
lastServerNowMsRef.current = serverNowMs;
    }
  }, [timing]);

const effectiveNowMsRef = useRef(Date.now());

useEffect(() => {
if (isPlaceholder || isClosed) return;

const tick = () => {
effectiveNowMsRef.current = Date.now();
    };

const interval = setInterval(tick, TICK_INTERVAL_MS);
return () => clearInterval(interval);
  }, [isPlaceholder, isClosed]);

const derived = (): {
remainingMs: number;
totalMs: number;
isWindowOpen: boolean;
serverDriftMs: number;
  } => {
if (isPlaceholder || !timing) {
return { remainingMs: 0, totalMs: 0, isWindowOpen: false, serverDriftMs: 0 };
    }
if (isClosed) {
return { remainingMs: 0, totalMs: timing.durationMs, isWindowOpen: false, serverDriftMs: serverDriftMsRef.current };
    }

const startMs = new Date(timing.startsAt).getTime();
const endMs = startMs + timing.durationMs;

const nowMs = effectiveNowMsRef.current + serverDriftMsRef.current;

const remainingMs = Math.max(0, endMs - nowMs);
const isWindowOpen = nowMs >= startMs && nowMs < endMs;

return {
remainingMs,
totalMs: timing.durationMs,
isWindowOpen,
serverDriftMs: serverDriftMsRef.current,
    };
  };

const [, forceUpdate] = useState({});
const timingRef = useRef(timing);
timingRef.current = timing;

useEffect(() => {
if (isPlaceholder || isClosed) return;

const interval = setInterval(() => {

forceUpdate({});
    }, 100);

return () => clearInterval(interval);
  }, [isPlaceholder, isClosed]);

const result = derived();

return result;
}
