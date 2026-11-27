"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, ShieldCheck, User as UserIcon, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { usePermission } from "@/features/admin/hooks/usePermission";

import { UserRoleSearchPanel } from "./UserRoleSearchPanel";
import { UserRoleCard } from "./UserRoleCard";
import type { UserSearchResultDto } from "../user-role-admin-types";

const SUCCESS_BANNER_DURATION_MS = 5000;

type SuccessBanner = {
  message: string;
  emittedAt: number;
};

export function UserRoleAdminPage(): React.ReactElement {
  const [selectedUser, setSelectedUser] = useState<UserSearchResultDto | null>(
    null,
  );
  const [successBanner, setSuccessBanner] = useState<SuccessBanner | null>(
    null,
  );
  const { hasPermission: canGrant } = usePermission("user_grant_role");

  useEffect(() => {
    if (successBanner === null) return;
    const remainingMs = Math.max(
      0,
      SUCCESS_BANNER_DURATION_MS - (Date.now() - successBanner.emittedAt),
    );
    const handle = window.setTimeout(() => {
      setSuccessBanner(null);
    }, remainingMs);
    return () => window.clearTimeout(handle);
  }, [successBanner]);

  const handleUserSelect = useCallback((user: UserSearchResultDto) => {
    setSelectedUser(user);
  }, []);

  const handleChanged = useCallback(() => {
    setSuccessBanner({
      message: "Role updated successfully.",
      emittedAt: Date.now(),
    });
  }, []);

  return (
    <div
      className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-6"
      data-testid="user-role-admin-page"
    >
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/admin"
            className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
          >
            Admin
          </Link>
          <span>/</span>
          <Link
            href="/admin/users"
            className="hover:text-foreground hover:underline underline-offset-4 transition-colors"
          >
            Users
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Roles</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="size-6 text-brand shrink-0" aria-hidden="true" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                User Role Management
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Search registered platform accounts to inspect, assign, or revoke administrative roles and privileges.
            </p>
          </div>
        </div>
      </header>

      {/* Success banner */}
      {successBanner !== null && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-4 py-3"
          data-testid="user-role-admin-success-banner"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden="true" className="size-4 text-success shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {successBanner.message}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSuccessBanner(null)}
            aria-label="Dismiss notification"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Permission denied hint */}
      {!canGrant && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3"
          data-testid="user-role-admin-permission-denied"
        >
          <ShieldAlert aria-hidden="true" className="size-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            You don&apos;t have permission to grant or revoke roles. Contact a super administrator if you require elevated privilege delegation.
          </p>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: search panel */}
        <div className="lg:col-span-5 rounded-lg border border-border/80 bg-card p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Find User</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search by username or email
            </p>
          </div>
          <UserRoleSearchPanel
            selectedUserId={selectedUser?.userId ?? null}
            onUserSelect={handleUserSelect}
          />
        </div>

        {/* Right: role card or empty state */}
        <div className="lg:col-span-7 lg:sticky lg:top-6">
          {selectedUser !== null ? (
            <UserRoleCard user={selectedUser} onChanged={handleChanged} />
          ) : (
            <div
              className="flex min-h-[440px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/15 p-8 text-center"
              data-testid="user-role-admin-empty-state"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3 border border-border/50">
                <UserIcon aria-hidden="true" className="size-7" />
              </div>
              <p className="text-sm font-bold text-foreground">
                No User Selected
              </p>
              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                Select an account from the search list to inspect assigned security roles, grant elevated permissions, or revoke access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
