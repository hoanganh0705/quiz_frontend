/**
 * `/tags` route entry.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.E3.
 *
 * Thin pass-through that renders the new `<TagsDirectoryPage />`
 * from the tags feature. The metadata lives in the sibling
 * `layout.tsx` (so search engines and the Next.js metadata API
 * still see the canonical title/description for the route).
 *
 * The route file is a server component (no `'use client'`); the
 * page itself is a client component (per its directive in
 * `TagsDirectoryPage.tsx`). The skeleton on initial paint is
 * rendered by the sibling `loading.tsx` (`TKT-3.4.E5`).
 */

import { TagsDirectoryPage } from '@/features/tags'

export default function TagsPage() {
  return <TagsDirectoryPage />
}
