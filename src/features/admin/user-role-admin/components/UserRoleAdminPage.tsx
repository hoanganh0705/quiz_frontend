'use client';

/**
 * `features/admin/user-role-admin/components/UserRoleAdminPage.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.F1.
 *
 * ## What this component renders
 *
 * The full user role admin page, orchestrating:
 *   - `UserRoleSearchPanel` (C3) on the left
 *   - `UserRoleCard` (E5) on the right when a user is selected
 *   - Empty state on the right when no user is selected
 *   - Success banner after grant/revoke (auto-dismisses after 5s)
 *   - Permission gate via `usePermission('user_grant_role')`
 *   - Feature flag gate via `useAdminFeatureFlag('phase7_admin_user_role')`
 */

import { useCallback, useEffect, useState } from 'react';

import { ShieldAlert, UserCheck } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';

import { UserRoleSearchPanel } from './UserRoleSearchPanel';
import { UserRoleCard } from './UserRoleCard';
import type { UserSearchResultDto } from '../user-role-admin-types';

const SUCCESS_BANNER_DURATION_MS = 5000;

type SuccessBanner = {
  message: string;
  /** Timestamp the banner was emitted, used for auto-dismiss */
  emittedAt: number;
};

/**
 * The main user role admin page.
 */
export function UserRoleAdminPage(): React.ReactElement {
  const [selectedUser, setSelectedUser] = useState<UserSearchResultDto | null>(
    null,
  );
  const [successBanner, setSuccessBanner] = useState<SuccessBanner | null>(
    null,
  );

  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_user_role');
  const { hasPermission: canGrant } = usePermission('user_grant_role');

  // Auto-dismiss success banner after 5 seconds.
  useEffect(() => {
    if (successBanner === null) return;
    const remainingMs =
      SUCCESS_BANNER_DURATION_MS -
      (Date.now() - successBanner.emittedAt);
    if (remainingMs <= 0) {
      setSuccessBanner(null);
      return;
    }
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
      message: 'Role updated successfully.',
      emittedAt: Date.now(),
    });
  }, []);

  // Defensive: the route handoff already guards on the flag, but we re-check
  // here so the page is robust when imported directly in tests.
  if (flagValue !== 'live') {
    return (
      <div
        className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
        data-testid="user-role-admin-disabled-notice"
      >
        <ShieldAlert
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            User role admin coming soon
          </p>
          <p className="text-sm text-muted-foreground">
            The{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              phase7_admin_user_role
            </code>{' '}
            flag is at its default value.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-4"
      data-testid="user-role-admin-page"
    >
      {/* Success banner */}
      {successBanner !== null && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-md border border-green-300 bg-green-50 px-4 py-3"
          data-testid="user-role-admin-success-banner"
        >
          <UserCheck
            aria-hidden="true"
            className="h-4 w-4 text-green-700"
          />
          <p className="text-sm font-medium text-green-900">
            {successBanner.message}
          </p>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: search panel */}
        <div className="rounded-md border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Find user</h2>
          <UserRoleSearchPanel onUserSelect={handleUserSelect} />
        </div>

        {/* Right: role card or empty state */}
        <div>
          {selectedUser !== null ? (
            <UserRoleCard
              user={selectedUser}
              onChanged={handleChanged}
            />
          ) : (
            <div
              className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-8 text-center"
              data-testid="user-role-admin-empty-state"
            >
              <p className="text-sm font-medium text-foreground">
                Select a user to manage their roles
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Search for a user on the left to view and edit their roles.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Permission denied hint */}
      {!canGrant && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3"
          data-testid="user-role-admin-permission-denied"
        >
          <p className="text-xs text-amber-900">
            You don&apos;t have permission to grant or revoke roles. Contact an admin
            if you need elevated access.
          </p>
        </div>
      )}
    </div>
  );
}
