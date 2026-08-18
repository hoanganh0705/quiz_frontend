"use client";

import {
useCallback,
useEffect,
useMemo,
useRef,
useState,
} from "react";

import { useUserActivity } from "@/features/social/hooks/useUserActivity";

interface UseActivityRateLimitResult {

rateLimited: boolean;

cooldownSeconds: number;

onCooldownComplete: () => void;
}

const MAX_COOLDOWN_SECONDS = 60 * 60;

export function useActivityRateLimit(
targetUserId: string | null,
): UseActivityRateLimitResult {
const { rateLimitedUntil, retry } = useUserActivity(targetUserId);

const [nowMs, setNowMs] = useState<number | null>(null);

const handleCooldownCompleteRef = useRef<(() => void) | null>(null);

const cooldownSeconds = useMemo<number>(() => {
if (rateLimitedUntil === null) return 0;
const now = nowMs ?? rateLimitedUntil;
if (now >= rateLimitedUntil) return 0;
const remaining = Math.ceil((rateLimitedUntil - now) / 1000);
return Math.max(0, Math.min(remaining, MAX_COOLDOWN_SECONDS));
  }, [rateLimitedUntil, nowMs]);

const rateLimited = rateLimitedUntil !== null && cooldownSeconds > 0;

useEffect(() => {
if (rateLimitedUntil === null) {

setNowMs(null);
return undefined;
    }
setNowMs(Date.now());
const id = setInterval(() => {
setNowMs(Date.now());
    }, 1_000);
return () => clearInterval(id);
  }, [rateLimitedUntil]);

const onCooldownComplete = useCallback((): void => {
handleCooldownCompleteRef.current?.();
  }, []);

useEffect(() => {
if (rateLimitedUntil === null) return undefined;
if (cooldownSeconds > 0) return undefined;

onCooldownComplete();
return () => {
      // Cleanup hook (no-op — the cooldown-complete callback is
      // idempotent and the SWR refresh is fire-and-forget).
    };
  }, [rateLimitedUntil, cooldownSeconds, onCooldownComplete]);

useEffect(() => {
handleCooldownCompleteRef.current = (): void => {
void retry();
    };
return () => {
handleCooldownCompleteRef.current = null;
    };
  }, [retry]);

return {
rateLimited,
cooldownSeconds,
onCooldownComplete: (): void => {
handleCooldownCompleteRef.current?.();
    },
  };
}
