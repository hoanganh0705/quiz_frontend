'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
revokeOtherSessions as defaultRevokeOtherSessions,
} from '@/features/auth/services/auth.service';
import {
mapSessionError,
type SessionErrorClassification,
} from '@/features/auth/errors/session-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { SessionManagementResultDto } from '@/lib/api';

export type UseRevokeOtherSessionsStatus =
| 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseRevokeOtherSessionsError {
classification: SessionErrorClassification;
cause: ApiError | unknown;
}

export interface RevokeOthersArgs {

confirmed: boolean;
}

export interface UseRevokeOtherSessionsResult {

requiresConfirmation: boolean;
status: UseRevokeOtherSessionsStatus;
error: UseRevokeOtherSessionsError | null;

revokeOthers: (args?: RevokeOthersArgs) => Promise<void>;

cancelConfirmation: () => void;

reset: () => void;
}

export interface UseRevokeOtherSessionsDeps {
revokeOtherSessions: () => Promise<SessionManagementResultDto>;
}

export const defaultRevokeOtherSessionsDeps: UseRevokeOtherSessionsDeps = {
revokeOtherSessions: defaultRevokeOtherSessions,
};

export interface UseRevokeOtherSessionsOptions {
listOps: {
revalidate: () => Promise<void>;
  };
deps?: UseRevokeOtherSessionsDeps;
}

export function useRevokeOtherSessions(
options: UseRevokeOtherSessionsOptions,
): UseRevokeOtherSessionsResult {
const [requiresConfirmation, setRequiresConfirmation] = useState(true);
const [status, setStatus] = useState<UseRevokeOtherSessionsStatus>('idle');
const [error, setError] = useState<UseRevokeOtherSessionsError | null>(null);

const deps = options.deps ?? defaultRevokeOtherSessionsDeps;
const inFlightRef = useRef<Promise<void> | null>(null);

const revokeOthers = useCallback(
async (args?: RevokeOthersArgs): Promise<void> => {
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
await deps.revokeOtherSessions();

await options.listOps.revalidate();
setStatus('success');
        } catch (cause: unknown) {
const apiErr = cause instanceof ApiError ? cause : null;
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target: 'revoke-others',
          });
setError({ classification, cause });
setStatus('error');

await options.listOps.revalidate();
        } finally {
inFlightRef.current = null;
        }
      })();

inFlightRef.current = promise;
return promise;
    },
[deps, options.listOps],
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
revokeOthers,
cancelConfirmation,
reset,
    }),
[
requiresConfirmation,
status,
error,
revokeOthers,
cancelConfirmation,
reset,
    ],
  );
}
