'use client';

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

const inFlightRef = useRef<Promise<LoginSubmitResult> | null>(null);

useEffect(() => {
return () => {
inFlightRef.current = null;
    };
  }, []);

const start = useCallback(
(values: LoginFormValues): Promise<LoginSubmitResult> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setState({ status: 'pending' });

const promise = submitLogin(values, deps).then((result) => {

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
