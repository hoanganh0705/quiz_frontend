'use client';

/**
 * `features/admin/components/AdminShellUnavailable.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.A3.
 *
 * ## Purpose
 *
 * Renders the documented "Admin surfaces coming soon" surface when
 * `admin_live` is explicitly set to `'placeholder'` (e.g. for a
 * preview / staging environment). The default is now `'live'`
 * because every Phase 7 admin surface is wired and reachable from
 * the admin shell. The component is a passthrough when the flag
 * is `'live'` so the parent boundary never needs a conditional.
 *
 * ## State matrix
 *
 *   - `isPlaceholder` (flag === `'placeholder'`) → renders the notice.
 *   - `isLive` (flag === `'live'`)             → returns children unchanged.
 *
 * The hook is synchronous and build-time-resolved; there is no "loading"
 * or "error" state at runtime.  Fail-closed behaviour (deny on any
 * unexpected exception) is the caller's concern — this component handles
 * only the documented flag values.
 *
 * ## Usage
 *
 * Wrap any admin shell content:
 *
 *   ```tsx
 *   <AdminShellUnavailable>
 *     <AdminLayoutShell>{children}</AdminLayoutShell>
 *   </AdminShellUnavailable>
 *   ```
 *
 * When the flag is off the admin nav and shell are replaced with this
 * notice.  The public app continues to function normally.
 */

import type { ReactNode } from 'react';

import { Shield } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

import { useAdminFeatureFlag } from '../hooks/useAdminFeatureFlag';

export interface AdminShellUnavailableProps {
  /** Shell content to render when the flag is live. */
  children: ReactNode;
}

/**
 * Renders the "Admin coming soon" notice when `admin_live` is off,
 * or forwards `children` unchanged when the flag is live.
 */
export function AdminShellUnavailable({
  children,
}: AdminShellUnavailableProps) {
  const { isPlaceholder } = useAdminFeatureFlag('admin_live');

  if (isPlaceholder) {
    return (
      <EmptyState
        icon={Shield}
        title="Admin surfaces coming soon"
        description={
          'The admin console is not yet enabled in this environment. ' +
          'Set NEXT_PUBLIC_ADMIN_LIVE=live to preview the admin surfaces, ' +
          'or contact your administrator to enable the flag.'
        }
        size="md"
      />
    );
  }

  return <>{children}</>;
}
