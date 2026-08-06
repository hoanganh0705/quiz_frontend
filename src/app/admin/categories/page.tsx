'use client';

/**
 * `app/admin/categories/page.tsx`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.A3.
 *
 * ## Purpose
 *
 * Thin route file. Replaces the legacy inline-implementation page
 * (`admin/categories/page.tsx` from before Epic 7.4). This file:
 *   1. Delegates rendering to `<CategoryAdminPage />` from
 *      `features/admin/category-admin/components/CategoryAdminPage`.
 *   2. Is protected by the Epic 7.2 outer shells:
 *      - `src/middleware.ts` (route-prefix `/admin/*` guard)
 *      - `AdminLayoutShell` in the parent `admin/layout.tsx`
 *      - `AdminRoleGuard` (client-side role re-check, Epic 7.1)
 *   3. Is additionally gated by `phase7_admin_category` (the per-area
 *      sub-flag) inside `CategoryAdminPage`.
 *
 * ## What this file does NOT do
 *
 * - Does NOT call `getCategories`, `createCategory`, `updateCategory`,
 *   `deleteCategory`, or `restoreCategory` directly.
 * - Does NOT manage any `useState` for categories, loading, or dialogs.
 * - Does NOT own any mutation logic.
 * - Does NOT use axios or fetch directly (the cross-batch
 *   `admin-no-axios-or-fetch` invariant from
 *   `scripts/phase7-lint-invariants.mjs` enforces this).
 *
 * All state and mutations are owned by the components inside
 * `features/admin/category-admin/components/`, which are implemented
 * in Batches C–F of Epic 7.4.
 */

import { CategoryAdminRouteHandoff } from './_components/CategoryAdminRouteHandoff';

export default function AdminCategoriesPage() {
  return <CategoryAdminRouteHandoff />;
}