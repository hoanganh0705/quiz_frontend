'use client';

/**
 * `app/admin/categories/_components/CategoryAdminRouteHandoff.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.A3.
 *
 * ## Purpose
 *
 * Dev-time observability component rendered by the `/admin/categories`
 * route. Calls `addCategoryAdminBreadcrumb` on mount so QA can verify
 * the route passes through the Epic 7.1 Sentry helpers. Then delegates
 * to `CategoryAdminPage`.
 *
 * No props; no network calls; purely a diagnostic shell. The breadcrumb
 * is purely opt-in observability and never blocks rendering.
 */

import { useEffect } from 'react';

import { addCategoryAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { CategoryAdminPage } from '@/features/admin/category-admin/components/CategoryAdminPage';

export function CategoryAdminRouteHandoff() {
  useEffect(() => {
    addCategoryAdminBreadcrumb({
      action: 'category.admin.mount',
      route: 'category-admin.page',
      status: 'started',
      durationMs: 0,
    });
  }, []);

  return <CategoryAdminPage />;
}