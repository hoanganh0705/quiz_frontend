"use client";

import { useCallback, useMemo, useState } from "react";
import { User as UserIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePermission } from "@/features/admin/hooks/usePermission";
import type { AdminRoleOrPermission } from "@/features/admin/services/user-role-admin.service";

import { GrantRoleDialog } from "./GrantRoleDialog";
import { RevokeRoleDialog } from "./RevokeRoleDialog";
import { useUserRoles } from "../hooks/useUserRoles";
import type { UserSearchResultDto } from "../user-role-admin-types";

export interface UserRoleCardProps {
  user: UserSearchResultDto;

  onChanged?: () => void;
}

export function UserRoleCard({
  user,
  onChanged,
}: UserRoleCardProps): React.ReactElement {
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminRoleOrPermission | null>(
    null,
  );

  const { roles, isLoading, refetch } = useUserRoles(user.userId);
  const { hasPermission: canGrant } = usePermission("user_grant_role");

  const handleRevokeClick = useCallback((role: AdminRoleOrPermission) => {
    setRevokeTarget(role);
  }, []);

  const handleRevokeClose = useCallback(() => {
    setRevokeTarget(null);
  }, []);

  const handleGrantClose = useCallback(() => {
    setGrantOpen(false);
  }, []);

  const handleChanged = useCallback(() => {
    refetch();
    onChanged?.();
  }, [refetch, onChanged]);

  const truncatedId = useMemo(() => {
    if (user.userId.length <= 12) return user.userId;
    return `${user.userId.slice(0, 8)}...${user.userId.slice(-4)}`;
  }, [user.userId]);

  return (
    <div
      className="flex min-h-[440px] flex-col justify-between rounded-lg border border-border/80 bg-card p-6 shadow-xs"
      data-testid="user-role-card"
    >
      <div>
        {/* User header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/80 pb-5">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted border border-border/60">
              {user.avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-base font-bold text-foreground"
                data-testid="user-role-card-username"
              >
                {user.username}
              </p>
              <p
                className="truncate text-sm text-muted-foreground"
                data-testid="user-role-card-email"
              >
                {user.email}
              </p>
              <p
                className="mt-0.5 font-mono text-xs text-muted-foreground"
                data-testid="user-role-card-userid"
              >
                ID: {truncatedId}
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-medium shrink-0">
            {roles.length} {roles.length === 1 ? "Role" : "Roles"}
          </Badge>
        </div>

        {/* Role list */}
        <div className="mt-5 overflow-y-auto max-h-[380px] pr-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">
              Current Assigned Roles
            </h3>
            <span className="text-xs text-muted-foreground">
              Active capabilities
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2.5" data-testid="user-role-card-skeleton">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : roles.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/15 p-8 text-center"
              data-testid="user-role-card-empty"
            >
              <p className="text-sm font-semibold text-foreground">
                No Administrative Roles
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                This account currently has standard member permissions. Use the button below to grant elevated administrative capabilities.
              </p>
            </div>
          ) : (
            <ul
              role="list"
              className="space-y-2.5"
              data-testid="user-role-card-list"
            >
              {roles.map((role) => (
                <li
                  key={role.role}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-3.5 shadow-xs transition-colors hover:border-border"
                  data-testid="user-role-card-role-row"
                  data-role-name={role.role}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {role.role}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Granted: {new Date(role.grantedAt).toLocaleString()}
                    </p>
                  </div>
                  {canGrant && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeClick(role.role)}
                      data-testid="user-role-card-revoke-button"
                      className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-border/80"
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Grant Role button */}
      {canGrant && (
        <div className="mt-5 border-t border-border/80 pt-4">
          <Button
            type="button"
            variant="default"
            onClick={() => setGrantOpen(true)}
            className="w-full h-10 font-medium"
            data-testid="user-role-card-grant-button"
          >
            Grant New Role
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <GrantRoleDialog
        userId={user.userId}
        username={user.username}
        isOpen={grantOpen}
        onClose={handleGrantClose}
        onSuccess={handleChanged}
      />
      {revokeTarget !== null && (
        <RevokeRoleDialog
          userId={user.userId}
          username={user.username}
          currentRoles={roles}
          role={revokeTarget}
          isOpen={true}
          onClose={handleRevokeClose}
          onSuccess={handleChanged}
        />
      )}
    </div>
  );
}
