/**
 * `/tags/[slug]` route entry.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.E4.
 *
 * Dynamic route entry that reads the `slug` segment from the
 * route params and renders the new `<TagDetailPage slug={slug} />`
 * from the tags feature.
 *
 * The route file is a server component (no `'use client'`); the
 * page itself is a client component (per its directive in
 * `TagDetailPage.tsx`).
 *
 * ## Params convention
 *
 * The project uses Next.js 15+ where route params are passed as a
 * `Promise<{ slug: string }>` (sibling route file
 * `src/app/(public)/categories/[idOrSlug]/page.tsx` follows the
 * same pattern). The route awaits the params object before
 * rendering.
 *
 * ## Metadata
 *
 * The metadata is a generic fallback — the canonical tag name
 * lives behind the client-side `useTagBySlug` hook, so the server
 * cannot determine the title without a server-side fetch. If a
 * future server-side fetch is added (e.g. an `axios` call to the
 * tags endpoint), the `generateMetadata` function can be updated
 * to return the dynamic title.
 *
 * The skeleton on initial paint is rendered by the sibling
 * `loading.tsx` (`TKT-3.4.E5`).
 */

import { TagDetailPage } from '@/features/tags'
import { buildMetadata } from '@/shared/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return buildMetadata({
    title: 'Tag | QuizHub',
    description: 'Browse quizzes tagged with this topic.',
    path: `/tags/${slug}`,
  })
}

export default async function TagDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <TagDetailPage slug={slug} />
}
