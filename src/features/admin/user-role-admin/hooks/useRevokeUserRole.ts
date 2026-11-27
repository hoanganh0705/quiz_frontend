import { useCallback, useRef, useState } from "react";

import { ApiError } from "@/lib/api/core/ApiError";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { addRoleGrantBreadcrumb } from "@/lib/admin/admin_live_sentry";

import {
  revokeUserRole,
  type AdminRoleOrPermission,
  type UserRoleGrantResponseDto,
} from "@/features/admin/services/user-role-admin.service";
import { invalidateUserRoleCache } from "../user-role-admin-cache";

export interface UseRevokeUserRoleAudit {
  readonly before: { role: AdminRoleOrPermission } | null;

  readonly after: UserRoleGrantResponseDto | null;
}

export interface UseRevokeUserRoleResult {
  readonly revoke: (
    targetUserId: string,
    role: AdminRoleOrPermission,
    options?: { before?: { role: AdminRoleOrPermission } | null },
  ) => Promise<UserRoleGrantResponseDto>;

  readonly isPending: boolean;

  readonly error: ApiError | null;

  readonly audit: UseRevokeUserRoleAudit;

  readonly isSelfRevoke: boolean;

  readonly reset: () => void;
}

function isValidRole(role: string): role is AdminRoleOrPermission {
  return typeof role === "string" && role.trim().length > 0;
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

  const { currentUserId } = useAuthSession();

  const isSelfRevoke = isSelfRevokeAttempt;

  const revoke = useCallback(
    async (
      targetUserId: string,
      role: AdminRoleOrPermission,
      options?: { before?: { role: AdminRoleOrPermission } | null },
    ): Promise<UserRoleGrantResponseDto> => {
      void options;
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsSelfRevokeAttempt(false);

      if (currentUserId !== null && targetUserId === currentUserId) {
        setIsSelfRevokeAttempt(true);
        const selfError = new ApiError({
          isAxiosError: true,
          name: "AxiosError",
          message: "Cannot revoke your own role.",
          config: undefined,
          request: undefined,
          response: {
            status: 403,
            data: {
              status: 403,
              detail: "Cannot revoke a role from your own account",
              title: "SelfRoleRevokeForbidden",
              extensions: {
                code: "SELF_ROLE_REVOKE_FORBIDDEN",
                requestId: "validation",
              },
            },
          },
          toJSON: () => ({}),
        } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
        setError(selfError);
        return Promise.reject(selfError);
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

      const beforeSnapshot = { role };

      addRoleGrantBreadcrumb({
        action: "role.revoke",
        route: "userRoleAdmin.revokeUserRole",
        targetId: targetUserId,
        status: "started",
        durationMs: 0,
      });

      const promise = revokeUserRole(targetUserId, role)
        .then((result) => {
          const durationMs = Date.now() - startedAt;

          setAudit({ before: beforeSnapshot, after: result });
          setIsPending(false);
          setIsSelfRevokeAttempt(false);

          addRoleGrantBreadcrumb({
            action: "role.revoke",
            route: "userRoleAdmin.revokeUserRole",
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
                  message: err instanceof Error ? err.message : "Revoke failed",
                  config: undefined,
                  request: undefined,
                  response: {
                    status: 500,
                    data: {
                      status: 500,
                      detail: err instanceof Error ? err.message : "Revoke failed",
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

          if (apiError.code === "SELF_ROLE_REVOKE_FORBIDDEN") {
            setIsSelfRevokeAttempt(true);
          }

          addRoleGrantBreadcrumb({
            action: "role.revoke",
            route: "userRoleAdmin.revokeUserRole",
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
