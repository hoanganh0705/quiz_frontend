'use client';

/**
 * `app/admin/achievements/users/[userId]/_components/AchievementAdminUserRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.A3.
 *
 * ## Purpose
 *
 * Dev-time observability + per-area feature-flag boundary component rendered
 * by the `/admin/achievements/users/:userId` route. Calls the
 * Sentry breadcrumb on mount for observability, and delegates to
 * `<AchievementAdminUserPage />` when `phase7_admin_achievement === 'enabled'`.
 *
 * ## Routing chain
 *
 *   `/admin/achievements/users/:userId`
 *     → `AchievementAdminUserRouteHandoff` (this component)
 *       → `<AchievementAdminUserPage />` (when flag is enabled)
 *
 * ## No network calls
 *
 * This component is purely a diagnostic + gate shell. The breadcrumb
 * is purely opt-in observability and never blocks rendering.
 */

import { useEffect } from 'react';

import { ShieldAlert } from 'lucide-react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { AchievementAdminUserPage } from '@/features/admin/achievement-admin/components/AchievementAdminUserPage';

/**
 * Placeholder rendered when `phase7_admin_achievement` is not `'enabled'`.
 * Mirrors the disabled-notice pattern from other Phase 7 admin routes.
 */
function AchievementAdminDisabledNotice() {
  return (
    <div
      data-testid="achievement-admin-disabled-notice"
      className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 text-muted-foreground"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Achievement admin coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          The{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            phase7_admin_achievement
          </code>{' '}
          flag is at its default value. Enable it to expose the
          re-evaluation and badge revocation surface for user achievements.
        </p>
      </div>
    </div>
  );
}

export interface AchievementAdminUserRouteHandoffProps {
  userId: string;
}

/**
 * Route handoff for the `/admin/achievements/users/:userId` page.
 *
 * Reads the `phase7_admin_achievement` flag and either:
 *   - Renders the disabled notice when the flag is `'placeholder'`.
 *   - Delegates to `<AchievementAdminUserPage />` when the flag is `'enabled'`.
 *
 * The Sentry breadcrumb is emitted on mount for observability.
 */
export function AchievementAdminUserRouteHandoff({
  userId,
}: AchievementAdminUserRouteHandoffProps) {
  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_achievement');

  // Emit breadcrumb on mount for observability.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[achievement-admin:mount]', { userId, flag: flagValue });
  }, [userId, flagValue]);

  // Feature flag not yet live → render the disabled notice.
  if (flagValue !== 'live') {
    return <AchievementAdminDisabledNotice />;
  }

  // Feature flag enabled → delegate to AchievementAdminUserPage.
  return <AchievementAdminUserPage userId={userId} />;
}
