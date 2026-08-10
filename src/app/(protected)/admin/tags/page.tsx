'use client';

/**
 * `app/admin/tags/page.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.A3.
 *
 * ## Purpose
 *
 * Thin route file. Replaces the legacy inline-implementation page
 * (`admin/tags/page.tsx` from before Epic 7.3). This file:
 *   1. Delegates rendering to `<TagAdminPage />` from
 *      `features/admin/tag-admin/components/TagAdminPage`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/middleware.ts` (route-prefix `/admin/*` guard)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `admin_tag_live` (the per-area sub-flag)
 *      inside `TagAdminPage`.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `getTags`, `createTag`, `updateTag`, or `deleteTag` directly.
 * - Does NOT manage any `useState` for tags, loading, or dialogs.
 * - Does NOT own any mutation logic.
 *
 * All state and mutations are owned by the components inside
 * `features/admin/tag-admin/components/`, which are implemented in
 * Batches C–F of Epic 7.3.
 */

import { TagAdminRouteHandoff } from './_components/TagAdminRouteHandoff';

export default function AdminTagsPage() {
  return <TagAdminRouteHandoff />;
}
