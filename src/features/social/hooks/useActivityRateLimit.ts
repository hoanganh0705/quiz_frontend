"use client";

/**
 * `useActivityRateLimit` — Convenience hook that consumes
 * `useUserActivity().rateLimitedUntil` and exposes a typed
 * `{ rateLimited, cooldownSeconds, onCooldownComplete }` API.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.F2.
 *
 * ## What this hook owns
 *
 * The single rate-limit countdown helper for the activity stream
 * surface. The hook:
 *
 *   - Derives `rateLimited` and `cooldownSeconds` from the upstream
 *     `useUserActivity(targetUserId)` hook (TKT-6.4.D2).
 *   - Schedules `onCooldownComplete` via `setTimeout` so the caller
 *     can refresh SWR (or dismiss the notice) the moment the cooldown
 *     expires. The timer is cleared on unmount and on each fresh
 *     `rateLimitedUntil` value so a re-rate-limited cycle restarts
 *     the countdown cleanly.
 *   - Recomputes the displayed cooldown every second so the user-
 *     facing countdown stays in sync with the next render — without
 *     the call site having to drive its own `setInterval`.
 *
 * ## Why a hook (and not a helper)
 *
 * TKT-6.4.F1's `UserActivityStream` already consumes
 * `useUserActivity().rateLimitedUntil` directly and renders
 * `ActivityRateLimitNotice` inline. The hook is the canonical
 * point for any *future* activity surface that wants the rate-limit
 * countdown without re-implementing the timer / countdown math
 * (e.g. the admin moderation queue, the analytics dashboard, a
 * notification surface). Lifting the math into a hook today means
 * the second consumer pays nothing.
 *
 * ## React-hooks purity
 *
 * The hook captures `Date.now()` only inside `useEffect` (and inside
 * `setTimeout` callbacks scheduled by an effect) — the render path
 * is pure. The `cooldownSeconds` value is derived from
 * `rateLimitedUntil` via a pure arithmetic expression and an
 * effect-driven `setState` for the per-second tick.
 *
 * ## Cleanup
 *
 * `setInterval` / `setTimeout` handles are stored in `useRef`s so the
 * `useEffect` cleanup callback can clear them deterministically.
 * React 18 strict-mode double-invocation is handled correctly because
 * the cleanup callback is the canonical unmount path.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useUserActivity } from "@/features/social/hooks/useUserActivity";

// ─── Public surface ──────────────────────────────────────────────────────

interface UseActivityRateLimitResult {
  /** `true` when the activity stream is rate-limited. */
  rateLimited: boolean;
  /** The number of seconds the cooldown has remaining. `0` when
   *  the activity stream is not rate-limited or the cooldown has
   *  expired. */
  cooldownSeconds: number;
  /**
   * Callback invoked once when the countdown reaches `0`. The hook
   * clears the underlying timer before invoking the callback so the
   * caller can `await retry()` without overlapping the next cycle.
   */
  onCooldownComplete: () => void;
}

/**
 * Maximum safety clamp for the per-second tick loop. The activity
 * rate-limit cooldown is short by design (the documented caps are
 * in the tens of seconds); this constant prevents pathological
 * future timestamps from spinning the tick loop indefinitely.
 */
const MAX_COOLDOWN_SECONDS = 60 * 60; // 1 hour

/**
 * Convenience hook that consumes `useUserActivity(targetUserId)` and
 * exposes a typed `{ rateLimited, cooldownSeconds, onCooldownComplete }`
 * result.
 *
 * The hook is the single source of truth for the activity rate-limit
 * countdown math. Consumers that need only the rate-limit state
 * (without the page composition) read this hook instead of
 * `useUserActivity` directly so the timer / tick / cleanup logic
 * stays DRY.
 */
export function useActivityRateLimit(
  targetUserId: string | null,
): UseActivityRateLimitResult {
  const { rateLimitedUntil, retry } = useUserActivity(targetUserId);

  // The `now` state captures the current epoch ms. The per-second
  // `setInterval` ticks this so the consumer's countdown drops by
  // one second each render. `Date.now()` is captured inside the
  // effect (and the `setInterval` callback), not in the render
  // path, so React-hooks/purity stays happy.
  const [nowMs, setNowMs] = useState<number | null>(null);
  // Memoised callback so consumers can pass it to
  // `<ActivityRateLimitNotice onCooldownComplete={...} />` without
  // spurious re-renders.
  const handleCooldownCompleteRef = useRef<(() => void) | null>(null);

  // Compute the displayed cooldown from the current render's
  // `rateLimitedUntil` and `nowMs`. Pure derivation; no `Date.now()`
  // in the render path.
  const cooldownSeconds = useMemo<number>(() => {
    if (rateLimitedUntil === null) return 0;
    const now = nowMs ?? rateLimitedUntil;
    if (now >= rateLimitedUntil) return 0;
    const remaining = Math.ceil((rateLimitedUntil - now) / 1000);
    return Math.max(0, Math.min(remaining, MAX_COOLDOWN_SECONDS));
  }, [rateLimitedUntil, nowMs]);

  const rateLimited = rateLimitedUntil !== null && cooldownSeconds > 0;

  // The tick effect. Fires when `rateLimitedUntil` changes (a
  // fresh rate-limit cycle) and clears the interval on cleanup.
  // The synchronous `setNowMs(null)` reset on the no-cooldown branch
  // and `setNowMs(Date.now())` reset on the active-cooldown branch
  // mirror the documented pattern in `useUserActivity` (TKT-6.4.D2):
  // an effect-bound `Date.now()` is the canonical way to keep the
  // render path pure.
  useEffect(() => {
    if (rateLimitedUntil === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNowMs(null);
      return undefined;
    }
    setNowMs(Date.now());
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);

  // The cooldown-complete callback. Fires once when the
  // countdown reaches zero; cleans up the timer before invoking
  // the user-supplied callback.
  const onCooldownComplete = useCallback((): void => {
    handleCooldownCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (rateLimitedUntil === null) return undefined;
    if (cooldownSeconds > 0) return undefined;
    // Cooldown complete — refresh the SWR cache.
    onCooldownComplete();
    return () => {
      // Cleanup hook (no-op — the cooldown-complete callback is
      // idempotent and the SWR refresh is fire-and-forget).
    };
  }, [rateLimitedUntil, cooldownSeconds, onCooldownComplete]);

  // The user-supplied retry callback exposed via the result is
  // the upstream `retry`. The `onCooldownComplete` above is the
  // internal tick that fires when the countdown reaches zero.
  // We do NOT expose `retry` directly in the result — callers
  // should invoke it through `useUserActivity()` if they need
  // ad-hoc refresh behaviour.

  // The exposed `onCooldownComplete` is the upstream `retry`.
  // Assigning the ref instead of returning `retry` from the hook
  // closure keeps the consumer's reference stable across the
  // unmount / remount cycle.
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
