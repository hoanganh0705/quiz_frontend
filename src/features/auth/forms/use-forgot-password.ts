"use client";

/**
 * `useForgotPassword` — the React-binding layer over
 * `submitForgotPassword`. Owns the single-flight discipline and the
 * 60-second post-success cooldown.
 *
 * Source epic: Epic 2.3 — Forgot-password and reset-password recovery.
 * Source ticket: TKT-2.3.C3.
 *
 * ## State machine
 *
 *   `'idle'`      — initial; no SDK call has been issued for this
 *                   email.
 *   `'pending'`   — the SDK call is in flight.
 *   `'cooldown'`  — the SDK call settled successfully; the submit
 *                   button is disabled for `cooldownMs`
 *                   milliseconds. The page renders the same neutral
 *                   acknowledgement body for this state as for
 *                   `'error'` with `errorKind: 'acknowledgement'` —
 *                   the cooldown is the visible effect of a
 *                   successful submit, not a separate UI shape.
 *   `'error'`     — the SDK call settled with a mapper-collapsed
 *                   kind. The page renders the same neutral body,
 *                   optionally with an overlay (rate_limited /
 *                   server).
 *
 * ## Single-flight
 *
 * Same pattern as `useRegistrationSubmit` (TKT-2.1.D2) and
 * `useVerifyEmail` (TKT-2.2.C1). A pending call's `Promise` is
 * shared; concurrent `start()` calls return the same reference.
 * The slot releases on settle so the next click can issue a fresh
 * request.
 *
 * ## Cooldown timer
 *
 * On `'cooldown'` the hook starts a `setTimeout` that fires after
 * `cooldownMs` and returns the state to `'idle'`. The
 * `cooldownRemainingMs` field is updated on a `requestAnimationFrame`
 * loop so the page can render a live countdown.
 *
 * The unit suite (TKT-2.3.D3) substitutes a small `cooldownMs`
 * (e.g. `10`) so it does not have to wait 60 s.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  submitForgotPassword,
  defaultSubmitForgotPasswordDeps,
  type SubmitForgotPasswordDeps,
  type ForgotSubmitResult,
} from "./forgot-password-submit";

import {
  FORGOT_PASSWORD_COOLDOWN_MS,
} from "./recovery-cooldown";

export type UseForgotPasswordState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "cooldown" }
  | {
      status: "error";
      errorKind: "rate_limited" | "server" | "acknowledgement";
    };

export interface UseForgotPassword {
  state: UseForgotPasswordState;
  /** Milliseconds until the cooldown releases. `-1` when no cooldown is active. */
  cooldownRemainingMs: number;
  /** Fire the forgot-password submit. Single-flight: returns the in-flight `Promise` on a concurrent call. */
  start: (email: string) => Promise<ForgotSubmitResult>;
  /** Drop the in-flight slot and the cooldown timer; the next `start()` issues a fresh request. */
  reset: () => void;
}

const initialState: UseForgotPasswordState = { status: "idle" };

export function useForgotPassword(
  deps: SubmitForgotPasswordDeps = defaultSubmitForgotPasswordDeps,
): UseForgotPassword {
  const [state, setState] = useState<UseForgotPasswordState>(initialState);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(-1);

  // In-flight slot. Stored in a ref so rapid re-renders do not
  // re-create it.
  const inFlightRef = useRef<Promise<ForgotSubmitResult> | null>(null);

  // Cooldown timer. Stored in a ref so the cleanup can clear it
  // and any subsequent `start()` can replace it.
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownStartedAtRef = useRef<number | null>(null);
  const cooldownDurationRef = useRef<number>(FORGOT_PASSWORD_COOLDOWN_MS);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Stop the cooldown timer, the animation-frame loop, and reset
   * the countdown field. Idempotent.
   */
  const stopCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    cooldownStartedAtRef.current = null;
    setCooldownRemainingMs(-1);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopCooldown();
    };
  }, [stopCooldown]);

  /**
   * Tick the cooldown countdown using a `requestAnimationFrame`
   * loop. The countdown is recomputed on every frame so the UI
   * can show a live "we'll send another email in N seconds"
   * message. The `setTimeout` is the canonical release; the
   * animation loop is a UI nicety.
   */
  const startCooldownTicker = useCallback(
    (durationMs: number) => {
      cooldownStartedAtRef.current = Date.now();
      cooldownDurationRef.current = durationMs;
      setCooldownRemainingMs(durationMs);

      const tick = () => {
        if (cooldownStartedAtRef.current === null) return;
        const remaining = Math.max(
          0,
          cooldownDurationRef.current -
            (Date.now() - cooldownStartedAtRef.current),
        );
        setCooldownRemainingMs(remaining);
        if (remaining > 0) {
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
      animationFrameRef.current = requestAnimationFrame(tick);

      cooldownTimerRef.current = setTimeout(() => {
        stopCooldown();
        setState({ status: "idle" });
      }, durationMs);
    },
    [stopCooldown],
  );

  const start = useCallback(
    (email: string): Promise<ForgotSubmitResult> => {
      // Single-flight: a pending call's Promise is shared.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setState({ status: "pending" });

      const promise = submitForgotPassword(email, deps).then((result) => {
        // Release the slot on settle so the next click can issue
        // a fresh request.
        inFlightRef.current = null;
        if (result.kind === "cooldown") {
          setState({ status: "cooldown" });
          startCooldownTicker(result.cooldownMs);
        } else {
          // The mapper returns either 'rate_limited', 'server', or
          // 'acknowledgement'. The page renders the same neutral
          // body for all three; the discriminator is for the
          // overlay copy.
          setState({
            status: "error",
            errorKind: result.errorKind as
              | "rate_limited"
              | "server"
              | "acknowledgement",
          });
        }
        return result;
      });

      inFlightRef.current = promise;
      return promise;
    },
    [deps, startCooldownTicker],
  );

  const reset = useCallback(() => {
    inFlightRef.current = null;
    stopCooldown();
    setState(initialState);
  }, [stopCooldown]);

  return { state, cooldownRemainingMs, start, reset };
}