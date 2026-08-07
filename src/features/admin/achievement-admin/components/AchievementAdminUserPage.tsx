/**
 * `AchievementAdminUserPage` — top-level achievement admin user surface.
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.F1.
 *
 * ## What this component owns
 *
 *   1. **Role guard** — wraps the entire surface in `AdminRoleGuard`.
 *   2. **Re-evaluate lifecycle lift** — runs `useReevaluateUserAchievements`
 *      once at the page top; sub-components consume it.
 *   3. **Page layout** — composes `AdminPageHeader` + re-evaluate affordance
 *      + badge list + history panel.
 *   4. **Sentry breadcrumb** — emits `achievement-admin.mount` / `.unmount`
 *      for dev-time observability.
 *
 * ## No service calls
 *
 * This component is purely presentational. It delegates all mutations
 * to the hooks and components it composes.
 */

'use client';

import { useCallback, useEffect } from 'react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { AdminRoleGuard } from '@/features/admin/components/AdminRoleGuard';
import { addAchievementAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import {
  AchievementAdminBadgeList,
  ReevaluateButton,
  ReevaluateResultSummary,
  ReevaluateRunningIndicator,
  UserAchievementHistoryPanel,
} from './';

import { useReevaluateUserAchievements } from '../hooks';
import { validateUserId } from '../validation';
import {
  subscribeAchievementAdminInvalidate,
  handleAchievementAdminInvalidation,
} from '../broadcast';

// ─── Disabled notice ─────────────────────────────────────────────────────────

const DISABLED_NOTICE_COPY = {
  title: 'Achievement Admin',
  description:
    'Achievement administration is not yet available in your environment. Please check back in a future release.',
} as const;

// ─── Page title ───────────────────────────────────────────────────────────────

const PAGE_TITLE = 'Manage user achievements';
const PAGE_DESCRIPTION =
  "View a user's badges, history, and re-evaluate their achievements.";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AchievementAdminUserPageProps {
  /** The user id from the route — must be a valid UUIDv4. */
  userId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AchievementAdminUserPage({
  userId,
}: AchievementAdminUserPageProps): React.ReactElement {
  const validation = validateUserId(userId);
  const isValid = validation.ok;

  const { lifecycle, reset } = useReevaluateUserAchievements(
    isValid ? userId : '',
  );

  // ─── Feature flag ────────────────────────────────────────────────────────

  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_achievement');

  // ─── Sentry breadcrumb ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isValid) return;

    addAchievementAdminBreadcrumb({
      action: 'achievement-admin.mount',
      targetId: userId,
      status: 'started',
      durationMs: 0,
      before: null,
    });

    return () => {
      addAchievementAdminBreadcrumb({
        action: 'achievement-admin.unmount',
        targetId: userId,
        status: 'stopped',
        durationMs: 0,
        before: null,
      });
    };
  }, [isValid, userId]);

  // ─── Cross-tab invalidation ──────────────────────────────────────────────

  useEffect(() => {
    if (!isValid) return;

    const unsubscribe = subscribeAchievementAdminInvalidate(
      handleAchievementAdminInvalidation,
    );

    return unsubscribe;
  }, [isValid, userId]);

  // ─── Handle re-evaluation completion ─────────────────────────────────────

  const handleReevaluateCompleted = useCallback(() => {
    // The lifecycle hook handles SWR invalidation internally.
    // This callback exists so the page can extend behaviour (e.g. analytics)
    // without coupling the button to the list.
  }, []);

  // ─── Feature flag disabled ───────────────────────────────────────────────

  if (flagValue !== 'live') {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <AdminPageHeader
          title={DISABLED_NOTICE_COPY.title}
          description={DISABLED_NOTICE_COPY.description}
        />
      </div>
    );
  }

  // ─── Invalid userId ─────────────────────────────────────────────────────

  if (!isValid) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <AdminPageHeader
          title="Invalid user"
          description="The user ID provided is not valid. Please check the URL."
        />
      </div>
    );
  }

  // ─── Full page ─────────────────────────────────────────────────────────

  return (
    <AdminRoleGuard>
      <div className="mx-auto max-w-3xl py-8 space-y-8">
        {/* Page header with re-evaluate action */}
        <div className="space-y-4">
          <AdminPageHeader
            title={PAGE_TITLE}
            description={PAGE_DESCRIPTION}
          />

          {/* Re-evaluate affordance */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              Re-evaluation
            </p>
            <ReevaluateButton userId={userId} onCompleted={handleReevaluateCompleted} />
            <ReevaluateRunningIndicator userId={userId} />
            <ReevaluateResultSummary userId={userId} />
          </div>
        </div>

        {/* Badge list */}
        <section aria-labelledby="badge-list-heading">
          <h2
            id="badge-list-heading"
            className="mb-3 text-sm font-semibold text-foreground"
          >
            Badges
          </h2>
          <AchievementAdminBadgeList userId={userId} />
        </section>

        {/* Achievement history */}
        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-3 text-sm font-semibold text-foreground"
          >
            Badge history
          </h2>
          <UserAchievementHistoryPanel userId={userId} />
        </section>
      </div>
    </AdminRoleGuard>
  );
}
