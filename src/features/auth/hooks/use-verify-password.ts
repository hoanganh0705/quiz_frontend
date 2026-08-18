'use client';

import { useCallback, useRef, useState } from 'react';
import {
verifyPassword as defaultVerifyPassword,
} from '@/features/auth/services/auth.service';
import {
mapPasswordError,
type PasswordErrorClassification,
} from '@/features/auth/errors/password-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { VerifyPasswordResponseDto } from '@/lib/api';

export type UseVerifyPasswordStatus =
| 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseVerifyPasswordError {

classification: PasswordErrorClassification;

cause: ApiError | unknown;
}

export interface UseVerifyPasswordResult {
status: UseVerifyPasswordStatus;
error: UseVerifyPasswordError | null;

result: VerifyPasswordResponseDto | null;

verify: (password: string) => Promise<VerifyPasswordResponseDto | null>;

reset: () => void;
}

export interface UseVerifyPasswordDeps {
verifyPassword: (dto: { password: string }) => Promise<VerifyPasswordResponseDto>;
}

export const defaultVerifyPasswordDeps: UseVerifyPasswordDeps = {
verifyPassword: defaultVerifyPassword,
};

function toPasswordError(
cause: unknown,
): UseVerifyPasswordError {
if (
cause &&
typeof cause === 'object' &&
'code' in cause &&
'status' in cause &&
'validationMessages' in cause
  ) {
const apiErr = cause as ApiError;
return {
classification: mapPasswordError({
code: String(apiErr.code ?? ''),
status: Number(apiErr.status ?? 0),
validationMessages: Array.isArray(apiErr.validationMessages)
? apiErr.validationMessages
: [],
      }),
cause: apiErr,
    };
  }

return {
classification: mapPasswordError({
code: '',
status: 0,
    }),
cause,
  };
}

const initialState: Omit<UseVerifyPasswordResult, 'verify' | 'reset'> = {
status: 'idle',
error: null,
result: null,
};

export function useVerifyPassword(
deps: UseVerifyPasswordDeps = defaultVerifyPasswordDeps,
): UseVerifyPasswordResult {
const [state, setState] = useState<
Omit<UseVerifyPasswordResult, 'verify' | 'reset'>
  >(initialState);

const inFlightRef = useRef<Promise<VerifyPasswordResponseDto | null> | null>(
null,
  );

const verify = useCallback(
async (password: string): Promise<VerifyPasswordResponseDto | null> => {

if (state.status === 'pending') {

if (inFlightRef.current) {
return inFlightRef.current;
        }
return null;
      }

setState((prev) => ({ ...prev, status: 'pending', error: null, result: null }));

const promise = (async (): Promise<VerifyPasswordResponseDto | null> => {
try {
const response = await deps.verifyPassword({ password });

setState({
status: 'success',
error: null,
result: response,
          });
return response;
        } catch (err: unknown) {
const error = toPasswordError(err);
setState({
status: 'error',
error,
result: null,
          });
return null;
        } finally {
inFlightRef.current = null;
        }
      })();

inFlightRef.current = promise;
return promise;
    },
[deps, state.status],
  );

const reset = useCallback((): void => {
setState(initialState);
inFlightRef.current = null;
  }, []);

return {
...state,
verify,
reset,
  };
}
