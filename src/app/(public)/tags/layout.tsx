/**
 * `/tags` layout — sets the canonical metadata for the directory
 * route and the detail sub-route (the [slug] layout inherits the
 * `<children />` pass-through from this layout).
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.E3 (sibling file for the route entry).
 *
 * The catalog-level metadata is generic — see the [slug]/page.tsx
 * `generateMetadata` override for the dynamic per-tag title.
 */

import type { ReactNode } from 'react'

import { buildMetadata } from '@/shared/lib/seo'

export const metadata = buildMetadata({
  title: 'Tags | QuizHub',
  description: 'Browse tags to discover quizzes by topic.',
  path: '/tags',
})

export default function TagsLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
