'use client';

/**
 * `useResendVerification` — the React-binding layer over
 * `submitResendVerification`. Owns the single-flight discipline
 * AND the cooldown timer.
 *
 * Source epic: Epic 2.2 — Email verification and resend.
 * Source ticket: TKT-2.2.D2.
 *
 * ## State machine
 *
 *   `'idle'`     — initial; no SDK call has been issued.
 *   `'pending'`  — the SDK call is in flight.
 *   `'cooldown'` — a successful response returned; the submit
 *                  button is disabled until the cooldown elapses.
 *                  `cooldownRemainingMs` is exposed so the page
 *                  can render a countdown.
 *   `'error'`    — the SDK call rejected; the error was mapped
 *                  to `rate_limited` or `server` by the B2
 *                  mapper. The submit button is re-enabled.
 *
 * ## Single-flight
 *
 * Same pattern as `useRegistrationSubmit` and `useVerifyEmail`.
 * A pending call's `Promise` is shared; concurrent `start()`
 * calls return the same reference. The slot releases on settle
 * so the next click can issue a fresh request.
 *
 * ## Cooldown
 *
 * The cooldown starts on a successful response (the helper
 * returns `{ kind: 'cooldown', cooldownMs }`). The hook enters
 * the `'cooldown'` state, exposes `cooldownRemainingMs`, and
 * schedules a `setTimeout` to release the lock. During the
 * cooldown, `start()` is a no-op (it returns a resolved
 * `'cooldown'` result without issuing a request).
 *
 * `Date.now()` is OK here — the hook is not a pure function,
 * and the cooldown is a wall-clock artefact. The vitest suite
 * uses `vi.useFakeTimers()` to keep the test deterministic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  submitResendVerification,
  defaultSubmitResendDeps,
  RESEND_COOLDOWN_MS,
  type SubmitResendVerificationDeps,
  type ResendSubmitResult,
} from './resend-verification-submit';
import type { ResendVerificationFormValues } from './schemas/resend-verification.schema';

export type UseResendVerificationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | {
      status: 'cooldown';
      /** Total cooldown duration in milliseconds (snapshot at success). */
      cooldownMs: number;
      /** Ms remaining; updated on a `requestAnimationFrame` tick. */
      cooldownRemainingMs: number;
    }
  | { status: 'error'; errorKind: 'rate_limited' | 'server' };

export interface UseResendVerification {
  state: UseResendVerificationState;
  /**
   * Fire the resend submit. Single-flight against pending;
   * no-op against cooldown (returns `{ kind: 'cooldown' }`).
   */
  start: (values: ResendVerificationFormValues) => Promise<ResendSubmitResult>;
  /** Drop the in-flight slot AND exit the cooldown; the next `start()` issues a fresh request. */
  reset: () => void;
}

const initialState: UseResendVerificationState = { status: 'idle' };

export function useResendVerification(
  deps: SubmitResendVerificationDeps = defaultSubmitResendDeps
): UseResendVerification {
  const [state, setState] = useState<UseResendVerificationState>(initialState);

  // In-flight slot. Stored in a ref so rapid re-renders do not
  // re-create it.
  const inFlightRef = useRef<Promise<ResendSubmitResult> | null>(null);

  // Cooldown timer handle. Stored in a ref so cleanup can
  // cancel the timer without re-rendering.
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownEndsAtRef = useRef<number | null>(null);

  // Cancel any in-flight timer on unmount.
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      cooldownEndsAtRef.current = null;
      inFlightRef.current = null;
    };
  }, []);

  const exitCooldown = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    cooldownEndsAtRef.current = null;
    setState(initialState);
  }, []);

  const start = useCallback(
    (values: ResendVerificationFormValues): Promise<ResendSubmitResult> => {
      // Cooldown guard: a successful response set a wall-clock
      // deadline. While the deadline is in the future, no
      // request is issued. The helper isn't called at all.
      if (state.status === 'cooldown' && cooldownEndsAtRef.current) {
        if (Date.now() < cooldownEndsAtRef.current) {
          // Synthesize a re-settled cooldown result so the
          // caller can render identically.
          return Promise.resolve({
            kind: 'cooldown',
            cooldownMs: Math.max(
              0,
              cooldownEndsAtRef.current - Date.now()
            ),
          } as ResendSubmitResult);
        }
        // Deadline elapsed; exit cooldown and fall through.
        exitCooldown();
      }

      // Single-flight: a pending call's Promise is shared.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setState({ status: 'pending' });

      const promise = submitResendVerification(values, deps).then((result) => {
        inFlightRef.current = null;
        if (result.kind === 'cooldown') {
          const endsAt = Date.now() + result.cooldownMs;
          cooldownEndsAtRef.current = endsAt;
          setState({
            status: 'cooldown',
            cooldownMs: result.cooldownMs,
            cooldownRemainingMs: result.cooldownMs,
          });
          // Tick the `cooldownRemainingMs` field once a second so
          // the UI can render a countdown. `setInterval` is fine
          // here — the hook owns it and clears it on transition.
          cooldownTimerRef.current = setInterval(() => {
            if (cooldownEndsAtRef.current == null) return;
            const remaining = cooldownEndsAtRef.current - Date.now();
            if (remaining <= 0) {
              exitCooldown();
              return;
            }
            setState((prev) =>
              prev.status === 'cooldown'
                ? { ...prev, cooldownRemainingMs: remaining }
                : prev
            );
          }, 1000);
        } else {
          setState({ status: 'error', errorKind: result.errorKind });
        }
        return result;
      });

      inFlightRef.current = promise;
      return promise;
    },
    [deps, state, exitCooldown]
  );

  const reset = useCallback(() => {
    inFlightRef.current = null;
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    cooldownEndsAtRef.current = null;
    setState(initialState);
  }, []);

  return { state, start, reset };
}

/**
 * Re-export the cooldown constant so the page can render a
 * countdown without importing the submit helper directly.
 */
export { RESEND_COOLDOWN_MS };