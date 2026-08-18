'use client';

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

const inFlightRef = useRef<Promise<RegistrationSubmitResult> | null>(null);

useEffect(() => {
return () => {
inFlightRef.current = null;
    };
  }, []);

const start = useCallback(
(values: RegisterFormValues): Promise<RegistrationSubmitResult> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setState({ status: 'pending' });

const promise = submitRegistration(values, deps).then((result) => {

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
