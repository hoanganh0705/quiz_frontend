

import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { addRoleGrantBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
grantUserRole,
type UserRoleGrantResponseDto,
} from '@/features/admin/services/user-role-admin.service';
import type { AdminPermission } from '@/features/admin/services/user-role-admin.service';
import { DOCUMENTED_ROLES } from '../user-role-admin-types';
import { invalidateUserRoleCache } from '../user-role-admin-cache';

export interface UseGrantUserRoleAudit {

readonly before: null;

readonly after: UserRoleGrantResponseDto | null;
}

export interface UseGrantUserRoleResult {

readonly grant: (
targetUserId: string,
role: AdminPermission,
options?: { before?: null },
  ) => Promise<UserRoleGrantResponseDto>;

readonly isPending: boolean;

readonly error: ApiError | null;

readonly audit: UseGrantUserRoleAudit;

readonly reset: () => void;
}

function isValidRole(role: string): role is AdminPermission {
return DOCUMENTED_ROLES.some((r) => r.name === role);
}

export function useGrantUserRole(): UseGrantUserRoleResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [audit, setAudit] = useState<UseGrantUserRoleAudit>({
before: null,
after: null,
  });

const inFlightRef = useRef<Promise<UserRoleGrantResponseDto> | null>(null);

const grant = useCallback(
async (
targetUserId: string,
role: AdminPermission,
_options?: { before?: null },
    ): Promise<UserRoleGrantResponseDto> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

if (!isValidRole(role)) {
throw new Error(
`Invalid role: ${role} is not a documented role.`,
        );
      }

const startedAt = Date.now();
setIsPending(true);
setError(null);

addRoleGrantBreadcrumb({
action: 'role.grant',
route: 'userRoleAdmin.grantUserRole',
targetId: targetUserId,
status: 'started',
durationMs: 0,
      });

const promise = grantUserRole(targetUserId, { role })
        .then((result) => {
const durationMs = Date.now() - startedAt;

setAudit({ before: null, after: result });
setIsPending(false);

addRoleGrantBreadcrumb({
action: 'role.grant',
route: 'userRoleAdmin.grantUserRole',
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

addRoleGrantBreadcrumb({
action: 'role.grant',
route: 'userRoleAdmin.grantUserRole',
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
[], // No dependencies - all values are captured via closure
  );

const reset = useCallback(() => {
setIsPending(false);
setError(null);
setAudit({ before: null, after: null });
inFlightRef.current = null;
  }, []);

return {
grant,
isPending,
error,
audit,
reset,
  };
}
