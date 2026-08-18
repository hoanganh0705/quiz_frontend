

import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { addRoleGrantBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
revokeUserRole,
type UserRoleGrantResponseDto,
} from '@/features/admin/services/user-role-admin.service';
import type { AdminPermission } from '@/features/admin/services/user-role-admin.service';
import { DOCUMENTED_ROLES } from '../user-role-admin-types';
import { invalidateUserRoleCache } from '../user-role-admin-cache';

export interface UseRevokeUserRoleAudit {

readonly before: { role: AdminPermission } | null;

readonly after: UserRoleGrantResponseDto | null;
}

export interface UseRevokeUserRoleResult {

readonly revoke: (
targetUserId: string,
role: AdminPermission,
options?: { before?: { role: AdminPermission } | null },
  ) => Promise<UserRoleGrantResponseDto>;

readonly isPending: boolean;

readonly error: ApiError | null;

readonly audit: UseRevokeUserRoleAudit;

readonly isSelfRevoke: boolean;

readonly reset: () => void;
}

function isValidRole(role: string): role is AdminPermission {
return DOCUMENTED_ROLES.some((r) => r.name === role);
}

export function useRevokeUserRole(): UseRevokeUserRoleResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [audit, setAudit] = useState<UseRevokeUserRoleAudit>({
before: null,
after: null,
  });
const [isSelfRevokeAttempt, setIsSelfRevokeAttempt] = useState(false);

const inFlightRef = useRef<Promise<UserRoleGrantResponseDto> | null>(null);

const auth = useAuth();
const currentUserId = auth?.currentUser?.userId ?? null;

const isSelfRevoke = isSelfRevokeAttempt;

const revoke = useCallback(
async (
targetUserId: string,
role: AdminPermission,
options?: { before?: { role: AdminPermission } | null },
    ): Promise<UserRoleGrantResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

setIsSelfRevokeAttempt(false);

if (currentUserId !== null && targetUserId === currentUserId) {
setIsSelfRevokeAttempt(true);

throw new Error('Cannot revoke your own role.');
      }

if (!isValidRole(role)) {
throw new Error(
`Invalid role: ${role} is not a documented role.`,
        );
      }

const startedAt = Date.now();
setIsPending(true);
setError(null);

const beforeSnapshot = { role };

addRoleGrantBreadcrumb({
action: 'role.revoke',
route: 'userRoleAdmin.revokeUserRole',
targetId: targetUserId,
status: 'started',
durationMs: 0,
      });

const promise = revokeUserRole(targetUserId, role)
        .then((result) => {
const durationMs = Date.now() - startedAt;

setAudit({ before: beforeSnapshot, after: result });
setIsPending(false);
setIsSelfRevokeAttempt(false);

addRoleGrantBreadcrumb({
action: 'role.revoke',
route: 'userRoleAdmin.revokeUserRole',
targetId: targetUserId,
status: 'success',
durationMs,
          });

void invalidateUserRoleCache(targetUserId);

return result;
        })
        .catch((err: unknown) => {
const durationMs = Date.now() - startedAt;
const apiError = err as ApiError;

setError(apiError);
setIsPending(false);

if (apiError.code === 'SELF_ROLE_REVOKE_FORBIDDEN') {
setIsSelfRevokeAttempt(true);
          }

addRoleGrantBreadcrumb({
action: 'role.revoke',
route: 'userRoleAdmin.revokeUserRole',
targetId: targetUserId,
status: 'failure',
durationMs,
code: apiError.code,
requestId: apiError.requestId || undefined,
correlationId: apiError.correlationId || undefined,
          });

return Promise.reject(apiError);
        })
        .finally(() => {
inFlightRef.current = null;
        });

inFlightRef.current = promise;
return promise;
    },
[currentUserId], // Re-create when currentUserId changes
  );

const reset = useCallback(() => {
setIsPending(false);
setError(null);
setAudit({ before: null, after: null });
setIsSelfRevokeAttempt(false);
inFlightRef.current = null;
  }, []);

return {
revoke,
isPending,
error,
audit,
isSelfRevoke,
reset,
  };
}
