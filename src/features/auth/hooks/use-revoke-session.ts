'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
revokeSession as defaultRevokeSession,
revokeCurrentSession as defaultRevokeCurrentSession,
type RevokeCurrentSessionResult,
} from '@/features/auth/services/auth.service';
import {
mapSessionError,
type SessionErrorClassification,
} from '@/features/auth/errors/session-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { SessionListItemDto, SessionManagementResultDto } from '@/lib/api';

export type UseRevokeSessionStatus =
| 'idle'
  | 'pending'
  | 'success'
  | 'error';

export interface UseRevokeSessionError {

classification: SessionErrorClassification;

cause: ApiError | unknown;
}

export interface UseRevokeSessionResult {
status: UseRevokeSessionStatus;
error: UseRevokeSessionError | null;
revoke: () => Promise<void>;
}

export interface UseRevokeSessionOptions {

sessionId: string;

isCurrentSession: boolean;

session: SessionListItemDto;

deps?: UseRevokeSessionDeps;

listOps: {
mutate: (updater: (current: SessionListItemDto[]) => SessionListItemDto[]) => void;
revalidate: () => Promise<void>;
  };
}

export interface UseRevokeSessionDeps {
revokeSession: (sessionId: string) => Promise<SessionManagementResultDto>;
revokeCurrentSession: (sessionId: string) => Promise<RevokeCurrentSessionResult>;
}

export const defaultRevokeSessionDeps: UseRevokeSessionDeps = {
revokeSession: defaultRevokeSession,
revokeCurrentSession: defaultRevokeCurrentSession,
};

function makeRestoreUpdater(
removed: SessionListItemDto,
): (current: SessionListItemDto[]) => SessionListItemDto[] {
return (current) => {
if (current.some((s) => s.sessionId === removed.sessionId)) {
return current; // already restored; idempotent
    }
return [...current, removed];
  };
}

export function useRevokeSession(
options: UseRevokeSessionOptions,
): UseRevokeSessionResult {
const router = useRouter();
const [status, setStatus] = useState<UseRevokeSessionStatus>('idle');
const [error, setError] = useState<UseRevokeSessionError | null>(null);

const deps = options.deps ?? defaultRevokeSessionDeps;
const removedRef = useRef<SessionListItemDto | null>(null);

const target: 'self' | 'other' = options.isCurrentSession ? 'self' : 'other';

const revoke = useCallback(async (): Promise<void> => {
if (status === 'pending') return;
setStatus('pending');
setError(null);

const removed = options.session;
removedRef.current = removed;

options.listOps.mutate((current) =>
current.filter((s) => s.sessionId !== removed.sessionId),
    );

if (options.isCurrentSession) {

try {
const result = await deps.revokeCurrentSession(removed.sessionId);

if (result.kind === 'success') {
setStatus('success');

router.push('/login');
return;
        }

options.listOps.mutate(makeRestoreUpdater(removed));
const classification = mapSessionError({
code: result.error.code,
status: result.error.status,
target,
        });
setError({ classification, cause: result.error });
setStatus('error');

if (classification.kind === 'current_revoked') {
router.push('/login');
        }
      } catch (cause: unknown) {

options.listOps.mutate(makeRestoreUpdater(removed));
const apiErr = cause instanceof ApiError ? cause : null;
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target,
        });
setError({ classification, cause });
setStatus('error');
if (classification.kind === 'current_revoked') {
router.push('/login');
        }
      }
return;
    }

try {
await deps.revokeSession(removed.sessionId);

await options.listOps.revalidate();
setStatus('success');
    } catch (cause: unknown) {

options.listOps.mutate(makeRestoreUpdater(removed));
const apiErr = cause instanceof ApiError ? cause : null;
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target,
      });

if (classification.kind === 'already_revoked') {
await options.listOps.revalidate();
setStatus('success');
return;
      }

setError({ classification, cause });
setStatus('error');
    }
  }, [
status,
options,
deps,
target,
router,
  ]);

return useMemo(
() => ({ status, error, revoke }),
[status, error, revoke],
  );
}
