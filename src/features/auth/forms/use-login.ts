'use client';

/**
 * `useLogin` — the React-binding layer over `submitLogin`.
 * Owns the single-flight discipline and exposes a state machine
 * the form can render.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.C1.
 *
 * ## State machine
 *
 *   idle → pending → success | error
 *   error → idle (via `reset`)
 *
 * The `success` state carries the `user` object so the caller
 * (the login page) can call `useFetchCurrentUser()` and route to
 * the redirect target.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { LoginFormValues } from './schemas/login.schema';
import {
  submitLogin,
  type LoginSubmitResult,
  type SubmitLoginDeps,
  defaultSubmitLoginDeps,
} from './login-submit';

export type UseLoginState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; user: NonNullable<Extract<LoginSubmitResult, { kind: 'success' }>['user']> }
  | { status: 'error'; errorKind: NonNullable<Extract<LoginSubmitResult, { kind: 'error' }>['errorKind']> };

export interface UseLogin {
  state: UseLoginState;
  start: (values: LoginFormValues) => Promise<LoginSubmitResult>;
  reset: () => void;
}

const initialState: UseLoginState = { status: 'idle' };

export function useLogin(
  deps: SubmitLoginDeps = defaultSubmitLoginDeps
): UseLogin {
  const [state, setState] = useState<UseLoginState>(initialState);

  // Module-replacement for the in-flight slot. Stored in a ref so
  // rapid re-renders do not re-create it.
  const inFlightRef = useRef<Promise<LoginSubmitResult> | null>(null);

  // If the consumer unmounts mid-flight, drop the in-flight slot so a
  // subsequent remount starts fresh.
  useEffect(() => {
    return () => {
      inFlightRef.current = null;
    };
  }, []);

  const start = useCallback(
    (values: LoginFormValues): Promise<LoginSubmitResult> => {
      // Single-flight: a pending call's `Promise` is shared.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setState({ status: 'pending' });

      const promise = submitLogin(values, deps).then((result) => {
        // Release the in-flight slot on settle so the next click
        // can issue a fresh request.
        inFlightRef.current = null;
        if (result.kind === 'success') {
          setState({ status: 'success', user: result.user });
        } else {
          setState({ status: 'error', errorKind: result.errorKind });
        }
        return result;
      });

      inFlightRef.current = promise;
      return promise;
    },
    [deps]
  );

  const reset = useCallback(() => {
    inFlightRef.current = null;
    setState(initialState);
  }, []);

  return { state, start, reset };
}
