/**
 * `app/admin/loading.tsx`
 *
 * Source epic:   Epic 7.2.
 * Source ticket: TKT-7.2.A3.
 *
 * ## Purpose
 *
 * Next.js app-router loading boundary for the entire `/admin/*` route group.
 * Renders a skeleton that matches the `AdminLayoutShell` structure while the
 * client-side identity state (`useAdminRole().isLoading`) is bootstrapping.
 *
 * The skeleton is intentionally lightweight — no admin resource data is fetched
 * here.  The boundary fires immediately on any server-side render or navigation
 * into the group and disappears as soon as React hydrates and `useAdminRole`
 * resolves.
 *
 * ## What it does NOT do
 *
 * - Does not gate on the feature flag (that is `AdminShellUnavailable`,
 *   wired by `AdminFeatureFlagBoundary` in TKT-7.2.B1).
 * - Does not check the role (that is `AdminRoleGuard`, wired in TKT-7.2.B2).
 * - Does not fetch admin CRUD endpoints.
 *
 * ## Relationship to `AdminLayoutShell`
 *
 * The shell skeleton mirrors the `AdminLayoutShell` layout regions so the
 * loading state and the live state are visually coherent.  The sidebar,
 * header, and content slots are preserved as empty regions rather than
 * arbitrary full-page spinners.
 */

import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div
      className="flex min-h-screen items-start"
      data-testid="admin-loading-boundary"
      aria-busy="true"
      aria-label="Loading admin console"
    >
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-border bg-sidebar p-4 space-y-3">
        <div className="flex items-center gap-2 pb-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-2 w-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 rounded-md bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
      {/* Header skeleton — mirrors AdminHeader layout */}
      <div className="h-14 border-b border-border bg-background px-4 flex items-center gap-4">
        {/* SidebarTrigger placeholder */}
        <div className="h-5 w-5 bg-muted rounded animate-pulse shrink-0" />
        {/* Breadcrumb placeholder */}
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          <div className="h-3 w-3 bg-muted/50 rounded animate-pulse" />
          <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
        </div>
        {/* Icon buttons placeholder */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-6 w-px bg-muted" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-lg border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
