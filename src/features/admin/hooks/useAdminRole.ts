"use client";

import { useMemo } from "react";

import { useAuthIdentity } from "@/features/auth/hooks/use-auth-session";

import { ADMIN_PERMISSIONS } from "../permissions";

import type { AdminPermission } from "../permissions";

export interface AdminRoleDocument {
  isLoading: boolean;
  error: Error | null;
  role: string | null;
  permissions: readonly AdminPermission[];
}

export const ROLE_PERMISSION_MAP: Readonly<
  Record<string, readonly AdminPermission[]>
> = Object.freeze({
  admin: ADMIN_PERMISSIONS,
  super_admin: ADMIN_PERMISSIONS,
  moderator: Object.freeze([
    "review_report_read",
    "review_report_update",
    "comment_report_read",
    "comment_report_update",
    "comment_hide",
    "comment_restore",
  ]),
}) as Readonly<Record<string, readonly AdminPermission[]>>;

export function normalizeAdminRole(role: unknown): string | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveAdminPermissions(
  role: string | null,
): readonly AdminPermission[] {
  const normalized = normalizeAdminRole(role);
  if (!normalized) return [];
  return ROLE_PERMISSION_MAP[normalized] ?? [];
}

export function useAdminRole(): AdminRoleDocument {
  const auth = useAuthIdentity();

  const role = normalizeAdminRole(auth?.currentUser?.role ?? null);
  const permissions = useMemo(() => resolveAdminPermissions(role), [role]);

  return {
    isLoading: auth.isLoading,
    error: auth?.error ?? null,
    role,
    permissions,
  };
}
