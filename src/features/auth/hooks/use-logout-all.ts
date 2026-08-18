'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
logoutAll as defaultLogoutAll,
} from '@/features/auth/services/auth.service';
import {
mapSessionError,
type SessionErrorClassification,
} from '@/features/auth/errors/session-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import { useClearUser } from '@/features/users/store/user-store';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';

export type UseLogoutAllStatus =
| 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseLogoutAllError {
classification: SessionErrorClassification;
cause: ApiError | unknown;
}

export interface LogoutAllArgs {

confirmed: boolean;
}

export interface UseLogoutAllResult {

requiresConfirmation: boolean;
status: UseLogoutAllStatus;
error: UseLogoutAllError | null;
logoutAll: (args?: LogoutAllArgs) => Promise<void>;

cancelConfirmation: () => void;

reset: () => void;
}

export interface UseLogoutAllDeps {

logoutAll: () => Promise<unknown>;
}

export const defaultLogoutAllDeps: UseLogoutAllDeps = {
logoutAll: defaultLogoutAll,
};

export function useLogoutAll(
deps: UseLogoutAllDeps = defaultLogoutAllDeps,
): UseLogoutAllResult {
const router = useRouter();
const clearUser = useClearUser();
const { setAuthenticated } = useAuthState();

const [requiresConfirmation, setRequiresConfirmation] = useState(true);
const [status, setStatus] = useState<UseLogoutAllStatus>('idle');
const [error, setError] = useState<UseLogoutAllError | null>(null);
const inFlightRef = useRef<Promise<void> | null>(null);

const logoutAll = useCallback(
async (args?: LogoutAllArgs): Promise<void> => {
const confirmed = args?.confirmed === true;

if (!confirmed) {
setRequiresConfirmation(true);
setStatus('idle');
setError(null);
return;
      }

if (inFlightRef.current) {
return inFlightRef.current;
      }

setRequiresConfirmation(false);
setStatus('pending');
setError(null);

const promise = (async (): Promise<void> => {
try {
await deps.logoutAll();

clearUser();
setAuthenticated(false);
setStatus('success');

router.push('/login');
        } catch (cause: unknown) {

clearUser();
setAuthenticated(false);

const apiErr = cause instanceof ApiError ? cause : null;
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target: 'logout-all',
          });
setError({ classification, cause });
setStatus('error');

router.push('/login');
        } finally {
inFlightRef.current = null;
        }
      })();

inFlightRef.current = promise;
return promise;
    },
[deps, router, clearUser, setAuthenticated],
  );

const cancelConfirmation = useCallback((): void => {
setRequiresConfirmation(false);
setStatus('idle');
setError(null);
  }, []);

const reset = useCallback((): void => {
setRequiresConfirmation(true);
setStatus('idle');
setError(null);
inFlightRef.current = null;
  }, []);

return useMemo(
() => ({
requiresConfirmation,
status,
error,
logoutAll,
cancelConfirmation,
reset,
    }),
[requiresConfirmation, status, error, logoutAll, cancelConfirmation, reset],
  );
}
