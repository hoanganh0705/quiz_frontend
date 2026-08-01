/**
 * `/categories` route entry.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.E2.
 *
 * Thin pass-through that renders the new `<CategoriesDirectoryPage />`
 * from the categories feature. The metadata lives in the sibling
 * `layout.tsx` (so search engines and the Next.js metadata API
 * still see the canonical title/description for the route).
 *
 * The legacy `<QuizCategories />` component is preserved in
 * `src/features/categories/components/QuizCategories.tsx` for
 * downstream consumers (other features' marketing surfaces) but is
 * no longer used by this route.
 *
 * Server component (no `'use client'`); the page itself is a client
 * component (per its directive in `CategoriesDirectoryPage.tsx`).
 */

import { CategoriesDirectoryPage } from '@/features/categories'

export default function CategoriesPage() {
  return <CategoriesDirectoryPage />
}
