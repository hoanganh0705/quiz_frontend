import { useCallback, useRef, useState } from "react";

import { ApiError } from "@/lib/api/core/ApiError";
import { addRoleGrantBreadcrumb } from "@/lib/admin/admin_live_sentry";

import {
  grantUserRole,
  type AdminRoleOrPermission,
  type UserRoleGrantResponseDto,
} from "@/features/admin/services/user-role-admin.service";
import { invalidateUserRoleCache } from "../user-role-admin-cache";

export interface UseGrantUserRoleAudit {
  readonly before: null;
  readonly after: UserRoleGrantResponseDto | null;
}

export interface UseGrantUserRoleResult {
  readonly grant: (
    targetUserId: string,
    role: AdminRoleOrPermission,
    options?: { before?: null },
  ) => Promise<UserRoleGrantResponseDto>;

  readonly isPending: boolean;

  readonly error: ApiError | null;

  readonly audit: UseGrantUserRoleAudit;

  readonly reset: () => void;
}

function isValidRole(role: string): role is AdminRoleOrPermission {
  return typeof role === "string" && role.trim().length > 0;
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
      role: AdminRoleOrPermission,
      options?: { before?: null },
    ): Promise<UserRoleGrantResponseDto> => {
      void options;
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      if (!isValidRole(role)) {
        const valError = new ApiError({
          isAxiosError: false,
          name: "ValidationError",
          message: `Invalid role: ${role} is not a valid role.`,
          config: undefined,
          request: undefined,
          response: {
            status: 400,
            data: {
              status: 400,
              detail: `Invalid role: ${role} is not a valid role.`,
              title: "ValidationError",
              extensions: {
                code: "ROLE_NOT_FOUND",
                requestId: "validation",
              },
            },
          },
          toJSON: () => ({}),
        } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
        setError(valError);
        return Promise.reject(valError);
      }

      const startedAt = Date.now();
      setIsPending(true);
      setError(null);

      addRoleGrantBreadcrumb({
        action: "role.grant",
        route: "userRoleAdmin.grantUserRole",
        targetId: targetUserId,
        status: "started",
        durationMs: 0,
      });

      const promise = grantUserRole(targetUserId, { role })
        .then((result) => {
          const durationMs = Date.now() - startedAt;

          setAudit({ before: null, after: result });
          setIsPending(false);

          addRoleGrantBreadcrumb({
            action: "role.grant",
            route: "userRoleAdmin.grantUserRole",
            targetId: targetUserId,
            status: "success",
            durationMs,
          });

          void invalidateUserRoleCache(targetUserId);

          return result;
        })
        .catch((err: unknown) => {
          const durationMs = Date.now() - startedAt;
          const apiError =
            err instanceof ApiError
              ? err
              : new ApiError({
                  isAxiosError: false,
                  name: "Error",
                  message: err instanceof Error ? err.message : "Grant failed",
                  config: undefined,
                  request: undefined,
                  response: {
                    status: 500,
                    data: {
                      status: 500,
                      detail:
                        err instanceof Error ? err.message : "Grant failed",
                      title: "Error",
                      extensions: {
                        code: "PERMISSION_DENIED",
                        requestId: "client-error",
                      },
                    },
                  },
                  toJSON: () => ({}),
                } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

          setError(apiError);
          setIsPending(false);

          addRoleGrantBreadcrumb({
            action: "role.grant",
            route: "userRoleAdmin.grantUserRole",
            targetId: targetUserId,
            status: "failure",
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
