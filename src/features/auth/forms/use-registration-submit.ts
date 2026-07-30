'use client';

/**
 * `useRegistrationSubmit` — the React-binding layer over
 * `submitRegistration`. Owns the single-flight discipline and exposes
 * a state machine the form can render.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.D2.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { RegisterFormValues } from './schemas/register.schema';
import {
  submitRegistration,
  type RegistrationSubmitResult,
  type SubmitRegistrationDeps,
  defaultSubmitDeps,
} from './registration-submit';

export type UseRegistrationSubmitState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; nextRoute: string }
  | { status: 'error'; result: Extract<RegistrationSubmitResult, { kind: 'error' }> };

export interface UseRegistrationSubmit {
  state: UseRegistrationSubmitState;
  start: (values: RegisterFormValues) => Promise<RegistrationSubmitResult>;
  reset: () => void;
}

const initialState: UseRegistrationSubmitState = { status: 'idle' };

export function useRegistrationSubmit(
  deps: SubmitRegistrationDeps = defaultSubmitDeps
): UseRegistrationSubmit {
  const [state, setState] = useState<UseRegistrationSubmitState>(initialState);

  // Module-replacement for the in-flight slot. Stored in a ref so
  // rapid re-renders do not re-create it.
  const inFlightRef = useRef<Promise<RegistrationSubmitResult> | null>(null);

  // If the consumer unmounts mid-flight, drop the in-flight slot so a
  // subsequent remount starts fresh. The `submitRegistration`
  // Promise itself is allowed to settle in the background — the
  // setter will warn on an unmounted component, but that is the
  // documented pattern: state updates after unmount are no-ops in
  // React 19.
  useEffect(() => {
    return () => {
      inFlightRef.current = null;
    };
  }, []);

  const start = useCallback(
    (values: RegisterFormValues): Promise<RegistrationSubmitResult> => {
      // Single-flight: a pending call's `Promise` is shared.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setState({ status: 'pending' });

      const promise = submitRegistration(values, deps).then((result) => {
        // The single-flight slot is released on settle (success or
        // error) so the next click can issue a new request. This is
        // intentional: the user explicitly clicking "submit" again is
        // a fresh attempt and should hit the backend. The button
        // disable guarantees the user can only do this through
        // explicit re-enable after the previous attempt resolves.
        inFlightRef.current = null;
        if (result.kind === 'ok') {
          setState({ status: 'success', nextRoute: result.nextRoute });
        } else {
          setState({ status: 'error', result });
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
