"use client";

import { Loader2 } from "lucide-react";

import { useAdminRole } from "../hooks/useAdminRole";
import { PermissionDeniedNotice } from "./PermissionDeniedNotice";

import type { ReactNode } from "react";

import type { AdminPermission } from "../permissions";

export type AdminRoleStatus = "unknown" | "non-admin" | "admin";

export interface AdminRoleGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredPermissions?: readonly AdminPermission[];
}

export function AdminRoleGuard({
  children,
  fallback,
  requiredPermissions,
}: AdminRoleGuardProps) {
  const roleState = useAdminRole();

  let status: AdminRoleStatus;
  if (roleState.isLoading) {
    status = "unknown";
  } else if (roleState.permissions.length === 0) {
    status = "non-admin";
  } else if (
    requiredPermissions &&
    requiredPermissions.length > 0 &&
    !requiredPermissions.every((perm) => roleState.permissions.includes(perm))
  ) {
    status = "non-admin";
  } else {
    status = "admin";
  }

  if (status === "unknown") {
    return (
      <>
        {fallback ?? (
          <div
            data-testid="admin-role-guard-skeleton"
            aria-busy="true"
            className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Checking admin access…</span>
          </div>
        )}
      </>
    );
  }

  if (status === "non-admin") {
    return (
      <div data-testid="admin-role-guard-denied">
        <PermissionDeniedNotice variant="route" />
      </div>
    );
  }

  return (
    <div data-testid="admin-role-guard-allowed" data-status={status}>
      {children}
    </div>
  );
}
