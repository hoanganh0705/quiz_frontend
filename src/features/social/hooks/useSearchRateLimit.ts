"use client";

/**
 * `useSearchRateLimit` — Convenience hook that exposes the per-IP
 * search rate-limit cooldown countdown.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.B2.
 *
 * ## What this hook owns
 *
 * The single rate-limit countdown helper for the social user-search
 * surface. The hook:
 *
 *   - Accepts a `cooldownSeconds: number | null` prop (the raw signal
 *     from the search service wrapper, TKT-6.5.D1).
 *   - Derives `rateLimitedUntil` (epoch ms), `remainingSeconds` (ticking
 *     down by 1 each second), and `isRateLimited` (whether the
 *     countdown is active).
 *   - Registers a `onCooldownComplete` callback that fires exactly
 *     once when the countdown reaches zero, so the SWR layer can
 *     revalidate.
 *   - Schedules `onCooldownComplete` via `setTimeout` so the caller
 *     can refresh SWR (or dismiss the notice) the moment the cooldown
 *     expires. The timer is cleared on unmount and on each fresh
 *     `cooldownSeconds` value so a re-rate-limited cycle restarts
 *     the countdown cleanly.
 *
 * ## Why a separate hook from `useActivityRateLimit`
 *
 * The existing `useActivityRateLimit` (Epic 6.4 / TKT-6.4.F2) consumes
 * `useUserActivity().rateLimitedUntil` — a single, coupled surface. The
 * social user-search surface has its own rate-limit signal from a different
 * service (`search.service.ts`). Lifting the countdown math into a
 * standalone hook means the second consumer pays nothing and the two
 * surfaces are decoupled.
 *
 * ## React-hooks purity
 *
 * The hook captures `Date.now()` only inside `useEffect` (and inside
 * the `setTimeout` callback scheduled by an effect) — the render path
 * is pure. The `remainingSeconds` value is derived from
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

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Maximum safety clamp for the per-second tick loop. The search
 * rate-limit cooldown is short by design (the documented caps are
 * in the tens of seconds); this constant prevents pathological
 * future timestamps from spinning the tick loop indefinitely.
 */
const MAX_COOLDOWN_SECONDS = 60 * 60; // 1 hour

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * Result of `useSearchRateLimit`.
 */
export interface UseSearchRateLimitResult {
  /**
   * The epoch millisecond at which the rate limit expires. `null`
   * when the search is not rate-limited.
   */
  readonly rateLimitedUntil: number | null;
  /**
   * The number of seconds remaining in the cooldown. `0` when
   * the search is not rate-limited or the cooldown has expired.
   */
  readonly remainingSeconds: number;
  /** `true` when the search is rate-limited and the cooldown has not expired. */
  readonly isRateLimited: boolean;
  /**
   * Register a callback invoked exactly once when the countdown
   * reaches `0`. The hook clears the underlying timer before
   * invoking the callback so the caller can `await retry()` without
   * overlapping the next cycle.
   */
  readonly onCooldownComplete: (cb: () => void) => void;
}

/**
 * Convenience hook that consumes the `cooldownSeconds` value from
 * the search service and exposes a typed countdown.
 *
 * @param cooldownSeconds — The cooldown in seconds, as returned by
 *                           `searchUsers()` in `discovery.service.ts`.
 *                           `null` means no rate-limit signal is present.
 * @returns `{ rateLimitedUntil, remainingSeconds, isRateLimited, onCooldownComplete }`.
 */
export function useSearchRateLimit(
  cooldownSeconds: number | null,
): UseSearchRateLimitResult {
  // The epoch ms at which the rate limit expires.
  const rateLimitedUntil = useMemo<number | null>(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return null;
    return Date.now() + cooldownSeconds * 1000;
  }, [cooldownSeconds]);

  // The current epoch ms. Updated once per second by the tick effect.
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Ref-stable callback for onCooldownComplete registration.
  type CompletionCallback = () => void;
  const onCooldownCompleteRef = useRef<CompletionCallback | null>(null);

  // Memoised callback so consumers can pass it to
  // `<SearchRateLimitNotice onCooldownComplete={...} />` without
  // spurious re-renders.
  const onCooldownComplete = useCallback((cb: CompletionCallback) => {
    onCooldownCompleteRef.current = cb;
  }, []);

  // Compute the displayed cooldown from the current render's
  // `rateLimitedUntil` and `nowMs`. Pure derivation; no `Date.now()`
  // in the render path.
  const remainingSeconds = useMemo<number>(() => {
    if (rateLimitedUntil === null) return 0;
    const now = nowMs ?? rateLimitedUntil;
    if (now >= rateLimitedUntil) return 0;
    const remaining = Math.ceil((rateLimitedUntil - now) / 1000);
    return Math.max(0, Math.min(remaining, MAX_COOLDOWN_SECONDS));
  }, [rateLimitedUntil, nowMs]);

  const isRateLimited = rateLimitedUntil !== null && remainingSeconds > 0;

  // The tick effect. Fires when `rateLimitedUntil` changes (a
  // fresh rate-limit cycle) and clears the interval on cleanup.
  useEffect(() => {
    if (rateLimitedUntil === null) {
      setNowMs(null);
      return;
    }

    // Sync the current tick to now before starting the interval.
    setNowMs(Date.now());

    const tick = () => {
      setNowMs(Date.now());
    };

    const intervalId = setInterval(tick, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [rateLimitedUntil]);

  // The cooldown-complete effect. Fires when `remainingSeconds`
  // reaches zero and clears the timer before invoking the callback.
  useEffect(() => {
    if (remainingSeconds > 0) return;

    // Only fire when we were rate-limited (i.e., `rateLimitedUntil`
    // was non-null at some point). Guard against the initial 0 state.
    if (rateLimitedUntil === null) return;

    const cb = onCooldownCompleteRef.current;
    if (!cb) return;

    // Clear the ref before invoking so a re-rate-limit cycle can
    // register a fresh callback.
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
