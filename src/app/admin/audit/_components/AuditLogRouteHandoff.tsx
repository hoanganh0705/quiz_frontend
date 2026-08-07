'use client';

/**
 * `app/admin/audit/_components/AuditLogRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D1.
 *
 * ## Purpose
 *
 * Dev-time observability + per-area feature-flag boundary component
 * rendered by the `/admin/audit` route. Calls the Sentry breadcrumb
 * on mount for observability, and delegates to `<AuditLogPage />` when
 * `phase7_admin_audit === 'live'`.
 *
 * ## Routing chain
 *
 *   `/admin/audit`
 *     → `AuditLogRouteHandoff` (this component)
 *       → `<AuditLogPage />` (when flag is enabled)
 */

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';

import { AuditLogPage } from '@/features/admin/audit-admin/components';

/**
 * Placeholder rendered when `phase7_admin_audit` is not `'live'`.
 * Mirrors the disabled-notice pattern from other Phase 7 admin routes.
 */
function AuditLogDisabledNotice() {
  return (
    <div
      data-testid="audit-log-disabled-notice"
      className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 text-muted-foreground"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Audit log coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          The{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            phase7_admin_audit
          </code>{' '}
          flag is at its default value. Enable it to expose the audit log
          surface.
        </p>
      </div>
    </div>
  );
}

/**
 * Route handoff for the `/admin/audit` page.
 *
 * Reads the `phase7_admin_audit` flag and:
 *   - Renders the disabled notice when the flag is `'placeholder'`.
 *   - Delegates to `<AuditLogPage />` when the flag is `'live'`.
 *
 * The console.debug breadcrumb is emitted on mount for observability.
 */
export function AuditLogRouteHandoff() {
  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_audit');

  // Emit breadcrumb on mount for observability.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[audit-admin:mount]', { flag: flagValue });
  }, [flagValue]);

  // Feature flag not yet live → render the disabled notice.
  if (flagValue !== 'live') {
    return <AuditLogDisabledNotice />;
  }

  // Feature flag enabled → render the live surface.
  return <AuditLogPage />;
}