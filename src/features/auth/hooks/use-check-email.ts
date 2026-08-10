/**
 * `useCheckEmail` — debounced `GET /auth/check-email` hook.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.C1.
 *
 * ## Contract
 *
 * Given a valid email and `enabled === true`, the hook will:
 *
 *   - wait `debounceMs` (default 350 ms) after the last value change
 *     before issuing a single `checkEmail(params)` request;
 *   - abort the in-flight request if `email` changes before it
 *     resolves, and discard any late response that arrives after a
 *     newer request (stale-response guard);
 *   - reduce the response through `mapAvailabilityError` (B2) to an
 *     `AvailabilityStatus`; the call site never sees the raw error.
 *
 * Status semantics:
 *
 *   `idle`         — pre-condition: input not yet valid / `enabled === false`
 *   `checking`     — request is in flight
 *   `available`    — backend returned `{ available: true }`
 *   `unavailable`  — backend returned `{ available: false }`
 *   `rate_limited` — `429`
 *   `server`       — `5xx`, network failure, or unknown
 *
 * Re-render policy: status updates trigger `useState`-driven re-renders
 * only. The hook does not subscribe to a global store.
 *
 * ## Anti-enumeration
 *
 * The mapper (B2) is the only place a thrown error becomes a status.
 * The hook must NEVER inline-reduce errors itself; doing so would
 * duplicate logic and create a leak vector. Status is opaque to
 * callers in the sense that `unavailable` is one word, not "your
 * email is taken".
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { checkEmail } from '@/features/auth/services/auth.service';
import { mapAvailabilityError } from '@/features/auth/errors/register-error-mapper';
import type { AvailabilityStatus } from '@/features/auth/errors/register-error-mapper';

export type UseCheckEmailInput = {
  email: string;
  /** Toggle off to suspend calls (e.g. before validation passes). */
  enabled?: boolean;
  /** Override the debounce delay. Default 350 ms. */
  debounceMs?: number;
};

export type UseCheckEmailResult = {
  status: AvailabilityStatus;
  /** The last value that was actually sent to the backend (post-debounce). */
  debouncedEmail: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_DEBOUNCE_MS = 350;

/**
 * Pure helper that decides whether a value is a well-formed email.
 * Intentionally permissive — strict backend-side validation owns the
 * authoritative check. This helper only suppresses calls that are
 * obviously malformed.
 */
export function isWellFormedEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function useCheckEmail({
  email,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseCheckEmailInput): UseCheckEmailResult {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [debouncedEmail, setDebouncedEmail] = useState<string>('');

  // Stale-response guard. The numeric token increments on every input
  // change; the response handler compares it to the value at send time
  // and discards older tokens. This is necessary because two
  // `checkEmail` calls can race (slow first request arrives after a
  // faster newer one).
  const tokenRef = useRef(0);
  // Holds the current in-flight AbortController so input changes can
  // abort the previous request. `AbortController` is browser-only; the
  // SSR path will fall back to "ignore the response" via the token
  // guard because the effect runs client-side only.
  const controllerRef = useRef<AbortController | null>(null);

  // Decide whether the next effect tick should fire. Reactive to
  // `email`, `enabled`, and `debounceMs` — we only recompute the
  // predicate, not the debounce timer; the timer is owned by the
  // effect below.
  const shouldFire = useMemo<boolean>(
    () => enabled && isWellFormedEmail(email),
    [enabled, email]
  );

  // Cleanup: abort pending request and reset state when input becomes invalid.
  // Setting state here is intentional to clear stale availability status.
  useEffect(() => {
    if (!shouldFire) {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
      /* eslint-disable react-hooks/set-state-in-effect */
      setDebouncedEmail('');
      setStatus('idle');
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const token = ++tokenRef.current;

    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      controllerRef.current = controller;

      setDebouncedEmail(email);
      setStatus('checking');

      checkEmail({ email })
        .then((result) => {
          if (tokenRef.current !== token) return;
          if (controller.signal.aborted) return;
          setStatus(result.data?.available ? 'available' : 'unavailable');
        })
        .catch((err: unknown) => {
          if (tokenRef.current !== token) return;
          if (controller.signal.aborted) return;
          setStatus(mapAvailabilityError(err));
        })
        .finally(() => {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
    };
  }, [email, shouldFire, debounceMs]);

  return { status, debouncedEmail };
}
