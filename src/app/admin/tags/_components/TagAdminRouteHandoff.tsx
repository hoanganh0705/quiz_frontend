'use client';

/**
 * `app/admin/tags/_components/TagAdminRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.F3.
 *
 * ## Purpose
 *
 * Dev-time observability component rendered by the `/admin/tags` route.
 * Calls `addTagAdminBreadcrumb` on mount so QA can verify the route
 * passes through the Epic 7.1 Sentry helpers. Then delegates to
 * `TagAdminPage`.
 *
 * No props; no network calls; purely a diagnostic shell.
 */

import { useEffect } from 'react';

import { addTagAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import { TagAdminPage } from '@/features/admin/tag-admin/components/TagAdminPage';

export function TagAdminRouteHandoff() {
  useEffect(() => {
    addTagAdminBreadcrumb({
      action: 'tag.admin.mount',
      route: 'tag-admin.page',
      status: 'started',
      durationMs: 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <TagAdminPage />;
}
