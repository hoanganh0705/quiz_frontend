/**
 * `/categories/[idOrSlug]` route entry.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.E3.
 *
 * Dynamic route entry that reads the `idOrSlug` segment from the
 * route params and renders the new `<CategoryDetailPage
 * idOrSlug={idOrSlug} />` from the categories feature.
 *
 * The route file is a server component (no `'use client'`); the
 * page itself is a client component (per its directive in
 * `CategoryDetailPage.tsx`).
 *
 * ## Params convention
 *
 * The project uses Next.js 15+ where route params are passed as a
 * `Promise<{ idOrSlug: string }>` (seen in sibling route files
 * such as `src/app/(public)/quizzes/[id]/page.tsx`). The route
 * awaits the params object before rendering.
 *
 * ## Metadata
 *
 * The metadata is a generic fallback — the canonical category
 * name lives behind the client-side `useCategory` hook, so the
 * server cannot determine the title without a server-side fetch.
 * If a future server-side fetch is added (e.g. an `axios` call to
 * the categories endpoint), the `generateMetadata` function can
 * be updated to return the dynamic title.
 */

import { CategoryDetailPage } from '@/features/categories'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idOrSlug: string }>
}) {
  const { idOrSlug } = await params
  return buildMetadata({
    title: 'Category | QuizHub',
    description: 'Browse quizzes in this category.',
    path: `/categories/${idOrSlug}`,
  })
}

export default async function CategoryDetailRoute({
  params,
}: {
  params: Promise<{ idOrSlug: string }>
}) {
  const { idOrSlug } = await params
  return <CategoryDetailPage idOrSlug={idOrSlug} />
}
