'use client';

import { useCallback, useRef, useState } from 'react';
import {
changePassword as defaultChangePassword,
revalidateAfterPasswordChange as defaultRevalidateAfterPasswordChange,
} from '@/features/auth/services/auth.service';
import {
mapPasswordError,
type PasswordErrorClassification,
} from '@/features/auth/errors/password-error-mapper';
import {
getPasswordStrength,
type PasswordStrengthResult,
} from '@/features/auth/utils/password-strength';
import { ApiError } from '@/lib/api/core/ApiError';
import type {
AccountSecurityDto,
ChangePasswordResponseDto,
SessionListResponseDto,
} from '@/lib/api';

export type UseChangePasswordStatus =
| 'idle'
  | 'pending'
  | 'success'
  | 'error';

export type ChangePasswordFieldName =
| 'currentPassword'
  | 'newPassword'
  | 'confirmPassword';

export type ChangePasswordFieldErrorKey =
| 'invalidCurrent'
  | 'reuse'
  | 'mismatch'
  | 'weak'
  | 'equalToCurrent'
  | 'required'
  | 'tooShort';

export interface ChangePasswordFieldErrors {
currentPassword?: ChangePasswordFieldErrorKey;
newPassword?: ChangePasswordFieldErrorKey;
confirmPassword?: ChangePasswordFieldErrorKey;
}

export interface UseChangePasswordError {

classification: PasswordErrorClassification;

fieldErrors: ChangePasswordFieldErrors;

cause: ApiError | unknown;
}

export interface UseChangePasswordInput {
currentPassword: string;
newPassword: string;
confirmPassword: string;
}

export interface ChangePasswordClientCheck {

strength: PasswordStrengthResult;
}

export interface UseChangePasswordResult {
status: UseChangePasswordStatus;
error: UseChangePasswordError | null;

result: ChangePasswordResponseDto | null;

change: (
input: UseChangePasswordInput,
  ) => Promise<ChangePasswordClientCheck | null>;

reset: () => void;
}

export interface UseChangePasswordDeps {
changePassword: (dto: {
currentPassword: string;
newPassword: string;
  }) => Promise<ChangePasswordResponseDto>;

revalidateAfterPasswordChange: () => Promise<{
dashboard: AccountSecurityDto;
sessions: SessionListResponseDto;
  }>;

revalidateDashboard: (next: AccountSecurityDto) => void;

revalidateSessions: (next: SessionListResponseDto) => void;
}

export const defaultChangePasswordDeps: UseChangePasswordDeps = {
changePassword: defaultChangePassword,
revalidateAfterPasswordChange: defaultRevalidateAfterPasswordChange,

revalidateDashboard: () => {
    /* page wires this in 2.9.T15 */
  },
revalidateSessions: () => {
    /* page wires this in 2.9.T15 */
  },
};

function fieldErrorsFromClassification(
classification: PasswordErrorClassification,
): ChangePasswordFieldErrors {
switch (classification.kind) {
case 'invalid_current':
return { currentPassword: 'invalidCurrent' };
case 'reuse':
return { newPassword: 'reuse' };
case 'validation':

return { newPassword: 'weak' };
case 'auth_terminal':
case 'conflict':
case 'retryable':
return {};
  }
}

const initialState: Omit<UseChangePasswordResult, 'change' | 'reset'> = {
status: 'idle',
error: null,
result: null,
};

export function useChangePassword(
deps: UseChangePasswordDeps = defaultChangePasswordDeps,
): UseChangePasswordResult {
const [state, setState] = useState<
Omit<UseChangePasswordResult, 'change' | 'reset'>
  >(initialState);

const inFlightRef = useRef<Promise<ChangePasswordResponseDto | null> | null>(
null,
  );

const change = useCallback(
async (
input: UseChangePasswordInput,
    ): Promise<ChangePasswordClientCheck | null> => {
const { currentPassword, newPassword, confirmPassword } = input;

const strength = getPasswordStrength(newPassword);

if (confirmPassword !== newPassword) {
setState({
status: 'error',
error: {
classification: mapPasswordError({ code: '', status: 400 }),
fieldErrors: { confirmPassword: 'mismatch' },
cause: null,
          },
result: null,
        });
return { strength };
      }

if (currentPassword === newPassword) {
setState({
status: 'error',
error: {
classification: mapPasswordError({ code: '', status: 400 }),
fieldErrors: { newPassword: 'equalToCurrent' },
cause: null,
          },
result: null,
        });
return { strength };
      }

if (strength.score < 2) {
setState({
status: 'error',
error: {
classification: mapPasswordError({ code: '', status: 400 }),
fieldErrors: { newPassword: 'weak' },
cause: null,
          },
result: null,
        });
return { strength };
      }

if (state.status === 'pending') {
if (inFlightRef.current) {
return inFlightRef.current.then(() => null);
        }
return null;
      }

setState((prev) => ({ ...prev, status: 'pending', error: null, result: null }));

const promise = (async (): Promise<ChangePasswordResponseDto | null> => {
try {
const response = await deps.changePassword({
currentPassword,
newPassword,
          });

try {
const revalidated = await deps.revalidateAfterPasswordChange();
deps.revalidateDashboard(revalidated.dashboard);
deps.revalidateSessions(revalidated.sessions);
          } catch {
            // The revalidation failure is intentionally NOT folded
            // into the hook's `error` — the user already sees the
            // success banner; the page can render a separate
            // "refresh summary" hint if it wants.
          }

setState({
status: 'success',
error: null,
result: response,
          });
return response;
        } catch (err: unknown) {
let classification: PasswordErrorClassification;
let fieldErrors: ChangePasswordFieldErrors;
if (
err &&
typeof err === 'object' &&
'code' in err &&
'status' in err &&
'validationMessages' in err
          ) {
const apiErr = err as ApiError;
classification = mapPasswordError({
code: String(apiErr.code ?? ''),
status: Number(apiErr.status ?? 0),
validationMessages: Array.isArray(apiErr.validationMessages)
? apiErr.validationMessages
: [],
            });
fieldErrors = fieldErrorsFromClassification(classification);
          } else {
classification = mapPasswordError({ code: '', status: 0 });
fieldErrors = fieldErrorsFromClassification(classification);
          }

setState({
status: 'error',
error: { classification, fieldErrors, cause: err },
result: null,
          });
return null;
        } finally {
inFlightRef.current = null;
        }
      })();

inFlightRef.current = promise;
return promise.then(() => ({ strength }));
    },
[deps, state.status],
  );

const reset = useCallback((): void => {
setState(initialState);
inFlightRef.current = null;
  }, []);

return {
...state,
change,
reset,
  };
}
