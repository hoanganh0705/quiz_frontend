/**
 * `useAvailabilityCheck` — generic debounced availability-check hook.
 *
 * Source epic:   TKT-7.5 cleanup audit, Phase 8 / P1-17.
 * Source ticket: P1-17.
 *
 * A factory that consolidates the boilerplate of every
 * "debounced-validate-availability" hook in the registry
 * (`useCheckUsername`, `useCheckEmail`, `useTagSlugAvailability`,
 * `useCategorySlugAvailability`, `useCheckQuizSlug`). The
 * use-cases all share the same shape:
 *
 *   - Take a string input + an `enabled` gate.
 *   - Apply a synchronous `isWellFormed` predicate to skip
 *     obviously-malformed values.
 *   - Debounce by `debounceMs` (default 350 ms).
 *   - Issue an async SDK call (one parameter object).
 *   - Map the resolved payload to an `AvailabilityStatus`
 *     (`available | unavailable`).
 *   - Map errors through `mapAvailabilityError` so the caller
 *     never sees a raw `ApiError`.
 *   - Abort the in-flight request on input change (stale-response
 *     guard via an `AbortController` + a token counter).
 *
 * The pre-factory implementations (`useCheckUsername`,
 * `useCheckEmail`) duplicate this logic line-for-line. The factory
 * keeps the public API and the security / anti-enumeration
 * invariant (the only path from error → status is
 * `mapAvailabilityError`).
 *
 * @example
 * ```ts
 * const { status, debouncedValue } = useAvailabilityCheck({
 *   value: email,
 *   enabled: true,
 *   isWellFormed: isWellFormedEmail,
 *   debounceMs: 350,
 *   check: (email) => checkEmail({ email }),
 *   isAvailable: (result) => result.available,
 * });
 * ```
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  mapAvailabilityError,
  type AvailabilityStatus,
} from '@/features/auth/errors/register-error-mapper';

export interface UseAvailabilityCheckInput<TResult> {
  /**
   * The current input value. The hook debounces the request until
   * the value has remained stable for `debounceMs` (and is
   * well-formed).
   */
  value: string;
  /**
   * Toggle off to suspend calls (e.g. before validation passes).
   * Defaults to `true`.
   */
  enabled?: boolean;
  /**
   * Predicate that decides whether `value` is well-formed enough to
   * be sent to the backend. The hook calls this on every render
   * through `useMemo` and only fires requests when it returns `true`.
   */
  isWellFormed: (value: string) => boolean;
  /**
   * Override the debounce delay. Default 350 ms.
   */
  debounceMs?: number;
  /**
   * The async SDK call. Receives a single `value` argument and
   * returns a Promise of the typed result.
   */
  check: (value: string) => Promise<TResult>;
  /**
   * Predicate that decides whether the resolved result maps to
   * `available`. When it returns `true` the status is
   * `available`; otherwise `unavailable`.
   */
  isAvailable: (result: TResult) => boolean;
}

export interface UseAvailabilityCheckResult {
  status: AvailabilityStatus;
  /**
   * The last value that was actually sent to the backend
   * (post-debounce). Empty before the first request fires.
   */
  debouncedValue: string;
}

const DEFAULT_DEBOUNCE_MS = 350;

export function useAvailabilityCheck<TResult>({
  value,
  enabled = true,
  isWellFormed,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  check,
  isAvailable,
}: UseAvailabilityCheckInput<TResult>): UseAvailabilityCheckResult {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [debouncedValue, setDebouncedValue] = useState<string>('');

  // Stale-response guard. The numeric token increments on every
  // input change; the response handler compares it to the value at
  // send time and discards older tokens. This is necessary because
  // two `check()` calls can race (slow first request arrives after
  // a faster newer one).
  const tokenRef = useRef(0);
  // Holds the current in-flight AbortController so input changes
  // can abort the previous request. `AbortController` is
  // browser-only; the SSR path will fall back to "ignore the
  // response" via the token guard because the effect runs
  // client-side only.
  const controllerRef = useRef<AbortController | null>(null);

  const shouldFire = useMemo<boolean>(
    () => enabled && isWellFormed(value),
    [enabled, value, isWellFormed],
  );

  useEffect(() => {
    if (!shouldFire) {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
      /* eslint-disable react-hooks/set-state-in-effect */
      setDebouncedValue('');
      setStatus('idle');
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    const token = ++tokenRef.current;

    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      controllerRef.current = controller;

      setDebouncedValue(value);
      setStatus('checking');

      check(value)
        .then((result) => {
          if (tokenRef.current !== token) return;
          if (controller.signal.aborted) return;
          setStatus(isAvailable(result) ? 'available' : 'unavailable');
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
  }, [value, shouldFire, debounceMs, check, isAvailable]);

  return { status, debouncedValue };
}