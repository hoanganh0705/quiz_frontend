'use client'

/**
 * `<QuizCatalogMainContent />` — the legacy quiz catalog surface,
 * now a thin wrapper around the new `<QuizzesDirectoryPage />`
 * composition.
 *
 * Source epic: Epic 3.5 — Global quizzes list + filters.
 * Source ticket: TKT-3.5.D2.
 *
 * The legacy component (240 lines) hand-rolled:
 *
 *   - a `useState` for difficulty / sort / duration filters;
 *   - a `useCursorPaginated` hook call (which the new
 *     `useQuizzesList` replaces);
 *   - an `IntersectionObserver` for infinite-scroll;
 *   - an inline skeleton block (replaced by `<QuizCardSkeleton />`);
 *   - an inline empty / error block (replaced by `<QuizGridEmpty />`);
 *   - a `<RadioGroup>` × 3 for difficulty / duration / sort (replaced
 *     by `<FilterBar />` slot).
 *
 * Epic 3.5 / D2 supersedes all of that with the new
 * `<QuizzesDirectoryPage />` (TKT-3.5.D1), which composes the
 * `<FilterBar />` slot (C3) + the popular / trending strips + the
 * cursor-paginated directory (B1) + the filter-aware empty state (D1).
 *
 * ## External API preserved
 *
 *   - `{ categorySlug?: string; searchQuery: string }`
 *
 * The new component forwards the legacy props as `initialState` to
 * `<QuizzesDirectoryPage />`. The URL sync hook (C2) reads the URL on
 * mount and overrides — the URL is the source of truth on hard reload.
 *
 * `searchQuery` is NOT forwarded to the wire (TKT-3.5.A1 §drift #4:
 * the live `/quizzes` endpoint does NOT expose a `search` query
 * parameter). It is preserved in the public API so the
 * `app/(public)/quizzes/page.tsx` route keeps compiling without a
 * wider refactor; the page renders the directory with the new
 * architecture regardless.
 */

import { memo } from 'react'

import { QuizzesDirectoryPage } from './QuizzesDirectoryPage'

interface QuizCatalogMainContentProps {
  categorySlug?: string
  searchQuery: string
}

const QuizCatalogMainContent = memo(function QuizCatalogMainContent({
  categorySlug
  // searchQuery is intentionally destructured to acknowledge the
  // legacy API but NOT forwarded to the wire (TKT-3.5.A1 §drift #4).
}: QuizCatalogMainContentProps) {
  return (
    <QuizzesDirectoryPage
      initialState={{
        ...(categorySlug !== undefined && { categoryId: categorySlug })
      }}
    />
  )
})

export default QuizCatalogMainContent
