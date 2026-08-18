"use client";

import {
useCallback,
useEffect,
useMemo,
useRef,
useState,
} from "react";

const MAX_COOLDOWN_SECONDS = 60 * 60;

export interface UseSearchRateLimitResult {

readonly rateLimitedUntil: number | null;

readonly remainingSeconds: number;

readonly isRateLimited: boolean;

readonly onCooldownComplete: (cb: () => void) => void;
}

export function useSearchRateLimit(
cooldownSeconds: number | null,
): UseSearchRateLimitResult {

const rateLimitedUntil = useMemo<number | null>(() => {
if (cooldownSeconds === null || cooldownSeconds <= 0) return null;
return Date.now() + cooldownSeconds * 1000;
  }, [cooldownSeconds]);

const [nowMs, setNowMs] = useState<number | null>(null);

type CompletionCallback = () => void;
const onCooldownCompleteRef = useRef<CompletionCallback | null>(null);

const onCooldownComplete = useCallback((cb: CompletionCallback) => {
onCooldownCompleteRef.current = cb;
  }, []);

const remainingSeconds = useMemo<number>(() => {
if (rateLimitedUntil === null) return 0;
const now = nowMs ?? rateLimitedUntil;
if (now >= rateLimitedUntil) return 0;
const remaining = Math.ceil((rateLimitedUntil - now) / 1000);
return Math.max(0, Math.min(remaining, MAX_COOLDOWN_SECONDS));
  }, [rateLimitedUntil, nowMs]);

const isRateLimited = rateLimitedUntil !== null && remainingSeconds > 0;

useEffect(() => {
if (rateLimitedUntil === null) {
setNowMs(null);
return;
    }

setNowMs(Date.now());

const tick = () => {
setNowMs(Date.now());
    };

const intervalId = setInterval(tick, 1000);

return () => {
clearInterval(intervalId);
    };
  }, [rateLimitedUntil]);

useEffect(() => {
if (remainingSeconds > 0) return;

if (rateLimitedUntil === null) return;

const cb = onCooldownCompleteRef.current;
if (!cb) return;

onCooldownCompleteRef.current = null;
cb();
  }, [remainingSeconds, rateLimitedUntil]);

return {
rateLimitedUntil,
remainingSeconds,
isRateLimited,
onCooldownComplete,
  };
}
