'use client';

/**
 * `app/admin/users/roles/_components/UserRoleAdminRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.A3.
 *
 * ## Purpose
 *
 * Dev-time observability + per-area feature-flag boundary component rendered
 * by the `/admin/users/roles` route. Calls the Sentry breadcrumb on mount
 * for observability, and delegates to `<UserRoleAdminPage />` when
 * `phase7_admin_user_role === 'live'`.
 *
 * ## Routing chain
 *
 *   `/admin/users/roles`
 *     → `UserRoleAdminRouteHandoff` (this component)
 *       → `<UserRoleAdminPage />` (when flag is enabled)
 *
 * ## No network calls
 *
 * This component is purely a diagnostic + gate shell. The breadcrumb
 * is purely opt-in observability and never blocks rendering.
 */

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { UserRoleAdminPage } from '@/features/admin/user-role-admin/components/UserRoleAdminPage';

/**
 * Placeholder rendered when `phase7_admin_user_role` is not `'live'`.
 * Mirrors the disabled-notice pattern from other Phase 7 admin routes.
 */
function UserRoleAdminDisabledNotice() {
  return (
    <div
      data-testid="user-role-admin-disabled-notice"
      className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
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
          flag is at its default value. Enable it to expose the
          role grant and revoke surface.
        </p>
      </div>
    </div>
  );
}

/**
 * Temporary coming soon placeholder while the full page is not yet implemented.
 * This will be replaced by the actual page component in F1.
 */
function UserRoleAdminComingSoon() {
  return (
    <div
      data-testid="user-role-admin-coming-soon"
      className="flex flex-col items-center justify-center rounded-md border border-muted bg-muted/40 px-4 py-12"
    >
      <p className="text-sm font-medium text-foreground">
        User role admin surface
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        The full role grant and revoke interface is coming soon.
      </p>
    </div>
  );
}

/**
 * Route handoff for the `/admin/users/roles` page.
 *
 * Reads the `phase7_admin_user_role` flag and either:
 *   - Renders the disabled notice when the flag is `'placeholder'`.
 *   - Renders the coming soon placeholder when the flag is `'live'` (but page not yet implemented).
 *   - Delegates to `<UserRoleAdminPage />` when the page is implemented.
 *
 * The Sentry breadcrumb is emitted on mount for observability.
 */
export function UserRoleAdminRouteHandoff() {
  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_user_role');

  // Emit breadcrumb on mount for observability.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[user-role-admin:mount]', { flag: flagValue });
  }, [flagValue]);

  // Feature flag not yet live → render the disabled notice.
  if (flagValue !== 'live') {
    return <UserRoleAdminDisabledNotice />;
  }

  // Feature flag enabled → render the full page.
  return <UserRoleAdminPage />;
}
