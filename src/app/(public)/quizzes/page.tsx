/**
 * `/quizzes` route entry.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.E1.
 *
 * Thin pass-through that renders the new `<QuizzesDirectoryPage />`
 * from the quizzes feature. The metadata lives in the sibling
 * `layout.tsx` (so search engines and the Next.js metadata API still
 * see the canonical title/description for the route).
 *
 * The legacy `QuizPlatform` implementation (and the search input +
 * category swiper it owned) is superseded by the directory page's
 * `<FilterBar />` slot + the URL-driven filter state — the new
 * surface is filter-aware, debounced, and round-trips through the
 * URL for hard-reload persistence (Story 3.5 AC #3).
 *
 * Server component (no `'use client'`); the page itself is a client
 * component (per its directive in `QuizzesDirectoryPage.tsx`).
 */

import { QuizzesDirectoryPage } from '@/features/quizzes'

export default function QuizzesPage() {
  return <QuizzesDirectoryPage />
}
